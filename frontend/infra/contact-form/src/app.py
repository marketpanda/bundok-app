import base64
import html
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

import boto3
from botocore.exceptions import ClientError


ses = boto3.client("sesv2")

SOURCE_EMAIL = os.environ["SOURCE_EMAIL"]
DESTINATION_EMAIL = os.environ["DESTINATION_EMAIL"]
TURNSTILE_SECRET_KEY = os.environ["TURNSTILE_SECRET_KEY"]
ALLOWED_ORIGINS = {
    origin.strip().rstrip("/")
    for origin in os.environ.get("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
}
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
LIMITS = {
    "name": 100,
    "email": 254,
    "subject": 150,
    "message": 5000,
    "website": 200,
    "turnstileToken": 2048,
}
MAX_REQUEST_BYTES = 16_384
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def response(status_code, message):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"message": message}),
    }


def read_body(event):
    raw_body = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raw_body = base64.b64decode(raw_body).decode("utf-8")
    if len(raw_body.encode("utf-8")) > MAX_REQUEST_BYTES:
        raise ValueError("Request body is too large")
    payload = json.loads(raw_body)
    if not isinstance(payload, dict):
        raise ValueError("Request body must be an object")
    return payload


def clean_field(payload, field):
    value = payload.get(field, "")
    if not isinstance(value, str):
        raise ValueError(f"{field} must be text")
    value = value.strip()
    if len(value) > LIMITS[field]:
        raise ValueError(f"{field} is too long")
    return value


def verify_turnstile(token, remote_ip):
    verification_data = {
        "secret": TURNSTILE_SECRET_KEY,
        "response": token,
    }
    if remote_ip:
        verification_data["remoteip"] = remote_ip

    request = urllib.request.Request(
        TURNSTILE_VERIFY_URL,
        data=urllib.parse.urlencode(verification_data).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=5) as verification_response:
        result = json.load(verification_response)

    return result.get("success") is True and result.get("action") == "contact"


def handler(event, context):
    origin = (event.get("headers") or {}).get("origin", "").rstrip("/")
    if ALLOWED_ORIGINS and origin not in ALLOWED_ORIGINS:
        return response(403, "Origin is not allowed")

    try:
        payload = read_body(event)
        fields = {field: clean_field(payload, field) for field in LIMITS}
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
        return response(400, "Please check the form fields and try again")

    # Bots often fill this visually hidden field. Return success without sending
    # so the field does not reveal itself as an anti-spam check.
    if fields["website"]:
        return response(200, "Message received")

    if not all(fields[field] for field in ("name", "email", "subject", "message")):
        return response(400, "All fields are required")
    if not EMAIL_PATTERN.fullmatch(fields["email"]):
        return response(400, "Please enter a valid email address")
    if "\r" in fields["subject"] or "\n" in fields["subject"]:
        return response(400, "Subject must be a single line")

    remote_ip = (
        event.get("requestContext", {})
        .get("http", {})
        .get("sourceIp", "")
    )
    try:
        captcha_is_valid = verify_turnstile(fields["turnstileToken"], remote_ip)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError) as error:
        print(
            json.dumps(
                {
                    "level": "error",
                    "requestId": context.aws_request_id,
                    "type": type(error).__name__,
                    "message": "Turnstile verification failed",
                }
            )
        )
        return response(503, "Spam check is temporarily unavailable")

    if not captcha_is_valid:
        return response(400, "Please complete the spam check again")

    safe_name = html.escape(fields["name"])
    safe_email = html.escape(fields["email"])
    safe_subject = html.escape(fields["subject"])
    safe_message = html.escape(fields["message"]).replace("\n", "<br>")
    text_body = (
        f"Name: {fields['name']}\n"
        f"Email: {fields['email']}\n"
        f"Subject: {fields['subject']}\n\n"
        f"{fields['message']}"
    )
    html_body = (
        f"<p><strong>Name:</strong> {safe_name}<br>"
        f"<strong>Email:</strong> {safe_email}<br>"
        f"<strong>Subject:</strong> {safe_subject}</p>"
        f"<p>{safe_message}</p>"
    )

    try:
        ses.send_email(
            FromEmailAddress=SOURCE_EMAIL,
            Destination={"ToAddresses": [DESTINATION_EMAIL]},
            ReplyToAddresses=[fields["email"]],
            Content={
                "Simple": {
                    "Subject": {"Data": f"[Ambangeg contact] {fields['subject']}", "Charset": "UTF-8"},
                    "Body": {
                        "Text": {"Data": text_body, "Charset": "UTF-8"},
                        "Html": {"Data": html_body, "Charset": "UTF-8"},
                    },
                }
            },
        )
    except ClientError as error:
        aws_error = error.response.get("Error", {})
        print(
            json.dumps(
                {
                    "level": "error",
                    "requestId": context.aws_request_id,
                    "type": "ClientError",
                    "code": aws_error.get("Code", "Unknown"),
                    "message": aws_error.get("Message", "Amazon SES rejected the request"),
                }
            )
        )
        return response(500, "Unable to send the message right now")
    except Exception as error:
        print(
            json.dumps(
                {
                    "level": "error",
                    "requestId": context.aws_request_id,
                    "type": type(error).__name__,
                }
            )
        )
        return response(500, "Unable to send the message right now")

    return response(200, "Message sent")

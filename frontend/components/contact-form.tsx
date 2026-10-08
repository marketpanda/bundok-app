"use client";

import { AlertCircle, Check, LoaderCircle, Send } from "lucide-react";
import Script from "next/script";
import { FormEvent, useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          action: string;
          theme: "light" | "dark" | "auto";
          size: "normal" | "compact" | "flexible";
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      remove: (widget: string) => void;
      reset: (widget?: string) => void;
    };
  }
}

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetRef = useRef<string | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

  const renderTurnstile = useCallback(() => {
    if (!turnstileSiteKey || !turnstileContainerRef.current || !window.turnstile || turnstileWidgetRef.current) {
      return;
    }

    turnstileWidgetRef.current = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: turnstileSiteKey,
      action: "contact",
      theme: "light",
      size: "flexible",
      callback: setTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
  }, [turnstileSiteKey]);

  const resetTurnstile = () => {
    setTurnstileToken("");
    if (turnstileWidgetRef.current) {
      window.turnstile?.reset(turnstileWidgetRef.current);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const endpoint = process.env.NEXT_PUBLIC_CONTACT_API_URL?.trim();

    if (!endpoint) {
      setErrorMessage("The contact form is not configured yet. Please email us directly instead.");
      setStatus("error");
      return;
    }

    const formData = new FormData(form);
    if (!turnstileSiteKey || !turnstileToken) {
      setErrorMessage("Please complete the spam check before sending your message.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          subject: formData.get("subject"),
          message: formData.get("message"),
          website: formData.get("website"),
          turnstileToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Contact request failed with status ${response.status}`);
      }

      form.reset();
      if (turnstileWidgetRef.current) {
        window.turnstile?.remove(turnstileWidgetRef.current);
        turnstileWidgetRef.current = null;
      }
      setTurnstileToken("");
      setStatus("sent");
    } catch (error) {
      console.error("Unable to send contact message", error);
      setErrorMessage("We could not send your message. Please try again or email us directly.");
      setStatus("error");
      resetTurnstile();
    }
  };

  if (status === "sent") {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center" role="status">
        <span className="flex size-14 items-center justify-center rounded-full bg-moss text-white shadow-lg shadow-moss-950/20">
          <Check className="size-7" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">Your message has been sent.</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Thanks for reaching out. The Ambangeg team will get back to you as soon as possible.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setStatus("idle")}
          className="mt-7 h-11 rounded-full border-input bg-white/60 px-5 text-foreground hover:bg-white"
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-7 lg:p-8">
      {turnstileSiteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={renderTurnstile}
        />
      )}
      <fieldset disabled={status === "sending"} className="space-y-5 disabled:opacity-75">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className="mb-2 block text-xs font-semibold text-muted-foreground">
              Your name
            </label>
            <Input
              id="contact-name"
              name="name"
              autoComplete="name"
              required
              maxLength={100}
              placeholder="Juan Dela Cruz"
              className="h-12 rounded-xl border-input bg-white/75 px-4 text-base text-foreground placeholder:text-slate-400 focus-visible:border-moss-deep focus-visible:ring-moss-deep/25 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-2 block text-xs font-semibold text-muted-foreground">
              Email address
            </label>
            <Input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@example.com"
              className="h-12 rounded-xl border-input bg-white/75 px-4 text-base text-foreground placeholder:text-slate-400 focus-visible:border-moss-deep focus-visible:ring-moss-deep/25 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-subject" className="mb-2 block text-xs font-semibold text-muted-foreground">
            Subject
          </label>
          <Input
            id="contact-subject"
            name="subject"
            required
            maxLength={150}
            placeholder="How can we help?"
            className="h-12 rounded-xl border-input bg-white/75 px-4 text-base text-foreground placeholder:text-slate-400 focus-visible:border-moss-deep focus-visible:ring-moss-deep/25 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="contact-message" className="mb-2 block text-xs font-semibold text-muted-foreground">
            Message
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            maxLength={5000}
            rows={6}
            placeholder="Tell us what is on your mind..."
            className="w-full resize-y rounded-xl border border-input bg-white/75 px-4 py-3 text-base text-foreground shadow-xs outline-none transition-colors placeholder:text-slate-400 focus:border-moss-deep focus:ring-2 focus:ring-moss-deep/25 sm:text-sm"
          />
        </div>

        <div className="absolute -left-[10000px] top-auto size-px overflow-hidden" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {turnstileSiteKey ? (
          <div
            ref={turnstileContainerRef}
            className="min-h-[65px]"
            aria-label="Spam protection check"
          />
        ) : (
          <p className="text-sm leading-6 text-red-700" role="alert">
            The spam check is not configured. Please email us directly instead.
          </p>
        )}
      </fieldset>

      {status === "error" && (
        <p className="flex items-start gap-2 text-sm leading-6 text-red-700" role="alert">
          <AlertCircle className="mt-1 size-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </p>
      )}

      <Button
        type="submit"
        disabled={status === "sending" || !turnstileSiteKey || !turnstileToken}
        className="h-12 w-full rounded-xl bg-moss font-semibold text-white shadow-md shadow-moss-950/15 hover:bg-moss-hover sm:w-auto sm:px-7"
      >
        {status === "sending" ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Sending...
          </>
        ) : (
          <>
            <Send className="size-4" aria-hidden="true" />
            Send message
          </>
        )}
      </Button>
    </form>
  );
}

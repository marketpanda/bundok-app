"use client";

import { Amplify } from "aws-amplify";

let isConfigured = false;

function withTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

export function configureAmplifyAuth() {
  if (isConfigured) return true;

  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID;
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  // OAuth state and PKCE data are scoped to the browser origin. Always return
  // to the origin that actually started sign-in (localhost vs 127.0.0.1,
  // preview hosts, and production domains cannot share that storage).
  const appUrl = typeof window !== "undefined" ? window.location.origin : configuredAppUrl || "";

  if (!userPoolId || !userPoolClientId || !domain || !appUrl) return false;

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          oauth: {
            domain: domain.replace(/^https?:\/\//, "").replace(/\/$/, ""),
            scopes: ["openid", "email", "profile"],
            redirectSignIn: [withTrailingSlash(appUrl)],
            redirectSignOut: [withTrailingSlash(appUrl)],
            responseType: "code",
            providers: ["Google"],
          },
        },
      },
    },
  });

  isConfigured = true;
  return true;
}

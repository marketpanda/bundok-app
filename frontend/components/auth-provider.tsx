"use client";

import "aws-amplify/auth/enable-oauth-listener";

import {
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
  signInWithRedirect,
  signOut,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { configureAmplifyAuth } from "@/lib/amplify-auth";

export type AppUser = {
  subject: string;
  name?: string;
  email?: string;
};

type AuthContextValue = {
  authError?: string;
  configured: boolean;
  loading: boolean;
  user?: AppUser;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function emailUsername(email?: string) {
  return email?.includes("@") ? email.split("@")[0] : undefined;
}

function isProviderGeneratedUsername(username: string) {
  return /^(google|facebook|signinwithapple)[_-]/i.test(username);
}

function stringClaim(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AppUser>();
  const [authError, setAuthError] = useState<string>();

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      const loginId = currentUser.signInDetails?.loginId;
      let nextUser: AppUser = {
        subject: currentUser.userId,
        name:
          emailUsername(loginId) ||
          (!isProviderGeneratedUsername(currentUser.username)
            ? currentUser.username
            : undefined),
        email: loginId?.includes("@") ? loginId : undefined,
      };

      try {
        const session = await fetchAuthSession();
        const claims = session.tokens?.idToken?.payload;
        const claimEmail = stringClaim(claims?.email);
        const claimFullName = [
          stringClaim(claims?.given_name),
          stringClaim(claims?.family_name),
        ]
          .filter(Boolean)
          .join(" ");

        nextUser = {
          subject: currentUser.userId,
          name:
            stringClaim(claims?.name) ||
            claimFullName ||
            stringClaim(claims?.preferred_username) ||
            emailUsername(claimEmail) ||
            nextUser.name,
          email: claimEmail || nextUser.email,
        };
      } catch {
        // Some Cognito setups expose Google profile data only as user attributes.
      }

      try {
        const attributes = await fetchUserAttributes();
        const fullName = [attributes.given_name, attributes.family_name]
          .filter(Boolean)
          .join(" ");
        nextUser = {
          subject: currentUser.userId,
          name:
            attributes.name ||
            fullName ||
            attributes.preferred_username ||
            emailUsername(attributes.email) ||
            nextUser.name,
          email: attributes.email || nextUser.email,
        };
      } catch {
        // Profile attributes are optional UI data. A failure to fetch them must
        // not turn a valid Cognito session into a signed-out state.
      }

      setUser(nextUser);
    } catch {
      setUser(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stopListening = Hub.listen("auth", ({ payload }) => {
      if (
        payload.event === "signedIn" ||
        payload.event === "signInWithRedirect" ||
        payload.event === "tokenRefresh"
      ) {
        setAuthError(undefined);
        void refreshUser();
      }
      if (payload.event === "signInWithRedirect_failure") {
        const failure = payload.data as { error?: unknown } | undefined;
        const callbackError = failure?.error;
        setAuthError(
          callbackError instanceof Error
            ? callbackError.message
            : "Google sign-in could not be completed by Cognito.",
        );
        setLoading(false);
      }
      if (payload.event === "signedOut") {
        setUser(undefined);
        setLoading(false);
      }
    });

    const initialRefresh = window.setTimeout(() => {
      const authConfigured = configureAmplifyAuth();
      setConfigured(authConfigured);
      if (authConfigured) {
        void refreshUser();
      } else {
        setLoading(false);
      }
    }, 0);
    return () => {
      window.clearTimeout(initialRefresh);
      stopListening();
    };
  }, [refreshUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authError,
      configured,
      loading,
      user,
      signInWithGoogle: async () => {
        setAuthError(undefined);
        if (!configureAmplifyAuth()) {
          throw new Error("Cognito authentication is not configured.");
        }
        await signInWithRedirect({ provider: "Google" });
      },
      signOutUser: async () => {
        await signOut();
      },
    }),
    [authError, configured, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}

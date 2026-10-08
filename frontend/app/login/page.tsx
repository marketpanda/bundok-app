"use client";

import { SiteLogo } from "@/components/site-logo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { GoogleMark } from "@/components/google-mark";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { authError, configured, loading, user, signInWithGoogle } = useAuth();
  const [error, setError] = useState("");

  const beginSignIn = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch {
      setError("Google sign-in could not start. Check the Cognito configuration and try again.");
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-background px-5 text-foreground">
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Ambangeg
        </Link>

        <section className="rounded-3xl border border-border bg-white p-7 shadow-2xl shadow-zinc-900/5 sm:p-9">
          <div className="mb-8 text-center">
            <SiteLogo size={64} />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">
              {user ? "You’re signed in" : "Welcome to Ambangeg"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {user
                ? `Continue exploring as ${user.name ?? user.email ?? "a hiker"}.`
                : "Log in or create an account with Google. It only takes a moment."}
            </p>
          </div>

          {user ? (
            <Link
              href="/"
              className="flex h-12 w-full items-center justify-center rounded-xl bg-moss px-4 text-sm font-semibold text-white transition-colors hover:bg-moss-hover"
            >
              Continue to Discover
            </Link>
          ) : (
            <div>
              <Button
                type="button"
                onClick={beginSignIn}
                disabled={loading || !configured}
                variant="outline"
                className="h-12 w-full rounded-xl border-border bg-white px-4 font-semibold text-foreground hover:bg-moss-100 hover:text-foreground"
              >
                <GoogleMark />
                {loading ? "Checking your session…" : "Continue with Google"}
              </Button>
              {!configured && (
                <p className="mt-3 text-center text-xs leading-5 text-amber-700">
                  Sign-in needs the Cognito environment variables described in the README.
                </p>
              )}
              {(error || authError) && (
                <p role="alert" className="mt-3 text-center text-xs leading-5 text-red-700">
                  {error || `Google sign-in failed: ${authError}`}
                </p>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
            By continuing, you agree to Ambangeg&apos;s{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-moss-deep">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-moss-deep">
              privacy policy
            </Link>
            .
          </p>
        </section>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}

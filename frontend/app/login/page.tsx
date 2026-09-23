"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { GoogleMark } from "@/components/google-mark";
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
    <main className="flex min-h-dvh items-center justify-center bg-[#202020] px-5 py-10 text-white">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to Ambangeg
        </Link>

        <section className="rounded-3xl border border-white/10 bg-[#2b2b2b] p-7 shadow-2xl shadow-black/30 sm:p-9">
          <div className="mb-8 text-center">
            <Image
              src="/assets/logo2.png"
              alt="Ambangeg logo"
              width={64}
              height={64}
              className="mx-auto size-16 rounded-full object-contain"
              priority
            />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">
              {user ? "You’re signed in" : "Welcome to Ambangeg"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {user
                ? `Continue exploring as ${user.name ?? user.email ?? "a hiker"}.`
                : "Log in or create an account with Google. It only takes a moment."}
            </p>
          </div>

          {user ? (
            <Link
              href="/"
              className="flex h-12 w-full items-center justify-center rounded-xl bg-grass px-4 text-sm font-semibold text-white transition-colors hover:bg-grass-hover"
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
                className="h-12 w-full rounded-xl border-white/15 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100 hover:text-zinc-950"
              >
                <GoogleMark />
                {loading ? "Checking your session…" : "Continue with Google"}
              </Button>
              {!configured && (
                <p className="mt-3 text-center text-xs leading-5 text-amber-300">
                  Sign-in needs the Cognito environment variables described in the README.
                </p>
              )}
              {(error || authError) && (
                <p role="alert" className="mt-3 text-center text-xs leading-5 text-red-300">
                  {error || `Google sign-in failed: ${authError}`}
                </p>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
            By continuing, you agree to Ambangeg&apos;s terms and privacy policy.
          </p>
        </section>
      </div>
    </main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { UserRound } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { DesktopNavigation } from "@/components/desktop-navigation";
import { ExploreMenu } from "@/components/explore-menu";
import { GoogleMark } from "@/components/google-mark";
import { MobileMenu } from "@/components/mobile-menu";
import { SiteFooter } from "@/components/site-footer";

export function ProfileView() {
  const { configured, loading, user } = useAuth();
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "Hiker";

  return (
    <main className="min-h-dvh bg-[#202020] text-white">
      <div className="mx-auto w-full max-w-[1600px] px-5 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-32 lg:pt-0 xl:px-40">
        <header className="desktop-sticky-bar flex items-center justify-between lg:sticky lg:top-0 lg:z-40 lg:py-2">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-turquoise"
          >
            <Image
              src="/assets/logo2.png"
              alt="Ambangeg logo"
              width={48}
              height={48}
              className="size-12 rounded-full object-contain"
              priority
            />
            <div className="hidden xl:block">
              <p className="text-base font-semibold">Ambangeg</p>
              <p className="text-xs text-zinc-500">Let&apos;s hike!</p>
            </div>
          </Link>
          <div className="hidden xl:block xl:-translate-x-5 2xl:-translate-x-8">
            <ExploreMenu compact />
          </div>
          <div className="flex items-center gap-2">
            <DesktopNavigation />
            <MobileMenu />
          </div>
        </header>

        <div className="desktop-sticky-bar hidden lg:sticky lg:top-16 lg:z-30 lg:-mx-2 lg:block lg:px-2 lg:py-3 xl:hidden">
          <ExploreMenu />
        </div>

        <section className="mt-12 w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#292929] shadow-2xl shadow-black/20 sm:mt-16">
          {loading ? (
            <div className="p-7 sm:p-10" aria-live="polite">
              <div className="size-20 animate-pulse rounded-full bg-white/10" />
              <div className="mt-6 h-7 w-48 animate-pulse rounded-lg bg-white/10" />
              <p className="mt-3 text-sm text-zinc-400">Loading your profile…</p>
            </div>
          ) : user ? (
            <div className="p-7 sm:p-10">
              <div className="flex size-20 items-center justify-center rounded-full bg-grass text-3xl font-bold text-white shadow-lg shadow-green-950/30">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-turquoise">
                Your profile
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {displayName}
              </h1>
              <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-white text-zinc-900">
                    <GoogleMark />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">Google account</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {user.email ?? "Connected"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-7 text-center sm:p-10">
              <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-white/10 text-zinc-400">
                <UserRound className="size-9" aria-hidden="true" />
              </span>
              <h1 className="mt-6 text-2xl font-semibold">Your profile</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
                Sign in with Google to see your name and account details.
              </p>
              <Link
                href="/login"
                aria-disabled={!configured}
                className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-grass px-5 text-sm font-semibold text-white transition-colors hover:bg-grass-hover"
              >
                <GoogleMark />
                Continue with Google
              </Link>
            </div>
          )}
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}

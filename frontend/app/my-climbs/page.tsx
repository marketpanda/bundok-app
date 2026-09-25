import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ExploreMenu } from "@/components/explore-menu";
import { MyClimbsGallery } from "@/components/my-climbs-gallery";

export const metadata: Metadata = {
  title: "My Climbs | Ambangeg",
  description: "View your climbs on Ambangeg.",
};

export default function MyClimbsPage() {
  return (
    <main className="min-h-dvh bg-[#202020] text-white">
      <div className="mx-auto w-full max-w-[1600px] px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-32 lg:pt-8 xl:px-40">
        <header className="mb-8 flex items-center justify-between lg:mb-10">
          <Link href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-turquoise">
            <Image
              src="/assets/logo2.png"
              alt="Ambangeg logo"
              width={48}
              height={48}
              className="size-12 rounded-full object-contain"
              priority
            />
            <div className="hidden sm:block">
              <p className="text-base font-semibold">Ambangeg</p>
              <p className="text-xs text-zinc-500">Let&apos;s hike!</p>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-full bg-white/10 px-3.5 py-2 text-xs text-zinc-200 transition-colors hover:bg-white/15 hover:text-turquoise focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise sm:px-4 sm:text-sm"
          >
            Back to discover
          </Link>
        </header>

        <div className="mb-5 lg:mb-6">
          <p className="mb-2 hidden text-sm font-medium uppercase tracking-[0.2em] text-turquoise lg:block">Your hiking journey</p>
          <h1 className="text-[28px] font-semibold tracking-[-0.04em] lg:text-5xl">My Climbs</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400 lg:text-base">
            A growing collection of peaks, paths, and days worth remembering.
          </p>
        </div>

        <ExploreMenu active="my-climbs" />

        <MyClimbsGallery />
      </div>
    </main>
  );
}

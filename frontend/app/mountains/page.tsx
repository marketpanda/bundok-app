import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ExploreMenu } from "@/components/explore-menu";
import { MountainDirectory } from "@/components/mountain-directory";
import { mountains } from "@/data/mountains";

export const metadata: Metadata = {
  title: "Mountains | Ambangeg",
  description: "Explore mountain profiles on Ambangeg.",
};

export default function MountainsPage() {
  return (
    <main className="min-h-dvh bg-[#202020] text-white">
      <div className="mx-auto w-full max-w-[1600px] px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-32 lg:pt-8 xl:px-40">
        <header className="mb-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-turquoise">
            <Image
              src="/assets/logo2.png"
              alt="Ambangeg logo"
              width={48}
              height={48}
              className="size-12 rounded-full object-contain"
              priority
            />
            <div>
              <p className="text-base font-semibold">Ambangeg</p>
              <p className="text-xs text-zinc-500">Let&apos;s hike!</p>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-full bg-white/10 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/15 hover:text-turquoise focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise"
          >
            Back to discover
          </Link>
        </header>

        <div className="mb-4">
          <p className="mb-2 hidden text-sm font-medium uppercase tracking-[0.2em] text-turquoise lg:block">Find your next climb</p>
          <h1 className="text-[28px] font-semibold tracking-[-0.04em] lg:text-5xl">Mountains</h1>
        </div>

        <ExploreMenu active="mountains" />

        <MountainDirectory mountains={mountains} />
      </div>
    </main>
  );
}

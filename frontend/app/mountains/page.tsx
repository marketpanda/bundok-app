import { SiteLogo } from "@/components/site-logo";
import type { Metadata } from "next";
import Link from "next/link";

import { ExploreMenu } from "@/components/explore-menu";
import { DesktopNavigation } from "@/components/desktop-navigation";
import { MobileMenu } from "@/components/mobile-menu";
import { MountainDirectory } from "@/components/mountain-directory";
import { SiteFooter } from "@/components/site-footer";
import { mountains } from "@/data/mountains";

export const metadata: Metadata = {
  title: "Philippine Mountains & Hiking Guides | Ambangeg",
  description: "Explore Philippine mountains on an interactive map and plan your climb with hiking guides to Mount Pulag, Mount Apo and Mount Guiting-Guiting.",
};

export default function MountainsPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full site-page-shell px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-32 lg:pt-0 xl:px-40">
        <header className="desktop-sticky-bar mb-8 flex items-center justify-between lg:sticky lg:top-0 lg:z-40 lg:py-2">
          <Link href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss-deep">
            <SiteLogo />
            <div className="hidden xl:block">
              <p className="text-base font-semibold">Ambangeg</p>
              <p className="text-xs text-muted-foreground">Let&apos;s hike!</p>
            </div>
          </Link>

          <div className="hidden xl:block xl:-translate-x-5 2xl:-translate-x-8">
            <ExploreMenu active="mountains" compact />
          </div>

          <div className="flex items-center gap-2">
            <DesktopNavigation />
            <MobileMenu />
          </div>
        </header>

        <div className="mb-4">
          <p className="mb-2 hidden text-sm font-medium uppercase tracking-[0.2em] text-moss-deep lg:block">Find your next climb</p>
          <h1 className="text-[28px] font-semibold tracking-[-0.04em] lg:text-5xl">Mountains</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground lg:text-base">From your first summit to your next big climb. Find your trail through the Philippines.</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Explore the map to compare mountains by area and difficulty. For a closer look at routes and preparation, start with our guides to <Link href="/mountains/mount-pulag" className="text-moss-deep hover:underline">Mount Pulag</Link>, <Link href="/mountains/mount-apo" className="text-moss-deep hover:underline">Mount Apo</Link> and <Link href="/mountains/mount-guiting-guiting" className="text-moss-deep hover:underline">Mount Guiting-Guiting</Link>.</p>
        </div>

        <div className="desktop-sticky-bar lg:sticky lg:top-16 lg:z-30 lg:-mx-2 lg:px-2 lg:py-3 xl:hidden">
          <ExploreMenu active="mountains" />
        </div>

        <MountainDirectory mountains={mountains} />

        <SiteFooter />
      </div>
    </main>
  );
}

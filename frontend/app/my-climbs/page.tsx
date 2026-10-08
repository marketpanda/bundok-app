import { SiteLogo } from "@/components/site-logo";
import type { Metadata } from "next";
import Link from "next/link";

import { ExploreMenu } from "@/components/explore-menu";
import { DesktopNavigation } from "@/components/desktop-navigation";
import { MobileMenu } from "@/components/mobile-menu";
import { MyClimbsGallery } from "@/components/my-climbs-gallery";
import { mapMountains } from "@/data/map-mountains";
import { getMountainPhoto, mountainPhotos } from "@/data/mountain-photos";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "My Climbs | Ambangeg",
  description: "View your climbs on Ambangeg.",
};

export default function MyClimbsPage() {
  return (
    <main className="climbs-page min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full site-page-shell px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-32 lg:pt-0 xl:px-40">
        <header className="desktop-sticky-bar mb-8 flex items-center justify-between lg:sticky lg:top-0 lg:z-40 lg:mb-8 lg:py-2">
          <Link href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss-deep">
            <SiteLogo />
            <div className="hidden xl:block">
              <p className="text-base font-semibold">Ambangeg</p>
              <p className="text-xs text-muted-foreground">Let&apos;s hike!</p>
            </div>
          </Link>

          <div className="hidden xl:block xl:-translate-x-5 2xl:-translate-x-8">
            <ExploreMenu active="my-climbs" light compact />
          </div>

          <div className="flex items-center gap-2">
            <DesktopNavigation light />
            <MobileMenu light />
          </div>
        </header>

        <div className="mb-5 lg:mb-6">
          <p className="mb-2 hidden text-sm font-medium uppercase tracking-[0.2em] text-moss-deep lg:block">Your hiking journey</p>
          <h1 className="text-[28px] font-semibold tracking-[-0.04em] lg:text-5xl">My Climbs</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground lg:text-base">
            A growing collection of peaks, paths, and days worth remembering.
          </p>
        </div>

        <div className="desktop-sticky-bar lg:sticky lg:top-16 lg:z-30 lg:-mx-2 lg:px-2 lg:py-3 xl:hidden">
          <ExploreMenu active="my-climbs" light />
        </div>

        <MyClimbsGallery mountains={mapMountains.map(({ slug, name, kind, location, elevationMeters, aliases }) => ({ slug, name, kind, location, elevationMeters, aliases, photo: getMountainPhoto(slug) ?? mountainPhotos[slug.replace(/^mount-/, "")] }))} />

        <SiteFooter className="border-border" />
      </div>
    </main>
  );
}

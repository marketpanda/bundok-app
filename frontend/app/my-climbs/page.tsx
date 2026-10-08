import type { Metadata } from "next";
import Image from "next/image";
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
    <main className="min-h-dvh bg-[#202020] text-white">
      <div className="mx-auto w-full max-w-[1600px] px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-32 lg:pt-0 xl:px-40">
        <header className="desktop-sticky-bar mb-8 flex items-center justify-between lg:sticky lg:top-0 lg:z-40 lg:mb-8 lg:py-2">
          <Link href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-turquoise">
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
            <ExploreMenu active="my-climbs" compact />
          </div>

          <div className="flex items-center gap-2">
            <DesktopNavigation />
            <MobileMenu />
          </div>
        </header>

        <div className="mb-5 lg:mb-6">
          <p className="mb-2 hidden text-sm font-medium uppercase tracking-[0.2em] text-turquoise lg:block">Your hiking journey</p>
          <h1 className="text-[28px] font-semibold tracking-[-0.04em] lg:text-5xl">My Climbs</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400 lg:text-base">
            A growing collection of peaks, paths, and days worth remembering.
          </p>
        </div>

        <div className="desktop-sticky-bar lg:sticky lg:top-16 lg:z-30 lg:-mx-2 lg:px-2 lg:py-3 xl:hidden">
          <ExploreMenu active="my-climbs" />
        </div>

        <MyClimbsGallery mountains={mapMountains.map(({ slug, name, location, elevationMeters, aliases }) => ({ slug, name, location, elevationMeters, aliases, photo: getMountainPhoto(slug) ?? mountainPhotos[slug.replace(/^mount-/, "")] }))} />

        <SiteFooter />
      </div>
    </main>
  );
}

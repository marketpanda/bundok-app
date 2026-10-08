import { SiteLogo } from "@/components/site-logo";
import type { Metadata } from "next";
import Link from "next/link";

import { DesktopNavigation } from "@/components/desktop-navigation";
import { ExploreMenu } from "@/components/explore-menu";
import { MobileMenu } from "@/components/mobile-menu";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "About Us | Ambangeg",
  description: "Mahilig sa hiking, mahina sa last na ahon. The story behind Ambangeg.",
};

export default function AboutUsPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full site-page-shell px-5 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-32 lg:pt-0 xl:px-40">
        <header className="desktop-sticky-bar flex items-center justify-between lg:sticky lg:top-0 lg:z-40 lg:py-2">
          <Link href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss-deep">
            <SiteLogo />
            <div className="hidden xl:block">
              <p className="text-base font-semibold">Ambangeg</p>
              <p className="text-xs text-muted-foreground">Let&apos;s hike!</p>
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

        <article className="mx-auto mt-12 max-w-3xl lg:mt-20" aria-labelledby="about-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss-deep">About Ambangeg</p>
          <h1 id="about-heading" className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Mahilig sa hiking.<br />Mahina sa “last na ahon.”</h1>
          <div className="mt-8 space-y-8 text-base leading-8 text-muted-foreground">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">Bakit may Ambangeg?</h2>
              <p>I love hiking. Simple lang. May something sa paglalakad sa trail, sa amoy ng gubat, at sa view na biglang nagpapatahimik sa buong group. Kahit five minutes ago, lahat kami nagtatanong kung malapit na. Spoiler: usually hindi pa.</p>
              <p className="mt-4">Ginawa ko ang Ambangeg para may isang lugar para maghanap ng mountains, magbasa ng guides, at balikan ang mga climbs na worth remembering. Kasama na rin ang memes, kasi minsan mas madaling i-explain ang pagod gamit ang poker face.</p>
            </section>
            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">Galaw-galaw, hindi puro scroll.</h2>
              <p>Hiking gets you moving: lakad, ahon, balance, repeat. A trail that fits your pace can be a fun way to build stamina and give your legs some work. Hindi kailangang summit agad. Kahit shorter walk, adventure pa rin. Walang medal para sa pinakamaraming hingal per minute.</p>
            </section>
            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">May pahinga rin ang utak.</h2>
              <p>For me, time outdoors means a break from screens and a chance to slow down. Instead of notifications, may dahon, hangin, at isang kaibigang every ten minutes nagsasabing “picture muna.” Hindi nawawala lahat ng problema sa summit, pero ang sarap magkaroon ng space para huminga at mag-reset.</p>
            </section>
            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">Good company, better trail stories.</h2>
              <p>May friendships na nabubuo sa shared snacks, sabay-sabay na pagod, at sa taong may extra tubig. Hiking gives us time together away from the usual rush. And finishing a walk you prepared for feels good, kahit ang personal best mo ay hindi maubos ang trail mix bago ang jump-off.</p>
            </section>
            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">Dahan-dahan lang. Enjoy the climb.</h2>
              <p>Choose a trail that suits you, prepare for the weather, and listen to your guide and your body. Bring your rubbish home, respect local communities, and leave the trail ready for the next hiker. The goal is to enjoy the outdoors and come back with stories. Bonus na lang ang bagong profile picture.</p>
              <p className="mt-4 font-medium text-moss-deep">Tara? Promise, hindi ko sasabihing “last na ahon” kung hindi ako sure.</p>
            </section>
          </div>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/mountains" className="inline-flex min-h-11 items-center rounded-full bg-moss px-5 text-sm font-semibold text-white hover:bg-moss-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss-deep">Find your next trail</Link>
            <Link href="/contact-us" className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-medium text-moss-deep hover:bg-moss-100 focus-visible:outline-2 focus-visible:outline-moss-deep">Contact Us</Link>
          </div>
        </article>

        <SiteFooter />
      </div>
    </main>
  );
}

import { SiteLogo } from "@/components/site-logo";
import Link from "next/link";

import { DesktopNavigation } from "@/components/desktop-navigation";
import { MobileMenu } from "@/components/mobile-menu";
import { SiteFooter } from "@/components/site-footer";

type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export function LegalPage({
  title,
  introduction,
  sections,
}: {
  title: string;
  introduction: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full site-page-shell flex-col px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-32 lg:pt-0 xl:px-40">
        <header className="desktop-sticky-bar flex items-center justify-between lg:sticky lg:top-0 lg:z-40 lg:py-2">
          <Link href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss-deep">
            <SiteLogo />
            <div className="hidden sm:block">
              <p className="text-base font-semibold">Ambangeg</p>
              <p className="text-xs text-muted-foreground">Let&apos;s hike!</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <DesktopNavigation />
            <MobileMenu />
          </div>
        </header>

        <article className="mx-auto w-full max-w-3xl flex-1 py-12 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss-deep">
            Ambangeg legal
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-xs text-muted-foreground">Effective September 28, 2026</p>
          <p className="mt-7 text-base leading-7 text-muted-foreground">{introduction}</p>

          <div className="mt-10 space-y-9">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-semibold text-foreground">{section.heading}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        <SiteFooter />
      </div>
    </main>
  );
}

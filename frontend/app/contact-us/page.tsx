import { SiteLogo } from "@/components/site-logo";
import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";

import { ContactForm } from "@/components/contact-form";
import { DesktopNavigation } from "@/components/desktop-navigation";
import { ExploreMenu } from "@/components/explore-menu";
import { MobileMenu } from "@/components/mobile-menu";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Contact Us | Ambangeg",
  description: "Get in touch with the Ambangeg team.",
};

export default function ContactUsPage() {
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

        <section className="mt-12 w-full lg:mt-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss-deep">Contact Ambangeg</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">Let&apos;s talk trails.</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              Have a question, found an issue, or want to share a mountain story? Send us a note and we&apos;ll point you in the right direction.
            </p>
          </div>

          <div className="mt-9 grid overflow-hidden rounded-[28px] border border-border bg-white lg:grid-cols-[0.72fr_1.28fr]">
            <aside className="relative overflow-hidden border-b border-border p-6 lg:border-b-0 lg:border-r lg:p-8">
              <div className="absolute -right-20 -top-20 size-64 rounded-full bg-moss/15 blur-3xl" />
              <div className="relative">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-moss/15 text-moss-deep">
                  <Mail className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-xl font-semibold">Email us directly</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Prefer email? You can always reach the Ambangeg team at:</p>
                <a
                  href="mailto:contact@ambangeg.com"
                  className="mt-4 inline-block text-sm font-semibold text-moss-deep transition-colors hover:text-foreground sm:text-base"
                >
                  contact@ambangeg.com
                </a>
                <p className="mt-8 text-xs leading-5 text-muted-foreground">
                  Messages are delivered securely through Amazon Web Services. We only use your details to respond to your enquiry.
                </p>
              </div>
            </aside>

            <div className="bg-white">
              <ContactForm />
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}

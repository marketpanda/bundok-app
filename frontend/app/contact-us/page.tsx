import type { Metadata } from "next";
import Image from "next/image";
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
    <main className="min-h-dvh bg-[#202020] text-white">
      <div className="mx-auto w-full max-w-[1600px] px-5 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-32 lg:pt-0 xl:px-40">
        <header className="desktop-sticky-bar flex items-center justify-between lg:sticky lg:top-0 lg:z-40 lg:py-2">
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-turquoise">Contact Ambangeg</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">Let&apos;s talk trails.</h1>
            <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base">
              Have a question, found an issue, or want to share a mountain story? Send us a note and we&apos;ll point you in the right direction.
            </p>
          </div>

          <div className="mt-9 grid overflow-hidden rounded-[28px] border border-white/10 bg-[#2a2a2a] lg:grid-cols-[0.72fr_1.28fr]">
            <aside className="relative overflow-hidden border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-8">
              <div className="absolute -right-20 -top-20 size-64 rounded-full bg-turquoise/15 blur-3xl" />
              <div className="relative">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-turquoise/15 text-turquoise">
                  <Mail className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-xl font-semibold">Email us directly</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">Prefer email? You can always reach the Ambangeg team at:</p>
                <a
                  href="mailto:contact@ambangeg.com"
                  className="mt-4 inline-block text-sm font-semibold text-turquoise transition-colors hover:text-white sm:text-base"
                >
                  contact@ambangeg.com
                </a>
                <p className="mt-8 text-xs leading-5 text-zinc-500">
                  The form is currently a UI preview and does not send or store personal information.
                </p>
              </div>
            </aside>

            <div className="bg-[linear-gradient(135deg,#f6fffb_0%,#e1f9f6_48%,#d8f6fb_100%)]">
              <ContactForm />
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}

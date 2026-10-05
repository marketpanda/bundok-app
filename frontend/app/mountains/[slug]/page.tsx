import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, MapPin, MountainSnow } from "lucide-react";

import { DesktopNavigation } from "@/components/desktop-navigation";
import { MobileMenu } from "@/components/mobile-menu";
import { SiteFooter } from "@/components/site-footer";
import { getMountainGuide, mountainGuides } from "@/data/mountain-guides";
import { getMountainItineraries } from "@/data/hike-itineraries";
import { mountains } from "@/data/mountains";

type Props = { params: Promise<{ slug: string }> };
const siteUrl = "https://ambangeg.com";

export const dynamicParams = false;

export function generateStaticParams() {
  return mountainGuides.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getMountainGuide(slug);
  if (!guide) notFound();
  const title = `${guide.title} Hiking Guide: Trails & Preparation | Ambangeg`;
  const url = `${siteUrl}/mountains/${slug}/`;
  return {
    title,
    description: guide.introduction,
    alternates: { canonical: url },
    openGraph: { title, description: guide.introduction, url, type: "article", siteName: "Ambangeg" },
    twitter: { card: "summary", title, description: guide.introduction },
  };
}

export default async function MountainGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getMountainGuide(slug);
  const mountain = mountains.find((item) => item.slug === slug);
  if (!guide || !mountain) notFound();
  const related = mountainGuides.filter((item) => item.slug !== slug);
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Mountains", item: `${siteUrl}/mountains/` },
      { "@type": "ListItem", position: 3, name: guide.title, item: `${siteUrl}/mountains/${slug}/` },
    ],
  };

  return (
    <main className="min-h-dvh bg-[#202020] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" aria-label="Ambangeg home" className="rounded-full focus-visible:outline-2 focus-visible:outline-turquoise">
            <Image src="/assets/logo2.png" alt="Ambangeg" width={48} height={48} className="size-12 rounded-full" />
          </Link>
          <div className="flex items-center gap-2"><DesktopNavigation /><MobileMenu /></div>
        </header>
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <Link href="/" className="hover:text-turquoise">Home</Link><span aria-hidden="true">/</span>
          <Link href="/mountains" className="hover:text-turquoise">Mountains</Link><span aria-hidden="true">/</span>
          <span aria-current="page" className="text-zinc-200">{guide.title}</span>
        </nav>

        <article>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#203e32] via-[#263432] to-[#202020] p-6 sm:p-10">
            <MountainSnow aria-hidden="true" className="pointer-events-none absolute -right-8 -bottom-8 size-60 text-turquoise/5 sm:size-80" />
            <div className="relative max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-turquoise">Mountain guide</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">{guide.title}</h1>
              <p className="mt-4 flex items-center gap-2 text-sm text-zinc-300"><MapPin aria-hidden="true" className="size-4 text-turquoise" />{mountain.location}</p>
              <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-200 sm:text-lg">{guide.introduction}</p>
            </div>
            <dl className="relative mt-8 grid gap-5 border-t border-white/10 pt-6 sm:grid-cols-3">
              <div><dt className="text-xs text-zinc-400">Elevation</dt><dd className="mt-1 font-semibold">{mountain.elevationMeters.toLocaleString("en-US")} m</dd></div>
              <div><dt className="text-xs text-zinc-400">Time to plan for</dt><dd className="mt-1 text-sm leading-6">{guide.duration}</dd></div>
              <div><dt className="text-xs text-zinc-400">Trail difficulty</dt><dd className="mt-1 text-sm leading-6">{guide.difficulty}</dd></div>
            </dl>
          </div>

          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
            <div className="min-w-0">
              {guide.sections.map((section, index) => (
                <section key={section.heading} id={`section-${index}`} aria-labelledby={`heading-${index}`} className="mb-9 scroll-mt-6">
                  <h2 id={`heading-${index}`} className="text-2xl font-semibold tracking-tight">{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 text-sm leading-7 text-zinc-300 sm:text-base">{paragraph}</p>)}
                </section>
              ))}
              <section aria-labelledby="sources-heading" className="rounded-2xl border border-white/10 bg-[#292929] p-5">
                <h2 id="sources-heading" className="text-lg font-semibold">Sources and planning updates</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">References reviewed on <time dateTime={guide.reviewedOn}>5 October 2026</time>. This is a planning overview; confirm current access, permits and fees with the park or local office before booking.</p>
                <ul className="mt-4 space-y-3">
                  {guide.sources.map((source) => <li key={source.url}><a href={source.url} className="inline-flex items-start gap-2 rounded text-sm leading-6 text-turquoise hover:underline focus-visible:outline-2 focus-visible:outline-turquoise">{source.label}<ArrowUpRight aria-hidden="true" className="mt-1 size-4 shrink-0" /></a></li>)}
                </ul>
              </section>
            </div>
            <aside className="space-y-5 lg:sticky lg:top-6">
              <nav aria-label="In this guide" className="rounded-2xl border border-white/10 bg-[#292929] p-5">
                <h2 className="text-sm font-semibold">In this guide</h2>
                <ul className="mt-4 space-y-3">{guide.sections.map((section, index) => <li key={section.heading}><a href={`#section-${index}`} className="rounded text-sm leading-6 text-zinc-400 hover:text-turquoise focus-visible:outline-turquoise">{section.heading}</a></li>)}</ul>
              </nav>
              <section aria-labelledby="preparation-heading" className="rounded-2xl border border-turquoise/20 bg-turquoise/5 p-5">
                <h2 id="preparation-heading" className="text-sm font-semibold text-turquoise">Before you go</h2>
                <ul className="mt-4 list-disc space-y-3 pl-4 text-sm leading-6 text-zinc-300">{guide.preparation.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            </aside>
          </div>
        </article>

        {getMountainItineraries(slug).length > 0 && <section aria-labelledby="itineraries-heading" className="mt-8 rounded-2xl border border-white/10 p-5">
          <h2 id="itineraries-heading" className="text-xl font-semibold">Hike this mountain as part of an itinerary</h2>
          <div className="mt-3 flex flex-wrap gap-3">{getMountainItineraries(slug).map((itinerary) => <Link key={itinerary.slug} href={`/mountains/#itinerary-${itinerary.slug}`} className="min-h-11 text-sm text-turquoise hover:underline">{itinerary.name}</Link>)}</div>
        </section>}
        <section aria-labelledby="related-heading" className="mt-12 border-t border-white/10 pt-8">
          <h2 id="related-heading" className="text-2xl font-semibold">Explore more mountain guides</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">{related.map((item) => <Link key={item.slug} href={`/mountains/${item.slug}`} className="rounded-2xl border border-white/10 bg-[#292929] p-5 transition-colors hover:border-turquoise/40 focus-visible:outline-2 focus-visible:outline-turquoise"><h3 className="font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{item.introduction}</p><span className="mt-4 inline-block text-sm text-turquoise">View mountain guide →</span></Link>)}</div>
          <Link href="/mountains" className="mt-6 inline-flex items-center gap-2 rounded text-sm text-turquoise hover:underline focus-visible:outline-turquoise"><ArrowLeft aria-hidden="true" className="size-4" />Back to the mountain map</Link>
        </section>
        <SiteFooter />
      </div>
    </main>
  );
}

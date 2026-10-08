"use client";

import { SiteLogo } from "@/components/site-logo";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Binoculars,
  Check,
  Clock3,
  Download,
  MapPin,
  MoreVertical,
  Share2,
  Sparkles,
  Star,
} from "lucide-react";
import { Fragment, useRef, useState, useSyncExternalStore } from "react";

import { useAuth } from "@/components/auth-provider";
import { DesktopNavigation } from "@/components/desktop-navigation";
import { MobileMenu } from "@/components/mobile-menu";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExploreMenu } from "@/components/explore-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const showcasePhotos = {
  trailGroup: "/assets/hike_20260902_172653-1190.jpg",
  forestGroup: "/assets/hike_20260902_224742-1707.jpg",
  mountainRoad: "/assets/sibuyan_0f35c182-dda7-4c56-a413-dd37c1cf72bf.jpg",
  mountainCoffee: "/assets/sibuyan_PXL_20260829_051147406.jpg",
} as const;

function ShowcasePhoto({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cn("relative isolate overflow-hidden bg-moss-100", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 33vw, 78vw"
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      aria-label={label}
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="size-10 rounded-xl bg-moss-100 text-foreground hover:bg-zinc-200 hover:text-foreground"
    >
      {children}
    </Button>
  );
}

const trips = [
  { title: "Hiking to Troll", location: "Ford Norway", photo: showcasePhotos.forestGroup },
  { title: "Forest escape", location: "Lofoten", photo: showcasePhotos.mountainCoffee },
  { title: "Rocky peaks", location: "Jotunheimen", photo: showcasePhotos.mountainRoad },
];

const mountainOptions = [
  "Mt. Amuyao",
  "Mt. Apo",
  "Mt. Arayat",
  "Mt. Batulao",
  "Mt. Daraitan",
  "Mt. Guiting-Guiting",
  "Mt. Halcon",
  "Mt. Isarog",
  "Mt. Kabunian",
  "Mt. Kanlaon",
  "Mt. Kitanglad",
  "Mt. Makiling",
  "Mt. Mariveles",
  "Mt. Napulak",
  "Mt. Pinatubo",
  "Mt. Pulag",
  "Mt. Talamitam",
  "Mt. Tapulao",
  "Mt. Ulap",
  "Osmeña Peak",
];

const dummyMountainBackgrounds = [
  { src: showcasePhotos.mountainRoad, position: "center" },
  { src: showcasePhotos.forestGroup, position: "center 42%" },
  { src: showcasePhotos.mountainCoffee, position: "center 55%" },
  { src: showcasePhotos.trailGroup, position: "center 38%" },
] as const;

function getMountainBackground(mountain: string) {
  const mountainIndex = Math.max(0, mountainOptions.indexOf(mountain));
  return dummyMountainBackgrounds[mountainIndex % dummyMountainBackgrounds.length];
}

function fitCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number, startingSize: number, font: string, weight = 400) {
  let size = startingSize;
  context.font = `${weight} ${size}px ${font}`;

  while (context.measureText(text).width > maxWidth && size > 44) {
    size -= 2;
    context.font = `${weight} ${size}px ${font}`;
  }
}

function TripCard({
  title,
  location,
  photo,
  onOpen,
}: (typeof trips)[number] & { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group h-full w-[78%] max-w-[78%] basis-[78%] shrink-0 snap-center text-left md:w-[82%] md:max-w-[82%] md:basis-[82%] lg:w-[calc((100%_-_2.5rem)/3)] lg:max-w-[calc((100%_-_2.5rem)/3)] lg:basis-[calc((100%_-_2.5rem)/3)]"
      aria-label={`Open ${title}`}
    >
      <Card className="h-full gap-0 overflow-hidden border border-border bg-white py-0 shadow-sm transition-transform duration-300 group-hover:-translate-y-1">
        <ShowcasePhoto
          src={photo}
          alt={`${title} in ${location}`}
          className="aspect-[1.4/1] w-full rounded-t-[20px]"
        />
        <CardContent className="min-h-24 space-y-1 px-4 py-3">
          <p className="text-[15px] font-medium text-foreground">{title}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 fill-zinc-500 text-muted-foreground" />
            {location}
          </p>
        </CardContent>
      </Card>
    </button>
  );
}

const sampleMemeText = "Ung bigla kang na-add sa gc kahit nagtatanong ka lang";

function MemeCard() {
  const [shared, setShared] = useState(false);

  const getMemeUrl = () => new URL("/assets/meme-poker-face.png", window.location.origin).href;

  const copyMemeLink = async (memeUrl: string) => {
    try {
      await navigator.clipboard.writeText(`${sampleMemeText}\n${memeUrl}`);
      setShared(true);
    } catch {
      window.open(memeUrl, "_blank", "noopener,noreferrer");
    }
  };

  const shareMeme = async () => {
    const memeUrl = getMemeUrl();

    try {
      const response = await fetch(memeUrl);
      if (!response.ok) throw new Error("Could not load the meme image.");

      const memeFile = new File([await response.blob()], "ambangeg-poker-face.png", {
        type: "image/png",
      });
      const canShareImage = navigator.canShare?.({ files: [memeFile] }) ?? false;

      if (navigator.share && canShareImage) {
        await navigator.share({
          title: "Ambangeg meme",
          text: sampleMemeText,
          files: [memeFile],
        });
      } else if (navigator.share) {
        await navigator.share({ title: "Ambangeg meme", text: sampleMemeText, url: memeUrl });
      } else {
        await copyMemeLink(memeUrl);
      }

      setShared(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;

      await copyMemeLink(memeUrl);
    }
  };

  const shareOnFacebook = () => {
    const shareUrl = new URL("https://www.facebook.com/sharer/sharer.php");
    shareUrl.searchParams.set("u", getMemeUrl());
    shareUrl.searchParams.set("quote", sampleMemeText);
    window.open(shareUrl.href, "facebook-share", "popup,width=680,height=560,noopener,noreferrer");
  };

  return (
    <article className="h-full w-[78%] max-w-[78%] basis-[78%] shrink-0 snap-center md:w-[82%] md:max-w-[82%] md:basis-[82%] lg:w-[calc((100%_-_2.5rem)/3)] lg:max-w-[calc((100%_-_2.5rem)/3)] lg:basis-[calc((100%_-_2.5rem)/3)]">
      <Card className="h-full gap-0 overflow-hidden border border-border bg-white py-0 text-foreground shadow-sm transition-transform duration-300 hover:-translate-y-1">
        <div className="relative aspect-[1.4/1] w-full overflow-hidden">
          <Image
            src="/assets/meme-poker-face.png"
            alt="Doodled poker face surrounded by group-chat and hiking symbols"
            fill
            sizes="(min-width: 1024px) 24vw, 78vw"
            className="object-cover"
            priority
          />
        </div>
        <CardContent className="flex min-h-24 items-start justify-between gap-3 px-4 py-3">
          <p className="text-sm font-semibold leading-5 text-foreground">{sampleMemeText}</p>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={shareOnFacebook}
              aria-label="Share meme on Facebook"
              title="Share on Facebook"
              className="size-9 rounded-full bg-[#1877f2] text-lg font-bold text-white hover:bg-[#0f69db] hover:text-white"
            >
              f
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => void shareMeme()}
              aria-label={shared ? "Meme shared or copied" : "Share meme image"}
              title={shared ? "Shared or copied" : "Share image"}
              className="size-9 rounded-full bg-zinc-900 text-white hover:bg-moss hover:text-white"
            >
              {shared ? <Check className="size-4" /> : <Share2 className="size-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}

function BagTagPreview({ mountain, hikerName }: { mountain: string; hikerName: string }) {
  const background = getMountainBackground(mountain);
  const [downloading, setDownloading] = useState(false);

  const downloadBagTag = async () => {
    setDownloading(true);

    try {
      await document.fonts.ready;

      const rootStyles = getComputedStyle(document.documentElement);
      const artisticFont = rootStyles.getPropertyValue("--font-caveat").trim() || '"Caveat", cursive';
      const regularFont = rootStyles.getPropertyValue("--font-geist-sans").trim() || "Arial, sans-serif";

      const photo = new window.Image();
      photo.src = background.src;
      await photo.decode();

      const width = 1080;
      const height = 1712;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) return;

      const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight);
      const imageWidth = photo.naturalWidth * scale;
      const imageHeight = photo.naturalHeight * scale;
      const focusMatch = background.position.match(/(\d+)%/);
      const focusY = focusMatch ? Number(focusMatch[1]) / 100 : 0.5;
      context.drawImage(photo, (width - imageWidth) / 2, (height - imageHeight) * focusY, imageWidth, imageHeight);

      const fullOverlay = context.createLinearGradient(0, 0, 0, height);
      fullOverlay.addColorStop(0, "rgba(0, 0, 0, 0.35)");
      fullOverlay.addColorStop(0.48, "rgba(0, 0, 0, 0.05)");
      fullOverlay.addColorStop(1, "rgba(7, 26, 17, 0.9)");
      context.fillStyle = fullOverlay;
      context.fillRect(0, 0, width, height);

      const bottomOverlay = context.createLinearGradient(0, height / 2, 0, height);
      bottomOverlay.addColorStop(0, "rgba(7, 26, 17, 0)");
      bottomOverlay.addColorStop(1, "rgba(7, 26, 17, 0.7)");
      context.fillStyle = bottomOverlay;
      context.fillRect(0, height / 2, width, height / 2);

      const displayName = hikerName.trim() || "Your name";
      context.textAlign = "center";
      context.textBaseline = "alphabetic";
      fitCanvasText(context, displayName, width - 140, 184, artisticFont, 600);
      context.lineJoin = "round";
      context.lineWidth = 6;
      context.strokeStyle = "rgba(0, 0, 0, 0.34)";
      context.strokeText(displayName, width / 2, height - 310);
      context.fillStyle = "#ffffff";
      context.fillText(displayName, width / 2, height - 310);

      context.fillStyle = "rgba(255, 255, 255, 0.55)";
      context.fillRect(width / 2 - 110, height - 250, 220, 3);

      fitCanvasText(context, mountain, width - 150, 82, regularFont, 500);
      context.fillStyle = "#ffffff";
      context.fillText(mountain, width / 2, height - 142);

      const link = document.createElement("a");
      const safeMountain = mountain.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const safeHikerName = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      link.download = `${safeMountain || "mountain"}-${safeHikerName || "your-name"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-col md:col-start-2">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Bag tag preview
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={downloadBagTag}
          disabled={downloading || !mountain}
          className="h-8 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:bg-white/60 hover:text-foreground"
        >
          <Download className="size-3.5" />
          {downloading ? "Preparing…" : "Download PNG"}
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div
          className="relative aspect-[53.98/85.6] w-full max-w-[260px] overflow-hidden rounded-[18px] bg-[#183f2c] text-white shadow-md ring-1 ring-white/25 lg:max-w-[300px]"
          style={{ contain: "paint", transform: "translateZ(0)" }}
        >
          <Image
            src={background.src}
            alt={`Placeholder view of ${mountain}`}
            fill
            sizes="(min-width: 1024px) 300px, 260px"
            className="object-cover"
            style={{ objectPosition: background.position }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/5 to-[#071a11]/95" />

          <div className="absolute left-1/2 top-5 z-20 h-3.5 w-14 -translate-x-1/2 rounded-full bg-black/55 shadow-inner ring-1 ring-white/35" />

          <div className="relative z-10 flex h-full flex-col justify-end p-5 lg:p-6">
            <div className="px-2 py-3 text-center">
              <p className="font-artistic text-[3rem] font-semibold leading-[0.86] tracking-tight [text-shadow:0_1px_2px_rgba(0,0,0,.55)] lg:text-[3.35rem]">
                {hikerName.trim() || "Your name"}
              </p>
              <div className="mx-auto my-4 h-px w-16 bg-white/55" />
              <p className="text-xl font-medium leading-tight tracking-[0.04em] text-white lg:text-2xl">
                {mountain || "Choose a mountain"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HikerDetailsCard() {
  const [mountain, setMountain] = useState("");
  const [hikerName, setHikerName] = useState("");
  const [generated, setGenerated] = useState(false);

  return (
    <Card
      className="w-full max-w-full gap-0 overflow-hidden border border-input bg-white py-0 text-foreground ring-0 shadow-[0_10px_25px_-5px_rgba(54,80,4,0.06)]"
    >
      <CardContent className="grid h-full min-w-0 max-w-full gap-8 p-5 md:grid-cols-2 lg:p-6">
        <div className="flex min-w-0 max-w-full flex-col justify-center gap-4">
          <div>
            <p className="text-lg font-semibold">Flex My Hike</p>
            <p className="mt-1 text-xs text-muted-foreground">Choose a mountain and add your name.</p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground" htmlFor="mountain-select">
              Mountain
            </label>
            <Select value={mountain || null} onValueChange={(value) => { setMountain(value ?? ""); setGenerated(false); }}>
              <SelectTrigger
                id="mountain-select"
                aria-label="Select a mountain"
                className="h-12 w-full min-w-0 max-w-full rounded-md border-white/80 bg-white/90 px-3 text-foreground shadow-sm hover:bg-white focus-visible:border-moss-deep focus-visible:ring-moss-deep/30 data-[size=default]:h-12"
              >
                <SelectValue placeholder="Choose a mountain" />
              </SelectTrigger>
              <SelectContent
                align="start"
                className="border border-border bg-white text-foreground ring-slate-900/10"
              >
                {mountainOptions.map((option) => (
                  <SelectItem
                    key={option}
                    value={option}
                    className="rounded-none py-2.5 pl-4 text-foreground focus:bg-moss/10 focus:text-moss-deep"
                  >
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground" htmlFor="hiker-name">
              Hiker name
            </label>
            <Input
              id="hiker-name"
              name="hikerName"
              autoComplete="name"
              value={hikerName}
              onChange={(event) => { setHikerName(event.target.value); setGenerated(false); }}
              placeholder="Enter hiker name"
              className="h-12 w-full min-w-0 max-w-full rounded-md border-white/80 bg-white/90 px-3 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:border-moss-deep focus-visible:ring-moss-deep/30 md:text-sm"
            />
          </div>

          <Button
            type="button"
            onClick={() => setGenerated(true)}
            className="h-12 w-full rounded-md bg-moss font-semibold text-white shadow-md shadow-moss-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-moss-hover hover:shadow-lg hover:shadow-moss-950/25 active:translate-y-0 active:scale-[0.98]"
          >
            {generated ? <><Sparkles className="size-4" /> Bag Tag Ready</> : "Generate Bag Tag"}
          </Button>
        </div>

        <BagTagPreview mountain={mountain} hikerName={hikerName} />
      </CardContent>
    </Card>
  );
}

function HomeScreen({
  onOpenTrip,
}: {
  onOpenTrip: (trip: (typeof trips)[number]) => void;
}) {
  const { authError, loading, user, signOutUser } = useAuth();
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: -1 | 1) => {
    carouselRef.current?.scrollBy({
      left: direction * carouselRef.current.clientWidth * 0.72,
      behavior: "smooth",
    });
  };

  return (
    <div className="flex min-h-full min-w-0 flex-col bg-background text-foreground lg:h-full">
      <main className="no-scrollbar mx-auto w-full min-w-0 site-page-shell flex-1 overflow-hidden px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] lg:overflow-y-auto lg:px-32 lg:pt-0 xl:px-40">
        <header className="desktop-sticky-bar mb-5 flex w-full items-center justify-between lg:sticky lg:top-0 lg:z-40 lg:mb-8 lg:py-2">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moss-deep"
          >
            <SiteLogo />
            <div className="hidden xl:block">
              <p className="text-base font-semibold">Ambangeg</p>
              <p className="text-xs text-muted-foreground">Let&apos;s hike!</p>
            </div>
          </Link>
          <div className="hidden xl:block xl:-translate-x-5 2xl:-translate-x-8">
            <ExploreMenu active="popular" compact />
          </div>
          <div className="flex items-center gap-2">
            <DesktopNavigation />
            <div className="lg:hidden">
            {loading ? (
              <Button
                type="button"
                variant="ghost"
                disabled
                className="h-10 rounded-full border border-border bg-moss-50 px-4 text-muted-foreground"
              >
                Checking session…
              </Button>
            ) : user ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void signOutUser();
                }}
              >
                <Button
                  type="submit"
                  variant="ghost"
                  title={`Signed in as ${user.email ?? user.name ?? "a hiker"}`}
                  className="h-10 rounded-full border border-border bg-moss-50 px-3 text-foreground hover:bg-moss-100 hover:text-foreground lg:px-4"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-moss text-xs font-bold text-white">
                    {(user.name ?? user.email ?? "H").charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </form>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-full bg-moss px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-moss-hover"
              >
                Log in or sign up
              </Link>
            )}
            </div>
            <MobileMenu />
          </div>
        </header>

        {authError && (
          <p role="alert" className="mb-5 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-700">
            Google sign-in failed: {authError}
          </p>
        )}

        <div className="mb-4">
          <p className="mb-2 hidden text-sm font-medium uppercase tracking-[0.2em] text-moss-deep lg:block">Akyat na akyat ka na beh?</p>
          <h1 className="text-[28px] font-semibold tracking-[-0.04em] lg:text-5xl">Ano? Tra?</h1>
        </div>

        <div className="desktop-sticky-bar lg:sticky lg:top-16 lg:z-30 lg:-mx-2 lg:px-2 lg:py-3 xl:hidden">
          <ExploreMenu active="popular" />
        </div>
        <div className="mb-7 w-full min-w-0 max-w-full overflow-hidden">
          <div className="mt-6 lg:mt-8">
            <HikerDetailsCard />
          </div>
          <div className="mt-3 hidden items-center justify-between lg:mt-5 lg:flex">
            <p className="text-sm font-medium text-muted-foreground">Trail picks &amp; memes</p>
            <div className="flex gap-2">
              <IconButton label="Previous card" onClick={() => scrollCarousel(-1)}>
                <ArrowLeft className="size-4" />
              </IconButton>
              <IconButton label="Next card" onClick={() => scrollCarousel(1)}>
                <ArrowRight className="size-4" />
              </IconButton>
            </div>
          </div>
          <div
            ref={carouselRef}
            className="no-scrollbar -mx-5 mt-3 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-5 pb-1 lg:mx-0 lg:gap-5 lg:px-0"
          >
            <MemeCard />
            {trips.map((trip) => (
              <Fragment key={trip.title}>
                <TripCard {...trip} onOpen={() => onOpenTrip(trip)} />
              </Fragment>
            ))}
          </div>
        </div>

        <section className="lg:mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-medium lg:text-2xl">Top offer</h2>
            <Button variant="ghost" className="hidden text-moss-deep hover:bg-moss/10 hover:text-moss-deep lg:inline-flex">View all <ArrowRight /></Button>
          </div>
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:px-0">
            <Card className="min-w-[86%] gap-0 border border-border bg-white py-0 text-foreground shadow-none lg:min-w-0">
              <CardContent className="flex items-center gap-4 p-3">
                <ShowcasePhoto src={showcasePhotos.trailGroup} alt="Hikers on a mountain trail" className="size-20 shrink-0 rounded-2xl" />
                <div className="min-w-0">
                  <p className="truncate text-base font-medium">Adventure holidays</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3 fill-zinc-500 text-muted-foreground" />Ford Norway</p>
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-[72%] gap-0 border border-border bg-white py-0 text-foreground shadow-none lg:min-w-0">
              <CardContent className="flex items-center gap-4 p-3">
                <ShowcasePhoto src={showcasePhotos.forestGroup} alt="Hikers in a forest clearing" className="size-20 shrink-0 rounded-2xl" />
                <p className="text-base font-medium">Snowy escape</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <SiteFooter />

      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="size-6 shrink-0 text-moss-deep" />
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function TripDetail({ trip, onBack }: { trip: (typeof trips)[number]; onBack: () => void }) {
  const [started, setStarted] = useState(false);

  return (
    <div className="relative flex min-h-full min-w-0 flex-col bg-background text-foreground lg:h-full">
      <main className="no-scrollbar mx-auto w-full min-w-0 site-page-shell flex-1 px-5 pb-24 pt-[max(1.25rem,env(safe-area-inset-top))] lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,.88fr)] lg:content-start lg:gap-x-10 lg:overflow-y-auto lg:px-32 lg:pb-28 lg:pt-8 xl:px-40">
        <header className="mb-5 flex items-center justify-between lg:col-span-2 lg:mb-8">
          <IconButton label="Back to trips" onClick={onBack}><ArrowLeft className="size-6" /></IconButton>
          <IconButton label="More options"><MoreVertical className="size-6" /></IconButton>
        </header>

        <Card className="gap-0 overflow-hidden border border-border bg-white py-0 shadow-none lg:self-start">
          <div className="relative">
            <ShowcasePhoto
              src={trip.photo}
              alt={`${trip.title} in ${trip.location}`}
              className="aspect-[1.14/1] w-full lg:aspect-[1.35/1]"
            />
            <p className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-black/25 px-2 py-1 text-xs text-white backdrop-blur-sm">
              <MapPin className="size-3.5 fill-white" />{trip.location}
            </p>
          </div>
          <CardContent className="grid grid-cols-3 gap-2 px-4 py-5">
            <Stat icon={Clock3} label="Time" value="10–12 h" />
            <Stat icon={Activity} label="Distance" value="28 km" />
            <Stat icon={Star} label="Level" value="Expert" />
          </CardContent>
        </Card>

        <Tabs defaultValue="details" className="mt-7 lg:mt-0 lg:min-w-0">
          <div className="flex items-start justify-between gap-3">
            <TabsList variant="line" className="h-9 flex-1 justify-start gap-7 bg-transparent p-0">
              <TabsTrigger value="details" className="h-9 flex-none px-0 text-sm text-moss-deep after:bg-moss data-active:text-moss-deep">Details</TabsTrigger>
              <TabsTrigger value="route" className="h-9 flex-none px-0 text-sm text-moss-deep after:bg-moss data-active:text-moss-deep">Route list</TabsTrigger>
            </TabsList>
            <div className="pt-1 text-right">
              <div className="flex items-center justify-end gap-1 text-moss-deep"><Binoculars className="mr-1 size-4" />{[1,2,3,4,5].map((dot) => <i key={dot} className="size-2.5 rounded-full bg-moss" />)}</div>
              <p className="mt-1 text-[9px] text-muted-foreground">1345 reviews</p>
            </div>
          </div>

          <TabsContent value="details" className="mt-5">
            <h2 className="text-2xl font-medium tracking-tight">{trip.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{trip.location}</p>
            <p className="mt-5 text-[15px] leading-6 text-muted-foreground">
              <strong className="font-semibold text-foreground">We Norwegian walk—a lot.</strong><br />
              When the spring arrives and warm rays of sunlight finally hit the landscape, forcing the snow in the mountain to a silent retreat, people of all ages go outside and go trekking.
            </p>
          </TabsContent>
          <TabsContent value="route" className="mt-5 space-y-3">
            {["Skjeggedal trailhead", "Ringedalsvatnet viewpoint", "Trolltunga summit"].map((stop, index) => (
              <div key={stop} className="flex items-center gap-3 rounded-2xl bg-moss-50 p-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-moss font-semibold text-white">{index + 1}</span>
                <span className="text-sm text-foreground">{stop}</span>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>

      <div className="pointer-events-none fixed bottom-0 left-1/2 h-32 w-full max-w-[390px] -translate-x-1/2 bg-gradient-to-t from-background via-background/95 to-transparent lg:hidden" />
      <Button
        type="button"
        onClick={() => setStarted(true)}
        className="fixed bottom-7 left-1/2 z-10 h-14 w-[68%] max-w-[270px] -translate-x-1/2 rounded-full bg-moss text-base font-semibold text-white shadow-[0_16px_35px_rgba(54,80,4,0.15)] hover:bg-moss-hover lg:absolute lg:bottom-10 lg:left-auto lg:right-10 lg:w-[340px] lg:max-w-none lg:translate-x-0"
      >
        {started ? <><Sparkles className="size-5" /> Trip started</> : <>Start Your Trip <ArrowRight className="ml-2 size-5" /></>}
      </Button>
    </div>
  );
}

function subscribeToHistory(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getScreenFromUrl(): "home" | "detail" {
  return new URLSearchParams(window.location.search).get("screen") === "detail" ? "detail" : "home";
}

export function HikingApp({
  initialScreen,
}: {
  initialScreen?: "home" | "detail";
}) {
  const urlScreen = useSyncExternalStore(subscribeToHistory, getScreenFromUrl, () => "home");
  const [screenOverride, setScreenOverride] = useState<"home" | "detail" | null>(null);
  const screen = screenOverride ?? initialScreen ?? urlScreen;
  const [selectedTrip, setSelectedTrip] = useState(trips[0]);

  const openTrip = (trip: (typeof trips)[number]) => {
    setSelectedTrip(trip);
    setScreenOverride("detail");
  };

  return (
    <main className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-background">
      <section className="h-dvh min-h-0 w-full overflow-hidden bg-background">
        <div className="no-scrollbar h-full overflow-y-auto overscroll-contain">
          {screen === "home" ? (
            <HomeScreen onOpenTrip={openTrip} />
          ) : (
            <TripDetail trip={selectedTrip} onBack={() => setScreenOverride("home")} />
          )}
        </div>
      </section>
    </main>
  );
}

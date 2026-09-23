"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Binoculars,
  Clock3,
  Download,
  MapPin,
  Menu,
  MoreVertical,
  Sparkles,
  Star,
} from "lucide-react";
import { Fragment, useState, useSyncExternalStore } from "react";

import { useAuth } from "@/components/auth-provider";
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
    <div className={cn("relative isolate overflow-hidden bg-zinc-700", className)}>
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
      className="size-10 rounded-xl bg-white/10 text-zinc-100 hover:bg-white/15 hover:text-white"
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
      className="group w-[78%] max-w-[78%] basis-[78%] shrink-0 snap-center text-left md:w-[82%] md:max-w-[82%] md:basis-[82%] lg:w-full lg:max-w-none lg:basis-auto"
      aria-label={`Open ${title}`}
    >
      <Card className="gap-0 overflow-hidden border-0 bg-[#3c3c3c] py-0 shadow-none transition-transform duration-300 group-hover:-translate-y-1">
        <ShowcasePhoto
          src={photo}
          alt={`${title} in ${location}`}
          className="aspect-[1.4/1] w-full rounded-t-[20px]"
        />
        <CardContent className="space-y-1 px-4 py-3">
          <p className="text-[15px] font-medium text-zinc-100">{title}</p>
          <p className="flex items-center gap-1 text-xs text-zinc-400">
            <MapPin className="size-3 fill-zinc-300 text-zinc-300" />
            {location}
          </p>
        </CardContent>
      </Card>
    </button>
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

      context.beginPath();
      context.roundRect(0, 0, width, height, 58);
      context.clip();

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
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          Bag tag preview
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={downloadBagTag}
          disabled={downloading || !mountain}
          className="h-8 rounded-full px-3 text-xs font-semibold text-slate-700 hover:bg-white/60 hover:text-slate-950"
        >
          <Download className="size-3.5" />
          {downloading ? "Preparing…" : "Download PNG"}
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="relative aspect-[53.98/85.6] w-full max-w-[260px] overflow-hidden rounded-[18px] bg-[#183f2c] text-white shadow-[0_24px_52px_rgba(20,77,48,0.38)] ring-1 ring-white/35 lg:max-w-[300px]">
          <Image
            src={background.src}
            alt={`Placeholder view of ${mountain}`}
            fill
            sizes="(min-width: 1024px) 300px, 260px"
            className="object-cover transition-opacity duration-300"
            style={{ objectPosition: background.position }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/5 to-[#071a11]/90" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#071a11]/70 to-transparent" />

          <div className="absolute left-1/2 top-5 z-20 h-3.5 w-14 -translate-x-1/2 rounded-full bg-black/55 shadow-inner ring-1 ring-white/35" />

          <div className="relative z-10 flex h-full flex-col justify-end p-5 lg:p-6">
            <div className="px-2 py-3 text-center">
              <p className="font-artistic text-[3rem] font-semibold leading-[0.86] tracking-tight [text-shadow:-1px_-1px_0_rgba(0,0,0,.32),1px_-1px_0_rgba(0,0,0,.32),-1px_1px_0_rgba(0,0,0,.32),1px_1px_0_rgba(0,0,0,.32)] lg:text-[3.35rem]">
                {hikerName.trim() || "Your name"}
              </p>
              <div className="mx-auto my-4 h-px w-16 bg-white/55" />
              <p className="text-xl font-medium leading-tight tracking-[0.04em] text-white drop-shadow-md lg:text-2xl">
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
      className="w-full gap-0 border border-white/70 py-0 text-slate-950 shadow-[0_18px_50px_rgba(74,58,160,0.18)]"
      style={{
        background:
          "radial-gradient(circle at 8% 8%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0) 34%), radial-gradient(circle at 92% 5%, rgba(34,199,214,0.72) 0%, rgba(34,199,214,0) 42%), radial-gradient(circle at 88% 92%, rgba(85,201,90,0.62) 0%, rgba(85,201,90,0) 44%), radial-gradient(circle at 8% 96%, rgba(184,245,225,0.9) 0%, rgba(184,245,225,0) 40%), linear-gradient(135deg, #f5fffa 0%, #dff7f2 48%, #d9f6fb 100%)",
      }}
    >
      <CardContent className="grid h-full gap-8 p-5 md:grid-cols-2 lg:p-6">
        <div className="flex flex-col justify-center gap-4">
          <div>
            <p className="text-lg font-semibold">Flex My Hike</p>
            <p className="mt-1 text-xs text-slate-600">Choose a mountain and add your name.</p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700" htmlFor="mountain-select">
              Mountain
            </label>
            <Select value={mountain || null} onValueChange={(value) => { setMountain(value ?? ""); setGenerated(false); }}>
              <SelectTrigger
                id="mountain-select"
                aria-label="Select a mountain"
                className="h-12 w-full rounded-md border-white/80 bg-white/70 px-3 text-slate-900 shadow-sm backdrop-blur-md hover:bg-white/85 focus-visible:border-turquoise focus-visible:ring-turquoise/30 data-[size=default]:h-12"
              >
                <SelectValue placeholder="Choose a mountain" />
              </SelectTrigger>
              <SelectContent
                align="start"
                className="border-0 bg-white/95 text-slate-900 ring-slate-900/10 backdrop-blur-xl"
              >
                {mountainOptions.map((option) => (
                  <SelectItem
                    key={option}
                    value={option}
                    className="rounded-none py-2.5 pl-4 text-slate-800 focus:bg-emerald-100 focus:text-emerald-950"
                  >
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700" htmlFor="hiker-name">
              Hiker name
            </label>
            <Input
              id="hiker-name"
              name="hikerName"
              autoComplete="name"
              value={hikerName}
              onChange={(event) => { setHikerName(event.target.value); setGenerated(false); }}
              placeholder="Enter hiker name"
              className="h-12 rounded-md border-white/80 bg-white/70 px-3 text-base text-slate-900 shadow-sm backdrop-blur-md placeholder:text-slate-500 focus-visible:border-turquoise focus-visible:ring-turquoise/30 md:text-sm"
            />
          </div>

          <Button
            type="button"
            onClick={() => setGenerated(true)}
            className="h-12 w-full rounded-md bg-grass font-semibold text-white shadow-md shadow-green-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-grass-hover hover:shadow-lg hover:shadow-green-950/25 active:translate-y-0 active:scale-[0.98]"
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
  const [activeNav, setActiveNav] = useState("home");
  const { authError, loading, user, signOutUser } = useAuth();

  return (
    <div className="flex min-h-full min-w-0 flex-col bg-[#202020] text-white lg:h-full">
      <main className="no-scrollbar mx-auto w-full min-w-0 max-w-[1600px] flex-1 overflow-hidden px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] lg:overflow-y-auto lg:px-32 lg:pt-8 xl:px-40">
        <header className="mb-5 flex w-full items-center justify-between lg:mb-10">
          <div className="flex items-center gap-3">
            <Image
              src="/assets/logo2.png"
              alt="Ambangeg logo"
              width={48}
              height={48}
              className="size-12 rounded-full object-contain"
              priority
            />
            <div className="hidden lg:block">
              <p className="text-base font-semibold">Ambangeg</p>
              <p className="text-xs text-zinc-500">Let&apos;s hike!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Desktop navigation">
              {[
                ["home", "Discover"],
                ["activity", "Activity"],
                ["profile", "Profile"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveNav(value)}
                  className={cn(
                    "rounded-full px-4 text-zinc-400 hover:bg-white/10 hover:text-white",
                    activeNav === value && "bg-white/10 text-turquoise",
                  )}
                >
                  {label}
                </Button>
              ))}
            </nav>
            {loading ? (
              <Button
                type="button"
                variant="ghost"
                disabled
                className="h-10 rounded-full border border-white/15 bg-white/5 px-4 text-zinc-400"
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
                  className="h-10 rounded-full border border-white/15 bg-white/5 px-3 text-zinc-200 hover:bg-white/10 hover:text-white lg:px-4"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-grass text-xs font-bold text-white">
                    {(user.name ?? user.email ?? "H").charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </form>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-full bg-grass px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-grass-hover"
              >
                Log in or sign up
              </Link>
            )}
            <div className="lg:hidden">
              <IconButton label="Open menu"><Menu className="size-6" /></IconButton>
            </div>
          </div>
        </header>

        {authError && (
          <p role="alert" className="mb-5 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            Google sign-in failed: {authError}
          </p>
        )}

        <div className="mb-4">
          <p className="mb-2 hidden text-sm font-medium uppercase tracking-[0.2em] text-turquoise lg:block">Akyat na akyat ka na beh?</p>
          <h1 className="text-[28px] font-semibold tracking-[-0.04em] lg:text-5xl">Ano? Tra?</h1>
        </div>

        <div className="mb-7 w-full min-w-0 max-w-full overflow-hidden">
          <ExploreMenu active="popular" />
          <div className="mt-6 lg:mt-8">
            <HikerDetailsCard />
          </div>
          <div className="no-scrollbar -mx-5 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 lg:mx-0 lg:mt-5 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0">
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
            <Button variant="ghost" className="hidden text-turquoise hover:bg-turquoise/10 hover:text-turquoise lg:inline-flex">View all <ArrowRight /></Button>
          </div>
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:px-0">
            <Card className="min-w-[86%] gap-0 border-0 bg-[#3c3c3c] py-0 text-white shadow-none lg:min-w-0">
              <CardContent className="flex items-center gap-4 p-3">
                <ShowcasePhoto src={showcasePhotos.trailGroup} alt="Hikers on a mountain trail" className="size-20 shrink-0 rounded-2xl" />
                <div className="min-w-0">
                  <p className="truncate text-base font-medium">Adventure holidays</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400"><MapPin className="size-3 fill-zinc-300 text-zinc-300" />Ford Norway</p>
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-[72%] gap-0 border-0 bg-[#3c3c3c] py-0 text-white shadow-none lg:min-w-0">
              <CardContent className="flex items-center gap-4 p-3">
                <ShowcasePhoto src={showcasePhotos.forestGroup} alt="Hikers in a forest clearing" className="size-20 shrink-0 rounded-2xl" />
                <p className="text-base font-medium">Snowy escape</p>
              </CardContent>
            </Card>
          </div>
        </section>

      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="size-6 shrink-0 text-turquoise" />
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] text-zinc-400">{label}</p>
        <p className="truncate text-sm font-medium text-zinc-100">{value}</p>
      </div>
    </div>
  );
}

function TripDetail({ trip, onBack }: { trip: (typeof trips)[number]; onBack: () => void }) {
  const [started, setStarted] = useState(false);

  return (
    <div className="relative flex min-h-full min-w-0 flex-col bg-[#202020] text-white lg:h-full">
      <main className="no-scrollbar mx-auto w-full min-w-0 max-w-[1600px] flex-1 px-5 pb-24 pt-[max(1.25rem,env(safe-area-inset-top))] lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,.88fr)] lg:content-start lg:gap-x-10 lg:overflow-y-auto lg:px-32 lg:pb-28 lg:pt-8 xl:px-40">
        <header className="mb-5 flex items-center justify-between lg:col-span-2 lg:mb-8">
          <IconButton label="Back to trips" onClick={onBack}><ArrowLeft className="size-6" /></IconButton>
          <IconButton label="More options"><MoreVertical className="size-6" /></IconButton>
        </header>

        <Card className="gap-0 overflow-hidden border-0 bg-[#3c3c3c] py-0 shadow-none lg:self-start">
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
              <TabsTrigger value="details" className="h-9 flex-none px-0 text-sm text-turquoise after:bg-turquoise data-active:text-turquoise">Details</TabsTrigger>
              <TabsTrigger value="route" className="h-9 flex-none px-0 text-sm text-turquoise after:bg-turquoise data-active:text-turquoise">Route list</TabsTrigger>
            </TabsList>
            <div className="pt-1 text-right">
              <div className="flex items-center justify-end gap-1 text-turquoise"><Binoculars className="mr-1 size-4" />{[1,2,3,4,5].map((dot) => <i key={dot} className="size-2.5 rounded-full bg-grass" />)}</div>
              <p className="mt-1 text-[9px] text-zinc-400">1345 reviews</p>
            </div>
          </div>

          <TabsContent value="details" className="mt-5">
            <h2 className="text-2xl font-medium tracking-tight">{trip.title}</h2>
            <p className="mt-2 text-sm text-zinc-300">{trip.location}</p>
            <p className="mt-5 text-[15px] leading-6 text-zinc-300">
              <strong className="font-semibold text-white">We Norwegian walk—a lot.</strong><br />
              When the spring arrives and warm rays of sunlight finally hit the landscape, forcing the snow in the mountain to a silent retreat, people of all ages go outside and go trekking.
            </p>
          </TabsContent>
          <TabsContent value="route" className="mt-5 space-y-3">
            {["Skjeggedal trailhead", "Ringedalsvatnet viewpoint", "Trolltunga summit"].map((stop, index) => (
              <div key={stop} className="flex items-center gap-3 rounded-2xl bg-[#303030] p-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-grass font-semibold text-white">{index + 1}</span>
                <span className="text-sm text-zinc-200">{stop}</span>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>

      <div className="pointer-events-none fixed bottom-0 left-1/2 h-32 w-full max-w-[390px] -translate-x-1/2 bg-gradient-to-t from-[#202020] via-[#202020]/95 to-transparent lg:hidden" />
      <Button
        type="button"
        onClick={() => setStarted(true)}
        className="fixed bottom-7 left-1/2 z-10 h-14 w-[68%] max-w-[270px] -translate-x-1/2 rounded-full bg-grass text-base font-semibold text-white shadow-[0_16px_35px_rgba(34,199,214,0.2)] hover:bg-grass-hover lg:absolute lg:bottom-10 lg:left-auto lg:right-10 lg:w-[340px] lg:max-w-none lg:translate-x-0"
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
    <main className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-[#202020]">
      <section className="h-dvh min-h-0 w-full overflow-hidden bg-[#202020]">
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

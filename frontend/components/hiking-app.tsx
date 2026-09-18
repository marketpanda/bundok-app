"use client";

import Image from "next/image";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Binoculars,
  Clock3,
  MapPin,
  Menu,
  MoreVertical,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
} from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

function HomeScreen({ onOpenTrip }: { onOpenTrip: (trip: (typeof trips)[number]) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("popular");
  const [activeNav, setActiveNav] = useState("home");
  const filteredTrips = useMemo(
    () => trips.filter((trip) => `${trip.title} ${trip.location}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

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
          <div className="flex items-center gap-1">
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
                    activeNav === value && "bg-white/10 text-[#13d5bc]",
                  )}
                >
                  {label}
                </Button>
              ))}
            </nav>
            <div className="lg:hidden">
              <IconButton label="Open menu"><Menu className="size-6" /></IconButton>
            </div>
          </div>
        </header>

        <div className="mb-4 lg:flex lg:items-end lg:justify-between lg:gap-10">
          <div>
            <p className="mb-2 hidden text-sm font-medium uppercase tracking-[0.2em] text-[#13d5bc] lg:block">Find your next trail</p>
            <h1 className="mb-4 text-[28px] font-semibold tracking-[-0.04em] lg:mb-0 lg:text-5xl">Ano? Tra?</h1>
          </div>
          <div className="relative w-full max-w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-300" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search hiking trips"
              className="h-14 rounded-xl border-0 bg-[#3c3c3c] pl-12 pr-12 text-base tracking-[0.16em] text-white placeholder:text-zinc-300 focus-visible:ring-[#13d5bc]/60"
            />
            <SlidersHorizontal className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-zinc-200" />
          </div>
        </div>

        <Tabs value={category} onValueChange={setCategory} className="mb-7 w-full min-w-0 max-w-full overflow-hidden">
          <TabsList className="no-scrollbar h-11 w-full min-w-0 max-w-full justify-start gap-3 overflow-x-auto bg-transparent p-0 group-data-horizontal/tabs:h-11">
            <TabsTrigger value="popular" className="h-11 w-40 flex-none justify-center overflow-hidden rounded-full border border-white/[0.06] bg-[#383838] px-5 text-sm font-medium text-zinc-200 shadow-sm transition-all duration-200 hover:bg-[#414141] data-active:border-[#13d5bc] data-active:bg-[#13d5bc] data-active:text-white">Most popular</TabsTrigger>
            <TabsTrigger value="scenic" className="h-11 w-40 flex-none justify-center overflow-hidden rounded-full border border-white/[0.06] bg-[#383838] px-5 text-sm font-medium text-zinc-200 shadow-sm transition-all duration-200 hover:bg-[#414141] data-active:border-[#13d5bc] data-active:bg-[#13d5bc] data-active:text-white">Scenic routes</TabsTrigger>
            <TabsTrigger value="nearby" className="h-11 w-40 flex-none justify-center overflow-hidden rounded-full border border-white/[0.06] bg-[#383838] px-5 text-sm font-medium text-zinc-200 shadow-sm transition-all duration-200 hover:bg-[#414141] data-active:border-[#13d5bc] data-active:bg-[#13d5bc] data-active:text-white">Nearby</TabsTrigger>
          </TabsList>
          <TabsContent value={category} className="mt-6 w-full min-w-0 lg:mt-8">
            <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0">
              {filteredTrips.length ? filteredTrips.map((trip) => (
                <TripCard key={trip.title} {...trip} onOpen={() => onOpenTrip(trip)} />
              )) : (
                <div className="flex h-64 w-full items-center justify-center rounded-3xl bg-[#303030] text-zinc-400">No trails found</div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <section className="lg:mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-medium lg:text-2xl">Top offer</h2>
            <Button variant="ghost" className="hidden text-[#13d5bc] hover:bg-[#13d5bc]/10 hover:text-[#13d5bc] lg:inline-flex">View all <ArrowRight /></Button>
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
      <Icon className="size-6 shrink-0 text-[#13d5bc]" />
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
              <TabsTrigger value="details" className="h-9 flex-none px-0 text-sm text-[#13d5bc] after:bg-[#13d5bc] data-active:text-[#13d5bc]">Details</TabsTrigger>
              <TabsTrigger value="route" className="h-9 flex-none px-0 text-sm text-[#13d5bc] after:bg-[#13d5bc] data-active:text-[#13d5bc]">Route list</TabsTrigger>
            </TabsList>
            <div className="pt-1 text-right">
              <div className="flex items-center justify-end gap-1 text-[#13d5bc]"><Binoculars className="mr-1 size-4" />{[1,2,3,4,5].map((dot) => <i key={dot} className="size-2.5 rounded-full bg-[#13d5bc]" />)}</div>
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
                <span className="flex size-8 items-center justify-center rounded-full bg-[#13d5bc] font-semibold text-[#14332f]">{index + 1}</span>
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
        className="fixed bottom-7 left-1/2 z-10 h-14 w-[68%] max-w-[270px] -translate-x-1/2 rounded-full bg-[#13d5bc] text-base font-semibold text-white shadow-[0_16px_35px_rgba(19,213,188,0.22)] hover:bg-[#10bfa9] lg:absolute lg:bottom-10 lg:left-auto lg:right-10 lg:w-[340px] lg:max-w-none lg:translate-x-0"
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

export function HikingApp({ initialScreen }: { initialScreen?: "home" | "detail" }) {
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

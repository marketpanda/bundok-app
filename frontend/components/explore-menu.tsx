import Link from "next/link";

import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Most popular", href: "/", value: "popular" },
  { label: "Mountains", href: "/mountains", value: "mountains" },
  { label: "My Climbs", href: "/my-climbs", value: "my-climbs" },
] as const;

type ExploreMenuValue = (typeof menuItems)[number]["value"];

export function ExploreMenu({
  active,
  compact = false,
  light = true,
}: {
  active?: ExploreMenuValue;
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <nav
      aria-label="Explore categories"
      className={cn(
        "grid h-11 w-full min-w-0 grid-cols-3 gap-2 md:flex md:justify-start md:gap-3",
        compact && "flex h-10 w-auto grid-cols-none gap-1",
      )}
    >
      {menuItems.map((item) => (
        <Link
          key={item.value}
          href={item.href}
          aria-current={active === item.value ? "page" : undefined}
          className={cn(
            "inline-flex h-11 min-w-0 items-center justify-center overflow-hidden rounded-full border px-2 text-sm font-medium shadow-sm transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-deep md:w-40 md:flex-none md:px-5",
            light ? "border-border bg-white text-muted-foreground hover:border-moss/30 hover:bg-moss/5" : "border-white/[0.06] bg-[#383838] text-zinc-200 hover:border-moss/40 hover:bg-[#414141]",
            compact && "h-10 w-auto px-3 text-xs md:w-auto md:px-4",
            active === item.value && (light ? "border-moss bg-moss text-white hover:border-moss-deep hover:bg-moss-hover" : "border-moss bg-moss text-white hover:border-moss-hover hover:bg-moss-hover"),
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

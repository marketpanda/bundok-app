import Link from "next/link";

import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Most popular", href: "/", value: "popular" },
  { label: "Mountains", href: "/mountains", value: "mountains" },
  { label: "My Climbs", href: "/my-climbs", value: "my-climbs" },
] as const;

type ExploreMenuValue = (typeof menuItems)[number]["value"];

export function ExploreMenu({ active }: { active: ExploreMenuValue }) {
  return (
    <nav
      aria-label="Explore categories"
      className="grid h-11 w-full min-w-0 grid-cols-3 gap-2 md:flex md:justify-start md:gap-3"
    >
      {menuItems.map((item) => (
        <Link
          key={item.value}
          href={item.href}
          aria-current={active === item.value ? "page" : undefined}
          className={cn(
            "inline-flex h-11 min-w-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.06] bg-[#383838] px-2 text-sm font-medium text-zinc-200 shadow-sm transition-all duration-200 hover:border-turquoise/40 hover:bg-[#414141] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise md:w-40 md:flex-none md:px-5",
            active === item.value && "border-grass bg-grass text-white hover:border-grass-hover hover:bg-grass-hover",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

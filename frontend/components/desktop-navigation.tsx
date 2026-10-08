"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Discover" },
  { href: "/#activity", label: "Activity" },
  { href: "/profile", label: "Profile" },
  { href: "/contact-us", label: "Contact Us" },
] as const;

export function DesktopNavigation({ light = true }: { light?: boolean }) {
  const pathname = usePathname();
  const { loading, user, signOutUser } = useAuth();

  return (
    <div className="hidden items-center gap-2 lg:flex">
      <nav className="flex items-center gap-1" aria-label="Desktop navigation">
        {links.map(({ href, label }) => {
          const active =
            (href === "/" && pathname === "/") ||
            (href !== "/" && !href.includes("#") && pathname === href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-deep",
                light ? "text-muted-foreground hover:bg-moss-100 hover:text-foreground" : "text-muted-foreground hover:bg-white/10 hover:text-white",
                active && (light ? "bg-moss/10 text-moss-deep" : "bg-white/10 text-moss-deep"),
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {loading ? (
        <div className={cn("h-10 w-32 animate-pulse rounded-full border", light ? "border-border bg-moss-100" : "border-white/10 bg-white/5")} />
      ) : user ? (
        <Button
          type="button"
          variant="ghost"
          title={`Signed in as ${user.email ?? user.name ?? "a hiker"}`}
          onClick={() => void signOutUser()}
          className={cn("h-10 rounded-full border px-3", light ? "border-border bg-white text-foreground hover:bg-moss-100 hover:text-foreground" : "border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white")}
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-moss text-xs font-bold text-white">
            {(user.name ?? user.email ?? "H").charAt(0).toUpperCase()}
          </span>
          Sign out
        </Button>
      ) : (
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-full bg-moss px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-moss-hover"
        >
          Log in or sign up
        </Link>
      )}
    </div>
  );
}

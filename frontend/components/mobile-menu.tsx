"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Contact,
  LogIn,
  LogOut,
  Map,
  Menu,
  Mountain,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Discover", icon: Map },
  { href: "/mountains", label: "Mountains", icon: Mountain },
  { href: "/my-climbs", label: "My Climbs", icon: Mountain },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/contact-us", label: "Contact Us", icon: Contact },
] as const;

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOutUser } = useAuth();

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className="lg:hidden">
      <Button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="size-10 rounded-xl bg-white/10 text-zinc-100 hover:bg-white/15 hover:text-white"
      >
        <Menu className="size-6" aria-hidden="true" />
      </Button>

      <div
        className={`fixed inset-0 z-50 transition-[visibility] ${
          open ? "visible pointer-events-auto" : "invisible pointer-events-none delay-200"
        }`}
      >
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
          className={`absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity ${
            open ? "opacity-100 duration-300 ease-out" : "opacity-0 duration-200 ease-in"
          }`}
          onClick={() => setOpen(false)}
        />
        <aside
          id="mobile-navigation"
          aria-label="Mobile navigation"
          aria-hidden={!open}
          inert={!open}
          className={`absolute inset-y-0 right-0 flex w-[min(86vw,360px)] flex-col border-l border-white/10 bg-[#262626] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] shadow-2xl transition-transform will-change-transform ${
            open
              ? "translate-x-0 duration-300 ease-out"
              : "translate-x-full duration-200 ease-in"
          }`}
        >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Menu</p>
                {user && (
                  <p className="mt-0.5 max-w-60 truncate text-xs text-zinc-400">
                    {user.name ?? user.email}
                  </p>
                )}
              </div>
              <Button
                type="button"
                aria-label="Close menu"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="size-10 rounded-xl bg-white/10 text-zinc-100 hover:bg-white/15 hover:text-white"
              >
                <X className="size-5" aria-hidden="true" />
              </Button>
            </div>

            <nav className="mt-8 flex flex-col gap-2">
              {navigation.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;

                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10 hover:text-turquoise focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise",
                      active && "bg-white/10 text-turquoise",
                    )}
                  >
                    <Icon
                      className={cn("size-5 text-zinc-400", active && "text-turquoise")}
                      aria-hidden="true"
                    />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-white/10 pt-5">
              {user ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    void signOutUser();
                  }}
                  className="h-12 w-full justify-start gap-3 rounded-xl px-3.5 text-zinc-300 hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="size-5" aria-hidden="true" />
                  Sign out
                </Button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-grass px-4 text-sm font-semibold text-white transition-colors hover:bg-grass-hover"
                >
                  <LogIn className="size-4" aria-hidden="true" />
                  Log in with Google
                </Link>
              )}
            </div>
        </aside>
      </div>
    </div>
  );
}

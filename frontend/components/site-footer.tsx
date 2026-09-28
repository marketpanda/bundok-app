import Link from "next/link";

import { cn } from "@/lib/utils";

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-xs text-zinc-500 sm:flex-row",
        className,
      )}
    >
      <p>&copy; 2026 Ambangeg</p>
      <nav aria-label="Legal" className="flex items-center gap-4">
        <Link href="/privacy" className="transition-colors hover:text-turquoise">
          Privacy Policy
        </Link>
        <Link href="/terms" className="transition-colors hover:text-turquoise">
          Terms
        </Link>
      </nav>
    </footer>
  );
}

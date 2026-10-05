"use client";

import { useEffect, useState } from "react";

export function MapAreaTooltip({ text, x, y, below, touch = false }: { text: string; x: number; y: number; below: boolean; touch?: boolean }) {
  const [length, setLength] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? text.length : 0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cursor = 0;
    const timer = window.setInterval(() => {
      cursor = Math.min(text.length, cursor + 3);
      setLength(cursor);
      if (cursor === text.length) window.clearInterval(timer);
    }, 24);
    return () => window.clearInterval(timer);
  }, [text]);
  return <div id="map-area-tooltip" role="tooltip" className="pointer-events-none absolute z-[210] w-60 max-w-[calc(100%-24px)] rounded border border-white/10 bg-[#303030]/80 px-2 py-1.5 font-heading text-[12px] leading-[1.35] text-[#e8e5df] shadow-xl backdrop-blur-sm" style={{ left: x, top: y, transform: below ? "translateX(-50%)" : "translate(-50%, -100%)" }}>
    <span className="sr-only">{text}</span>
    <span aria-hidden="true" className="relative block">
      <span className="invisible block">{text}</span>
      <span className="absolute inset-0">{text.slice(0, length)}{length < text.length && <span className="ml-0.5 inline-block h-3 w-px bg-white align-middle" />}</span>
    </span>
    {touch && <p className="mt-1 text-[10px] text-[#e8e5df]/70">Tap the circle again to explore.</p>}
  </div>;
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppContext } from "@/context/AppContext";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { images } = useAppContext();
  
  const inFlight = images.filter(i => i.status === "uploading").length;
  const doneImages = images.filter(i => i.status === "done");

  const navLinkClasses = (path: string) =>
    `transition-colors hover:text-[#8a9696] ${pathname === path ? "text-[#a8c57e]" : "text-[#4a5252]"}`;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0b0b]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center h-14 gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-8 h-8 rounded-lg bg-[#1a1f1f] border border-white/10 flex items-center justify-center text-base group-hover:border-[#a8c57e]/40 transition-colors">🌿</span>
          <span className="font-semibold tracking-tight text-[15px]">Shamba<span className="text-[#a8c57e]">Smart</span></span>
        </Link>

        <button
          aria-label="Toggle navigation"
          className="ml-auto sm:hidden inline-flex items-center justify-center rounded-lg border border-white/[0.12] p-2 text-[#a8c57e]"
          onClick={() => setIsOpen(v => !v)}
        >
          {isOpen ? "✕" : "☰"}
        </button>

        <div className="hidden sm:flex items-center gap-4 ml-4">
          <Link href="/" className={navLinkClasses("/")}>Upload</Link>
          <Link href="/diagnostics" className={navLinkClasses("/diagnostics")}>Crop Disease Detector</Link>
          <Link href="/yields" className={navLinkClasses("/yields")}>Yield Predictor</Link>
        </div>

        <div className="hidden sm:flex items-center gap-2 ml-auto">
          {inFlight > 0 && (
            <span className="mono text-[11px] text-[#a8c57e] bg-[#a8c57e]/10 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a8c57e] pulse-dot" />
              Analyzing {inFlight}
            </span>
          )}
          <span className="mono text-[11px] text-[#4a5252] bg-white/[0.03] border border-white/5 px-3 py-1 rounded-full">
            {doneImages.length} ready
          </span>
          <button className="mono text-[11px] text-[#a8c57e] border border-[#a8c57e]/30 hover:bg-[#a8c57e]/10 px-3 py-1.5 rounded-xl">Login</button>
        </div>
      </div>

      {isOpen && (
        <div className="sm:hidden border-t border-white/10 bg-[#0a0b0b]/95 px-4 py-3 space-y-2">
          <Link href="/" className={navLinkClasses("/")}>Upload</Link>
          <Link href="/diagnostics" className={navLinkClasses("/diagnostics")}>Crop Disease Detector</Link>
          <Link href="/yields" className={navLinkClasses("/yields")}>Yield Predictor</Link>
          <button className="w-full text-left mono text-[11px] text-[#a8c57e] border border-[#a8c57e]/30 hover:bg-[#a8c57e]/10 px-3 py-2 rounded-xl">Login</button>
          <div className="flex items-center gap-2">
            {inFlight > 0 && (
              <span className="mono text-[11px] text-[#a8c57e] bg-[#a8c57e]/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a8c57e] pulse-dot" />
                Analyzing {inFlight}
              </span>
            )}
            <span className="mono text-[11px] text-[#4a5252] bg-white/[0.03] border border-white/5 px-3 py-1 rounded-full">
              {doneImages.length} ready
            </span>
          </div>
        </div>
      )}
    </nav>
  );
}

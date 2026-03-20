"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppContext } from "@/context/AppContext";

export function Navbar() {
  const pathname = usePathname();
  const { images } = useAppContext();
  
  const inFlight = images.filter(i => i.status === "uploading").length;
  const doneImages = images.filter(i => i.status === "done");

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0b0b]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center h-14 gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-8 h-8 rounded-lg bg-[#1a1f1f] border border-white/10 flex items-center justify-center text-base group-hover:border-[#a8c57e]/40 transition-colors">🌿</span>
          <span className="font-semibold tracking-tight text-[15px]">Shamba<span className="text-[#a8c57e]">Smart</span></span>
        </Link>

        <div className="h-4 w-px bg-white/10 ml-1" />

        {/* nav links */}
        <div className="flex items-center gap-3 mono text-[12px] text-[#4a5252]">
         
          <Link
            href="/"
            className={`transition-colors hover:text-[#8a9696] ${pathname === "/diagnostics" ? "text-[#a8c57e]" : ""}`}
          >
            Crop Disease Detector
          </Link>
          <Link
            href="/yields"
            className={`transition-colors hover:text-[#8a9696] ${pathname === "/yields" ? "text-[#a8c57e]" : ""}`}
          >
            Yield Predictor
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button className="mono text-[11px] text-[#a8c57e] border border-[#a8c57e]/30 hover:bg-[#a8c57e]/10 px-3 py-1.5 rounded-xl">Login</button>
          {inFlight > 0 && (
            <span className="mono text-[11px] text-[#a8c57e] bg-[#a8c57e]/10 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a8c57e] pulse-dot" />
              Analyzing {inFlight}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}

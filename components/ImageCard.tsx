"use client";

import { CropImage } from "@/lib/types";
import { fmtSize } from "@/lib/utils";
import { StatusChip } from "./StatusChip";

export function ImageCard({ img, index, onRemove, onAnalyze }: {
  img: CropImage; index: number; onRemove: () => void; onAnalyze: () => void;
}) {
  return (
    <div
      className="fade-up group relative bg-[#111414] border border-white/[0.06] rounded-2xl overflow-hidden transition-all hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/40"
      style={{ animationDelay: `${(index - 1) * 40}ms` }}
    >
      {/* spec tag */}
      <div className="absolute top-2.5 left-2.5 z-10 mono text-[9px] text-[#4a5252] bg-black/60 backdrop-blur-sm border border-white/[0.06] px-2 py-0.5 rounded-md tracking-wider">
        #{String(index).padStart(3, "0")}
      </div>

      {/* remove */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-lg bg-black/60 backdrop-blur-sm border border-white/[0.06] text-[#4a5252] hover:text-red-400 hover:border-red-400/30 flex items-center justify-center text-[11px] opacity-0 group-hover:opacity-100 transition-all"
      >
        ✕
      </button>

      {/* thumbnail */}
      <div className="aspect-[4/3] overflow-hidden cursor-pointer" onClick={onAnalyze}>
        <img
          src={img.status === "done" ? img.url : img.preview}
          alt={img.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
        />
        {img.status === "uploading" && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 rounded-full border-2 border-[#a8c57e]/20 border-t-[#a8c57e] spinner" />
            <span className="mono text-[10px] text-[#a8c57e] tracking-wider">ANALYZING…</span>
          </div>
        )}
      </div>

      {/* footer */}
      <div className="p-3 flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-1.5">
          <p className="text-[12px] font-medium text-[#c8c4bc] truncate leading-tight">{img.name}</p>
          <StatusChip status={img.status} />
        </div>
        <p className="mono text-[10px] text-[#3e4646]">{fmtSize(img.size)}</p>

        {img.status === "done" && (
          <button
            onClick={onAnalyze}
            className="w-full bg-[#a8c57e]/10 hover:bg-[#a8c57e]/18 text-[#a8c57e] border border-[#a8c57e]/20 hover:border-[#a8c57e]/35 rounded-xl py-2 text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            Detect Disease <span className="text-[10px]">→</span>
          </button>
        )}
      </div>
    </div>
  );
}

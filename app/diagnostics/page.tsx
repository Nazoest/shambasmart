"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";
import { Navbar } from "@/components/Navbar";
import { LocationCard } from "@/components/LocationCard";
import { Report } from "@/components/Report";
import { LocationModal } from "@/components/LocationModal";

export default function DiagnosticsPage() {
  const {
    images,
    activeId,
    setActiveId,
    location,
    locationStatus,
    requestLocation,
    addFiles,
    setLocationStatus,
  } = useAppContext();

  const [locationModal, setLocationModal] = useState(false);
  const [pendingDiagId, setPendingDiagId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doneImages = images.filter((i) => i.status === "done");
  const activeImg = images.find((i) => i.id === activeId) ?? doneImages[0] ?? null;

  const handleLocationModalResult = async (allow: boolean) => {
    setLocationModal(false);
    if (allow) await requestLocation();
    else setLocationStatus("denied");
    if (pendingDiagId) {
      setActiveId(pendingDiagId);
      setPendingDiagId(null);
    }
  };

  const selectImage = (id: string) => {
    if (locationStatus === "granted" || locationStatus === "denied") {
      setActiveId(id);
    } else {
      setPendingDiagId(id);
      setLocationModal(true);
    }
  };

  if (images.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0b0b] text-[#e2ded8]">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-20 flex flex-col items-center gap-6 text-center">
          <span className="text-5xl opacity-30">🔬</span>
          <p className="serif text-2xl text-[#c8c4bc]">No images to analyze</p>
          <p className="text-[13px] text-[#4a5252]">
            Upload some crop photos first to get a diagnostic report.
          </p>
          <Link
            href="/"
            className="bg-[#a8c57e] hover:bg-[#b8d48e] text-[#0a0b0b] font-semibold text-[13px] px-6 py-2.5 rounded-xl transition-colors"
          >
            ← Go to Upload
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b0b] text-[#e2ded8]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        {/* Back + header */}
        <div className="fade-up flex items-center gap-4 flex-wrap">
          <Link
            href="/"
            className="flex items-center gap-1.5 mono text-[11px] text-[#4a5252] hover:text-[#8a9696] transition-colors group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Upload
          </Link>
          <div className="h-3 w-px bg-white/10" />
          <h1 className="serif text-2xl sm:text-3xl font-semibold text-[#f0ece4]">
            Diagnostic Reports
          </h1>
          <span className="mono text-[11px] text-[#4a5252] bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-full ml-auto">
            {doneImages.length} analyzed
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── Sidebar: image strip ── */}
          <aside className="w-full lg:w-[200px] lg:sticky lg:top-20 flex flex-col gap-3">
            <p className="mono text-[10px] text-[#3e4646] tracking-[.1em] uppercase">Images</p>

            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => selectImage(img.id)}
                  disabled={img.status !== "done"}
                  className={`relative flex-shrink-0 w-[80px] h-[62px] lg:w-full lg:h-[80px] rounded-xl overflow-hidden border transition-all
                  ${activeImg?.id === img.id
                    ? "border-[#a8c57e]/60 shadow-[0_0_0_3px_rgba(168,197,126,0.15)]"
                    : "border-white/[0.06] hover:border-white/[0.14] opacity-70 hover:opacity-100"
                  }
                  ${img.status !== "done" ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <img
                    src={img.status === "done" ? img.url : img.preview}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                  {img.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full border-2 border-[#a8c57e]/20 border-t-[#a8c57e] spinner" />
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1.5 mono text-[8px] text-white/50">
                    #{i + 1}
                  </span>
                </button>
              ))}
            </div>

            {/* Add more */}
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full border border-dashed border-white/[0.08] hover:border-[#a8c57e]/30 rounded-xl py-3 text-[11px] text-[#3e4646] hover:text-[#a8c57e] mono transition-all hidden lg:block"
            >
              + Add more
            </button>

            {/* ── Location card ── */}
            <LocationCard
              location={location}
              status={locationStatus}
              onRequest={requestLocation}
            />
          </aside>

          {/* ── Main: report panel ── */}
          <div className="flex-1 min-w-0">
            {!activeImg || !activeImg.report ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                {images.some((i) => i.status === "uploading") ? (
                  <>
                    <div className="w-10 h-10 rounded-full border-2 border-[#a8c57e]/20 border-t-[#a8c57e] spinner" />
                    <p className="text-[14px] text-[#6e7676]">Analyzing your crop images…</p>
                  </>
                ) : (
                  <>
                    <span className="text-4xl opacity-25">🔬</span>
                    <p className="text-[14px] text-[#6e7676]">Select an image from the sidebar</p>
                  </>
                )}
              </div>
            ) : (
              <Report img={activeImg} report={activeImg.report} location={location} />
            )}
          </div>
        </div>
      </main>

      {/* hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />

      {/* Location Permission Modal */}
      {locationModal && <LocationModal onResult={handleLocationModalResult} />}
    </div>
  );
}

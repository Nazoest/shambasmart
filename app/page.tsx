"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { Navbar } from "@/components/Navbar";
import { ImageCard } from "@/components/ImageCard";
import { CameraModal } from "@/components/CameraModal";
import { LocationModal } from "@/components/LocationModal";

export default function HomePage() {
  const {
    images,
    setImages,
    addFiles,
    removeImage,
    setActiveId,
    locationStatus,
    setLocationStatus,
    requestLocation,
  } = useAppContext();

  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [locationModal, setLocationModal] = useState(false);
  const [pendingDiagId, setPendingDiagId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doneImages = images.filter((i) => i.status === "done");
  const inFlight = images.filter((i) => i.status === "uploading").length;

  const handleLocationModalResult = async (allow: boolean) => {
    setLocationModal(false);
    if (allow) await requestLocation();
    else setLocationStatus("denied");
    if (pendingDiagId) {
      setActiveId(pendingDiagId);
      setPendingDiagId(null);
    }
    router.push("/diagnostics");
  };

  const goToDiagnostics = (id: string) => {
    setActiveId(id);
    if (locationStatus === "granted" || locationStatus === "denied") {
      router.push("/diagnostics");
    } else {
      setPendingDiagId(id);
      setLocationModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b0b] text-[#e2ded8]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-12">
        {/* Hero */}
        <div className="fade-up flex flex-col gap-3 max-w-xl">
          <span className="mono text-[11px] text-[#a8c57e] tracking-[.12em] uppercase">
            AI-Powered Crop Health
          </span>
          <h1 className="serif text-3xl sm:text-4xl font-semibold text-[#f0ece4] leading-snug">
            Detect crop disease<br />
            <em className="not-italic text-[#a8c57e]">before it spreads.</em>
          </h1>
          <p className="text-[14px] text-[#5e6666] leading-relaxed max-w-sm">
            Upload photos or take a picture of your crops. Our model identifies diseases and gives
            you an action plan in seconds.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          className={`fade-up relative rounded-2xl border-2 border-dashed transition-all duration-200
          flex flex-col items-center justify-center gap-5 py-14 px-6 text-center overflow-hidden
          ${
            dragOver
              ? "border-[#a8c57e]/60 bg-[#a8c57e]/[0.04] cursor-copy"
              : "border-white/[0.07] bg-[#111414] hover:border-white/[0.12] hover:bg-[#121616] cursor-pointer"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
        >
          {/* subtle radial glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(168,197,126,.05) 0%, transparent 60%)",
            }}
          />

          <div className="relative w-16 h-16 rounded-2xl bg-[#1a1f1f] border border-white/[0.08] flex items-center justify-center text-3xl">
            🌾
            <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#a8c57e] flex items-center justify-center text-[#0a0b0b] text-sm font-bold leading-none">
              +
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[15px] font-semibold text-[#d8d4cc]">Drop your crop images here</p>
            <p className="mono text-[11px] text-[#3e4646] tracking-widest uppercase">
              JPG · PNG · WEBP &nbsp;·&nbsp; Up to 8 MB each
            </p>
          </div>

          {/* Action buttons row */}
          <div
            className="flex items-center gap-3 flex-wrap justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 bg-[#a8c57e] hover:bg-[#b8d48e] text-[#0a0b0b] font-semibold text-[13px] px-5 py-2.5 rounded-xl transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Browse Files
            </button>
            <button
              onClick={() => setCameraOpen(true)}
              className="flex items-center gap-2 bg-[#1a1f1f] hover:bg-[#1e2424] text-[#d8d4cc] border border-white/[0.08] hover:border-[#a8c57e]/30 font-semibold text-[13px] px-5 py-2.5 rounded-xl transition-all"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
              Take Photo
            </button>
          </div>
        </div>

        {/* Image Grid */}
        {images.length > 0 && (
          <div className="fade-up flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-0.5 bg-[#a8c57e] rounded-full" />
                <span className="mono text-[11px] text-[#4a5252] tracking-[.1em] uppercase">
                  Specimens · {images.length}
                </span>
              </div>
              <button
                onClick={() => setImages([])}
                className="mono text-[11px] text-[#3e4646] hover:text-red-400 transition-colors border border-white/[0.06] hover:border-red-400/30 rounded-lg px-3 py-1.5"
              >
                Clear all
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {images.map((img, i) => (
                <ImageCard
                  key={img.id}
                  img={img}
                  index={i + 1}
                  onRemove={() => removeImage(img.id)}
                  onAnalyze={() => goToDiagnostics(img.id)}
                />
              ))}
            </div>

            {/* CTA if any done */}
            {doneImages.length > 0 && (
              <div className="flex items-center justify-center pt-2">
                <button
                  onClick={() => goToDiagnostics(doneImages[0].id)}
                  className="flex items-center gap-2.5 bg-[#1a1f1f] hover:bg-[#1e2424] border border-white/[0.08] hover:border-[#a8c57e]/30 text-[#d8d4cc] font-semibold text-[14px] px-6 py-3 rounded-xl transition-all group"
                >
                  <span>View All Diagnostics</span>
                  <span className="w-5 h-5 rounded-full bg-[#a8c57e]/15 text-[#a8c57e] flex items-center justify-center text-[11px] group-hover:bg-[#a8c57e]/25 transition-colors">
                    →
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {images.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8 text-center opacity-40">
            <span className="text-4xl">📂</span>
            <p className="mono text-[11px] text-[#3e4646] tracking-[.1em] uppercase">No images yet</p>
          </div>
        )}
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

      {/* Camera Modal */}
      {cameraOpen && (
        <CameraModal
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => {
            addFiles([file]);
            setCameraOpen(false);
          }}
        />
      )}

      {/* Location Permission Modal */}
      {locationModal && <LocationModal onResult={handleLocationModalResult} />}
    </div>
  );
}
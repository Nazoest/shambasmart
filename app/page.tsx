"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/* ─── Google Fonts via @import ─────────────────────────────────────────────── */
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&family=DM+Mono:wght@300;400;500&family=Playfair+Display:ital,wght@0,600;1,500&display=swap');`;

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type UploadStatus = "pending" | "uploading" | "done" | "error";
interface CropImage {
  id: string;
  name: string;
  size: number;
  preview: string;
  url: string;
  status: UploadStatus;
  uploadedAt?: Date;
  report?: DiagnosticReport;
}
interface DiseaseResult {
  name: string;
  probability: number;
  severity: "low" | "medium" | "high" | "critical";
}
interface DiagnosticReport {
  cropType: string;
  diseases: DiseaseResult[];
  advice: string[];
  urgency: "monitor" | "treat-soon" | "treat-immediately";
  diagnosedAt: string;
}

/* ─── Mock ──────────────────────────────────────────────────────────────────── */
function generateMockReport(): DiagnosticReport {
  return {
    cropType: "Maize (Zea mays)",
    diagnosedAt: new Date().toISOString(),
    urgency: "treat-soon",
    diseases: [
      { name: "Gray Leaf Spot",       probability: 0.74, severity: "high"     },
      { name: "Northern Corn Blight", probability: 0.18, severity: "medium"   },
      { name: "Common Rust",          probability: 0.05, severity: "low"      },
      { name: "Healthy Tissue",       probability: 0.03, severity: "low"      },
    ],
    advice: [
      "Apply fungicide (azoxystrobin or propiconazole) within the next 5–7 days.",
      "Remove and destroy heavily infected lower leaves to reduce spore load.",
      "Improve field drainage — Gray Leaf Spot thrives in humid, low-airflow conditions.",
      "Rotate to a non-host crop next season to break the disease cycle.",
      "Scout neighbouring fields; escalate treatment if >50% of plants show lesions.",
    ],
  };
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 10);
const fmtSize = (b: number) =>
  b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;
const fmtPct = (n: number) => Math.round(n * 100) + "%";
const fmtTime = (d: Date) => d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });

const SEV_STYLES: Record<string, { bar: string; badge: string; text: string }> = {
  low:      { bar: "bg-emerald-500",   badge: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",  text: "text-emerald-400"  },
  medium:   { bar: "bg-amber-400",     badge: "bg-amber-400/10 text-amber-300 ring-amber-400/20",        text: "text-amber-300"    },
  high:     { bar: "bg-orange-400",    badge: "bg-orange-400/10 text-orange-300 ring-orange-400/20",     text: "text-orange-300"   },
  critical: { bar: "bg-red-500",       badge: "bg-red-500/10 text-red-400 ring-red-500/20",              text: "text-red-400"      },
};

const URGENCY: Record<string, { label: string; style: string; dot: string }> = {
  "monitor":           { label: "Monitor",          style: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30", dot: "bg-emerald-400" },
  "treat-soon":        { label: "Treat Soon",        style: "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30",      dot: "bg-amber-400"   },
  "treat-immediately": { label: "Act Immediately",   style: "bg-red-500/10 text-red-400 ring-1 ring-red-500/30",            dot: "bg-red-400"     },
};

interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  capturedAt: Date;
  // Reverse-geocoded fields (Nominatim)
  geocoding: "pending" | "done" | "failed";
  village?: string;
  suburb?: string;
  ward?: string;
  subCounty?: string;
  county?: string;
  country?: string;
  countryCode?: string;
  postcode?: string;
  displayName?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState<"upload" | "diagnostics">("upload");
  const [images, setImages] = useState<CropImage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [locationModal, setLocationModal] = useState(false);
  const [pendingDiagId, setPendingDiagId] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── fake upload ── */
  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    const newImgs: CropImage[] = files.map(f => ({
      id: uid(), name: f.name, size: f.size,
      preview: URL.createObjectURL(f), url: "", status: "uploading",
    }));
    setImages(prev => [...prev, ...newImgs]);

    setTimeout(() => {
      setImages(prev => prev.map(img => {
        if (!newImgs.find(n => n.id === img.id)) return img;
        return {
          ...img,
          url: img.preview,
          status: "done",
          uploadedAt: new Date(),
          report: generateMockReport(),
        };
      }));
    }, 2200);
  }, []);

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img?.preview.startsWith("blob:")) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
    if (activeId === id) setActiveId(null);
  };

  // Reverse-geocode coordinates using OpenStreetMap Nominatim (free, no key)
  const reverseGeocode = async (lat: number, lng: number): Promise<Partial<LocationData>> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      if (!res.ok) return { geocoding: "failed" };
      const json = await res.json();
      const a = json.address ?? {};
      return {
        geocoding: "done",
        village:     a.village || a.hamlet || a.locality || a.town || a.city_district || undefined,
        suburb:      a.suburb || a.neighbourhood || a.residential || undefined,
        ward:        a.ward || undefined,
        subCounty:   a.county_district || a.subcounty || a.district || a.municipality || undefined,
        county:      a.county || a.state_district || a.state || undefined,
        country:     a.country || undefined,
        countryCode: (a.country_code || "").toUpperCase() || undefined,
        postcode:    a.postcode || undefined,
        displayName: json.display_name || undefined,
      };
    } catch {
      return { geocoding: "failed" };
    }
  };

  // Request geolocation then reverse-geocode
  const requestLocation = (): Promise<LocationData | null> => {
    return new Promise(resolve => {
      if (!navigator.geolocation) { resolve(null); return; }
      setLocationStatus("requesting");
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const base: LocationData = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            capturedAt: new Date(),
            geocoding: "pending",
          };
          // Set coords immediately so UI shows something fast
          setLocation(base);
          setLocationStatus("granted");
          // Then enrich with reverse-geocoding
          const geo = await reverseGeocode(base.lat, base.lng);
          const enriched = { ...base, ...geo };
          setLocation(enriched);
          resolve(enriched);
        },
        () => {
          setLocationStatus("denied");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // If location already granted, go straight to diagnostics.
  // Otherwise show the permission modal first.
  const goToDiagnostics = (id: string) => {
    if (locationStatus === "granted" || locationStatus === "denied") {
      setActiveId(id);
      setPage("diagnostics");
    } else {
      setPendingDiagId(id);
      setLocationModal(true);
    }
  };

  const handleLocationModalResult = async (allow: boolean) => {
    setLocationModal(false);
    if (allow) await requestLocation();
    else setLocationStatus("denied");
    if (pendingDiagId) {
      setActiveId(pendingDiagId);
      setPendingDiagId(null);
    }
    setPage("diagnostics");
  };

  const doneImages = images.filter(i => i.status === "done");
  const inFlight   = images.filter(i => i.status === "uploading").length;
  const activeImg  = images.find(i => i.id === activeId) ?? doneImages[0] ?? null;

  return (
    <>
      <style>{FONT_IMPORT}{`
        * { box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; }
        .mono { font-family: 'DM Mono', monospace; }
        .serif { font-family: 'Playfair Display', serif; }
        .bar-anim { transition: width 1.2s cubic-bezier(.16,1,.3,1); }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes modalIn {
          from { opacity:0; transform:scale(.96) translateY(12px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes overlayIn { from { opacity:0; } to { opacity:1; } }
        @keyframes flashSnap { 0%{opacity:0} 30%{opacity:.85} 100%{opacity:0} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .fade-up { animation: fadeUp .35s ease both; }
        .modal-in { animation: modalIn .3s cubic-bezier(.16,1,.3,1) both; }
        .overlay-in { animation: overlayIn .2s ease both; }
        .flash-snap { animation: flashSnap .35s ease both; }
        .spinner { animation: spin .7s linear infinite; }
        .pulse-dot { animation: pulse 1.5s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2f2f; border-radius: 4px; }
      `}</style>

      <div className="min-h-screen bg-[#0a0b0b] text-[#e2ded8]">

        {/* ── Navbar ── */}
        <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0b0b]/80 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center h-14 gap-4">
            <button
              onClick={() => setPage("upload")}
              className="flex items-center gap-2 group"
            >
              <span className="w-8 h-8 rounded-lg bg-[#1a1f1f] border border-white/10 flex items-center justify-center text-base group-hover:border-[#a8c57e]/40 transition-colors">🌿</span>
              <span className="font-semibold tracking-tight text-[15px]">Crop<span className="text-[#a8c57e]">Scan</span></span>
            </button>

            <div className="h-4 w-px bg-white/10 ml-1" />

            {/* breadcrumb */}
            <div className="flex items-center gap-1.5 mono text-[11px] text-[#4a5252]">
              <button
                onClick={() => setPage("upload")}
                className={`transition-colors hover:text-[#8a9696] ${page === "upload" ? "text-[#a8c57e]" : ""}`}
              >
                Upload
              </button>
              {page === "diagnostics" && (
                <>
                  <span className="text-[#2a3030]">/</span>
                  <span className="text-[#e2ded8]">Diagnostics</span>
                </>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
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
        </nav>

        {/* ── Pages ── */}
        {page === "upload" ? (
          <UploadPage
            images={images}
            dragOver={dragOver}
            setDragOver={setDragOver}
            inputRef={inputRef}
            addFiles={addFiles}
            removeImage={removeImage}
            goToDiagnostics={goToDiagnostics}
            setImages={setImages}
            doneImages={doneImages}
            onOpenCamera={() => setCameraOpen(true)}
          />
        ) : (
          <DiagnosticsPage
            images={images}
            activeImg={activeImg}
            setActiveId={setActiveId}
            goBack={() => setPage("upload")}
            addFiles={addFiles}
            inputRef={inputRef}
            location={location}
            locationStatus={locationStatus}
            onRequestLocation={requestLocation}
          />
        )}

        {/* hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && addFiles(e.target.files)}
        />

        {/* Camera Modal */}
        {cameraOpen && (
          <CameraModal
            onClose={() => setCameraOpen(false)}
            onCapture={(file) => { addFiles([file]); setCameraOpen(false); }}
          />
        )}

        {/* Location Permission Modal */}
        {locationModal && (
          <LocationModal onResult={handleLocationModalResult} />
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   UPLOAD PAGE
═══════════════════════════════════════════════════════════════════════════════ */
function UploadPage({
  images, dragOver, setDragOver, inputRef, addFiles, removeImage, goToDiagnostics, setImages, doneImages, onOpenCamera,
}: {
  images: CropImage[];
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  addFiles: (f: FileList | File[]) => void;
  removeImage: (id: string) => void;
  goToDiagnostics: (id: string) => void;
  setImages: React.Dispatch<React.SetStateAction<CropImage[]>>;
  doneImages: CropImage[];
  onOpenCamera: () => void;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-12">

      {/* Hero */}
      <div className="fade-up flex flex-col gap-3 max-w-xl">
        <span className="mono text-[11px] text-[#a8c57e] tracking-[.12em] uppercase">AI-Powered Crop Health</span>
        <h1 className="serif text-3xl sm:text-4xl font-semibold text-[#f0ece4] leading-snug">
          Detect crop disease<br />
          <em className="not-italic text-[#a8c57e]">before it spreads.</em>
        </h1>
        <p className="text-[14px] text-[#5e6666] leading-relaxed max-w-sm">
          Upload photos or take a picture of your crops. Our model identifies diseases and gives you an action plan in seconds.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        className={`fade-up relative rounded-2xl border-2 border-dashed transition-all duration-200
          flex flex-col items-center justify-center gap-5 py-14 px-6 text-center overflow-hidden
          ${dragOver
            ? "border-[#a8c57e]/60 bg-[#a8c57e]/[0.04] cursor-copy"
            : "border-white/[0.07] bg-[#111414] hover:border-white/[0.12] hover:bg-[#121616] cursor-pointer"
          }`}
        style={{ animationDelay: "80ms" }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        {/* subtle radial glow */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(168,197,126,.05) 0%, transparent 60%)" }} />

        <div className="relative w-16 h-16 rounded-2xl bg-[#1a1f1f] border border-white/[0.08] flex items-center justify-center text-3xl">
          🌾
          <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#a8c57e] flex items-center justify-center text-[#0a0b0b] text-sm font-bold leading-none">+</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-[15px] font-semibold text-[#d8d4cc]">Drop your crop images here</p>
          <p className="mono text-[11px] text-[#3e4646] tracking-widest uppercase">
            JPG · PNG · WEBP &nbsp;·&nbsp; Up to 8 MB each
          </p>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-3 flex-wrap justify-center" onClick={e => e.stopPropagation()}>
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
            onClick={onOpenCamera}
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
        <div className="fade-up flex flex-col gap-5" style={{ animationDelay: "120ms" }}>
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
                <span className="w-5 h-5 rounded-full bg-[#a8c57e]/15 text-[#a8c57e] flex items-center justify-center text-[11px] group-hover:bg-[#a8c57e]/25 transition-colors">→</span>
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
  );
}

function ImageCard({ img, index, onRemove, onAnalyze }: {
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

function StatusChip({ status }: { status: UploadStatus }) {
  const map = {
    done:      "bg-emerald-500/10 text-emerald-400",
    uploading: "bg-amber-400/10 text-amber-300",
    error:     "bg-red-500/10 text-red-400",
    pending:   "bg-white/5 text-[#4a5252]",
  };
  const labels = { done: "Ready", uploading: "…", error: "Error", pending: "Wait" };
  return (
    <span className={`mono text-[9px] px-2 py-0.5 rounded-full shrink-0 ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DIAGNOSTICS PAGE
═══════════════════════════════════════════════════════════════════════════════ */
function DiagnosticsPage({
  images, activeImg, setActiveId, goBack, addFiles, inputRef, location, locationStatus, onRequestLocation,
}: {
  images: CropImage[];
  activeImg: CropImage | null;
  setActiveId: (id: string) => void;
  goBack: () => void;
  addFiles: (f: FileList | File[]) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  location: LocationData | null;
  locationStatus: "idle" | "requesting" | "granted" | "denied";
  onRequestLocation: () => Promise<LocationData | null>;
}) {
  if (images.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-20 flex flex-col items-center gap-6 text-center">
        <span className="text-5xl opacity-30">🔬</span>
        <p className="serif text-2xl text-[#c8c4bc]">No images to analyze</p>
        <p className="text-[13px] text-[#4a5252]">Upload some crop photos first to get a diagnostic report.</p>
        <button
          onClick={goBack}
          className="bg-[#a8c57e] hover:bg-[#b8d48e] text-[#0a0b0b] font-semibold text-[13px] px-6 py-2.5 rounded-xl transition-colors"
        >
          ← Go to Upload
        </button>
      </main>
    );
  }

  const doneImages = images.filter(i => i.status === "done");

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">

      {/* Back + header */}
      <div className="fade-up flex items-center gap-4 flex-wrap">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 mono text-[11px] text-[#4a5252] hover:text-[#8a9696] transition-colors group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Upload
        </button>
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
                onClick={() => img.status === "done" && setActiveId(img.id)}
                disabled={img.status !== "done"}
                className={`relative flex-shrink-0 w-[80px] h-[62px] lg:w-full lg:h-[80px] rounded-xl overflow-hidden border transition-all
                  ${activeImg?.id === img.id
                    ? "border-[#a8c57e]/60 shadow-[0_0_0_3px_rgba(168,197,126,0.15)]"
                    : "border-white/[0.06] hover:border-white/[0.14] opacity-70 hover:opacity-100"
                  }
                  ${img.status !== "done" ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <img src={img.status === "done" ? img.url : img.preview} alt={img.name} className="w-full h-full object-cover" />
                {img.status === "uploading" && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-[#a8c57e]/20 border-t-[#a8c57e] spinner" />
                  </div>
                )}
                <span className="absolute bottom-1 right-1.5 mono text-[8px] text-white/50">#{i + 1}</span>
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
            onRequest={onRequestLocation}
          />
        </aside>

        {/* ── Main: report panel ── */}
        <div className="flex-1 min-w-0">
          {!activeImg || !activeImg.report ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              {images.some(i => i.status === "uploading") ? (
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
  );
}

/* ─── Shared location row helper ─────────────────────────────────────────── */
function GeoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="mono text-[9px] text-[#3e4646] tracking-wider uppercase shrink-0 pt-0.5">{label}</span>
      <span className="mono text-[11px] text-[#c8c4bc] text-right leading-snug">{value}</span>
    </div>
  );
}

/* ─── Location sidebar card ───────────────────────────────────────────────── */
function LocationCard({ location, status, onRequest }: {
  location: LocationData | null;
  status: "idle" | "requesting" | "granted" | "denied";
  onRequest: () => Promise<LocationData | null>;
}) {
  const fmtCoord = (n: number, pos: string, neg: string) =>
    `${Math.abs(n).toFixed(5)}° ${n >= 0 ? pos : neg}`;

  const isGeocoding = location?.geocoding === "pending";

  return (
    <div className="hidden lg:flex flex-col gap-0 overflow-hidden rounded-xl border border-white/[0.06] bg-[#111414] mt-1">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.05]">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a8c57e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <p className="mono text-[10px] text-[#4a5252] tracking-[.08em] uppercase flex-1">Field Location</p>
        {status === "granted" && !isGeocoding && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#a8c57e] pulse-dot" />
        )}
        {isGeocoding && (
          <div className="w-3 h-3 rounded-full border border-[#a8c57e]/20 border-t-[#a8c57e] spinner" />
        )}
      </div>

      <div className="px-3 py-3 flex flex-col gap-2">
        {status === "granted" && location ? (
          <>
            {/* GPS Coords */}
            <div className="flex flex-col gap-1 bg-[#0e1212] border border-white/[0.04] rounded-lg px-2.5 py-2">
              <div className="flex items-center justify-between">
                <span className="mono text-[9px] text-[#a8c57e] tracking-wider">GPS</span>
                <span className="mono text-[9px] text-[#3e4646]">±{location.accuracy}m</span>
              </div>
              <span className="mono text-[10px] text-[#8a9696]">{fmtCoord(location.lat, "N", "S")}</span>
              <span className="mono text-[10px] text-[#8a9696]">{fmtCoord(location.lng, "E", "W")}</span>
            </div>

            {/* Geocoded place info */}
            {location.geocoding === "pending" && (
              <div className="flex items-center gap-2 py-1">
                <div className="w-3 h-3 rounded-full border border-[#a8c57e]/20 border-t-[#a8c57e] spinner" />
                <span className="mono text-[10px] text-[#3e4646]">Resolving place…</span>
              </div>
            )}

            {location.geocoding === "done" && (
              <div className="flex flex-col gap-1.5 bg-[#0e1212] border border-white/[0.04] rounded-lg px-2.5 py-2">
                <GeoRow label="Village" value={location.village} />
                <GeoRow label="Suburb"  value={location.suburb} />
                <GeoRow label="Ward"    value={location.ward} />
                <GeoRow label="Sub-county" value={location.subCounty} />
                <GeoRow label="County"  value={location.county} />
                <GeoRow label="Country" value={location.country} />
                {location.postcode && (
                  <GeoRow label="Postcode" value={location.postcode} />
                )}
              </div>
            )}

            {location.geocoding === "failed" && (
              <p className="mono text-[10px] text-[#3e4646] italic">Could not resolve place name.</p>
            )}

            <div className="h-px bg-white/[0.04]" />
            <div className="flex items-center justify-between">
              <span className="mono text-[9px] text-[#3e4646]">
                {location.capturedAt.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {location.countryCode && (
                <span className="mono text-[9px] text-[#4a5252] bg-white/[0.04] px-1.5 py-0.5 rounded">
                  {location.countryCode}
                </span>
              )}
            </div>
            <a
              href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="w-full text-center mono text-[10px] text-[#4a5252] hover:text-[#a8c57e] border border-white/[0.05] hover:border-[#a8c57e]/20 rounded-lg py-1.5 transition-all"
            >
              Open in Google Maps ↗
            </a>
          </>
        ) : status === "requesting" ? (
          <div className="flex items-center gap-2 py-1">
            <div className="w-3.5 h-3.5 rounded-full border border-[#a8c57e]/20 border-t-[#a8c57e] spinner" />
            <span className="mono text-[10px] text-[#4a5252]">Locating…</span>
          </div>
        ) : status === "denied" ? (
          <div className="flex flex-col gap-2">
            <p className="mono text-[10px] text-[#4a5252] leading-relaxed">Location access was denied.</p>
            <button
              onClick={onRequest}
              className="w-full mono text-[10px] text-[#a8c57e] border border-[#a8c57e]/20 hover:border-[#a8c57e]/40 rounded-lg py-1.5 transition-all"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="mono text-[10px] text-[#3e4646] leading-relaxed">No location captured.</p>
            <button
              onClick={onRequest}
              className="w-full mono text-[10px] text-[#a8c57e] border border-[#a8c57e]/20 hover:border-[#a8c57e]/40 rounded-lg py-1.5 transition-all"
            >
              Enable location
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Report ──────────────────────────────────────────────────────────────── */
function Report({ img, report, location }: { img: CropImage; report: DiagnosticReport; location: LocationData | null }) {
  const [copied, setCopied] = useState(false);
  const urg = URGENCY[report.urgency];

  const copyUrl = () => {
    navigator.clipboard.writeText(img.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const fmtCoord = (n: number, pos: string, neg: string) =>
    `${Math.abs(n).toFixed(4)}° ${n >= 0 ? pos : neg}`;

  return (
    <div className="fade-up flex flex-col gap-8">

      {/* ── Report header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="mono text-[11px] text-[#4a5252] tracking-[.08em] uppercase">Diagnostic Report</p>
          <h2 className="serif text-2xl sm:text-3xl font-semibold text-[#f0ece4] leading-snug">
            {report.cropType}
          </h2>
          <div className="flex items-center gap-3 flex-wrap mt-0.5">
            <p className="mono text-[11px] text-[#3e4646]">
              🕐 {fmtTime(new Date(report.diagnosedAt))}
            </p>
            {location && (
              <p className="mono text-[11px] text-[#3e4646] flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {location.geocoding === "done" && (location.subCounty || location.county)
                  ? [location.subCounty, location.county, location.country].filter(Boolean).join(", ")
                  : location.geocoding === "pending"
                  ? "Resolving location…"
                  : `${fmtCoord(location.lat, "N", "S")}, ${fmtCoord(location.lng, "E", "W")}`
                }
              </p>
            )}
          </div>
        </div>
        <span className={`self-start flex items-center gap-2 text-[12px] font-semibold mono px-4 py-2 rounded-xl ${urg.style}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${urg.dot} pulse-dot`} />
          {urg.label}
        </span>
      </div>

      {/* ── Location card (mobile: shown here inline; desktop: shown in sidebar) ── */}
      {location && (
        <div className="flex lg:hidden flex-col gap-0 bg-[#111414] border border-white/[0.06] rounded-xl overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a8c57e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <p className="mono text-[11px] text-[#4a5252] tracking-[.08em] uppercase flex-1">Field Location</p>
            {location.geocoding === "pending" && (
              <div className="w-3 h-3 rounded-full border border-[#a8c57e]/20 border-t-[#a8c57e] spinner" />
            )}
            {location.geocoding === "done" && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#a8c57e] pulse-dot" />
            )}
          </div>

          <div className="px-4 py-3 flex flex-col gap-3">
            {/* GPS row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="mono text-[9px] text-[#3e4646] tracking-wider uppercase">GPS Coordinates</span>
                <span className="mono text-[11px] text-[#8a9696]">
                  {fmtCoord(location.lat, "N", "S")}, {fmtCoord(location.lng, "E", "W")}
                </span>
                <span className="mono text-[9px] text-[#3e4646]">±{location.accuracy}m accuracy</span>
              </div>
              <a
                href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                target="_blank"
                rel="noreferrer"
                className="mono text-[10px] text-[#a8c57e] hover:underline shrink-0 border border-[#a8c57e]/20 rounded-lg px-2.5 py-1 mt-0.5"
              >
                Map ↗
              </a>
            </div>

            {/* Geocoded info — shown once resolved */}
            {location.geocoding === "pending" && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border border-[#a8c57e]/20 border-t-[#a8c57e] spinner" />
                <span className="mono text-[10px] text-[#3e4646]">Resolving place name…</span>
              </div>
            )}

            {location.geocoding === "done" && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { label: "Village",     value: location.village },
                  { label: "Suburb",      value: location.suburb },
                  { label: "Ward",        value: location.ward },
                  { label: "Sub-county",  value: location.subCounty },
                  { label: "County",      value: location.county },
                  { label: "Country",     value: location.country ? `${location.country}${location.countryCode ? ` (${location.countryCode})` : ""}` : undefined },
                  { label: "Postcode",    value: location.postcode },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="mono text-[9px] text-[#3e4646] tracking-wider uppercase">{label}</span>
                    <span className="mono text-[11px] text-[#c8c4bc]">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Image info card ── */}
      <div className="flex gap-4 bg-[#111414] border border-white/[0.06] rounded-2xl p-4 items-start">
        <div className="w-24 h-18 sm:w-28 sm:h-20 rounded-xl overflow-hidden border border-white/[0.07] shrink-0">
          <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <p className="font-semibold text-[14px] text-[#d8d4cc] truncate">{img.name}</p>
          <div className="mono text-[11px] text-[#4a5252] flex flex-col gap-1">
            <span>{fmtSize(img.size)}</span>
            {img.uploadedAt && <span>Uploaded {fmtTime(img.uploadedAt)}</span>}
          </div>
          <div className="flex items-center gap-2 bg-[#0c0e0e] border border-white/[0.05] rounded-lg px-2.5 py-1.5 max-w-xs">
            <span className="mono text-[10px] text-[#3e4646] truncate flex-1">{img.url || "—"}</span>
            <button onClick={copyUrl} className="mono text-[11px] text-[#a8c57e] hover:text-[#c8e59e] shrink-0 transition-colors">
              {copied ? "✓" : "copy"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Disease breakdown ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-5 h-0.5 bg-[#a8c57e] rounded-full" />
          <span className="mono text-[11px] text-[#4a5252] tracking-[.1em] uppercase">Disease Probability</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {report.diseases.map((d, i) => {
            const s = SEV_STYLES[d.severity];
            return (
              <div
                key={d.name}
                className={`relative bg-[#111414] border rounded-2xl p-5 flex flex-col gap-3.5 transition-all hover:shadow-lg hover:shadow-black/30
                  ${i === 0 ? "border-[#a8c57e]/25 bg-[#111916]" : "border-white/[0.06] hover:border-white/[0.1]"}`}
              >
                {i === 0 && (
                  <span className="absolute top-3.5 right-3.5 mono text-[9px] text-[#a8c57e] bg-[#a8c57e]/10 px-2 py-0.5 rounded-full tracking-wider uppercase">
                    Top Match
                  </span>
                )}
                <p className="font-semibold text-[14px] text-[#d8d4cc] pr-16 leading-snug">{d.name}</p>
                <span className={`self-start mono text-[10px] font-medium px-2.5 py-0.5 rounded-full ring-1 ${s.badge}`}>
                  {d.severity.charAt(0).toUpperCase() + d.severity.slice(1)}
                </span>
                <div className="flex flex-col gap-2">
                  <span className={`mono text-[22px] font-medium ${s.text}`}>{fmtPct(d.probability)}</span>
                  <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bar-anim ${s.bar}`}
                      style={{ width: fmtPct(d.probability) }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Action plan ── */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.06]">
        <div className="bg-[#0f1200] border-b border-[#a8c57e]/10 px-5 py-4 flex items-start gap-3">
          <span className="text-xl mt-0.5">🌱</span>
          <div>
            <p className="serif text-[16px] font-semibold text-[#d8d4cc]">Farmer's Action Plan</p>
            <p className="mono text-[11px] text-[#4a5252] mt-0.5">Based on: {report.diseases[0].name}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 p-4 bg-[#0d1010]">
          {report.advice.map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-3.5 bg-[#111414] hover:bg-[#131818] border border-white/[0.05] hover:border-white/[0.09] rounded-xl p-4 transition-all"
            >
              <span className="w-6 h-6 shrink-0 rounded-lg bg-[#a8c57e]/12 text-[#a8c57e] mono text-[11px] font-semibold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-[13px] text-[#b8b4ac] leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer note ── */}
      <p className="mono text-[10px] text-[#2e3636] text-center pb-4 tracking-wide">
        Report generated by CropScan AI · Always consult an agronomist for critical decisions
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LOCATION PERMISSION MODAL
═══════════════════════════════════════════════════════════════════════════════ */
function LocationModal({ onResult }: { onResult: (allow: boolean) => void }) {
  return (
    <div
      className="overlay-in fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
    >
      <div className="modal-in w-full sm:w-auto sm:min-w-[380px] sm:max-w-[440px] bg-[#0e1111] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col">

        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#a8c57e]/0 via-[#a8c57e]/60 to-[#a8c57e]/0" />

        <div className="flex flex-col gap-5 px-6 pt-7 pb-7">
          {/* Icon */}
          <div className="flex items-center justify-center">
            <div className="relative w-16 h-16 rounded-2xl bg-[#1a1f1f] border border-white/[0.08] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a8c57e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#a8c57e] flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a0b0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
            </div>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-2 text-center">
            <h2 className="serif text-[20px] font-semibold text-[#f0ece4]">Allow Field Location</h2>
            <p className="text-[13px] text-[#5e6666] leading-relaxed">
              CropScan would like to record your <strong className="text-[#8a9696] font-medium">GPS coordinates</strong> alongside each diagnostic report. This helps track disease spread across regions and improves future model accuracy.
            </p>
          </div>

          {/* Benefit pills */}
          <div className="flex flex-col gap-2">
            {[
              { icon: "🗺️", text: "Tag reports to your exact field" },
              { icon: "📈", text: "Track disease spread over time" },
              { icon: "🔒", text: "Location stays on your device for now" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 bg-[#141818] border border-white/[0.05] rounded-xl px-3.5 py-2.5">
                <span className="text-[15px]">{icon}</span>
                <p className="text-[12px] text-[#8a9696]">{text}</p>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2.5 pt-1">
            <button
              onClick={() => onResult(true)}
              className="w-full flex items-center justify-center gap-2 bg-[#a8c57e] hover:bg-[#b8d48e] text-[#0a0b0b] font-semibold text-[14px] py-3 rounded-xl transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              Allow Location Access
            </button>
            <button
              onClick={() => onResult(false)}
              className="w-full mono text-[12px] text-[#4a5252] hover:text-[#8a9696] py-2.5 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CAMERA MODAL
═══════════════════════════════════════════════════════════════════════════════ */
function CameraModal({ onClose, onCapture }: {
  onClose: () => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  const [camState, setCamState] = useState<"starting" | "live" | "preview" | "error">("starting");
  const [errMsg, setErrMsg]     = useState("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl]   = useState<string | null>(null);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    setCamState("starting");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamState("live");
    } catch (e: any) {
      const msg = e?.name === "NotAllowedError"
        ? "Camera permission denied. Please allow camera access and try again."
        : e?.name === "NotFoundError"
        ? "No camera found on this device."
        : "Could not start camera. Try uploading a file instead.";
      setErrMsg(msg);
      setCamState("error");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, []);

  const flipCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    setCamState("starting");
    setCapturedBlob(null);
    if (capturedUrl) { URL.revokeObjectURL(capturedUrl); setCapturedUrl(null); }
    startCamera(next);
  };

  const snap = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    // flash effect
    if (flashRef.current) {
      flashRef.current.classList.remove("flash-snap");
      void flashRef.current.offsetWidth;
      flashRef.current.classList.add("flash-snap");
    }

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setCapturedBlob(blob);
      setCapturedUrl(url);
      setCamState("preview");
      streamRef.current?.getTracks().forEach(t => t.stop());
    }, "image/jpeg", 0.92);
  };

  const retake = () => {
    if (capturedUrl) { URL.revokeObjectURL(capturedUrl); setCapturedUrl(null); }
    setCapturedBlob(null);
    setCamState("starting");
    startCamera(facingMode);
  };

  const usePhoto = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `crop-${Date.now()}.jpg`, { type: "image/jpeg" });
    onCapture(file);
  };

  return (
    <div
      className="overlay-in fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-in relative w-full sm:w-auto sm:min-w-[420px] sm:max-w-[580px] bg-[#0e1111] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[#1a1f1f] border border-white/[0.08] flex items-center justify-center text-[13px]">📷</span>
            <div>
              <p className="font-semibold text-[14px] text-[#d8d4cc]">Take a Photo</p>
              <p className="mono text-[10px] text-[#3e4646]">
                {camState === "live" ? "Position your crop in frame" :
                 camState === "preview" ? "Review before using" :
                 camState === "starting" ? "Starting camera…" : "Camera unavailable"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] text-[#6a7272] hover:text-[#d8d4cc] flex items-center justify-center text-[13px] transition-all"
          >✕</button>
        </div>

        {/* Viewfinder */}
        <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>

          {/* Flash overlay */}
          <div ref={flashRef} className="absolute inset-0 bg-white z-20 pointer-events-none opacity-0" />

          {/* Video */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${camState === "preview" ? "hidden" : ""}`}
          />

          {/* Captured preview */}
          {camState === "preview" && capturedUrl && (
            <img src={capturedUrl} alt="captured" className="w-full h-full object-cover" />
          )}

          {/* Starting overlay */}
          {camState === "starting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 z-10">
              <div className="w-8 h-8 rounded-full border-2 border-[#a8c57e]/20 border-t-[#a8c57e] spinner" />
              <p className="mono text-[11px] text-[#a8c57e] tracking-wider">STARTING CAMERA…</p>
            </div>
          )}

          {/* Error overlay */}
          {camState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0a0b0b] z-10 px-8 text-center">
              <span className="text-4xl opacity-40">📷</span>
              <p className="text-[13px] text-[#8a9696] leading-relaxed">{errMsg}</p>
            </div>
          )}

          {/* Live: grid overlay + corner brackets */}
          {camState === "live" && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              {/* Corner brackets */}
              {[
                "top-3 left-3 border-t-2 border-l-2 rounded-tl-lg",
                "top-3 right-3 border-t-2 border-r-2 rounded-tr-lg",
                "bottom-3 left-3 border-b-2 border-l-2 rounded-bl-lg",
                "bottom-3 right-3 border-b-2 border-r-2 rounded-br-lg",
              ].map((cls, i) => (
                <div key={i} className={`absolute w-6 h-6 border-[#a8c57e]/50 ${cls}`} />
              ))}
            </div>
          )}

          {/* Preview: top badge */}
          {camState === "preview" && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
              <span className="mono text-[10px] text-[#a8c57e] bg-black/70 backdrop-blur-sm border border-[#a8c57e]/20 px-3 py-1 rounded-full tracking-wider uppercase">
                Preview
              </span>
            </div>
          )}

          {/* Flip camera button (live only) */}
          {camState === "live" && (
            <button
              onClick={flipCamera}
              className="absolute top-3 right-3 z-20 w-9 h-9 rounded-xl bg-black/60 backdrop-blur-sm border border-white/[0.1] text-[#8a9696] hover:text-[#d8d4cc] flex items-center justify-center transition-colors"
              title="Flip camera"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="px-5 py-5 flex items-center justify-center gap-4 border-t border-white/[0.06]">
          {camState === "live" && (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/[0.07] text-[#6a7272] hover:text-[#8a9696] mono text-[12px] transition-colors"
              >
                Cancel
              </button>
              {/* Shutter */}
              <button
                onClick={snap}
                className="w-16 h-16 rounded-full bg-white border-4 border-[#3a4040] hover:bg-[#f0ece4] active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-black/40 relative"
              >
                <span className="w-12 h-12 rounded-full bg-white/20 absolute" />
              </button>
              <div className="flex-1" />
            </>
          )}

          {camState === "preview" && (
            <>
              <button
                onClick={retake}
                className="flex-1 py-2.5 rounded-xl border border-white/[0.07] text-[#8a9696] hover:text-[#d8d4cc] mono text-[12px] transition-colors"
              >
                ← Retake
              </button>
              <button
                onClick={usePhoto}
                className="flex-1 py-2.5 rounded-xl bg-[#a8c57e] hover:bg-[#b8d48e] text-[#0a0b0b] font-semibold text-[13px] transition-colors"
              >
                Use Photo →
              </button>
            </>
          )}

          {camState === "error" && (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#1a1f1f] border border-white/[0.07] text-[#8a9696] hover:text-[#d8d4cc] mono text-[12px] transition-colors"
            >
              Close
            </button>
          )}

          {camState === "starting" && (
            <p className="mono text-[11px] text-[#3e4646] py-2">Requesting camera access…</p>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
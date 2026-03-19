"use client";

import { useState, useCallback, useRef } from "react";
import { useUploadThing } from "@/lib/uploadthing";

// ─── Types ─────────────────────────────────────────────────────────────────────
type UploadStatus = "pending" | "uploading" | "done" | "error";

interface CropImage {
  id: string;
  name: string;
  size: number;
  preview: string;   // blob URL → replaced by CDN url once done
  url: string;
  status: UploadStatus;
  uploadedAt?: Date;
  report?: DiagnosticReport;
}

interface DiseaseResult {
  name: string;
  probability: number;
  severity: "low" | "medium" | "high" | "critical";
  color: string;
}

interface DiagnosticReport {
  cropType: string;
  diseases: DiseaseResult[];
  advice: string[];
  urgency: "monitor" | "treat-soon" | "treat-immediately";
  diagnosedAt: string;
}

// ─── Mock data factory (replace with real backend call) ────────────────────────
function generateMockReport(): DiagnosticReport {
  return {
    cropType: "Maize (Zea mays)",
    diagnosedAt: new Date().toISOString(),
    urgency: "treat-soon",
    diseases: [
      { name: "Gray Leaf Spot",       probability: 0.74, severity: "high",   color: "#e05252" },
      { name: "Northern Corn Blight", probability: 0.18, severity: "medium", color: "#e8a020" },
      { name: "Common Rust",          probability: 0.05, severity: "low",    color: "#e8d020" },
      { name: "Healthy Tissue",       probability: 0.03, severity: "low",    color: "#3dba72" },
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

// ─── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const fmtSize = (b: number) =>
  b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(0)}KB` : `${(b / 1048576).toFixed(1)}MB`;
const fmtPct = (n: number) => (n * 100).toFixed(1) + "%";
const fmtTime = (d: Date) =>
  d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });

const URGENCY_META = {
  "monitor":           { label: "Monitor",           bg: "rgba(61,186,114,0.12)",  text: "#3dba72", border: "rgba(61,186,114,0.3)"  },
  "treat-soon":        { label: "Treat Soon",         bg: "rgba(232,160,32,0.12)", text: "#e8a020", border: "rgba(232,160,32,0.3)"  },
  "treat-immediately": { label: "Treat Immediately",  bg: "rgba(224,82,82,0.12)",  text: "#e05252", border: "rgba(224,82,82,0.3)"   },
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function CropScanPage() {
  const [tab, setTab]     = useState<"upload" | "diagnostics">("upload");
  const [images, setImages] = useState<CropImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<CropImage | null>(null);
  const [activeReport, setActiveReport] = useState<CropImage | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("cropImageBulkUploader");

  // ── Add files ─────────────────────────────────────────────────────────────
  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;

    const newImages: CropImage[] = files.map((f) => ({
      id: uid(),
      name: f.name,
      size: f.size,
      preview: URL.createObjectURL(f),
      url: "",
      status: "uploading",
    }));

    setImages((prev) => [...prev, ...newImages]);
    doUpload(files, newImages);
  }, []);

  const doUpload = async (files: File[], newImgs: CropImage[]) => {
    try {
      const results = await startUpload(files);
      // Simulate backend analysis delay
      await new Promise((r) => setTimeout(r, 1800));

      setImages((prev) =>
        prev.map((img) => {
          const idx = newImgs.findIndex((n) => n.id === img.id);
          if (idx === -1) return img;
          const result = results?.[idx];
          if (!result) return { ...img, status: "error" };
          return {
            ...img,
            url: result.url,
            status: "done",
            uploadedAt: new Date(),
            report: generateMockReport(),
          };
        })
      );
    } catch {
      setImages((prev) =>
        prev.map((img) =>
          newImgs.find((n) => n.id === img.id) ? { ...img, status: "error" } : img
        )
      );
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img?.preview.startsWith("blob:")) URL.revokeObjectURL(img.preview);
      if (lightbox?.id === id) setLightbox(null);
      if (activeReport?.id === id) setActiveReport(null);
      return prev.filter((i) => i.id !== id);
    });
  };

  const openReport = (img: CropImage) => {
    setActiveReport(img);
    setTab("diagnostics");
  };

  const doneImages  = images.filter((i) => i.status === "done");
  const inFlight    = images.filter((i) => i.status === "uploading" || i.status === "pending").length;
  const activeImg   = activeReport ?? doneImages[0] ?? null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inconsolata:wght@300;400;500;600&family=Lora:ital,wght@0,500;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:       #0c0d0d;
          --surface:  #141616;
          --panel:    #1a1d1d;
          --card:     #1e2121;
          --border:   #272c2c;
          --border2:  #323838;
          --amber:    #e8a020;
          --amber-lo: rgba(232,160,32,0.1);
          --amber-md: rgba(232,160,32,0.25);
          --green:    #3dba72;
          --red:      #e05252;
          --text:     #e4e0d8;
          --muted:    #5e6464;
          --soft:     #8a9090;
        }
        body { font-family:'Syne',sans-serif; background:var(--bg); color:var(--text); min-height:100vh; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:var(--bg); }
        ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:3px; }

        /* ── Shell ── */
        .shell { display:grid; grid-template-rows:auto 1fr; min-height:100vh; }

        /* ── Header ── */
        .hdr {
          background:var(--surface);
          border-bottom:1px solid var(--border);
          padding:0 36px;
          display:flex; align-items:stretch; gap:0;
          height:58px;
        }
        .hdr-brand {
          display:flex; align-items:center; gap:10px;
          margin-right:28px;
        }
        .hdr-logo {
          width:32px; height:32px;
          border:1.5px solid var(--amber);
          border-radius:7px;
          display:flex; align-items:center; justify-content:center;
          font-size:16px;
        }
        .hdr-name {
          font-size:16px; font-weight:800; letter-spacing:.04em;
        }
        .hdr-name span { color:var(--amber); }
        .hdr-divider { width:1px; background:var(--border); margin:12px 0; }
        .hdr-tabs { display:flex; align-items:stretch; margin-left:20px; }
        .hdr-tab {
          display:flex; align-items:center; gap:7px;
          padding:0 20px;
          font-size:13px; font-weight:700; letter-spacing:.06em;
          text-transform:uppercase;
          color:var(--muted);
          cursor:pointer;
          border:none; background:none;
          border-bottom:2px solid transparent;
          transition:color .15s, border-color .15s;
          font-family:'Syne',sans-serif;
          position:relative;
        }
        .hdr-tab:hover { color:var(--soft); }
        .hdr-tab.active { color:var(--amber); border-bottom-color:var(--amber); }
        .tab-badge {
          background:var(--amber-lo);
          color:var(--amber);
          border:1px solid var(--amber-md);
          border-radius:20px;
          font-size:10px; font-weight:600;
          padding:1px 7px;
          font-family:'Inconsolata',monospace;
        }
        .hdr-right {
          margin-left:auto;
          display:flex; align-items:center; gap:10px;
        }
        .hdr-pill {
          font-family:'Inconsolata',monospace;
          font-size:11px; letter-spacing:.05em;
          color:var(--muted);
          border:1px solid var(--border);
          border-radius:20px;
          padding:4px 11px;
          display:flex; align-items:center; gap:5px;
        }
        .hdr-pill.live { border-color:rgba(232,160,32,.3); color:var(--amber); }
        .live-dot {
          width:5px; height:5px; border-radius:50%;
          background:var(--amber);
          animation:pulse 1.4s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

        /* ── Body ── */
        .body { display:flex; overflow:hidden; height:calc(100vh - 58px); }

        /* ════════════════════════════════════════
           UPLOAD TAB
        ════════════════════════════════════════ */
        .upload-view {
          flex:1; overflow-y:auto;
          padding:32px 36px;
          display:flex; flex-direction:column; gap:28px;
        }

        /* Drop zone */
        .drop-zone {
          border:1.5px dashed var(--border2);
          border-radius:14px;
          background:var(--surface);
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          gap:12px;
          padding:44px 24px;
          cursor:pointer;
          transition:all .2s;
          position:relative; overflow:hidden;
        }
        .drop-zone::before {
          content:'';
          position:absolute; inset:0;
          background:radial-gradient(ellipse at 50% 0%,rgba(232,160,32,.05) 0%,transparent 65%);
          pointer-events:none;
        }
        .drop-zone.over { border-color:var(--amber); background:rgba(232,160,32,.04); }
        .drop-zone:hover { border-color:var(--border2); background:#161818; }
        .drop-icon {
          width:58px; height:58px;
          border:1.5px solid var(--border2);
          border-radius:12px;
          background:var(--panel);
          display:flex; align-items:center; justify-content:center;
          font-size:26px; position:relative;
        }
        .drop-plus {
          position:absolute; bottom:-5px; right:-5px;
          width:18px; height:18px;
          background:var(--amber); border-radius:50%;
          color:var(--bg); font-size:13px; font-weight:800;
          display:flex; align-items:center; justify-content:center;
          line-height:1;
        }
        .drop-title { font-size:15px; font-weight:700; }
        .drop-hint {
          font-family:'Inconsolata',monospace;
          font-size:11px; color:var(--muted); letter-spacing:.06em;
        }
        .drop-btn {
          background:var(--amber); color:var(--bg);
          border:none; border-radius:8px;
          padding:9px 22px;
          font-family:'Syne',sans-serif;
          font-size:13px; font-weight:700; letter-spacing:.04em;
          cursor:pointer; transition:opacity .15s;
        }
        .drop-btn:hover { opacity:.85; }

        /* Section row */
        .sec-row {
          display:flex; align-items:center; justify-content:space-between;
          gap:12px;
        }
        .sec-label {
          font-family:'Inconsolata',monospace;
          font-size:11px; font-weight:600; letter-spacing:.12em;
          text-transform:uppercase; color:var(--muted);
          display:flex; align-items:center; gap:8px;
        }
        .sec-label::before {
          content:''; width:10px; height:1.5px;
          background:var(--amber); display:inline-block;
        }
        .ghost-btn {
          font-family:'Inconsolata',monospace;
          font-size:11px; color:var(--muted);
          background:none; border:1px solid var(--border);
          border-radius:5px; padding:3px 10px;
          cursor:pointer; transition:all .15s;
        }
        .ghost-btn:hover { border-color:var(--red); color:var(--red); }

        /* Upload grid */
        .upload-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(200px,1fr));
          gap:14px;
        }
        @keyframes cardIn {
          from { opacity:0; transform:scale(.93) translateY(8px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        .u-card {
          background:var(--card);
          border:1px solid var(--border);
          border-radius:12px; overflow:hidden;
          display:flex; flex-direction:column;
          animation:cardIn .28s ease both;
          transition:border-color .2s, box-shadow .2s;
          position:relative;
          cursor:pointer;
        }
        .u-card:hover { border-color:var(--border2); box-shadow:0 4px 24px rgba(0,0,0,.35); }
        .u-card.done:hover { border-color:rgba(232,160,32,.4); }

        .u-spec {
          position:absolute; top:8px; left:8px; z-index:5;
          font-family:'Inconsolata',monospace; font-size:9px;
          font-weight:500; letter-spacing:.08em;
          background:rgba(12,13,13,.8); backdrop-filter:blur(4px);
          border:1px solid var(--border2);
          color:var(--muted); padding:2px 7px; border-radius:3px;
        }
        .u-remove {
          position:absolute; top:8px; right:8px; z-index:5;
          width:22px; height:22px;
          background:rgba(12,13,13,.8); backdrop-filter:blur(4px);
          border:1px solid var(--border2);
          border-radius:5px; color:var(--muted);
          font-size:12px; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          opacity:0; transition:all .15s;
        }
        .u-card:hover .u-remove { opacity:1; }
        .u-remove:hover { color:var(--red); border-color:var(--red); }

        .u-thumb {
          width:100%; aspect-ratio:4/3;
          overflow:hidden; background:var(--panel);
          position:relative;
        }
        .u-thumb img {
          width:100%; height:100%; object-fit:cover;
          transition:transform .35s;
          display:block;
        }
        .u-card:hover .u-thumb img { transform:scale(1.06); }

        /* uploading overlay */
        .u-overlay {
          position:absolute; inset:0;
          background:rgba(12,13,13,.75); backdrop-filter:blur(2px);
          display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap:8px; z-index:4;
        }
        @keyframes spin { to { transform:rotate(360deg); } }
        .u-spinner {
          width:28px; height:28px;
          border:2px solid rgba(232,160,32,.2);
          border-top-color:var(--amber);
          border-radius:50%;
          animation:spin .75s linear infinite;
        }
        .u-ovr-txt {
          font-family:'Inconsolata',monospace;
          font-size:11px; color:var(--amber); letter-spacing:.06em;
        }

        .u-foot {
          padding:10px 12px;
          border-top:1px solid var(--border);
          display:flex; flex-direction:column; gap:5px;
        }
        .u-name {
          font-size:12px; font-weight:600;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .u-row { display:flex; align-items:center; justify-content:space-between; }
        .u-sz {
          font-family:'Inconsolata',monospace;
          font-size:10px; color:var(--muted);
        }
        .u-chip {
          display:inline-flex; align-items:center; gap:4px;
          font-family:'Inconsolata',monospace;
          font-size:10px; font-weight:500;
          padding:2px 7px; border-radius:3px;
        }
        .u-chip-dot { width:4px; height:4px; border-radius:50%; background:currentColor; }
        .u-chip.done      { background:rgba(61,186,114,.1);  color:var(--green); }
        .u-chip.uploading { background:rgba(232,160,32,.1);  color:var(--amber); }
        .u-chip.error     { background:rgba(224,82,82,.1);   color:var(--red);   }
        .u-chip.pending   { background:rgba(100,104,102,.1); color:var(--muted); }

        .u-diag-btn {
          width:100%; margin-top:2px;
          background:var(--amber-lo);
          border:1px solid var(--amber-md);
          color:var(--amber);
          border-radius:6px; padding:6px 0;
          font-family:'Syne',sans-serif;
          font-size:11px; font-weight:700;
          letter-spacing:.05em; cursor:pointer;
          transition:background .15s;
        }
        .u-diag-btn:hover { background:rgba(232,160,32,.18); }

        /* Empty */
        .empty {
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          gap:8px; padding:56px 24px;
          color:var(--muted); text-align:center;
        }
        .empty-icon { font-size:32px; opacity:.35; }
        .empty-text { font-size:13px; font-weight:600; color:var(--muted); }
        .empty-sub {
          font-family:'Inconsolata',monospace;
          font-size:11px; letter-spacing:.05em;
        }

        /* ════════════════════════════════════════
           DIAGNOSTICS TAB
        ════════════════════════════════════════ */
        .diag-view {
          flex:1; overflow:hidden;
          display:flex;
        }

        /* Left: image strip */
        .diag-strip {
          width:110px; flex-shrink:0;
          background:var(--surface);
          border-right:1px solid var(--border);
          overflow-y:auto;
          padding:14px 10px;
          display:flex; flex-direction:column; gap:8px;
        }
        .strip-label {
          font-family:'Inconsolata',monospace;
          font-size:9px; letter-spacing:.1em;
          color:var(--muted); text-transform:uppercase;
          text-align:center; padding-bottom:6px;
          border-bottom:1px solid var(--border);
          margin-bottom:4px;
        }
        .strip-thumb {
          width:90px; height:70px;
          border-radius:7px; overflow:hidden;
          border:1.5px solid var(--border);
          cursor:pointer; position:relative;
          transition:border-color .15s, box-shadow .15s;
          flex-shrink:0;
        }
        .strip-thumb:hover { border-color:var(--border2); }
        .strip-thumb.active {
          border-color:var(--amber);
          box-shadow:0 0 0 2px var(--amber-md);
        }
        .strip-thumb img {
          width:100%; height:100%; object-fit:cover; display:block;
        }
        .strip-uploading {
          position:absolute; inset:0;
          background:rgba(12,13,13,.7);
          display:flex; align-items:center; justify-content:center;
        }
        .strip-spinner {
          width:18px; height:18px;
          border:2px solid rgba(232,160,32,.2);
          border-top-color:var(--amber);
          border-radius:50%;
          animation:spin .75s linear infinite;
        }
        .strip-num {
          position:absolute; bottom:3px; right:4px;
          font-family:'Inconsolata',monospace;
          font-size:8px; color:rgba(255,255,255,.6);
          letter-spacing:.04em;
        }
        .strip-empty {
          font-family:'Inconsolata',monospace;
          font-size:10px; color:var(--muted);
          text-align:center; padding:16px 0;
          letter-spacing:.04em;
        }

        /* Right: report panel */
        .diag-panel {
          flex:1; overflow-y:auto;
          padding:32px 36px;
          display:flex; flex-direction:column; gap:28px;
        }

        /* No selection */
        .diag-empty {
          flex:1; display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          gap:10px; color:var(--muted); text-align:center;
        }
        .diag-empty-icon { font-size:40px; opacity:.25; }
        .diag-empty-text { font-size:14px; font-weight:700; }
        .diag-empty-sub {
          font-family:'Inconsolata',monospace;
          font-size:11px; letter-spacing:.05em;
          max-width:280px; line-height:1.6;
        }

        /* Report header */
        .rep-head {
          display:flex; align-items:flex-start;
          justify-content:space-between; gap:16px; flex-wrap:wrap;
        }
        .rep-title {
          font-family:'Lora',serif;
          font-size:26px; font-weight:500;
          color:var(--text); line-height:1.2;
        }
        .rep-meta {
          font-family:'Inconsolata',monospace;
          font-size:11px; color:var(--muted);
          margin-top:5px; display:flex; flex-direction:column; gap:3px;
        }
        .urgency-badge {
          padding:7px 14px; border-radius:7px;
          font-size:12px; font-weight:700;
          border-width:1.5px; border-style:solid;
          white-space:nowrap; font-family:'Inconsolata',monospace;
          letter-spacing:.05em;
          display:flex; align-items:center; gap:6px;
        }

        /* Selected image preview in report */
        .rep-img-row {
          display:flex; gap:16px; align-items:flex-start;
          background:var(--panel);
          border:1px solid var(--border);
          border-radius:12px; padding:14px;
        }
        .rep-img {
          width:120px; height:90px;
          border-radius:8px; overflow:hidden;
          border:1px solid var(--border2); flex-shrink:0;
        }
        .rep-img img { width:100%; height:100%; object-fit:cover; display:block; }
        .rep-img-info { display:flex; flex-direction:column; gap:6px; }
        .rep-img-name {
          font-size:14px; font-weight:700;
          color:var(--text);
        }
        .rep-img-meta {
          font-family:'Inconsolata',monospace;
          font-size:11px; color:var(--muted);
          display:flex; flex-direction:column; gap:3px;
        }
        .rep-url {
          display:flex; align-items:center; gap:6px;
          background:var(--card);
          border:1px solid var(--border);
          border-radius:5px; padding:4px 8px;
          max-width:320px;
        }
        .rep-url-txt {
          font-family:'Inconsolata',monospace;
          font-size:10px; color:var(--muted);
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
          flex:1;
        }
        .rep-url-copy {
          background:none; border:none; color:var(--muted);
          cursor:pointer; font-size:12px; padding:0;
          transition:color .15s; flex-shrink:0;
        }
        .rep-url-copy:hover { color:var(--amber); }
        .rep-url-open {
          font-family:'Inconsolata',monospace;
          font-size:10px; color:var(--amber);
          background:none; border:none; cursor:pointer;
          text-decoration:underline; padding:0; flex-shrink:0;
        }

        /* Disease cards */
        .dis-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(195px,1fr));
          gap:12px;
        }
        .dis-card {
          background:var(--card);
          border:1px solid var(--border);
          border-radius:11px; padding:16px;
          display:flex; flex-direction:column; gap:10px;
          position:relative; overflow:hidden;
          transition:box-shadow .2s, border-color .2s;
        }
        .dis-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.3); }
        .dis-card.top {
          border-color:var(--amber-md);
          background:#1c1f1e;
        }
        .top-tag {
          position:absolute; top:9px; right:9px;
          font-family:'Inconsolata',monospace;
          font-size:8px; font-weight:600; letter-spacing:.1em;
          color:var(--amber); background:var(--amber-lo);
          padding:2px 6px; border-radius:3px;
        }
        .dis-name { font-size:13px; font-weight:700; line-height:1.3; }
        .sev-tag {
          display:inline-flex; align-items:center; gap:4px;
          font-family:'Inconsolata',monospace;
          font-size:10px; font-weight:600;
          text-transform:uppercase; letter-spacing:.06em;
          padding:2px 8px; border-radius:3px; width:fit-content;
        }
        .sev-low      { background:rgba(61,186,114,.1);  color:#3dba72; }
        .sev-medium   { background:rgba(232,160,32,.1);  color:#e8a020; }
        .sev-high     { background:rgba(224,130,60,.12); color:#e07830; }
        .sev-critical { background:rgba(224,82,82,.1);   color:#e05252; }

        .bar-pct {
          font-family:'Inconsolata',monospace;
          font-size:22px; font-weight:500;
          line-height:1;
        }
        .bar-track {
          height:6px; background:var(--panel);
          border-radius:6px; overflow:hidden;
        }
        .bar-fill {
          height:100%; border-radius:6px;
          transition:width 1.1s cubic-bezier(.16,1,.3,1);
        }

        /* Advice */
        .advice-box {
          background:var(--card);
          border:1px solid var(--border);
          border-radius:12px; overflow:hidden;
        }
        .advice-hdr {
          background:#1a1500;
          border-bottom:1px solid rgba(232,160,32,.15);
          padding:14px 20px;
          display:flex; align-items:center; gap:10px;
        }
        .advice-hdr-icon { font-size:18px; }
        .advice-hdr-title {
          font-family:'Lora',serif;
          font-size:16px; font-weight:500;
          color:var(--text);
        }
        .advice-hdr-sub {
          font-family:'Inconsolata',monospace;
          font-size:10px; color:var(--muted);
          margin-top:1px;
        }
        .advice-list {
          list-style:none; padding:16px 20px;
          display:flex; flex-direction:column; gap:10px;
        }
        .advice-item {
          display:flex; align-items:flex-start; gap:10px;
          padding:12px 14px;
          background:var(--panel);
          border:1px solid var(--border);
          border-radius:8px;
          font-size:13px; line-height:1.65;
          transition:background .15s, border-color .15s;
        }
        .advice-item:hover { background:#1c2020; border-color:var(--border2); }
        .advice-num {
          min-width:22px; height:22px;
          background:rgba(232,160,32,.15);
          color:var(--amber);
          border-radius:5px; font-size:11px; font-weight:700;
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0; margin-top:1px;
        }

        /* Tab hide/show */
        .tab-content { display:none; width:100%; height:100%; }
        .tab-content.visible { display:flex; }

        /* Footer */
        .foot {
          background:var(--surface);
          border-top:1px solid var(--border);
          padding:11px 36px;
          font-family:'Inconsolata',monospace;
          font-size:10px; color:var(--muted);
          letter-spacing:.06em;
          display:flex; align-items:center; gap:12px;
        }
        .foot-dot { width:3px; height:3px; border-radius:50%; background:var(--muted); }

        @media (max-width:680px) {
          .hdr { padding:0 16px; }
          .upload-view, .diag-panel { padding:20px 16px; }
          .diag-strip { width:84px; }
          .strip-thumb { width:64px; height:50px; }
        }
      `}</style>

      <div className="shell">

        {/* ── Header ── */}
        <header className="hdr">
          <div className="hdr-brand">
            <div className="hdr-logo">🌿</div>
            <div className="hdr-name">Crop<span>Scan</span></div>
          </div>
          <div className="hdr-divider" />
          <nav className="hdr-tabs">
            <button
              className={`hdr-tab ${tab === "upload" ? "active" : ""}`}
              onClick={() => setTab("upload")}
            >
              📂 Upload
              {images.length > 0 && <span className="tab-badge">{images.length}</span>}
            </button>
            <button
              className={`hdr-tab ${tab === "diagnostics" ? "active" : ""}`}
              onClick={() => setTab("diagnostics")}
            >
              🔬 Diagnostics
              {doneImages.length > 0 && <span className="tab-badge">{doneImages.length}</span>}
            </button>
          </nav>
          <div className="hdr-right">
            {inFlight > 0 && (
              <div className="hdr-pill live">
                <div className="live-dot" />
                {inFlight} uploading
              </div>
            )}
            <div className="hdr-pill">{doneImages.length} ready</div>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="body">

          {/* ════ UPLOAD TAB ════ */}
          <div className={`tab-content ${tab === "upload" ? "visible" : ""}`}
            style={{ flexDirection:"column", overflowY:"auto" }}>
            <UploadTab
              images={images}
              dragOver={dragOver}
              setDragOver={setDragOver}
              inputRef={inputRef}
              addFiles={addFiles}
              removeImage={removeImage}
              openReport={openReport}
              setImages={setImages}
            />
          </div>

          {/* ════ DIAGNOSTICS TAB ════ */}
          <div className={`tab-content ${tab === "diagnostics" ? "visible" : ""}`}>
            <DiagnosticsTab
              images={images}
              activeImg={activeImg}
              setActiveReport={setActiveReport}
              doneImages={doneImages}
            />
          </div>
        </div>
      </div>

      {/* Hidden file input (shared) */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPLOAD TAB
// ═══════════════════════════════════════════════════════════════════════════════
function UploadTab({
  images, dragOver, setDragOver, inputRef, addFiles, removeImage, openReport, setImages,
}: {
  images: CropImage[];
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  addFiles: (f: FileList | File[]) => void;
  removeImage: (id: string) => void;
  openReport: (img: CropImage) => void;
  setImages: React.Dispatch<React.SetStateAction<CropImage[]>>;
}) {
  return (
    <div className="upload-view">
      {/* Drop zone */}
      <div
        className={`drop-zone ${dragOver ? "over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <div className="drop-icon">
          🌾
          <div className="drop-plus">+</div>
        </div>
        <div className="drop-title">Drop crop images here</div>
        <div className="drop-hint">JPG · PNG · WEBP &nbsp;·&nbsp; UP TO 8MB EACH &nbsp;·&nbsp; MULTIPLE FILES</div>
        <button className="drop-btn" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
          Browse Files
        </button>
      </div>

      {/* Gallery */}
      {images.length > 0 && (
        <div>
          <div className="sec-row" style={{ marginBottom: 14 }}>
            <div className="sec-label">
              Uploaded Specimens · {images.length} image{images.length !== 1 ? "s" : ""}
            </div>
            <button className="ghost-btn" onClick={() => setImages([])}>Clear all</button>
          </div>
          <div className="upload-grid">
            {images.map((img, idx) => (
              <UploadCard
                key={img.id}
                img={img}
                index={idx + 1}
                onRemove={() => removeImage(img.id)}
                onOpenReport={() => openReport(img)}
              />
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📂</div>
          <div className="empty-text">No images yet</div>
          <div className="empty-sub">DROP FILES ABOVE OR CLICK BROWSE TO BEGIN</div>
        </div>
      )}
    </div>
  );
}

function UploadCard({ img, index, onRemove, onOpenReport }:
  { img: CropImage; index: number; onRemove: () => void; onOpenReport: () => void }) {
  return (
    <div
      className={`u-card ${img.status}`}
      style={{ animationDelay: `${(index - 1) * 35}ms` }}
    >
      <div className="u-spec">SPEC-{String(index).padStart(3, "0")}</div>
      <button className="u-remove" onClick={(e) => { e.stopPropagation(); onRemove(); }}>✕</button>

      <div className="u-thumb" onClick={onOpenReport}>
        <img src={img.status === "done" ? img.url : img.preview} alt={img.name} />
        {(img.status === "uploading" || img.status === "pending") && (
          <div className="u-overlay">
            <div className="u-spinner" />
            <div className="u-ovr-txt">UPLOADING…</div>
          </div>
        )}
      </div>

      <div className="u-foot">
        <div className="u-name" title={img.name}>{img.name}</div>
        <div className="u-row">
          <div className="u-sz">{fmtSize(img.size)}</div>
          <div className={`u-chip ${img.status}`}>
            <div className="u-chip-dot" />
            {img.status === "done" ? "Ready" : img.status === "uploading" ? "Uploading" : img.status === "error" ? "Error" : "Pending"}
          </div>
        </div>
        {img.status === "done" && (
          <button className="u-diag-btn" onClick={onOpenReport}>
            View Diagnostics →
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGNOSTICS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function DiagnosticsTab({ images, activeImg, setActiveReport, doneImages }:
  {
    images: CropImage[];
    activeImg: CropImage | null;
    setActiveReport: (img: CropImage) => void;
    doneImages: CropImage[];
  }) {

  if (images.length === 0) {
    return (
      <div className="diag-view" style={{ flex: 1 }}>
        <div className="diag-empty" style={{ flex: 1 }}>
          <div className="diag-empty-icon">🔬</div>
          <div className="diag-empty-text">No images uploaded yet</div>
          <div className="diag-empty-sub">
            Go to the Upload tab, add your crop photos, and diagnostic reports will appear here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="diag-view">
      {/* Image strip */}
      <aside className="diag-strip">
        <div className="strip-label">Images</div>
        {images.length === 0 && <div className="strip-empty">NONE YET</div>}
        {images.map((img, idx) => (
          <div
            key={img.id}
            className={`strip-thumb ${activeImg?.id === img.id ? "active" : ""}`}
            onClick={() => img.status === "done" && setActiveReport(img)}
            title={img.name}
          >
            <img src={img.status === "done" ? img.url : img.preview} alt={img.name} />
            {img.status === "uploading" && (
              <div className="strip-uploading">
                <div className="strip-spinner" />
              </div>
            )}
            <div className="strip-num">#{idx + 1}</div>
          </div>
        ))}
      </aside>

      {/* Report panel */}
      <div className="diag-panel">
        {!activeImg || !activeImg.report ? (
          <div className="diag-empty">
            <div className="diag-empty-icon">⏳</div>
            <div className="diag-empty-text">
              {images.some(i => i.status === "uploading")
                ? "Analyzing…"
                : "Select an image"}
            </div>
            <div className="diag-empty-sub">
              {images.some(i => i.status === "uploading")
                ? "Upload and analysis in progress. Results will appear shortly."
                : "Click a thumbnail on the left to view its diagnostic report."}
            </div>
          </div>
        ) : (
          <ReportPanel img={activeImg} report={activeImg.report} />
        )}
      </div>
    </div>
  );
}

function ReportPanel({ img, report }: { img: CropImage; report: DiagnosticReport }) {
  const [copied, setCopied] = useState(false);
  const urgency = URGENCY_META[report.urgency];

  const copyUrl = () => {
    navigator.clipboard.writeText(img.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      {/* Header */}
      <div className="rep-head">
        <div>
          <div className="rep-title">Diagnostic Report</div>
          <div className="rep-meta">
            <span>🌾 {report.cropType}</span>
            <span>🕐 {fmtTime(new Date(report.diagnosedAt))}</span>
          </div>
        </div>
        <div
          className="urgency-badge"
          style={{ background: urgency.bg, color: urgency.text, borderColor: urgency.border }}
        >
          ⚠ {urgency.label}
        </div>
      </div>

      {/* Image summary row */}
      <div className="rep-img-row">
        <div className="rep-img">
          <img src={img.url} alt={img.name} />
        </div>
        <div className="rep-img-info">
          <div className="rep-img-name">{img.name}</div>
          <div className="rep-img-meta">
            <span>{fmtSize(img.size)}</span>
            {img.uploadedAt && <span>Uploaded {fmtTime(img.uploadedAt)}</span>}
          </div>
          {img.url && (
            <div className="rep-url">
              <div className="rep-url-txt">{img.url}</div>
              <button className="rep-url-copy" onClick={copyUrl}>{copied ? "✓" : "⎘"}</button>
              <a className="rep-url-open" href={img.url} target="_blank" rel="noreferrer">open ↗</a>
            </div>
          )}
        </div>
      </div>

      {/* Disease probability cards */}
      <div>
        <div className="sec-label" style={{ marginBottom: 12 }}>Disease Probability Breakdown</div>
        <div className="dis-grid">
          {report.diseases.map((d, i) => (
            <div key={d.name} className={`dis-card ${i === 0 ? "top" : ""}`}>
              {i === 0 && <div className="top-tag">TOP MATCH</div>}
              <div className="dis-name">{d.name}</div>
              <div className={`sev-tag sev-${d.severity}`}>
                ● {d.severity.charAt(0).toUpperCase() + d.severity.slice(1)}
              </div>
              <div className="bar-pct" style={{ color: d.color }}>{fmtPct(d.probability)}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: fmtPct(d.probability), background: d.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advice */}
      <div className="advice-box">
        <div className="advice-hdr">
          <div className="advice-hdr-icon">🌱</div>
          <div>
            <div className="advice-hdr-title">Farmer's Action Plan</div>
            <div className="advice-hdr-sub">Based on: {report.diseases[0].name}</div>
          </div>
        </div>
        <ul className="advice-list">
          {report.advice.map((a, i) => (
            <li key={i} className="advice-item">
              <div className="advice-num">{i + 1}</div>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
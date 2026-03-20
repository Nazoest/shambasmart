import { DiagnosticReport, UploadStatus } from "./types";

export const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&family=DM+Mono:wght@300;400;500&family=Playfair+Display:ital,wght@0,600;1,500&display=swap');`;

export function generateMockReport(): DiagnosticReport {
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

export const uid = () => Math.random().toString(36).slice(2, 10);

export const fmtSize = (b: number) =>
  b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

export const fmtPct = (n: number) => Math.round(n * 100) + "%";

export const fmtTime = (d: Date) => d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });

export const SEV_STYLES: Record<string, { bar: string; badge: string; text: string }> = {
  low:      { bar: "bg-emerald-500",   badge: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",  text: "text-emerald-400"  },
  medium:   { bar: "bg-amber-400",     badge: "bg-amber-400/10 text-amber-300 ring-amber-400/20",        text: "text-amber-300"    },
  high:     { bar: "bg-orange-400",    badge: "bg-orange-400/10 text-orange-300 ring-orange-400/20",     text: "text-orange-300"   },
  critical: { bar: "bg-red-500",       badge: "bg-red-500/10 text-red-400 ring-red-500/20",              text: "text-red-400"      },
};

export const URGENCY: Record<string, { label: string; style: string; dot: string }> = {
  "monitor":           { label: "Monitor",          style: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30", dot: "bg-emerald-400" },
  "treat-soon":        { label: "Treat Soon",        style: "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30",      dot: "bg-amber-400"   },
  "treat-immediately": { label: "Act Immediately",   style: "bg-red-500/10 text-red-400 ring-1 ring-red-500/30",            dot: "bg-red-400"     },
};

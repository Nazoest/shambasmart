"use client";

import { useState } from "react";
import { CropImage, DiagnosticReport, LocationData } from "@/lib/types";
import { URGENCY, SEV_STYLES, fmtTime, fmtSize, fmtPct } from "@/lib/utils";

export function Report({ img, report, location }: { img: CropImage; report: DiagnosticReport; location: LocationData | null }) {
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
            {img.uploadedAt && <span>Uploaded {fmtTime(new Date(img.uploadedAt))}</span>}
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

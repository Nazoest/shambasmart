"use client";

import { LocationData } from "@/lib/types";

export function GeoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="mono text-[9px] text-[#3e4646] tracking-wider uppercase shrink-0 pt-0.5">{label}</span>
      <span className="mono text-[11px] text-[#c8c4bc] text-right leading-snug">{value}</span>
    </div>
  );
}

export function LocationCard({ location, status, onRequest }: {
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

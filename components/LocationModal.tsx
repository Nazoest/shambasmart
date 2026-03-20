"use client";

export function LocationModal({ onResult }: { onResult: (allow: boolean) => void }) {
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

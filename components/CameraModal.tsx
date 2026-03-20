"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export function CameraModal({ onClose, onCapture }: {
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

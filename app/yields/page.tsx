"use client";

import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";

type CropOption = {
  id: string;
  name: string;
  emoji: string;
  season: string;
  baseYield: number;
  unit: string;
};

type YieldInputs = {
  crops: string[];
  landSize: string;
  landUnit: "acres" | "hectares" | "sqm";
  soilType: string;
  irrigation: string;
  season: string;
  fertilizer: string;
  experience: string;
};

type CropYieldResult = {
  crop: CropOption;
  low: number;
  mid: number;
  high: number;
  confidence: number;
  tips: string[];
  marketPrice: number;
};

type YieldPrediction = {
  inputs: YieldInputs;
  results: CropYieldResult[];
  generatedAt: string;
};

const CROP_OPTIONS: CropOption[] = [
  { id: "maize", name: "Maize", emoji: "🌽", season: "Mar–Jul / Oct–Jan", baseYield: 1500, unit: "kg" },
  { id: "beans", name: "Beans", emoji: "🫘", season: "Mar–Jun / Oct–Jan", baseYield: 700, unit: "kg" },
  { id: "wheat", name: "Wheat", emoji: "🌾", season: "Oct–Feb", baseYield: 2000, unit: "kg" },
  { id: "potato", name: "Potato", emoji: "🥔", season: "Mar–Jun / Sep–Dec", baseYield: 8000, unit: "kg" },
  { id: "tomato", name: "Tomato", emoji: "🍅", season: "Year-round", baseYield: 12000, unit: "kg" },
  { id: "kale", name: "Kale (Sukuma)", emoji: "🥬", season: "Year-round", baseYield: 5000, unit: "kg" },
];

const CROP_SPACING: Record<string, { perPlantM2: number; description: string }> = {
  maize: { perPlantM2: 0.2, description: "75x25cm spacing ~0.19m²" },
  beans: { perPlantM2: 0.06, description: "30x20cm spacing ~0.06m²" },
  wheat: { perPlantM2: 0.05, description: "20x25cm spacing ~0.05m²" },
  potato: { perPlantM2: 0.4, description: "40x100cm spacing ~0.40m²" },
  tomato: { perPlantM2: 0.5, description: "50x100cm spacing ~0.50m²" },
  kale: { perPlantM2: 0.2, description: "40x50cm spacing ~0.20m²" },
};

const SOIL_TYPES = ["Loam", "Clay Loam", "Sandy Loam", "Black Cotton", "Red Volcanic", "Sandy", "Clay"];
const IRRIGATION = ["Rain-fed only", "Supplemental irrigation", "Fully irrigated", "Drip irrigation"];
const SEASONS = ["Long Rains (Mar–May)", "Short Rains (Oct–Dec)", "Dry season", "Year-round"];
const FERTILIZERS = ["None", "Organic / compost", "DAP (starter)", "CAN (top-dress)", "NPK blend", "Foliar spray"];
const EXPERIENCE = ["< 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"];

const SOIL_MULT: Record<string, number> = {
  Loam: 1.15,
  "Clay Loam": 1.05,
  "Sandy Loam": 0.95,
  "Black Cotton": 1.0,
  "Red Volcanic": 1.1,
  Sandy: 0.8,
  Clay: 0.85,
};

const IRR_MULT: Record<string, number> = {
  "Rain-fed only": 0.85,
  "Supplemental irrigation": 1.0,
  "Fully irrigated": 1.2,
  "Drip irrigation": 1.3,
};

const FERT_MULT: Record<string, number> = {
  None: 0.7,
  "Organic / compost": 0.9,
  "DAP (starter)": 1.0,
  "CAN (top-dress)": 1.05,
  "NPK blend": 1.2,
  "Foliar spray": 1.1,
};

const EXP_MULT: Record<string, number> = {
  "< 1 year": 0.8,
  "1–3 years": 0.9,
  "3–5 years": 1.0,
  "5–10 years": 1.1,
  "10+ years": 1.15,
};

const CROP_TIPS: Record<string, string[]> = {
  maize: ["Plant at 75×25cm spacing.", "Top-dress with CAN at knee height.", "Scout for Fall Armyworm weekly."],
  beans: ["Inoculate with Rhizobium.", "Avoid waterlogging.", "Harvest when pods rattle."],
  wheat: ["Use certified seed.", "Time irrigation at grain-fill.", "Harvest at 12–14% moisture."],
  potato: ["Use disease-free seed.", "Ridge regularly.", "Watch late blight."],
  tomato: ["Stake plants.", "Use drip irrigation.", "Apply calcium foliar."],
  kale: ["Harvest outer leaves.", "Irrigate twice weekly.", "Use nitrogen fertilizer."],
};

const MARKET_PRICE: Record<string, number> = {
  maize: 35,
  beans: 120,
  wheat: 55,
  potato: 40,
  tomato: 60,
  kale: 15,
};

function landToAcres(size: string, unit: "acres" | "hectares" | "sqm"): number {
  const n = parseFloat(size) || 0;
  if (unit === "hectares") return n * 2.471;
  if (unit === "sqm") return n / 4047;
  return n;
}

function generateYieldPrediction(inputs: YieldInputs): YieldPrediction {
  const acres = landToAcres(inputs.landSize, inputs.landUnit);
  const soilM = SOIL_MULT[inputs.soilType] ?? 1;
  const irrM = IRR_MULT[inputs.irrigation] ?? 1;
  const fertM = FERT_MULT[inputs.fertilizer] ?? 1;
  const expM = EXP_MULT[inputs.experience] ?? 1;
  const totalM = soilM * irrM * fertM * expM;

  const results = inputs.crops.map((id) => {
    const crop = CROP_OPTIONS.find((c) => c.id === id)!;
    const mid = Math.round(crop.baseYield * acres * totalM);
    return {
      crop,
      low: Math.round(mid * 0.72),
      mid,
      high: Math.round(mid * 1.28),
      confidence: Math.min(0.95, 0.55 + (expM - 0.8) * 0.5 + (fertM - 0.7) * 0.3),
      tips: CROP_TIPS[id] ?? [],
      marketPrice: MARKET_PRICE[id] ?? 30,
    };
  });

  return { inputs, results, generatedAt: new Date().toISOString() };
}

const STEP_LABELS = ["Crops", "Land", "Conditions", "Review"] as const;

export default function YieldsPage() {
  const { location, locationStatus, requestLocation } = useAppContext();
  const [activeStep, setActiveStep] = useState(0);
  const [inputs, setInputs] = useState<YieldInputs>({
    crops: [],
    landSize: "",
    landUnit: "acres",
    soilType: "",
    irrigation: "",
    season: "",
    fertilizer: "",
    experience: "",
  });
  const [prediction, setPrediction] = useState<YieldPrediction | null>(null);

  const locationLine = useMemo<string | null>(() => {
    if (!location || locationStatus !== "granted") return null;
    if (location.geocoding === "done") {
      return [location.subCounty, location.county, location.country].filter(Boolean).join(", ") || null;
    }
    return `${location.lat.toFixed(4)}°, ${location.lng.toFixed(4)}°`;
  }, [location, locationStatus]);

  useEffect(() => {
    if (locationStatus === "idle") {
      requestLocation();
    }
  }, [locationStatus, requestLocation]);

  const setField = <K extends keyof YieldInputs>(field: K, value: YieldInputs[K]) =>
    setInputs((prev) => ({ ...prev, [field]: value }));

  const canProgress = () => {
    if (activeStep === 0) return inputs.crops.length > 0;
    if (activeStep === 1) return inputs.landSize !== "" && Number(inputs.landSize) > 0;
    if (activeStep === 2) return [inputs.soilType, inputs.irrigation, inputs.season, inputs.fertilizer, inputs.experience].every(Boolean);
    return true;
  };

  return (
    <div className="min-h-screen bg-[#0a0b0b] text-[#e2ded8]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="mono text-[11px] text-[#a8c57e] uppercase tracking-[0.12em]">Yield Predictor</p>
            <h1 className="serif text-3xl sm:text-4xl font-semibold text-[#f0ece4]">Forecast harvest yield by farm setup</h1>
            <p className="text-[14px] text-[#5e6666] mt-2 max-w-xl">Choose crops, fill your field and management details, then get low/mid/high predictions with revenue.</p>
            {locationLine && <p className="mono text-[11px] text-[#4a5252] mt-2">Location: {locationLine}</p>}
            {!locationLine && (
              <button
                onClick={requestLocation}
                className="mt-3 mono text-[11px] bg-[#1a1f1f] border border-white/[0.1] hover:border-[#a8c57e]/30 px-3 py-1.5 rounded-xl text-[#a8c57e]"
              >
                Enable location for improved prediction
              </button>
            )}
          </div>
          <Link href="/" className="mono text-[12px] px-3 py-2 rounded-xl border border-white/[0.08]">← Back</Link>
        </div>

        {prediction ? (
          <YieldResults prediction={prediction} locationLine={locationLine} onRecalc={() => { setPrediction(null); setActiveStep(0); }} />
        ) : (
          <YieldForm
            step={activeStep}
            inputs={inputs}
            setField={setField}
            onPrev={() => setActiveStep((s) => Math.max(0, s - 1))}
            onNext={() => setActiveStep((s) => Math.min(3, s + 1))}
            canNext={canProgress()}
            onSubmit={() => setPrediction(generateYieldPrediction(inputs))}
          />
        )}
      </main>
    </div>
  );
}

function YieldForm({
  step,
  inputs,
  setField,
  onPrev,
  onNext,
  onSubmit,
  canNext,
}: {
  step: number;
  inputs: YieldInputs;
  setField: <K extends keyof YieldInputs>(field: K, value: YieldInputs[K]) => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  canNext: boolean;
}) {
  return (
    <div className="bg-[#111414] border border-white/[0.06] rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2 text-[11px] text-[#4a5252] uppercase tracking-[.1em]">{STEP_LABELS.map((label, i) => (
        <div key={label} className={`px-3 py-1 rounded-full ${i === step ? "bg-[#a8c57e] text-[#0a0b0b]" : "bg-white/[0.05]"}`}>{label}</div>
      ))}</div>

      {step === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CROP_OPTIONS.map((crop) => {
            const selected = inputs.crops.includes(crop.id);
            return (
              <button key={crop.id} onClick={() => setField("crops", selected ? inputs.crops.filter((id) => id !== crop.id) : [...inputs.crops, crop.id])} className={`text-left p-3 rounded-2xl border transition ${selected ? "bg-[#111916] border-[#a8c57e]/40" : "bg-[#111414] border-white/[0.06] hover:border-white/[0.12]"}`}>
                <div className="text-2xl">{crop.emoji}</div>
                <p className="font-semibold text-[#d8d4cc]">{crop.name}</p>
                <p className="mono text-[10px] text-[#4a5252]">{crop.season}</p>
              </button>
            );
          })}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="mono text-[11px] text-[#6a7272] uppercase">Land size</label>
            <div className="flex gap-2 mt-2">
              <input type="number" min={0} step={0.1} value={inputs.landSize} onChange={(e) => setField("landSize", e.target.value)} className="flex-1 bg-[#0f1313] border border-white/[0.08] rounded-xl px-3 py-2" placeholder="2.5" />
              {(["acres", "hectares", "sqm"] as const).map((unit) => (
                <button key={unit} onClick={() => setField("landUnit", unit)} className={`px-3 py-2 rounded-xl ${inputs.landUnit === unit ? "bg-[#a8c57e]/15 border border-[#a8c57e]/35 text-[#a8c57e]" : "border border-white/[0.08] text-[#6a7272]"}`}>{unit === "sqm" ? "m²" : unit}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="mono text-[11px] text-[#6a7272] uppercase">Soil type</label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SOIL_TYPES.map((soil) => (
                <button key={soil} onClick={() => setField("soilType", soil)} className={`px-2 py-2 rounded-xl border ${inputs.soilType === soil ? "bg-[#111916] border-[#a8c57e]/35 text-[#a8c57e]" : "border-white/[0.06]"}`}>{soil}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {[
            { name: "Irrigation", key: "irrigation", options: IRRIGATION },
            { name: "Season", key: "season", options: SEASONS },
            { name: "Fertilizer", key: "fertilizer", options: FERTILIZERS },
            { name: "Experience", key: "experience", options: EXPERIENCE },
          ].map((group) => (
            <div key={group.key}>
              <label className="mono text-[11px] text-[#6a7272] uppercase">{group.name}</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.options.map((value) => (
                  <button key={value} onClick={() => setField(group.key as keyof YieldInputs, value as YieldInputs[keyof YieldInputs])} className={`px-3 py-2 rounded-xl border ${inputs[group.key as keyof YieldInputs] === value ? "bg-[#111916] border-[#a8c57e]/35 text-[#a8c57e]" : "border-white/[0.06] text-[#6a7272]"}`}>{value}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="bg-[#0d1212] border border-white/[0.05] rounded-xl p-4">
            <p className="mono text-[10px] text-[#4a5252]">Summary</p>
            <p className="text-[13px] text-[#c8c4bc] mt-2">Crops: {inputs.crops.map((id) => CROP_OPTIONS.find((c) => c.id === id)?.name).join(", ")}</p>
            <p className="text-[13px] text-[#c8c4bc]">Land: {inputs.landSize} {inputs.landUnit} (≈ {landToAcres(inputs.landSize, inputs.landUnit).toFixed(2)} ac)</p>
            <p className="text-[13px] text-[#c8c4bc]">Soil: {inputs.soilType} · Water: {inputs.irrigation} · Season: {inputs.season} · Fertilizer: {inputs.fertilizer} · Experience: {inputs.experience}</p>
          </div>
          <button onClick={onSubmit} disabled={!canNext} className={`w-full py-3 rounded-xl ${canNext ? "bg-[#a8c57e] text-[#0a0b0b]" : "bg-white/[0.08] text-[#3e4646] cursor-not-allowed"}`}>Predict Yield</button>
        </div>
      )}

      <div className="flex justify-between gap-3">
        <button onClick={onPrev} className="px-4 py-2 rounded-xl border border-white/[0.08]">← Prev</button>
        {step < 3 && <button onClick={onNext} disabled={!canNext} className={`px-4 py-2 rounded-xl ${canNext ? "bg-[#a8c57e]" : "bg-white/[0.08] text-[#3e4646]"}`}>Next →</button>}
      </div>
    </div>
  );
}

function YieldResults({ prediction, locationLine, onRecalc }: { prediction: YieldPrediction; locationLine: string | null; onRecalc: () => void; }) {
  const totalMid = prediction.results.reduce((sum, r) => sum + r.mid, 0);
  const totalRevenue = prediction.results.reduce((sum, r) => sum + r.mid * r.marketPrice, 0);
  const landSqm = landToAcres(prediction.inputs.landSize, prediction.inputs.landUnit) * 4047;
  const perCropArea = prediction.results.length ? landSqm / prediction.results.length : 0;
  const perCropPercent = prediction.results.length ? 100 / prediction.results.length : 0;

  return (
    <div className="space-y-5">
      <div className="bg-[#111414] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="mono text-[10px] text-[#4a5252] uppercase">Yield forecast</p>
            <h2 className="text-2xl font-semibold text-[#f0ece4]">Results</h2>
            {locationLine && <p className="mono text-[11px] text-[#4a5252]">{locationLine}</p>}
          </div>
          <div className="text-right">
            <p className="mono text-[10px] text-[#4a5252]">As of</p>
            <p className="text-[12px] text-[#a8c57e]">{new Date(prediction.generatedAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-[#0d1212] p-3 rounded-xl">
            <p className="mono text-[10px] text-[#4a5252]">Total yield</p>
            <p className="text-xl text-[#a8c57e] font-semibold">{totalMid >= 1000 ? `${(totalMid / 1000).toFixed(1)} t` : `${totalMid.toLocaleString()} kg`}</p>
          </div>
          <div className="bg-[#0d1212] p-3 rounded-xl">
            <p className="mono text-[10px] text-[#4a5252]">Total revenue</p>
            <p className="text-xl text-[#d8d4cc] font-semibold">KES {Math.round(totalRevenue).toLocaleString()}</p>
          </div>
          <div className="bg-[#0d1212] p-3 rounded-xl">
            <p className="mono text-[10px] text-[#4a5252]">Crop count</p>
            <p className="text-xl text-[#d8d4cc] font-semibold">{prediction.results.length}</p>
          </div>
        </div>
      </div>

      {prediction.results.map((r) => (
        <div key={r.crop.id} className="bg-[#111414] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#d8d4cc]">{r.crop.emoji} {r.crop.name}</h3>
            <p className="mono text-[11px] text-[#a8c57e]">Confidence {Math.round(r.confidence * 100)}%</p>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[12px] text-[#c8c4bc]">
            <div>Low: {r.low.toLocaleString()} kg</div>
            <div>Mid: {r.mid.toLocaleString()} kg</div>
            <div>High: {r.high.toLocaleString()} kg</div>
          </div>
          <p className="mt-2 text-[11px] text-[#4a5252]">Revenue: KES {Math.round(r.mid * r.marketPrice).toLocaleString()}</p>
          <p className="mt-2 text-[11px] text-[#4a5252]">
            Ideal per-plant space: {CROP_SPACING[r.crop.id]?.description ?? "~0.2m²"} ·
            Approx. crop area share: {perCropArea.toFixed(1)} m² ({perCropPercent.toFixed(1)}% of land) ·
            {Math.max(1, Math.floor(perCropArea / (CROP_SPACING[r.crop.id]?.perPlantM2 ?? 0.2)))} plants
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {r.tips.map((tip, index) => (
              <span key={index} className="text-[10px] px-2 py-1 bg-[#0c1111] border border-white/[0.08] rounded-full">{tip}</span>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-3 flex-wrap">
        <button onClick={onRecalc} className="px-4 py-2 rounded-xl bg-[#a8c57e] text-[#0a0b0b]">New prediction</button>
        <Link href="/" className="px-4 py-2 rounded-xl border border-white/[0.08]">Back to dashboard</Link>
      </div>

      <p className="mono text-[10px] text-[#2e3636]">Estimates are indicative and depend on weather, pests, and management.</p>
    </div>
  );
}

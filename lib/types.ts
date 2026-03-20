export type UploadStatus = "pending" | "uploading" | "done" | "error";

export interface CropImage {
  id: string;
  name: string;
  size: number;
  preview: string;
  url: string;
  status: UploadStatus;
  uploadedAt?: Date;
  report?: DiagnosticReport;
}

export interface DiseaseResult {
  name: string;
  probability: number;
  severity: "low" | "medium" | "high" | "critical";
}

export interface DiagnosticReport {
  cropType: string;
  diseases: DiseaseResult[];
  advice: string[];
  urgency: "monitor" | "treat-soon" | "treat-immediately";
  diagnosedAt: string;
}

export interface LocationData {
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

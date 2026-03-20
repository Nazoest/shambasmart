"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CropImage, LocationData } from "../lib/types";
import { uid, generateMockReport } from "../lib/utils";

interface AppContextType {
  images: CropImage[];
  setImages: React.Dispatch<React.SetStateAction<CropImage[]>>;
  location: LocationData | null;
  locationStatus: "idle" | "requesting" | "granted" | "denied";
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  addFiles: (fileList: FileList | File[]) => void;
  removeImage: (id: string) => void;
  requestLocation: () => Promise<LocationData | null>;
  setLocationStatus: (status: "idle" | "requesting" | "granted" | "denied") => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [images, setImages] = useState<CropImage[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [activeId, setActiveId] = useState<string | null>(null);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    const newImgs: CropImage[] = files.map((f) => ({
      id: uid(),
      name: f.name,
      size: f.size,
      preview: URL.createObjectURL(f),
      url: "",
      status: "uploading",
    }));
    setImages((prev) => [...prev, ...newImgs]);

    setTimeout(() => {
      setImages((prev) =>
        prev.map((img) => {
          if (!newImgs.find((n) => n.id === img.id)) return img;
          return {
            ...img,
            url: img.preview,
            status: "done",
            uploadedAt: new Date(),
            report: generateMockReport(),
          };
        })
      );
    }, 2200);
  }, []);

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img?.preview.startsWith("blob:")) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
    if (activeId === id) setActiveId(null);
  };

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
        village: a.village || a.hamlet || a.locality || a.town || a.city_district || undefined,
        suburb: a.suburb || a.neighbourhood || a.residential || undefined,
        ward: a.ward || undefined,
        subCounty: a.county_district || a.subcounty || a.district || a.municipality || undefined,
        county: a.county || a.state_district || a.state || undefined,
        country: a.country || undefined,
        countryCode: (a.country_code || "").toUpperCase() || undefined,
        postcode: a.postcode || undefined,
        displayName: json.display_name || undefined,
      };
    } catch {
      return { geocoding: "failed" };
    }
  };

  const requestLocation = (): Promise<LocationData | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      setLocationStatus("requesting");
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const base: LocationData = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            capturedAt: new Date(),
            geocoding: "pending",
          };
          setLocation(base);
          setLocationStatus("granted");
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

  return (
    <AppContext.Provider
      value={{
        images,
        setImages,
        location,
        locationStatus,
        activeId,
        setActiveId,
        addFiles,
        removeImage,
        requestLocation,
        setLocationStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { DEFAULT_GEO } from "@/lib/geo";
import type { GeoPoint } from "@/lib/types";

type GeoState = {
  origin: GeoPoint;
  status: "idle" | "locating" | "ready" | "denied";
  request: () => void;
};

const GeoContext = createContext<GeoState>({
  origin: DEFAULT_GEO,
  status: "idle",
  request: () => {},
});

export function GeoProvider({ children }: { children: React.ReactNode }) {
  const [origin, setOrigin] = useState<GeoPoint>(DEFAULT_GEO);
  const [status, setStatus] = useState<GeoState["status"]>("idle");
  const watchRef = useRef<number | null>(null);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("ready");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
    if (watchRef.current == null) {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setStatus("ready");
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 },
      );
    }
  }, []);

  useEffect(() => {
    request();
    return () => {
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [request]);

  return (
    <GeoContext.Provider value={{ origin, status, request }}>{children}</GeoContext.Provider>
  );
}

export function useGeo() {
  return useContext(GeoContext);
}

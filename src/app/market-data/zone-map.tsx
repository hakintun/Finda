"use client";

import { useState } from "react";

/**
 * A schematic map of Port Harcourt market areas.
 * Deliberately not a real tile map: no external map service, no API key, works
 * offline and inside a sandboxed preview (PRD NFR-12). Production swaps in
 * MapLibre GL + OSM tiles behind the same component name.
 */
type Zone = { id: string; name: string; lat: number; lng: number; radiusKm: number; cluster: string };

export function ZoneMap({ zones }: { zones: Zone[] }) {
  const [active, setActive] = useState<string | null>(null);

  // project lat/lng into 0..1 with a little padding
  const lats = zones.map((z) => z.lat);
  const lngs = zones.map((z) => z.lng);
  const minLat = Math.min(...lats) - 0.012;
  const maxLat = Math.max(...lats) + 0.012;
  const minLng = Math.min(...lngs) - 0.012;
  const maxLng = Math.max(...lngs) + 0.012;

  const px = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * 100;
  const py = (lat: number) => (1 - (lat - minLat) / (maxLat - minLat)) * 100;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ position: "relative", height: 380, background: "linear-gradient(160deg,#eef7f1,#dbeadf)" }}>
        {/* rivers (schematic) */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .5 }}>
          <path d="M 62 0 C 58 25, 70 45, 63 70 C 58 88, 66 96, 62 100" stroke="#a9cfe0" strokeWidth="3.4" fill="none" />
          <path d="M 0 78 C 20 74, 32 84, 48 82" stroke="#a9cfe0" strokeWidth="1.6" fill="none" />
        </svg>

        {zones.map((z) => {
          const size = Math.max(70, z.radiusKm * 130);
          const on = active === z.id;
          return (
            <button
              key={z.id}
              onClick={() => setActive(on ? null : z.id)}
              style={{
                position: "absolute",
                left: `${px(z.lng)}%`,
                top: `${py(z.lat)}%`,
                transform: "translate(-50%, -50%)",
                width: size, height: size,
                borderRadius: "50%",
                border: `2px ${on ? "solid" : "dashed"} ${on ? "#0f5c37" : "#7fb79a"}`,
                background: on ? "rgba(15,92,55,.20)" : "rgba(255,255,255,.55)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                padding: 0,
                transition: "all .15s",
              }}
              aria-label={`${z.name} market area`}
            >
              <span style={{
                fontSize: 11.5, fontWeight: 700, color: "#06341f", lineHeight: 1.15,
                textShadow: "0 1px 0 rgba(255,255,255,.8)", pointerEvents: "none",
              }}>
                {z.name}
                <br />
                <span style={{ fontWeight: 500, fontSize: 10, color: "#3f6b56" }}>{(z.radiusKm * 2).toFixed(1)} km across</span>
              </span>
            </button>
          );
        })}

        <div style={{ position: "absolute", left: 12, bottom: 10, fontSize: 11, color: "#3f6b56", fontWeight: 600 }}>
          Schematic — not to scale · tap an area
        </div>
        <div style={{ position: "absolute", right: 12, top: 10, fontSize: 11, color: "#3f6b56", fontWeight: 600 }}>
          Port Harcourt, Rivers State
        </div>
        {active ? (
          <div style={{
            position: "absolute", right: 12, bottom: 12, background: "#fff", borderRadius: 10,
            padding: "9px 12px", fontSize: 12.5, boxShadow: "var(--shadow-lg)", maxWidth: 220,
          }}>
            <strong>{zones.find((z) => z.id === active)?.name}</strong>
            <div className="muted" style={{ fontSize: 11.5 }}>
              {zones.find((z) => z.id === active)?.lat.toFixed(4)}, {zones.find((z) => z.id === active)?.lng.toFixed(4)}
            </div>
            <div className="muted" style={{ fontSize: 11.5 }}>Boundary polygon used for pin checks</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";

/**
 * Surrogate map editor. Real build uses MapLibre + OSM tiles (PRD NFR-12);
 * this keeps the same interaction model with no external tile server, so it
 * works on 3G, in the preview iframe, and offline.
 */
export function LocationEditor({
  zones, initial, action, shops,
}: {
  zones: { id: string; name: string; lat: number; lng: number; radiusKm: number }[];
  initial: { lat: number; lng: number; zone_id: string; landmark_text: string };
  action: (fd: FormData) => void;
  shops?: never[];
}) {
  const [zoneId, setZoneId] = useState(initial.zone_id);
  const [lat, setLat] = useState(initial.lat);
  const [lng, setLng] = useState(initial.lng);
  const [landmark, setLandmark] = useState(initial.landmark_text);
  const [dragging, setDragging] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const zone = zones.find((z) => z.id === zoneId) || zones[0];
  const span = (zone.radiusKm / 110.6) * 2.4;
  const spanLng = span / Math.cos((zone.lat * Math.PI) / 180);
  const x = Math.min(96, Math.max(4, ((lng - (zone.lng - spanLng / 2)) / spanLng) * 100));
  const y = Math.min(96, Math.max(4, (1 - (lat - (zone.lat - span / 2)) / span) * 100));

  const place = (clientX: number, clientY: number) => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = Math.min(0.96, Math.max(0.04, (clientX - r.left) / r.width));
    const py = Math.min(0.96, Math.max(0.04, (clientY - r.top) / r.height));
    setLng(Number((zone.lng - spanLng / 2 + px * spanLng).toFixed(6)));
    setLat(Number((zone.lat + span / 2 - py * span).toFixed(6)));
  };

  return (
    <form action={action} className="card">
      <label className="field mb16">
        <span className="lbl">Market area</span>
        <select name="zone_id" value={zoneId} onChange={(e) => {
          setZoneId(e.target.value);
          const z = zones.find((x) => x.id === e.target.value)!;
          setLat(z.lat); setLng(z.lng);
        }}>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </label>

      <div
        ref={boxRef}
        onPointerDown={(e) => { setDragging(true); place(e.clientX, e.clientY); }}
        onPointerMove={(e) => dragging && place(e.clientX, e.clientY)}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
        style={{
          position: "relative", height: 250, borderRadius: 14, cursor: "crosshair",
          background: "linear-gradient(#eef7f1, #dfeee6)", border: "1px solid #c9dbd1",
          overflow: "hidden", touchAction: "none", userSelect: "none",
        }}
        role="application" aria-label="Drag to move your shop pin"
      >
        <div style={{ position: "absolute", left: 0, right: 0, top: "40%", height: 14, background: "#fff", borderTop: "1px solid #d6ddd6", borderBottom: "1px solid #d6ddd6" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "60%", width: 12, background: "#fff", borderLeft: "1px solid #d6ddd6", borderRight: "1px solid #d6ddd6" }} />
        <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-100%)", fontSize: 30, filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))" }} aria-hidden="true">📍</div>
        <div className="tiny" style={{ position: "absolute", left: 10, bottom: 8, color: "#5c7a6a", fontWeight: 600 }}>{zone.name} — drag the pin</div>
      </div>

      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <div className="tiny muted mt8 mono">{lat.toFixed(5)}, {lng.toFixed(5)}</div>

      <label className="field mt16">
        <span className="lbl">Street landmark (required)</span>
        <input type="text" name="landmark_text" value={landmark} onChange={(e) => setLandmark(e.target.value)}
          placeholder="e.g. Beside First Bank, Aggrey Road, line 4" />
        <span className="hint">Written the way you would tell a customer on the phone.</span>
      </label>

      <button className="btn btn-primary btn-block mt16">Save location</button>
    </form>
  );
}

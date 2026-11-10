/**
 * Pin-in-zone validation — Member 3 · Admin · PRD US-3.1
 * "Given a seller claims a location, the pin must be within the cluster boundary
 *  or the submission is queued for review (prevents pin-dropping into a richer zone)."
 */
import { haversineKm } from "./freshness";

export type Pt = { lat: number; lng: number };

/** Ray-casting point-in-polygon test. Polygon = array of {lat,lng}. */
export function pointInPolygon(point: Pt, polygon: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function polygonCentroid(polygon: Pt[]): Pt {
  const lat = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length;
  const lng = polygon.reduce((s, p) => s + p.lng, 0) / polygon.length;
  return { lat, lng };
}

export type PinCheck =
  | { ok: true; zone_id: string; distance_km: number }
  | { ok: false; reason: "outside_zone"; zone_id: string | null; distance_km: number; nearest_zone_id: string | null };

/**
 * Validate a seller pin against every zone boundary.
 * - inside the claimed zone → pass
 * - inside a *different* zone → flagged (the seller claimed the wrong zone)
 * - outside every zone      → flagged for admin review
 */
export function validatePin(pin: Pt, claimedZoneId: string | null, zones: any[]): PinCheck {
  const claimed = zones.find((z) => z.id === claimedZoneId);
  if (claimed && pointInPolygon(pin, claimed.boundary)) {
    return { ok: true, zone_id: claimed.id, distance_km: 0 };
  }

  // distance to each zone centre — used for the admin flag message
  let nearest: { id: string; km: number } | null = null;
  for (const z of zones) {
    const km = haversineKm(pin, { lat: z.lat, lng: z.lng });
    if (!nearest || km < nearest.km) nearest = { id: z.id, km };
  }

  const insideAny = zones.find((z) => pointInPolygon(pin, z.boundary));

  // Report how far the pin sits from the zone the seller *claims* — that number
  // is what makes sense in the warning ("your pin is 4.8 km from Mile 1").
  const claimedKm = claimed ? haversineKm(pin, { lat: claimed.lat, lng: claimed.lng }) : (nearest?.km ?? 0);

  return {
    ok: false,
    reason: "outside_zone",
    zone_id: insideAny ? insideAny.id : claimedZoneId,
    distance_km: Number(claimedKm.toFixed(2)),
    nearest_zone_id: insideAny?.id ?? nearest?.id ?? null,
  };
}

/** How far a pin sits from the edge of its claimed zone (approx, via centroid). */
export function pinDistanceFromZone(pin: Pt, zone: any): number {
  return Number(haversineKm(pin, { lat: zone.lat, lng: zone.lng }).toFixed(2));
}

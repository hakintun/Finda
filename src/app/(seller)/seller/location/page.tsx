import Link from "next/link";
import { redirect } from "next/navigation";
import { getDB } from "@/lib/db";
import { getSellerSession } from "@/lib/auth";
import { validatePin } from "@/lib/geo";
import { updateLocation } from "../actions";
import { LocationEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function SellerLocation({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await getSellerSession();
  if (!session) redirect("/seller?need=login");
  const db = getDB();
  const seller = session.seller;
  const check = validatePin({ lat: seller.lat, lng: seller.lng }, seller.zone_id, db.zones);

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "6px 0 14px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: "-.03em" }}>Where buyers find you</h1>
          <p className="muted small" style={{ margin: "4px 0 0" }}>Pin + market area + landmark. The landmark matters most.</p>
        </div>
      </div>

      {sp.saved ? <div className="notice notice-ok mb16">✓ Location saved. Buyers see the new landmark straight away.</div> : null}
      {sp.error === "invalid" ? <div className="notice notice-err mb16">Add a pin and a landmark of at least 6 characters.</div> : null}

      {!check.ok ? (
        <div className="notice notice-warn mb16">
          <strong>Your pin is outside {db.zones.find((z: any) => z.id === seller.zone_id)?.name}.</strong>{" "}
          That is {check.distance_km} km from the nearest point of the market area. It is flagged for the team, and
          buyers may rank you lower until it is fixed.
        </div>
      ) : (
        <div className="notice notice-ok mb16">✓ Your pin is inside {db.zones.find((z: any) => z.id === seller.zone_id)?.name}.</div>
      )}

      <LocationEditor
        shops={[]}
        zones={db.zones.map((z: any) => ({ id: z.id, name: z.name, lat: z.lat, lng: z.lng, radiusKm: z.radiusKm }))}
        initial={{ lat: seller.lat, lng: seller.lng, zone_id: seller.zone_id, landmark_text: seller.landmark_text }}
        action={updateLocation}
      />

      <div className="card mt24">
        <h3 className="card-title">What buyers will read</h3>
        <div className="mt8 small">
          <div className="stat-line"><span className="muted">Market area</span><span className="v">{db.zones.find((z: any) => z.id === seller.zone_id)?.name}</span></div>
          <div className="stat-line"><span className="muted">Landmark</span><span className="v" style={{ textAlign: "right", maxWidth: "62%" }}>{seller.landmark_text}</span></div>
          <div className="stat-line"><span className="muted">Ask for</span><span className="v">{seller.owner_name || seller.business_name}</span></div>
          <div className="stat-line"><span className="muted">Pin</span><span className="v mono tiny">{seller.lat?.toFixed(5)}, {seller.lng?.toFixed(5)}</span></div>
        </div>
        <p className="tiny muted mt8 mb0">
          On the buyer&apos;s “Get there” page the landmark appears first, the pin second, plus a one-tap Open in Google Maps link.
        </p>
        <Link className="btn btn-sm mt16" href={`/s/${seller.slug}/map`}>See the buyer view</Link>
      </div>
    </>
  );
}

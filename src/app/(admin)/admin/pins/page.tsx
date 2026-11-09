import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { resolvePinFlag, runPinAudit } from "../actions";
import { freshnessLabel } from "@/lib/freshness";
import { pointInPolygon } from "@/lib/geo";
import { Empty, TierBadge } from "@/lib/member3-ui";

export const dynamic = "force-dynamic";

/** US-3.1 pin validation + Task 1 market boundaries. */
export default async function PinsPage({ searchParams }: { searchParams: Promise<{ audit?: string; tab?: string }> }) {
  const sp = await searchParams;
  const session = await getAdminSession();
  if (!session) redirect("/admin?need=login");
  const db = getDB();
  const tab = sp.tab || "open";

  const all = db.pin_flags || [];
  const rows = all.filter((p: any) => (tab === "open" ? p.state === "open" : p.state !== "open"));

  // live audit across all shops
  const audit = db.sellers.map((s: any) => {
    const zone = db.zones.find((z: any) => z.id === s.zone_id);
    const inside = zone ? pointInPolygon({ lat: s.lat, lng: s.lng }, zone.boundary) : false;
    return { seller: s, zone, inside };
  });
  const outside = audit.filter((a: any) => !a.inside);

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "0 0 14px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Pin checks</h2>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            A seller must sit inside the market boundary they claim — this stops pin-dropping into richer zones.
          </p>
        </div>
        <form action={runPinAudit}><button className="btn btn-primary btn-sm">Run a boundary audit</button></form>
      </div>

      {sp.audit ? (
        <div className="notice notice-ok mb16">
          Audit finished — {outside.length} shop{outside.length === 1 ? "" : "s"} currently sit outside their boundary.
          New flags were added where none existed.
        </div>
      ) : null}

      <div className="grid grid-3 mb16">
        <div className="kpi"><div className="n">{db.sellers.length}</div><div className="l">Shops checked</div></div>
        <div className="kpi"><div className="n" style={{ color: outside.length ? "var(--amber)" : "var(--green-700)" }}>{outside.length}</div><div className="l">Outside boundary (live audit)</div></div>
        <div className="kpi"><div className="n">{all.filter((p: any) => p.state === "open").length}</div><div className="l">Open flags to clear</div></div>
      </div>

      <div className="pill-tabs mb16">
        <Link href="/admin/pins" className={tab === "open" ? "on" : ""}>Open <span className="count">{all.filter((p: any) => p.state === "open").length}</span></Link>
        <Link href="/admin/pins?tab=done" className={tab === "done" ? "on" : ""}>Resolved</Link>
      </div>

      {rows.length === 0 ? (
        <Empty icon="📍" title="No pin flags">Every shop sits inside the market area it claims.</Empty>
      ) : (
        <div className="stack">
          {rows.map((f: any) => {
            const seller = db.sellers.find((s: any) => s.id === f.seller_id);
            const zone = db.zones.find((z: any) => z.id === f.claimed_zone);
            return (
              <div className="card" key={f.id}>
                <div className="row-between wrapflex">
                  <div>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <span className="b">{seller?.business_name || "Unknown"}</span>
                      <TierBadge tier={seller?.verification_tier || "unverified"} />
                      <span className="badge badge-low">{f.distance_km} km outside</span>
                    </div>
                    <div className="tiny muted" style={{ marginTop: 4 }}>
                      Claims <strong>{zone?.name || f.claimed_zone}</strong> · pin {f.lat?.toFixed(5)}, {f.lng?.toFixed(5)} · flagged {freshnessLabel(f.created_at)}
                    </div>
                    <p className="small" style={{ margin: "8px 0 0" }}>{f.note}</p>
                  </div>
                  {seller ? (
                    <Link className="btn btn-sm" href={`/admin/sellers/${seller.id}`}>Open shop</Link>
                  ) : null}
                </div>

                {f.state === "open" ? (
                  <div className="btn-row mt16">
                    <form action={resolvePinFlag}>
                      <input type="hidden" name="flag_id" value={f.id} />
                      <input type="hidden" name="decision" value="move_to_zone" />
                      <button className="btn btn-primary btn-sm">Snap pin into {zone?.name}</button>
                    </form>
                    <form action={resolvePinFlag}>
                      <input type="hidden" name="flag_id" value={f.id} />
                      <input type="hidden" name="decision" value="keep" />
                      <button className="btn btn-sm">Seller is right — keep the pin</button>
                    </form>
                    <form action={resolvePinFlag}>
                      <input type="hidden" name="flag_id" value={f.id} />
                      <input type="hidden" name="decision" value="dismiss" />
                      <button className="btn btn-sm">Dismiss</button>
                    </form>
                  </div>
                ) : (
                  <div className="small mt16">
                    <span className="badge badge-neutral">{f.state}</span>
                    {f.resolution ? <span className="muted"> · {f.resolution.replace(/_/g, " ")}</span> : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="section-h"><h2>Market boundaries in use</h2><p>Used by the seller sign-up and the audit</p></div>
      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Market area</th><th>Cluster</th><th>Centre</th><th>Boundary</th><th>Shops inside</th></tr></thead>
            <tbody>
              {db.zones.map((z: any) => {
                const inside = db.sellers.filter((s: any) => s.zone_id === z.id && pointInPolygon({ lat: s.lat, lng: s.lng }, z.boundary)).length;
                return (
                  <tr key={z.id}>
                    <td className="b">{z.name}</td>
                    <td className="muted small">{z.cluster}</td>
                    <td className="mono tiny">{z.lat.toFixed(4)}, {z.lng.toFixed(4)}</td>
                    <td className="mono tiny">{z.boundary.length}-point polygon</td>
                    <td>{inside}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

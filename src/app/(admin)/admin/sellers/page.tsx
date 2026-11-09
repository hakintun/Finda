import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { freshnessLabel, freshnessState } from "@/lib/freshness";
import { TierBadge } from "@/lib/member3-ui";

export const dynamic = "force-dynamic";

export default async function SellersPage({ searchParams }: { searchParams: Promise<{ q?: string; created?: string; zone?: string }> }) {
  const sp = await searchParams;
  const session = await getAdminSession();
  if (!session) redirect("/admin?need=login");
  const db = getDB();
  const now = Date.now();

  const q = (sp.q || "").toLowerCase();
  const zoneFilter = sp.zone || "";

  const rows = db.sellers
    .filter((s: any) => (!zoneFilter || s.zone_id === zoneFilter))
    .filter((s: any) => !q || s.business_name.toLowerCase().includes(q) || (s.landmark_text || "").toLowerCase().includes(q))
    .map((s: any) => {
      const items = db.listings.filter((l: any) => l.seller_id === s.id && l.status !== "delisted");
      const fresh = items.filter((l: any) => freshnessState(l.confirmed_at, now) === "fresh").length;
      const newest = items.map((l: any) => new Date(l.confirmed_at || 0).getTime()).sort((a: any, b: any) => b - a)[0];
      return { seller: s, items: items.length, fresh, newest };
    })
    .sort((a: any, b: any) => a.fresh / (a.items || 1) - b.fresh / (b.items || 1));

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "0 0 14px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Sellers</h2>
          <p className="muted small" style={{ margin: "4px 0 0" }}>{db.sellers.length} shops · sorted by weakest freshness first</p>
        </div>
        <Link className="btn btn-primary btn-sm" href="/admin/add-shop">+ Add a shop for a trader</Link>
      </div>

      {sp.created ? <div className="notice notice-ok mb16">✓ Shop created on behalf of the trader. It is live and attributed to the field agent.</div> : null}

      <form className="card mb16" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label className="field grow">
          <span className="lbl tiny">Search</span>
          <input type="text" name="q" defaultValue={sp.q || ""} placeholder="Shop name or landmark" />
        </label>
        <label className="field" style={{ minWidth: 200 }}>
          <span className="lbl tiny">Market area</span>
          <select name="zone" defaultValue={zoneFilter}>
            <option value="">All areas</option>
            {db.zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </label>
        <button className="btn">Filter</button>
      </form>

      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Shop</th><th>Market</th><th>Tier</th><th>Items</th><th>Fresh</th><th>Last confirmed</th><th>Source</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ seller, items, fresh, newest }: any) => (
                <tr key={seller.id}>
                  <td>
                    <div className="b">{seller.business_name}</div>
                    <div className="tiny muted">{seller.landmark_text}</div>
                  </td>
                  <td className="muted small">{db.zones.find((z: any) => z.id === seller.zone_id)?.name}</td>
                  <td><TierBadge tier={seller.verification_tier} /></td>
                  <td>{items}</td>
                  <td>
                    <span className={`badge ${fresh === items && items > 0 ? "badge-in" : fresh > 0 ? "badge-low" : "badge-out"}`}>
                      {fresh}/{items}
                    </span>
                  </td>
                  <td className="tiny muted">{newest ? freshnessLabel(new Date(newest).toISOString()) : "never"}</td>
                  <td className="tiny muted">{seller.created_via === "field_agent" ? "field agent" : "self sign-up"}</td>
                  <td><Link className="btn btn-sm" href={`/admin/sellers/${seller.id}`}>Open</Link></td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={8} className="muted">No shops match that filter.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

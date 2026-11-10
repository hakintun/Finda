import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { impersonate, toggleListingStatus, toggleSellerStatus } from "../../actions";
import { freshnessLabel, freshnessState, formatNaira } from "@/lib/freshness";
import { Price, StockBadge, TierBadge } from "@/lib/member3-ui";
import { validatePin } from "@/lib/geo";

export const dynamic = "force-dynamic";

export default async function SellerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) redirect("/admin?need=login");
  const db = getDB();
  const seller = db.sellers.find((s: any) => s.id === id);
  if (!seller) notFound();

  const zone = db.zones.find((z: any) => z.id === seller.zone_id);
  const items = db.listings.filter((l: any) => l.seller_id === seller.id);
  const live = items.filter((l: any) => l.status !== "delisted");
  const pin = validatePin({ lat: seller.lat, lng: seller.lng }, seller.zone_id, db.zones);
  const verifications = db.verification_requests.filter((v: any) => v.seller_id === seller.id);
  const reports = db.reports.filter((r: any) => items.some((l: any) => l.id === r.listing_id));
  const now = Date.now();

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "0 0 14px" }}>
        <div>
          <Link className="small" href="/admin/sellers">← All sellers</Link>
          <h2 style={{ margin: "6px 0 0", fontSize: 20 }}>{seller.business_name}</h2>
          <div className="tiny muted">{zone?.name} · {seller.landmark_text}</div>
        </div>
        <div className="row wrapflex" style={{ gap: 8 }}>
          <span className={`badge ${seller.status === "active" ? "badge-in" : "badge-out"}`}>
            {seller.status || "active"}
          </span>
          <TierBadge tier={seller.verification_tier} />
          <Link className="btn btn-sm" href={`/s/${seller.slug}`}>Buyer view</Link>
          <form action={toggleSellerStatus}>
            <input type="hidden" name="seller_id" value={seller.id} />
            <button className={`btn btn-sm ${seller.status === "active" ? "btn-danger" : "btn-primary"}`}>
              {seller.status === "active" ? "Delist customer" : "Restore customer"}
            </button>
          </form>
          <form action={impersonate}>
            <input type="hidden" name="shop_id" value={seller.id} />
            <button className="btn btn-sm btn-primary">Work on this shop as seller</button>
          </form>
        </div>
      </div>

      <div className="grid grid-4">
        <div className="kpi"><div className="n">{live.length}</div><div className="l">Live items</div></div>
        <div className="kpi"><div className="n">{Math.round((seller.accuracy_score || 0) * 100)}%</div><div className="l">Accuracy score</div></div>
        <div className="kpi"><div className="n">{Math.round((seller.response_rate || 0) * 100)}%</div><div className="l">Response rate</div></div>
        <div className="kpi"><div className="n" style={{ color: pin.ok ? "var(--green-700)" : "var(--amber)" }}>{pin.ok ? "Inside" : `${!pin.ok ? pin.distance_km : 0} km out`}</div><div className="l">Pin vs boundary</div></div>
      </div>

      <div className="grid grid-2 mt24">
        <div className="card">
          <h3 className="card-title">Contact &amp; identity</h3>
          <div className="mt8 small">
            <div className="stat-line"><span className="muted">Owner</span><span className="v">{seller.owner_name}</span></div>
            <div className="stat-line"><span className="muted">Phone</span><span className="v mono">{seller.phone || "—"}</span></div>
            <div className="stat-line"><span className="muted">WhatsApp</span><span className="v mono">{seller.whatsapp_number || "—"}</span></div>
            <div className="stat-line"><span className="muted">Type</span><span className="v">{seller.seller_type}</span></div>
            <div className="stat-line"><span className="muted">Main category</span><span className="v">{seller.primary_category}</span></div>
            <div className="stat-line"><span className="muted">Joined</span><span className="v">{freshnessLabel(seller.created_at)}</span></div>
            <div className="stat-line"><span className="muted">Last nudge/tap</span><span className="v">{seller.last_nudge_at ? freshnessLabel(seller.last_nudge_at) : "never"}</span></div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Verification history</h3>
          {verifications.length === 0 ? <p className="small muted">No requests yet.</p> : (
            <div className="mt8">
              {verifications.map((v: any) => (
                <div className="stat-line" key={v.id}>
                  <span className="small">{v.tier_requested} · {freshnessLabel(v.created_at)}</span>
                  <span className={`badge ${v.state === "approved" ? "badge-in" : v.state === "rejected" ? "badge-out" : "badge-low"}`}>{v.state}</span>
                </div>
              ))}
            </div>
          )}
          <h3 className="card-title mt24">Reports against this shop</h3>
          {reports.length === 0 ? <p className="small muted">Clean record.</p> : (
            <div className="mt8">
              {reports.map((r: any) => (
                <div className="stat-line" key={r.id}>
                  <span className="small">{r.reason.replace(/_/g, " ")} · {freshnessLabel(r.created_at)}</span>
                  <span className="badge badge-neutral">{r.state}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="section-h"><h2>Their items</h2><p>{live.length} live · {items.length - live.length} delisted</p></div>
      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Item</th><th>Price</th><th>Stock</th><th>Confirmed</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map((l: any) => (
                <tr key={l.id}>
                  <td className="b">{l.title_as_listed}</td>
                  <td><Price kobo={l.price_kobo} /></td>
                  <td><StockBadge status={l.stock_status} /></td>
                  <td className="tiny muted">{freshnessLabel(l.confirmed_at)}</td>
                  <td>
                    <span className={`badge badge-${freshnessState(l.confirmed_at, now) === "fresh" ? "fresh" : "unknown"}`}>{l.status}</span>
                  </td>
                  <td>
                    <form action={toggleListingStatus}>
                      <input type="hidden" name="listing_id" value={l.id} />
                      <button className="btn btn-sm btn-ghost">{l.status === "delisted" ? "Re-list" : "Delist"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

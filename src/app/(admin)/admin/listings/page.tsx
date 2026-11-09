import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { toggleListingStatus } from "../actions";
import { freshnessLabel, freshnessState, formatNaira } from "@/lib/freshness";
import { Price, StockBadge } from "@/lib/member3-ui";

export const dynamic = "force-dynamic";

export default async function AdminListings({ searchParams }: { searchParams: Promise<{ state?: string; q?: string }> }) {
  const sp = await searchParams;
  const session = await getAdminSession();
  if (!session) redirect("/admin?need=login");
  const db = getDB();
  const now = Date.now();

  const q = (sp.q || "").toLowerCase();
  const stateFilter = sp.state || "all";

  const rows = db.listings
    .filter((l: any) => !q || l.title_as_listed.toLowerCase().includes(q))
    .filter((l: any) => {
      if (stateFilter === "all") return true;
      if (stateFilter === "delisted") return l.status === "delisted";
      return l.status !== "delisted" && freshnessState(l.confirmed_at, now) === stateFilter;
    })
    .map((l: any) => ({ listing: l, seller: db.sellers.find((s: any) => s.id === l.seller_id) }))
    .sort((a: any, b: any) => new Date(b.listing.confirmed_at || 0).getTime() - new Date(a.listing.confirmed_at || 0).getTime())
    .slice(0, 200);

  const counts = {
    all: db.listings.length,
    fresh: db.listings.filter((l: any) => l.status !== "delisted" && freshnessState(l.confirmed_at, now) === "fresh").length,
    aging: db.listings.filter((l: any) => l.status !== "delisted" && freshnessState(l.confirmed_at, now) === "aging").length,
    stale: db.listings.filter((l: any) => l.status !== "delisted" && freshnessState(l.confirmed_at, now) === "stale").length,
    expired: db.listings.filter((l: any) => l.status !== "delisted" && freshnessState(l.confirmed_at, now) === "expired").length,
    delisted: db.listings.filter((l: any) => l.status === "delisted").length,
  };

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "0 0 14px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>All listings</h2>
          <p className="muted small" style={{ margin: "4px 0 0" }}>{counts.all} listings · moderation view</p>
        </div>
        <Link className="btn btn-sm" href="/admin/moderation">Banned categories →</Link>
      </div>

      <div className="pill-tabs mb16">
        {(["all", "fresh", "aging", "stale", "expired", "delisted"] as const).map((s) => (
          <Link key={s} href={`/admin/listings?state=${s}`} className={stateFilter === s ? "on" : ""}>
            {s[0].toUpperCase() + s.slice(1)} <span className="count">{(counts as any)[s]}</span>
          </Link>
        ))}
      </div>

      <form className="card mb16" style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <label className="field grow">
          <span className="lbl tiny">Search items</span>
          <input type="text" name="q" defaultValue={sp.q || ""} placeholder="e.g. generator" />
        </label>
        <input type="hidden" name="state" value={stateFilter} />
        <button className="btn">Search</button>
      </form>

      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Item</th><th>Shop</th><th>Price</th><th>Stock</th><th>Confirmed</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map(({ listing: l, seller }: any) => (
                <tr key={l.id}>
                  <td className="b">{l.title_as_listed}<div className="tiny muted">{l.category}</div></td>
                  <td className="muted small">{seller?.business_name || "—"}</td>
                  <td><Price kobo={l.price_kobo} negotiable={l.price_negotiable} /></td>
                  <td><StockBadge status={l.stock_status} /></td>
                  <td className="tiny muted">{freshnessLabel(l.confirmed_at)}</td>
                  <td><span className={`badge ${l.status === "delisted" ? "badge-out" : "badge-neutral"}`}>{l.status}</span></td>
                  <td>
                    <form action={toggleListingStatus}>
                      <input type="hidden" name="listing_id" value={l.id} />
                      <button className="btn btn-sm btn-ghost">{l.status === "delisted" ? "Re-list" : "Delist"}</button>
                    </form>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={7} className="muted">Nothing matches.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      <p className="tiny muted mt8">{rows.length} shown (capped at 200).</p>
    </>
  );
}

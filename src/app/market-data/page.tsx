import Link from "next/link";
import { getDB } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { dictionaryByCategory } from "@/lib/products";
import { formatNaira, freshnessLabel, freshnessState } from "@/lib/freshness";
import { Kpi } from "@/lib/member3-ui";
import { ZoneMap } from "./zone-map";

export const dynamic = "force-dynamic";

/**
 * Member 3 · Task 1 — Map Port Harcourt markets & load starter products.
 * This screen is the single source of truth for the market dataset.
 */
export default async function MarketData({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const sp = await searchParams;
  const adminSession = await getAdminSession();
  const db = getDB();
  const now = Date.now();

  const dict = dictionaryByCategory(db.products);
  const activeCat = sp.cat || dict[0]?.category;
  const catItems = dict.find((d) => d.category === activeCat)?.items || [];

  const activeSellers = db.sellers.filter((s: any) => s.status === "active");
  const zoneRows = db.zones.map((z: any) => {
    const shops = activeSellers.filter((s: any) => s.zone_id === z.id);
    const listings = db.listings.filter((l: any) => shops.some((s: any) => s.id === l.seller_id) && l.status !== "delisted");
    const fresh = listings.filter((l: any) => freshnessState(l.confirmed_at, now) === "fresh").length;
    return { zone: z, shops: shops.length, listings: listings.length, fresh, pct: listings.length ? Math.round((fresh / listings.length) * 100) : 0 };
  });

  const syn = db.synonyms || [];

  return (
    <main className="wrap wide">
      <div className="row-between wrapflex" style={{ margin: "22px 0 14px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, letterSpacing: "-.03em" }}>Port Harcourt market data</h1>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            Market areas, the product dictionary, search synonyms and active verified shops.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link className="btn btn-sm" href="/">← Marketplace</Link>
          {adminSession ? (
            <>
              <Link className="btn btn-sm" href="/admin/add-shop">Add a shop</Link>
              <Link className="btn btn-sm" href="/api/export">Export JSON</Link>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-4">
        <Kpi n={db.zones.length} label="Market areas mapped" detail="Mile 1 → Choba" />
        <Kpi n={activeSellers.length} label="Active shops live" detail="verified supply" />
        <Kpi n={db.products.length} label="Products in the dictionary" detail="canonical names + aliases" />
        <Kpi n={syn.length} label="Search synonyms" detail="Pidgin, slang, misspellings" />
      </div>

      {/* ------------------------------------------------ zones */}
      <div className="section-h"><h2>Market areas &amp; boundaries</h2><p>Each area has a polygon so we can check seller pins</p></div>
      <ZoneMap zones={db.zones.map((z: any) => ({ id: z.id, name: z.name, lat: z.lat, lng: z.lng, radiusKm: z.radiusKm, cluster: z.cluster }))} />

      <div className="card card-pad0 mt16">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Market area</th><th>Cluster</th><th>Shops</th><th>Listings</th><th>Fresh</th><th>Sample landmarks in use</th></tr></thead>
            <tbody>
              {zoneRows.map(({ zone, shops, listings, fresh, pct }: any) => (
                <tr key={zone.id}>
                  <td className="b">{zone.name}</td>
                  <td className="muted small">{zone.cluster}</td>
                  <td>{shops}</td>
                  <td>{listings}</td>
                  <td><span className={`badge ${pct >= 70 ? "badge-in" : pct >= 50 ? "badge-low" : "badge-out"}`}>{pct}%</span></td>
                  <td className="tiny muted">{(zone.landmarks || []).slice(0, 2).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------ dictionary */}
      <div className="section-h"><h2>The product dictionary</h2><p>Sellers pick from these names so search stays clean</p></div>

      <div className="row wrapflex" style={{ gap: 6, marginBottom: 12 }}>
        {dict.map((d) => (
          <Link key={d.category} href={`/market-data?cat=${encodeURIComponent(d.category)}`}
            className={`btn btn-sm ${d.category === activeCat ? "btn-primary" : ""}`}>
            {d.category} <span className="tiny" style={{ opacity: .7 }}>{d.items.length}</span>
          </Link>
        ))}
      </div>

      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Canonical name</th><th>Typical price</th><th>Unit</th><th>Aliases that map here</th></tr></thead>
            <tbody>
              {catItems.map((p: any) => (
                <tr key={p.id}>
                  <td className="b">{p.canonical_name}</td>
                  <td>{formatNaira(p.typical_price_kobo)}</td>
                  <td className="muted small">{p.unit}</td>
                  <td className="tiny muted">{(p.aliases || []).slice(0, 6).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="tiny muted mt8">
        Before launch the dictionary needs ~2,000 Port Harcourt items (PRD US-2.1). {db.products.length} are loaded here.
        Add to it by editing <code>scripts/build-seed.mjs</code> and running <code>node scripts/build-seed.mjs</code>.
      </p>

      {/* ------------------------------------------------ synonyms */}
      <div className="section-h"><h2>Search words (Pidgin &amp; misspellings)</h2><p>{syn.length} entries · owned jointly with Member 1</p></div>
      <div className="card">
        <div className="row wrapflex" style={{ gap: 6 }}>
          {syn.slice(0, 60).map((s: any, i: number) => {
            const p = db.products.find((x: any) => x.id === s.maps_to);
            return (
              <span key={`${s.term}-${i}`} className="badge badge-neutral" title={`→ ${p?.canonical_name || s.maps_to}`}>
                <span className="mono">{s.term}</span>
                <span className="tiny muted">→ {p?.canonical_name?.split(" ").slice(0, 2).join(" ")}</span>
              </span>
            );
          })}
        </div>
        <p className="tiny muted mt8 mb0">
          Showing 60 of {syn.length}. Examples that matter in Port Harcourt: <em>gen</em>, <em>I better pass my neighbour</em>,
          <em> indomine</em>, <em>simiti</em>, <em>taya</em>, <em>frij</em>, <em>bubble</em>.
        </p>
      </div>

      {/* ------------------------------------------------ shops */}
      <div className="section-h"><h2>Active verified shops</h2><p>Live stalls and shops across all six Port Harcourt areas</p></div>
      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Shop</th><th>Market</th><th>Category</th><th>Items</th><th>Tier</th></tr></thead>
            <tbody>
              {activeSellers.map((s: any) => {
                const n = db.listings.filter((l: any) => l.seller_id === s.id && l.status !== "delisted").length;
                return (
                  <tr key={s.id}>
                    <td className="b"><Link prefetch={false} href={`/s/${s.slug}`}>{s.business_name}</Link></td>
                    <td className="muted small">{db.zones.find((z: any) => z.id === s.zone_id)?.name}</td>
                    <td className="muted small">{s.primary_category}</td>
                    <td>{n}</td>
                    <td className="tiny muted">{s.verification_tier}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

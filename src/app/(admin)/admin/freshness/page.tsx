import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { freshnessLabel, freshnessState } from "@/lib/freshness";
import { Empty, Kpi } from "@/lib/member3-ui";

export const dynamic = "force-dynamic";

/** US-6.3 — the Freshness Dashboard. This is Member 3's daily cockpit. */
export default async function FreshnessDashboard() {
  const session = await getAdminSession();
  if (!session) redirect("/admin?need=login");
  const db = getDB();
  const now = Date.now();

  const live = db.listings.filter((l: any) => l.status !== "delisted");
  const byState = (s: string) => live.filter((l: any) => freshnessState(l.confirmed_at, now) === s).length;
  const freshPct = live.length ? Math.round((byState("fresh") / live.length) * 100) : 0;

  /* per-zone freshness */
  const zoneRows = db.zones.map((z: any) => {
    const items = live.filter((l: any) => {
      const s = db.sellers.find((x: any) => x.id === l.seller_id);
      return s?.zone_id === z.id;
    });
    const fresh = items.filter((l: any) => freshnessState(l.confirmed_at, now) === "fresh").length;
    const stale = items.filter((l: any) => ["stale", "expired"].includes(freshnessState(l.confirmed_at, now))).length;
    const pct = items.length ? Math.round((fresh / items.length) * 100) : 0;
    return { zone: z, total: items.length, fresh, stale, pct };
  }).sort((a: any, b: any) => a.pct - b.pct);

  /* per-category freshness */
  const cats = [...new Set(db.products.map((p: any) => p.category))];
  const catRows = cats.map((c: any) => {
    const items = live.filter((l: any) => l.category === c);
    const fresh = items.filter((l: any) => freshnessState(l.confirmed_at, now) === "fresh").length;
    return { cat: c, total: items.length, fresh, pct: items.length ? Math.round((fresh / items.length) * 100) : 0 };
  }).filter((r: any) => r.total > 0).sort((a: any, b: any) => a.pct - b.pct);

  /* zero-result searches grouped */
  const zero = db.search_queries.filter((q: any) => q.result_count === 0);
  const zeroByQuery = Object.entries(
    zero.reduce((acc: Record<string, { n: number; clusters: Set<string>; last: string }>, q: any) => {
      if (!acc[q.raw_query]) acc[q.raw_query] = { n: 0, clusters: new Set(), last: q.created_at };
      acc[q.raw_query].n++;
      acc[q.raw_query].clusters.add(q.cluster);
      if (new Date(q.created_at) > new Date(acc[q.raw_query].last)) acc[q.raw_query].last = q.created_at;
      return acc;
    }, {})
  ).sort((a: any, b: any) => b[1].n - a[1].n);

  /* the worst offenders: shops whose items are mostly stale */
  const shopHealth = db.sellers.map((s: any) => {
    const items = live.filter((l: any) => l.seller_id === s.id);
    const stale = items.filter((l: any) => ["stale", "expired"].includes(freshnessState(l.confirmed_at, now))).length;
    const newest = items.map((l: any) => new Date(l.confirmed_at || 0).getTime()).sort((a: any, b: any) => b - a)[0];
    return { seller: s, total: items.length, stale, pct: items.length ? Math.round(((items.length - stale) / items.length) * 100) : 100, newest };
  }).filter((x: any) => x.total > 0).sort((a: any, b: any) => a.pct - b.pct).slice(0, 8);

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "0 0 14px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Freshness dashboard</h2>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            The one number that keeps buyers trusting Finda. Target at launch: <strong>≥70% fresh</strong>.
          </p>
        </div>
        <Link className="btn btn-sm" href="/admin">← Overview</Link>
      </div>

      <div className="grid grid-4">
        <Kpi n={`${freshPct}%`} label="Listings fresh (<48h)" tone={freshPct >= 70 ? "good" : freshPct >= 50 ? "warn" : "bad"} detail={`${byState("fresh")} of ${live.length}`} />
        <Kpi n={byState("aging")} label="Aging (3–7 days)" tone="warn" detail="shown with a caveat" />
        <Kpi n={byState("stale")} label="Stale (7–14 days)" tone="bad" detail="demoted in results" />
        <Kpi n={byState("expired")} label="Hidden (>14 days)" tone="bad" detail="excluded from search" />
      </div>

      <div className="section-h"><h2>Freshness by market</h2><p>Which cluster needs a nudge today</p></div>
      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Market area</th><th>Listings</th><th>Fresh</th><th>Stale / hidden</th><th style={{ width: 220 }}>Freshness</th></tr></thead>
            <tbody>
              {zoneRows.map((r: any) => (
                <tr key={r.zone.id}>
                  <td className="b">{r.zone.name}</td>
                  <td>{r.total}</td>
                  <td>{r.fresh}</td>
                  <td>{r.stale}</td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <div className="progress grow"><span style={{ width: `${r.pct}%`, background: r.pct >= 70 ? "var(--green-600)" : r.pct >= 50 ? "#f79009" : "var(--red)" }} /></div>
                      <span className="tiny b" style={{ width: 34, textAlign: "right" }}>{r.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-2 mt24">
        <div>
          <div className="section-h" style={{ marginTop: 0 }}><h2>Searches that found nothing</h2><p>What buyers wanted and we did not have</p></div>
          {zeroByQuery.length === 0 ? (
            <Empty icon="🔎" title="No zero-result searches">Every search returned something.</Empty>
          ) : (
            <div className="card card-pad0">
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead><tr><th>Search</th><th>Times</th><th>Markets</th><th>When</th></tr></thead>
                  <tbody>
                    {zeroByQuery.map(([q, v]: any) => (
                      <tr key={q}>
                        <td className="mono small b">{q}</td>
                        <td>{v.n}</td>
                        <td className="tiny muted">{[...v.clusters].join(", ")}</td>
                        <td className="tiny muted">{freshnessLabel(v.last)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <p className="tiny muted mt8">
            Every one of these is a supply lead: either a seller to onboard, or a word to add to the synonym list.
          </p>
        </div>

        <div>
          <div className="section-h" style={{ marginTop: 0 }}><h2>Freshness by category</h2><p>Where prices go out of date fastest</p></div>
          <div className="card">
            {catRows.map((r) => (
              <div className="stat-line" key={r.cat}>
                <span className="small">{r.cat}</span>
                <span className="row" style={{ gap: 10 }}>
                  <span className="tiny muted">{r.fresh}/{r.total}</span>
                  <span className={`badge ${r.pct >= 70 ? "badge-in" : r.pct >= 50 ? "badge-low" : "badge-out"}`}>{r.pct}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-h"><h2>Shops to call today</h2><p>Lowest freshness first — a WhatsApp voice note fixes most of these</p></div>
      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Shop</th><th>Market</th><th>Items fresh</th><th>Last confirmed</th><th>Action</th></tr></thead>
            <tbody>
              {shopHealth.map((r: any) => (
                <tr key={r.seller.id}>
                  <td className="b">{r.seller.business_name}</td>
                  <td className="muted small">{db.zones.find((z: any) => z.id === r.seller.zone_id)?.name}</td>
                  <td>
                    <span className={`badge ${r.pct >= 70 ? "badge-in" : r.pct >= 50 ? "badge-low" : "badge-out"}`}>
                      {r.total - r.stale}/{r.total} ({r.pct}%)
                    </span>
                  </td>
                  <td className="muted small">{r.newest ? freshnessLabel(new Date(r.newest).toISOString()) : "never"}</td>
                  <td>
                    <Link className="btn btn-sm" href={`/admin/sellers/${r.seller.id}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-h"><h2>Demand posts</h2><p>“Tell sellers what you need” — supply acquisition leads</p></div>
      <div className="card">
        {(db.demand_posts || []).map((d: any) => (
          <div className="stat-line" key={d.id}>
            <span className="small">“{d.raw_text}”</span>
            <span className="row" style={{ gap: 8 }}>
              <span className="badge badge-neutral">{d.cluster}</span>
              <span className="tiny muted">{freshnessLabel(d.created_at)}</span>
            </span>
          </div>
        ))}
        {(db.demand_posts || []).length === 0 ? <p className="small muted mb0">No demand posts yet.</p> : null}
      </div>
    </>
  );
}

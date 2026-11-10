import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { login, logout } from "./actions";
import { freshnessState, freshnessLabel } from "@/lib/freshness";
import { Kpi } from "@/lib/member3-ui";

export const dynamic = "force-dynamic";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ error?: string; need?: string }> }) {
  const sp = await searchParams;
  const session = await getAdminSession();

  /* -------------------------------------------------- login gate */
  if (!session) {
    return (
      <>
        {sp.error ? <div className="notice notice-err mb16">{sp.error}</div> : null}
        {sp.need ? <div className="notice notice-warn mb16">Sign in to open the admin tools.</div> : null}
        <div className="card narrow" style={{ maxWidth: 460 }}>
          <h2 className="card-title">Staff authentication</h2>
          <p className="small muted">
            Marketplace administration is restricted to authorized Finda operations staff.
          </p>
          <form action={login} className="stack mt16">
            <label className="field">
              <span className="lbl">Staff passcode</span>
              <input type="password" name="code" placeholder="Enter staff passcode" autoComplete="current-password" autoFocus />
            </label>
            <button className="btn btn-primary btn-block">Sign in to Admin</button>
          </form>
        </div>
      </>
    );
  }

  /* -------------------------------------------------- dashboard */
  const db = getDB();
  const now = Date.now();
  const active = db.listings.filter((l: any) => l.status !== "delisted");
  const fresh = active.filter((l: any) => freshnessState(l.confirmed_at, now) === "fresh").length;
  const freshPct = active.length ? Math.round((fresh / active.length) * 100) : 0;

  const verified = db.sellers.filter((s: any) => s.verification_tier === "id" || s.verification_tier === "visit").length;
  const pendingVer = db.verification_requests.filter((v: any) => v.state === "pending").length;
  const openReports = db.reports.filter((r: any) => r.state === "open").length;
  const openPins = db.pin_flags.filter((p: any) => p.state === "open").length;

  const zeroResults = db.search_queries.filter((q: any) => q.result_count === 0);
  const missingCounts: Record<string, number> = {};
  for (const q of zeroResults) {
    missingCounts[q.raw_query] = (missingCounts[q.raw_query] || 0) + 1;
  }
  const topMissing: Array<[string, number]> = Object.entries(missingCounts)
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .slice(0, 6);

  const staleSellers = [...db.sellers]
    .map((s: any) => {
      const items = db.listings.filter((l: any) => l.seller_id === s.id && l.status !== "delisted");
      const stale = items.filter((l: any) => ["stale", "expired"].includes(freshnessState(l.confirmed_at, now))).length;
      return { seller: s, items: items.length, stale };
    })
    .filter((x: any) => x.stale > 0)
    .sort((a: any, b: any) => b.stale / (b.items || 1) - a.stale / (a.items || 1))
    .slice(0, 6);

  const recentEvents = (db.events || []).slice(0, 8);

  return (
    <>
      <div className="grid grid-4">
        <Kpi n={db.sellers.length} label="Sellers live" detail={`${verified} ID/visit verified`} />
        <Kpi n={active.length} label="Active listings" detail={`${freshPct}% fresh`} tone={freshPct >= 50 ? "good" : "warn"} />
        <Kpi n={pendingVer + openReports + openPins} label="Queues waiting" tone="warn"
          detail={`${pendingVer} verifications · ${openReports} reports · ${openPins} pins`} />
        <Kpi n={zeroResults.length} label="Searches with no result" tone={zeroResults.length ? "warn" : "good"} detail="supply gaps to fill" />
      </div>

      <div className="section-h">
        <h2>Your work queues</h2>
        <p>This is the daily cockpit — start here each morning</p>
      </div>

      <div className="grid grid-3">
        <Link href="/admin/verifications" className="card card-link">
          <div className="row-between"><h3 className="card-title">Verification queue</h3><span className="badge badge-low">{pendingVer}</span></div>
          <p className="small muted mb0">Approve ID uploads and stall visits. Approving raises the seller&apos;s tier and rank.</p>
        </Link>
        <Link href="/admin/reports" className="card card-link">
          <div className="row-between"><h3 className="card-title">Reported listings</h3><span className="badge badge-low">{openReports}</span></div>
          <p className="small muted mb0">Dismiss, warn, delist or ban — each action is logged with a reason.</p>
        </Link>
        <Link href="/admin/pins" className="card card-link">
          <div className="row-between"><h3 className="card-title">Pin checks</h3><span className="badge badge-low">{openPins}</span></div>
          <p className="small muted mb0">Sellers whose map pin sits outside their market boundary.</p>
        </Link>
      </div>

      <div className="grid grid-2 mt16">
        <Link href="/admin/freshness" className="card card-link">
          <h3 className="card-title">Freshness dashboard</h3>
          <p className="small muted">Which markets have stale prices, and what buyers searched for and found nothing.</p>
          <div className="row mt8" style={{ gap: 16 }}>
            <div><div className="b" style={{ fontSize: 20 }}>{freshPct}%</div><div className="tiny muted">fresh listings</div></div>
            <div><div className="b" style={{ fontSize: 20, color: "var(--red)" }}>{zeroResults.length}</div><div className="tiny muted">zero-result searches</div></div>
          </div>
        </Link>

        <div className="card">
          <h3 className="card-title">Top missing items</h3>
          <p className="small muted">Buyers searched, we had nothing. Recruit a seller for these.</p>
          <div className="mt8">
            {topMissing.length === 0 ? <p className="small muted mb0">Nothing missing right now.</p> : null}
            {topMissing.map(([q, n]) => (
              <div className="stat-line" key={q}>
                <span className="mono small">{q}</span>
                <span className="badge badge-neutral">{n} search{n === 1 ? "" : "es"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-h">
        <h2>Sellers drifting stale</h2>
        <p>Message these shops — their prices are going out of date</p>
      </div>
      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Shop</th><th>Market</th><th>Items</th><th>Stale / hidden</th><th>Last confirmed</th><th></th></tr></thead>
            <tbody>
              {staleSellers.map(({ seller, items, stale }: any) => {
                const newest = db.listings
                  .filter((l: any) => l.seller_id === seller.id)
                  .map((l: any) => new Date(l.confirmed_at || 0).getTime())
                  .sort((a: number, b: number) => b - a)[0];
                return (
                  <tr key={seller.id}>
                    <td className="b">{seller.business_name}</td>
                    <td className="muted small">{db.zones.find((z: any) => z.id === seller.zone_id)?.name}</td>
                    <td>{items}</td>
                    <td><span className="badge badge-stale">{stale}</span></td>
                    <td className="muted small">{newest ? freshnessLabel(new Date(newest).toISOString()) : "never"}</td>
                    <td><Link className="btn btn-sm" href={`/admin/sellers/${seller.id}`}>Open</Link></td>
                  </tr>
                );
              })}
              {staleSellers.length === 0 ? <tr><td colSpan={6} className="muted">Every shop is fresh. 👏</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-2 mt24">
        <div className="card">
          <div className="row-between"><h3 className="card-title">Recent activity</h3><Link className="small" href="/admin/audit">Full log →</Link></div>
          <p className="small muted">Every price change, moderation action and verification is recorded.</p>
          <div className="mt8">
            {(db.audit_log || []).slice(0, 6).map((a: any) => (
              <div className="stat-line" key={a.id}>
                <span className="small"><span className="mono tiny">{a.action}</span> · {a.entity}</span>
                <span className="tiny muted">{freshnessLabel(a.created_at)}</span>
              </div>
            ))}
            {(db.audit_log || []).length === 0 ? (
              <p className="small muted mb0">No actions yet. Approve something and it appears here.</p>
            ) : null}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Event stream</h3>
          <p className="small muted">Instrumentation required by the PRD ships with the beta, not after.</p>
          <div className="mt8">
            {recentEvents.map((e: any) => (
              <div className="stat-line" key={e.id}>
                <span className="mono tiny">{e.name}</span>
                <span className="tiny muted">{freshnessLabel(e.created_at)}</span>
              </div>
            ))}
            {recentEvents.length === 0 ? <p className="small muted mb0">No events yet — use the seller console and come back.</p> : null}
          </div>
        </div>
      </div>

      <div className="btn-row mt24">
        <form action={logout}><button className="btn btn-sm">Sign out of admin</button></form>
        <Link className="btn btn-sm" href="/market-data">Market data</Link>
        <Link className="btn btn-sm" href="/test-plan">Test plan</Link>
        <Link className="btn btn-sm" href="/api/export">Download demo data (JSON)</Link>
      </div>
    </>
  );
}

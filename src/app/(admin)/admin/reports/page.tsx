import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { handleReport, requestReconfirm } from "../actions";
import { freshnessLabel, freshnessState } from "@/lib/freshness";
import { Empty, Price, StockBadge } from "@/lib/member3-ui";

export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = {
  wrong_price: "Wrong price",
  not_available: "Not available",
  wrong_location: "Wrong location",
  counterfeit: "Counterfeit / fake",
  banned: "Prohibited item",
  other: "Other",
};

/** US-6.2 — Report queue with a full audit trail. */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const session = await getAdminSession();
  if (!session) redirect("/admin?need=login");
  const db = getDB();
  const tab = sp.tab || "open";

  const all = db.reports || [];
  const rows = all.filter((r: any) => (tab === "open" ? r.state === "open" : r.state !== "open"));

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "0 0 14px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Reported listings</h2>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            Two taps from a buyer. Every decision is logged with a reason and an audit entry.
          </p>
        </div>
        <div className="pill-tabs">
          <Link href="/admin/reports" className={tab === "open" ? "on" : ""}>Open <span className="count">{all.filter((r: any) => r.state === "open").length}</span></Link>
          <Link href="/admin/reports?tab=done" className={tab === "done" ? "on" : ""}>Handled <span className="count">{all.filter((r: any) => r.state !== "open").length}</span></Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty icon="🛡️" title={tab === "open" ? "No open reports" : "Nothing handled yet"}>
          {tab === "open" ? "Buyers have not flagged any listing." : "Actions you take appear here with the audit trail."}
        </Empty>
      ) : (
        <div className="stack">
          {rows.map((r: any) => {
            const listing = db.listings.find((l: any) => l.id === r.listing_id);
            const seller = db.sellers.find((s: any) => s.id === listing?.seller_id);
            const zone = db.zones.find((z: any) => z.id === seller?.zone_id);
            return (
              <div className="card" key={r.id}>
                <div className="row-between wrapflex" style={{ alignItems: "flex-start" }}>
                  <div>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <span className="badge badge-out">{REASONS[r.reason] || r.reason}</span>
                      <span className="b">{listing?.title_as_listed || "(listing removed)"}</span>
                      {listing ? <StockBadge status={listing.stock_status} /> : null}
                    </div>
                    <div className="tiny muted" style={{ marginTop: 4 }}>
                      {seller?.business_name} · {zone?.name} · reported {freshnessLabel(r.created_at)}
                      {listing ? <> · on record <Price kobo={listing.price_kobo} /> · {freshnessLabel(listing.confirmed_at)}</> : null}
                    </div>
                    <p className="small" style={{ margin: "10px 0 0" }}>“{r.note}”</p>
                    {listing ? (
                      <div className="tiny muted">
                        Listing status: <strong>{listing.status}</strong> · previous reports: {listing.report_count || 0}
                      </div>
                    ) : null}
                  </div>
                </div>

                {r.state === "open" ? (
                  <div className="btn-row mt16">
                    <form action={handleReport} className="row" style={{ gap: 8 }}>
                      <input type="hidden" name="report_id" value={r.id} />
                      <input type="hidden" name="decision" value="dismiss" />
                      <button className="btn btn-sm">Dismiss</button>
                    </form>
                    <form action={handleReport} className="row" style={{ gap: 8 }}>
                      <input type="hidden" name="report_id" value={r.id} />
                      <input type="hidden" name="decision" value="warn" />
                      <button className="btn btn-sm">Warn seller</button>
                    </form>
                    {listing ? (
                      <form action={requestReconfirm}>
                        <input type="hidden" name="listing_id" value={listing.id} />
                        <button className="btn btn-sm">Ask to re-confirm</button>
                      </form>
                    ) : null}
                    <form action={handleReport} className="row" style={{ gap: 8 }}>
                      <input type="hidden" name="report_id" value={r.id} />
                      <input type="hidden" name="decision" value="delist" />
                      <input type="text" name="note" placeholder="Reason (logged)" style={{ width: 200, minHeight: 34, fontSize: 13.5, padding: "4px 10px" }} />
                      <button className="btn btn-sm btn-danger">Delist listing</button>
                    </form>
                    <form action={handleReport} className="row" style={{ gap: 8 }}>
                      <input type="hidden" name="report_id" value={r.id} />
                      <input type="hidden" name="decision" value="ban" />
                      <button className="btn btn-sm btn-danger">Ban seller</button>
                    </form>
                  </div>
                ) : (
                  <div className="small mt16">
                    <span className="badge badge-neutral">{r.state}</span>
                    <span className="muted"> · {r.resolution_note} · handled {freshnessLabel(r.handled_at)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="card mt24">
        <h3 className="card-title">How reports become trust data</h3>
        <div className="small muted">
          <p style={{ marginTop: 0 }}>
            “Ask to re-confirm” flips the listing to <strong>Unconfirmed</strong> and sends the seller one reminder.
            That is the PRD&apos;s answer to a single bad report: verify, don&apos;t punish.
          </p>
          <p className="mb0">
            Three separate buyers reporting “not available” within 7 days demotes the listing automatically
            (US-3.2). Accuracy score drops, and the shop shows up in the Freshness Dashboard.
          </p>
        </div>
      </div>
    </>
  );
}

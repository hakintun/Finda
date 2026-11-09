import Link from "next/link";
import { redirect } from "next/navigation";
import { getDB } from "@/lib/db";
import { getSellerSession } from "@/lib/auth";
import { dailyTapAll, dailyTapOne, removeListing } from "../actions";
import { freshnessLabel, freshnessState, hoursSince } from "@/lib/freshness";
import { Price, StockBadge } from "@/lib/member3-ui";

export const dynamic = "force-dynamic";

/**
 * The Daily Tap + the reminder message a seller would receive on WhatsApp/SMS.
 * PRD US-2.4 — this is the retention mechanic for data quality.
 */
export default async function DailyTapPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const sp = await searchParams;
  const session = await getSellerSession();
  if (!session) redirect("/seller?need=login");
  const db = getDB();
  const seller = session.seller;

  const mine = db.listings
    .filter((l: any) => l.seller_id === seller.id && l.status !== "delisted")
    .sort((a: any, b: any) => (b.views_7d || 0) - (a.views_7d || 0));

  const top5 = mine.slice(0, 5);
  const lastTap = seller.last_nudge_at;
  const hours = hoursSince(lastTap);

  // items confirmed unavailable twice in a row should be prompted for removal
  const twiceUnavailable = mine.filter((l: any) => (l.unavailable_streak || 0) >= 2);

  const waMessage = [
    `*Finda* — ${seller.business_name}`,
    ``,
    `Good morning! Are these still available?`,
    ...top5.map((l: any, i: number) => `${i + 1}. ${l.title_as_listed} — ₦${Math.round(l.price_kobo / 100).toLocaleString("en-NG")} (${l.stock_status === "out" ? "out of stock" : "in stock"})`),
    ``,
    `Reply:`,
    `1️⃣ All still available`,
    `2️⃣ Some changed`,
    `3️⃣ Change prices`,
    ``,
    `This keeps your shop visible to buyers near ${db.zones.find((z: any) => z.id === seller.zone_id)?.name || "you"}.`,
  ].join("\n");

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "6px 0 14px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: "-.03em" }}>Daily Tap</h1>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            One message a day. One tap refreshes up to 5 items.
          </p>
        </div>
        <span className={`badge ${hours >= 20 ? "badge-low" : "badge-in"}`}>
          {hours >= 999 ? "Never confirmed" : `Last tapped ${Math.floor(hours)}h ago`}
        </span>
      </div>

      {sp.sent ? (
        <div className="notice notice-ok mb16">✓ Reminder sent (simulated). On production it goes out on WhatsApp with an SMS backup.</div>
      ) : null}

      <div className="grid grid-2">
        {/* -------- the message the seller receives */}
        <div className="card" style={{ background: "#f1f8f4", borderColor: "#cfe6d9" }}>
          <span className="badge badge-neutral">WhatsApp preview</span>
          <div className="mt16" style={{ background: "#dcf3e5", borderRadius: 14, padding: 14, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.55, boxShadow: "0 1px 1px rgba(0,0,0,.08)" }}>
            {waMessage}
          </div>
          <div className="tiny muted mt8">SMS fallback if WhatsApp fails 40% of the time over 3 days.</div>
        </div>

        {/* -------- the one-tap actions */}
        <div className="card">
          <h3 className="card-title">Your reply</h3>
          <p className="small muted">Tapping “All still available” refreshes the confirmed time on all five items at once.</p>
          <form action={dailyTapAll} className="mt16">
            <button className="btn btn-primary btn-block" style={{ minHeight: 52, fontSize: 16 }}>
              ✓ All still available
            </button>
          </form>
          <div className="btn-row mt16">
            <Link className="btn btn-block" href="/seller/items">Change prices or stock</Link>
          </div>
          <hr className="hr" />
          <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Item by item</h4>
          <div className="stack">
            {top5.map((l: any) => (
              <div className="row-between" key={l.id} style={{ gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="b small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title_as_listed}</div>
                  <div className="tiny muted"><Price kobo={l.price_kobo} /> · {freshnessLabel(l.confirmed_at)}</div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <StockBadge status={l.stock_status} />
                  <form action={dailyTapOne}>
                    <input type="hidden" name="listing_id" value={l.id} />
                    <button className="btn btn-sm" title="I still have this">✓</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* -------- delist prompt after 2 "unavailable" taps */}
      {twiceUnavailable.length ? (
        <>
          <div className="section-h"><h2>Not available twice in a row</h2><p>PRD US-2.4: prompt to remove instead of keeping a dead listing</p></div>
          <div className="card">
            <p className="small muted">You said these were unavailable twice. Buyers keep asking for them — remove them until they are back?</p>
            <div className="stack mt16">
              {twiceUnavailable.map((l: any) => (
                <div className="row-between" key={l.id}>
                  <span className="b">{l.title_as_listed}</span>
                  <form action={removeListing}>
                    <input type="hidden" name="listing_id" value={l.id} />
                    <button className="btn btn-sm btn-danger">Remove listing</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {/* -------- what happens if you stop tapping */}
      <div className="section-h"><h2>If you stop tapping</h2></div>
      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr><th>Time since last confirmation</th><th>What buyers see</th><th>Ranking</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Under 48 hours</td>
                <td><span className="badge badge-fresh">Confirmed today / 6h ago</span></td>
                <td>Normal</td>
              </tr>
              <tr>
                <td>3 – 7 days</td>
                <td><span className="badge badge-aging">Confirmed 4 days ago</span></td>
                <td>Slightly demoted</td>
              </tr>
              <tr>
                <td>7 – 14 days</td>
                <td><span className="badge badge-stale">Confirmed 9 days ago — may have changed</span></td>
                <td>Below fresh results</td>
              </tr>
              <tr>
                <td>Over 14 days</td>
                <td><span className="badge badge-neutral">Hidden from search</span></td>
                <td>Excluded (unless the buyer opts in)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt24">
        <h3 className="card-title">Current status of your items</h3>
        <div className="grid grid-3 mt8">
          {["fresh", "aging", "stale", "expired"].map((s) => {
            const n = mine.filter((l: any) => freshnessState(l.confirmed_at) === s).length;
            return (
              <div className="stat-line" key={s}>
                <span><span className={`dotf dotf-${s}`} /> {s === "expired" ? "Hidden" : s[0].toUpperCase() + s.slice(1)}</span>
                <span className="v">{n}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

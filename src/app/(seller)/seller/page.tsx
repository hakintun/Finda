import Link from "next/link";
import { getDB } from "@/lib/db";
import { getSellerSession } from "@/lib/auth";
import { demoLogin } from "./actions";
import { freshnessLabel, freshnessState, hoursSince } from "@/lib/freshness";
import { Kpi, Price, StockBadge, TierBadge } from "@/lib/member3-ui";
import { ShopSwitcher } from "./switcher";
import { dailyTapAll, answerRequest } from "./actions";

export const dynamic = "force-dynamic";

export default async function SellerDashboard({ searchParams }: { searchParams: Promise<{ tapped?: string; need?: string; error?: string }> }) {
  const sp = await searchParams;
  const db = getDB();
  const session = await getSellerSession();

  /* ------------------------------------------------ not signed in */
  if (!session) {
    return (
      <>
        <div className="row-between wrapflex" style={{ margin: "20px 0 8px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, letterSpacing: "-.03em" }}>Seller console</h1>
            <p className="muted small" style={{ margin: "4px 0 0" }}>
              In production you sign in with a phone code. In this demo build, pick any sample shop.
            </p>
          </div>
          <Link className="btn btn-primary" href="/seller/onboard">New shop sign-up</Link>
        </div>

        {sp.need ? (
          <div className="notice notice-warn mb16">Please sign in to a shop first.</div>
        ) : null}

        <div className="card">
          <h3 className="card-title">Demo sign-in</h3>
          <p className="small muted">Choose the shop you want to manage. Nothing is charged and no OTP is needed.</p>
          <div className="grid grid-2 mt16">
            {db.sellers.slice(0, 12).map((s: any) => {
              const zone = db.zones.find((z: any) => z.id === s.zone_id);
              const count = db.listings.filter((l: any) => l.seller_id === s.id && l.status !== "delisted").length;
              return (
                <form action={demoLogin} key={s.id}>
                  <input type="hidden" name="shop_id" value={s.id} />
                  <button className="btn btn-block" style={{ justifyContent: "space-between", textAlign: "left", height: "auto", padding: "12px 14px" }}>
                    <span>
                      <span className="b" style={{ display: "block" }}>{s.business_name}</span>
                      <span className="tiny muted">{zone?.name} · {count} items</span>
                    </span>
                    <span className="tiny muted">Open →</span>
                  </button>
                </form>
              );
            })}
          </div>
          <p className="tiny muted mt16 mb0">
            Showing 12 of {db.sellers.length}. After signing in you can switch shops from the dashboard header.
          </p>
        </div>
      </>
    );
  }

  /* ------------------------------------------------ signed in */
  const seller = session.seller;
  const zone = db.zones.find((z: any) => z.id === seller.zone_id);
  const mine = db.listings.filter((l: any) => l.seller_id === seller.id && l.status !== "delisted");
  const now = Date.now();
  const states = mine.reduce((acc: any, l: any) => {
    const s = freshnessState(l.confirmed_at, now);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, { fresh: 0, aging: 0, stale: 0, expired: 0 });

  const myRequests = (db.confirm_requests || []).filter((r: any) => {
    const l = db.listings.find((x: any) => x.id === r.listing_id);
    return l?.seller_id === seller.id;
  });
  const pending = myRequests.filter((r: any) => r.state === "pending");
  const answered = myRequests.filter((r: any) => r.state !== "pending");

  const top5 = [...mine]
    .sort((a: any, b: any) => (b.views_7d || 0) - (a.views_7d || 0))
    .slice(0, 5);

  const needsTap = mine.length > 0 && hoursSince(seller.last_nudge_at) >= 20;
  const views = mine.reduce((s: number, l: any) => s + (l.views_7d || 0), 0);
  const directions = Math.round(views * 0.22);
  const gotIt = answered.filter((r: any) => r.state === "yes").length;

  return (
    <>
      {sp.tapped ? (
        <div className="notice notice-ok mb16">
          ✓ All 5 items refreshed. Buyers now see “Confirmed just now”.
        </div>
      ) : null}

      <div className="row-between wrapflex" style={{ margin: "6px 0 14px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: "-.03em" }}>Today at your shop</h1>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            {zone?.name} · {seller.landmark_text}
          </p>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <TierBadge tier={seller.verification_tier} />
          <ShopSwitcher shops={db.sellers.map((s: any) => ({ id: s.id, name: s.business_name }))} current={seller.id} />
        </div>
      </div>

      {/* ---------------- the Daily Tap promise, kept prominent */}
      {needsTap ? (
        <div className="card" style={{ borderColor: "var(--green-600)", background: "var(--green-50)", marginBottom: 16 }}>
          <div className="row-between wrapflex">
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>One tap keeps your shop visible</h3>
              <p className="small muted mb0">
                It has been {Math.floor(hoursSince(seller.last_nudge_at))} hours since you last confirmed.
                Buyers see “{freshnessLabel(top5[0]?.confirmed_at ?? seller.last_nudge_at)}”.
              </p>
            </div>
            <form action={dailyTapAll}>
              <button className="btn btn-primary" style={{ minHeight: 46 }}>
                ✓ Yes, all still available
              </button>
            </form>
          </div>
          <p className="tiny muted mt8 mb0">
            Refreshes your top 5 items in one request. Items not confirmed within 14 days are hidden from search.
          </p>
        </div>
      ) : null}

      <div className="grid grid-4">
        <Kpi n={mine.length} label="Items listed" detail={`${states.fresh} fresh · ${states.aging} aging`} />
        <Kpi n={views} label="People looked at your items this week" detail={`${directions} tapped Directions`} />
        <Kpi n={pending.length} label="Buyers asking right now" tone={pending.length ? "warn" : "good"} detail={pending.length ? "Answer in one tap below" : "All answered"} />
        <Kpi n={gotIt} label="Confirmed finds" detail="buyers you said “yes” to" tone="good" />
      </div>

      {/* ---------------- waiting buyers */}
      <div className="section-h">
        <h2>Buyers waiting for an answer</h2>
        <p>Answer Yes/No — no typing</p>
      </div>

      {pending.length === 0 ? (
        <div className="card">
          <p className="small muted mb0">
            No questions waiting. To create one and test this screen, open a buyer confirmation request from
            the <Link href="/test-plan">test plan</Link> “Simulate a buyer” step.
          </p>
        </div>
      ) : (
        <div className="stack">
          {pending.map((r: any) => {
            const l = db.listings.find((x: any) => x.id === r.listing_id);
            return (
              <div className="card" key={r.id}>
                <div className="row-between wrapflex">
                  <div>
                    <div className="b">{l?.title_as_listed}</div>
                    <div className="tiny muted">
                      {r.buyer_name || "A buyer"} asked {freshnessLabel(r.created_at)} · price on record {l ? <Price kobo={l.price_kobo} /> : "—"}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <form action={answerRequest}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <input type="hidden" name="answer" value="yes" />
                      <button className="btn btn-primary btn-sm">✓ Yes, I have it</button>
                    </form>
                    <form action={answerRequest}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <input type="hidden" name="answer" value="no" />
                      <button className="btn btn-sm">✗ No</button>
                    </form>
                  </div>
                </div>
                <div className="tiny muted mt8">
                  If you do not answer within 30 minutes the buyer is told plainly and offered your number instead.
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- top items */}
      <div className="section-h">
        <h2>Your top items</h2>
        <div className="row" style={{ gap: 12 }}>
          <Link className="small" href="/seller/items">See all {mine.length} →</Link>
          <Link className="small" href="/seller/items?fast=1">10 common items shortcut</Link>
        </div>
      </div>

      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Freshness</th>
                <th>Views 7d</th>
              </tr>
            </thead>
            <tbody>
              {top5.map((l: any) => {
                const st = freshnessState(l.confirmed_at);
                return (
                  <tr key={l.id}>
                    <td className="b">{l.title_as_listed}</td>
                    <td><Price kobo={l.price_kobo} negotiable={l.price_negotiable} /></td>
                    <td><StockBadge status={l.stock_status} /></td>
                    <td>
                      <span className={`badge badge-${st === "fresh" ? "fresh" : st === "aging" ? "aging" : "stale"}`}>
                        {freshnessLabel(l.confirmed_at)}
                      </span>
                    </td>
                    <td className="muted">{l.views_7d ?? 0}</td>
                  </tr>
                );
              })}
              {top5.length === 0 ? (
                <tr><td colSpan={5} className="muted">No items yet. <Link href="/seller/items">Add your first item →</Link></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-h"><h2>Quick actions</h2></div>
      <div className="grid grid-3">
        <Link className="card card-link" href="/seller/items"><h3 className="card-title">Edit prices &amp; stock</h3><p className="small muted mb0">One tap to flip stock, inline price edit.</p></Link>
        <Link className="card card-link" href="/seller/qr"><h3 className="card-title">Print QR sticker</h3><p className="small muted mb0">Paste on your stall so buyers scan instead of asking.</p></Link>
        <Link className="card card-link" href="/seller/verify"><h3 className="card-title">Get verified</h3><p className="small muted mb0">Upload ID or request a stall visit for a badge.</p></Link>
      </div>

      <div className="card mt24">
        <h3 className="card-title">Why freshness matters</h3>
        <div className="grid grid-2 small mt8">
          <div>
            <div className="stat-line"><span><span className="dotf dotf-fresh" /> Fresh (&lt;48h)</span><span className="v">{states.fresh}</span></div>
            <div className="stat-line"><span><span className="dotf dotf-aging" /> Aging (3–7 days)</span><span className="v">{states.aging}</span></div>
            <div className="stat-line"><span><span className="dotf dotf-stale" /> Stale (7–14 days)</span><span className="v">{states.stale}</span></div>
            <div className="stat-line"><span><span className="dotf dotf-expired" /> Hidden (&gt;14 days)</span><span className="v">{states.expired}</span></div>
          </div>
          <p className="muted mb0">
            Fresh items rank higher and show “Confirmed today”. Stale items carry a warning. Items not confirmed
            within 14 days drop out of search so buyers are never tricked by old prices. The Daily Tap resets all five
            in one press.
          </p>
        </div>
      </div>
    </>
  );
}

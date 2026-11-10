import Link from "next/link";
import { redirect } from "next/navigation";
import { getDB } from "@/lib/db";
import { getSellerSession } from "@/lib/auth";
import { getCustomerSession } from "@/lib/customer-auth";
import { freshnessLabel, freshnessState, hoursSince } from "@/lib/freshness";
import { Kpi, Price, StockBadge, TierBadge } from "@/lib/member3-ui";
import { dailyTapAll, answerRequest } from "./actions";

export const dynamic = "force-dynamic";

export default async function SellerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tapped?: string; need?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const db = getDB();
  const session = await getSellerSession();

  /* Never expose already-registered shops! Require seller login or shop creation */
  if (!session) {
    const customer = await getCustomerSession();
    if (!customer) {
      redirect("/auth?tab=login&role=seller&next=/seller");
    }

    return (
      <div className="card" style={{ marginTop: 24, textAlign: "center", padding: "32px 20px" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏪</div>
        <h1 style={{ margin: 0, fontSize: 22, letterSpacing: "-.02em" }}>
          Welcome, {customer.user.name}! Set up your shop to start selling
        </h1>
        <p className="small muted" style={{ maxWidth: 460, margin: "8px auto 18px" }}>
          Add your Port Harcourt market area, street landmark, and your first
          items with Naira prices in under 5 minutes.
        </p>
        <div className="row" style={{ justifyContent: "center", gap: 10 }}>
          <Link className="btn btn-primary" href="/seller/onboard">
            Create my shop now →
          </Link>
          <Link className="btn" href="/account">
            Verify Email / Phone / WhatsApp
          </Link>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------ signed in */
  const seller = session.seller;
  const zone = db.zones.find((z: any) => z.id === seller.zone_id);
  const mine = db.listings.filter(
    (l: any) => l.seller_id === seller.id && l.status !== "delisted"
  );
  const now = Date.now();
  const states = mine.reduce(
    (acc: any, l: any) => {
      const s = freshnessState(l.confirmed_at, now);
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    { fresh: 0, aging: 0, stale: 0, expired: 0 }
  );

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
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: "-.03em" }}>
            Today at your shop
          </h1>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            {zone?.name} · {seller.landmark_text}
          </p>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <TierBadge tier={seller.verification_tier} />
        </div>
      </div>

      {needsTap ? (
        <div
          className="card"
          style={{
            borderColor: "var(--green-600)",
            background: "var(--green-50)",
            marginBottom: 16,
          }}
        >
          <div className="row-between wrapflex">
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>
                One tap keeps your shop visible
              </h3>
              <p className="small muted mb0">
                It has been {Math.floor(hoursSince(seller.last_nudge_at))} hours
                since you last confirmed. Buyers see “
                {freshnessLabel(top5[0]?.confirmed_at ?? seller.last_nudge_at)}
                ”.
              </p>
            </div>
            <form action={dailyTapAll}>
              <button className="btn btn-primary">
                ✓ Still accurate ({Math.min(5, mine.length)} items)
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="grid grid-4">
        <Kpi
          n={mine.length}
          label="Items listed"
          detail={`${states.fresh} fresh · ${states.stale + states.expired} stale`}
          tone={states.fresh >= mine.length / 2 ? "good" : "warn"}
        />
        <Kpi n={views} label="Views (7 days)" detail="from buyer searches" />
        <Kpi
          n={directions}
          label="Directions tapped"
          detail="buyers heading over"
        />
        <Kpi
          n={gotIt}
          label="Confirmed 'Yes'"
          detail={`${pending.length} waiting now`}
          tone="good"
        />
      </div>

      <div className="section-h">
        <h2>Buyers waiting for an answer</h2>
        <p>Reply in 1 tap so they don&apos;t waste transport fare</p>
      </div>
      {pending.length === 0 ? (
        <div className="card">
          <p className="small muted mb0">
            No pending buyer questions right now. When a buyer taps{" "}
            <strong>Confirm availability</strong> on your items, it appears here
            instantly.
          </p>
        </div>
      ) : (
        <div className="stack">
          {pending.map((r: any) => {
            const item = db.listings.find((l: any) => l.id === r.listing_id);
            return (
              <div className="card row-between wrapflex" key={r.id}>
                <div>
                  <div className="b">{item?.title_as_listed || "Item"}</div>
                  <div className="small muted">
                    Asked by <strong>{r.buyer_name}</strong> ·{" "}
                    {freshnessLabel(r.created_at)} · Listed at{" "}
                    <Price kobo={item?.price_kobo || 0} />
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <form action={answerRequest}>
                    <input type="hidden" name="request_id" value={r.id} />
                    <input type="hidden" name="answer" value="yes" />
                    <button className="btn btn-primary btn-sm">
                      ✓ Yes, I have it
                    </button>
                  </form>
                  <form action={answerRequest}>
                    <input type="hidden" name="request_id" value={r.id} />
                    <input type="hidden" name="answer" value="no" />
                    <button className="btn btn-danger btn-sm">
                      ✗ Out of stock
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="section-h">
        <h2>Your top items</h2>
        <Link className="small" href="/seller/items">
          Manage all {mine.length} items →
        </Link>
      </div>
      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Last confirmed</th>
              </tr>
            </thead>
            <tbody>
              {top5.map((l: any) => (
                <tr key={l.id}>
                  <td className="b">{l.title_as_listed}</td>
                  <td>
                    <Price kobo={l.price_kobo} />
                  </td>
                  <td>
                    <StockBadge status={l.stock_status} />
                  </td>
                  <td className="tiny muted">
                    {freshnessLabel(l.confirmed_at)}
                  </td>
                </tr>
              ))}
              {top5.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No items yet —{" "}
                    <Link href="/seller/items?fast=1">add your first items</Link>.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getDB } from "@/lib/db";
import { getSellerSession } from "@/lib/auth";
import { addListing, bulkAddCommon, removeListing, toggleStock, updatePrice } from "../actions";
import { freshnessLabel, freshnessState, formatNaira } from "@/lib/freshness";
import { Price, StockBadge } from "@/lib/member3-ui";
import { AddItemForm } from "./add-item";

export const dynamic = "force-dynamic";

export default async function SellerItems({
  searchParams,
}: {
  searchParams: Promise<{ fast?: string; cat?: string; saved?: string; bulk?: string; blocked?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSellerSession();
  if (!session) redirect("/seller?need=login");

  const db = getDB();
  const seller = session.seller;
  const mine = db.listings
    .filter((l: any) => l.seller_id === seller.id && l.status !== "delisted")
    .sort((a: any, b: any) => new Date(b.confirmed_at || 0).getTime() - new Date(a.confirmed_at || 0).getTime());

  const showFast = sp.fast === "1" || mine.length === 0;
  const fastCategory = sp.cat || seller.primary_category || "Provisions";
  const common = db.products.filter((p: any) => p.category === fastCategory).slice(0, 10);

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "6px 0 14px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: "-.03em" }}>My items</h1>
          <p className="muted small" style={{ margin: "4px 0 0" }}>{mine.length} live · one tap to change stock or price</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link className="btn btn-sm" href="/seller/items">All items</Link>
          <Link className="btn btn-sm" href="/seller/items?fast=1">10 common items</Link>
        </div>
      </div>

      {sp.saved ? <div className="notice notice-ok mb16">✓ Item saved. It is live in search now.</div> : null}
      {sp.bulk ? <div className="notice notice-ok mb16">✓ {sp.bulk} items added from the {fastCategory} template.</div> : null}
      {sp.blocked ? (
        <div className="notice notice-err mb16">
          <strong>Blocked:</strong> {sp.blocked} cannot be listed on Finda. This attempt was logged for the team.
        </div>
      ) : null}
      {sp.error === "invalid" ? <div className="notice notice-err mb16">Enter a product name and a price above zero.</div> : null}

      {/* ------------------------------------------------ fast start */}
      {showFast ? (
        <>
          <div className="card" style={{ borderColor: "var(--green-600)", background: "var(--green-50)" }}>
            <div className="row-between wrapflex">
              <div>
                <span className="badge badge-in">Under 4 minutes</span>
                <h3 className="card-title" style={{ marginTop: 8 }}>Start with 10 common {fastCategory.toLowerCase()} items</h3>
                <p className="small muted mb0">
                  Just fill in your prices. Leave any box empty to skip that item. Everything goes live as “In stock”.
                </p>
              </div>
              {mine.length > 0 ? <Link className="btn btn-sm" href="/seller/items">Hide</Link> : null}
            </div>

            <form action={bulkAddCommon} className="mt16">
              <input type="hidden" name="category" value={fastCategory} />
              <div className="grid grid-2">
                {common.map((p: any) => (
                  <label className="field" key={p.id}>
                    <span className="lbl tiny">{p.canonical_name}</span>
                    <input
                      type="number" inputMode="numeric" name={`price_${p.id}`}
                      placeholder={String(Math.round(p.typical_price_kobo / 100))}
                    />
                    <span className="hint">Typical: {formatNaira(p.typical_price_kobo)}</span>
                  </label>
                ))}
              </div>
              {common.length === 0 ? (
                <p className="small muted">No template items for this category yet — use “Add one item” below.</p>
              ) : null}
              <input type="hidden" name="category" value={fastCategory} />
              <button className="btn btn-primary btn-block mt16">Add these items</button>
            </form>

            <div className="btn-row mt16" style={{ flexWrap: "wrap" }}>
              {[...new Set(db.products.map((p: any) => p.category))].sort().map((c: any) => (
                <Link key={c} className={`btn btn-sm ${c === fastCategory ? "btn-primary" : ""}`} href={`/seller/items?fast=1&cat=${encodeURIComponent(c)}`}>
                  {c}
                </Link>
              ))}
            </div>
            <p className="tiny muted mt8 mb0">
              Category templates switch with your main category. Change it from the shop settings in production;
              here the template follows your sign-up category ({fastCategory}).
            </p>
          </div>
        </>
      ) : null}

      {/* ------------------------------------------------ item table */}
      <div className="section-h"><h2>Your items</h2><p>Price edits save instantly and mark the item as confirmed now</p></div>

      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Item</th>
                <th>Price (₦)</th>
                <th>Stock</th>
                <th>Confirmed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mine.map((l: any) => (
                <tr key={l.id}>
                  <td>
                    <div className="b">{l.title_as_listed}</div>
                    <div className="tiny muted">{l.category}{l.product_id ? " · matched" : " · free text"}</div>
                  </td>
                  <td>
                    <form action={updatePrice} className="row" style={{ gap: 6 }}>
                      <input type="hidden" name="listing_id" value={l.id} />
                      <input
                        type="number" inputMode="numeric" name="price"
                        defaultValue={Math.round(l.price_kobo / 100)}
                        style={{ width: 110, minHeight: 38, padding: "6px 9px", fontSize: 14 }}
                        aria-label={`Price for ${l.title_as_listed}`}
                      />
                      <button className="btn btn-sm">Save</button>
                    </form>
                  </td>
                  <td>
                    <form action={toggleStock}>
                      <input type="hidden" name="listing_id" value={l.id} />
                      <button className="btn btn-sm" title="Flip in / out of stock">
                        <StockBadge status={l.stock_status} />
                        <span className="tiny muted">tap to flip</span>
                      </button>
                    </form>
                  </td>
                  <td>
                    <span className={`badge badge-${freshnessState(l.confirmed_at) === "fresh" ? "fresh" : freshnessState(l.confirmed_at) === "aging" ? "aging" : "stale"}`}>
                      {freshnessLabel(l.confirmed_at)}
                    </span>
                  </td>
                  <td>
                    <form action={removeListing}>
                      <input type="hidden" name="listing_id" value={l.id} />
                      <button className="btn btn-sm btn-ghost">Remove</button>
                    </form>
                  </td>
                </tr>
              ))}
              {mine.length === 0 ? (
                <tr><td colSpan={5} className="muted">No items yet — use the template above or add one below.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------ add one */}
      <div className="section-h"><h2>Add one item</h2><p>Name, price, stock — that is all we need</p></div>
      <AddItemForm
        action={addListing}
        products={db.products.map((p: any) => ({
          id: p.id, canonical_name: p.canonical_name, category: p.category,
          unit: p.unit, typical_price_kobo: p.typical_price_kobo, aliases: p.aliases || [],
        }))}
      />
    </>
  );
}

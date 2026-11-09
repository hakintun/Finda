"use client";

import { useMemo, useState } from "react";
import { formatNaira } from "@/lib/freshness";
import { didYouMean, suggestProducts, type Product } from "@/lib/products";

export function AddItemForm({ action, products }: { action: (fd: FormData) => void; products: Product[] }) {
  const [title, setTitle] = useState("");
  const [productId, setProductId] = useState("");
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(
    () => (focused && title.trim().length >= 2 ? suggestProducts(title, products, 5) : []),
    [title, products, focused]
  );
  const dym = useMemo(() => (title.trim().length > 3 ? didYouMean(title, products) : null), [title, products]);

  return (
    <div className="card">
      <form action={action} className="stack">
        <label className="field" style={{ position: "relative" }}>
          <span className="lbl">Product name</span>
          <input
            type="text" name="title" placeholder="e.g. 1KVA generator"
            value={title}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 180)}
            onChange={(e) => { setTitle(e.target.value); setProductId(""); }}
            autoComplete="off"
          />
          <input type="hidden" name="product_id" value={productId} />

          {suggestions.length > 0 ? (
            <div style={{ border: "1px solid var(--line)", borderRadius: 10, background: "#fff", marginTop: 6, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
              <div className="tiny muted" style={{ padding: "7px 10px", background: "#f7f9fb", borderBottom: "1px solid var(--line-2)" }}>
                Clean names — pick one so buyers find you
              </div>
              {suggestions.map((s) => (
                <button key={s.product.id} type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setTitle(s.product.canonical_name); setProductId(s.product.id); setFocused(false); }}
                  style={{
                    display: "flex", width: "100%", gap: 10, alignItems: "center", justifyContent: "space-between",
                    padding: "10px 10px", border: 0, borderBottom: "1px solid var(--line-2)", background: "#fff",
                    cursor: "pointer", font: "inherit", textAlign: "left",
                  }}>
                  <span><span className="b">{s.product.canonical_name}</span><span className="tiny muted"> · {s.product.category}</span></span>
                  <span className="tiny muted mono">{formatNaira(s.product.typical_price_kobo)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </label>

        {dym ? (
          <div className="notice notice-warn" style={{ fontSize: 13.5 }}>
            Did you mean <strong>{dym.product.canonical_name}</strong>? Writing it the same way other sellers do means
            buyers find you faster.{" "}
            <button type="button" className="btn btn-sm" style={{ marginLeft: 6 }}
              onClick={() => { setTitle(dym.product.canonical_name); setProductId(dym.product.id); }}>
              Yes, use that
            </button>
          </div>
        ) : null}

        <div className="row" style={{ gap: 12, alignItems: "flex-end" }}>
          <label className="field grow">
            <span className="lbl">Price (₦)</span>
            <input type="number" inputMode="numeric" name="price" placeholder="185000" required />
          </label>
          <label className="field" style={{ minWidth: 150 }}>
            <span className="lbl">Stock</span>
            <select name="stock" defaultValue="in">
              <option value="in">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </label>
        </div>

        <button className="btn btn-primary">Save item</button>
      </form>
    </div>
  );
}

/**
 * Smart product matching — Member 3 · Task 3
 * "Suggest clean product names as sellers type (asking 'Did you mean 1.5HP Air
 *  Conditioner?' to avoid messy duplicates)" — PRD US-2.1.
 *
 * Also the dictionary loader used by the admin "market data" screens.
 */

export type Product = {
  id: string;
  canonical_name: string;
  category: string;
  unit: string;
  typical_price_kobo: number;
  aliases: string[];
};

function norm(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** simple trigram similarity (0..1) — good enough for typo tolerance on 3G */
export function similarity(a: string, b: string): number {
  const A = `  ${norm(a)} `.replace(/\s/g, " ");
  const B = `  ${norm(b)} `;
  if (!A.trim() || !B.trim()) return 0;
  const tri = (s: string) => {
    const out = new Map<string, number>();
    const padded = `  ${s} `;
    for (let i = 0; i < padded.length - 2; i++) {
      const g = padded.slice(i, i + 3);
      out.set(g, (out.get(g) || 0) + 1);
    }
    return out;
  };
  const ta = tri(A), tb = tri(B);
  let overlap = 0;
  for (const [g, n] of ta) overlap += Math.min(n, tb.get(g) || 0);
  const total = [...ta.values()].reduce((s, n) => s + n, 0) + [...tb.values()].reduce((s, n) => s + n, 0);
  return total === 0 ? 0 : (2 * overlap) / total;
}

export type Suggestion = {
  product: Product;
  score: number;
  matched_on: string;
  exact: boolean;
};

/** Suggest canonical products for whatever the seller typed. */
export function suggestProducts(query: string, products: Product[], limit = 6): Suggestion[] {
  const q = norm(query);
  if (q.length < 2) return [];

  const results: Suggestion[] = [];
  for (const p of products) {
    const candidates = [p.canonical_name, ...(p.aliases || []), p.category];
    let best = 0;
    let matched_on = p.canonical_name;

    for (const c of candidates) {
      const nc = norm(c);
      let s = similarity(q, nc);
      if (nc === q) s = 1;
      else if (nc.startsWith(q)) s = Math.max(s, 0.92);
      else if (nc.includes(q)) s = Math.max(s, 0.86);
      if (s > best) { best = s; matched_on = c; }
    }
    if (best >= 0.34) results.push({ product: p, score: Number(best.toFixed(3)), matched_on, exact: best >= 0.999 });
  }

  return results.sort((a, b) => b.score - a.score || a.product.canonical_name.localeCompare(b.product.canonical_name)).slice(0, limit);
}

/** The single "Did you mean…?" prompt shown after free-text entry. */
export function didYouMean(rawName: string, products: Product[]): Suggestion | null {
  const [best] = suggestProducts(rawName, products, 1);
  if (!best) return null;
  if (best.exact) return null;              // already a clean canonical name
  if (best.score < 0.42) return null;       // too different to be useful
  return best;
}

/** Deduplicate / clean the admin product dictionary view. */
export function dictionaryByCategory(products: Product[]) {
  const map = new Map<string, Product[]>();
  for (const p of products) {
    if (!map.has(p.category)) map.set(p.category, []);
    map.get(p.category)!.push(p);
  }
  return [...map.entries()]
    .map(([category, items]) => ({ category, items: items.sort((a, b) => a.canonical_name.localeCompare(b.canonical_name)) }))
    .sort((a, b) => b.items.length - a.items.length || a.category.localeCompare(b.category));
}

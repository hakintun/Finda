import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { createSellerManually } from "../actions";

export const dynamic = "force-dynamic";

/** US-6.4 — field agent creates a shop for a trader who will not type on a phone. */
export default async function AddShop({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const session = await getAdminSession();
  if (!session) redirect("/admin?need=login");
  const db = getDB();
  const categories = [...new Set(db.products.map((p: any) => p.category))].sort();

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "0 0 14px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Add a shop for a trader</h2>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            For the seller who does not want to type on a phone. You do the typing; they get the QR sticker.
          </p>
        </div>
      </div>

      {sp.error ? <div className="notice notice-err mb16">Fill in the shop name, market area and a landmark of at least 6 characters.</div> : null}

      <form action={createSellerManually} className="card">
        <div className="grid grid-2">
          <label className="field">
            <span className="lbl">Shop name</span>
            <input type="text" name="business_name" placeholder="e.g. Mama Ngozi Provisions" required />
          </label>
          <label className="field">
            <span className="lbl">Who to ask for</span>
            <input type="text" name="owner_name" placeholder="e.g. Mama Ngozi" />
          </label>
          <label className="field">
            <span className="lbl">Phone (optional)</span>
            <input type="tel" name="phone" placeholder="0803 123 4567" />
            <span className="hint">Leave empty if they have no phone — you will relay buyer questions.</span>
          </label>
          <label className="field">
            <span className="lbl">Shop type</span>
            <select name="seller_type">
              <option value="stall">Market stall</option>
              <option value="shop">Shop</option>
              <option value="service">Service</option>
            </select>
          </label>
          <label className="field">
            <span className="lbl">Market area</span>
            <select name="zone_id" required>
              <option value="">Choose…</option>
              {db.zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="lbl">Main category</span>
            <select name="primary_category">
              {categories.map((c: any) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <label className="field mt16">
          <span className="lbl">Landmark (required)</span>
          <input type="text" name="landmark_text" placeholder="e.g. Beside First Bank, Aggrey Road, line 4" required />
          <span className="hint">You just walked there — write it the way you would tell a buyer on the phone.</span>
        </label>

        <label className="field mt16">
          <span className="lbl">Items (one per line)</span>
          <textarea name="items" placeholder={"Generator 1KVA\nGenerator 3.5KVA\nEngine oil"} rows={5} />
          <span className="hint">Names only. Prices stay “unconfirmed” until the trader tells you or taps the daily reminder.</span>
        </label>

        <label className="field mt16">
          <span className="lbl">Verification tier</span>
          <select name="verification_tier" defaultValue="visit">
            <option value="visit">✓✓✓ Visit verified (you are standing there now)</option>
            <option value="phone">✓ Phone verified</option>
          </select>
        </label>

        <div className="notice notice-info mt16">
          Creating a shop here records your agent ID on the seller and the audit log, so we can measure
          <strong> minutes per seller</strong> and <strong>cost per seller</strong> later (PRD Q2).
        </div>

        <button className="btn btn-primary btn-block mt16">Create the shop</button>
      </form>
    </>
  );
}

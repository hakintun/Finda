import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { addBannedTerm } from "../actions";
import { freshnessLabel } from "@/lib/freshness";
import { PROHIBITED_CATEGORIES } from "@/lib/moderation";

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin?need=login");
  const db = getDB();

  const attempts = db.banned_attempts || [];
  const terms = db.banned_terms || [];

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "0 0 14px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Prohibited categories</h2>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            Blocks are enforced when a seller types an item name — and every attempt is logged here.
          </p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 className="card-title">Not allowed on Finda (v1)</h3>
          <ul className="small muted" style={{ paddingLeft: 18, margin: "8px 0 0" }}>
            {PROHIBITED_CATEGORIES.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <p className="tiny muted mt8 mb0">
            Enforced by category allow-list plus report handling — not automated detection (PRD US-3.3).
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">Add a blocked word</h3>
          <p className="small muted">When a buyer or seller uses this word in an item name, we block it and log the attempt.</p>
          <form action={addBannedTerm} className="row mt16" style={{ gap: 10, alignItems: "flex-end" }}>
            <label className="field grow">
              <span className="lbl tiny">Word or phrase</span>
              <input type="text" name="term" placeholder="e.g. tramadol" required />
            </label>
            <label className="field" style={{ minWidth: 190 }}>
              <span className="lbl tiny">Category</span>
              <select name="reason">
                <option value="prescription_drugs">Prescription drugs</option>
                <option value="weapons">Weapons</option>
                <option value="counterfeit">Counterfeit goods</option>
                <option value="wildlife">Wildlife / ivory</option>
                <option value="sexual_services">Sexual services</option>
                <option value="other">Other</option>
              </select>
            </label>
            <button className="btn btn-primary">Block</button>
          </form>

          <div className="mt16">
            <div className="tiny b muted mb8">CURRENT BLOCKED WORDS ({terms.length})</div>
            <div className="row wrapflex" style={{ gap: 6 }}>
              {terms.map((t: any) => (
                <span className="badge badge-neutral mono" key={t.term}>{t.term}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section-h"><h2>Blocked attempts</h2><p>What traders tried to post</p></div>
      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Attempted item</th><th>Shop</th><th>Blocked because</th><th>When</th></tr></thead>
            <tbody>
              {attempts.map((a: any) => {
                const seller = db.sellers.find((s: any) => s.id === a.seller_id);
                return (
                  <tr key={a.id}>
                    <td className="b">{a.attempted_name}</td>
                    <td className="muted small">{seller?.business_name || "—"}</td>
                    <td><span className="badge badge-out">{a.reason.replace(/_/g, " ")}</span></td>
                    <td className="tiny muted">{freshnessLabel(a.created_at)}</td>
                  </tr>
                );
              })}
              {attempts.length === 0 ? <tr><td colSpan={4} className="muted">No blocked attempts yet. Try adding “tramadol” from the seller console to see it here.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getDB } from "@/lib/db";
import { getSellerSession } from "@/lib/auth";
import { requestVerification } from "../actions";
import { freshnessLabel } from "@/lib/freshness";
import { TierBadge } from "@/lib/member3-ui";

export const dynamic = "force-dynamic";

/**
 * Task 6 — Seller verification uploads (ID or on-the-spot stall photo).
 * PRD US-3.1 verification tiers.
 */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const sp = await searchParams;
  const session = await getSellerSession();
  if (!session) redirect("/seller?need=login");
  const db = getDB();
  const seller = session.seller;

  const myRequests = (db.verification_requests || []).filter((v: any) => v.seller_id === seller.id);
  const pending = myRequests.find((v: any) => v.state === "pending");

  const tiers = [
    { key: "phone", label: "Phone verified", how: "Confirm the code we text you.", effect: "Listed in search", current: seller.verification_tier === "phone" },
    { key: "id", label: "ID verified ✓✓", how: "Upload your NIN slip, driver's licence or voter's card.", effect: "Small ranking boost", current: seller.verification_tier === "id" },
    { key: "visit", label: "Visit verified ✓✓✓", how: "A field agent visits your stall and takes a photo with GPS.", effect: "Biggest boost · eligible for “Verified stall” filter", current: seller.verification_tier === "visit" },
  ];

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "6px 0 14px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: "-.03em" }}>Get verified</h1>
          <p className="muted small" style={{ margin: "4px 0 0" }}>Buyers trust verified stalls — they rank higher and convert better.</p>
        </div>
        <TierBadge tier={seller.verification_tier} />
      </div>

      {sp.sent ? (
        <div className="notice notice-ok mb16">
          ✓ Sent for review. You will get a message when the team approves it — usually within a day.
        </div>
      ) : null}

      {pending ? (
        <div className="notice notice-info mb16">
          Your <strong>{pending.tier_requested === "visit" ? "stall visit" : "ID"}</strong> request is with the team
          ({freshnessLabel(pending.created_at)}). Nothing else to do.
        </div>
      ) : null}

      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Tier</th><th>How</th><th>What it does</th><th>Status</th></tr></thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.key}>
                  <td className="b">{t.label}</td>
                  <td className="muted small">{t.how}</td>
                  <td className="muted small">{t.effect}</td>
                  <td>
                    {t.current ? <span className="badge badge-in">Current</span> :
                      <span className="badge badge-unknown">Not yet</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt16" style={{ borderColor: "#00B53F", background: "#ECFDF5" }}>
        <div className="row-between wrapflex">
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Verify via Email, Phone SMS, or WhatsApp</h3>
            <p className="small muted mb0">
              Confirm a 6-digit code on your preferred contact channel to activate instant contact verification.
            </p>
          </div>
          <Link className="btn btn-primary btn-sm" href="/account">
            Verify contact now →
          </Link>
        </div>
      </div>

      {!pending ? (
        <div className="grid grid-2 mt24">
          <div className="card">
            <h3 className="card-title">Upload ID</h3>
            <p className="small muted">NIN slip, driver&apos;s licence or voter&apos;s card. The team checks that the name matches.</p>
            <form action={requestVerification} className="stack mt16">
              <input type="hidden" name="tier" value="id" />
              <label className="field">
                <span className="lbl">Evidence</span>
                <div style={{
                  border: "1px dashed var(--line)", borderRadius: 12, padding: "26px 14px",
                  textAlign: "center", background: "#fafbfc", cursor: "pointer",
                }}>
                  <div style={{ fontSize: 24 }}>📷</div>
                  <div className="small b">Take a photo or choose a file</div>
                  <div className="tiny muted">JPG or PNG · up to 5 MB (demo: no file is uploaded)</div>
                </div>
              </label>
              <label className="field">
                <span className="lbl">Note for the reviewer (optional)</span>
                <input type="text" name="note" placeholder="e.g. Name on the ID is the shop owner" />
              </label>
              <button className="btn btn-primary">Send for review</button>
            </form>
          </div>

          <div className="card">
            <h3 className="card-title">Request a stall visit</h3>
            <p className="small muted">
              A field agent comes to your stall, takes a photo on the spot and captures the GPS pin.
              This is the strongest badge and shows as <strong>✓✓✓ Visited</strong>.
            </p>
            <form action={requestVerification} className="stack mt16">
              <input type="hidden" name="tier" value="visit" />
              <label className="field">
                <span className="lbl">Best time for a visit</span>
                <select name="note">
                  <option>Morning (8am – 11am)</option>
                  <option>Afternoon (12pm – 4pm)</option>
                  <option>Any time</option>
                </select>
              </label>
              <div className="notice notice-info">
                Field agents work market by market. Mile 1 and Mile 3 are covered this week.
              </div>
              <button className="btn">Ask for a visit</button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="card mt24">
        <h3 className="card-title">Reported listings</h3>
        <p className="small muted mb0">
          Buyers can report a listing in two taps from your shop page. Reports are reviewed by Finda&apos;s market
          operations team — you will be asked to re-confirm the item rather than being punished for one bad report.
          Three separate buyers saying “not available” demotes the listing automatically.
        </p>
      </div>

      <div className="section-h"><h2>Your verification history</h2></div>
      {myRequests.length === 0 ? (
        <div className="card"><p className="small muted mb0">No requests yet.</p></div>
      ) : (
        <div className="card card-pad0">
          <div className="tbl-scroll">
            <table className="tbl">
              <thead><tr><th>Asked for</th><th>When</th><th>State</th><th>Note</th></tr></thead>
              <tbody>
                {myRequests.map((v: any) => (
                  <tr key={v.id}>
                    <td className="b">{v.tier_requested === "visit" ? "Stall visit" : "ID check"}</td>
                    <td className="muted small">{freshnessLabel(v.created_at)}</td>
                    <td>
                      <span className={`badge ${v.state === "approved" ? "badge-in" : v.state === "rejected" ? "badge-out" : "badge-low"}`}>
                        {v.state}
                      </span>
                    </td>
                    <td className="muted small">{v.rejection_reason || v.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

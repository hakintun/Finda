import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { reviewVerification } from "../actions";
import { freshnessLabel } from "@/lib/freshness";
import { TierBadge, Empty } from "@/lib/member3-ui";

export const dynamic = "force-dynamic";

/** US-6.1 — Verification queue. */
export default async function Verifications({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const session = await getAdminSession();
  if (!session) redirect("/admin?need=login");
  const db = getDB();
  const tab = sp.tab || "pending";

  const all = db.verification_requests || [];
  const pending = all.filter((v: any) => v.state === "pending");
  const done = all.filter((v: any) => v.state !== "pending");
  const rows = tab === "pending" ? pending : done;

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "0 0 14px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Verification queue</h2>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            Approving raises the seller&apos;s tier — ID gives a small rank boost, a stall visit the biggest.
          </p>
        </div>
        <div className="pill-tabs">
          <Link href="/admin/verifications" className={tab === "pending" ? "on" : ""}>Waiting <span className="count">{pending.length}</span></Link>
          <Link href="/admin/verifications?tab=done" className={tab === "done" ? "on" : ""}>Decided <span className="count">{done.length}</span></Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty icon="✅" title={tab === "pending" ? "Nothing waiting" : "Nothing decided yet"}>
          {tab === "pending" ? "Every verification request has been handled." : "Approve or reject a request and it moves here."}
        </Empty>
      ) : (
        <div className="stack">
          {rows.map((v: any) => {
            const seller = db.sellers.find((s: any) => s.id === v.seller_id);
            const zone = db.zones.find((z: any) => z.id === seller?.zone_id);
            return (
              <div className="card" key={v.id}>
                <div className="row-between wrapflex" style={{ alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <span className="b" style={{ fontSize: 16 }}>{seller?.business_name || "Unknown shop"}</span>
                      <TierBadge tier={seller?.verification_tier || "unverified"} />
                      <span className="badge badge-blue">asking for {v.tier_requested === "visit" ? "✓✓✓ stall visit" : "✓✓ ID"}</span>
                    </div>
                    <div className="tiny muted" style={{ marginTop: 4 }}>
                      {zone?.name} · {seller?.landmark_text} · requested {freshnessLabel(v.created_at)}
                    </div>
                    <p className="small" style={{ margin: "10px 0 0" }}>{v.note}</p>
                    {v.agent_name ? <div className="tiny muted">Agent: {v.agent_name}</div> : null}
                  </div>

                  {/* evidence stub — production shows the uploaded photo + captured GPS */}
                  <div style={{
                    width: 148, height: 104, borderRadius: 10, background: "#f4f6f8",
                    border: "1px dashed var(--line)", display: "grid", placeItems: "center",
                    textAlign: "center", flex: "0 0 auto",
                  }}>
                    <div>
                      <div style={{ fontSize: 20 }}>📷</div>
                      <div className="tiny muted">No photo in demo build</div>
                    </div>
                  </div>
                </div>

                {v.state === "pending" ? (
                  <div className="btn-row mt16">
                    <form action={reviewVerification} className="row" style={{ gap: 8 }}>
                      <input type="hidden" name="request_id" value={v.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button className="btn btn-primary btn-sm">✓ Approve</button>
                    </form>
                    <form action={reviewVerification} className="row" style={{ gap: 8 }}>
                      <input type="hidden" name="request_id" value={v.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <input type="text" name="reason" placeholder="Reason (buyer-visible type)" style={{ width: 260, minHeight: 34, fontSize: 13.5, padding: "4px 10px" }} />
                      <button className="btn btn-sm">✗ Reject</button>
                    </form>
                    <Link className="btn btn-sm btn-ghost" href={`/admin/sellers/${v.seller_id}`}>Open shop →</Link>
                  </div>
                ) : (
                  <div className="small mt16">
                    <span className={`badge ${v.state === "approved" ? "badge-in" : "badge-out"}`}>{v.state}</span>
                    <span className="muted"> · {v.rejection_reason || "No reason given"} · reviewed {freshnessLabel(v.reviewed_at)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

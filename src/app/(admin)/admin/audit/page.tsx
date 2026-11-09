import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { freshnessLabel } from "@/lib/freshness";
import { Empty } from "@/lib/member3-ui";

export const dynamic = "force-dynamic";

/** PRD §11 audit_log — price tampering, moderation, verification. */
export default async function AuditPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin?need=login");
  const db = getDB();
  const rows = db.audit_log || [];

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "0 0 14px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Audit log</h2>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            Every price change, moderation action, verification decision and location edit — newest first.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty icon="🧾" title="Nothing logged yet">
          Change a price from the seller console, or approve a verification, and it appears here.
        </Empty>
      ) : (
        <div className="card card-pad0">
          <div className="tbl-scroll">
            <table className="tbl">
              <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Actor</th><th>Change</th></tr></thead>
              <tbody>
                {rows.slice(0, 150).map((a: any) => (
                  <tr key={a.id}>
                    <td className="tiny muted" style={{ whiteSpace: "nowrap" }}>{freshnessLabel(a.created_at)}</td>
                    <td><span className="badge badge-neutral mono">{a.action}</span></td>
                    <td className="small">{a.entity}<div className="tiny muted mono">{a.entity_id}</div></td>
                    <td className="tiny muted mono">{a.actor_id || "system"}</td>
                    <td className="tiny mono" style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.before ? `${JSON.stringify(a.before)} → ` : ""}{a.after ? JSON.stringify(a.after) : ""}
                    </td>
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

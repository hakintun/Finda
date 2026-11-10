import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { freshnessLabel } from "@/lib/freshness";
import { toggleCustomerStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const sp = await searchParams;
  const session = await getAdminSession();
  if (!session) redirect("/admin?need=login");

  const db = getDB();
  const q = (sp.q || "").toLowerCase().trim();
  const roleFilter = sp.role || "";

  const users = (db.users || [])
    .filter((u: any) => !roleFilter || u.role === roleFilter)
    .filter(
      (u: any) =>
        !q ||
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q)
    )
    .map((u: any) => {
      const shop = (db.sellers || []).find((s: any) => s.user_id === u.id);
      return { user: u, shop };
    });

  return (
    <>
      <div className="row-between wrapflex" style={{ margin: "0 0 14px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Customers (Buyers &amp; Sellers)</h2>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            {users.length} registered accounts · delisting revokes frontend sessions and hides any linked shop in real time
          </p>
        </div>
        <Link className="btn btn-sm" href="/admin/sellers">
          Manage shops →
        </Link>
      </div>

      <form
        className="card mb16"
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}
      >
        <label className="field grow">
          <span className="lbl tiny">Search customer</span>
          <input
            type="text"
            name="q"
            defaultValue={sp.q || ""}
            placeholder="Name, email, or phone"
          />
        </label>
        <label className="field" style={{ minWidth: 160 }}>
          <span className="lbl tiny">Role</span>
          <select name="role" defaultValue={roleFilter}>
            <option value="">All roles</option>
            <option value="buyer">Buyers</option>
            <option value="seller">Sellers</option>
          </select>
        </label>
        <button className="btn">Filter</button>
      </form>

      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Role</th>
                <th>Contact &amp; Verification</th>
                <th>Linked Shop</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(({ user, shop }: any) => {
                const status = user.status || "active";
                const channels: string[] = user.verified_channels || [];
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="b">{user.name || "Unnamed"}</div>
                      <div className="tiny muted mono">{user.id}</div>
                    </td>
                    <td>
                      <span className="badge badge-blue">{user.role || "buyer"}</span>
                    </td>
                    <td className="small">
                      <div>{user.email || "—"}</div>
                      <div className="tiny muted">{user.phone || "—"}</div>
                      {channels.length > 0 ? (
                        <div className="tiny" style={{ color: "var(--green-700)" }}>
                          ✓ Verified: {channels.join(", ")}
                        </div>
                      ) : (
                        <div className="tiny muted">Unverified</div>
                      )}
                    </td>
                    <td className="small">
                      {shop ? (
                        <Link href={`/admin/sellers/${shop.id}`}>
                          {shop.business_name} ({shop.status})
                        </Link>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          status === "active" ? "badge-in" : "badge-out"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="tiny muted">
                      {user.created_at ? freshnessLabel(user.created_at) : "—"}
                    </td>
                    <td>
                      <form action={toggleCustomerStatus}>
                        <input type="hidden" name="user_id" value={user.id} />
                        <button
                          className={`btn btn-sm ${
                            status === "active" ? "btn-danger" : "btn-primary"
                          }`}
                        >
                          {status === "active" ? "Delist" : "Restore"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    No customers match that filter.
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

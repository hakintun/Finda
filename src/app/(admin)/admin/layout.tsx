import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  const db = getDB();

  const counts = session
    ? {
        verifications: (db.verification_requests || []).filter((v: any) => v.state === "pending").length,
        reports: (db.reports || []).filter((r: any) => r.state === "open").length,
        pins: (db.pin_flags || []).filter((p: any) => p.state === "open").length,
      }
    : null;

  const tabs = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/verifications", label: "Verifications", n: counts?.verifications },
    { href: "/admin/reports", label: "Reports", n: counts?.reports },
    { href: "/admin/pins", label: "Pin checks", n: counts?.pins },
    { href: "/admin/freshness", label: "Freshness" },
    { href: "/admin/sellers", label: "Sellers" },
    { href: "/admin/listings", label: "Listings" },
    { href: "/admin/moderation", label: "Moderation" },
    { href: "/admin/add-shop", label: "Add a shop" },
    { href: "/admin/audit", label: "Audit log" },
  ];

  return (
    <main className="wrap wide">
      <div className="row-between wrapflex" style={{ margin: "18px 0 6px" }}>
        <div>
          <div className="tiny muted">Private · team only</div>
          <h1 style={{ margin: "2px 0 0", fontSize: 22, letterSpacing: "-.03em" }}>Admin control centre</h1>
        </div>
        {session ? (
          <div className="row" style={{ gap: 8 }}>
            <span className="badge badge-neutral">Signed in · Member 3</span>
            <Link className="btn btn-sm" href="/admin/audit">Audit trail</Link>
          </div>
        ) : null}
      </div>

      {session ? (
        <nav className="pill-tabs" style={{ margin: "10px 0 18px" }}>
          {tabs.map((t) => (
            <Link key={t.href} href={t.href}>
              {t.label}
              {t.n ? <span className="count">{t.n}</span> : null}
            </Link>
          ))}
        </nav>
      ) : null}

      {children}
    </main>
  );
}

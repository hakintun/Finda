import Link from "next/link";
import { getSellerSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSellerSession();
  const db = getDB();
  const pending = session
    ? (db.confirm_requests || []).filter((r: any) => {
        if (r.state !== "pending") return false;
        const l = db.listings.find((x: any) => x.id === r.listing_id);
        return l?.seller_id === session.seller.id;
      }).length
    : 0;

  const tabs = [
    { href: "/seller", label: "Dashboard" },
    { href: "/seller/items", label: "My items" },
    { href: "/seller/daily-tap", label: "Daily Tap" },
    { href: "/seller/verify", label: "Verification" },
    { href: "/seller/location", label: "Location" },
    { href: "/seller/qr", label: "QR sticker" },
  ];

  return (
    <main className="wrap">
      {session ? (
        <div className="row-between wrapflex" style={{ margin: "18px 0 4px" }}>
          <div>
            <div className="tiny muted">Signed in as</div>
            <div className="b" style={{ fontSize: 18 }}>{session.seller.business_name}</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {pending ? <span className="badge badge-low">{pending} buyer question{pending === 1 ? "" : "s"} waiting</span> : null}
            <Link className="btn btn-sm" href={`/s/${session.seller.slug}`}>View public page</Link>
            <form action={logout}><button className="btn btn-sm">Sign out</button></form>
          </div>
        </div>
      ) : null}

      {session ? (
        <nav className="pill-tabs" style={{ margin: "12px 0 18px" }}>
          {tabs.map((t) => (
            <Link key={t.href} href={t.href}>{t.label}</Link>
          ))}
        </nav>
      ) : null}

      {children}
    </main>
  );
}

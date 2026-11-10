import Link from "next/link";
import { getSellerSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <div className="min-h-dvh bg-[#F8F7F2]">
      <header className="bg-[#042F22] text-white shadow-xs border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xl font-black tracking-tight text-white hover:opacity-90"
            >
              Finda
            </Link>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold text-[#FDE68A]">
              Stall Manager
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              ← Marketplace
            </Link>
            <Link
              href="/account"
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              Account &amp; Verification
            </Link>
          </div>
        </div>
      </header>

      <main className="wrap">
        {session ? (
          <div className="row-between wrapflex" style={{ margin: "18px 0 4px" }}>
            <div>
              <div className="tiny muted">Managing your shop</div>
              <div className="b" style={{ fontSize: 18 }}>
                {session.seller.business_name}
              </div>
            </div>
            <div className="row wrapflex" style={{ gap: 8 }}>
              {pending ? (
                <span className="badge badge-low">
                  {pending} buyer question{pending === 1 ? "" : "s"} waiting
                </span>
              ) : null}
              <Link className="btn btn-sm" href={`/s/${session.seller.slug}`}>
                View public shop
              </Link>
              <form action={logout}>
                <button className="btn btn-sm" data-signout="1">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {session ? (
          <nav className="pill-tabs" style={{ margin: "12px 0 18px" }}>
            {tabs.map((t) => (
              <Link key={t.href} href={t.href}>
                {t.label}
              </Link>
            ))}
          </nav>
        ) : null}

        {children}
      </main>
    </div>
  );
}

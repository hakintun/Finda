import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { AuthClient } from "./auth-client";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    role?: string;
    next?: string;
  }>;
}) {
  const sp = await searchParams;
  const existing = await getCustomerSession();
  if (existing && !sp.next) {
    redirect("/account");
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF9F5]">
      <header className="bg-[#065F46] text-white shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 border border-white/25 text-sm font-black text-[#FDE68A]">
              F
            </span>
            <span className="text-xl font-black tracking-tight text-white">
              Finda
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-100">
              Port Harcourt
            </span>
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/25"
          >
            ← Back to Marketplace
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <AuthClient
          initialTab={sp.tab === "register" ? "register" : "login"}
          initialRole={sp.role === "seller" ? "seller" : "buyer"}
          nextPath={sp.next || ""}
        />
      </main>
    </div>
  );
}

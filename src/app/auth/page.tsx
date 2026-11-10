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
    <div className="min-h-dvh flex flex-col bg-[#F2F4F7]">
      <header className="bg-[#00B53F] text-white shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-white">
              Finda
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold">
              Port Harcourt
            </span>
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25"
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

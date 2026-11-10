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
    <div className="min-h-dvh flex flex-col bg-[#F8F7F2]">
      <header className="border-b border-[#E4E1D6] bg-[#FAF9F5] text-[#111827]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#064E3B] text-sm font-black text-[#FDE68A]">
              F
            </span>
            <span className="text-xl font-black tracking-tight text-[#042F22]">
              Finda
            </span>
            <span className="rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 text-[11px] font-bold text-[#064E3B]">
              Port Harcourt
            </span>
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-[#D5D1C4] bg-white px-3.5 py-1.5 text-xs font-bold text-[#1F2937] hover:border-[#064E3B] hover:text-[#064E3B]"
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

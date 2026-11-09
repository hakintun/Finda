import Link from "next/link";
import { TopBar } from "@/components/buyer/shell";

export default function SellPlaceholderPage() {
  return (
    <div className="min-h-dvh bg-[#FAF9F5]">
      <TopBar activeClusterLabel="For Port Harcourt Sellers" />
      <main className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-2xl border border-[#D1D5DB] bg-white p-6 space-y-3">
          <h1 className="text-xl font-extrabold text-[#111827]">
            Seller Onboarding Workspace (Member 3)
          </h1>
          <p className="text-sm text-[#4B5563]">
            Reserved route (/sell) for Member 3 to build the 15-minute seller
            sign-up flow.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-xl bg-[#065F46] px-4 py-2.5 text-sm font-semibold text-white"
          >
            ← Back to Buyer Search
          </Link>
        </div>
      </main>
    </div>
  );
}

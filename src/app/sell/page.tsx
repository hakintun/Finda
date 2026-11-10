import Link from "next/link";
import { MarketplaceFooter, TopBar } from "@/components/buyer/shell";
import { getDB } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export default async function SellLandingPage() {
  const [db, customerSession] = await Promise.all([
    Promise.resolve(getDB()),
    getCustomerSession(),
  ]);

  const activeShops = (db.sellers || []).filter(
    (s: any) => s.status === "active"
  ).length;
  const zones = db.zones || [];

  const topCustomer = customerSession
    ? {
        name: customerSession.user.name,
        role: customerSession.user.role,
        isVerified: Boolean(customerSession.user.is_verified),
        hasShop: Boolean(customerSession.shop),
      }
    : null;

  return (
    <div className="min-h-dvh flex flex-col bg-[#F8F7F2]">
      <TopBar activeClusterLabel="List Your Stall" customer={topCustomer} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-8 space-y-6">
        <section className="finda-canopy rounded-3xl p-8 text-white shadow-md space-y-4">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#FDE68A]">
            100% Free for Port Harcourt Market Traders
          </span>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Put your physical stall on Port Harcourt&apos;s live stock radar
          </h1>
          <p className="max-w-2xl text-sm text-white/85 leading-relaxed">
            Join {activeShops}+ verified stalls across{" "}
            {zones.map((z: any) => z.name).join(", ")}. Verify your account via
            Email, Phone SMS, or WhatsApp and publish your stall landmark &amp;
            prices in minutes.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {customerSession?.shop ? (
              <Link
                href="/seller"
                className="inline-flex min-h-12 items-center rounded-xl bg-[#FDE68A] px-6 text-sm font-black uppercase text-[#042F22] shadow-sm hover:bg-[#FCD34D]"
              >
                Open My Shop Dashboard →
              </Link>
            ) : customerSession ? (
              <Link
                href="/seller/onboard"
                className="inline-flex min-h-12 items-center rounded-xl bg-[#FDE68A] px-6 text-sm font-black uppercase text-[#042F22] shadow-sm hover:bg-[#FCD34D]"
              >
                Set Up My Stall Profile →
              </Link>
            ) : (
              <>
                <Link
                  href="/auth?tab=register&role=seller&next=/seller/onboard"
                  className="inline-flex min-h-12 items-center rounded-xl bg-[#FDE68A] px-6 text-sm font-black uppercase text-[#042F22] shadow-sm hover:bg-[#FCD34D]"
                >
                  Register Your Stall (Free) →
                </Link>
                <Link
                  href="/auth?tab=login&role=seller&next=/seller"
                  className="inline-flex min-h-12 items-center rounded-xl bg-white/15 border border-white/25 px-6 text-sm font-extrabold text-white hover:bg-white/25"
                >
                  Sign In to Existing Stall
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E4E1D6] bg-white p-5 shadow-2xs space-y-1.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#064E3B] text-xs font-black text-[#FDE68A]">
              01
            </span>
            <h2 className="text-sm font-extrabold text-[#111827] pt-1">
              Verify via Email, SMS or WhatsApp
            </h2>
            <p className="text-xs text-[#4B5563]">
              Choose whichever verification channel works best for you to earn
              your Verified Stall badge.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E4E1D6] bg-white p-5 shadow-2xs space-y-1.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#064E3B] text-xs font-black text-[#FDE68A]">
              02
            </span>
            <h2 className="text-sm font-extrabold text-[#111827] pt-1">
              Add Your Street Landmark &amp; Stock
            </h2>
            <p className="text-xs text-[#4B5563]">
              Tick common items in your department and enter today&apos;s Naira
              prices — no studio photos required.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E4E1D6] bg-white p-5 shadow-2xs space-y-1.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#064E3B] text-xs font-black text-[#FDE68A]">
              03
            </span>
            <h2 className="text-sm font-extrabold text-[#111827] pt-1">
              Welcome Ready-to-Buy Walk-Ins
            </h2>
            <p className="text-xs text-[#4B5563]">
              Buyers check your price &amp; stock first, then call, WhatsApp, or
              walk straight to your stall.
            </p>
          </div>
        </section>
      </main>

      <MarketplaceFooter />
    </div>
  );
}

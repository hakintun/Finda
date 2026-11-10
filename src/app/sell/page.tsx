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
    <div className="min-h-dvh flex flex-col bg-[#F2F4F7]">
      <TopBar activeClusterLabel="Sell on Finda" customer={topCustomer} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-8 space-y-6">
        <section className="rounded-3xl bg-gradient-to-br from-[#00B53F] to-[#008A30] p-8 text-white shadow-md space-y-4">
          <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider">
            100% Free for Port Harcourt Sellers
          </span>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Sell faster to buyers already searching near your stall
          </h1>
          <p className="max-w-2xl text-sm text-white/90 leading-relaxed">
            Join {activeShops}+ verified Port Harcourt traders across{" "}
            {zones.map((z: any) => z.name).join(", ")}. Verify your account via
            Email, Phone SMS, or WhatsApp and publish your prices in minutes.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {customerSession?.shop ? (
              <Link
                href="/seller"
                className="inline-flex min-h-12 items-center rounded-xl bg-[#FF8900] px-6 text-sm font-black uppercase text-white shadow-sm hover:bg-[#EA7B00]"
              >
                Open My Shop Dashboard →
              </Link>
            ) : customerSession ? (
              <Link
                href="/seller/onboard"
                className="inline-flex min-h-12 items-center rounded-xl bg-[#FF8900] px-6 text-sm font-black uppercase text-white shadow-sm hover:bg-[#EA7B00]"
              >
                Set Up My Shop Profile →
              </Link>
            ) : (
              <>
                <Link
                  href="/auth?tab=register&role=seller&next=/seller/onboard"
                  className="inline-flex min-h-12 items-center rounded-xl bg-[#FF8900] px-6 text-sm font-black uppercase text-white shadow-sm hover:bg-[#EA7B00]"
                >
                  Register as Seller (Free) →
                </Link>
                <Link
                  href="/auth?tab=login&role=seller&next=/seller"
                  className="inline-flex min-h-12 items-center rounded-xl bg-white px-6 text-sm font-extrabold text-[#00B53F] hover:bg-white/90"
                >
                  Sign In to Existing Shop
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs space-y-1.5">
            <div className="text-2xl">✅</div>
            <h2 className="text-sm font-extrabold text-[#111827]">
              1. Verify via Email, SMS or WhatsApp
            </h2>
            <p className="text-xs text-[#4B5563]">
              Choose whichever verification channel works best for you to earn
              your Verified Seller badge.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs space-y-1.5">
            <div className="text-2xl">📍</div>
            <h2 className="text-sm font-extrabold text-[#111827]">
              2. Add Your Street Landmark & Items
            </h2>
            <p className="text-xs text-[#4B5563]">
              Tick common items in your category and enter today&apos;s Naira
              prices — no studio photos required.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs space-y-1.5">
            <div className="text-2xl">💬</div>
            <h2 className="text-sm font-extrabold text-[#111827]">
              3. Receive Serious Ready-to-Buy Customers
            </h2>
            <p className="text-xs text-[#4B5563]">
              Buyers check your price & stock first, then call, WhatsApp, or
              walk straight to your stall.
            </p>
          </div>
        </section>
      </main>

      <MarketplaceFooter />
    </div>
  );
}

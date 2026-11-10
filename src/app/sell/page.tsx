import Link from "next/link";
import { TopBar } from "@/components/buyer/shell";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function SellLandingPage() {
  const db = getDB();
  const activeShops = db.sellers.filter((s: any) => s.status === "active").length;
  const zones = db.zones;

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF9F5]">
      <TopBar activeClusterLabel="For Port Harcourt Traders" />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 space-y-6">
        <section className="rounded-2xl border border-[#D1D5DB] bg-white p-6 space-y-4 shadow-xs">
          <span className="inline-flex items-center rounded-full bg-[#ECFDF5] border border-[#6EE7B7] px-3 py-1 text-xs font-bold text-[#065F46]">
            Free for Port Harcourt shops · Works on 2G/3G
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">
            Put your shop on Finda in under 15 minutes
          </h1>
          <p className="text-sm text-[#374151]">
            Join <strong>{activeShops} active Port Harcourt shops</strong> across{" "}
            {zones.map((z: any) => z.name).join(", ")}. Buyers check your current
            Naira prices, stock status, and street landmark before making the
            trip — no photos required.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <Link
              href="/seller/onboard"
              className="btn btn-primary btn-block"
            >
              Start shop sign-up →
            </Link>
            <Link href="/seller" className="btn btn-block">
              Open Seller Console →
            </Link>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#D1D5DB] bg-white p-4">
            <p className="text-sm font-bold text-[#111827]">
              1. Pick your market & landmark
            </p>
            <p className="mt-1 text-xs text-[#4B5563]">
              Describe how buyers actually find you — e.g. &ldquo;Opposite St
              Paul&apos;s Junction, Line 3&rdquo;.
            </p>
          </div>
          <div className="rounded-2xl border border-[#D1D5DB] bg-white p-4">
            <p className="text-sm font-bold text-[#111827]">
              2. Tick 5–10 items & Naira prices
            </p>
            <p className="mt-1 text-xs text-[#4B5563]">
              No camera or product photoshoot needed. Update prices in seconds
              anytime FX moves.
            </p>
          </div>
          <div className="rounded-2xl border border-[#D1D5DB] bg-white p-4">
            <p className="text-sm font-bold text-[#111827]">
              3. Answer &ldquo;Still in stock?&rdquo; in 1 tap
            </p>
            <p className="mt-1 text-xs text-[#4B5563]">
              Reply Yes or No to serious buyers and print a free QR sticker for
              your stall front.
            </p>
          </div>
        </section>

        <p className="text-center text-xs text-[#4B5563]">
          Read our plain-English{" "}
          <Link href="/privacy" className="font-semibold text-[#065F46] underline">
            Seller Privacy & Data Notice (NDPA)
          </Link>{" "}
          ·{" "}
          <Link href="/" className="font-semibold text-[#065F46] underline">
            ← Back to Buyer Search
          </Link>
        </p>
      </main>
    </div>
  );
}

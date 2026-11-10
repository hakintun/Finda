import Link from "next/link";
import { redirect } from "next/navigation";
import { getDB, saveDB, nowISO } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
import { toE164 } from "@/lib/freshness";
import OnboardingWizard from "./wizard";
import { emptyDraft, getDraft, STEPS } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; __ft?: string }>;
}) {
  const [rawDraft, customer, sp] = await Promise.all([
    getDraft(),
    getCustomerSession(),
    searchParams,
  ]);

  // If the signed-in user already owns an active shop, send them straight to their Stall Manager
  if (customer?.shop) {
    const suffix = sp.__ft ? `?__ft=${encodeURIComponent(sp.__ft)}` : "";
    redirect(`/seller${suffix}`);
  }

  const db = getDB();
  db.onboarding_drafts = db.onboarding_drafts || [];

  // Never trap a new visitor/account in an already-published stale draft from an earlier cookie
  let activeDraft: any = rawDraft;
  if (activeDraft.published_shop_id) {
    activeDraft = emptyDraft();
    db.onboarding_drafts.push(activeDraft);
    saveDB(db);
  }

  let dirty = false;
  // Pre-fill ONLY the currently authenticated user's own contact if they already registered
  if (customer?.user) {
    const normPhone = customer.user.phone ? toE164(customer.user.phone) : null;
    if (!activeDraft.phone && normPhone) {
      activeDraft.phone = normPhone;
      dirty = true;
    }
    if (!activeDraft.email && customer.user.email) {
      activeDraft.email = customer.user.email;
      dirty = true;
    }
    if (!activeDraft.owner_name && customer.user.name) {
      activeDraft.owner_name = customer.user.name;
      dirty = true;
    }
    // If the seller already verified their account on /auth and has a valid Nigerian phone,
    // skip redundant Step 1 OTP and begin directly at Step 2!
    if (customer.user.is_verified && activeDraft.phone && !activeDraft.verified) {
      activeDraft.verified = true;
      activeDraft.consent = true;
      activeDraft.step = Math.max(activeDraft.step || 1, 2);
      dirty = true;
    }
  }

  if (dirty) {
    activeDraft.updated_at = nowISO();
    saveDB(db);
  }

  const initialDraft = { ...activeDraft };
  const requested = Number(sp.step || initialDraft.step || 1);
  const effectiveStep = Math.min(Math.max(requested, 1), 6);

  return (
    <main className="wrap narrow">
      <div className="row-between wrapflex" style={{ margin: "20px 0 14px" }}>
        <div>
          <span className="badge badge-neutral">
            Seller onboarding · step {effectiveStep} of 6
          </span>
          <h1
            style={{ margin: "10px 0 4px", fontSize: 26, letterSpacing: "-.03em" }}
          >
            Open your shop on Finda
          </h1>
          <p className="muted small" style={{ margin: 0 }}>
            Verify via Email, Phone SMS, or WhatsApp and publish your prices in
            under 5 minutes.
          </p>
        </div>
        <Link href="/sell" className="btn btn-sm">
          ← Back
        </Link>
      </div>

      <div className="progress" style={{ marginBottom: 6 }}>
        <span style={{ width: `${(effectiveStep / 6) * 100}%` }} />
      </div>
      <div className="tiny muted mb16">{STEPS[effectiveStep - 1]?.title}</div>

      <OnboardingWizard
        initialDraft={initialDraft}
        zones={db.zones.map((z: any) => ({
          id: z.id,
          name: z.name,
          cluster: z.cluster,
          lat: z.lat,
          lng: z.lng,
          radiusKm: z.radiusKm,
        }))}
        products={db.products.map((p: any) => ({
          id: p.id,
          canonical_name: p.canonical_name,
          category: p.category,
          unit: p.unit,
          typical_price_kobo: p.typical_price_kobo,
          aliases: p.aliases || [],
        }))}
        categories={
          [...new Set(db.products.map((p: any) => p.category as string))].sort() as string[]
        }
        startStep={effectiveStep}
      />
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getDB } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
import OnboardingWizard from "./wizard";
import { getDraft, STEPS } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const [draft, customer, sp] = await Promise.all([
    getDraft(),
    getCustomerSession(),
    searchParams,
  ]);

  if (draft.published_shop_id) {
    redirect(`/seller/onboard/published?shop=${draft.published_shop_id}`);
  }

  const db = getDB();
  const initialDraft: any = { ...draft };

  // Pre-fill ONLY the currently authenticated user's own contact if they already registered
  if (customer?.user) {
    if (!initialDraft.phone && customer.user.phone) {
      initialDraft.phone = customer.user.phone;
    }
    if (!initialDraft.email && customer.user.email) {
      initialDraft.email = customer.user.email;
    }
    if (!initialDraft.owner_name && customer.user.name) {
      initialDraft.owner_name = customer.user.name;
    }
  }

  const requested = Number(sp.step || initialDraft.step || 1);

  return (
    <main className="wrap narrow">
      <div className="row-between wrapflex" style={{ margin: "20px 0 14px" }}>
        <div>
          <span className="badge badge-neutral">
            Seller onboarding · step {Math.min(requested, 6)} of 6
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
        <span style={{ width: `${(Math.min(requested, 6) / 6) * 100}%` }} />
      </div>
      <div className="tiny muted mb16">
        {STEPS[Math.min(requested, 6) - 1]?.title}
      </div>

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
        startStep={Math.min(Math.max(requested, 1), 6)}
      />
    </main>
  );
}

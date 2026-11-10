import Link from "next/link";
import { redirect } from "next/navigation";
import { getDB } from "@/lib/db";
import OnboardingWizard from "./wizard";
import { getDraft, STEPS } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const draft = await getDraft();
  if (draft.published_shop_id) redirect(`/seller/onboard/published?shop=${draft.published_shop_id}`);

  const db = getDB();
  const sp = await searchParams;
  const requested = Number(sp.step || draft.step || 1);

  return (
    <main className="wrap narrow">
      <div className="row-between wrapflex" style={{ margin: "20px 0 14px" }}>
        <div>
          <span className="badge badge-neutral">Seller sign-up · step {Math.min(requested, 6)} of 6</span>
          <h1 style={{ margin: "10px 0 4px", fontSize: 26, letterSpacing: "-.03em" }}>Open your shop on Finda</h1>
          <p className="muted small" style={{ margin: 0 }}>
            Under 15 minutes on a phone. You only need names, prices and stock — no long descriptions.
          </p>
        </div>
        <Link href="/seller" className="btn btn-sm">Skip to demo console</Link>
      </div>

      <div className="progress" style={{ marginBottom: 6 }}>
        <span style={{ width: `${(Math.min(requested, 6) / 6) * 100}%` }} />
      </div>
      <div className="tiny muted mb16">{STEPS[Math.min(requested, 6) - 1]?.title}</div>

      <OnboardingWizard
        initialDraft={draft}
        zones={db.zones.map((z: any) => ({ id: z.id, name: z.name, cluster: z.cluster, lat: z.lat, lng: z.lng, radiusKm: z.radiusKm }))}
        products={db.products.map((p: any) => ({
          id: p.id, canonical_name: p.canonical_name, category: p.category,
          unit: p.unit, typical_price_kobo: p.typical_price_kobo, aliases: p.aliases || [],
        }))}
        categories={[...new Set(db.products.map((p: any) => p.category as string))].sort() as string[]}
        startStep={Math.min(Math.max(requested, 1), 6)}
      />
    </main>
  );
}

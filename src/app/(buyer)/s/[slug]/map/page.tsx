import Link from "next/link";
import { MarketplaceFooter, TopBar } from "@/components/buyer/shell";
import { RevealPhoneButton } from "@/components/buyer/reveal-phone-button";
import { VerificationBadge } from "@/components/ui";
import { getDB } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
import { haversineKm, shopOpenState } from "@/lib/freshness";
import { mapDbTierToUi } from "@/lib/buyer-ops";

export const dynamic = "force-dynamic";

export default async function ShopDirectionsMapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, customerSession] = await Promise.all([
    params,
    getCustomerSession(),
  ]);

  const db = getDB();
  const topCustomer = customerSession
    ? {
        name: customerSession.user.name,
        role: customerSession.user.role,
        isVerified: Boolean(customerSession.user.is_verified),
        hasShop: Boolean(customerSession.shop),
      }
    : null;

  const seller = (db.sellers || []).find(
    (s: any) => s.slug === slug && s.status === "active"
  );

  if (!seller) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#F2F4F7]">
        <TopBar customer={topCustomer} />
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-14 text-center space-y-4">
          <h1 className="text-xl font-extrabold text-[#111827]">
            Shop directions unavailable
          </h1>
          <Link href="/search" className="btn btn-primary">
            Back to Marketplace
          </Link>
        </main>
        <MarketplaceFooter />
      </div>
    );
  }

  const zone = (db.zones || []).find((z: any) => z.id === seller.zone_id);
  const openState = shopOpenState(seller.hours || seller.opening_hours);
  const askFor = seller.ask_for || seller.owner_name;

  const lat = Number(seller.lat ?? zone?.center_lat ?? 4.8156);
  const lng = Number(seller.lng ?? zone?.center_lng ?? 7.0498);
  const distFromZoneCenter = zone
    ? haversineKm(
        { lat: zone.center_lat, lng: zone.center_lng },
        { lat, lng }
      )
    : null;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${lat},${lng}`
  )}`;

  const box = zone?.box || {
    n: lat + 0.01,
    s: lat - 0.01,
    e: lng + 0.01,
    w: lng - 0.01,
  };
  const px = Math.max(
    12,
    Math.min(88, ((lng - box.w) / Math.max(0.0001, box.e - box.w)) * 100)
  );
  const py = Math.max(
    12,
    Math.min(88, ((box.n - lat) / Math.max(0.0001, box.n - box.s)) * 100)
  );

  return (
    <div className="min-h-dvh flex flex-col bg-[#F2F4F7]">
      <TopBar
        activeClusterLabel={zone?.name || "Directions"}
        customer={topCustomer}
      />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href={`/s/${seller.slug}`}
            className="text-xs font-extrabold text-[#00B53F] hover:underline"
          >
            ← Back to {seller.business_name}
          </Link>
          <VerificationBadge tier={mapDbTierToUi(seller.verification_tier)} />
        </div>

        <section className="rounded-2xl border-2 border-[#00B53F] bg-white p-5 space-y-3 shadow-xs">
          <span className="inline-flex rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-bold text-[#065F46]">
            STEP 1 · TELL KEKE / BOLT DRIVER THIS LANDMARK
          </span>
          <h1 className="text-xl font-extrabold text-[#111827]">
            {zone?.name ? `${zone.name} — ` : ""}
            {seller.landmark_text}
          </h1>

          {askFor ? (
            <p className="rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] p-3 text-sm text-[#111827]">
              🗣️ Once inside the line/plaza, ask for: <strong>{askFor}</strong>{" "}
              ({seller.business_name})
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4B5563]">
            <span>
              🕒{" "}
              <strong
                className={
                  openState.open === false ? "text-[#991B1B]" : "text-[#00B53F]"
                }
              >
                {openState.label}
              </strong>
            </span>
            {distFromZoneCenter !== null ? (
              <span>
                ~{Math.max(1, Math.round(distFromZoneCenter * 1000))}m from{" "}
                {zone.name} center
              </span>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 space-y-3 shadow-xs">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-[#111827]">
              Market Zone Pin ({zone?.name || "Port Harcourt"})
            </h2>
            <span className="mono text-[11px] text-[#4B5563]">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#D1D5DB] bg-[#ECFDF5]">
            <svg
              viewBox="0 0 100 62"
              role="img"
              aria-label={`Map pin for ${seller.business_name}`}
              className="w-full h-52 block"
            >
              <rect width="100" height="62" fill="#F3F2EC" />
              <line
                x1="0"
                y1="31"
                x2="100"
                y2="31"
                stroke="#D1D5DB"
                strokeWidth="1.6"
              />
              <line
                x1="50"
                y1="0"
                x2="50"
                y2="62"
                stroke="#D1D5DB"
                strokeWidth="1.6"
              />
              <rect
                x="8"
                y="6"
                width="84"
                height="50"
                rx="4"
                fill="#ECFDF5"
                fillOpacity="0.65"
                stroke="#00B53F"
                strokeWidth="0.7"
                strokeDasharray="2 1.5"
              />
              <text
                x="11"
                y="12"
                fontSize="3.4"
                fontWeight="700"
                fill="#065F46"
              >
                {(zone?.name || "MARKET ZONE").toUpperCase()}
              </text>

              <circle
                cx={px}
                cy={(py * 62) / 100}
                r="6"
                fill="#00B53F"
                fillOpacity="0.2"
              />
              <circle
                cx={px}
                cy={(py * 62) / 100}
                r="2.8"
                fill="#00B53F"
                stroke="#FFFFFF"
                strokeWidth="1"
              />
              <text
                x={Math.min(72, Math.max(8, px - 12))}
                y={Math.max(10, (py * 62) / 100 - 4.5)}
                fontSize="3.3"
                fontWeight="800"
                fill="#111827"
              >
                {seller.business_name.slice(0, 24)}
              </text>
            </svg>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              🧭 Open in Google Maps
            </a>
            <RevealPhoneButton
              sellerId={seller.id}
              sellerName={seller.business_name}
            />
          </div>
        </section>
      </main>

      <MarketplaceFooter />
    </div>
  );
}

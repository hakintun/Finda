import { MarketplaceFooter, TopBar } from "@/components/buyer/shell";
import { getDB } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
import { queryBuyerCatalog, toResultCardListing } from "@/lib/buyer-cards";
import { SavedAdsClient } from "./saved-client";

export const dynamic = "force-dynamic";

export default async function SavedAdsPage() {
  const [db, customerSession] = await Promise.all([
    Promise.resolve(getDB()),
    getCustomerSession(),
  ]);

  const { results } = queryBuyerCatalog(db, {
    includeExpired: true,
    limit: 300,
  });

  const catalog = results.map((r) => ({
    card: toResultCardListing(r),
    category: r.listing.category || r.seller.primary_category,
    unit: r.listing.pack_size || r.listing.unit,
  }));

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
      <TopBar customer={topCustomer} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 space-y-4">
        <div>
          <h1 className="text-2xl font-black text-[#111827]">Saved Stock</h1>
          <p className="text-xs text-[#4B5563]">
            Compare prices and street landmarks across your shortlisted Port
            Harcourt stalls.
          </p>
        </div>
        <SavedAdsClient catalog={catalog} />
      </main>

      <MarketplaceFooter />
    </div>
  );
}

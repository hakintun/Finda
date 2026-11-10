import Link from "next/link";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/buyer/shell";
import { getCustomerSession } from "@/lib/customer-auth";
import { getDB } from "@/lib/db";
import { VerifyChannelsPanel } from "./verify-panel";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/auth?tab=login&next=/account");
  }

  const { user, shop } = session;
  const db = getDB();

  const myRequests = (db.confirm_requests || [])
    .filter((r: any) => r.buyer_user_id === user.id)
    .slice(0, 10);

  return (
    <div className="min-h-dvh flex flex-col bg-[#F8F7F2]">
      <TopBar
        customer={{
          name: user.name,
          role: user.role,
          isVerified: Boolean(user.is_verified),
          hasShop: Boolean(shop),
        }}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-7 space-y-6">
        <section className="rounded-2xl border border-[#E4E1D6] bg-white p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold text-[#111827]">
                {user.name}
              </h1>
              <span className="badge badge-blue uppercase">{user.role}</span>
              {user.is_verified ? (
                <span className="badge badge-in">✓ Verified Account</span>
              ) : (
                <span className="badge badge-low">Verification Pending</span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#4B5563]">
              {user.email ? `📧 ${user.email}` : ""}{" "}
              {user.phone ? `· 📱 ${user.phone}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {shop ? (
              <Link href="/seller" className="btn btn-primary btn-sm">
                🏪 Open My Stall ({shop.business_name})
              </Link>
            ) : (
              <Link href="/seller/onboard" className="btn btn-primary btn-sm">
                + List Your Shop
              </Link>
            )}
            <Link href="/saved" className="btn btn-sm">
              ♡ Saved Stock
            </Link>
          </div>
        </section>

        <section id="verify" className="space-y-2.5">
          <h2 className="text-base font-extrabold text-[#111827]">
            Identity & Contact Verification (Email · Phone SMS · WhatsApp)
          </h2>
          <p className="text-xs text-[#4B5563]">
            Verify one or all three channels. Verified buyers get faster seller
            replies, and verified sellers earn a green Verified badge on every
            listing.
          </p>
          <VerifyChannelsPanel
            email={user.email}
            phone={user.phone}
            verifiedChannels={user.verified_channels || []}
          />
        </section>

        {myRequests.length > 0 ? (
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-3">
            <h2 className="text-base font-extrabold text-[#111827]">
              My Availability Checks
            </h2>
            <div className="divide-y divide-[#E5E7EB]">
              {myRequests.map((r: any) => {
                const item = (db.listings || []).find(
                  (l: any) => l.id === r.listing_id
                );
                return (
                  <div
                    key={r.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="font-bold text-[#111827]">
                        {item?.title_as_listed || "Listing"}
                      </p>
                      <p className="text-xs text-[#4B5563]">
                        Status: <strong>{r.state.toUpperCase()}</strong>
                      </p>
                    </div>
                    <Link href={`/request/${r.id}`} className="btn btn-sm">
                      View →
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

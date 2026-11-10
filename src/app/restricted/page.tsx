import Link from "next/link";

export default function RestrictedAccessPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#F2F4F7] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-7 text-center shadow-sm space-y-4">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2] text-2xl">
          🔒
        </div>
        <h1 className="text-xl font-extrabold text-[#111827]">
          Staff-Only Area
        </h1>
        <p className="text-sm text-[#4B5563]">
          Customer and seller accounts do not have access to marketplace
          administration tools.
        </p>
        <div className="flex flex-wrap justify-center gap-2.5 pt-2">
          <Link href="/" className="btn btn-primary">
            ← Return to Marketplace
          </Link>
          <Link href="/account" className="btn">
            My Account
          </Link>
        </div>
      </div>
    </main>
  );
}

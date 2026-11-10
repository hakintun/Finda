import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getDB } from "@/lib/db";
import { Price, TierBadge } from "@/lib/member3-ui";
import { shopOpenState } from "@/lib/freshness";

export const dynamic = "force-dynamic";

export default async function PublishedPage({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const { shop } = await searchParams;
  const db = getDB();
  const seller = db.sellers.find((s: any) => s.id === shop);
  if (!seller) notFound();

  const zone = db.zones.find((z: any) => z.id === seller.zone_id);
  const listings = db.listings.filter((l: any) => l.seller_id === seller.id);
  const base = process.env.FINDA_PUBLIC_URL || "https://finda.ng";
  const shopUrl = `${base}/s/${seller.slug}`;
  const waText = encodeURIComponent(`Hi ${seller.owner_name || seller.business_name}, I found you on Finda. Do you still have this?`);

  const qrSvg = await QRCode.toString(shopUrl, {
    type: "svg", margin: 1, width: 200,
    color: { dark: "#06341f", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  const open = shopOpenState(seller.hours);

  return (
    <main className="wrap narrow">
      <div className="notice notice-ok" style={{ marginTop: 20 }}>
        <strong>🎉 Your shop is live on Finda.</strong> Buyers within your market area can now find these items.
      </div>

      <div className="section-h"><h2>Your QR sticker</h2><p>Print, paste on your stall, and let buyers scan</p></div>

      <div className="grid grid-2">
        <div className="sticker">
          <div className="b" style={{ fontSize: 15 }}>{seller.business_name}</div>
          <div className="tiny muted">{zone?.name} · {seller.landmark_text}</div>
          <div dangerouslySetInnerHTML={{ __html: qrSvg }} style={{ width: 176, height: 176 }} />
          <div className="tiny muted">Scan to see my prices on Finda</div>
        </div>

        <div className="card">
          <h3 className="card-title">Share it</h3>
          <p className="small muted">
            Stick the QR code where customers can see it, and send the link in your WhatsApp status.
            The link shows your live prices and stock status.
          </p>
          <div className="stack mt16">
            <a className="btn btn-wa btn-block" href={`https://wa.me/?text=${encodeURIComponent(`${seller.business_name} on Finda — see my prices: ${shopUrl}`)}`} target="_blank" rel="noreferrer">
              Send my shop link on WhatsApp
            </a>
            <Link className="btn btn-block" href={`/s/${seller.slug}`}>View my public shop page</Link>
            <Link className="btn btn-block btn-primary" href={`/seller?shop=${seller.id}`}>Open my seller console</Link>
          </div>
          <div className="mono tiny mt16" style={{ wordBreak: "break-all", color: "var(--ink-3)" }}>{shopUrl}</div>
        </div>
      </div>

      <div className="section-h"><h2>What buyers will see</h2><p>{listings.length} item{listings.length === 1 ? "" : "s"} published</p></div>

      <div className="card">
        <div className="row-between wrapflex">
          <div>
            <div className="b" style={{ fontSize: 17 }}>{seller.business_name}</div>
            <div className="tiny muted">{zone?.name} · {seller.landmark_text}</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <TierBadge tier={seller.verification_tier} />
            <span className={`badge ${open.open ? "badge-in" : "badge-unknown"}`}>{open.label}</span>
          </div>
        </div>
        <hr className="hr" />
        {listings.map((l: any) => (
          <div className="stat-line" key={l.id}>
            <span>{l.title_as_listed}</span>
            <span className="row" style={{ gap: 10 }}>
              <span className={`badge ${l.stock_status === "in" ? "badge-in" : l.stock_status === "low" ? "badge-low" : "badge-out"}`}>
                {l.stock_status === "in" ? "In stock" : l.stock_status === "low" ? "Low stock" : "Out of stock"}
              </span>
              <Price kobo={l.price_kobo} />
            </span>
          </div>
        ))}
        <hr className="hr" />
        <div className="btn-row">
          <a className="btn btn-sm" href={`https://wa.me/${(seller.whatsapp_number || seller.phone).replace(/\D/g, "")}?text=${waText}`} target="_blank" rel="noreferrer">WhatsApp</a>
          <Link className="btn btn-sm" href={`/s/${seller.slug}/map`}>Directions</Link>
        </div>
      </div>

      <div className="card mt16">
        <h3 className="card-title">Keep your prices fresh in 1 tap</h3>
        <p className="small muted mb0">
          Open your <Link href="/seller">Seller Dashboard</Link> anytime to update stock status, adjust Naira prices, or reply to buyer availability checks.
        </p>
      </div>

      <div className="btn-row mt16">
        <Link className="btn btn-primary" href="/seller">Open my Seller Dashboard →</Link>
        <Link className="btn" href="/">Back to Marketplace</Link>
      </div>
    </main>
  );
}

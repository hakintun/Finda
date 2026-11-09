import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getDB } from "@/lib/db";
import { getSellerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function QrPage() {
  const session = await getSellerSession();
  if (!session) redirect("/seller?need=login");
  const db = getDB();
  const seller = session.seller;
  const zone = db.zones.find((z: any) => z.id === seller.zone_id);

  const base = process.env.FINDA_PUBLIC_URL || "https://finda.ng";
  const shopUrl = `${base}/s/${seller.slug}`;
  const qr = await QRCode.toString(shopUrl, {
    type: "svg", margin: 1, width: 220, color: { dark: "#06341f", light: "#ffffff" },
  });

  const waShare = `https://wa.me/?text=${encodeURIComponent(`${seller.business_name} on Finda — see my prices and stock before you come: ${shopUrl}`)}`;

  return (
    <>
      <div className="row-between wrapflex no-print" style={{ margin: "6px 0 14px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: "-.03em" }}>Your QR sticker</h1>
          <p className="muted small" style={{ margin: "4px 0 0" }}>Print it, paste it on your stall, and let buyers scan.</p>
        </div>
        <a className="btn btn-sm" href="javascript:window.print()">Print</a>
      </div>

      <div className="grid grid-2">
        <div className="sticker" style={{ borderStyle: "solid" }}>
          <div className="tiny b" style={{ letterSpacing: ".12em", color: "var(--green-800)" }}>FINDA · PORT HARCOURT</div>
          <div className="b" style={{ fontSize: 20, letterSpacing: "-.02em" }}>{seller.business_name}</div>
          <div dangerouslySetInnerHTML={{ __html: qr }} style={{ width: 176, height: 176 }} />
          <div className="small b">Scan to see my prices</div>
          <div className="tiny muted">{zone?.name} · {seller.landmark_text}</div>
          <div className="tiny mono muted" style={{ wordBreak: "break-all", maxWidth: 260 }}>{shopUrl}</div>
        </div>

        <div className="card no-print">
          <h3 className="card-title">How to use it</h3>
          <ol className="small muted" style={{ paddingLeft: 18 }}>
            <li>Tap <strong>Print</strong> above (or screenshot the sticker).</li>
            <li>Paste it where customers can see it — the stall front works best.</li>
            <li>Send the link in your WhatsApp status once a week.</li>
          </ol>
          <div className="stack mt16">
            <a className="btn btn-wa btn-block" href={waShare} target="_blank" rel="noreferrer">Share my shop on WhatsApp</a>
            <Link className="btn btn-block" href={`/s/${seller.slug}`}>View my public page</Link>
          </div>
          <div className="notice notice-info mt16">
            The QR works on any cheap Android camera — no app to install. Buyers land on your shop page with
            today&apos;s prices and stock.
          </div>
        </div>
      </div>
    </>
  );
}

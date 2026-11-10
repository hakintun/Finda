"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatNaira, toE164 } from "@/lib/freshness";
import { suggestProducts, didYouMean, type Product } from "@/lib/products";

type DraftItem = { title: string; product_id: string | null; price_naira: string; stock_status: string };
type Draft = {
  id: string; step: number; phone: string; otp_sent: boolean; verified: boolean; consent: boolean;
  business_name: string; owner_name: string; seller_type: string; primary_category: string;
  zone_id: string; lat: number | null; lng: number | null; landmark_text: string;
  items: DraftItem[]; published_shop_id: string | null; updated_at: string;
};
type Zone = { id: string; name: string; cluster: string; lat: number; lng: number; radiusKm: number };
type Cat = { id: string; canonical_name: string; category: string; unit: string; typical_price_kobo: number; aliases: string[] };

const STEPS = ["Phone", "Shop", "Category", "Location", "Items", "Publish"];

export default function OnboardingWizard({
  initialDraft, zones, products, categories, startStep,
}: {
  initialDraft: Draft; zones: Zone[]; products: Cat[]; categories: string[]; startStep: number;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({
    ...initialDraft,
    items: initialDraft.items?.length ? initialDraft.items : [{ title: "", product_id: null, price_naira: "", stock_status: "in" }],
  });
  const [step, setStep] = useState(startStep);
  const [errors, setErrors] = useState<string[]>([]);
  const [banned, setBanned] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [waLink, setWaLink] = useState<string | null>(null);
  const [verifyChannel, setVerifyChannel] = useState<"email" | "phone" | "whatsapp">(
    (initialDraft as any).verify_channel || "whatsapp"
  );
  const [phoneInput, setPhoneInput] = useState(initialDraft.phone || "");
  const [emailInput, setEmailInput] = useState((initialDraft as any).email || "");
  const [publishWarnings, setPublishWarnings] = useState<string[]>([]);

  /* ------------------------------------------------ persistence */
  const saveTimer = useRef<any>(null);
  const queueSave = (patch: Partial<Draft>, validateTo?: number) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const res = await fetch("/api/onboard", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", patch, validateStep: validateTo ?? step }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.ok) {
        setSavedAt(data.saved_at);
        setErrors(data.errors || []);
        setBanned(data.bannedHits || []);
      }
    }, 450);
  };

  const patch = (p: Partial<Draft>, validateTo?: number) => {
    setDraft((d) => ({ ...d, ...p }));
    queueSave(p, validateTo);
  };

  /* ------------------------------------------------ step 1: OTP */
  async function sendOtp() {
    setBusy(true); setErrors([]);
    const res = await fetch("/api/onboard", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send-otp",
        channel: verifyChannel,
        phone: phoneInput,
        email: emailInput || undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!data.ok) return setErrors(data.errors || ["Could not send the code."]);
    setDemoCode(data.demo_code);
    setWaLink(data.whatsapp_link || null);
    setDraft(data.draft);
  }

  async function verifyOtp() {
    setBusy(true); setErrors([]);
    const res = await fetch("/api/onboard", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify-otp", code: otpCode, consent: true }),
    });
    const data = await res.json();
    setBusy(false);
    if (!data.ok) return setErrors(data.errors || ["Wrong code."]);
    setDraft(data.draft);
    setStep(2);
  }

  /* ------------------------------------------------ nav */
  function next() {
    const e: string[] = [];
    if (step === 1 && !draft.verified) e.push("Confirm the code we sent to your phone.");
    if (step === 2) {
      if (!draft.business_name.trim()) e.push("Enter your shop name.");
      if (!draft.owner_name.trim()) e.push("Enter the name buyers should ask for.");
    }
    if (step === 3 && !draft.primary_category) e.push("Choose what you mostly sell.");
    if (step === 4) {
      if (draft.lat == null || draft.lng == null) e.push("Drop your shop pin on the map.");
      if (!draft.zone_id) e.push("Choose the market area your shop is in.");
      if (!draft.landmark_text.trim() || draft.landmark_text.trim().length < 6) e.push("Add a landmark — this is how buyers find your stall.");
    }
    if (step === 5) {
      const real = draft.items.filter((i) => i.title.trim() && Number(i.price_naira) > 0);
      if (real.length < 1) e.push("Add at least 1 item (aim for 5).");
    }
    if (banned.length) e.push(...banned);
    setErrors(e);
    if (e.length) return;
    const target = Math.min(step + 1, 6);
    setStep(target);
    patch({ step: target }, target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setErrors([]);
    if (step === 1) return router.push("/sell");
    const target = step - 1;
    setStep(target);
    patch({ step: target });
  }

  /* ------------------------------------------------ items */
  const setItem = (idx: number, p: Partial<DraftItem>) => {
    const items = draft.items.map((it, i) => (i === idx ? { ...it, ...p } : it));
    patch({ items });
  };
  const addItem = () => {
    if (draft.items.length >= 12) return;
    patch({ items: [...draft.items, { title: "", product_id: null, price_naira: "", stock_status: "in" }] });
    setDraft((d) => ({ ...d, items: [...d.items, { title: "", product_id: null, price_naira: "", stock_status: "in" }] }));
  };
  const removeItem = (idx: number) => {
    const items = draft.items.filter((_, i) => i !== idx);
    setDraft((d) => ({ ...d, items }));
    patch({ items });
  };

  /* ------------------------------------------------ publish */
  async function publish() {
    setBusy(true); setErrors([]);
    const res = await fetch("/api/onboard", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!data.ok) return setErrors(data.errors || ["Could not publish."]);
    setPublishWarnings(data.warnings || []);
    router.push(`/seller/onboard/published?shop=${data.seller_id}`);
  }

  const filledItems = draft.items.filter((i) => i.title.trim() && Number(i.price_naira) > 0).length;

  return (
    <>
      {/* step chips */}
      <div className="pill-tabs" style={{ marginBottom: 16 }}>
        {STEPS.map((s, i) => {
          const n = i + 1;
          const done = n < step || (n === 1 && draft.verified);
          return (
            <button key={s} className={n === step ? "on" : ""} disabled={n > step}
              onClick={() => n < step && setStep(n)} title={n > step ? "Finish this step first" : s}>
              {done && n !== step ? "✓" : n}. {s}
            </button>
          );
        })}
      </div>

      {savedAt ? (
        <div className="tiny muted" style={{ marginBottom: 10 }}>✓ Progress saved automatically — you can close this page and come back.</div>
      ) : null}

      {errors.length ? (
        <div className="notice notice-err mb16">
          <strong>Before you continue:</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      ) : null}

      {/* ------------------------------------------------ STEP 1 */}
      {step === 1 && (
        <div className="card">
          <h2 className="card-title">Step 1 · Verify via WhatsApp, Phone SMS, or Email</h2>
          <p className="muted small">
            Choose your preferred verification channel. Buyers only see your shop number when they tap “Show contact”.
          </p>

          {!draft.otp_sent ? (
            <>
              <div className="field mb16">
                <span className="lbl">Verification channel</span>
                <div className="grid grid-3" style={{ gap: 8 }}>
                  {(
                    [
                      { id: "whatsapp", label: "💬 WhatsApp" },
                      { id: "phone", label: "📱 Phone SMS" },
                      { id: "email", label: "📧 Email" },
                    ] as const
                  ).map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setVerifyChannel(ch.id)}
                      className="btn btn-sm"
                      style={{
                        borderColor: verifyChannel === ch.id ? "var(--green-700)" : undefined,
                        background: verifyChannel === ch.id ? "var(--green-50)" : undefined,
                      }}
                    >
                      {verifyChannel === ch.id ? "✓ " : ""}
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="field mb16">
                <span className="lbl">Shop Phone / WhatsApp Number</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="e.g. 0803 000 0000"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                />
                <span className="hint">
                  {toE164(phoneInput) ? `Saved as ${toE164(phoneInput)}` : "Nigerian numbers (+234)"}
                </span>
              </label>

              {verifyChannel === "email" ? (
                <label className="field mb16">
                  <span className="lbl">Email Address (for verification code)</span>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                </label>
              ) : null}

              <button className="btn btn-primary btn-block mt16" onClick={sendOtp} disabled={busy}>
                {busy ? "Sending…" : `Send 6-digit code via ${verifyChannel.toUpperCase()}`}
              </button>
            </>
          ) : (
            <>
              {demoCode ? (
                <div className="notice notice-info mb16">
                  Instant sandbox verification code ({verifyChannel.toUpperCase()}):{" "}
                  <strong className="mono">{demoCode}</strong>{" "}
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ marginLeft: 8 }}
                    onClick={() => setOtpCode(demoCode)}
                  >
                    Auto-fill
                  </button>
                </div>
              ) : null}
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-wa btn-sm mb16"
                >
                  💬 Open Verification Code in WhatsApp
                </a>
              ) : null}
              <label className="field">
                <span className="lbl">6-digit verification code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
                <span className="hint">
                  Sent via {verifyChannel.toUpperCase()} to{" "}
                  {verifyChannel === "email" ? emailInput : draft.phone || phoneInput}
                </span>
              </label>
              <label className="checkline mt16">
                <input
                  type="checkbox"
                  checked={draft.consent}
                  onChange={(e) => patch({ consent: e.target.checked })}
                />
                <span>
                  I agree that Finda can store my shop name, contact and location, and show my items to buyers
                  searching nearby. See the{" "}
                  <a href="/privacy" target="_blank" rel="noreferrer">
                    privacy notice
                  </a>
                  .
                </span>
              </label>
              <div className="btn-row mt16">
                <button
                  className="btn btn-primary grow"
                  onClick={verifyOtp}
                  disabled={busy || !draft.consent}
                >
                  {busy ? "Checking…" : "Confirm code"}
                </button>
                <button className="btn" onClick={sendOtp} disabled={busy}>
                  Resend
                </button>
              </div>
              {!draft.consent ? (
                <div className="tiny muted mt8">Tick the consent box to continue.</div>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------ STEP 2 */}
      {step === 2 && (
        <div className="card">
          <h2 className="card-title">Step 2 · Your shop</h2>
          <p className="muted small">Write it the way customers say it out loud.</p>
          <label className="field mb16">
            <span className="lbl">Shop or stall name</span>
            <input type="text" placeholder="e.g. Sunlight Electricals & Solar" value={draft.business_name}
              onChange={(e) => patch({ business_name: e.target.value }, 2)} autoFocus />
            <span className="hint">This is the name buyers will see on every result card.</span>
          </label>
          <label className="field mb16">
            <span className="lbl">Who should buyers ask for?</span>
            <input type="text" placeholder="e.g. Shop Manager / First Name" value={draft.owner_name}
              onChange={(e) => patch({ owner_name: e.target.value }, 2)} />
            <span className="hint">Shown on the directions page so walk-in buyers know who to ask for.</span>
          </label>
          <label className="field">
            <span className="lbl">What kind of place is it?</span>
            <select value={draft.seller_type} onChange={(e) => patch({ seller_type: e.target.value })}>
              <option value="stall">Market stall</option>
              <option value="shop">Shop with an address</option>
              <option value="service">Service (repairs, tailoring…)</option>
            </select>
          </label>
        </div>
      )}

      {/* ------------------------------------------------ STEP 3 */}
      {step === 3 && (
        <div className="card">
          <h2 className="card-title">Step 3 · What do you mostly sell?</h2>
          <p className="muted small">Pick one main category. You can still add items from other categories.</p>
          <div className="grid grid-2" style={{ marginTop: 12 }}>
            {categories.map((c) => (
              <button key={c} type="button" onClick={() => patch({ primary_category: c }, 3)}
                className="btn" style={{
                  justifyContent: "flex-start", textAlign: "left",
                  borderColor: draft.primary_category === c ? "var(--green-700)" : undefined,
                  background: draft.primary_category === c ? "var(--green-50)" : undefined,
                  boxShadow: draft.primary_category === c ? "inset 0 0 0 1px var(--green-700)" : undefined,
                }}>
                {draft.primary_category === c ? "✓ " : ""}{c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------ STEP 4 */}
      {step === 4 && (
        <LocationStep draft={draft} zones={zones} patch={patch} />
      )}

      {/* ------------------------------------------------ STEP 5 */}
      {step === 5 && (
        <div className="card">
          <div className="row-between wrapflex">
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>Step 4 · Your first 5 items</h2>
              <p className="muted small mb0">Only the name, price and stock are needed. Photos and descriptions are optional.</p>
            </div>
            <span className={`badge ${filledItems >= 5 ? "badge-in" : "badge-unknown"}`}>{filledItems}/5 done</span>
          </div>

          <div className="mt16 stack">
            {draft.items.map((it, idx) => (
              <ItemRow key={idx} idx={idx} item={it} products={products} category={draft.primary_category}
                onChange={(p) => setItem(idx, p)} onRemove={() => removeItem(idx)} canRemove={draft.items.length > 1} />
            ))}
          </div>

          <button className="btn btn-block mt16" onClick={addItem} disabled={draft.items.length >= 12}>
            + Save &amp; add another item
          </button>

          <div className="notice notice-info mt16">
            <strong>Shortcut for busy traders:</strong> finish now with {filledItems} item{filledItems === 1 ? "" : "s"} — you can add the rest from the
            seller console any time, and use the “10 common items” button there to fill prices in under 4 minutes.
          </div>
        </div>
      )}

      {/* ------------------------------------------------ STEP 6 */}
      {step === 6 && (
        <div className="card">
          <h2 className="card-title">Step 6 · Check and publish</h2>
          <div className="mt16">
            <div className="stat-line"><span className="muted">Phone</span><span className="v mono">{draft.phone}</span></div>
            <div className="stat-line"><span className="muted">Shop</span><span className="v">{draft.business_name || "—"}</span></div>
            <div className="stat-line"><span className="muted">Ask for</span><span className="v">{draft.owner_name || "—"}</span></div>
            <div className="stat-line"><span className="muted">Category</span><span className="v">{draft.primary_category || "—"}</span></div>
            <div className="stat-line"><span className="muted">Market area</span><span className="v">{zones.find((z) => z.id === draft.zone_id)?.name || "—"}</span></div>
            <div className="stat-line"><span className="muted">Landmark</span><span className="v" style={{ textAlign: "right", maxWidth: "60%" }}>{draft.landmark_text || "—"}</span></div>
            <div className="stat-line"><span className="muted">Pin</span><span className="v mono tiny">{draft.lat?.toFixed(5)}, {draft.lng?.toFixed(5)}</span></div>
            <div className="stat-line"><span className="muted">Items</span><span className="v">{filledItems}</span></div>
          </div>

          {draft.items.filter((i) => i.title && i.price_naira).length ? (
            <div className="mt16">
              {draft.items.filter((i) => i.title && i.price_naira).map((i, n) => (
                <div className="stat-line" key={n}>
                  <span>{i.title}</span>
                  <span className="v">{formatNaira(Math.round(Number(i.price_naira) * 100))}</span>
                </div>
              ))}
            </div>
          ) : null}

          {publishWarnings.map((w) => <div key={w} className="notice notice-warn mt16">{w}</div>)}

          <button className="btn btn-primary btn-block mt16" onClick={publish} disabled={busy}>
            {busy ? "Publishing…" : "Publish my shop"}
          </button>
          <p className="tiny muted center mt8 mb0">
            Your items go live immediately. You get a QR sticker and a WhatsApp link on the next screen.
          </p>
        </div>
      )}

      {/* ------------------------------------------------ footer nav */}
      {step < 6 ? (
        <div className="btn-row mt16">
          <button className="btn" onClick={back}>Back</button>
          <button className="btn btn-primary grow" onClick={next}>
            {step === 1 ? "Continue" : step === 5 ? "Continue to publish" : "Save & continue"}
          </button>
        </div>
      ) : (
        <div className="btn-row mt16">
          <button className="btn" onClick={back}>Back</button>
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/* Step 4 — location. A visual surrogate map (no external tiles so it  */
/* works offline / in preview), plus the required landmark field.      */
/* ================================================================== */
function LocationStep({ draft, zones, patch }: { draft: Draft; zones: Zone[]; patch: (p: Partial<Draft>, v?: number) => void }) {
  const zone = zones.find((z) => z.id === draft.zone_id) || zones[0];
  const [dragging, setDragging] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // map a lat/lng inside the zone's bounding box to a 0..1 canvas position
  const span = (zone.radiusKm / 110.6) * 2.4;
  const spanLng = span / Math.cos((zone.lat * Math.PI) / 180);
  const toPct = (lat: number, lng: number) => ({
    x: Math.min(96, Math.max(4, ((lng - (zone.lng - spanLng / 2)) / spanLng) * 100)),
    y: Math.min(96, Math.max(4, (1 - (lat - (zone.lat - span / 2)) / span) * 100)),
  });

  const pin = draft.lat != null && draft.lng != null && draft.zone_id === zone.id
    ? toPct(draft.lat, draft.lng)
    : toPct(zone.lat, zone.lng);

  const place = (clientX: number, clientY: number) => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(0.96, Math.max(0.04, (clientX - r.left) / r.width));
    const y = Math.min(0.96, Math.max(0.04, (clientY - r.top) / r.height));
    const lng = zone.lng - spanLng / 2 + x * spanLng;
    const lat = zone.lat + span / 2 - y * span;
    patch({ zone_id: zone.id, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }, 4);
  };

  return (
    <div className="card">
      <h2 className="card-title">Where is your shop?</h2>
      <p className="muted small">
        Inside a market a GPS pin drifts, so the <strong>landmark matters more than the pin</strong>. Both are required.
      </p>

      <label className="field mb16">
        <span className="lbl">Market area</span>
        <select value={draft.zone_id} onChange={(e) => {
          const z = zones.find((x) => x.id === e.target.value)!;
          patch({ zone_id: z.id, lat: z.lat, lng: z.lng }, 4);
        }}>
          <option value="">Choose your market area…</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name} ({z.cluster})</option>)}
        </select>
      </label>

      {draft.zone_id ? (
        <>
          <div
            ref={boxRef}
            onPointerDown={(e) => { setDragging(true); place(e.clientX, e.clientY); }}
            onPointerMove={(e) => dragging && place(e.clientX, e.clientY)}
            onPointerUp={() => setDragging(false)}
            onPointerLeave={() => setDragging(false)}
            style={{
              position: "relative", height: 260, borderRadius: 14, cursor: "crosshair",
              background: "linear-gradient(#eef7f1, #dfeee6)",
              border: "1px solid #c9dbd1", overflow: "hidden", touchAction: "none",
              userSelect: "none",
            }}
            role="application"
            aria-label="Tap to drop your shop pin"
          >
            {/* fake roads for orientation */}
            <div style={{ position: "absolute", inset: 0, opacity: .55 }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: "38%", height: 14, background: "#fff", borderTop: "1px solid #d6ddd6", borderBottom: "1px solid #d6ddd6" }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, left: "58%", width: 12, background: "#fff", borderLeft: "1px solid #d6ddd6", borderRight: "1px solid #d6ddd6" }} />
              <div style={{ position: "absolute", left: "10%", top: "62%", width: 70, height: 46, background: "#e7e2d6", borderRadius: 4 }} />
              <div style={{ position: "absolute", right: "8%", top: "12%", width: 84, height: 50, background: "#e7e2d6", borderRadius: 4 }} />
            </div>
            <div className="tiny" style={{ position: "absolute", left: 10, bottom: 8, color: "#5c7a6a", fontWeight: 600 }}>
              {zone.name} — tap to move your pin
            </div>
            {/* pin */}
            <div style={{
              position: "absolute", left: `${pin.x}%`, top: `${pin.y}%`, transform: "translate(-50%, -100%)",
              fontSize: 30, lineHeight: 1, filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))",
            }} aria-hidden="true">📍</div>
          </div>

          <div className="tiny muted mt8">
            Pin: {draft.lat != null ? `${draft.lat.toFixed(5)}, ${draft.lng?.toFixed(5)}` : "not dropped yet"}
            {" · "}
            <button className="btn-ghost" style={{ border: 0, background: "none", padding: 0, color: "var(--green-700)", cursor: "pointer", font: "inherit", textDecoration: "underline" }}
              onClick={() => patch({ lat: zone.lat, lng: zone.lng }, 4)}>
              centre on {zone.name}
            </button>
          </div>
        </>
      ) : (
        <div className="notice notice-warn">Choose your market area first — then drop your pin.</div>
      )}

      <label className="field mt16">
        <span className="lbl">Street landmark (required)</span>
        <input type="text" placeholder="e.g. Beside First Bank, Aggrey Road, line 4"
          value={draft.landmark_text} onChange={(e) => patch({ landmark_text: e.target.value }, 4)} />
        <span className="hint">This is the first thing a buyer reads on the “Get there” page. Make it walkable.</span>
      </label>

      {draft.landmark_text.trim().length > 0 && draft.landmark_text.trim().length < 6 ? (
        <div className="notice notice-warn mt8">Add a little more detail — “near the junction” is not enough.</div>
      ) : null}
      {draft.landmark_text.trim().length >= 6 ? (
        <div className="notice notice-ok mt8">✓ Good landmark. Buyers will see this before the map pin.</div>
      ) : null}
    </div>
  );
}

/* ================================================================== */
/* Step 5 — one item row with smart product matching                   */
/* ================================================================== */
function ItemRow({
  idx, item, products, category, onChange, onRemove, canRemove,
}: {
  idx: number; item: DraftItem; products: Cat[]; category: string;
  onChange: (p: Partial<DraftItem>) => void; onRemove: () => void; canRemove: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(
    () => (focused ? suggestProducts(item.title, products as Product[], 5) : []),
    [item.title, products, focused]
  );
  const dym = useMemo(() => (item.title.trim().length > 3 ? didYouMean(item.title, products as Product[]) : null), [item.title, products]);

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12, background: "#fcfdfe", position: "relative" }}>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <span className="tiny b muted">ITEM {idx + 1}</span>
        {canRemove ? <button className="btn btn-sm btn-ghost" onClick={onRemove} type="button">Remove</button> : null}
      </div>

      <label className="field">
        <span className="lbl tiny">Product name</span>
        <input type="text" placeholder="Start typing… e.g. generator" value={item.title}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          onChange={(e) => onChange({ title: e.target.value, product_id: null })} />
      </label>

      {suggestions.length > 0 ? (
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, background: "#fff", marginTop: 6, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
          <div className="tiny muted" style={{ padding: "7px 10px", background: "#f7f9fb", borderBottom: "1px solid var(--line-2)" }}>
            Clean names — pick one so buyers find you
          </div>
          {suggestions.map((s) => (
            <button key={s.product.id} type="button" onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange({ title: s.product.canonical_name, product_id: s.product.id }); setFocused(false); }}
              style={{
                display: "flex", width: "100%", gap: 10, alignItems: "center", justifyContent: "space-between",
                padding: "9px 10px", border: 0, borderBottom: "1px solid var(--line-2)", background: "#fff",
                cursor: "pointer", font: "inherit", textAlign: "left",
              }}>
              <span>
                <span className="b">{s.product.canonical_name}</span>
                <span className="tiny muted"> · {s.product.category}</span>
              </span>
              <span className="tiny muted mono">{formatNaira(s.product.typical_price_kobo)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {dym ? (
        <div className="notice notice-warn" style={{ marginTop: 8, padding: "8px 10px", fontSize: 13 }}>
          Did you mean <strong>{dym.product.canonical_name}</strong>?{" "}
          <button type="button" className="btn btn-sm" style={{ marginLeft: 6 }}
            onClick={() => onChange({ title: dym.product.canonical_name, product_id: dym.product.id })}>
            Yes, use that
          </button>
        </div>
      ) : null}

      <div className="row mt8" style={{ gap: 10, alignItems: "flex-end" }}>
        <label className="field grow">
          <span className="lbl tiny">Price (₦)</span>
          <input type="number" inputMode="numeric" placeholder="185000" value={item.price_naira}
            onChange={(e) => onChange({ price_naira: e.target.value })} />
        </label>
        <label className="field" style={{ minWidth: 132 }}>
          <span className="lbl tiny">Stock</span>
          <select value={item.stock_status} onChange={(e) => onChange({ stock_status: e.target.value })}>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </label>
      </div>
    </div>
  );
}

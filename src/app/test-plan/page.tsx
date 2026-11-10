import Link from "next/link";
import { redirect } from "next/navigation";
import { getDB } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { freshnessState } from "@/lib/freshness";

export const dynamic = "force-dynamic";

/**
 * Member 3 · Task 10 — the sign-off checklist.
 * Every acceptance criterion from the brief, with the exact steps to prove it.
 */
const CHECKLIST = [
  {
    id: "T1",
    title: "Port Harcourt markets & starter products are loaded",
    task: "Task 1 · Day 1",
    steps: [
      "Open /market-data",
      "Confirm 6 market areas are listed with a polygon each",
      "Confirm 33 sample shops and 82 dictionary products",
      "Open /search?q=generator and /search?q=cement — both return results",
    ],
    expect: "Search works from day one without anyone typing a listing.",
  },
  {
    id: "T2",
    title: "A trader can sign up in under 15 minutes on a phone",
    task: "Task 2 · Day 2",
    steps: [
      "Go to /sell → Start",
      "Step 1: enter 08031234567, send the code (it is shown on screen), tick consent, confirm",
      "Step 2: shop name + who to ask for",
      "Step 3: pick a category",
      "Step 4: pick a market area, tap the map to drop the pin, write a landmark",
      "Step 5: add 5 items using name + price + stock only",
      "Step 6: publish",
    ],
    expect: "Published shop with a QR sticker. Six screens, no long descriptions required.",
  },
  {
    id: "T3",
    title: "Progress survives a customer interruption",
    task: "Task 2 · Day 2",
    steps: [
      "Start a sign-up, fill steps 1–3",
      "Close the browser tab completely",
      "Open /seller/onboard again",
    ],
    expect: "You resume at the step you left, with the details intact.",
  },
  {
    id: "T4",
    title: "Messy product names get cleaned up",
    task: "Task 3 · Day 2",
    steps: [
      "In step 5 (or /seller/items → Add one item), type 'jennerator'",
      "Wait half a second",
      "Pick the suggestion",
    ],
    expect: "The suggestions show clean canonical names with typical prices; 'Did you mean…?' appears for typos.",
  },
  {
    id: "T5",
    title: "Prohibited items are blocked",
    task: "Task 6 · Day 4",
    steps: [
      "Add an item called 'tramadol 500mg'",
      "Try again with 'replica rolex'",
      "Open /admin/moderation",
    ],
    expect: "Both are refused with a plain-English reason and appear in the blocked-attempts log.",
  },
  {
    id: "T6",
    title: "The QR sticker scans to the live shop",
    task: "Task 3 · Day 2",
    steps: [
      "Finish a sign-up, or open /seller/qr",
      "Point a phone camera at the QR code",
    ],
    expect: "The phone opens the public shop page with today's prices and stock.",
  },
  {
    id: "T7",
    title: "10 common items in under 4 minutes",
    task: "Task 4 · Day 3",
    steps: [
      "Open /seller/items?fast=1",
      "Fill in prices for 3–5 of the template items",
      "Leave the rest blank and submit",
    ],
    expect: "Only the filled items are created — blank boxes are skipped. Time yourself: should beat 4 minutes.",
  },
  {
    id: "T8",
    title: "One-tap stock & price changes",
    task: "Task 5 · Day 3",
    steps: [
      "Open /seller/items",
      "Tap 'tap to flip' on any item",
      "Change a price and tap Save",
      "Check /admin/audit",
    ],
    expect: "Stock flips instantly, price saves, and both are recorded in the audit log with before/after values.",
  },
  {
    id: "T9",
    title: "The Daily Tap refreshes five items in one press",
    task: "Task 5 · Day 3",
    steps: [
      "Open /seller/daily-tap",
      "Look at the WhatsApp preview message",
      "Tap '✓ All still available'",
    ],
    expect: "The top 5 items now read 'Confirmed just now' and appear as fresh everywhere.",
  },
  {
    id: "T10",
    title: "Freshness decay is honest to buyers",
    task: "Task 5 · Day 3",
    steps: [
      "Open /admin/freshness",
      "Look at the fresh / aging / stale / hidden split",
      "Open a shop with old items from /admin/sellers",
    ],
    expect: "Old items carry a visible warning ('may have changed'), and items over 14 days are hidden from search by default.",
  },
  {
    id: "T11",
    title: "Verification raises a seller's trust level",
    task: "Task 6 · Day 4",
    steps: [
      "As a seller: /seller/verify → ask for a stall visit",
      "As admin: /admin/verifications → Approve",
      "Open the shop's public page",
    ],
    expect: "The badge upgrades (✓ → ✓✓ → ✓✓✓) and the change is in the audit log.",
  },
  {
    id: "T12",
    title: "Reported listings are handled, not ignored",
    task: "Task 6 · Day 4",
    steps: [
      "Open /admin/reports",
      "On one report click 'Ask to re-confirm'",
      "On another click 'Delist listing' with a reason",
    ],
    expect: "The listing becomes Unconfirmed (and the seller is nudged) or is delisted, with the reason recorded.",
  },
  {
    id: "T13",
    title: "Pin-dropping is caught",
    task: "Task 6 + Task 1",
    steps: [
      "Open /admin/pins",
      "Click 'Run a boundary audit'",
      "Open any flag and click 'Snap pin into …'",
    ],
    expect: "Sellers whose pin sits outside their market are flagged with a distance, and snapping fixes it.",
  },
  {
    id: "T14",
    title: "A field agent can create a shop for a trader",
    task: "Task 7 · Day 5",
    steps: [
      "Open /admin/add-shop",
      "Fill in the shop, market, landmark and a few item names",
      "Submit, then open /admin/sellers",
    ],
    expect: "The shop exists, attributed to the field agent, and its items are marked Unconfirmed until the trader confirms.",
  },
  {
    id: "T15",
    title: "The Freshness Dashboard is usable daily",
    task: "Task 7 · Day 5",
    steps: [
      "Open /admin/freshness",
      "Read freshness per market and per category",
      "Read the zero-result searches and demand posts",
    ],
    expect: "You can name the three shops to call today and the top missing items to recruit.",
  },
  {
    id: "T16",
    title: "Privacy and banned categories are in place",
    task: "Task 8 · Day 5",
    steps: [
      "Open /privacy",
      "Check the consent checkbox on sign-up step 1",
      "Open /admin/moderation",
    ],
    expect: "Plain-English privacy notice, consent cannot be skipped, prohibited list visible and enforced.",
  },
  {
    id: "T17",
    title: "Nothing breaks with bad input",
    task: "Task 10 · Days 6–7",
    steps: [
      "Try a price of 0, then -5, then text",
      "Try a landmark of 'near'",
      "Try searching 'zzzzqqq'",
      "Open /s/does-not-exist",
    ],
    expect: "Every one is refused or shows a helpful empty state. No crash, no blank page.",
  },
];

export default async function TestPlan() {
  const admin = await getAdminSession();
  if (!admin) redirect("/restricted");
  const db = getDB();
  const now = Date.now();
  const live = db.listings.filter((l: any) => l.status !== "delisted");
  const fresh = live.filter((l: any) => freshnessState(l.confirmed_at, now) === "fresh").length;
  const freshPct = live.length ? Math.round((fresh / live.length) * 100) : 0;

  return (
    <main className="wrap">
      <div className="row-between wrapflex" style={{ margin: "22px 0 12px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 27, letterSpacing: "-.03em" }}>Test plan &amp; launch sign-off</h1>
          <p className="muted small" style={{ margin: "5px 0 0" }}>
            17 checks covering every Member 3 acceptance criterion. Work top to bottom.
          </p>
        </div>
        <a className="btn btn-sm" href="#signoff">Jump to sign-off</a>
      </div>

      <div className="card" style={{ background: "var(--green-50)", borderColor: "#c7e9d6" }}>
        <div className="grid grid-3">
          <div className="stat-line"><span className="muted small">Shops in the demo</span><span className="v">{db.sellers.length}</span></div>
          <div className="stat-line"><span className="muted small">Listings</span><span className="v">{live.length}</span></div>
          <div className="stat-line"><span className="muted small">Fresh now</span><span className="v">{freshPct}%</span></div>
        </div>
        <p className="tiny muted mt8 mb0">
          Before you start, reset to clean data: <code>npm run reset</code> then reload the page.
          Admin passcode: <code>finda-admin</code>.
        </p>
      </div>

      <div className="stack mt24">
        {CHECKLIST.map((c) => (
          <div className="card" key={c.id}>
            <div className="row-between wrapflex" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="badge badge-neutral mono">{c.id}</span>
                  <span className="badge badge-blue">{c.task}</span>
                </div>
                <h2 style={{ margin: "9px 0 0", fontSize: 17 }}>{c.title}</h2>
              </div>
            </div>

            <div className="grid grid-2 mt16" style={{ gap: 18 }}>
              <div>
                <div className="tiny b muted mb8">STEPS</div>
                <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
                  {c.steps.map((s) => <li key={s} style={{ marginBottom: 4 }}>{s}</li>)}
                </ol>
              </div>
              <div>
                <div className="tiny b muted mb8">PASS WHEN</div>
                <div className="notice notice-ok small">{c.expect}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-h"><h2>Edge cases the brief calls out</h2><p>Day 6–7 — these are where trust is won or lost</p></div>
      <div className="grid grid-2">
        <div className="card">
          <h3 className="card-title">Internet drops mid-task</h3>
          <p className="small muted mb0">
            In this build, seller edits are single small requests, so a dropped connection just means the button does
            nothing — no half-saved price. Member 2 owns the offline queue (<code>confirmed_at</code> refresh retries on reconnect).
            Test: switch your phone to airplane mode, tap Save, switch back, tap again.
          </p>
        </div>
        <div className="card">
          <h3 className="card-title">A seller ignores a buyer</h3>
          <p className="small muted mb0">
            The buyer must be told plainly after 30 minutes rather than left waiting. Requests live in
            <code> confirm_requests</code> with a <code>state</code> of <code>pending</code>; the 30-minute expiry job is Member 2&apos;s.
            Test: create a request, leave it, confirm the dashboard shows it as waiting.
          </p>
        </div>
        <div className="card">
          <h3 className="card-title">A search finds nothing</h3>
          <p className="small muted mb0">
            Test: <Link href="/search?q=wedding%20cake">/search?q=wedding cake</Link>. You get a real empty state, not a blank
            page — and the query is logged so it shows up in the Freshness Dashboard as a supply gap.
          </p>
        </div>
        <div className="card">
          <h3 className="card-title">A seller types a mess</h3>
          <p className="small muted mb0">
            Test with <code>gen</code>, <code>indomine</code>, <code>simiti</code>, <code>taya</code>, <code>frij</code>, or
            <code> I better pass my neighbour</code>. All of them should return the right products.
          </p>
        </div>
      </div>

      <div className="section-h" id="signoff"><h2>Sign-off</h2><p>Print this or paste it into your team chat</p></div>
      <div className="card card-pad0">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Check</th><th>What it proves</th><th>Pass?</th><th>Tested by / date</th></tr></thead>
            <tbody>
              {CHECKLIST.map((c) => (
                <tr key={c.id}>
                  <td className="b mono tiny">{c.id}</td>
                  <td className="small">{c.title}</td>
                  <td><span className="badge badge-neutral">☐ yes ☐ no</span></td>
                  <td className="tiny muted">________________</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt16">
        <h3 className="card-title">Before launch, also confirm</h3>
        <ul className="small muted" style={{ paddingLeft: 18, margin: "8px 0 0" }}>
          <li>Every P0 item in the PRD that is <em>yours</em> is ticked above.</li>
          <li>One full rehearsal: buyer searches → seller confirms → buyer gets directions.</li>
          <li>Tested on a real budget Android phone over mobile data, not just this laptop.</li>
          <li><code>npm test</code> is green and <code>npm run build</code> succeeds on the branch you are pushing.</li>
          <li>The privacy page is linked from sign-up and the consent box is required.</li>
        </ul>
      </div>

      <div className="btn-row mt24">
        <Link className="btn" href="/">← Home</Link>
        <Link className="btn" href="/admin">Admin centre</Link>
        <Link className="btn" href="/market-data">Market data</Link>
      </div>
    </main>
  );
}

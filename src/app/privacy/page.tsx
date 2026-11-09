import Link from "next/link";

export const metadata = { title: "Privacy notice — Finda" };

/** Task 8 — plain-English privacy notice (NDPA basics). */
export default function Privacy() {
  return (
    <main className="wrap narrow">
      <h1 style={{ margin: "24px 0 6px", fontSize: 26, letterSpacing: "-.03em" }}>Privacy notice</h1>
      <p className="muted small">Plain English. Last updated 9 November 2026.</p>

      <div className="card stack">
        <section>
          <h2 style={{ fontSize: 17, margin: "0 0 6px" }}>What we collect</h2>
          <ul className="small muted" style={{ paddingLeft: 18, margin: 0 }}>
            <li><strong>Your phone number</strong> — it is how you sign in. We never show it to other buyers.</li>
            <li><strong>Your shop details</strong> — shop name, market area, landmark, map pin and your items and prices.</li>
            <li><strong>What you tap</strong> — searches, taps on “Directions”, and confirmations, so we can tell what is working.</li>
          </ul>
        </section>
        <section>
          <h2 style={{ fontSize: 17, margin: "0 0 6px" }}>What we do not do</h2>
          <ul className="small muted" style={{ paddingLeft: 18, margin: 0 }}>
            <li>We do not sell your data.</li>
            <li>We do not show your phone number to buyers until you answer, or they tap “Show number”.</li>
            <li>We do not ask for payments or bank details — Finda does not handle money in v1.</li>
          </ul>
        </section>
        <section>
          <h2 style={{ fontSize: 17, margin: "0 0 6px" }}>Why we collect it</h2>
          <p className="small muted" style={{ margin: 0 }}>
            To show buyers who is nearby with the item they want, to send you the daily one-tap reminder,
            and to keep prices honest. That is it.
          </p>
        </section>
        <section>
          <h2 style={{ fontSize: 17, margin: "0 0 6px" }}>Your rights (NDPA 2023)</h2>
          <p className="small muted" style={{ margin: 0 }}>
            You can ask to see your data, correct it, or delete your account. Deleting your account removes your
            personal details and hides your listings within 30 days. Email or WhatsApp the team, or use the
            delete option in your account settings.
          </p>
        </section>
      </div>

      <div className="notice notice-info mt16">
        Consent is recorded when a seller signs up: the checkbox on step 1 of the seller sign-up must be ticked
        before a shop can be created.
      </div>

      <div className="btn-row mt24">
        <Link className="btn" href="/sell">← Back to opening a shop</Link>
        <Link className="btn" href="/test-plan">Test plan</Link>
      </div>
    </main>
  );
}

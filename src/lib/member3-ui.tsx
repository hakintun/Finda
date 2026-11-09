import Link from "next/link";
import { freshnessLabel, freshnessState, stockLabel, formatNaira, type StockStatus } from "./freshness";

export function StockBadge({ status }: { status: StockStatus | string }) {
  const cls =
    status === "in" ? "badge-in" : status === "low" ? "badge-low" : status === "out" ? "badge-out" : "badge-unknown";
  return <span className={`badge ${cls}`}>{stockLabel(status)}</span>;
}

export function FreshBadge({ confirmedAt, withLabel = true }: { confirmedAt: string; withLabel?: boolean }) {
  const st = freshnessState(confirmedAt);
  return (
    <span className="row small" style={{ gap: 6, color: st === "stale" || st === "expired" ? "var(--red)" : "var(--ink-2)" }}>
      <span className={`dotf dotf-${st}`} aria-hidden="true" />
      {withLabel ? freshnessLabel(confirmedAt) : null}
    </span>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  if (tier === "visit") return <span className="badge badge-verified" title="Field agent visited this stall">✓✓✓ Visited</span>;
  if (tier === "id") return <span className="badge badge-blue" title="Government ID checked">✓✓ ID verified</span>;
  if (tier === "phone") return <span className="badge badge-neutral" title="Phone number confirmed by OTP">✓ Phone verified</span>;
  return <span className="badge badge-neutral">Unverified</span>;
}

export function Price({ kobo, negotiable }: { kobo: number; negotiable?: boolean }) {
  return (
    <span style={{ fontWeight: 750, letterSpacing: "-.02em" }}>
      {formatNaira(kobo)}
      {negotiable ? <span className="tiny muted" style={{ fontWeight: 500 }}> neg.</span> : null}
    </span>
  );
}

export function Kpi({ n, label, detail, tone }: { n: React.ReactNode; label: string; detail?: React.ReactNode; tone?: "warn" | "bad" | "good" }) {
  const color = tone === "warn" ? "var(--amber)" : tone === "bad" ? "var(--red)" : tone === "good" ? "var(--green-700)" : undefined;
  return (
    <div className="kpi">
      <div className="n" style={{ color }}>{n}</div>
      <div className="l">{label}</div>
      {detail ? <div className="d muted">{detail}</div> : null}
    </div>
  );
}

export function PageHead({ title, sub, right }: { title: string; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="row-between wrapflex" style={{ margin: "22px 0 16px", alignItems: "flex-end" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 25, letterSpacing: "-.03em" }}>{title}</h1>
        {sub ? <div className="muted small" style={{ marginTop: 4 }}>{sub}</div> : null}
      </div>
      {right}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="card empty">
      <div className="big" aria-hidden="true">{icon}</div>
      <h3 style={{ margin: "0 0 6px" }}>{title}</h3>
      <div className="muted small">{children}</div>
    </div>
  );
}

export function Tab({
  href, on, children, count,
}: { href: string; on: boolean; children: React.ReactNode; count?: number }) {
  return (
    <Link href={href} className={on ? "on" : ""}>
      {children}
      {count != null ? <span className="count">{count}</span> : null}
    </Link>
  );
}

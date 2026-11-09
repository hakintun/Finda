"use client";

import * as React from "react";
import {
  formatNairaFromKobo,
  getFreshnessInfo,
  normalizeNgPhone,
} from "@/lib/format";
import {
  PORT_HARCOURT_CLUSTERS,
  type ClusterId,
  type FreshnessBucket,
  type StockStatus,
  type VerificationTier,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* 1. Button (>= 44x44px touch target)                                        */
/* -------------------------------------------------------------------------- */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[#065F46] text-white hover:bg-[#064E3B] active:bg-[#022C22] border border-transparent shadow-xs",
  secondary:
    "bg-[#ECFDF5] text-[#065F46] hover:bg-[#D1FAE5] border border-[#A7F3D0]",
  outline:
    "bg-white text-[#111827] hover:bg-[#F3F4F6] border border-[#9CA3AF]",
  ghost: "bg-transparent text-[#374151] hover:bg-[#F3F2EC] border border-transparent",
  danger: "bg-[#991B1B] text-white hover:bg-[#7F1D1D] border border-transparent",
};

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const sizeCls =
    size === "lg"
      ? "min-h-12 min-w-12 px-5 py-3 text-base font-semibold"
      : "min-h-11 min-w-11 px-4 py-2.5 text-sm font-semibold";

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl transition-colors select-none cursor-pointer",
        "disabled:opacity-55 disabled:cursor-not-allowed",
        BUTTON_VARIANTS[variant],
        sizeCls,
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. StockBadge (Non-colour-only: Icon + Border + Text)                      */
/* -------------------------------------------------------------------------- */
export function StockBadge({ status }: { status: StockStatus }) {
  const cfg = {
    in_stock: {
      label: "In stock",
      cls: "bg-[#ECFDF5] text-[#065F46] border border-[#6EE7B7]",
      symbol: "✓",
    },
    low_stock: {
      label: "Low stock",
      cls: "bg-[#FFFBEB] text-[#92400E] border border-[#FCD34D]",
      symbol: "▲",
    },
    out_of_stock: {
      label: "Out of stock",
      cls: "bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]",
      symbol: "✕",
    },
    unconfirmed: {
      label: "Unconfirmed",
      cls: "bg-[#F3F4F6] text-[#374151] border border-dashed border-[#6B7280]",
      symbol: "?",
    },
  }[status];

  return (
    <span
      role="status"
      aria-label={`Stock status: ${cfg.label}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${cfg.cls}`}
    >
      <span aria-hidden="true" className="font-bold">
        {cfg.symbol}
      </span>
      <span>{cfg.label}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. FreshnessTag (Every price must show confirmation age)                   */
/* -------------------------------------------------------------------------- */
export function FreshnessTag({
  confirmedAt,
  now,
}: {
  confirmedAt: Date | string | number | null | undefined;
  now?: Date;
}) {
  const info = getFreshnessInfo(confirmedAt, now);
  const styles: Record<FreshnessBucket, { text: string; dot: string }> = {
    fresh: { text: "text-[#065F46] font-medium", dot: "bg-[#059669]" },
    aging: { text: "text-[#92400E] font-medium", dot: "bg-[#D97706]" },
    stale: { text: "text-[#991B1B] font-medium", dot: "bg-[#DC2626]" },
    expired: { text: "text-[#4B5563] font-medium", dot: "bg-[#6B7280]" },
  };
  const st = styles[info.bucket];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${st.text}`}>
      <span
        aria-hidden="true"
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${st.dot}`}
      />
      <span>{info.label}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. VerificationBadge (Tiers 0–3)                                           */
/* -------------------------------------------------------------------------- */
export function VerificationBadge({ tier }: { tier: VerificationTier }) {
  if (tier === "unverified") return null;
  const meta = {
    phone: {
      marks: "✓",
      label: "Phone verified",
      cls: "bg-[#F3F4F6] text-[#1F2937] border border-[#D1D5DB]",
    },
    id: {
      marks: "✓✓",
      label: "ID verified",
      cls: "bg-[#EFF6FF] text-[#1E40AF] border border-[#93C5FD]",
    },
    visit: {
      marks: "✓✓✓",
      label: "Verified stall",
      cls: "bg-[#ECFDF5] text-[#065F46] border border-[#6EE7B7]",
    },
  }[tier];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}
    >
      <span aria-hidden="true" className="font-bold tracking-tighter">
        {meta.marks}
      </span>
      <span>{meta.label}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. PriceDisplay (Integer kobo -> Naira)                                    */
/* -------------------------------------------------------------------------- */
export function PriceDisplay({
  priceKobo,
  negotiable = false,
  size = "lg",
  className = "",
}: {
  priceKobo: number | bigint;
  negotiable?: boolean;
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const sizeCls =
    size === "xl"
      ? "text-2xl font-extrabold"
      : size === "lg"
      ? "text-lg font-extrabold"
      : "text-base font-bold";

  return (
    <span
      className={`inline-flex flex-wrap items-baseline gap-1.5 tabular-nums text-[#111827] ${className}`}
    >
      <span className={sizeCls}>{formatNairaFromKobo(priceKobo)}</span>
      {negotiable ? (
        <span className="rounded bg-[#F3F2EC] px-1.5 py-0.5 text-[11px] font-medium text-[#4B5563]">
          Negotiable
        </span>
      ) : null}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. PhoneInput (+234 Nigerian default)                                      */
/* -------------------------------------------------------------------------- */
export function PhoneInput({
  value,
  onChange,
  helperText,
}: {
  value: string;
  onChange: (raw: string, normalizedE164: string | null) => void;
  helperText?: string;
}) {
  const normalized = value.trim() ? normalizeNgPhone(value) : null;
  const showError = value.trim().length >= 6 && normalized === null;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="ng-phone"
        className="block text-sm font-semibold text-[#111827]"
      >
        Phone number (WhatsApp or SMS)
      </label>
      <div className="flex min-h-12 items-stretch overflow-hidden rounded-xl border border-[#9CA3AF] bg-white focus-within:border-[#065F46] focus-within:ring-2 focus-within:ring-[#065F46]/25">
        <span className="inline-flex items-center border-r border-[#D1D5DB] bg-[#F3F2EC] px-3 text-sm font-semibold text-[#374151]">
          +234
        </span>
        <input
          id="ng-phone"
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(e) =>
            onChange(e.target.value, normalizeNgPhone(e.target.value))
          }
          placeholder="0803 123 4567"
          className="w-full min-h-12 px-3.5 text-base text-[#111827] focus:outline-none"
        />
      </div>
      {showError ? (
        <p role="alert" className="text-xs font-medium text-[#991B1B]">
          Enter a valid Nigerian mobile number (e.g. 0803 123 4567).
        </p>
      ) : normalized ? (
        <p className="text-xs font-medium text-[#065F46]">
          Ready as {normalized}
        </p>
      ) : helperText ? (
        <p className="text-xs text-[#4B5563]">{helperText}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. ClusterSelector (Port Harcourt Market Areas)                            */
/* -------------------------------------------------------------------------- */
export function ClusterSelector({
  selected,
  onSelect,
}: {
  selected: ClusterId;
  onSelect: (cluster: ClusterId) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Choose your area in Port Harcourt"
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {PORT_HARCOURT_CLUSTERS.map((cluster) => {
        const isActive = cluster.id === selected;
        return (
          <button
            key={cluster.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onSelect(cluster.id)}
            className={[
              "min-h-11 shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer",
              isActive
                ? "bg-[#065F46] text-white shadow-xs"
                : "bg-white text-[#374151] border border-[#D1D5DB] hover:bg-[#F3F2EC]",
            ].join(" ")}
          >
            {cluster.label}
          </button>
        );
      })}
    </div>
  );
}

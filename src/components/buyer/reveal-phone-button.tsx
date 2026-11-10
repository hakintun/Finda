"use client";

import * as React from "react";
import { Button } from "@/components/ui";

export function RevealPhoneButton({
  sellerId,
  sellerName,
  listingId,
  itemTitle,
}: {
  sellerId: string;
  sellerName: string;
  listingId?: string;
  itemTitle?: string;
}) {
  const [loading, setLoading] = React.useState(false);
  const [revealed, setRevealed] = React.useState<{
    phoneE164: string;
    whatsappUrl: string;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleReveal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/buyer/reveal-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId, listingId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Could not reveal phone number right now.");
      } else {
        setRevealed({
          phoneE164: data.phoneE164,
          whatsappUrl: data.whatsappUrl,
        });
      }
    } catch {
      setError("Network interrupted — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (revealed) {
    const waText = encodeURIComponent(
      itemTitle
        ? `Hello ${sellerName}, I saw "${itemTitle}" on Finda. Is it currently in stock?`
        : `Hello ${sellerName}, I found your shop on Finda.`
    );
    return (
      <div className="rounded-xl border border-[#6EE7B7] bg-[#ECFDF5] p-3 space-y-2">
        <p className="text-xs font-bold text-[#065F46]">
          Seller phone: <span className="mono">{revealed.phoneE164}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={`tel:${revealed.phoneE164}`}
            className="btn btn-primary btn-sm"
          >
            📞 Call {revealed.phoneE164}
          </a>
          <a
            href={`${revealed.whatsappUrl}?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-wa btn-sm"
          >
            💬 Chat on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="outline"
        size="md"
        isLoading={loading}
        onClick={handleReveal}
      >
        Show phone number
      </Button>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-[#991B1B]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

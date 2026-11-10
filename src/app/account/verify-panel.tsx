"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { clearClientAuthAndRedirect } from "@/lib/client-session";

type Channel = "email" | "phone" | "whatsapp";

export function VerifyChannelsPanel({
  email,
  phone,
  verifiedChannels,
}: {
  email?: string | null;
  phone?: string | null;
  verifiedChannels: string[];
}) {
  const router = useRouter();
  const [activeChannel, setActiveChannel] = React.useState<Channel | null>(
    null
  );
  const [targetInput, setTargetInput] = React.useState("");
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [otpMeta, setOtpMeta] = React.useState<{
    maskedTarget: string;
    sandboxCode?: string;
    whatsappLink?: string | null;
  } | null>(null);

  async function requestCode(ch: Channel) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_otp",
          channel: ch,
          target: targetInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.message || "Could not send verification code.");
      } else {
        setActiveChannel(ch);
        setOtpMeta(data);
        setCode("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChannel) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_otp",
          channel: activeChannel,
          code,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.message || "Incorrect code.");
      } else {
        setMsg(`✓ ${activeChannel.toUpperCase()} verified successfully!`);
        setActiveChannel(null);
        setOtpMeta(null);
        setTargetInput("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await clearClientAuthAndRedirect("/");
  }

  const rows: { id: Channel; title: string; icon: string; val?: string | null; placeholder: string }[] = [
    {
      id: "email",
      title: "Email Verification",
      icon: "📧",
      val: email,
      placeholder: "Enter email (e.g. name@email.com)",
    },
    {
      id: "phone",
      title: "Phone SMS Verification",
      icon: "📱",
      val: phone,
      placeholder: "Enter phone (e.g. 0803 123 4567)",
    },
    {
      id: "whatsapp",
      title: "WhatsApp Verification",
      icon: "💬",
      val: phone,
      placeholder: "Enter WhatsApp number (e.g. 0803 123 4567)",
    },
  ];

  return (
    <div className="space-y-4">
      {msg ? <div className="notice notice-ok">{msg}</div> : null}
      {err ? <div className="notice notice-err">{err}</div> : null}

      <div className="divide-y divide-[#E5E7EB] rounded-2xl border border-[#E5E7EB] bg-white">
        {rows.map((r) => {
          const isVerified = verifiedChannels.includes(r.id);
          return (
            <div key={r.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span>{r.icon}</span>
                  <span className="text-sm font-bold text-[#111827]">
                    {r.title}
                  </span>
                  {isVerified ? (
                    <span className="badge badge-in">✓ Verified</span>
                  ) : (
                    <span className="badge badge-low">Unverified</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[#4B5563]">
                  {r.val || "No contact saved yet — enter below to verify"}
                </p>
              </div>

              {!isVerified ? (
                <div className="flex flex-wrap items-center gap-2">
                  {!r.val ? (
                    <input
                      type={r.id === "email" ? "email" : "tel"}
                      placeholder={r.placeholder}
                      onChange={(e) => setTargetInput(e.target.value)}
                      className="min-h-10 rounded-xl border border-[#D1D5DB] px-3 text-xs"
                    />
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => requestCode(r.id)}
                    className="btn btn-primary btn-sm"
                  >
                    Verify via {r.id === "phone" ? "SMS" : r.id === "whatsapp" ? "WhatsApp" : "Email"}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {activeChannel && otpMeta ? (
        <form
          onSubmit={submitCode}
          className="rounded-2xl border-2 border-[#064E3B] bg-[#ECFDF5]/60 p-4 space-y-3"
        >
          <p className="text-sm font-bold text-[#111827]">
            Enter the 6-digit code sent via{" "}
            <span className="uppercase">{activeChannel}</span> to{" "}
            {otpMeta.maskedTarget}
          </p>

          {otpMeta.whatsappLink ? (
            <a
              href={otpMeta.whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="btn btn-wa btn-sm"
            >
              💬 Open WhatsApp Verification Message
            </a>
          ) : null}

          {otpMeta.sandboxCode ? (
            <div className="flex items-center justify-between rounded-xl bg-white border border-[#93C5FD] p-2.5 text-xs text-[#1E40AF]">
              <span>
                Sandbox OTP: <strong className="mono">{otpMeta.sandboxCode}</strong>
              </span>
              <button
                type="button"
                onClick={() => setCode(otpMeta.sandboxCode || "")}
                className="rounded bg-[#1E40AF] px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer"
              >
                Auto-fill
              </button>
            </div>
          ) : null}

          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              className="flex-1 text-center font-black tracking-widest"
            />
            <button type="submit" disabled={busy} className="btn btn-primary">
              Confirm Code
            </button>
          </div>
        </form>
      ) : null}

      <div className="pt-2">
        <button
          type="button"
          onClick={handleSignOut}
          className="btn btn-danger btn-sm"
        >
          Sign out of my account
        </button>
      </div>
    </div>
  );
}

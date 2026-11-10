"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TabMode = "login" | "register" | "verify";
type Channel = "email" | "phone" | "whatsapp";

export function AuthClient({
  initialTab = "login",
  initialRole = "buyer",
  nextPath = "",
}: {
  initialTab?: "login" | "register";
  initialRole?: "buyer" | "seller";
  nextPath?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabMode>(initialTab);
  const [role, setRole] = React.useState<"buyer" | "seller">(initialRole);
  const [channel, setChannel] = React.useState<Channel>("whatsapp");

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [otpMeta, setOtpMeta] = React.useState<{
    channel: Channel;
    maskedTarget: string;
    sandboxCode?: string;
    whatsappLink?: string | null;
  } | null>(null);

  function destinationAfterAuth(userRole: string, hasShop?: boolean) {
    if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("/admin")) {
      return nextPath;
    }
    if (userRole === "seller") {
      return hasShop ? "/seller" : "/seller/onboard";
    }
    return "/";
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          name,
          role,
          email: email || undefined,
          phone: phone || undefined,
          password,
          channel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Could not create your account.");
      } else if (data.otp) {
        setOtpMeta(data.otp);
        setTab("verify");
      } else {
        router.push(destinationAfterAuth(data.user.role, false));
        router.refresh();
      }
    } catch {
      setError("Network error — please check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          identifier,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Invalid login details.");
      } else {
        router.push(destinationAfterAuth(data.user.role, data.hasShop));
        router.refresh();
      }
    } catch {
      setError("Network error — please check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpMeta) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_otp",
          channel: otpMeta.channel,
          code: otpCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Invalid verification code.");
      } else {
        router.push(destinationAfterAuth(data.role, data.hasShop));
        router.refresh();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend(nextChannel: Channel) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_otp",
          channel: nextChannel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Could not send code on that channel.");
      } else {
        setChannel(nextChannel);
        setOtpMeta(data);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-[#E4E1D6] bg-white p-6 shadow-md">
      {tab !== "verify" ? (
        <div className="grid grid-cols-2 rounded-xl bg-[#F1EFE7] p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError(null);
            }}
            className={`min-h-10 rounded-lg text-sm font-bold transition ${
              tab === "login"
                ? "bg-white text-[#064E3B] shadow-xs"
                : "text-[#4B5563]"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setError(null);
            }}
            className={`min-h-10 rounded-lg text-sm font-bold transition ${
              tab === "register"
                ? "bg-white text-[#064E3B] shadow-xs"
                : "text-[#4B5563]"
            }`}
          >
            Create account
          </button>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="notice notice-err mb-4">
          {error}
        </div>
      ) : null}

      {/* ---------------- SIGN IN ---------------- */}
      {tab === "login" ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#111827]">
              Sign in to Finda
            </h1>
            <p className="mt-1 text-xs text-[#4B5563]">
              Enter your registered email address or Nigerian phone number.
            </p>
          </div>

          <div className="field">
            <label className="lbl" htmlFor="login-id">
              Email or Phone Number
            </label>
            <input
              id="login-id"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. you@email.com or 0803 123 4567"
              autoComplete="username"
            />
          </div>

          <div className="field">
            <label className="lbl" htmlFor="login-pw">
              Password
            </label>
            <input
              id="login-pw"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-xl bg-[#064E3B] px-4 text-sm font-extrabold text-white hover:bg-[#043927] disabled:opacity-60 cursor-pointer"
          >
            {busy ? "Signing in…" : "SIGN IN"}
          </button>

          <p className="text-center text-xs text-[#4B5563]">
            Don&apos;t have an account yet?{" "}
            <button
              type="button"
              onClick={() => setTab("register")}
              className="font-bold text-[#064E3B] hover:underline cursor-pointer"
            >
              Register now
            </button>
          </p>
        </form>
      ) : null}

      {/* ---------------- REGISTRATION ---------------- */}
      {tab === "register" ? (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#111827]">
              Create your private account
            </h1>
            <p className="mt-1 text-xs text-[#4B5563]">
              Verify instantly via Email, Phone SMS, or WhatsApp.
            </p>
          </div>

          {/* Account Role */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-[#111827]">
              Account type
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("buyer")}
                className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-bold cursor-pointer ${
                  role === "buyer"
                    ? "border-2 border-[#064E3B] bg-[#ECFDF5] text-[#064E3B]"
                    : "border-[#D5D1C4] bg-white text-[#374151]"
                }`}
              >
                🛒 Buyer Account
              </button>
              <button
                type="button"
                onClick={() => setRole("seller")}
                className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-bold cursor-pointer ${
                  role === "seller"
                    ? "border-2 border-[#064E3B] bg-[#ECFDF5] text-[#064E3B]"
                    : "border-[#D5D1C4] bg-white text-[#374151]"
                }`}
              >
                🏪 Seller / Stall
              </button>
            </div>
          </div>

          <div className="field">
            <label className="lbl" htmlFor="reg-name">
              Your Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chinedu Amadi"
              autoComplete="name"
            />
          </div>

          {/* Verification Channel Choice */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-[#111827]">
              How would you like to verify your account?
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "whatsapp", label: "💬 WhatsApp" },
                  { id: "phone", label: "📱 Phone SMS" },
                  { id: "email", label: "📧 Email" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setChannel(opt.id)}
                  className={`min-h-10 rounded-xl border px-2 py-1.5 text-xs font-bold cursor-pointer ${
                    channel === opt.id
                      ? "border-2 border-[#064E3B] bg-[#ECFDF5] text-[#064E3B]"
                      : "border-[#D5D1C4] bg-white text-[#374151]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="lbl" htmlFor="reg-email">
              Email Address{" "}
              {channel === "email" ? "(Required)" : "(Optional — good for backup)"}
            </label>
            <input
              id="reg-email"
              type="email"
              required={channel === "email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label className="lbl" htmlFor="reg-phone">
              Phone / WhatsApp Number{" "}
              {channel !== "email" ? "(Required)" : "(Optional)"}
            </label>
            <input
              id="reg-phone"
              type="tel"
              required={channel !== "email"}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0803 123 4567"
              autoComplete="tel"
            />
          </div>

          <div className="field">
            <label className="lbl" htmlFor="reg-pw">
              Create Password (min. 6 characters)
            </label>
            <input
              id="reg-pw"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-xl bg-[#064E3B] px-4 text-sm font-extrabold text-white hover:bg-[#043927] disabled:opacity-60 cursor-pointer"
          >
            {busy
              ? "Sending verification code…"
              : `REGISTER & VERIFY VIA ${channel.toUpperCase()}`}
          </button>

          <p className="text-center text-[11px] text-[#6B7280]">
            By registering you agree to our{" "}
            <Link href="/privacy" className="text-[#064E3B] underline">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      ) : null}

      {/* ---------------- 6-DIGIT OTP VERIFICATION ---------------- */}
      {tab === "verify" && otpMeta ? (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <span className="inline-flex rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-xs font-bold text-[#065F46]">
              Step 2 of 2 · Verify {otpMeta.channel.toUpperCase()}
            </span>
            <h1 className="mt-2 text-xl font-extrabold text-[#111827]">
              Enter your 6-digit code
            </h1>
            <p className="mt-1 text-xs text-[#4B5563]">
              We sent a 6-digit verification code via{" "}
              <strong className="uppercase">{otpMeta.channel}</strong> to{" "}
              <strong>{otpMeta.maskedTarget}</strong>.
            </p>
          </div>

          {otpMeta.whatsappLink ? (
            <a
              href={otpMeta.whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="btn btn-wa btn-block btn-sm"
            >
              💬 Open Code in WhatsApp
            </a>
          ) : null}

          {otpMeta.sandboxCode ? (
            <div className="rounded-xl border border-[#93C5FD] bg-[#EFF6FF] p-3 text-xs text-[#1E40AF] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold">
                  📨 Instant Verification Code ({otpMeta.channel}):
                </span>
                <button
                  type="button"
                  onClick={() => setOtpCode(otpMeta.sandboxCode || "")}
                  className="rounded bg-[#1E40AF] px-2 py-0.5 text-[11px] font-bold text-white cursor-pointer"
                >
                  Auto-fill {otpMeta.sandboxCode}
                </button>
              </div>
              <p className="text-[11px] opacity-90">
                Shown in sandbox mode when external SMS/SMTP keys aren&apos;t set so
                you can test verification immediately.
              </p>
            </div>
          ) : null}

          <div className="field">
            <label className="lbl" htmlFor="otp-input">
              6-Digit Verification Code
            </label>
            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="123456"
              className="text-center text-xl font-black tracking-[0.3em]"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-xl bg-[#064E3B] px-4 text-sm font-extrabold text-white hover:bg-[#043927] disabled:opacity-60 cursor-pointer"
          >
            {busy ? "Verifying…" : "✓ VERIFY & CONTINUE"}
          </button>

          <div className="border-t border-[#E4E1D6] pt-3 text-center space-y-2">
            <p className="text-xs text-[#4B5563]">
              Prefer another verification channel?
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {(["whatsapp", "phone", "email"] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  disabled={busy}
                  onClick={() => handleResend(ch)}
                  className="rounded-lg border border-[#D5D1C4] bg-white px-2.5 py-1 text-xs font-semibold text-[#374151] hover:border-[#064E3B] cursor-pointer"
                >
                  Send via {ch === "phone" ? "SMS" : ch === "whatsapp" ? "WhatsApp" : "Email"}
                </button>
              ))}
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}

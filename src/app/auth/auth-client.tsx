"use client";

import * as React from "react";
import Link from "next/link";
import {
  completeClientAuthAndNavigate,
  saveClientSessionToken,
} from "@/lib/client-session";

type TabMode = "login" | "register" | "verify";
type LoginMethod = "password" | "otp";
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
  const [tab, setTab] = React.useState<TabMode>(initialTab);
  const [loginMethod, setLoginMethod] = React.useState<LoginMethod>("password");
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
  const [infoNotice, setInfoNotice] = React.useState<string | null>(null);
  const [otpMeta, setOtpMeta] = React.useState<{
    otpId?: string;
    channel: Channel;
    maskedTarget: string;
    sandboxCode?: string;
    whatsappLink?: string | null;
    purpose?: "register" | "login";
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

  async function finishSignIn(path: string, sessionToken?: string | null) {
    await completeClientAuthAndNavigate(path, sessionToken);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfoNotice(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        credentials: "include",
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
      } else {
        if (data.sessionToken) {
          saveClientSessionToken(data.sessionToken);
        }
        if (data.otp) {
          setOtpMeta({ ...data.otp, purpose: "register" });
          setOtpCode("");
          setTab("verify");
        } else {
          await finishSignIn(
            destinationAfterAuth(data.user.role, false),
            data.sessionToken
          );
        }
      }
    } catch {
      setError("Network error — please check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfoNotice(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          identifier,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        // Smooth upgrade path if account was created via Phone/WhatsApp OTP without a password
        if (data.error === "otp_only_account") {
          setLoginMethod("otp");
          setInfoNotice(
            data.message ||
              "This account signs in with a 6-digit verification code. Tap Send Sign-In Code below."
          );
        } else {
          setError(data.message || "Invalid email/phone or password.");
        }
      } else {
        await finishSignIn(
          destinationAfterAuth(data.user.role, data.hasShop),
          data.sessionToken
        );
      }
    } catch {
      setError("Network error — please check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function handleOtpLoginRequest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfoNotice(null);
    try {
      const autoChannel: Channel = identifier.includes("@") ? "email" : channel;
      const res = await fetch("/api/auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_login_otp",
          identifier,
          channel: autoChannel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Could not send sign-in code.");
      } else {
        setOtpMeta({ ...data.otp, purpose: "login" });
        setOtpCode("");
        setTab("verify");
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
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_otp",
          otpId: otpMeta.otpId,
          channel: otpMeta.channel,
          code: otpCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Invalid verification code.");
      } else {
        await finishSignIn(
          destinationAfterAuth(data.role, data.hasShop),
          data.sessionToken
        );
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
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_otp",
          channel: nextChannel,
          identifier: otpMeta?.purpose === "login" ? identifier : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Could not send code on that channel.");
      } else {
        setChannel(nextChannel);
        setOtpMeta({
          ...(data.otp || data),
          purpose: otpMeta?.purpose || "register",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-[#DEDBD0] bg-white p-6 shadow-md">
      {tab !== "verify" ? (
        <div className="grid grid-cols-2 rounded-xl bg-[#F3F2EC] p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError(null);
              setInfoNotice(null);
            }}
            className={`min-h-10 rounded-lg text-sm font-bold transition cursor-pointer ${
              tab === "login"
                ? "bg-white text-[#065F46] shadow-xs"
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
              setInfoNotice(null);
            }}
            className={`min-h-10 rounded-lg text-sm font-bold transition cursor-pointer ${
              tab === "register"
                ? "bg-white text-[#065F46] shadow-xs"
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

      {infoNotice ? (
        <div role="status" className="notice notice-info mb-4">
          {infoNotice}
        </div>
      ) : null}

      {/* ---------------- SIGN IN (Password OR 6-Digit Code) ---------------- */}
      {tab === "login" ? (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#111827]">
              Sign in to Finda
            </h1>
            <p className="mt-1 text-xs text-[#4B5563]">
              Sign in with your password or an instant 6-digit code via WhatsApp,
              SMS, or Email.
            </p>
          </div>

          {/* Login Method Switcher */}
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#DEDBD0] bg-[#FAF9F5] p-1">
            <button
              type="button"
              onClick={() => {
                setLoginMethod("password");
                setError(null);
              }}
              className={`min-h-9 rounded-lg px-2 text-xs font-bold transition cursor-pointer ${
                loginMethod === "password"
                  ? "bg-[#065F46] text-white"
                  : "text-[#374151] hover:text-[#111827]"
              }`}
            >
              🔑 With Password
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod("otp");
                setError(null);
              }}
              className={`min-h-9 rounded-lg px-2 text-xs font-bold transition cursor-pointer ${
                loginMethod === "otp"
                  ? "bg-[#065F46] text-white"
                  : "text-[#374151] hover:text-[#111827]"
              }`}
            >
              📲 With 6-Digit Code
            </button>
          </div>

          {loginMethod === "password" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
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
                  placeholder="e.g. you@email.com or 0803 000 0000"
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
                className="min-h-12 w-full rounded-xl bg-[#065F46] px-4 text-sm font-extrabold text-white hover:bg-[#064E3B] disabled:opacity-60 cursor-pointer"
              >
                {busy ? "Signing in…" : "SIGN IN"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpLoginRequest} className="space-y-4">
              <div className="field">
                <label className="lbl" htmlFor="otp-login-id">
                  Registered Email or Phone Number
                </label>
                <input
                  id="otp-login-id"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 0803 000 0000 or you@email.com"
                  autoComplete="username"
                />
              </div>

              {!identifier.includes("@") ? (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-[#111827]">
                    Send 6-digit code via
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: "whatsapp", label: "💬 WhatsApp" },
                        { id: "phone", label: "📱 SMS" },
                        { id: "email", label: "📧 Email" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setChannel(opt.id)}
                        className={`min-h-9 rounded-xl border px-2 py-1 text-xs font-bold cursor-pointer ${
                          channel === opt.id
                            ? "border-2 border-[#065F46] bg-[#ECFDF5] text-[#065F46]"
                            : "border-[#CFC9BA] bg-white text-[#374151]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="min-h-12 w-full rounded-xl bg-[#065F46] px-4 text-sm font-extrabold text-white hover:bg-[#064E3B] disabled:opacity-60 cursor-pointer"
              >
                {busy ? "Sending code…" : "SEND 6-DIGIT SIGN-IN CODE"}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-[#4B5563]">
            Don&apos;t have an account yet?{" "}
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setError(null);
              }}
              className="font-bold text-[#065F46] hover:underline cursor-pointer"
            >
              Create account
            </button>
          </p>
        </div>
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
                    ? "border-2 border-[#065F46] bg-[#ECFDF5] text-[#065F46]"
                    : "border-[#CFC9BA] bg-white text-[#374151]"
                }`}
              >
                🛒 Buyer Account
              </button>
              <button
                type="button"
                onClick={() => setRole("seller")}
                className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-bold cursor-pointer ${
                  role === "seller"
                    ? "border-2 border-[#065F46] bg-[#ECFDF5] text-[#065F46]"
                    : "border-[#CFC9BA] bg-white text-[#374151]"
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
              placeholder="Enter your full name"
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
                      ? "border-2 border-[#065F46] bg-[#ECFDF5] text-[#065F46]"
                      : "border-[#CFC9BA] bg-white text-[#374151]"
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
              {channel === "email"
                ? "(Required)"
                : "(Optional — good for backup)"}
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
              placeholder="e.g. 0803 000 0000"
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
            className="min-h-12 w-full rounded-xl bg-[#065F46] px-4 text-sm font-extrabold text-white hover:bg-[#064E3B] disabled:opacity-60 cursor-pointer"
          >
            {busy
              ? "Sending verification code…"
              : `REGISTER & VERIFY VIA ${channel.toUpperCase()}`}
          </button>

          <p className="text-center text-[11px] text-[#6B7280]">
            By registering you agree to our{" "}
            <Link href="/privacy" className="text-[#065F46] underline">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      ) : null}

      {/* ---------------- 6-DIGIT OTP VERIFICATION ---------------- */}
      {tab === "verify" && otpMeta ? (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-xs font-bold text-[#065F46]">
              {otpMeta.purpose === "login"
                ? `Sign-In Code · ${otpMeta.channel.toUpperCase()}`
                : `Step 2 of 2 · Verify ${otpMeta.channel.toUpperCase()}`}
            </span>
            <button
              type="button"
              onClick={() => {
                setTab(otpMeta.purpose === "login" ? "login" : "register");
                setError(null);
              }}
              className="text-xs font-bold text-[#6B7280] hover:text-[#111827] cursor-pointer"
            >
              ← Back
            </button>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-[#111827]">
              Enter your 6-digit code
            </h1>
            <p className="mt-1 text-xs text-[#4B5563]">
              We sent a 6-digit code via{" "}
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
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">
                  📨 Instant Verification Code ({otpMeta.channel}):
                </span>
                <button
                  type="button"
                  onClick={() => setOtpCode(otpMeta.sandboxCode || "")}
                  className="rounded bg-[#1E40AF] px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer"
                >
                  Auto-fill {otpMeta.sandboxCode}
                </button>
              </div>
              <p className="text-[11px] opacity-90">
                Shown in sandbox mode when external SMS/SMTP keys aren&apos;t set
                so you can verify immediately.
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
            className="min-h-12 w-full rounded-xl bg-[#065F46] px-4 text-sm font-extrabold text-white hover:bg-[#064E3B] disabled:opacity-60 cursor-pointer"
          >
            {busy
              ? "Verifying…"
              : otpMeta.purpose === "login"
              ? "✓ VERIFY & SIGN IN"
              : "✓ VERIFY & CONTINUE"}
          </button>

          <div className="border-t border-[#E5E2D9] pt-3 text-center space-y-2">
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
                  className="rounded-lg border border-[#CFC9BA] bg-white px-2.5 py-1 text-xs font-semibold text-[#374151] hover:border-[#065F46] cursor-pointer"
                >
                  Send via{" "}
                  {ch === "phone"
                    ? "SMS"
                    : ch === "whatsapp"
                    ? "WhatsApp"
                    : "Email"}
                </button>
              ))}
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}

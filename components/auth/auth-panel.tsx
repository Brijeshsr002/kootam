"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Audience = "member" | "organizer";
type Mode = "login" | "signup";

// Phone OTP needs an SMS provider (and DLT registration in India). Until it is
// set up in Supabase, members sign in with Google or email instead.
const PHONE_AUTH = process.env.NEXT_PUBLIC_PHONE_AUTH_ENABLED === "true";

const inputClass = "w-full rounded-lg border border-border px-3 py-2.5 text-base outline-none focus:border-brand";
const primaryButton =
  "w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-brand-foreground disabled:cursor-not-allowed disabled:opacity-60";

export function AuthPanel({ mode, initialAudience, next }: { mode: Mode; initialAudience: Audience; next?: string }) {
  const [audience, setAudience] = useState<Audience>(initialAudience);

  return (
    <div className="mx-auto w-full max-w-sm space-y-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{mode === "login" ? "Log in" : "Create your account"}</h1>
        <p className="text-sm text-muted">
          {mode === "login" ? "New here? " : "Already have an account? "}
          <Link
            href={`${mode === "login" ? "/signup" : "/login"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-medium text-brand"
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </Link>
        </p>
      </div>

      <div role="tablist" className="grid grid-cols-2 rounded-lg bg-surface p-1 text-sm">
        {(["member", "organizer"] as const).map((a) => (
          <button
            key={a}
            role="tab"
            aria-selected={audience === a}
            onClick={() => setAudience(a)}
            className={`rounded-md py-2 font-medium ${audience === a ? "bg-background shadow-sm" : "text-muted"}`}
          >
            {a === "member" ? "I'm joining events" : "I run a community"}
          </button>
        ))}
      </div>

      <GoogleButton mode={mode} audience={audience} next={next} />

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      {audience === "member" && PHONE_AUTH ? (
        <PhoneOtpForm next={next} />
      ) : (
        <EmailPasswordForm mode={mode} audience={audience} next={next} />
      )}
    </div>
  );
}

function continueUrl(next?: string) {
  return `/auth/redirect${next ? `?next=${encodeURIComponent(next)}` : ""}`;
}

function GoogleButton({ mode, audience, next }: { mode: Mode; audience: Audience; next?: string }) {
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    const params = new URLSearchParams();
    if (next) params.set("next", next);
    if (mode === "signup" && audience === "organizer") params.set("intent", "organizer");
    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?${params}` },
    });
    if (error) setError("Google sign-in is not available right now.");
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={signIn}
        className="w-full rounded-lg border border-border px-4 py-2.5 font-medium hover:bg-surface"
      >
        Continue with Google
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function PhoneOtpForm({ next }: { next?: string }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const e164 = `+91${phone}`;

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter a valid 10-digit mobile number.");
    setBusy(true);
    setError(null);
    const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({ phone: e164 });
    setBusy(false);
    if (error) return setError("Could not send the code. Please try again in a minute.");
    setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createSupabaseBrowserClient().auth.verifyOtp({ phone: e164, token: code, type: "sms" });
    if (error) {
      setBusy(false);
      return setError("That code is incorrect or has expired.");
    }
    window.location.assign(continueUrl(next));
  }

  if (!sent) {
    return (
      <form onSubmit={sendCode} className="space-y-3">
        <label className="block space-y-1 text-sm font-medium">
          Mobile number
          <div className="flex">
            <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-surface px-3 text-muted">
              +91
            </span>
            <input
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className={`${inputClass} rounded-l-none`}
              placeholder="98765 43210"
              required
            />
          </div>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className={primaryButton}>
          {busy ? "Sending…" : "Send OTP"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-3">
      <label className="block space-y-1 text-sm font-medium">
        Enter the 6-digit code sent to +91 {phone}
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className={`${inputClass} tracking-widest`}
          required
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={busy || code.length !== 6} className={primaryButton}>
        {busy ? "Verifying…" : "Verify & continue"}
      </button>
      <button type="button" onClick={() => setSent(false)} className="w-full text-sm text-muted">
        Change number
      </button>
    </form>
  );
}

function EmailPasswordForm({ mode, audience, next }: { mode: Mode; audience: Audience; next?: string }) {
  const home = audience === "organizer" ? "/host" : "/me";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { requested_role: audience === "organizer" ? "ORGANIZER" : "MEMBER", full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next ?? home)}`,
        },
      });
      setBusy(false);
      if (error) return setError(error.message);
      if (!data.session) return setCheckEmail(true);
      return window.location.assign(continueUrl(next ?? home));
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      return setError("Incorrect email or password.");
    }
    window.location.assign(continueUrl(next));
  }

  if (checkEmail) {
    return (
      <p className="rounded-lg bg-surface p-4 text-sm">
        We sent a confirmation link to <strong>{email}</strong>. Open it to activate your account.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {mode === "signup" && (
        <label className="block space-y-1 text-sm font-medium">
          Your name
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </label>
      )}
      <label className="block space-y-1 text-sm font-medium">
        Email
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          required
        />
      </label>
      <label className="block space-y-1 text-sm font-medium">
        Password
        <input
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          required
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={busy} className={primaryButton}>
        {busy ? "Please wait…" : mode === "signup" ? (audience === "organizer" ? "Create organiser account" : "Create account") : "Log in"}
      </button>
    </form>
  );
}

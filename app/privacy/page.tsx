import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Kootam collects, why, and how to delete your data.",
  alternates: { canonical: "/privacy" },
};

// Plain-language notice written for India's Digital Personal Data Protection Act, 2023.
// Have it reviewed by a lawyer before scaling.
export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 leading-relaxed">
      <h1 className="text-3xl font-bold">Privacy</h1>
      <p className="text-sm text-muted">Last updated 25 October 2026</p>
      <h2 className="pt-2 text-xl font-semibold">What we collect</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Your name, and the phone number or email you log in with.</li>
        <li>The communities you join and the events you register for, including check-in time.</li>
        <li>Basic technical logs (pages, errors) to keep the service running and secure.</li>
      </ul>
      <h2 className="pt-2 text-xl font-semibold">Why</h2>
      <p>
        To let you join events, show organisers who is coming and who checked in, and run the service. We don&apos;t sell your
        data or show ads.
      </p>
      <h2 className="pt-2 text-xl font-semibold">Who sees it</h2>
      <p>
        Organisers of an event see your name, ticket number and check-in status for that event. They don&apos;t see your phone
        number or email through Kootam. Our hosting providers (Supabase, Vercel) process data on our behalf.
      </p>
      <h2 className="pt-2 text-xl font-semibold">Your rights</h2>
      <p>
        You can correct your name in your profile at any time. To get a copy of your data, or to delete your account and data,
        email us and we&apos;ll act within 30 days.
      </p>
      <h2 className="pt-2 text-xl font-semibold">Contact</h2>
      <p>Grievance officer / contact: hello@kootam.example (replace with your real address before launch).</p>
    </article>
  );
}

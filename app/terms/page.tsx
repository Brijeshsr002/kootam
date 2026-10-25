import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "The rules for using Kootam as an attendee or organiser.",
  alternates: { canonical: "/terms" },
};

// Starter terms. Have them reviewed by a lawyer before paid tickets launch.
export default function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 leading-relaxed">
      <h1 className="text-3xl font-bold">Terms</h1>
      <p className="text-sm text-muted">Last updated 25 October 2026</p>
      <ol className="list-decimal space-y-3 pl-5">
        <li>
          <strong>What Kootam is.</strong> A tool that helps community organisers publish events and manage registrations.
          Organisers run their own events and are responsible for them, including safety, venue permissions and what happens on
          the day.
        </li>
        <li>
          <strong>Organisers</strong> must give accurate event details, keep the guest list private, and not use attendee data
          for anything other than running their community.
        </li>
        <li>
          <strong>Attendees</strong> should cancel if they can&apos;t make it, so the spot goes to someone on the waitlist.
          Organisers may remove people who repeatedly don&apos;t show up or break community rules.
        </li>
        <li>
          <strong>Physical activity</strong> carries risk. Join at your own risk and within your fitness level. Kootam is not
          the organiser of any event.
        </li>
        <li>
          <strong>Not allowed:</strong> fake events, spam, harassment, or illegal activity. We may suspend accounts or
          communities that break these terms.
        </li>
        <li>
          <strong>Paid tickets</strong>, when available, will show the full price including Kootam&apos;s fee before payment,
          with the refund policy on each event page.
        </li>
        <li>
          <strong>Changes.</strong> We may update these terms and will show the date above.
        </li>
      </ol>
    </article>
  );
}

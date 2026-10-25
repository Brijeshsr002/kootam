import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CommunityForm } from "@/components/community-form";
import { createCommunity } from "@/app/actions/host";
import { getSessionUser } from "@/lib/auth/session";
import { getCategories, getCities, getHostedCommunity } from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "Start your community",
  description:
    "Put your run club, pickleball group, bootcamp or trek club on Kootam. One link for RSVPs, automatic waitlists and QR check-in. Free.",
  alternates: { canonical: "/start" },
};

export default async function StartPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <section className="mx-auto w-full max-w-3xl space-y-6 px-4 py-16">
        <h1 className="text-4xl font-bold tracking-tight">Run your group without the WhatsApp chaos</h1>
        <ul className="space-y-2 text-lg text-muted">
          <li>✓ One link for every event, with no Google Forms</li>
          <li>✓ Spot limits with an automatic waitlist</li>
          <li>✓ QR check-in, so you know who really showed up</li>
          <li>✓ A public page for your community that people can find on Google</li>
        </ul>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup?as=organizer" className="rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground">
            Create an organiser account
          </Link>
          <Link href="/login?as=organizer&next=/start" className="rounded-full border border-border px-6 py-3 font-medium">
            I have an account
          </Link>
        </div>
        <p className="text-sm text-muted">Free for free events. Takes about 2 minutes.</p>
      </section>
    );
  }

  if (await getHostedCommunity(user.id)) redirect("/host");
  const [cities, categories] = await Promise.all([getCities(), getCategories()]);

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create your community</h1>
        <p className="mt-1 text-muted">You can change everything except the link later.</p>
      </div>
      <CommunityForm action={createCommunity} cities={cities} categories={categories} submitLabel="Create community" />
    </section>
  );
}

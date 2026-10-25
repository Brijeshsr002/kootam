import { OG_SIZE, ogCard } from "@/lib/og";
import { SITE_TAGLINE } from "@/lib/site";

export const alt = "Kootam: run clubs, pickleball and sports meetups near you";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ eyebrow: "Coimbatore · Bengaluru · Chennai", title: SITE_TAGLINE, footer: "Your people, every week" });
}

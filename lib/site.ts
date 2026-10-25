import { appUrl } from "@/lib/env";

export const SITE_NAME = "Kootam";
export const SITE_TAGLINE = "Run clubs, pickleball, fitness and sports meetups near you";
export const SITE_DESCRIPTION =
  "Find run clubs, pickleball games, gym bootcamps, cycling rides and treks in Coimbatore, Bengaluru and Chennai. Organisers get RSVPs, waitlists and QR check-in in one shareable link.";

export function absoluteUrl(path: string): string {
  return new URL(path, appUrl()).toString();
}

export function communityPath(slug: string): string {
  return `/c/${slug}`;
}

export function eventPath(communitySlug: string, eventSlug: string): string {
  return `/c/${communitySlug}/${eventSlug}`;
}

/** WhatsApp share intent with pre-filled text. */
export function whatsappShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

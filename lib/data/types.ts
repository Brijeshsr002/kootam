// Row shapes as the app reads them. Keep in step with supabase/migrations.
import type { EventStatus, RegistrationStatus } from "@/lib/events/state";

export type Pricing = "FREE" | "PAID" | "DEPOSIT";

export type City = { id: string; name: string; slug: string };
export type Category = { id: string; name: string; slug: string };

export type Community = {
  id: string;
  owner_id: string;
  category_id: string;
  city_id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  instagram_handle: string | null;
  whatsapp_group_url: string | null;
  visibility: "PUBLIC" | "UNLISTED";
  status: "ACTIVE" | "SUSPENDED";
  payout_status: "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED";
  created_at: string;
};

export type EventRow = {
  id: string;
  community_id: string;
  city_id: string;
  title: string;
  slug: string;
  description: string | null;
  venue_name: string | null;
  venue_address: string | null;
  maps_url: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  pricing: Pricing;
  price: number;
  waitlist_enabled: boolean;
  registration_closes_at: string | null;
  status: EventStatus;
  cancelled_reason: string | null;
  updated_at: string;
};

export type Registration = {
  id: string;
  event_id: string;
  user_id: string;
  ticket_number: string;
  check_in_token: string;
  status: RegistrationStatus;
  checked_in_at: string | null;
  created_at: string;
};

export type EventStats = { seats_taken: number; waitlisted: number };

export type GuestRow = {
  registration_id: string;
  name: string;
  status: RegistrationStatus;
  ticket_number: string;
  checked_in_at: string | null;
  registered_at: string;
};

export type CheckInResult = {
  result: "CHECKED_IN" | "ALREADY_CHECKED_IN" | "NOT_CONFIRMED" | "WRONG_EVENT" | "TICKET_NOT_FOUND";
  name?: string;
  ticket_number?: string;
  event_id?: string;
  event_title?: string;
  status?: RegistrationStatus;
};

export const EVENT_COLUMNS =
  "id, community_id, city_id, title, slug, description, venue_name, venue_address, maps_url, starts_at, ends_at, capacity, pricing, price, waitlist_enabled, registration_closes_at, status, cancelled_reason, updated_at";

export const COMMUNITY_COLUMNS =
  "id, owner_id, category_id, city_id, name, slug, tagline, description, instagram_handle, whatsapp_group_url, visibility, status, payout_status, created_at";

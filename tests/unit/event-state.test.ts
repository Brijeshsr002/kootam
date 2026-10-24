import { describe, expect, it } from "vitest";
import {
  EVENT_STATUSES,
  REGISTRATION_STATUSES,
  canTransitionEvent,
  canTransitionRegistration,
  isTerminalRegistrationStatus,
  type EventStatus,
  type RegistrationStatus,
} from "@/lib/events/state";

const EVENT_ALLOWED: Array<[EventStatus, EventStatus]> = [
  ["DRAFT", "PUBLISHED"],
  ["DRAFT", "CANCELLED"],
  ["PUBLISHED", "CANCELLED"],
  ["PUBLISHED", "COMPLETED"],
];

const REGISTRATION_ALLOWED: Array<[RegistrationStatus, RegistrationStatus]> = [
  ["PENDING_PAYMENT", "CONFIRMED"],
  ["PENDING_PAYMENT", "CANCELLED"],
  ["WAITLISTED", "PENDING_PAYMENT"],
  ["WAITLISTED", "CONFIRMED"],
  ["WAITLISTED", "CANCELLED"],
  ["CONFIRMED", "CHECKED_IN"],
  ["CONFIRMED", "CANCELLED"],
  ["CONFIRMED", "NO_SHOW"],
];

describe("event state machine", () => {
  it("allows exactly the transitions in the spec", () => {
    for (const from of EVENT_STATUSES) {
      for (const to of EVENT_STATUSES) {
        const expected = EVENT_ALLOWED.some(([f, t]) => f === from && t === to);
        expect(canTransitionEvent(from, to), `${from} → ${to}`).toBe(expected);
      }
    }
  });
});

describe("registration state machine", () => {
  it("allows exactly the transitions in the spec", () => {
    for (const from of REGISTRATION_STATUSES) {
      for (const to of REGISTRATION_STATUSES) {
        const expected = REGISTRATION_ALLOWED.some(([f, t]) => f === from && t === to);
        expect(canTransitionRegistration(from, to), `${from} → ${to}`).toBe(expected);
      }
    }
  });

  it("treats checked-in, no-show and cancelled as terminal", () => {
    expect(isTerminalRegistrationStatus("CHECKED_IN")).toBe(true);
    expect(isTerminalRegistrationStatus("NO_SHOW")).toBe(true);
    expect(isTerminalRegistrationStatus("CANCELLED")).toBe(true);
    expect(isTerminalRegistrationStatus("WAITLISTED")).toBe(false);
  });
});

// All money is integer minor units (paise). No floating-point arithmetic on amounts.

/** `percentage` of an amount in paise, rounded half up. Up to 2 decimals (e.g. 2.5). */
export function percentageOf(amountPaise: number, percentage: number): number {
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 0) {
    throw new RangeError("amountPaise must be a non-negative integer");
  }
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new RangeError("percentage must be between 0 and 100");
  }
  const basisPoints = Math.round(percentage * 100); // 4% → 400 bps
  // Integer numerator; round half up to the nearest paisa.
  return Math.floor((amountPaise * basisPoints + 5000) / 10000);
}

/**
 * Kootam's fee, added on top of the ticket and paid by the attendee.
 * Free tickets never carry a fee; paid ones pay at least `minPaise`.
 */
export function platformFee(ticketPaise: number, percentage: number, minPaise = 0): number {
  if (!Number.isSafeInteger(minPaise) || minPaise < 0) {
    throw new RangeError("minPaise must be a non-negative integer");
  }
  const fee = percentageOf(ticketPaise, percentage);
  return ticketPaise === 0 ? 0 : Math.max(fee, minPaise);
}

/** The amounts stored on a registration: the organiser's share, our fee, and what the attendee pays. */
export function ticketTotals(ticketPaise: number, percentage: number, minPaise = 0) {
  const fee = platformFee(ticketPaise, percentage, minPaise);
  return { ticketAmount: ticketPaise, platformFee: fee, totalAmount: ticketPaise + fee };
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** ₹299 or ₹299.50 — for display only. */
export function formatINR(paise: number): string {
  const hasFraction = paise % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

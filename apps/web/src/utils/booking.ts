// Booking status helpers and rental date utilities for UI screens.
import type { BookingStatus } from "../api";

export const bookingStatuses: BookingStatus[] = [
  "PLACED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RETURN_PICKUP",
  "COMPLETED",
  "CANCELLED"
];

export function formatStatus(status: string) {
  return status
    .split("_")
    .map((item) => item.charAt(0) + item.slice(1).toLowerCase())
    .join(" ");
}

export function getRentalDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return 1;
  }

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 1;
  }

  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
}

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

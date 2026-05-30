// Request typing for authenticated users and customers.
import type { AccessStatus, BookingStatus, UserRole } from "@prisma/client";
import type { Request } from "express";

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
  email: string;
  name: string;
  accessStatus: AccessStatus;
};

export type AuthenticatedCustomer = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
};

export type UserRequest = Request & {
  user?: AuthenticatedUser;
};

export type CustomerRequest = Request & {
  customer?: AuthenticatedCustomer;
};

export type BookingStatusValue = BookingStatus;

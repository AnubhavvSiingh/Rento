// Customer auth, profile, dashboard, and review services.
import { compare, hash } from "bcryptjs";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../middleware/errorHandler.js";
import {
  bookingIncludes,
  createCustomerSession,
  mapBooking,
  sanitizeCustomer
} from "./rentoHelpers.js";

export async function registerCustomer(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const existingCustomer = await prisma.customer.findUnique({ where: { email: input.email } });

  if (existingCustomer) {
    throw new ApiError(409, "This customer email already exists. Please sign in.");
  }

  const passwordHash = await hash(input.password, 10);
  const customer = await prisma.customer.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash
    }
  });
  const token = await createCustomerSession(customer.id);

  return { token, customer: sanitizeCustomer(customer) };
}

export async function loginCustomer(input: { email: string; password: string }) {
  const customer = await prisma.customer.findUnique({ where: { email: input.email } });

  if (!customer || !(await compare(input.password, customer.passwordHash))) {
    throw new ApiError(401, "Invalid customer email or password.");
  }

  const token = await createCustomerSession(customer.id);

  return { token, customer: sanitizeCustomer(customer) };
}

export async function getCustomerDashboard(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      notifications: { orderBy: { createdAt: "desc" } },
      reviews: {
        include: { product: true },
        orderBy: { createdAt: "desc" }
      },
      bookings: {
        include: bookingIncludes(),
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!customer) {
    throw new ApiError(404, "Customer not found.");
  }

  return {
    customer: sanitizeCustomer(customer),
    bookings: customer.bookings.map(mapBooking),
    notifications: customer.notifications,
    reviews: customer.reviews.map((review) => ({
      id: review.id,
      bookingId: review.bookingId,
      productId: review.productId,
      productName: review.product.name,
      customerEmail: customer.email,
      rating: review.rating,
      comment: review.comment,
      conditionNote: review.conditionNote ?? "",
      createdAt: review.createdAt
    }))
  };
}

export async function createReview(
  customerId: string,
  bookingId: string,
  input: { rating: number; comment: string; conditionNote: string }
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { product: true }
  });

  if (!booking || booking.customerId !== customerId) {
    throw new ApiError(404, "Booking not found.");
  }

  const review = await prisma.review.upsert({
    where: { bookingId },
    update: {
      rating: input.rating,
      comment: input.comment,
      conditionNote: input.conditionNote
    },
    create: {
      bookingId,
      productId: booking.productId,
      customerId,
      rating: input.rating,
      comment: input.comment,
      conditionNote: input.conditionNote
    }
  });

  return {
    ...review,
    bookingId: review.bookingId,
    productName: booking.product.name
  };
}

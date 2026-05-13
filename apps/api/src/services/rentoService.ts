import type {
  AccessStatus,
  BookingStatus,
  Category,
  ListingStatus,
  ProductCondition,
  UserRole
} from "@prisma/client";
import { compare, hash } from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../middleware/errorHandler.js";
import { createSessionToken, createTrackingCode, hashSessionToken } from "../utils/tokens.js";

const sessionTtlHours = Number(process.env.SESSION_TTL_HOURS ?? 24 * 7);

export async function checkHealth() {
  await prisma.$queryRaw`SELECT 1`;
  return { status: "ok", database: "connected" };
}

export async function getOverview() {
  const [listedProducts, groupedCities, groupedHosts, pendingAdvertisers] =
    await Promise.all([
      prisma.product.count({ where: { status: "APPROVED" } }),
      prisma.product.groupBy({ by: ["city"], where: { status: "APPROVED" } }),
      prisma.product.groupBy({ by: ["owner"], where: { status: "APPROVED" } }),
      prisma.user.count({ where: { role: "ADVERTISER", accessStatus: "PENDING" } })
    ]);

  return {
    brand: "Rento",
    positioning:
      "A rental-first marketplace for modern living, temporary ownership, and underused products.",
    audiences: [
      "City movers",
      "Budget-conscious families",
      "Wedding and event shoppers",
      "Influencers and creators"
    ],
    stats: {
      listedProducts,
      activeHosts: groupedHosts.length,
      cities: groupedCities.length,
      averageSavingsPercent: 61,
      pendingAdvertisers
    }
  };
}

export async function listProducts() {
  const products = await prisma.product.findMany({
    include: productIncludes(),
    orderBy: { name: "asc" }
  });

  return products.map(mapProduct);
}

export async function registerAdvertiser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });

  if (existingUser) {
    throw new ApiError(409, "This login ID already exists.");
  }

  const passwordHash = await hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "ADVERTISER",
      accessStatus: "PENDING",
      provider: "LOCAL"
    }
  });

  return sanitizeUser(user);
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user?.passwordHash || !(await compare(input.password, user.passwordHash))) {
    throw new ApiError(401, "Invalid login credentials.");
  }

  if (user.accessStatus !== "APPROVED") {
    throw new ApiError(
      403,
      user.accessStatus === "PENDING"
        ? "Your advertiser access is waiting for admin approval."
        : "Your access has been suspended by admin."
    );
  }

  const token = createSessionToken();
  await prisma.session.create({
    data: {
      token: hashSessionToken(token),
      expiresAt: expiresAt(),
      userId: user.id
    }
  });

  return { token, user: sanitizeUser(user) };
}

export async function getAdvertiserStatus(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.role !== "ADVERTISER") {
    throw new ApiError(404, "Advertiser account not found.");
  }

  return {
    email: user.email,
    accessStatus: user.accessStatus
  };
}

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

export async function createBooking(
  customerId: string,
  input: {
    productId: string;
    shipment: {
      addressLine1: string;
      addressLine2: string;
      city: string;
      state: string;
      postalCode: string;
      shipmentDate: Date;
      rentalStartDate: Date;
      rentalEndDate: Date;
      deliveryInstructions: string;
      conditionPhotoUrl: string;
    };
    payment: {
      method: string;
      reference: string;
    };
  }
) {
  const product = await prisma.product.findUnique({ where: { id: input.productId } });

  if (!product || product.status !== "APPROVED") {
    throw new ApiError(404, "This product is not available for rental.");
  }

  const days = getRentalDays(input.shipment.rentalStartDate, input.shipment.rentalEndDate);
  const totalAmount = days * product.dailyRate + product.deposit;
  const booking = await prisma.booking.create({
    data: {
      customerId,
      productId: product.id,
      dailyRate: product.dailyRate,
      deposit: product.deposit,
      totalAmount,
      payment: {
        create: {
          method: input.payment.method,
          reference: input.payment.reference || `PAY-${Date.now().toString().slice(-6)}`,
          amount: totalAmount,
          status: "PAID"
        }
      },
      shipment: {
        create: {
          ...input.shipment,
          trackingCode: createTrackingCode()
        }
      }
    },
    include: bookingIncludes()
  });

  await createNotification(
    customerId,
    "Order placed",
    `Your rental order for ${product.name} is confirmed. We will email the shipment tracking link shortly.`
  );

  return mapBooking(booking);
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

export async function getHostDashboard(user: { id: string; name: string }) {
  const listings = await prisma.product.findMany({
    where: {
      OR: [{ ownerId: user.id }, { owner: user.name }]
    },
    include: {
      ...productIncludes(),
      bookings: {
        include: bookingIncludes(),
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { name: "asc" }
  });
  const totalListings = listings.length;
  const verifiedListings = listings.filter((listing) => listing.condition === "Verified").length;
  const activeRentals = listings.reduce(
    (total, listing) =>
      total +
      listing.bookings.filter((booking) => booking.status !== "COMPLETED").length,
    0
  );
  const monthlyRevenue = listings.reduce(
    (total, listing) =>
      total + listing.bookings.reduce((sum, booking) => sum + booking.totalAmount, 0),
    0
  );
  const utilizationRate =
    totalListings === 0 ? 0 : Math.round((activeRentals / Math.max(totalListings, 1)) * 100);
  const listingPerformance = listings.map((listing) => {
    const bookedDays = listing.bookings.reduce((total, booking) => {
      if (!booking.shipment) {
        return total;
      }
      return total + getRentalDays(booking.shipment.rentalStartDate, booking.shipment.rentalEndDate);
    }, 0);
    const revenueGenerated = listing.bookings.reduce(
      (total, booking) => total + booking.totalAmount,
      0
    );
    const upkeepCost = Math.max(600, Math.round(listing.deposit * 0.18));
    const roiPercent = Math.max(
      0,
      Math.round(((revenueGenerated - upkeepCost) / upkeepCost) * 100)
    );

    return {
      productId: listing.id,
      name: listing.name,
      views: 120 + listing.bookings.length * 45,
      inquiries: Math.max(0, listing.bookings.length * 3),
      bookedDays,
      revenueGenerated,
      upkeepCost,
      roiPercent
    };
  });
  const portfolioRevenue = listingPerformance.reduce(
    (total, item) => total + item.revenueGenerated,
    0
  );
  const portfolioCost = listingPerformance.reduce((total, item) => total + item.upkeepCost, 0);
  const roiTrend = Array.from({ length: 6 }, (_unused, index) => ({
    label: `W${index + 1}`,
    revenue:
      Math.max(0, Math.round((portfolioRevenue || 2400) * (0.4 + index * 0.13))) +
      index * 220,
    cost:
      Math.max(0, Math.round((portfolioCost || 900) * (0.45 + index * 0.08))) +
      index * 70
  }));

  return {
    summary: {
      totalListings,
      activeRentals,
      monthlyRevenue,
      utilizationRate,
      verifiedListings
    },
    actions: [
      "Add product photos",
      "Set seasonal pricing",
      "Block unavailable dates",
      "Review pending bookings"
    ],
    listings: listings.map(mapProduct),
    bookings: listings.flatMap((listing) => listing.bookings.map(mapBooking)),
    performance: {
      portfolioRevenue,
      portfolioCost,
      portfolioRoiPercent:
        portfolioCost === 0
          ? 0
          : Math.round(((portfolioRevenue - portfolioCost) / portfolioCost) * 100),
      listingPerformance,
      roiTrend
    }
  };
}

export async function createAdvertiserProduct(
  user: { id: string; name: string },
  input: {
    name: string;
    category: string;
    city: string;
    dailyRate: number;
    deposit: number;
    description: string;
    tags: string[];
    imageUrls: string[];
  }
) {
  const product = await prisma.product.create({
    data: {
      id: `prd-${crypto.randomUUID().slice(0, 8)}`,
      name: input.name,
      category: normalizeCategory(input.category),
      city: input.city,
      dailyRate: input.dailyRate,
      deposit: input.deposit,
      owner: user.name,
      ownerId: user.id,
      condition: "Good",
      description: input.description,
      tags: input.tags,
      status: "PENDING",
      images: {
        create: input.imageUrls.map((url, index) => ({
          url,
          sortOrder: index
        }))
      }
    },
    include: productIncludes()
  });

  return mapProduct(product);
}

export async function getAdminDashboard() {
  const [advertisers, products, bookings] = await Promise.all([
    prisma.user.findMany({
      where: { role: "ADVERTISER" },
      orderBy: { createdAt: "desc" }
    }),
    prisma.product.findMany({
      include: productIncludes(),
      orderBy: { createdAt: "desc" }
    }),
    prisma.booking.findMany({
      include: bookingIncludes(),
      orderBy: { createdAt: "desc" }
    })
  ]);

  return {
    summary: {
      totalAdvertisers: advertisers.length,
      approved: advertisers.filter((user) => user.accessStatus === "APPROVED").length,
      pending: advertisers.filter((user) => user.accessStatus === "PENDING").length,
      suspended: advertisers.filter((user) => user.accessStatus === "SUSPENDED").length
    },
    advertisers: advertisers.map(sanitizeUser),
    products: products.map(mapProduct),
    bookings: bookings.map(mapBooking)
  };
}

export async function updateAdvertiserAccess(userId: string, accessStatus: AccessStatus) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { accessStatus }
  });

  return sanitizeUser(user);
}

export async function updateProductStatus(productId: string, status: ListingStatus) {
  const product = await prisma.product.update({
    where: { id: productId },
    data: { status },
    include: productIncludes()
  });

  return mapProduct(product);
}

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
    include: bookingIncludes()
  });

  await createNotification(
    booking.customerId,
    "Shipment update",
    `${booking.product.name} is now ${formatStatus(status).toLowerCase()}.`
  );

  return mapBooking(booking);
}

function productIncludes() {
  return {
    images: { orderBy: { sortOrder: "asc" as const } },
    reviews: true
  };
}

function bookingIncludes() {
  return {
    product: { include: productIncludes() },
    customer: true,
    payment: true,
    shipment: true,
    review: true
  };
}

async function createCustomerSession(customerId: string) {
  const token = createSessionToken();
  await prisma.customerSession.create({
    data: {
      token: hashSessionToken(token),
      expiresAt: expiresAt(),
      customerId
    }
  });

  return token;
}

async function createNotification(customerId: string, title: string, message: string) {
  return prisma.notification.create({
    data: {
      customerId,
      title,
      message
    }
  });
}

function sanitizeUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accessStatus: AccessStatus;
  provider: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accessStatus: user.accessStatus,
    provider: user.provider,
    createdAt: user.createdAt
  };
}

function sanitizeCustomer(customer: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: Date;
}) {
  return {
    id: customer.id,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    createdAt: customer.createdAt
  };
}

function mapProduct(product: {
  id: string;
  name: string;
  city: string;
  category: Category;
  dailyRate: number;
  deposit: number;
  owner: string;
  ownerId?: string | null;
  condition: ProductCondition;
  description: string;
  tags: string[];
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
  images?: Array<{ url: string }>;
  reviews?: Array<{ rating: number }>;
}) {
  const reviews = product.reviews ?? [];
  const averageRating =
    reviews.length === 0
      ? 0
      : reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;

  return {
    ...product,
    images: product.images?.map((image) => image.url) ?? [],
    averageRating,
    reviewCount: reviews.length
  };
}

function mapBooking(booking: {
  id: string;
  productId: string;
  customerId: string;
  dailyRate: number;
  deposit: number;
  totalAmount: number;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
  product: { id: string; name: string; category: Category; dailyRate: number; deposit: number };
  customer: { fullName: string; email: string; phone: string };
  payment: { method: string; reference: string; amount: number; status: string } | null;
  shipment: {
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    shipmentDate: Date;
    rentalStartDate: Date;
    rentalEndDate: Date;
    deliveryInstructions: string | null;
    conditionPhotoUrl: string | null;
    trackingCode: string;
  } | null;
}) {
  return {
    id: booking.id,
    productId: booking.productId,
    productName: booking.product.name,
    productCategory: booking.product.category,
    dailyRate: booking.dailyRate,
    deposit: booking.deposit,
    customerName: booking.customer.fullName,
    customerEmail: booking.customer.email,
    customerPhone: booking.customer.phone,
    status: booking.status,
    paymentStatus: booking.payment?.status ?? "PAID",
    trackingCode: booking.shipment?.trackingCode ?? "",
    totalAmount: booking.totalAmount,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    payment: booking.payment,
    shippingDetails: {
      addressLine1: booking.shipment?.addressLine1 ?? "",
      addressLine2: booking.shipment?.addressLine2 ?? "",
      city: booking.shipment?.city ?? "",
      state: booking.shipment?.state ?? "",
      postalCode: booking.shipment?.postalCode ?? "",
      shipmentDate: toDateInput(booking.shipment?.shipmentDate),
      rentalStartDate: toDateInput(booking.shipment?.rentalStartDate),
      rentalEndDate: toDateInput(booking.shipment?.rentalEndDate),
      deliveryInstructions: booking.shipment?.deliveryInstructions ?? "",
      conditionPhotoUrl: booking.shipment?.conditionPhotoUrl ?? "",
      paymentMethod: booking.payment?.method ?? "",
      paymentReference: booking.payment?.reference ?? ""
    }
  };
}

function normalizeCategory(category: string): Category {
  const allowedCategories = [
    "Furniture",
    "Appliances",
    "Fashion",
    "Ceremony",
    "Electronics"
  ] as const;

  return allowedCategories.includes(category as Category) ? (category as Category) : "Furniture";
}

function expiresAt() {
  return new Date(Date.now() + sessionTtlHours * 60 * 60 * 1000);
}

function getRentalDays(startDate: Date, endDate: Date) {
  if (endDate <= startDate) {
    return 1;
  }

  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000));
}

function toDateInput(value: Date | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((item) => item.charAt(0) + item.slice(1).toLowerCase())
    .join(" ");
}

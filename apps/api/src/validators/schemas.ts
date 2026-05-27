import { ApiError } from "../middleware/errorHandler.js";

const categories = ["Furniture", "Appliances", "Fashion", "Ceremony", "Electronics"] as const;
const accessStatuses = ["PENDING", "APPROVED", "SUSPENDED"] as const;
const listingStatuses = ["PENDING", "APPROVED", "SUSPENDED"] as const;
const bookingStatuses = [
  "PLACED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RETURN_PICKUP",
  "COMPLETED",
  "CANCELLED"
] as const;
const qaStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;
const pricingRuleTypes = ["WEEKDAY", "WEEKEND", "SEASONAL", "DEMAND"] as const;
const discountTypes = ["PERCENT", "FIXED"] as const;
const contentTypes = ["HERO", "FAQ", "POLICY", "BANNER"] as const;
const analyticsEventTypes = [
  "PAGE_VIEW",
  "PRODUCT_VIEW",
  "CHECKOUT_START",
  "BOOKING_COMPLETE"
] as const;
const daysOfWeek = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export function assertRegisterAdvertiser(body: unknown) {
  const value = objectBody(body);
  const name = stringField(value, "name");
  const email = emailField(value, "email");
  const password = stringField(value, "password");

  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters.");
  }

  return { name, email, password };
}

export function assertLogin(body: unknown) {
  const value = objectBody(body);
  return {
    email: emailField(value, "email"),
    password: stringField(value, "password")
  };
}

export function assertCustomerRegister(body: unknown) {
  const value = objectBody(body);
  const password = stringField(value, "password");

  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters.");
  }

  return {
    fullName: stringField(value, "fullName"),
    email: emailField(value, "email"),
    phone: stringField(value, "phone"),
    password
  };
}

export function assertProduct(body: unknown) {
  const value = objectBody(body);
  const category = enumField(value, "category", categories);
  const leadTimeDays = optionalIntField(value, "leadTimeDays");
  const bufferDays = optionalIntField(value, "bufferDays");
  const minPhotoCount = optionalIntField(value, "minPhotoCount");

  return {
    name: stringField(value, "name"),
    category,
    city: stringField(value, "city"),
    dailyRate: positiveIntField(value, "dailyRate"),
    deposit: nonNegativeIntField(value, "deposit"),
    description: stringField(value, "description"),
    tags: stringArrayFromMaybeCsv(value.tags),
    imageUrls: stringArrayFromMaybeCsv(value.imageUrls),
    leadTimeDays,
    bufferDays,
    minPhotoCount
  };
}

export function assertBooking(body: unknown) {
  const value = objectBody(body);
  const shipmentDate = dateField(value, "shipmentDate");
  const rentalStartDate = dateField(value, "rentalStartDate");
  const rentalEndDate = dateField(value, "rentalEndDate");

  if (rentalEndDate < rentalStartDate) {
    throw new ApiError(400, "rentalEndDate must be the same as or after rentalStartDate.");
  }

  if (shipmentDate > rentalStartDate) {
    throw new ApiError(400, "shipmentDate should be on or before rentalStartDate.");
  }

  return {
    productId: stringField(value, "productId"),
    shipment: {
      addressLine1: stringField(value, "addressLine1"),
      addressLine2: optionalStringField(value, "addressLine2"),
      city: stringField(value, "city"),
      state: stringField(value, "state"),
      postalCode: stringField(value, "postalCode"),
      shipmentDate,
      rentalStartDate,
      rentalEndDate,
      deliveryInstructions: optionalStringField(value, "deliveryInstructions"),
      conditionPhotoUrl: optionalStringField(value, "conditionPhotoUrl")
    },
    payment: {
      method: stringField(value, "paymentMethod"),
      reference: optionalStringField(value, "paymentReference")
    },
    promoCode: optionalStringField(value, "promoCode")
  };
}

export function assertReview(body: unknown) {
  const value = objectBody(body);
  const rating = positiveIntField(value, "rating");

  if (rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5.");
  }

  return {
    rating,
    comment: stringField(value, "comment"),
    conditionNote: optionalStringField(value, "conditionNote")
  };
}

export function assertAccessStatus(body: unknown) {
  const value = objectBody(body);
  return enumField(value, "accessStatus", accessStatuses);
}

export function assertListingStatus(body: unknown) {
  const value = objectBody(body);
  return enumField(value, "status", listingStatuses);
}

export function assertBookingStatus(body: unknown) {
  const value = objectBody(body);
  return enumField(value, "status", bookingStatuses);
}

export function assertAvailabilityBlock(body: unknown) {
  const value = objectBody(body);
  const startDate = dateField(value, "startDate");
  const endDate = dateField(value, "endDate");

  if (endDate < startDate) {
    throw new ApiError(400, "endDate must be the same as or after startDate.");
  }

  return {
    productId: stringField(value, "productId"),
    startDate,
    endDate,
    reason: optionalStringField(value, "reason")
  };
}

export function assertPricingRule(body: unknown) {
  const value = objectBody(body);
  const type = enumField(value, "type", pricingRuleTypes);
  const days = enumArrayField(value, "daysOfWeek", daysOfWeek);

  return {
    productId: stringField(value, "productId"),
    label: stringField(value, "label"),
    type,
    multiplier: optionalNumberField(value, "multiplier"),
    fixedDailyRate: optionalIntField(value, "fixedDailyRate"),
    startDate: optionalDateField(value, "startDate"),
    endDate: optionalDateField(value, "endDate"),
    daysOfWeek: days,
    demandThreshold: optionalIntField(value, "demandThreshold"),
    isActive: optionalBooleanField(value, "isActive")
  };
}

export function assertQaUpdate(body: unknown) {
  const value = objectBody(body);
  return {
    qaStatus: enumField(value, "qaStatus", qaStatuses),
    qaNotes: optionalStringField(value, "qaNotes")
  };
}

export function assertContentBlock(body: unknown) {
  const value = objectBody(body);
  return {
    key: stringField(value, "key"),
    title: stringField(value, "title"),
    body: stringField(value, "body"),
    type: enumField(value, "type", contentTypes),
    isPublished: optionalBooleanField(value, "isPublished")
  };
}

export function assertContentUpdate(body: unknown) {
  const value = objectBody(body);
  return {
    title: stringField(value, "title"),
    body: stringField(value, "body"),
    type: enumField(value, "type", contentTypes),
    isPublished: optionalBooleanField(value, "isPublished")
  };
}

export function assertPromoCampaign(body: unknown) {
  const value = objectBody(body);
  const startsAt = dateField(value, "startsAt");
  const endsAt = dateField(value, "endsAt");

  if (endsAt < startsAt) {
    throw new ApiError(400, "endsAt must be the same as or after startsAt.");
  }

  return {
    code: stringField(value, "code").toUpperCase(),
    description: stringField(value, "description"),
    discountType: enumField(value, "discountType", discountTypes),
    value: positiveIntField(value, "value"),
    startsAt,
    endsAt,
    minOrderAmount: optionalIntField(value, "minOrderAmount"),
    usageLimit: optionalIntField(value, "usageLimit"),
    isActive: optionalBooleanField(value, "isActive")
  };
}

export function assertReferralCode(body: unknown) {
  const value = objectBody(body);
  return {
    code: stringField(value, "code").toUpperCase(),
    rewardAmount: positiveIntField(value, "rewardAmount"),
    isActive: optionalBooleanField(value, "isActive")
  };
}

export function assertAnalyticsEvent(body: unknown) {
  const value = objectBody(body);
  return {
    eventType: enumField(value, "eventType", analyticsEventTypes),
    sessionId: optionalStringField(value, "sessionId"),
    customerId: optionalStringField(value, "customerId"),
    productId: optionalStringField(value, "productId"),
    metadata:
      value.metadata && typeof value.metadata === "object"
        ? (value.metadata as Record<string, unknown>)
        : null
  };
}

function objectBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "A valid request body is required.");
  }

  return body as Record<string, unknown>;
}

function stringField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `${key} is required.`);
  }

  return value.trim();
}

function optionalStringField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function emailField(body: Record<string, unknown>, key: string) {
  const value = stringField(body, key).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new ApiError(400, "A valid email is required.");
  }

  return value;
}

function positiveIntField(body: Record<string, unknown>, key: string) {
  const value = Number(body[key]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new ApiError(400, `${key} must be a positive number.`);
  }

  return value;
}

function nonNegativeIntField(body: Record<string, unknown>, key: string) {
  const value = Number(body[key]);
  if (!Number.isInteger(value) || value < 0) {
    throw new ApiError(400, `${key} must be zero or more.`);
  }

  return value;
}

function dateField(body: Record<string, unknown>, key: string) {
  const value = stringField(body, key);
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${key} must be a valid date.`);
  }

  return date;
}

function optionalNumberField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    throw new ApiError(400, `${key} must be a number.`);
  }

  return numeric;
}

function optionalIntField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0) {
    throw new ApiError(400, `${key} must be a whole number.`);
  }

  return numeric;
}

function optionalBooleanField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "false") {
    return value === "true";
  }

  throw new ApiError(400, `${key} must be true or false.`);
}

function optionalDateField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (!value) {
    return null;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${key} must be a valid date.`);
  }

  return date;
}

function enumField<const T extends readonly string[]>(
  body: Record<string, unknown>,
  key: string,
  values: T
): T[number] {
  const value = stringField(body, key);

  if (!values.includes(value)) {
    throw new ApiError(400, `${key} must be one of: ${values.join(", ")}.`);
  }

  return value;
}

function enumArrayField<const T extends readonly string[]>(
  body: Record<string, unknown>,
  key: string,
  values: T
) {
  const list = stringArrayFromMaybeCsv(body[key]);
  const invalid = list.filter((item) => !values.includes(item as T[number]));

  if (invalid.length > 0) {
    throw new ApiError(400, `${key} must be one of: ${values.join(", ")}.`);
  }

  return list as T[number][];
}

function stringArrayFromMaybeCsv(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

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
  "COMPLETED"
] as const;

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

  return {
    name: stringField(value, "name"),
    category,
    city: stringField(value, "city"),
    dailyRate: positiveIntField(value, "dailyRate"),
    deposit: nonNegativeIntField(value, "deposit"),
    description: stringField(value, "description"),
    tags: stringArrayFromMaybeCsv(value.tags),
    imageUrls: stringArrayFromMaybeCsv(value.imageUrls)
  };
}

export function assertBooking(body: unknown) {
  const value = objectBody(body);

  return {
    productId: stringField(value, "productId"),
    shipment: {
      addressLine1: stringField(value, "addressLine1"),
      addressLine2: optionalStringField(value, "addressLine2"),
      city: stringField(value, "city"),
      state: stringField(value, "state"),
      postalCode: stringField(value, "postalCode"),
      shipmentDate: dateField(value, "shipmentDate"),
      rentalStartDate: dateField(value, "rentalStartDate"),
      rentalEndDate: dateField(value, "rentalEndDate"),
      deliveryInstructions: optionalStringField(value, "deliveryInstructions"),
      conditionPhotoUrl: optionalStringField(value, "conditionPhotoUrl")
    },
    payment: {
      method: stringField(value, "paymentMethod"),
      reference: optionalStringField(value, "paymentReference")
    }
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

function stringArrayFromMaybeCsv(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

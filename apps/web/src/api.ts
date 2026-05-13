const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
export const apiBaseUrl = viteEnv?.VITE_API_BASE_URL ?? "http://localhost:4000";

export type ListingStatus = "PENDING" | "APPROVED" | "SUSPENDED";
export type BookingStatus =
  | "PLACED"
  | "PACKED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RETURN_PICKUP"
  | "COMPLETED";

export type Product = {
  id: string;
  name: string;
  city: string;
  category: string;
  dailyRate: number;
  deposit: number;
  description: string;
  owner?: string;
  ownerId?: string | null;
  status: ListingStatus;
  images: string[];
  averageRating: number;
  reviewCount: number;
};

export type Overview = {
  brand: string;
  positioning: string;
  audiences: string[];
  stats: {
    listedProducts: number;
    activeHosts: number;
    cities: number;
    averageSavingsPercent: number;
    pendingAdvertisers?: number;
  };
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "ADVERTISER";
  accessStatus: "PENDING" | "APPROVED" | "SUSPENDED";
  createdAt: string;
};

export type CustomerProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt?: string;
};

export type ShippingDetails = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  shipmentDate: string;
  rentalStartDate: string;
  rentalEndDate: string;
  deliveryInstructions: string;
  conditionPhotoUrl: string;
  paymentMethod: string;
  paymentReference: string;
};

export type Booking = {
  id: string;
  productId: string;
  productName: string;
  productCategory: string;
  dailyRate: number;
  deposit: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingDetails: ShippingDetails;
  status: BookingStatus;
  paymentStatus: "PAID" | "REFUNDED";
  trackingCode: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type Review = {
  id: string;
  bookingId: string;
  productId: string;
  productName: string;
  customerEmail: string;
  rating: number;
  comment: string;
  conditionNote: string;
  createdAt: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  readAt?: string | null;
  createdAt: string;
};

export type HostDashboard = {
  summary: {
    totalListings: number;
    activeRentals: number;
    monthlyRevenue: number;
    utilizationRate: number;
    verifiedListings: number;
  };
  actions: string[];
  listings: Product[];
  bookings: Booking[];
  performance: {
    portfolioRevenue: number;
    portfolioCost: number;
    portfolioRoiPercent: number;
    listingPerformance: Array<{
      productId: string;
      name: string;
      views: number;
      inquiries: number;
      bookedDays: number;
      revenueGenerated: number;
      upkeepCost: number;
      roiPercent: number;
    }>;
    roiTrend: Array<{
      label: string;
      revenue: number;
      cost: number;
    }>;
  };
};

export type AdminDashboard = {
  summary: {
    totalAdvertisers: number;
    approved: number;
    pending: number;
    suspended: number;
  };
  advertisers: User[];
  products: Product[];
  bookings: Booking[];
};

export type CustomerDashboard = {
  customer: CustomerProfile;
  bookings: Booking[];
  notifications: NotificationItem[];
  reviews: Review[];
};

export type ApiResponse<T> = {
  ok: boolean;
  status: number;
  data: T;
};

export type ApiMessage = {
  message?: string;
};

export type AuthResponse = ApiMessage & {
  token?: string;
  user?: User;
};

export type CustomerAuthResponse = ApiMessage & {
  token?: string;
  customer?: CustomerProfile;
};

export type RegisterAdvertiserPayload = {
  name: string;
  email: string;
  password: string;
};

export type RegisterCustomerPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AdvertiserProductPayload = {
  name: string;
  category: string;
  city: string;
  dailyRate: number;
  deposit: number;
  description: string;
  tags: string;
  imageUrls: string;
};

export type BookingPayload = ShippingDetails & {
  productId: string;
};

export type ReviewPayload = {
  rating: number;
  comment: string;
  conditionNote: string;
};

export async function getMarketplace() {
  const [overview, products] = await Promise.all([
    apiRequest<Overview>("/api/overview"),
    apiRequest<Product[]>("/api/products")
  ]);

  if (!overview.ok || !products.ok) {
    throw new Error("Unable to load marketplace data.");
  }

  return {
    overview: overview.data,
    products: products.data
  };
}

export function getAuthenticatedUser(token: string) {
  return apiRequest<{ user: User }>("/api/auth/me", {
    headers: authHeaders(token)
  });
}

export function getHostDashboard(token: string) {
  return apiRequest<HostDashboard>("/api/host-dashboard", {
    headers: authHeaders(token)
  });
}

export function getAdminDashboard(token: string) {
  return apiRequest<AdminDashboard>("/api/admin/dashboard", {
    headers: authHeaders(token)
  });
}

export function getAdvertiserApprovalStatus(email: string) {
  return apiRequest<{ email: string; accessStatus: User["accessStatus"] }>(
    `/api/auth/advertiser-status?email=${encodeURIComponent(email)}`
  );
}

export function registerAdvertiserAccount(payload: RegisterAdvertiserPayload) {
  return apiRequest<ApiMessage & { user?: User }>("/api/auth/register-advertiser", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload)
  });
}

export function loginAccount(payload: LoginPayload) {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload)
  });
}

export function registerCustomerAccount(payload: RegisterCustomerPayload) {
  return apiRequest<CustomerAuthResponse>("/api/customers/register", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload)
  });
}

export function loginCustomerAccount(payload: LoginPayload) {
  return apiRequest<CustomerAuthResponse>("/api/customers/login", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload)
  });
}

export function getCustomerProfile(token: string) {
  return apiRequest<{ customer: CustomerProfile }>("/api/customers/me", {
    headers: authHeaders(token)
  });
}

export function getCustomerDashboard(token: string) {
  return apiRequest<CustomerDashboard>("/api/customers/dashboard", {
    headers: authHeaders(token)
  });
}

export function createBooking(token: string, payload: BookingPayload) {
  return apiRequest<ApiMessage & { booking?: Booking }>("/api/bookings", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function saveReview(token: string, bookingId: string, payload: ReviewPayload) {
  return apiRequest<ApiMessage & { review?: Review }>(`/api/bookings/${bookingId}/review`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function createAdvertiserProduct(
  token: string,
  payload: AdvertiserProductPayload
) {
  return apiRequest<ApiMessage & { product?: Product }>("/api/advertiser/products", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function updateAdvertiserAccessStatus(
  token: string,
  userId: string,
  accessStatus: User["accessStatus"]
) {
  return apiRequest<ApiMessage & { user?: User }>(`/api/admin/users/${userId}/access`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ accessStatus })
  });
}

export function updateProductStatus(
  token: string,
  productId: string,
  status: ListingStatus
) {
  return apiRequest<ApiMessage & { product?: Product }>(`/api/admin/products/${productId}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status })
  });
}

export function updateBookingStatus(
  token: string,
  bookingId: string,
  status: BookingStatus
) {
  return apiRequest<ApiMessage & { booking?: Booking }>(`/api/admin/bookings/${bookingId}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status })
  });
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  const data = (await response.json().catch(() => ({}))) as T;

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

function jsonHeaders() {
  return {
    "Content-Type": "application/json"
  };
}

function authHeaders(token: string) {
  return {
    ...jsonHeaders(),
    Authorization: `Bearer ${token}`
  };
}

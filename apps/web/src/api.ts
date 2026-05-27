const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
export const apiBaseUrl = viteEnv?.VITE_API_BASE_URL ?? "http://localhost:4000";

export type ListingStatus = "PENDING" | "APPROVED" | "SUSPENDED";
export type BookingStatus =
  | "PLACED"
  | "PACKED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RETURN_PICKUP"
  | "COMPLETED"
  | "CANCELLED";

export type QaStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PricingRuleType = "WEEKDAY" | "WEEKEND" | "SEASONAL" | "DEMAND";
export type ContentType = "HERO" | "FAQ" | "POLICY" | "BANNER";
export type DiscountType = "PERCENT" | "FIXED";
export type AnalyticsEventType =
  | "PAGE_VIEW"
  | "PRODUCT_VIEW"
  | "CHECKOUT_START"
  | "BOOKING_COMPLETE";
export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export type AvailabilityBlock = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
};

export type PricingRule = {
  id: string;
  label: string;
  type: PricingRuleType;
  multiplier?: number | null;
  fixedDailyRate?: number | null;
  startDate?: string;
  endDate?: string;
  daysOfWeek: DayOfWeek[];
  demandThreshold?: number | null;
  isActive: boolean;
};

export type ImageDetail = {
  url: string;
  qualityScore: number;
  autoTags: string[];
  isPrimary: boolean;
};

export type PhotoQuality = {
  photoCount: number;
  averageScore: number;
  minScore: number;
  meetsMinimum: boolean;
};

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
  condition?: string;
  tags?: string[];
  status: ListingStatus;
  images: string[];
  imageDetails?: ImageDetail[];
  qaStatus: QaStatus;
  qaNotes?: string;
  leadTimeDays: number;
  bufferDays: number;
  minPhotoCount: number;
  hostVerified: boolean;
  damageReports: number;
  photoQuality?: PhotoQuality;
  availabilityBlocks?: AvailabilityBlock[];
  pricingRules?: PricingRule[];
  pricingRulesCount?: number;
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
    pendingQaListings?: number;
    verifiedHosts?: number;
    activePromos?: number;
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
  returnScheduledAt?: string;
  paymentMethod: string;
  paymentReference: string;
};

export type TrackingEvent = {
  status: BookingStatus;
  message: string;
  occurredAt: string;
};

export type Booking = {
  id: string;
  productId: string;
  productName: string;
  productCategory: string;
  dailyRate: number;
  deposit: number;
  promoCode?: string;
  discountAmount?: number;
  priceBreakdown?: Record<string, unknown> | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingDetails: ShippingDetails;
  status: BookingStatus;
  paymentStatus: "PAID" | "REFUNDED";
  trackingCode: string;
  totalAmount: number;
  trackingEvents?: TrackingEvent[];
  createdAt: string;
  updatedAt: string;
};

export type ContentBlock = {
  id: string;
  key: string;
  title: string;
  body: string;
  type: ContentType;
  isPublished: boolean;
  updatedAt: string;
  createdAt: string;
};

export type PromoCampaign = {
  id: string;
  code: string;
  description: string;
  discountType: DiscountType;
  value: number;
  startsAt: string;
  endsAt: string;
  minOrderAmount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  isActive: boolean;
};

export type ReferralCode = {
  id: string;
  code: string;
  rewardAmount: number;
  usageCount: number;
  isActive: boolean;
};

export type RiskSummary = {
  cancelledBookings: number;
  highDamageListings: Array<{ productId: string; name: string; damageReports: number }>;
  suspiciousOrders: Array<{ bookingId: string; productName: string; totalAmount: number; reason: string }>;
};

export type AnalyticsSummary = {
  totalSessions: number;
  productViews: number;
  checkoutStarts: number;
  bookingCompletions: number;
  conversionRate: number;
  retentionRate: number;
  averageLtv: number;
  utilizationRate: number;
};

export type AuditLog = {
  id: string;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
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
    pendingQaListings?: number;
  };
  advertisers: User[];
  products: Product[];
  bookings: Booking[];
  risk?: RiskSummary;
  contentBlocks?: ContentBlock[];
  promoCampaigns?: PromoCampaign[];
  referralCodes?: ReferralCode[];
  analytics?: AnalyticsSummary;
  recentAuditLogs?: AuditLog[];
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
  leadTimeDays?: number;
  bufferDays?: number;
  minPhotoCount?: number;
};

export type BookingPayload = ShippingDetails & {
  productId: string;
  promoCode?: string;
};

export type AvailabilityBlockPayload = {
  productId: string;
  startDate: string;
  endDate: string;
  reason?: string;
};

export type PricingRulePayload = {
  productId: string;
  label: string;
  type: PricingRuleType;
  multiplier?: number;
  fixedDailyRate?: number;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: DayOfWeek[];
  demandThreshold?: number;
  isActive?: boolean;
};

export type ContentBlockPayload = {
  key: string;
  title: string;
  body: string;
  type: ContentType;
  isPublished?: boolean;
};

export type ContentBlockUpdatePayload = {
  title: string;
  body: string;
  type: ContentType;
  isPublished?: boolean;
};

export type PromoCampaignPayload = {
  code: string;
  description: string;
  discountType: DiscountType;
  value: number;
  startsAt: string;
  endsAt: string;
  minOrderAmount?: number;
  usageLimit?: number;
  isActive?: boolean;
};

export type ReferralCodePayload = {
  code: string;
  rewardAmount: number;
  isActive?: boolean;
};

export type AnalyticsEventPayload = {
  eventType: AnalyticsEventType;
  sessionId?: string;
  customerId?: string;
  productId?: string;
  metadata?: Record<string, unknown>;
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
  return apiRequest<{ accessStatus: User["accessStatus"] }>(
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

export function createAvailabilityBlock(
  token: string,
  payload: AvailabilityBlockPayload
) {
  return apiRequest<ApiMessage & { block?: AvailabilityBlock }>("/api/advertiser/availability", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function createPricingRule(token: string, payload: PricingRulePayload) {
  return apiRequest<ApiMessage & { rule?: PricingRule }>("/api/advertiser/pricing", {
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

export function updateProductQaStatus(
  token: string,
  productId: string,
  qaStatus: QaStatus,
  qaNotes: string
) {
  return apiRequest<ApiMessage & { product?: Product }>(`/api/admin/products/${productId}/qa`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ qaStatus, qaNotes })
  });
}

export function createContentBlock(token: string, payload: ContentBlockPayload) {
  return apiRequest<ApiMessage & { block?: ContentBlock }>("/api/admin/content", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function updateContentBlock(
  token: string,
  contentId: string,
  payload: ContentBlockUpdatePayload
) {
  return apiRequest<ApiMessage & { block?: ContentBlock }>(`/api/admin/content/${contentId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function createPromoCampaign(token: string, payload: PromoCampaignPayload) {
  return apiRequest<ApiMessage & { campaign?: PromoCampaign }>("/api/admin/promos", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function createReferralCode(token: string, payload: ReferralCodePayload) {
  return apiRequest<ApiMessage & { referral?: ReferralCode }>("/api/admin/referrals", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
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

export function scheduleReturnPickup(
  token: string,
  bookingId: string,
  returnScheduledAt?: string
) {
  return apiRequest<ApiMessage & { booking?: Booking }>(
    `/api/admin/bookings/${bookingId}/return-schedule`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ returnScheduledAt })
    }
  );
}

export function recordAnalyticsEvent(payload: AnalyticsEventPayload) {
  return apiRequest<ApiMessage>("/api/analytics", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload)
  });
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, options);
    const data = (await response.json().catch(() => ({}))) as T;

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { message: "Backend is not reachable. Please start the API and try again." } as T
    };
  }
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

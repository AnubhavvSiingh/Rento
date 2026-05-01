export const apiBaseUrl = "http://localhost:4000";

export type Product = {
  id: string;
  name: string;
  city: string;
  category: string;
  dailyRate: number;
  deposit: number;
  description: string;
  owner?: string;
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

export type RegisterAdvertiserPayload = {
  name: string;
  email: string;
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

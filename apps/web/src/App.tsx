// Main UI composition for the Rento web app, including routing and data flows.
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createAvailabilityBlock,
  createAdvertiserProduct,
  createBooking as createBookingRequest,
  createContentBlock,
  createPricingRule,
  createPromoCampaign,
  createReferralCode,
  getAdminDashboard,
  getAdvertiserApprovalStatus,
  getAuthenticatedUser,
  getCustomerDashboard,
  getCustomerProfile,
  getHostDashboard,
  getMarketplace,
  loginCustomerAccount,
  loginAccount,
  recordAnalyticsEvent,
  registerCustomerAccount,
  registerAdvertiserAccount,
  saveReview,
  scheduleReturnPickup,
  updateBookingStatus as updateBookingStatusRequest,
  updateAdvertiserAccessStatus,
  updateContentBlock,
  updateProductQaStatus,
  updateProductStatus as updateProductStatusRequest,
  type AdminDashboard,
  type Booking,
  type BookingStatus,
  type ContentBlock,
  type ContentType,
  type CustomerProfile,
  type DayOfWeek,
  type DiscountType,
  type HostDashboard,
  type ListingStatus,
  type PricingRuleType,
  type QaStatus,
  type NotificationItem,
  type Overview,
  type Product,
  type Review,
  type ShippingDetails,
  type User
} from "./api";
import {
  categoryShowcases,
  homeTestimonials,
  homeVideoFeature,
  homeVisuals
} from "./content";
import {
  FeatureVideoCard,
  ImageCard,
  StatCard,
  StatCardSkeleton,
  StatusTrack,
  TestimonialCard,
  TrackingTimeline,
  TrustChip,
  TrustChipSkeleton
} from "./components/marketplace";
import { PremiumAlert, type FeedbackTone } from "./components/feedback";
import { PremiumSelect } from "./components/PremiumSelect";
import { formatStatus } from "./utils/booking";
import { AdminPage } from "./pages/AdminPage";
import { AdvertiserPage } from "./pages/AdvertiserPage";
import { CustomerAuthPage, type CustomerAuthMode } from "./pages/CustomerAuthPage";
import { ExplorePage } from "./pages/ExplorePage";

type Route =
  | "home"
  | "explore"
  | "customer-auth"
  | "customer-shipping"
  | "customer-confirmation"
  | "customer-dashboard"
  | "advertiser"
  | "admin"
  | "admin-inventory"
  | "admin-delivery"
  | "admin-analytics"
  | "admin-marketing";

type AdminView = "overview" | "inventory" | "delivery" | "analytics" | "marketing";

type AdminFilter = "ALL" | "APPROVED" | "PENDING" | "SUSPENDED";
type ThemeMode = "dark" | "light";

const customerTokenKey = "rento_customer_token";
const themeKey = "rento_theme";
const analyticsSessionKey = "rento_analytics_session";

const paymentOptions = [
  {
    value: "UPI",
    label: "UPI",
    description: "Fast confirmation with any UPI ID",
    icon: "UPI"
  },
  {
    value: "Card",
    label: "Card",
    description: "Credit or debit card reference",
    icon: "Card"
  },
  {
    value: "Net banking",
    label: "Net banking",
    description: "Bank transfer confirmation",
    icon: "Bank"
  },
  {
    value: "Wallet",
    label: "Wallet",
    description: "Wallet or prepaid transaction ID",
    icon: "Pay"
  }
];

const ratingOptions = [
  { value: "5", label: "5 - Excellent", description: "Premium from start to finish", icon: "5" },
  { value: "4", label: "4 - Good", description: "Smooth experience with small gaps", icon: "4" },
  { value: "3", label: "3 - Okay", description: "Acceptable but could improve", icon: "3" },
  { value: "2", label: "2 - Needs improvement", description: "Noticeable service issues", icon: "2" },
  { value: "1", label: "1 - Poor", description: "Major rental experience problem", icon: "1" }
];


export default function App() {
  const [route, setRoute] = useState<Route>(getRouteFromHash());
  const [theme, setTheme] = useState<ThemeMode>(() => readInitialTheme());
  const [overview, setOverview] = useState<Overview | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isMarketplaceLoading, setIsMarketplaceLoading] = useState(true);
  const [advertiserUser, setAdvertiserUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [advertiserToken, setAdvertiserToken] = useState<string | null>(
    localStorage.getItem("rento_advertiser_token")
  );
  const [adminToken, setAdminToken] = useState<string | null>(
    localStorage.getItem("rento_admin_token")
  );
  const [customerToken, setCustomerToken] = useState<string | null>(
    localStorage.getItem(customerTokenKey)
  );
  const [hostDashboard, setHostDashboard] = useState<HostDashboard | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboard | null>(null);
  const [statusMessage, setStatusMessage] = useState("Choose how you want to enter Rento.");
  const [statusTone, setStatusTone] = useState<FeedbackTone>("info");
  const [pendingRequest, setPendingRequest] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customerAuthMode, setCustomerAuthMode] = useState<CustomerAuthMode>("signup");
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(() => null);
  const [shippingDetails, setShippingDetails] = useState<ShippingDetails | null>(null);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminFilter, setAdminFilter] = useState<AdminFilter>("ALL");
  const [productSearch, setProductSearch] = useState("");
  const [registeredAdvertiserEmail, setRegisteredAdvertiserEmail] = useState<string | null>(
    localStorage.getItem("rento_registered_advertiser_email")
  );
  const [advertiserRegistrationStatus, setAdvertiserRegistrationStatus] = useState<
    User["accessStatus"] | null
  >(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);
  const [isHostLoading, setIsHostLoading] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [qaNotesDraft, setQaNotesDraft] = useState<Record<string, string>>({});
  const [returnScheduleDraft, setReturnScheduleDraft] = useState<Record<string, string>>({});
  const analyticsSessionId = useMemo(() => getAnalyticsSessionId(), []);

  useEffect(() => {
    void loadMarketplace();
  }, []);

  useEffect(() => {
    localStorage.setItem(themeKey, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getRouteFromHash());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    void recordAnalyticsEvent({
      eventType: "PAGE_VIEW",
      sessionId: analyticsSessionId,
      metadata: { route }
    }).catch(() => undefined);
  }, [analyticsSessionId, route]);

  useEffect(() => {
    if (route !== "customer-shipping" || !selectedProduct) {
      return;
    }

    void recordAnalyticsEvent({
      eventType: "CHECKOUT_START",
      sessionId: analyticsSessionId,
      productId: selectedProduct.id,
      metadata: { productName: selectedProduct.name }
    }).catch(() => undefined);
  }, [analyticsSessionId, route, selectedProduct]);

  useEffect(() => {
    if (advertiserToken) {
      localStorage.setItem("rento_advertiser_token", advertiserToken);
      void loadAuthenticatedUser(advertiserToken, setAdvertiserUser, "ADVERTISER");
      void loadHostDashboard(advertiserToken);
    } else {
      localStorage.removeItem("rento_advertiser_token");
      setAdvertiserUser(null);
      setHostDashboard(null);
      setIsHostLoading(false);
    }
  }, [advertiserToken]);

  useEffect(() => {
    if (adminToken) {
      localStorage.setItem("rento_admin_token", adminToken);
      void loadAuthenticatedUser(adminToken, setAdminUser, "ADMIN");
      void loadAdminDashboard(adminToken);
    } else {
      localStorage.removeItem("rento_admin_token");
      setAdminUser(null);
      setAdminDashboard(null);
      setIsAdminLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    if (customerToken) {
      localStorage.setItem(customerTokenKey, customerToken);
      void loadCustomerSession(customerToken);
    } else {
      localStorage.removeItem(customerTokenKey);
      setCustomerProfile(null);
      setBookings([]);
      setReviews([]);
      setNotifications([]);
      setIsCustomerLoading(false);
    }
  }, [customerToken]);

  useEffect(() => {
    if (registeredAdvertiserEmail) {
      localStorage.setItem("rento_registered_advertiser_email", registeredAdvertiserEmail);
      void refreshAdvertiserApprovalStatus(registeredAdvertiserEmail);
    } else {
      localStorage.removeItem("rento_registered_advertiser_email");
      setAdvertiserRegistrationStatus(null);
    }
  }, [registeredAdvertiserEmail]);

  function showStatus(message: string, tone: FeedbackTone = "info") {
    setStatusMessage(message);
    setStatusTone(tone);
  }

  function finishRequest(key: string) {
    setPendingRequest((current) => (current === key ? null : current));
  }

  async function loadMarketplace() {
    const shouldShowSkeleton = products.length === 0;
    if (shouldShowSkeleton) {
      setIsMarketplaceLoading(true);
    }
    try {
      const marketplace = await getMarketplace();
      setOverview(marketplace.overview);
      setProducts(marketplace.products);
    } catch (error) {
      console.error(error);
      showStatus("Unable to load marketplace data.", "error");
    } finally {
      if (shouldShowSkeleton) {
        setIsMarketplaceLoading(false);
      }
    }
  }

  async function loadAuthenticatedUser(
    token: string,
    setter: (user: User | null) => void,
    expectedRole: User["role"]
  ) {
    try {
      const response = await getAuthenticatedUser(token);

      if (!response.ok) {
        setter(null);
        return;
      }

      if (response.data.user.role !== expectedRole) {
        setter(null);
        return;
      }

      setter(response.data.user);
    } catch (error) {
      console.error(error);
      setter(null);
    }
  }

  async function loadHostDashboard(token: string) {
    const shouldShowSkeleton = !hostDashboard;
    if (shouldShowSkeleton) {
      setIsHostLoading(true);
    }
    try {
      const response = await getHostDashboard(token);

      if (!response.ok) {
        setHostDashboard(null);
        return;
      }

      setHostDashboard(response.data);
    } catch (error) {
      console.error(error);
      setHostDashboard(null);
    } finally {
      if (shouldShowSkeleton) {
        setIsHostLoading(false);
      }
    }
  }

  async function loadAdminDashboard(token: string) {
    const shouldShowSkeleton = !adminDashboard;
    if (shouldShowSkeleton) {
      setIsAdminLoading(true);
    }
    try {
      const response = await getAdminDashboard(token);

      if (!response.ok) {
        setAdminDashboard(null);
        return;
      }

      setAdminDashboard(response.data);
    } catch (error) {
      console.error(error);
      setAdminDashboard(null);
    } finally {
      if (shouldShowSkeleton) {
        setIsAdminLoading(false);
      }
    }
  }

  async function loadCustomerSession(token: string) {
    const shouldShowSkeleton =
      bookings.length === 0 && notifications.length === 0 && reviews.length === 0;
    if (shouldShowSkeleton) {
      setIsCustomerLoading(true);
    }
    try {
      const [profileResponse, dashboardResponse] = await Promise.all([
        getCustomerProfile(token),
        getCustomerDashboard(token)
      ]);

      if (!profileResponse.ok || !dashboardResponse.ok) {
        setCustomerToken(null);
        return;
      }

      setCustomerProfile(profileResponse.data.customer);
      setBookings(dashboardResponse.data.bookings);
      setReviews(dashboardResponse.data.reviews);
      setNotifications(dashboardResponse.data.notifications);
    } catch (error) {
      console.error(error);
      setCustomerToken(null);
    } finally {
      if (shouldShowSkeleton) {
        setIsCustomerLoading(false);
      }
    }
  }

  async function refreshAdvertiserApprovalStatus(email: string) {
    try {
      const response = await getAdvertiserApprovalStatus(email);

      if (!response.ok) {
        setAdvertiserRegistrationStatus(null);
        return;
      }

      setAdvertiserRegistrationStatus(response.data.accessStatus);
    } catch (error) {
      console.error(error);
      setAdvertiserRegistrationStatus(null);
    }
  }

  async function registerAdvertiser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestKey = "advertiser-register";
    setPendingRequest(requestKey);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").toLowerCase();
    const payload = {
      name: String(form.get("name") ?? ""),
      email,
      password: String(form.get("password") ?? "")
    };

    const response = await registerAdvertiserAccount(payload);
    showStatus(
      response.data.message ?? "Advertiser account submitted.",
      response.ok ? "success" : "error"
    );

    if (response.ok) {
      setRegisteredAdvertiserEmail(email);
      setAdvertiserRegistrationStatus("PENDING");
      event.currentTarget.reset();
      if (adminToken) {
        void loadAdminDashboard(adminToken);
      }
    }
    finishRequest(requestKey);
  }

  async function login(event: FormEvent<HTMLFormElement>, role: User["role"]) {
    event.preventDefault();
    const requestKey = role === "ADMIN" ? "admin-login" : "advertiser-login";
    setPendingRequest(requestKey);
    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? "")
    };

    const response = await loginAccount(payload);
    const data = response.data;

    if (!response.ok || !data.token || !data.user) {
      showStatus(
        data.message ?? "Wrong user ID or password. Please check your credentials and try again.",
        "error"
      );
      finishRequest(requestKey);
      return;
    }

    if (data.user.role !== role) {
      showStatus(`This account is not a ${role.toLowerCase()} login.`, "error");
      finishRequest(requestKey);
      return;
    }

    showStatus(`Welcome back, ${data.user.name}.`, "success");

    if (role === "ADVERTISER") {
      setAdvertiserToken(data.token);
      setRegisteredAdvertiserEmail(data.user.email);
      setAdvertiserRegistrationStatus(data.user.accessStatus);
    } else {
      setAdminToken(data.token);
    }
    finishRequest(requestKey);
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!advertiserToken) {
      showStatus("Please login as an approved advertiser first.", "error");
      return;
    }

    const requestKey = "submit-product";
    setPendingRequest(requestKey);
    const form = new FormData(event.currentTarget);
    const leadTimeDays = Number(form.get("leadTimeDays") ?? "");
    const bufferDays = Number(form.get("bufferDays") ?? "");
    const minPhotoCount = Number(form.get("minPhotoCount") ?? "");
    const payload = {
      name: String(form.get("name") ?? ""),
      category: String(form.get("category") ?? ""),
      city: String(form.get("city") ?? ""),
      dailyRate: Number(form.get("dailyRate") ?? 0),
      deposit: Number(form.get("deposit") ?? 0),
      description: String(form.get("description") ?? ""),
      tags: String(form.get("tags") ?? ""),
      imageUrls: String(form.get("imageUrls") ?? ""),
      leadTimeDays: Number.isFinite(leadTimeDays) ? leadTimeDays : undefined,
      bufferDays: Number.isFinite(bufferDays) ? bufferDays : undefined,
      minPhotoCount: Number.isFinite(minPhotoCount) ? minPhotoCount : undefined
    };

    const response = await createAdvertiserProduct(advertiserToken, payload);
    const data = response.data;
    showStatus(
      response.ok
        ? "Product submitted for admin approval."
        : data.message ?? "Product submitted.",
      response.ok ? "success" : "error"
    );

    if (response.ok && data.product) {
      event.currentTarget.reset();
      await Promise.all([loadMarketplace(), loadHostDashboard(advertiserToken)]);
    }
    finishRequest(requestKey);
  }

  async function submitAvailabilityBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!advertiserToken) {
      showStatus("Please login as an approved advertiser first.", "error");
      return;
    }

    const requestKey = "availability";
    setPendingRequest(requestKey);
    const form = new FormData(event.currentTarget);
    const payload = {
      productId: String(form.get("productId") ?? ""),
      startDate: String(form.get("startDate") ?? ""),
      endDate: String(form.get("endDate") ?? ""),
      reason: String(form.get("reason") ?? "")
    };

    const response = await createAvailabilityBlock(advertiserToken, payload);
    showStatus(response.data.message ?? "Availability saved.", response.ok ? "success" : "error");

    if (response.ok) {
      event.currentTarget.reset();
      await loadHostDashboard(advertiserToken);
    }
    finishRequest(requestKey);
  }

  async function submitPricingRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!advertiserToken) {
      showStatus("Please login as an approved advertiser first.", "error");
      return;
    }

    const requestKey = "pricing";
    setPendingRequest(requestKey);
    const form = new FormData(event.currentTarget);
    const multiplier = Number(form.get("multiplier") ?? "");
    const fixedDailyRate = Number(form.get("fixedDailyRate") ?? "");
    const demandThreshold = Number(form.get("demandThreshold") ?? "");
    const daysInput = String(form.get("daysOfWeek") ?? "");
    const days = daysInput
      .split(/,|\s+/)
      .map((day) => day.trim().toUpperCase())
      .filter(Boolean) as DayOfWeek[];

    const payload = {
      productId: String(form.get("productId") ?? ""),
      label: String(form.get("label") ?? ""),
      type: String(form.get("type") ?? "WEEKEND") as PricingRuleType,
      multiplier: Number.isFinite(multiplier) ? multiplier : undefined,
      fixedDailyRate: Number.isFinite(fixedDailyRate) ? fixedDailyRate : undefined,
      startDate: String(form.get("startDate") ?? ""),
      endDate: String(form.get("endDate") ?? ""),
      daysOfWeek: days,
      demandThreshold: Number.isFinite(demandThreshold) ? demandThreshold : undefined,
      isActive: String(form.get("isActive") ?? "true") !== "false"
    };

    const response = await createPricingRule(advertiserToken, payload);
    showStatus(response.data.message ?? "Pricing rule saved.", response.ok ? "success" : "error");

    if (response.ok) {
      event.currentTarget.reset();
      await loadHostDashboard(advertiserToken);
    }
    finishRequest(requestKey);
  }

  async function updateAdvertiserAccess(
    userId: string,
    accessStatus: User["accessStatus"]
  ) {
    if (!adminToken) {
      return;
    }

    const response = await updateAdvertiserAccessStatus(adminToken, userId, accessStatus);
    showStatus(
      response.data.message ?? "Advertiser access updated.",
      response.ok ? "success" : "error"
    );

    if (response.ok) {
      void loadAdminDashboard(adminToken);
      if (registeredAdvertiserEmail) {
        void refreshAdvertiserApprovalStatus(registeredAdvertiserEmail);
      }
    }
  }

  function navigate(nextRoute: Route) {
    window.location.hash = nextRoute === "home" ? "" : nextRoute;
  }

  function beginRentFlow(product: Product) {
    setSelectedProduct(product);
    setShippingDetails(null);
    setCurrentBooking(null);
    setCustomerAuthMode(customerProfile ? "signin" : "signup");
    navigate(customerProfile ? "customer-shipping" : "customer-auth");
    showStatus(`Continue your rental for "${product.name}".`, "info");
    void recordAnalyticsEvent({
      eventType: "PRODUCT_VIEW",
      sessionId: analyticsSessionId,
      productId: product.id,
      metadata: { productName: product.name }
    }).catch(() => undefined);
  }

  async function submitCustomerAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestKey = customerAuthMode === "signup" ? "customer-signup" : "customer-signin";
    setPendingRequest(requestKey);
    const form = new FormData(event.currentTarget);

    const email = String(form.get("email") ?? "").toLowerCase();
    const password = String(form.get("password") ?? "");

    if (customerAuthMode === "signup") {
      const response = await registerCustomerAccount({
        fullName: String(form.get("fullName") ?? ""),
        email,
        phone: String(form.get("phone") ?? ""),
        password
      });

      if (!response.ok || !response.data.token || !response.data.customer) {
        showStatus(response.data.message ?? "Unable to create customer account.", "error");
        finishRequest(requestKey);
        return;
      }

      setCustomerProfile(response.data.customer);
      setCustomerToken(response.data.token);
    } else {
      const response = await loginCustomerAccount({ email, password });

      if (!response.ok || !response.data.token || !response.data.customer) {
        showStatus(
          response.data.message ??
            "Wrong user ID or password. Please check your customer login and try again.",
          "error"
        );
        finishRequest(requestKey);
        return;
      }

      setCustomerProfile(response.data.customer);
      setCustomerToken(response.data.token);
    }

    navigate(selectedProduct ? "customer-shipping" : "customer-dashboard");
    showStatus(
      selectedProduct
        ? "Add shipment and payment details to place your rental order."
        : "Welcome to your customer dashboard.",
      "success"
    );
    finishRequest(requestKey);
  }

  async function submitShipping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (!selectedProduct || !customerProfile || !customerToken) {
      showStatus("Please choose a product and sign in before checkout.", "error");
      navigate("explore");
      return;
    }

    const requestKey = "booking";
    setPendingRequest(requestKey);
    const details: ShippingDetails = {
      addressLine1: String(form.get("addressLine1") ?? ""),
      addressLine2: String(form.get("addressLine2") ?? ""),
      city: String(form.get("city") ?? ""),
      state: String(form.get("state") ?? ""),
      postalCode: String(form.get("postalCode") ?? ""),
      shipmentDate: String(form.get("shipmentDate") ?? ""),
      rentalStartDate: String(form.get("rentalStartDate") ?? ""),
      rentalEndDate: String(form.get("rentalEndDate") ?? ""),
      deliveryInstructions: String(form.get("deliveryInstructions") ?? ""),
      conditionPhotoUrl: String(form.get("conditionPhotoUrl") ?? ""),
      paymentMethod: String(form.get("paymentMethod") ?? "UPI"),
      paymentReference:
        String(form.get("paymentReference") ?? "") || `PAY-${Date.now().toString().slice(-6)}`
    };
    const promoCode = String(form.get("promoCode") ?? "");
    const response = await createBookingRequest(customerToken, {
      productId: selectedProduct.id,
      ...details,
      promoCode: promoCode || undefined
    });

    if (!response.ok || !response.data.booking) {
      showStatus(response.data.message ?? "Unable to place order.", "error");
      finishRequest(requestKey);
      return;
    }

    setShippingDetails(details);
    setCurrentBooking(response.data.booking);
    await loadCustomerSession(customerToken);
    navigate("customer-confirmation");
    showStatus(response.data.message ?? "Your order has been placed.", "success");
    finishRequest(requestKey);
    void recordAnalyticsEvent({
      eventType: "BOOKING_COMPLETE",
      sessionId: analyticsSessionId,
      customerId: customerProfile.id,
      productId: selectedProduct.id,
      metadata: { bookingId: response.data.booking.id }
    }).catch(() => undefined);
  }

  async function updateProductStatus(productId: string, status: ListingStatus) {
    if (!adminToken) {
      return;
    }

    const requestKey = "admin-action";
    setPendingRequest(requestKey);
    const response = await updateProductStatusRequest(adminToken, productId, status);
    showStatus(
      response.data.message ?? `Listing ${status.toLowerCase()} successfully.`,
      response.ok ? "success" : "error"
    );

    if (response.ok) {
      await Promise.all([loadMarketplace(), loadAdminDashboard(adminToken)]);
    }
    finishRequest(requestKey);
  }

  async function updateProductQa(productId: string, qaStatus: QaStatus) {
    if (!adminToken) {
      return;
    }

    const requestKey = "admin-action";
    setPendingRequest(requestKey);
    const qaNotes = qaNotesDraft[productId] ?? "";
    const response = await updateProductQaStatus(adminToken, productId, qaStatus, qaNotes);
    showStatus(response.data.message ?? "Product QA updated.", response.ok ? "success" : "error");

    if (response.ok) {
      await Promise.all([loadMarketplace(), loadAdminDashboard(adminToken)]);
    }
    finishRequest(requestKey);
  }

  async function updateBookingStatus(bookingId: string, status: BookingStatus) {
    if (!adminToken) {
      showStatus("Only admin can update shipment status.", "error");
      return;
    }

    const requestKey = "admin-action";
    setPendingRequest(requestKey);
    const response = await updateBookingStatusRequest(adminToken, bookingId, status);
    showStatus(
      response.data.message ?? `Booking moved to ${formatStatus(status)}.`,
      response.ok ? "success" : "error"
    );

    if (response.ok) {
      await loadAdminDashboard(adminToken);
      if (customerToken) {
        await loadCustomerSession(customerToken);
      }
      if (advertiserToken) {
        await loadHostDashboard(advertiserToken);
      }
    }
    finishRequest(requestKey);
  }

  async function scheduleReturn(bookingId: string) {
    if (!adminToken) {
      return;
    }

    const requestKey = "admin-action";
    setPendingRequest(requestKey);
    const returnScheduledAt = returnScheduleDraft[bookingId];
    const response = await scheduleReturnPickup(adminToken, bookingId, returnScheduledAt);
    showStatus(response.data.message ?? "Return pickup updated.", response.ok ? "success" : "error");

    if (response.ok) {
      await loadAdminDashboard(adminToken);
      if (customerToken) {
        await loadCustomerSession(customerToken);
      }
    }
    finishRequest(requestKey);
  }

  async function submitContentBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminToken) {
      return;
    }

    const requestKey = "admin-action";
    setPendingRequest(requestKey);
    const form = new FormData(event.currentTarget);
    const payload = {
      key: String(form.get("key") ?? ""),
      title: String(form.get("title") ?? ""),
      body: String(form.get("body") ?? ""),
      type: String(form.get("type") ?? "HERO") as ContentType,
      isPublished: String(form.get("isPublished") ?? "true") !== "false"
    };

    const response = await createContentBlock(adminToken, payload);
    showStatus(response.data.message ?? "Content block created.", response.ok ? "success" : "error");

    if (response.ok) {
      event.currentTarget.reset();
      await loadAdminDashboard(adminToken);
    }
    finishRequest(requestKey);
  }

  async function toggleContentPublish(block: ContentBlock) {
    if (!adminToken) {
      return;
    }

    const requestKey = "admin-action";
    setPendingRequest(requestKey);
    const response = await updateContentBlock(adminToken, block.id, {
      title: block.title,
      body: block.body,
      type: block.type,
      isPublished: !block.isPublished
    });
    showStatus(response.data.message ?? "Content updated.", response.ok ? "success" : "error");

    if (response.ok) {
      await loadAdminDashboard(adminToken);
    }
    finishRequest(requestKey);
  }

  async function submitPromoCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminToken) {
      return;
    }

    const requestKey = "admin-action";
    setPendingRequest(requestKey);
    const form = new FormData(event.currentTarget);
    const payload = {
      code: String(form.get("code") ?? "").toUpperCase(),
      description: String(form.get("description") ?? ""),
      discountType: String(form.get("discountType") ?? "PERCENT") as DiscountType,
      value: Number(form.get("value") ?? 0),
      startsAt: String(form.get("startsAt") ?? ""),
      endsAt: String(form.get("endsAt") ?? ""),
      minOrderAmount: Number(form.get("minOrderAmount") ?? 0) || undefined,
      usageLimit: Number(form.get("usageLimit") ?? 0) || undefined,
      isActive: String(form.get("isActive") ?? "true") !== "false"
    };

    const response = await createPromoCampaign(adminToken, payload);
    showStatus(response.data.message ?? "Promo created.", response.ok ? "success" : "error");

    if (response.ok) {
      event.currentTarget.reset();
      await loadAdminDashboard(adminToken);
    }
    finishRequest(requestKey);
  }

  async function submitReferralCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminToken) {
      return;
    }

    const requestKey = "admin-action";
    setPendingRequest(requestKey);
    const form = new FormData(event.currentTarget);
    const payload = {
      code: String(form.get("code") ?? "").toUpperCase(),
      rewardAmount: Number(form.get("rewardAmount") ?? 0),
      isActive: String(form.get("isActive") ?? "true") !== "false"
    };

    const response = await createReferralCode(adminToken, payload);
    showStatus(response.data.message ?? "Referral created.", response.ok ? "success" : "error");

    if (response.ok) {
      event.currentTarget.reset();
      await loadAdminDashboard(adminToken);
    }
    finishRequest(requestKey);
  }

  async function submitReview(event: FormEvent<HTMLFormElement>, booking: Booking) {
    event.preventDefault();
    if (!customerToken) {
      showStatus("Please sign in as a customer to review this rental.", "error");
      return;
    }

    const requestKey = "review";
    setPendingRequest(requestKey);
    const form = new FormData(event.currentTarget);
    const response = await saveReview(customerToken, booking.id, {
      rating: Number(form.get("rating") ?? 5),
      comment: String(form.get("comment") ?? ""),
      conditionNote: String(form.get("conditionNote") ?? "")
    });

    showStatus(response.data.message ?? "Review saved.", response.ok ? "success" : "error");
    if (response.ok) {
      await Promise.all([loadCustomerSession(customerToken), loadMarketplace()]);
      event.currentTarget.reset();
    }
    finishRequest(requestKey);
  }

  function logoutCustomer() {
    setCustomerToken(null);
    showStatus("Customer signed out.", "info");
    navigate("home");
  }

  const approvedProducts = useMemo(
    () =>
      products.filter(
        (product) => product.status === "APPROVED" && product.qaStatus === "APPROVED"
      ),
    [products]
  );

  const filteredAdvertisers = useMemo(() => {
    const advertisers = adminDashboard?.advertisers ?? [];
    return advertisers.filter((user) => {
      const matchesSearch = user.email.toLowerCase().includes(adminSearch.toLowerCase());
      const matchesFilter = adminFilter === "ALL" ? true : user.accessStatus === adminFilter;
      return matchesSearch && matchesFilter;
    });
  }, [adminDashboard, adminFilter, adminSearch]);

  const advertiserBookings = hostDashboard?.bookings ?? [];
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <div className={`app-shell theme-${theme}`}>
      <TopBar
        route={route}
        navigate={navigate}
        hasCustomer={Boolean(customerProfile)}
        theme={theme}
        onToggleTheme={() => setTheme(nextTheme)}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          className="page-stage"
          initial={{ opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.985 }}
          transition={{ type: "spring", stiffness: 210, damping: 28, mass: 0.85 }}
        >
          {route === "home" && (
            <HomePage
              overview={overview}
              navigate={navigate}
              statusMessage={statusMessage}
              statusTone={statusTone}
              pendingRequest={pendingRequest}
              isLoading={isMarketplaceLoading}
            />
          )}
          {route === "explore" && (
            <ExplorePage
              products={approvedProducts}
              overview={overview}
              onRent={beginRentFlow}
              selectedProduct={selectedProduct}
              isLoading={isMarketplaceLoading}
            />
          )}
          {route === "customer-auth" && (
            <CustomerAuthPage
              mode={customerAuthMode}
              product={selectedProduct}
              onModeChange={setCustomerAuthMode}
              onSubmit={submitCustomerAuth}
              statusMessage={statusMessage}
              statusTone={statusTone}
              isSubmitting={
                pendingRequest === "customer-signup" || pendingRequest === "customer-signin"
              }
            />
          )}
          {route === "customer-shipping" && (
            <CustomerShippingPage
              product={selectedProduct}
              customerProfile={customerProfile}
              onSubmit={submitShipping}
              isSubmitting={pendingRequest === "booking"}
            />
          )}
          {route === "customer-confirmation" && (
            <CustomerConfirmationPage
              product={selectedProduct}
              customerProfile={customerProfile}
              shippingDetails={shippingDetails}
              booking={currentBooking}
              onExploreAgain={() => navigate("explore")}
              onDashboard={() => navigate("customer-dashboard")}
            />
          )}
          {route === "customer-dashboard" && (
            <CustomerDashboardPage
              customerProfile={customerProfile}
              bookings={bookings}
              notifications={notifications}
              reviews={reviews}
              isLoading={isCustomerLoading}
              onGoToAuth={() => navigate("customer-auth")}
              onExplore={() => navigate("explore")}
              onLogout={logoutCustomer}
              onSubmitReview={submitReview}
            />
          )}
          {route === "advertiser" && (
            <AdvertiserPage
              advertiserUser={advertiserUser}
              hostDashboard={hostDashboard}
              isLoading={isHostLoading}
              statusMessage={statusMessage}
              statusTone={statusTone}
              pendingRequest={pendingRequest}
              registeredAdvertiserEmail={registeredAdvertiserEmail}
              advertiserRegistrationStatus={advertiserRegistrationStatus}
              bookings={advertiserBookings}
              onRegister={registerAdvertiser}
              onRefreshApproval={() =>
                registeredAdvertiserEmail
                  ? refreshAdvertiserApprovalStatus(registeredAdvertiserEmail)
                  : Promise.resolve()
              }
              onLogin={login}
              onLogout={() => setAdvertiserToken(null)}
              onSubmitProduct={submitProduct}
              onSubmitAvailability={submitAvailabilityBlock}
              onSubmitPricingRule={submitPricingRule}
            />
          )}
          {isAdminRoute(route) && (
            <AdminPage
              activeView={getAdminView(route)}
              adminUser={adminUser}
              adminDashboard={adminDashboard}
              filteredAdvertisers={filteredAdvertisers}
              isLoading={isAdminLoading}
              adminSearch={adminSearch}
              adminFilter={adminFilter}
              productSearch={productSearch}
              products={adminDashboard?.products ?? products}
              bookings={adminDashboard?.bookings ?? []}
              statusMessage={statusMessage}
              statusTone={statusTone}
              pendingRequest={pendingRequest}
              onSearchChange={setAdminSearch}
              onFilterChange={setAdminFilter}
              onProductSearchChange={setProductSearch}
              onViewChange={(view) => navigate(getAdminRoute(view))}
              onLogin={login}
              onLogout={() => setAdminToken(null)}
              onUpdateAccess={updateAdvertiserAccess}
              onUpdateProductStatus={updateProductStatus}
              onUpdateProductQa={updateProductQa}
              onUpdateBookingStatus={updateBookingStatus}
              onScheduleReturn={scheduleReturn}
              onSubmitContent={submitContentBlock}
              onToggleContentPublish={toggleContentPublish}
              onSubmitPromoCampaign={submitPromoCampaign}
              onSubmitReferralCode={submitReferralCode}
              qaNotesDraft={qaNotesDraft}
              onQaNotesChange={(productId, value) =>
                setQaNotesDraft((prev) => ({ ...prev, [productId]: value }))
              }
              returnScheduleDraft={returnScheduleDraft}
              onReturnScheduleChange={(bookingId, value) =>
                setReturnScheduleDraft((prev) => ({ ...prev, [bookingId]: value }))
              }
            />
          )}
        </motion.div>
      </AnimatePresence>
      <Footer />
    </div>
  );
}

function TopBar({
  route,
  navigate,
  hasCustomer,
  theme,
  onToggleTheme
}: {
  route: Route;
  navigate: (route: Route) => void;
  hasCustomer: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  return (
    <header className="topbar">
      <button type="button" className="brand-link" onClick={() => navigate("home")}>
        Rento
      </button>
      <nav className="topbar-nav" aria-label="Primary navigation">
        <button type="button" className="ghost-button" onClick={() => navigate("explore")}>
          Explore
        </button>
        <button type="button" className="ghost-button" onClick={() => navigate("advertiser")}>
          Advertiser
        </button>
        <button type="button" className="ghost-button" onClick={() => navigate("customer-dashboard") }>
          {hasCustomer ? "My Rentals" : "Customer Login"}
        </button>
        {!isAdminRoute(route) && (
          <button
            type="button"
            className="mini-admin-button"
            onClick={() => navigate("admin")}
            title="Admin access"
            aria-label="Admin access"
          >
            <AdminShieldIcon />
            <span className="sr-only">Are you Admin</span>
          </button>
        )}
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-pressed={theme === "dark"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="theme-toggle-icon" aria-hidden="true">
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path
                  d="M17.293 13.293A8 8 0 1110.707 6.707a6.2 6.2 0 106.586 6.586z"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  fill="currentColor"
                  transform="translate(0 -0.9)"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <circle cx="12" cy="12" r="4.5" fill="currentColor" />
                <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="12" y1="2.5" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="21.5" />
                  <line x1="2.5" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="21.5" y2="12" />
                  <line x1="4.8" y1="4.8" x2="6.6" y2="6.6" />
                  <line x1="17.4" y1="17.4" x2="19.2" y2="19.2" />
                  <line x1="4.8" y1="19.2" x2="6.6" y2="17.4" />
                  <line x1="17.4" y1="6.6" x2="19.2" y2="4.8" />
                </g>
              </svg>
            )}
          </span>
          <span className="sr-only">{theme === "dark" ? "Light" : "Dark"} mode</span>
        </button>
      </nav>
    </header>
  );
}

function AdminShieldIcon() {
  return (
    <svg
      className="admin-shield-icon"
      viewBox="0 0 64 64"
      focusable="false"
      aria-hidden="true"
    >
      <path
        d="M32 5.5 11.8 14.7a4.4 4.4 0 0 0-2.6 4v12.4c0 14.6 9.2 23.8 20.5 28a6.7 6.7 0 0 0 4.6 0c11.3-4.2 20.5-13.4 20.5-28V18.7a4.4 4.4 0 0 0-2.6-4L32 5.5Z"
        fill="currentColor"
      />
      <circle cx="32" cy="26.2" r="8" fill="var(--admin-icon-cutout)" />
      <path
        d="M18.6 46.9c2.7-8.2 8.1-12 13.4-12s10.7 3.8 13.4 12c-3.3 4-7.7 6.6-13.4 6.6s-10.1-2.6-13.4-6.6Z"
        fill="var(--admin-icon-cutout)"
      />
    </svg>
  );
}

function HomePage({
  overview,
  navigate,
  statusMessage,
  statusTone,
  pendingRequest,
  isLoading
}: {
  overview: Overview | null;
  navigate: (route: Route) => void;
  statusMessage: string;
  statusTone: FeedbackTone;
  pendingRequest: string | null;
  isLoading: boolean;
}) {
  const showSkeletons = isLoading;

  return (
    <main className="page-shell">
      <section className="hero hero-home premium-hero">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.55 }}
        >
          <p className="eyebrow">Main Page</p>
          <h1>Rent beautifully. Live lightly. Earn from what you already own.</h1>
          <p className="hero-text">
            Rento turns premium apparel, furniture, appliances, and creator gear into a
            trusted rental marketplace for modern city life. Customers browse faster,
            advertisers earn from underused inventory, and every experience feels more
            polished than buying for one-time use.
          </p>
          <div className="main-actions">
            <button type="button" className="primary-button" onClick={() => navigate("advertiser")}>
              Are you an Advertiser?
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate("explore")}>
              Explore Rento
            </button>
          </div>
          <div className="story-ribbon">
            <span>Premium listings</span>
            <span>Shipment tracking</span>
            <span>Calendar-ready rentals</span>
            <span>Trusted approvals</span>
          </div>
          <div className="trust-row" aria-busy={showSkeletons} aria-live="polite">
            {showSkeletons
              ? Array.from({ length: 5 }).map((_, index) => (
                  <TrustChipSkeleton key={`trust-skeleton-${index}`} />
                ))
              : (
                <>
                  <TrustChip
                    label="Average savings"
                    value={`${overview?.stats.averageSavingsPercent ?? 61}%`}
                  />
                  <TrustChip label="Approved hosts" value={`${overview?.stats.activeHosts ?? 0}+`} />
                  <TrustChip label="Rental-ready cities" value={`${overview?.stats.cities ?? 0}`} />
                  <TrustChip label="QA queue" value={`${overview?.stats.pendingQaListings ?? 0}`} />
                  <TrustChip label="Verified hosts" value={`${overview?.stats.verifiedHosts ?? 0}`} />
                </>
              )}
          </div>
        </motion.div>
        <div className="hero-stack">
          <motion.div
            className="hero-panel media-panel"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.58 }}
          >
            <FeatureVideoCard feature={homeVideoFeature} />
          </motion.div>
          <motion.div
            className="hero-panel"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.58 }}
          >
            <p className="panel-title">Live platform snapshot</p>
            <div className="stat-strip" aria-busy={showSkeletons} aria-live="polite">
              {showSkeletons
                ? Array.from({ length: 4 }).map((_, index) => (
                    <StatCardSkeleton key={`stat-skeleton-${index}`} />
                  ))
                : (
                  <>
                    <StatCard label="Advertisements" value={overview?.stats.listedProducts ?? "-"} />
                    <StatCard label="Advertisers" value={overview?.stats.activeHosts ?? "-"} />
                    <StatCard label="Cities" value={overview?.stats.cities ?? "-"} />
                    <StatCard label="Active promos" value={overview?.stats.activePromos ?? "-"} />
                  </>
                )}
            </div>
            <PremiumAlert
              message={statusMessage}
              tone={pendingRequest ? "loading" : statusTone}
              isBusy={Boolean(pendingRequest)}
            />
          </motion.div>
        </div>
      </section>

      <section className="feature-band">
        <article className="feature-copy">
          <p className="eyebrow">Why people come back</p>
          <h3>Renting feels easier when the experience looks premium and stays practical.</h3>
          <p className="section-text">
            Rento is built around the reasons people actually rent today: moving cities,
            furnishing short stays, styling one-time ceremonies, creating content, and avoiding
            high upfront ownership costs. Clear visuals, transparent pricing, and tracked
            delivery make the journey feel calm and trustworthy.
          </p>
          <ul className="list-block">
            <li>Discover premium listings with real product visuals.</li>
            <li>Compare daily rent, deposit, and city availability in one place.</li>
            <li>Move from signup to shipment confirmation without friction.</li>
          </ul>
        </article>
        <article className="visual-frame editorial-frame">
          <div className="savings-panel">
            <p className="eyebrow">Savings snapshot</p>
            <strong>Buy less. Experience more.</strong>
            <div className="mini-grid">
              <div>
                <span>Wedding wear saved</span>
                <strong>up to Rs 48k</strong>
              </div>
              <div>
                <span>Move-in setup saved</span>
                <strong>up to Rs 32k</strong>
              </div>
              <div>
                <span>Creator gear saved</span>
                <strong>up to Rs 18k</strong>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="visual-gallery">
        {categoryShowcases.map((item) => (
          <ImageCard key={item.title} item={item} />
        ))}
      </section>

      <section className="visual-gallery">
        {homeVisuals.map((item) => (
          <ImageCard key={item.title} item={item} />
        ))}
      </section>

      <section className="story-grid">
        {homeTestimonials.map((item) => (
          <TestimonialCard key={item.name} item={item} />
        ))}
      </section>
    </main>
  );
}

function CustomerShippingPage({
  product,
  customerProfile,
  onSubmit,
  isSubmitting
}: {
  product: Product | null;
  customerProfile: CustomerProfile | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const days = getRentalDays(startDate, endDate);
  const total = product ? days * product.dailyRate + product.deposit : 0;

  return (
    <main className="page-shell">
      <section className="section-header">
        <div>
          <p className="eyebrow">Checkout</p>
          <h2>Shipment, rental dates, payment, and condition record.</h2>
          <p className="section-text">
            {customerProfile
              ? `${customerProfile.fullName}, confirm where and when this rental should arrive.`
              : "Please sign in before placing an order."}
          </p>
          {product && (
            <p className="meta-line">
              Lead time: {product.leadTimeDays} days | Buffer: {product.bufferDays} days
            </p>
          )}
        </div>
        {product && (
          <div className="status-banner compact">
            {product.name} | Rs {product.dailyRate}/day | Deposit Rs {product.deposit}
          </div>
        )}
      </section>

      <section className="checkout-layout">
        <article className="auth-card">
          <form className="stack-form" onSubmit={onSubmit}>
            <input name="addressLine1" type="text" placeholder="House / apartment / street" required />
            <input name="addressLine2" type="text" placeholder="Landmark or address line 2" />
            <div className="form-grid">
              <input name="city" type="text" placeholder="City" required />
              <input name="state" type="text" placeholder="State" required />
              <input name="postalCode" type="text" placeholder="Postal code" required />
            </div>
            <div className="form-grid">
              <label>
                Shipment date
                <input name="shipmentDate" type="date" required />
              </label>
              <label>
                Rental start
                <input
                  name="rentalStartDate"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                />
              </label>
              <label>
                Rental end
                <input
                  name="rentalEndDate"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  required
                />
              </label>
            </div>
            <textarea
              name="deliveryInstructions"
              placeholder="Delivery instructions, preferred time, or gate details"
            />
            <input
              name="conditionPhotoUrl"
              type="url"
              placeholder="Optional product condition photo URL before delivery"
            />
            <input
              name="promoCode"
              type="text"
              placeholder="Promo code (optional)"
            />
            <div className="payment-panel">
              <p className="panel-title">Payment</p>
              <PaymentMethodPicker />
              <input
                name="paymentReference"
                type="text"
                placeholder="Payment reference, UPI ID, or transaction ID"
              />
              <p className="meta-line">
                Demo checkout confirms payment in-app. A live Razorpay or Stripe key can be added later.
              </p>
              <p className="meta-line">
                Dynamic pricing and promos are applied on the server after you submit.
              </p>
            </div>
            <button
              type="submit"
              className={`primary-button${isSubmitting ? " is-loading" : ""}`}
              disabled={!product || !customerProfile || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  Securing order...
                </>
              ) : (
                `Pay Rs ${total || 0} and place order`
              )}
            </button>
          </form>
        </article>

        <article className="dashboard-card">
          <p className="eyebrow">Order Estimate</p>
          <h3>{product?.name ?? "No product selected"}</h3>
          <div className="mini-grid">
            <div>Days: {days}</div>
            <div>Rent: Rs {product ? days * product.dailyRate : 0}</div>
            <div>Deposit: Rs {product?.deposit ?? 0}</div>
            <div>Total: Rs {total}</div>
          </div>
          <p className="meta-line">Final total will reflect dynamic pricing and promos.</p>
        </article>
      </section>
    </main>
  );
}

function PaymentMethodPicker() {
  const [paymentMethod, setPaymentMethod] = useState("UPI");

  return (
    <div className="payment-method-grid">
      <input type="hidden" name="paymentMethod" value={paymentMethod} />
      {paymentOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          className={
            paymentMethod === option.value
              ? "payment-method-card selected"
              : "payment-method-card"
          }
          onClick={() => setPaymentMethod(option.value)}
          aria-pressed={paymentMethod === option.value}
        >
          <span>{option.icon}</span>
          <strong>{option.label}</strong>
          <small>{option.description}</small>
        </button>
      ))}
    </div>
  );
}

function CustomerConfirmationPage({
  product,
  customerProfile,
  shippingDetails,
  booking,
  onExploreAgain,
  onDashboard
}: {
  product: Product | null;
  customerProfile: CustomerProfile | null;
  shippingDetails: ShippingDetails | null;
  booking: Booking | null;
  onExploreAgain: () => void;
  onDashboard: () => void;
}) {
  return (
    <main className="page-shell narrow-page">
      <article className="confirmation-card">
        <p className="eyebrow">Order Confirmation</p>
        <h2>Your order has been placed.</h2>
        <p>
          We will email you the shipment tracking link shortly. You can also track the
          rental from your customer dashboard.
        </p>
        <div className="mini-grid">
          <div>Product: {product?.name ?? "Selected product"}</div>
          <div>Customer: {customerProfile?.fullName ?? "Customer"}</div>
          <div>Tracking: {booking?.trackingCode ?? "Generating"}</div>
          <div>Payment: {booking?.paymentStatus ?? "PAID"}</div>
          <div>Promo: {booking?.promoCode || "None"}</div>
          <div>Discount: Rs {booking?.discountAmount ?? 0}</div>
        </div>
        {shippingDetails && (
          <p className="meta-line">
            Shipping to {shippingDetails.addressLine1}, {shippingDetails.city} on{" "}
            {shippingDetails.shipmentDate}.
          </p>
        )}
        <div className="main-actions">
          <button type="button" className="primary-button" onClick={onDashboard}>
            Open my rentals
          </button>
          <button type="button" className="secondary-button" onClick={onExploreAgain}>
            Explore more items
          </button>
        </div>
      </article>
    </main>
  );
}

function CustomerDashboardPage({
  customerProfile,
  bookings,
  notifications,
  reviews,
  isLoading,
  onGoToAuth,
  onExplore,
  onLogout,
  onSubmitReview
}: {
  customerProfile: CustomerProfile | null;
  bookings: Booking[];
  notifications: NotificationItem[];
  reviews: Review[];
  isLoading: boolean;
  onGoToAuth: () => void;
  onExplore: () => void;
  onLogout: () => void;
  onSubmitReview: (event: FormEvent<HTMLFormElement>, booking: Booking) => Promise<void>;
}) {
  const showSkeletons = isLoading;

  if (!customerProfile && showSkeletons) {
    return <CustomerDashboardSkeleton />;
  }

  if (!customerProfile) {
    return (
      <main className="page-shell narrow-page">
        <article className="auth-card">
          <p className="eyebrow">Customer Dashboard</p>
          <h2>Sign in to see your rentals.</h2>
          <button type="button" className="primary-button" onClick={onGoToAuth}>
            Customer sign in
          </button>
        </article>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="section-header">
        <div>
          <p className="eyebrow">Customer Dashboard</p>
          <h2>Welcome back, {customerProfile.fullName}.</h2>
          <p className="section-text">
            Track active rentals, shipment progress, payments, returns, and reviews.
          </p>
        </div>
        <div className="main-actions">
          <button type="button" className="primary-button" onClick={onExplore}>
            Rent another item
          </button>
          <button type="button" className="secondary-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </section>

      <section className="dashboard-grid" aria-busy={showSkeletons} aria-live="polite">
        {showSkeletons ? (
          <>
            <article className="dashboard-card" aria-hidden="true">
              <p className="eyebrow">Notifications</p>
              <div className="skeleton-stack">
                <div className="skeleton skeleton-line" style={{ width: "85%" }} />
                <div className="skeleton skeleton-line" style={{ width: "72%" }} />
                <div className="skeleton skeleton-line" style={{ width: "68%" }} />
              </div>
            </article>
            <article className="dashboard-card" aria-hidden="true">
              <p className="eyebrow">Rental Summary</p>
              <div className="mini-grid">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`summary-skeleton-${index}`} className="skeleton skeleton-tile" />
                ))}
              </div>
            </article>
          </>
        ) : (
          <>
            <article className="dashboard-card">
              <p className="eyebrow">Notifications</p>
              <div className="notification-list">
                {notifications.map((item) => (
                  <div key={item.id} className="notification-item">
                    <strong>{item.title}</strong>
                    <span>{item.message}</span>
                  </div>
                ))}
                {notifications.length === 0 && <p className="meta-line">No notifications yet.</p>}
              </div>
            </article>

            <article className="dashboard-card">
              <p className="eyebrow">Rental Summary</p>
              <div className="mini-grid">
                <div>Total orders: {bookings.length}</div>
                <div>
                  Active:{" "}
                  {bookings.filter((item) => !["COMPLETED", "CANCELLED"].includes(item.status))
                    .length}
                </div>
                <div>Completed: {bookings.filter((item) => item.status === "COMPLETED").length}</div>
                <div>Paid: Rs {bookings.reduce((total, item) => total + item.totalAmount, 0)}</div>
              </div>
            </article>
          </>
        )}
      </section>

      <section className="booking-stack" aria-busy={showSkeletons} aria-live="polite">
        {showSkeletons
          ? Array.from({ length: 2 }).map((_, index) => (
              <BookingSkeletonCard key={`booking-skeleton-${index}`} />
            ))
          : bookings.map((booking) => {
              const review = reviews.find((item) => item.bookingId === booking.id);
              return (
                <article key={booking.id} className="booking-card">
                  <div className="booking-card-head">
                    <div>
                      <span className="badge">{booking.productCategory}</span>
                      <h3>{booking.productName}</h3>
                      <p className="meta-line">
                        {booking.trackingCode} | {formatStatus(booking.status)} | Rs {booking.totalAmount}
                      </p>
                    </div>
                    <span className="status-banner compact">
                      {booking.status === "COMPLETED" ? "Completed" : "Tracked by Rento admin"}
                    </span>
                  </div>
                  <StatusTrack status={booking.status} />
                  {booking.trackingEvents && booking.trackingEvents.length > 0 && (
                    <TrackingTimeline events={booking.trackingEvents} />
                  )}
                  <div className="booking-detail-grid">
                    <div>
                      <strong>Shipment</strong>
                      <span>
                        {booking.shippingDetails.addressLine1}, {booking.shippingDetails.city},{" "}
                        {booking.shippingDetails.postalCode}
                      </span>
                    </div>
                    <div>
                      <strong>Rental dates</strong>
                      <span>
                        {booking.shippingDetails.rentalStartDate} to{" "}
                        {booking.shippingDetails.rentalEndDate}
                      </span>
                    </div>
                    <div>
                      <strong>Payment</strong>
                      <span>
                        {booking.shippingDetails.paymentMethod} |{" "}
                        {booking.shippingDetails.paymentReference}
                      </span>
                    </div>
                    <div>
                      <strong>Condition record</strong>
                      <span>{booking.shippingDetails.conditionPhotoUrl || "No photo URL added"}</span>
                    </div>
                    <div>
                      <strong>Return pickup</strong>
                      <span>{booking.shippingDetails.returnScheduledAt || "Not scheduled"}</span>
                    </div>
                    <div>
                      <strong>Promo</strong>
                      <span>{booking.promoCode ? booking.promoCode : "No promo applied"}</span>
                    </div>
                    <div>
                      <strong>Discount</strong>
                      <span>Rs {booking.discountAmount ?? 0}</span>
                    </div>
                  </div>
                  {booking.priceBreakdown && (
                    <div className="price-breakdown">
                      <p className="panel-title">Price breakdown</p>
                      <pre>{JSON.stringify(booking.priceBreakdown, null, 2)}</pre>
                    </div>
                  )}
                  {booking.status === "DELIVERED" ||
                  booking.status === "RETURN_PICKUP" ||
                  booking.status === "COMPLETED" ? (
                    <form
                      className="stack-form review-form"
                      onSubmit={(event) => onSubmitReview(event, booking)}
                    >
                      <p className="panel-title">
                        {review ? "Update your review" : "Rate this rental"}
                      </p>
                      <PremiumSelect
                        name="rating"
                        label="Experience rating"
                        defaultValue={review?.rating ?? 5}
                        options={ratingOptions}
                        compact
                      />
                      <textarea
                        name="comment"
                        placeholder="How was the rental experience?"
                        defaultValue={review?.comment}
                      />
                      <textarea
                        name="conditionNote"
                        placeholder="Return condition note or damage report"
                        defaultValue={review?.conditionNote}
                      />
                      <button type="submit" className="secondary-button">
                        Save review and condition note
                      </button>
                    </form>
                  ) : null}
                </article>
              );
            })}
        {!showSkeletons && bookings.length === 0 && (
          <article className="booking-card">
            <h3>No rentals yet</h3>
            <p>Explore approved listings and place your first order.</p>
          </article>
        )}
      </section>
    </main>
  );
}

function CustomerDashboardSkeleton() {
  return (
    <main className="page-shell">
      <section className="section-header" aria-busy="true" aria-live="polite">
        <div className="skeleton-stack">
          <div className="skeleton skeleton-line large" style={{ width: "45%" }} />
          <div className="skeleton skeleton-line" style={{ width: "70%" }} />
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card" aria-hidden="true">
          <p className="eyebrow">Notifications</p>
          <div className="skeleton-stack">
            <div className="skeleton skeleton-line" style={{ width: "82%" }} />
            <div className="skeleton skeleton-line" style={{ width: "70%" }} />
            <div className="skeleton skeleton-line" style={{ width: "64%" }} />
          </div>
        </article>
        <article className="dashboard-card" aria-hidden="true">
          <p className="eyebrow">Rental Summary</p>
          <div className="mini-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`summary-loading-${index}`} className="skeleton skeleton-tile" />
            ))}
          </div>
        </article>
      </section>

      <section className="booking-stack">
        <BookingSkeletonCard />
        <BookingSkeletonCard />
      </section>
    </main>
  );
}

function BookingSkeletonCard() {
  return (
    <article className="booking-card skeleton-card" aria-hidden="true">
      <div className="booking-card-head">
        <div className="skeleton-stack">
          <span className="skeleton skeleton-chip" />
          <div className="skeleton skeleton-line large" style={{ width: "58%" }} />
          <div className="skeleton skeleton-line" style={{ width: "68%" }} />
        </div>
        <span className="skeleton skeleton-chip skeleton-chip-wide" />
      </div>
      <div className="skeleton skeleton-track" />
      <div className="booking-detail-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`booking-detail-${index}`} className="skeleton-stack">
            <div className="skeleton skeleton-line small" style={{ width: "50%" }} />
            <div className="skeleton skeleton-line" style={{ width: "80%" }} />
          </div>
        ))}
      </div>
    </article>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <p>All rights reserved. Copyright reserved with Rento. No unauthorized copyright use is allowed.</p>
    </footer>
  );
}


function readInitialTheme(): ThemeMode {
  const savedTheme = localStorage.getItem(themeKey);
  return savedTheme === "dark" ? "dark" : "light";
}

function getAnalyticsSessionId() {
  const existing = localStorage.getItem(analyticsSessionKey);
  if (existing) {
    return existing;
  }

  const sessionId = `sess-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(analyticsSessionKey, sessionId);
  return sessionId;
}

function getRentalDays(startDate: string, endDate: string) {
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

function getRouteFromHash(): Route {
  const value = window.location.hash.replace("#", "");
  if (
    value === "explore" ||
    value === "customer-auth" ||
    value === "customer-shipping" ||
    value === "customer-confirmation" ||
    value === "customer-dashboard" ||
    value === "advertiser" ||
    value === "admin" ||
    value === "admin-inventory" ||
    value === "admin-delivery" ||
    value === "admin-analytics" ||
    value === "admin-marketing"
  ) {
    return value;
  }

  return "home";
}

function isAdminRoute(route: Route) {
  return route.startsWith("admin");
}

function getAdminView(route: Route): AdminView {
  if (route === "admin-inventory") {
    return "inventory";
  }
  if (route === "admin-delivery") {
    return "delivery";
  }
  if (route === "admin-analytics") {
    return "analytics";
  }
  if (route === "admin-marketing") {
    return "marketing";
  }
  return "overview";
}

function getAdminRoute(view: AdminView): Route {
  const routes: Record<AdminView, Route> = {
    overview: "admin",
    inventory: "admin-inventory",
    delivery: "admin-delivery",
    analytics: "admin-analytics",
    marketing: "admin-marketing"
  };

  return routes[view];
}

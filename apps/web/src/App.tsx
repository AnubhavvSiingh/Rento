// Main application state, data fetching, and route composition.
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
  logoutCustomerSession,
  logoutUserSession,
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
import { type FeedbackTone } from "./components/feedback";
import { Footer } from "./components/Footer";
import { TopBar } from "./components/TopBar";
import { themeKey } from "./app/constants";
import { getAdminRoute, getAdminView, getRouteFromHash, isAdminRoute } from "./app/routing";
import { getAnalyticsSessionId, readInitialTheme } from "./app/session";
import type { AdminFilter, Route, ThemeMode } from "./app/types";
import { AdminPage } from "./pages/AdminPage";
import { AdvertiserPage } from "./pages/AdvertiserPage";
import { CustomerAuthPage, type CustomerAuthMode } from "./pages/CustomerAuthPage";
import { CustomerConfirmationPage } from "./pages/CustomerConfirmationPage";
import { CustomerDashboardPage } from "./pages/CustomerDashboardPage";
import { CustomerShippingPage } from "./pages/CustomerShippingPage";
import { ExplorePage } from "./pages/ExplorePage";
import { HomePage } from "./pages/HomePage";
import { formatStatus } from "./utils/booking";


export default function App() {
  const [route, setRoute] = useState<Route>(getRouteFromHash());
  const [theme, setTheme] = useState<ThemeMode>(() => readInitialTheme());
  const [overview, setOverview] = useState<Overview | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isMarketplaceLoading, setIsMarketplaceLoading] = useState(true);
  const [advertiserUser, setAdvertiserUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);
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
    void loadUserSession();
    void loadCustomerSession();
  }, []);

  useEffect(() => {
    if (advertiserUser) {
      void loadHostDashboard();
      return;
    }

    setHostDashboard(null);
    setIsHostLoading(false);
  }, [advertiserUser]);

  useEffect(() => {
    if (adminUser) {
      void loadAdminDashboard();
      return;
    }

    setAdminDashboard(null);
    setIsAdminLoading(false);
  }, [adminUser]);

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

  async function loadUserSession() {
    try {
      const response = await getAuthenticatedUser();

      if (!response.ok || !response.data.user) {
        setAdvertiserUser(null);
        setAdminUser(null);
        return;
      }

      if (response.data.user.role === "ADVERTISER") {
        setAdvertiserUser(response.data.user);
        setAdminUser(null);
        return;
      }

      if (response.data.user.role === "ADMIN") {
        setAdminUser(response.data.user);
        setAdvertiserUser(null);
        return;
      }

      setAdvertiserUser(null);
      setAdminUser(null);
    } catch (error) {
      console.error(error);
      setAdvertiserUser(null);
      setAdminUser(null);
    }
  }

  async function loadHostDashboard() {
    const shouldShowSkeleton = !hostDashboard;
    if (shouldShowSkeleton) {
      setIsHostLoading(true);
    }
    try {
      const response = await getHostDashboard();

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

  async function loadAdminDashboard() {
    const shouldShowSkeleton = !adminDashboard;
    if (shouldShowSkeleton) {
      setIsAdminLoading(true);
    }
    try {
      const response = await getAdminDashboard();

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

  async function loadCustomerSession() {
    const shouldShowSkeleton =
      bookings.length === 0 && notifications.length === 0 && reviews.length === 0;
    if (shouldShowSkeleton) {
      setIsCustomerLoading(true);
    }
    try {
      const [profileResponse, dashboardResponse] = await Promise.all([
        getCustomerProfile(),
        getCustomerDashboard()
      ]);

      if (!profileResponse.ok || !dashboardResponse.ok) {
        setCustomerProfile(null);
        setBookings([]);
        setReviews([]);
        setNotifications([]);
        return;
      }

      setCustomerProfile(profileResponse.data.customer);
      setBookings(dashboardResponse.data.bookings);
      setReviews(dashboardResponse.data.reviews);
      setNotifications(dashboardResponse.data.notifications);
    } catch (error) {
      console.error(error);
      setCustomerProfile(null);
      setBookings([]);
      setReviews([]);
      setNotifications([]);
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
      if (adminUser) {
        void loadAdminDashboard();
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

    if (!response.ok || !data.user) {
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
      setAdvertiserUser(data.user);
      setRegisteredAdvertiserEmail(data.user.email);
      setAdvertiserRegistrationStatus(data.user.accessStatus);
      void loadHostDashboard();
    } else {
      setAdminUser(data.user);
      void loadAdminDashboard();
    }
    finishRequest(requestKey);
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!advertiserUser) {
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

    const response = await createAdvertiserProduct(payload);
    const data = response.data;
    showStatus(
      response.ok
        ? "Product submitted for admin approval."
        : data.message ?? "Product submitted.",
      response.ok ? "success" : "error"
    );

    if (response.ok && data.product) {
      event.currentTarget.reset();
      await Promise.all([loadMarketplace(), loadHostDashboard()]);
    }
    finishRequest(requestKey);
  }

  async function submitAvailabilityBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!advertiserUser) {
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

    const response = await createAvailabilityBlock(payload);
    showStatus(response.data.message ?? "Availability saved.", response.ok ? "success" : "error");

    if (response.ok) {
      event.currentTarget.reset();
      await loadHostDashboard();
    }
    finishRequest(requestKey);
  }

  async function submitPricingRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!advertiserUser) {
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

    const response = await createPricingRule(payload);
    showStatus(response.data.message ?? "Pricing rule saved.", response.ok ? "success" : "error");

    if (response.ok) {
      event.currentTarget.reset();
      await loadHostDashboard();
    }
    finishRequest(requestKey);
  }

  async function updateAdvertiserAccess(
    userId: string,
    accessStatus: User["accessStatus"]
  ) {
    if (!adminUser) {
      return;
    }

    const response = await updateAdvertiserAccessStatus(userId, accessStatus);
    showStatus(
      response.data.message ?? "Advertiser access updated.",
      response.ok ? "success" : "error"
    );

    if (response.ok) {
      void loadAdminDashboard();
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

      if (!response.ok || !response.data.customer) {
        showStatus(response.data.message ?? "Unable to create customer account.", "error");
        finishRequest(requestKey);
        return;
      }

      setCustomerProfile(response.data.customer);
      await loadCustomerSession();
    } else {
      const response = await loginCustomerAccount({ email, password });

      if (!response.ok || !response.data.customer) {
        showStatus(
          response.data.message ??
            "Wrong user ID or password. Please check your customer login and try again.",
          "error"
        );
        finishRequest(requestKey);
        return;
      }

      setCustomerProfile(response.data.customer);
      await loadCustomerSession();
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

    if (!selectedProduct || !customerProfile) {
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
    const response = await createBookingRequest({
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
    await loadCustomerSession();
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
    if (!adminUser) {
      return;
    }

    const requestKey = "admin-action";
    setPendingRequest(requestKey);
    const response = await updateProductStatusRequest(productId, status);
    showStatus(
      response.data.message ?? `Listing ${status.toLowerCase()} successfully.`,
      response.ok ? "success" : "error"
    );

    if (response.ok) {
      await Promise.all([loadMarketplace(), loadAdminDashboard()]);
    }
    finishRequest(requestKey);
  }

  async function updateProductQa(productId: string, qaStatus: QaStatus) {
    if (!adminUser) {
      return;
    }

    const requestKey = "admin-action";
    setPendingRequest(requestKey);
    const qaNotes = qaNotesDraft[productId] ?? "";
    const response = await updateProductQaStatus(productId, qaStatus, qaNotes);
    showStatus(response.data.message ?? "Product QA updated.", response.ok ? "success" : "error");

    if (response.ok) {
      await Promise.all([loadMarketplace(), loadAdminDashboard()]);
    }
    finishRequest(requestKey);
  }

  async function updateBookingStatus(bookingId: string, status: BookingStatus) {
    if (!adminUser) {
      showStatus("Only admin can update shipment status.", "error");
      return;
    }

    const requestKey = "admin-action";
    setPendingRequest(requestKey);
    const response = await updateBookingStatusRequest(bookingId, status);
    showStatus(
      response.data.message ?? `Booking moved to ${formatStatus(status)}.`,
      response.ok ? "success" : "error"
    );

    if (response.ok) {
      await loadAdminDashboard();
      await loadCustomerSession();
      await loadHostDashboard();
    }
    finishRequest(requestKey);
  }

  async function scheduleReturn(bookingId: string) {
    if (!adminUser) {
      return;
    }

    const requestKey = "admin-action";
    setPendingRequest(requestKey);
    const returnScheduledAt = returnScheduleDraft[bookingId];
    const response = await scheduleReturnPickup(bookingId, returnScheduledAt);
    showStatus(response.data.message ?? "Return pickup updated.", response.ok ? "success" : "error");

    if (response.ok) {
      await loadAdminDashboard();
      await loadCustomerSession();
    }
    finishRequest(requestKey);
  }

  async function submitContentBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminUser) {
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

    const response = await createContentBlock(payload);
    showStatus(response.data.message ?? "Content block created.", response.ok ? "success" : "error");

    if (response.ok) {
      event.currentTarget.reset();
      await loadAdminDashboard();
    }
    finishRequest(requestKey);
  }

  async function toggleContentPublish(block: ContentBlock) {
    if (!adminUser) {
      return;
    }

    const requestKey = "admin-action";
    setPendingRequest(requestKey);
    const response = await updateContentBlock(block.id, {
      title: block.title,
      body: block.body,
      type: block.type,
      isPublished: !block.isPublished
    });
    showStatus(response.data.message ?? "Content updated.", response.ok ? "success" : "error");

    if (response.ok) {
      await loadAdminDashboard();
    }
    finishRequest(requestKey);
  }

  async function submitPromoCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminUser) {
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

    const response = await createPromoCampaign(payload);
    showStatus(response.data.message ?? "Promo created.", response.ok ? "success" : "error");

    if (response.ok) {
      event.currentTarget.reset();
      await loadAdminDashboard();
    }
    finishRequest(requestKey);
  }

  async function submitReferralCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminUser) {
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

    const response = await createReferralCode(payload);
    showStatus(response.data.message ?? "Referral created.", response.ok ? "success" : "error");

    if (response.ok) {
      event.currentTarget.reset();
      await loadAdminDashboard();
    }
    finishRequest(requestKey);
  }

  async function submitReview(event: FormEvent<HTMLFormElement>, booking: Booking) {
    event.preventDefault();
    if (!customerProfile) {
      showStatus("Please sign in as a customer to review this rental.", "error");
      return;
    }

    const requestKey = "review";
    setPendingRequest(requestKey);
    const form = new FormData(event.currentTarget);
    const response = await saveReview(booking.id, {
      rating: Number(form.get("rating") ?? 5),
      comment: String(form.get("comment") ?? ""),
      conditionNote: String(form.get("conditionNote") ?? "")
    });

    showStatus(response.data.message ?? "Review saved.", response.ok ? "success" : "error");
    if (response.ok) {
      await Promise.all([loadCustomerSession(), loadMarketplace()]);
      event.currentTarget.reset();
    }
    finishRequest(requestKey);
  }

  async function logoutCustomer() {
    await logoutCustomerSession();
    setCustomerProfile(null);
    setBookings([]);
    setReviews([]);
    setNotifications([]);
    showStatus("Customer signed out.", "info");
    navigate("home");
  }

  async function logoutUser() {
    await logoutUserSession();
    setAdvertiserUser(null);
    setAdminUser(null);
    setHostDashboard(null);
    setAdminDashboard(null);
    showStatus("Signed out.", "info");
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
              onLogout={() => void logoutCustomer()}
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
              onLogout={() => void logoutUser()}
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
              onLogout={() => void logoutUser()}
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

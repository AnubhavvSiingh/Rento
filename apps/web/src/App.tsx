import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createAdvertiserProduct,
  getAdminDashboard,
  getAdvertiserApprovalStatus,
  getAuthenticatedUser,
  getHostDashboard,
  getMarketplace,
  loginAccount,
  registerAdvertiserAccount,
  updateAdvertiserAccessStatus,
  type AdminDashboard,
  type HostDashboard,
  type Overview,
  type Product,
  type User
} from "./api";

type Route =
  | "home"
  | "explore"
  | "customer-auth"
  | "customer-shipping"
  | "customer-confirmation"
  | "customer-dashboard"
  | "advertiser"
  | "admin";

type CustomerAuthMode = "signup" | "signin";
type AdminFilter = "ALL" | "APPROVED" | "PENDING" | "SUSPENDED";
type ListingStatus = "PENDING" | "APPROVED" | "SUSPENDED";
type BookingStatus =
  | "PLACED"
  | "PACKED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RETURN_PICKUP"
  | "COMPLETED";

type CustomerProfile = {
  fullName: string;
  email: string;
  phone: string;
};

type StoredCustomerAccount = CustomerProfile & {
  password: string;
};

type ShippingDetails = {
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

type Booking = {
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

type ProductEnhancement = {
  status: ListingStatus;
  images: string[];
};

type Review = {
  id: string;
  productId: string;
  productName: string;
  customerEmail: string;
  rating: number;
  comment: string;
  conditionNote: string;
  createdAt: string;
};

type NotificationItem = {
  id: string;
  email: string;
  title: string;
  message: string;
  createdAt: string;
};

const customerAccountsKey = "rento_customer_accounts";
const customerEmailKey = "rento_current_customer_email";
const bookingsKey = "rento_bookings";
const productEnhancementsKey = "rento_product_enhancements";
const reviewsKey = "rento_reviews";
const notificationsKey = "rento_notifications";

const advertiserCategories = [
  "Furniture",
  "Appliances",
  "Fashion",
  "Ceremony",
  "Electronics"
];

const bookingStatuses: BookingStatus[] = [
  "PLACED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RETURN_PICKUP",
  "COMPLETED"
];

const categoryImages: Record<string, string[]> = {
  Furniture: [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80"
  ],
  Appliances: [
    "https://images.unsplash.com/photo-1586208958839-06c17cacdf08?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80"
  ],
  Fashion: [
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80"
  ],
  Ceremony: [
    "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80"
  ],
  Electronics: [
    "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80"
  ]
};

const homeVisuals = [
  {
    title: "Occasion wear that does not sit unused",
    note: "Let customers rent premium apparel for ceremonies, shoots, and special days.",
    image: categoryImages.Ceremony[0]
  },
  {
    title: "Furniture for flexible homes",
    note: "City movers can live well without buying heavy pieces they may later abandon.",
    image: categoryImages.Furniture[0]
  },
  {
    title: "Essentials ready for short stays",
    note: "Appliances and daily-use items become affordable through shared access.",
    image: categoryImages.Appliances[0]
  }
];

const advertiserVisuals = [
  {
    title: "Photographed listings perform better",
    note: "Clear, aesthetic product images help renters decide faster.",
    image: categoryImages.Fashion[1]
  },
  {
    title: "Homes and events need temporary items",
    note: "Unused products can become steady rental income with approval and tracking.",
    image: categoryImages.Furniture[1]
  },
  {
    title: "Measure income against upkeep",
    note: "Advertisers can see booking demand, revenue, cost, and ROI from one dashboard.",
    image: categoryImages.Electronics[1]
  }
];

export default function App() {
  const [route, setRoute] = useState<Route>(getRouteFromHash());
  const [overview, setOverview] = useState<Overview | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [advertiserUser, setAdvertiserUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [advertiserToken, setAdvertiserToken] = useState<string | null>(
    localStorage.getItem("rento_advertiser_token")
  );
  const [adminToken, setAdminToken] = useState<string | null>(
    localStorage.getItem("rento_admin_token")
  );
  const [hostDashboard, setHostDashboard] = useState<HostDashboard | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboard | null>(null);
  const [statusMessage, setStatusMessage] = useState("Choose how you want to enter Rento.");
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
  const [customerAccounts, setCustomerAccounts] = useState<StoredCustomerAccount[]>(() =>
    readStorage(customerAccountsKey, [])
  );
  const [bookings, setBookings] = useState<Booking[]>(() => readStorage(bookingsKey, []));
  const [productEnhancements, setProductEnhancements] = useState<
    Record<string, ProductEnhancement>
  >(() => readStorage(productEnhancementsKey, {}));
  const [reviews, setReviews] = useState<Review[]>(() => readStorage(reviewsKey, []));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    readStorage(notificationsKey, [])
  );

  useEffect(() => {
    void loadMarketplace();
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getRouteFromHash());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const email = localStorage.getItem(customerEmailKey);
    if (!email) {
      return;
    }

    const account = customerAccounts.find((item) => item.email === email);
    if (account) {
      setCustomerProfile({
        fullName: account.fullName,
        email: account.email,
        phone: account.phone
      });
    }
  }, [customerAccounts]);

  useEffect(() => {
    if (advertiserToken) {
      localStorage.setItem("rento_advertiser_token", advertiserToken);
      void loadAuthenticatedUser(advertiserToken, setAdvertiserUser, "ADVERTISER");
      void loadHostDashboard(advertiserToken);
    } else {
      localStorage.removeItem("rento_advertiser_token");
      setAdvertiserUser(null);
      setHostDashboard(null);
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
    }
  }, [adminToken]);

  useEffect(() => {
    if (registeredAdvertiserEmail) {
      localStorage.setItem("rento_registered_advertiser_email", registeredAdvertiserEmail);
      void refreshAdvertiserApprovalStatus(registeredAdvertiserEmail);
    } else {
      localStorage.removeItem("rento_registered_advertiser_email");
      setAdvertiserRegistrationStatus(null);
    }
  }, [registeredAdvertiserEmail]);

  useEffect(() => persistStorage(customerAccountsKey, customerAccounts), [customerAccounts]);
  useEffect(() => persistStorage(bookingsKey, bookings), [bookings]);
  useEffect(() => persistStorage(productEnhancementsKey, productEnhancements), [productEnhancements]);
  useEffect(() => persistStorage(reviewsKey, reviews), [reviews]);
  useEffect(() => persistStorage(notificationsKey, notifications), [notifications]);

  async function loadMarketplace() {
    try {
      const marketplace = await getMarketplace();
      setOverview(marketplace.overview);
      setProducts(marketplace.products);
    } catch (error) {
      console.error(error);
      setStatusMessage("Unable to load marketplace data.");
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
    }
  }

  async function loadAdminDashboard(token: string) {
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
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").toLowerCase();
    const payload = {
      name: String(form.get("name") ?? ""),
      email,
      password: String(form.get("password") ?? "")
    };

    const response = await registerAdvertiserAccount(payload);
    setStatusMessage(response.data.message ?? "Advertiser account submitted.");

    if (response.ok) {
      setRegisteredAdvertiserEmail(email);
      setAdvertiserRegistrationStatus("PENDING");
      event.currentTarget.reset();
      if (adminToken) {
        void loadAdminDashboard(adminToken);
      }
    }
  }

  async function login(event: FormEvent<HTMLFormElement>, role: User["role"]) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? "")
    };

    const response = await loginAccount(payload);
    const data = response.data;

    if (!response.ok || !data.token || !data.user) {
      setStatusMessage(data.message ?? "Login failed.");
      return;
    }

    if (data.user.role !== role) {
      setStatusMessage(`This account is not a ${role.toLowerCase()} login.`);
      return;
    }

    setStatusMessage(`Welcome back, ${data.user.name}.`);

    if (role === "ADVERTISER") {
      setAdvertiserToken(data.token);
      setRegisteredAdvertiserEmail(data.user.email);
      setAdvertiserRegistrationStatus(data.user.accessStatus);
    } else {
      setAdminToken(data.token);
    }
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!advertiserToken) {
      setStatusMessage("Please login as an approved advertiser first.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const imageUrls = String(form.get("imageUrls") ?? "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const payload = {
      name: String(form.get("name") ?? ""),
      category: String(form.get("category") ?? ""),
      city: String(form.get("city") ?? ""),
      dailyRate: Number(form.get("dailyRate") ?? 0),
      deposit: Number(form.get("deposit") ?? 0),
      description: String(form.get("description") ?? ""),
      tags: String(form.get("tags") ?? "")
    };

    const response = await createAdvertiserProduct(advertiserToken, payload);
    const data = response.data;
    setStatusMessage(
      response.ok
        ? "Product submitted for admin approval."
        : data.message ?? "Product submitted."
    );

    if (response.ok && data.product) {
      setProductEnhancements((current) => ({
        ...current,
        [data.product!.id]: {
          status: "PENDING",
          images: imageUrls.length > 0 ? imageUrls : getCategoryImages(data.product!.category)
        }
      }));
      event.currentTarget.reset();
      await Promise.all([loadMarketplace(), loadHostDashboard(advertiserToken)]);
    }
  }

  async function updateAdvertiserAccess(
    userId: string,
    accessStatus: User["accessStatus"]
  ) {
    if (!adminToken) {
      return;
    }

    const response = await updateAdvertiserAccessStatus(adminToken, userId, accessStatus);
    setStatusMessage(response.data.message ?? "Advertiser access updated.");

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
    setStatusMessage(`Continue your rental for "${product.name}".`);
  }

  function submitCustomerAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const email = String(form.get("email") ?? "").toLowerCase();
    const password = String(form.get("password") ?? "");

    if (customerAuthMode === "signup") {
      const profile = {
        fullName: String(form.get("fullName") ?? ""),
        email,
        phone: String(form.get("phone") ?? "")
      };

      const existingAccount = customerAccounts.find((item) => item.email === email);
      if (existingAccount) {
        setStatusMessage("This customer email already exists. Please sign in instead.");
        return;
      }

      setCustomerAccounts((current) => [...current, { ...profile, password }]);
      setCustomerProfile(profile);
      localStorage.setItem(customerEmailKey, email);
    } else {
      const existingAccount = customerAccounts.find(
        (item) => item.email === email && item.password === password
      );

      if (!existingAccount) {
        setStatusMessage("Invalid customer email or password.");
        return;
      }

      setCustomerProfile({
        fullName: existingAccount.fullName,
        email: existingAccount.email,
        phone: existingAccount.phone
      });
      localStorage.setItem(customerEmailKey, email);
    }

    navigate(selectedProduct ? "customer-shipping" : "customer-dashboard");
    setStatusMessage(
      selectedProduct
        ? "Add shipment and payment details to place your rental order."
        : "Welcome to your customer dashboard."
    );
  }

  function submitShipping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (!selectedProduct || !customerProfile) {
      setStatusMessage("Please choose a product and sign in before checkout.");
      navigate("explore");
      return;
    }

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
    const days = getRentalDays(details.rentalStartDate, details.rentalEndDate);
    const totalAmount = days * selectedProduct.dailyRate + selectedProduct.deposit;
    const booking: Booking = {
      id: createId("ord"),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productCategory: selectedProduct.category,
      dailyRate: selectedProduct.dailyRate,
      deposit: selectedProduct.deposit,
      customerName: customerProfile.fullName,
      customerEmail: customerProfile.email,
      customerPhone: customerProfile.phone,
      shippingDetails: details,
      status: "PLACED",
      paymentStatus: "PAID",
      trackingCode: `RENTO-${Date.now().toString().slice(-7)}`,
      totalAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setShippingDetails(details);
    setCurrentBooking(booking);
    setBookings((current) => [booking, ...current]);
    addNotification(
      customerProfile.email,
      "Order placed",
      `Your rental order for ${selectedProduct.name} is confirmed. We will email the shipment tracking link shortly.`
    );
    navigate("customer-confirmation");
    setStatusMessage(
      "Your order has been placed. We will email you the shipment tracking link shortly."
    );
  }

  function updateProductStatus(productId: string, status: ListingStatus) {
    const product = products.find((item) => item.id === productId);
    setProductEnhancements((current) => ({
      ...current,
      [productId]: {
        status,
        images: current[productId]?.images ?? getCategoryImages(product?.category ?? "Furniture")
      }
    }));
    setStatusMessage(`Listing ${status.toLowerCase()} successfully.`);
  }

  function updateBookingStatus(bookingId: string, status: BookingStatus) {
    const bookingToUpdate = bookings.find((booking) => booking.id === bookingId);

    if (bookingToUpdate) {
      addNotification(
        bookingToUpdate.customerEmail,
        "Shipment update",
        `${bookingToUpdate.productName} is now ${formatStatus(status).toLowerCase()}.`
      );
    }

    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId
          ? {
          ...booking,
          status,
          updatedAt: new Date().toISOString()
            }
          : booking
      )
    );
    setStatusMessage(`Booking moved to ${formatStatus(status)}.`);
  }

  function submitReview(event: FormEvent<HTMLFormElement>, booking: Booking) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const existingReview = reviews.find((item) => item.id === booking.id);
    const review: Review = {
      id: booking.id,
      productId: booking.productId,
      productName: booking.productName,
      customerEmail: booking.customerEmail,
      rating: Number(form.get("rating") ?? 5),
      comment: String(form.get("comment") ?? ""),
      conditionNote: String(form.get("conditionNote") ?? ""),
      createdAt: new Date().toISOString()
    };

    setReviews((current) =>
      existingReview ? current.map((item) => (item.id === review.id ? review : item)) : [review, ...current]
    );
    setStatusMessage("Review saved. This helps future renters trust the product.");
    event.currentTarget.reset();
  }

  function logoutCustomer() {
    localStorage.removeItem(customerEmailKey);
    setCustomerProfile(null);
    setStatusMessage("Customer signed out.");
    navigate("home");
  }

  function addNotification(email: string, title: string, message: string) {
    setNotifications((current) => [
      {
        id: createId("ntf"),
        email,
        title,
        message,
        createdAt: new Date().toISOString()
      },
      ...current
    ]);
  }

  const approvedProducts = useMemo(
    () => products.filter((product) => getListingStatus(product, productEnhancements) === "APPROVED"),
    [products, productEnhancements]
  );

  const filteredAdvertisers = useMemo(() => {
    const advertisers = adminDashboard?.advertisers ?? [];
    return advertisers.filter((user) => {
      const matchesSearch = user.email.toLowerCase().includes(adminSearch.toLowerCase());
      const matchesFilter = adminFilter === "ALL" ? true : user.accessStatus === adminFilter;
      return matchesSearch && matchesFilter;
    });
  }, [adminDashboard, adminFilter, adminSearch]);

  const customerBookings = useMemo(
    () =>
      customerProfile
        ? bookings.filter((booking) => booking.customerEmail === customerProfile.email)
        : [],
    [bookings, customerProfile]
  );

  const advertiserBookings = useMemo(() => {
    if (!advertiserUser) {
      return [];
    }

    const ownProductNames = new Set(
      products
        .filter((product) => product.owner === advertiserUser.name)
        .map((product) => product.name)
    );
    return bookings.filter((booking) => ownProductNames.has(booking.productName));
  }, [advertiserUser, bookings, products]);

  return (
    <div className="app-shell">
      <TopBar route={route} navigate={navigate} hasCustomer={Boolean(customerProfile)} />
      <div key={route} className="page-stage">
        {route === "home" && (
          <HomePage overview={overview} navigate={navigate} statusMessage={statusMessage} />
        )}
        {route === "explore" && (
          <ExplorePage
            products={approvedProducts}
            overview={overview}
            reviews={reviews}
            productEnhancements={productEnhancements}
            onRent={beginRentFlow}
            selectedProduct={selectedProduct}
          />
        )}
        {route === "customer-auth" && (
          <CustomerAuthPage
            mode={customerAuthMode}
            product={selectedProduct}
            onModeChange={setCustomerAuthMode}
            onSubmit={submitCustomerAuth}
          />
        )}
        {route === "customer-shipping" && (
          <CustomerShippingPage
            product={selectedProduct}
            customerProfile={customerProfile}
            onSubmit={submitShipping}
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
            bookings={customerBookings}
            notifications={notifications.filter(
              (item) => item.email === customerProfile?.email
            )}
            reviews={reviews}
            onGoToAuth={() => navigate("customer-auth")}
            onExplore={() => navigate("explore")}
            onLogout={logoutCustomer}
            onStatusChange={updateBookingStatus}
            onSubmitReview={submitReview}
          />
        )}
        {route === "advertiser" && (
          <AdvertiserPage
            advertiserUser={advertiserUser}
            hostDashboard={hostDashboard}
            statusMessage={statusMessage}
            registeredAdvertiserEmail={registeredAdvertiserEmail}
            advertiserRegistrationStatus={advertiserRegistrationStatus}
            productEnhancements={productEnhancements}
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
          />
        )}
        {route === "admin" && (
          <AdminPage
            adminUser={adminUser}
            adminDashboard={adminDashboard}
            filteredAdvertisers={filteredAdvertisers}
            adminSearch={adminSearch}
            adminFilter={adminFilter}
            productSearch={productSearch}
            products={products}
            bookings={bookings}
            productEnhancements={productEnhancements}
            statusMessage={statusMessage}
            onSearchChange={setAdminSearch}
            onFilterChange={setAdminFilter}
            onProductSearchChange={setProductSearch}
            onLogin={login}
            onLogout={() => setAdminToken(null)}
            onUpdateAccess={updateAdvertiserAccess}
            onUpdateProductStatus={updateProductStatus}
            onUpdateBookingStatus={updateBookingStatus}
          />
        )}
      </div>
      <Footer />
    </div>
  );
}

function TopBar({
  route,
  navigate,
  hasCustomer
}: {
  route: Route;
  navigate: (route: Route) => void;
  hasCustomer: boolean;
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
        <button type="button" className="ghost-button" onClick={() => navigate("customer-dashboard")}>
          {hasCustomer ? "My Rentals" : "Customer Login"}
        </button>
        {route !== "admin" && (
          <button type="button" className="mini-admin-button" onClick={() => navigate("admin")}>
            Are you Admin
          </button>
        )}
      </nav>
    </header>
  );
}

function HomePage({
  overview,
  navigate,
  statusMessage
}: {
  overview: Overview | null;
  navigate: (route: Route) => void;
  statusMessage: string;
}) {
  return (
    <main className="page-shell">
      <section className="hero hero-home">
        <div className="hero-copy">
          <p className="eyebrow">Main Page</p>
          <h1>Rento</h1>
          <p className="hero-text">
            A rental marketplace where customers book useful items, advertisers turn
            unused products into income, and admin keeps access and listings trustworthy.
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
            <span>Book online</span>
            <span>Track shipment</span>
            <span>Return with condition notes</span>
          </div>
        </div>
        <div className="hero-panel">
          <p className="panel-title">Live platform snapshot</p>
          <div className="stat-strip">
            <div className="stat-box">
              <strong>{overview?.stats.listedProducts ?? "-"}</strong>
              <span className="stat-label">Advertisements</span>
            </div>
            <div className="stat-box">
              <strong>{overview?.stats.activeHosts ?? "-"}</strong>
              <span className="stat-label">Advertisers</span>
            </div>
            <div className="stat-box">
              <strong>{overview?.stats.cities ?? "-"}</strong>
              <span className="stat-label">Cities</span>
            </div>
          </div>
          <p className="status-banner">{statusMessage}</p>
        </div>
      </section>

      <section className="visual-gallery">
        {homeVisuals.map((item) => (
          <ImageCard key={item.title} item={item} />
        ))}
      </section>
    </main>
  );
}

function ExplorePage({
  products,
  overview,
  reviews,
  productEnhancements,
  selectedProduct,
  onRent
}: {
  products: Product[];
  overview: Overview | null;
  reviews: Review[];
  productEnhancements: Record<string, ProductEnhancement>;
  selectedProduct: Product | null;
  onRent: (product: Product) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [city, setCity] = useState("All");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("recommended");
  const cities = useMemo(
    () => Array.from(new Set(products.map((product) => product.city))).sort(),
    [products]
  );
  const filteredProducts = useMemo(() => {
    const max = maxPrice ? Number(maxPrice) : Number.POSITIVE_INFINITY;
    const filtered = products.filter((product) => {
      const matchesText = `${product.name} ${product.description} ${product.category}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory = category === "All" || product.category === category;
      const matchesCity = city === "All" || product.city === city;
      const matchesPrice = product.dailyRate <= max;
      return matchesText && matchesCategory && matchesCity && matchesPrice;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "price-low") {
        return a.dailyRate - b.dailyRate;
      }
      if (sort === "price-high") {
        return b.dailyRate - a.dailyRate;
      }
      return a.name.localeCompare(b.name);
    });
  }, [category, city, maxPrice, products, search, sort]);

  return (
    <main className="page-shell">
      <section className="section-header">
        <div>
          <p className="eyebrow">Customer Landing Page</p>
          <h2>Rent what you need, only for as long as you need it.</h2>
          <p className="section-text">
            {overview?.positioning ??
              "Browse approved listings, compare deposits, book dates, and track delivery."}
          </p>
        </div>
        <div className="status-banner compact">
          {filteredProducts.length} approved listings ready to rent
        </div>
      </section>

      <section className="filter-panel" aria-label="Search and filters">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search lehenga, sofa, fridge, camera..."
        />
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="All">All categories</option>
          {advertiserCategories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={city} onChange={(event) => setCity(event.target.value)}>
          <option value="All">All cities</option>
          {cities.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
          placeholder="Max Rs/day"
        />
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="recommended">Recommended</option>
          <option value="price-low">Price: low to high</option>
          <option value="price-high">Price: high to low</option>
        </select>
      </section>

      <section className="cards cards-wide">
        {filteredProducts.map((product) => (
          <article key={product.id} className="card product-card">
            <ProductImages product={product} enhancements={productEnhancements} />
            <div className="product-card-body">
              <span className="badge">{product.category}</span>
              <h3>{product.name}</h3>
              <p className="price">Rs {product.dailyRate}/day</p>
              <p>{product.description}</p>
              <p className="meta-line">
                {product.city} | Deposit Rs {product.deposit}
              </p>
              <RatingSummary productId={product.id} reviews={reviews} />
              <div className="card-footer">
                <button type="button" className="primary-button" onClick={() => onRent(product)}>
                  {selectedProduct?.id === product.id ? "Continue Rental" : "Rent this item"}
                </button>
              </div>
            </div>
          </article>
        ))}
        {filteredProducts.length === 0 && (
          <article className="card">
            <h3>No approved listing matched</h3>
            <p>Try a wider city, category, or price range.</p>
          </article>
        )}
      </section>
    </main>
  );
}

function CustomerAuthPage({
  mode,
  product,
  onModeChange,
  onSubmit
}: {
  mode: CustomerAuthMode;
  product: Product | null;
  onModeChange: (mode: CustomerAuthMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="page-shell narrow-page">
      <section className="section-header">
        <div>
          <p className="eyebrow">Customer Access</p>
          <h2>{product ? `Continue booking ${product.name}` : "Enter your customer dashboard"}</h2>
          <p className="section-text">
            Sign up once with your details. After that, sign in directly with email and password.
          </p>
        </div>
      </section>

      <article className="auth-card">
        <div className="tab-row">
          <button
            type="button"
            className={mode === "signup" ? "filter-chip active" : "filter-chip"}
            onClick={() => onModeChange("signup")}
          >
            Sign up
          </button>
          <button
            type="button"
            className={mode === "signin" ? "filter-chip active" : "filter-chip"}
            onClick={() => onModeChange("signin")}
          >
            Sign in
          </button>
        </div>
        <form className="stack-form" onSubmit={onSubmit}>
          {mode === "signup" && (
            <input name="fullName" type="text" placeholder="Full name" required />
          )}
          <input name="email" type="email" placeholder="Email ID" required />
          {mode === "signup" && (
            <input name="phone" type="tel" placeholder="Phone number" required />
          )}
          <input name="password" type="password" placeholder="Password" minLength={6} required />
          <button type="submit" className="primary-button">
            {mode === "signup" ? "Create customer account" : "Sign in"}
          </button>
        </form>
      </article>
    </main>
  );
}

function CustomerShippingPage({
  product,
  customerProfile,
  onSubmit
}: {
  product: Product | null;
  customerProfile: CustomerProfile | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
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
            <div className="payment-panel">
              <p className="panel-title">Payment</p>
              <select name="paymentMethod" defaultValue="UPI">
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Net banking">Net banking</option>
                <option value="Wallet">Wallet</option>
              </select>
              <input
                name="paymentReference"
                type="text"
                placeholder="Payment reference, UPI ID, or transaction ID"
              />
              <p className="meta-line">
                Demo checkout confirms payment in-app. A live Razorpay or Stripe key can be added later.
              </p>
            </div>
            <button type="submit" className="primary-button" disabled={!product || !customerProfile}>
              Pay Rs {total || 0} and place order
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
        </article>
      </section>
    </main>
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
  onGoToAuth,
  onExplore,
  onLogout,
  onStatusChange,
  onSubmitReview
}: {
  customerProfile: CustomerProfile | null;
  bookings: Booking[];
  notifications: NotificationItem[];
  reviews: Review[];
  onGoToAuth: () => void;
  onExplore: () => void;
  onLogout: () => void;
  onStatusChange: (bookingId: string, status: BookingStatus) => void;
  onSubmitReview: (event: FormEvent<HTMLFormElement>, booking: Booking) => void;
}) {
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

      <section className="dashboard-grid">
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
            <div>Active: {bookings.filter((item) => item.status !== "COMPLETED").length}</div>
            <div>Completed: {bookings.filter((item) => item.status === "COMPLETED").length}</div>
            <div>Paid: Rs {bookings.reduce((total, item) => total + item.totalAmount, 0)}</div>
          </div>
        </article>
      </section>

      <section className="booking-stack">
        {bookings.map((booking) => {
          const review = reviews.find((item) => item.id === booking.id);
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
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onStatusChange(booking.id, getNextStatus(booking.status))}
                  disabled={booking.status === "COMPLETED"}
                >
                  {booking.status === "COMPLETED" ? "Completed" : "Move to next status"}
                </button>
              </div>
              <StatusTrack status={booking.status} />
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
              </div>
              {booking.status === "DELIVERED" || booking.status === "RETURN_PICKUP" || booking.status === "COMPLETED" ? (
                <form className="stack-form review-form" onSubmit={(event) => onSubmitReview(event, booking)}>
                  <p className="panel-title">{review ? "Update your review" : "Rate this rental"}</p>
                  <select name="rating" defaultValue={review?.rating ?? 5}>
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Good</option>
                    <option value="3">3 - Okay</option>
                    <option value="2">2 - Needs improvement</option>
                    <option value="1">1 - Poor</option>
                  </select>
                  <textarea name="comment" placeholder="How was the rental experience?" defaultValue={review?.comment} />
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
        {bookings.length === 0 && (
          <article className="booking-card">
            <h3>No rentals yet</h3>
            <p>Explore approved listings and place your first order.</p>
          </article>
        )}
      </section>
    </main>
  );
}

function AdvertiserPage({
  advertiserUser,
  hostDashboard,
  statusMessage,
  registeredAdvertiserEmail,
  advertiserRegistrationStatus,
  productEnhancements,
  bookings,
  onRegister,
  onRefreshApproval,
  onLogin,
  onLogout,
  onSubmitProduct
}: {
  advertiserUser: User | null;
  hostDashboard: HostDashboard | null;
  statusMessage: string;
  registeredAdvertiserEmail: string | null;
  advertiserRegistrationStatus: User["accessStatus"] | null;
  productEnhancements: Record<string, ProductEnhancement>;
  bookings: Booking[];
  onRegister: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onRefreshApproval: () => Promise<void>;
  onLogin: (event: FormEvent<HTMLFormElement>, role: User["role"]) => Promise<void>;
  onLogout: () => void;
  onSubmitProduct: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <main className="page-shell">
      <section className="section-header">
        <div>
          <p className="eyebrow">Advertiser Page</p>
          <h2>Register, wait for approval, then manage your rental income.</h2>
          <p className="section-text">
            Post products, track admin approval, watch ROI, and monitor bookings once access is approved.
          </p>
        </div>
        <p className="status-banner compact">{statusMessage}</p>
      </section>

      <section className="auth-layout">
        {!advertiserUser && (
          <article className="auth-card">
            <p className="eyebrow">Step 1</p>
            <h3>Create advertiser account</h3>
            <form className="stack-form" onSubmit={(event) => void onRegister(event)}>
              <input name="name" type="text" placeholder="Full name" required />
              <input name="email" type="email" placeholder="Login email" required />
              <input
                name="password"
                type="password"
                placeholder="Create password"
                minLength={8}
                required
              />
              <button type="submit" className="primary-button">
                Register as advertiser
              </button>
            </form>
          </article>
        )}

        {!advertiserUser && registeredAdvertiserEmail && advertiserRegistrationStatus !== "APPROVED" && (
          <article className="auth-card approval-card">
            <p className="eyebrow">Approval Status</p>
            <h3>
              {advertiserRegistrationStatus === "SUSPENDED"
                ? "Access is currently suspended."
                : "Awaiting approval"}
            </h3>
            <p className="meta-line">
              {registeredAdvertiserEmail} | {advertiserRegistrationStatus ?? "PENDING"}
            </p>
            <p>
              {advertiserRegistrationStatus === "SUSPENDED"
                ? "Admin has suspended this advertiser account for now."
                : "Your advertiser account is awaiting approval. Press refresh to check the latest status."}
            </p>
            <button type="button" className="secondary-button" onClick={() => void onRefreshApproval()}>
              Refresh approval status
            </button>
          </article>
        )}

        {!advertiserUser && advertiserRegistrationStatus === "APPROVED" && (
          <article className="auth-card">
            <p className="eyebrow">Step 2</p>
            <h3>Advertiser login</h3>
            <form className="stack-form" onSubmit={(event) => void onLogin(event, "ADVERTISER")}>
              <input
                name="email"
                type="email"
                placeholder="Advertiser email"
                defaultValue={registeredAdvertiserEmail ?? ""}
                required
              />
              <input name="password" type="password" placeholder="Password" required />
              <button type="submit" className="secondary-button">
                Login to advertiser panel
              </button>
            </form>
          </article>
        )}
      </section>

      {advertiserUser && (
        <section className="dashboard-grid">
          <article className="dashboard-card">
            <p className="eyebrow">Advertiser Dashboard</p>
            <h3>{advertiserUser.name}</h3>
            <p className="meta-line">
              {advertiserUser.email} | {advertiserUser.accessStatus}
            </p>
            {hostDashboard ? (
              <>
                <div className="mini-grid four-up">
                  <div>Total listings: {hostDashboard.summary.totalListings}</div>
                  <div>Revenue: Rs {hostDashboard.summary.monthlyRevenue}</div>
                  <div>Utilization: {hostDashboard.summary.utilizationRate}%</div>
                  <div>Verified: {hostDashboard.summary.verifiedListings}</div>
                </div>
                <section className="chart-section">
                  <div className="mini-grid four-up">
                    <div>Portfolio revenue: Rs {hostDashboard.performance.portfolioRevenue}</div>
                    <div>Portfolio cost: Rs {hostDashboard.performance.portfolioCost}</div>
                    <div>ROI gain: {hostDashboard.performance.portfolioRoiPercent}%</div>
                    <div>Bookings: {bookings.length}</div>
                  </div>
                  <div className="chart-grid">
                    <div className="chart-card">
                      <p className="eyebrow">Revenue vs Cost</p>
                      <RoiTrendChart trend={hostDashboard.performance.roiTrend} />
                    </div>
                    <div className="chart-card">
                      <p className="eyebrow">Listing Performance</p>
                      <ListingPerformanceChart listings={hostDashboard.performance.listingPerformance} />
                    </div>
                  </div>
                </section>
                <div className="listing-stack">
                  {hostDashboard.listings.map((listing) => (
                    <div key={listing.id} className="listing-item">
                      <strong>{listing.name}</strong>
                      <span>
                        {listing.city} | Rs {listing.dailyRate}/day |{" "}
                        {getListingStatus(listing, productEnhancements)}
                      </span>
                    </div>
                  ))}
                  {hostDashboard.listings.length === 0 && (
                    <p className="meta-line">No products posted yet.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="meta-line">Waiting for dashboard data.</p>
            )}
            <button type="button" className="secondary-button" onClick={onLogout}>
              Logout advertiser
            </button>
          </article>

          <article className="dashboard-card">
            <p className="eyebrow">Post Advertisement</p>
            <h3>Publish a product listing</h3>
            <form className="stack-form" onSubmit={(event) => void onSubmitProduct(event)}>
              <input name="name" type="text" placeholder="Product name" required />
              <select name="category" defaultValue="Furniture" required>
                {advertiserCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input name="city" type="text" placeholder="City" required />
              <input name="dailyRate" type="number" placeholder="Daily rent" min="1" required />
              <input name="deposit" type="number" placeholder="Deposit amount" min="0" required />
              <textarea name="description" placeholder="Describe the advertisement" required />
              <textarea
                name="imageUrls"
                placeholder="Paste product image URLs, one per line"
              />
              <input name="tags" type="text" placeholder="Tags separated by commas" />
              <button type="submit" className="primary-button">
                Submit for admin approval
              </button>
            </form>
          </article>

          <article className="dashboard-card wide-card">
            <p className="eyebrow">Booking Requests</p>
            <div className="booking-stack compact">
              {bookings.map((booking) => (
                <div key={booking.id} className="booking-card small-card">
                  <strong>{booking.productName}</strong>
                  <span>{booking.customerName} | {formatStatus(booking.status)}</span>
                  <span>Tracking {booking.trackingCode} | Rs {booking.totalAmount}</span>
                </div>
              ))}
              {bookings.length === 0 && <p className="meta-line">No bookings for your listings yet.</p>}
            </div>
          </article>
        </section>
      )}

      <section className="visual-gallery compact-gallery">
        {advertiserVisuals.map((item) => (
          <ImageCard key={item.title} item={item} />
        ))}
      </section>
    </main>
  );
}

function AdminPage({
  adminUser,
  adminDashboard,
  filteredAdvertisers,
  adminSearch,
  adminFilter,
  productSearch,
  products,
  bookings,
  productEnhancements,
  statusMessage,
  onSearchChange,
  onFilterChange,
  onProductSearchChange,
  onLogin,
  onLogout,
  onUpdateAccess,
  onUpdateProductStatus,
  onUpdateBookingStatus
}: {
  adminUser: User | null;
  adminDashboard: AdminDashboard | null;
  filteredAdvertisers: User[];
  adminSearch: string;
  adminFilter: AdminFilter;
  productSearch: string;
  products: Product[];
  bookings: Booking[];
  productEnhancements: Record<string, ProductEnhancement>;
  statusMessage: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: AdminFilter) => void;
  onProductSearchChange: (value: string) => void;
  onLogin: (event: FormEvent<HTMLFormElement>, role: User["role"]) => Promise<void>;
  onLogout: () => void;
  onUpdateAccess: (userId: string, accessStatus: User["accessStatus"]) => Promise<void>;
  onUpdateProductStatus: (productId: string, status: ListingStatus) => void;
  onUpdateBookingStatus: (bookingId: string, status: BookingStatus) => void;
}) {
  const filterCards = [
    { label: "Total advertisers", value: adminDashboard?.summary.totalAdvertisers ?? 0, key: "ALL" as AdminFilter },
    { label: "Approved", value: adminDashboard?.summary.approved ?? 0, key: "APPROVED" as AdminFilter },
    { label: "Pending", value: adminDashboard?.summary.pending ?? 0, key: "PENDING" as AdminFilter },
    { label: "Suspended", value: adminDashboard?.summary.suspended ?? 0, key: "SUSPENDED" as AdminFilter }
  ];
  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.owner ?? ""} ${product.category}`
      .toLowerCase()
      .includes(productSearch.toLowerCase())
  );

  return (
    <main className="page-shell">
      <section className="section-header">
        <div>
          <p className="eyebrow">Admin Control Page</p>
          <h2>Monitor registrations, listings, bookings, and delivery progress.</h2>
          <p className="section-text">
            Admin can approve advertisers, moderate product listings, and move rental orders through shipment stages.
          </p>
        </div>
        <p className="status-banner compact">{statusMessage}</p>
      </section>

      <section className="admin-layout">
        <article className="auth-card">
          <p className="eyebrow">Admin Login</p>
          <h3>Enter the control room</h3>
          <p className="meta-line">
            Default admin: <strong>admin@rento.local</strong> / <strong>Admin@12345</strong>
          </p>
          <form className="stack-form" onSubmit={(event) => void onLogin(event, "ADMIN")}>
            <input name="email" type="email" placeholder="Admin email" required />
            <input name="password" type="password" placeholder="Admin password" required />
            <button type="submit" className="primary-button">
              Login as admin
            </button>
          </form>
        </article>

        <article className="dashboard-card wide-card">
          <p className="eyebrow">Registration Dashboard</p>
          {adminUser && adminDashboard ? (
            <>
              <div className="filter-card-grid">
                {filterCards.map((card) => (
                  <button
                    key={card.key}
                    type="button"
                    className={adminFilter === card.key ? "filter-summary-card active" : "filter-summary-card"}
                    onClick={() => onFilterChange(card.key)}
                  >
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                  </button>
                ))}
              </div>
              <div className="search-row">
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search through Login ID"
                />
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Login ID</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdvertisers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.accessStatus}</td>
                        <td className="action-row">
                          <button type="button" className="tiny-button" onClick={() => void onUpdateAccess(user.id, "APPROVED")}>
                            Accept
                          </button>
                          <button type="button" className="tiny-button muted" onClick={() => void onUpdateAccess(user.id, "PENDING")}>
                            Hold
                          </button>
                          <button type="button" className="tiny-button warning" onClick={() => void onUpdateAccess(user.id, "SUSPENDED")}>
                            Suspend
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAdvertisers.length === 0 && (
                  <p className="meta-line">No login IDs matched this search or filter.</p>
                )}
              </div>
              <button type="button" className="secondary-button" onClick={onLogout}>
                Logout admin
              </button>
            </>
          ) : (
            <p className="meta-line">Login to review advertiser registrations and change their access.</p>
          )}
        </article>
      </section>

      {adminUser && (
        <>
          <section className="dashboard-card moderation-panel">
            <div className="section-header inner-header">
              <div>
                <p className="eyebrow">Product Moderation</p>
                <h3>Approve listings before customers can rent them.</h3>
              </div>
              <input
                type="search"
                value={productSearch}
                onChange={(event) => onProductSearchChange(event.target.value)}
                placeholder="Search products or advertiser"
              />
            </div>
            <div className="moderation-list">
              {filteredProducts.map((product) => (
                <article key={product.id} className="moderation-item">
                  <ProductImages product={product} enhancements={productEnhancements} />
                  <div>
                    <h4>{product.name}</h4>
                    <p className="meta-line">
                      {product.owner ?? "Advertiser"} | {product.city} | Rs {product.dailyRate}/day
                    </p>
                    <span className="badge">{getListingStatus(product, productEnhancements)}</span>
                  </div>
                  <div className="action-row">
                    <button type="button" className="tiny-button" onClick={() => onUpdateProductStatus(product.id, "APPROVED")}>
                      Approve
                    </button>
                    <button type="button" className="tiny-button muted" onClick={() => onUpdateProductStatus(product.id, "PENDING")}>
                      Hold
                    </button>
                    <button type="button" className="tiny-button warning" onClick={() => onUpdateProductStatus(product.id, "SUSPENDED")}>
                      Suspend
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="dashboard-card moderation-panel">
            <p className="eyebrow">Booking Monitor</p>
            <div className="booking-stack compact">
              {bookings.map((booking) => (
                <article key={booking.id} className="booking-card small-card">
                  <strong>{booking.productName}</strong>
                  <span>
                    {booking.customerName} | {booking.trackingCode} | {formatStatus(booking.status)}
                  </span>
                  <div className="action-row">
                    {bookingStatuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={booking.status === status ? "tiny-button active-chip" : "tiny-button"}
                        onClick={() => onUpdateBookingStatus(booking.id, status)}
                      >
                        {formatStatus(status)}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
              {bookings.length === 0 && <p className="meta-line">No bookings placed yet.</p>}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function ProductImages({
  product,
  enhancements
}: {
  product: Product;
  enhancements: Record<string, ProductEnhancement>;
}) {
  const images = getProductImages(product, enhancements);

  return (
    <div className="product-image-shell">
      <img src={images[0]} alt={product.name} />
      <div className="image-strip">
        {images.slice(0, 3).map((image) => (
          <span key={image} className="image-thumb" style={{ backgroundImage: `url(${image})` }} />
        ))}
      </div>
    </div>
  );
}

function RatingSummary({ productId, reviews }: { productId: string; reviews: Review[] }) {
  const productReviews = reviews.filter((item) => item.productId === productId);
  const average =
    productReviews.length === 0
      ? 0
      : productReviews.reduce((total, item) => total + item.rating, 0) / productReviews.length;

  return (
    <p className="meta-line">
      {productReviews.length === 0
        ? "No reviews yet"
        : `${average.toFixed(1)}/5 from ${productReviews.length} reviews`}
    </p>
  );
}

function StatusTrack({ status }: { status: BookingStatus }) {
  const activeIndex = bookingStatuses.indexOf(status);

  return (
    <div className="status-track">
      {bookingStatuses.map((item, index) => (
        <span key={item} className={index <= activeIndex ? "status-step active" : "status-step"}>
          {formatStatus(item)}
        </span>
      ))}
    </div>
  );
}

function ImageCard({
  item
}: {
  item: { title: string; note: string; image: string };
}) {
  return (
    <article className="image-card">
      <img src={item.image} alt={item.title} />
      <div className="image-card-copy">
        <h3>{item.title}</h3>
        <p>{item.note}</p>
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

function RoiTrendChart({
  trend
}: {
  trend: Array<{ label: string; revenue: number; cost: number }>;
}) {
  const maxValue = Math.max(1, ...trend.flatMap((item) => [item.revenue, item.cost]));

  return (
    <div className="chart-wrap">
      {trend.map((point) => (
        <div key={point.label} className="trend-col">
          <div className="trend-bars">
            <span
              className="bar revenue-bar"
              style={{ height: `${(point.revenue / maxValue) * 100}%` }}
              title={`Revenue Rs ${point.revenue}`}
            />
            <span
              className="bar cost-bar"
              style={{ height: `${(point.cost / maxValue) * 100}%` }}
              title={`Cost Rs ${point.cost}`}
            />
          </div>
          <span className="trend-label">{point.label}</span>
        </div>
      ))}
    </div>
  );
}

function ListingPerformanceChart({
  listings
}: {
  listings: HostDashboard["performance"]["listingPerformance"];
}) {
  const maxRoi = Math.max(1, ...listings.map((item) => item.roiPercent));

  return (
    <div className="listing-chart-list">
      {listings.map((item) => (
        <div key={item.productId} className="listing-chart-row">
          <div className="listing-chart-head">
            <strong>{item.name}</strong>
            <span>{item.roiPercent}% ROI</span>
          </div>
          <div className="listing-chart-track">
            <span
              className="listing-chart-fill"
              style={{ width: `${(item.roiPercent / maxRoi) * 100}%` }}
            />
          </div>
          <p className="meta-line">
            {item.views} views | {item.inquiries} inquiries | {item.bookedDays} booked days
          </p>
        </div>
      ))}
      {listings.length === 0 && <p className="meta-line">Post a listing to see ROI performance.</p>}
    </div>
  );
}

function readStorage<T>(key: string, fallback: T): T {
  const value = localStorage.getItem(key);
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function persistStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getCategoryImages(category: string) {
  return categoryImages[category] ?? categoryImages.Furniture;
}

function getProductImages(
  product: Product,
  enhancements: Record<string, ProductEnhancement>
) {
  const customImages = enhancements[product.id]?.images ?? [];
  return customImages.length > 0 ? customImages : getCategoryImages(product.category);
}

function getListingStatus(
  product: Product,
  enhancements: Record<string, ProductEnhancement>
): ListingStatus {
  return enhancements[product.id]?.status ?? "APPROVED";
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

function getNextStatus(status: BookingStatus): BookingStatus {
  const index = bookingStatuses.indexOf(status);
  return bookingStatuses[Math.min(index + 1, bookingStatuses.length - 1)];
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((item) => item.charAt(0) + item.slice(1).toLowerCase())
    .join(" ");
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
    value === "admin"
  ) {
    return value;
  }

  return "home";
}

import { FormEvent, useEffect, useState } from "react";

type Route = "home" | "explore" | "advertiser" | "admin";

type Product = {
  id: string;
  name: string;
  city: string;
  category: string;
  dailyRate: number;
  deposit: number;
  description: string;
  owner?: string;
};

type Overview = {
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

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "ADVERTISER";
  accessStatus: "PENDING" | "APPROVED" | "SUSPENDED";
  createdAt: string;
};

type HostDashboard = {
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

type AdminDashboard = {
  summary: {
    totalAdvertisers: number;
    approved: number;
    pending: number;
    suspended: number;
  };
  advertisers: User[];
};

const apiBaseUrl = "http://localhost:4000";
const advertiserCategories = [
  "Furniture",
  "Appliances",
  "Fashion",
  "Ceremony",
  "Electronics"
];
const homeVisuals = [
  {
    title: "Wedding lehenga and occasion wear",
    note: "Apparel rentals for ceremonies, shoots, and one-time events.",
    image:
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Furniture for moving and city living",
    note: "Make temporary homes feel complete without long-term buying costs.",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Appliances and essentials on demand",
    note: "Useful daily items ready to rent for flexible lifestyles.",
    image:
      "https://images.unsplash.com/photo-1586208958839-06c17cacdf08?auto=format&fit=crop&w=900&q=80"
  }
];
const exploreVisuals = [
  {
    title: "Studio-ready fashion rentals",
    note: "Aesthetic apparel options that feel premium and camera-ready.",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Soft modern interiors",
    note: "Furniture listings that help renters imagine the space instantly.",
    image:
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80"
  }
];
const advertiserVisuals = [
  {
    title: "Well-photographed listings perform better",
    note: "Clean composition and good lighting drive more views and inquiries.",
    image:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Home essentials that feel trustworthy",
    note: "Polished images make practical products feel easier to rent quickly.",
    image:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Event and ceremony inventory that stands out",
    note: "Beautiful category presentation helps advertisers win attention faster.",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80"
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
  const [rentingProductId, setRentingProductId] = useState<string | null>(null);

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

  async function loadMarketplace() {
    try {
      const [overviewResponse, productsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/overview`),
        fetch(`${apiBaseUrl}/api/products`)
      ]);

      const overviewData = (await overviewResponse.json()) as Overview;
      const productsData = (await productsResponse.json()) as Product[];
      setOverview(overviewData);
      setProducts(productsData);
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
      const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        setter(null);
        return;
      }

      const data = (await response.json()) as { user: User };
      if (data.user.role !== expectedRole) {
        setter(null);
        return;
      }

      setter(data.user);
    } catch (error) {
      console.error(error);
      setter(null);
    }
  }

  async function loadHostDashboard(token: string) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/host-dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        setHostDashboard(null);
        return;
      }

      setHostDashboard((await response.json()) as HostDashboard);
    } catch (error) {
      console.error(error);
      setHostDashboard(null);
    }
  }

  async function loadAdminDashboard(token: string) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        setAdminDashboard(null);
        return;
      }

      setAdminDashboard((await response.json()) as AdminDashboard);
    } catch (error) {
      console.error(error);
      setAdminDashboard(null);
    }
  }

  async function registerAdvertiser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? "")
    };

    const response = await fetch(`${apiBaseUrl}/api/auth/register-advertiser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = (await response.json()) as { message?: string };
    setStatusMessage(data.message ?? "Advertiser account submitted.");

    if (response.ok) {
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

    const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = (await response.json()) as {
      message?: string;
      token?: string;
      user?: User;
    };

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
    const payload = {
      name: String(form.get("name") ?? ""),
      category: String(form.get("category") ?? ""),
      city: String(form.get("city") ?? ""),
      dailyRate: Number(form.get("dailyRate") ?? 0),
      deposit: Number(form.get("deposit") ?? 0),
      description: String(form.get("description") ?? ""),
      tags: String(form.get("tags") ?? "")
    };

    const response = await fetch(`${apiBaseUrl}/api/advertiser/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${advertiserToken}`
      },
      body: JSON.stringify(payload)
    });

    const data = (await response.json()) as { message?: string };
    setStatusMessage(data.message ?? "Product submitted.");

    if (response.ok) {
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

    const response = await fetch(`${apiBaseUrl}/api/admin/users/${userId}/access`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ accessStatus })
    });

    const data = (await response.json()) as { message?: string };
    setStatusMessage(data.message ?? "Advertiser access updated.");

    if (response.ok) {
      void loadAdminDashboard(adminToken);
    }
  }

  function navigate(nextRoute: Route) {
    window.location.hash = nextRoute === "home" ? "" : nextRoute;
  }

  function rentProduct(product: Product) {
    setRentingProductId(product.id);
    setStatusMessage(
      `Rental request started for "${product.name}". We can turn this into a checkout flow next.`
    );
  }

  return (
    <div className="app-shell">
      <TopBar route={route} navigate={navigate} />
      <div key={route} className="page-stage">
        {route === "home" && (
          <HomePage overview={overview} navigate={navigate} statusMessage={statusMessage} />
        )}
        {route === "explore" && (
          <ExplorePage
            products={products}
            overview={overview}
            navigate={navigate}
            onRent={rentProduct}
            rentingProductId={rentingProductId}
          />
        )}
        {route === "advertiser" && (
          <AdvertiserPage
            advertiserUser={advertiserUser}
            hostDashboard={hostDashboard}
            statusMessage={statusMessage}
            onRegister={registerAdvertiser}
            onLogin={login}
            onLogout={() => setAdvertiserToken(null)}
            onSubmitProduct={submitProduct}
          />
        )}
        {route === "admin" && (
          <AdminPage
            adminUser={adminUser}
            adminDashboard={adminDashboard}
            statusMessage={statusMessage}
            onLogin={login}
            onLogout={() => setAdminToken(null)}
            onUpdateAccess={updateAdvertiserAccess}
          />
        )}
      </div>
      <Footer />
    </div>
  );
}

function TopBar({
  route,
  navigate
}: {
  route: Route;
  navigate: (route: Route) => void;
}) {
  return (
    <header className="topbar">
      <button type="button" className="brand-link" onClick={() => navigate("home")}>
        Rento
      </button>
      <nav className="topbar-nav">
        {route !== "home" && (
          <button type="button" className="ghost-button" onClick={() => navigate("home")}>
            Main Page
          </button>
        )}
        {route !== "explore" && (
          <button type="button" className="ghost-button" onClick={() => navigate("explore")}>
            Explore Rento
          </button>
        )}
        {route !== "advertiser" && (
          <button type="button" className="ghost-button" onClick={() => navigate("advertiser")}>
            Are you an Advertiser?
          </button>
        )}
        <button type="button" className="mini-admin-button" onClick={() => navigate("admin")}>
          Are you Admin
        </button>
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
    <main className="page-shell home-page">
      <section className="hero hero-home">
        <div className="hero-copy">
          <p className="eyebrow">Main Page</p>
          <h1>Choose your Rento journey in one click.</h1>
          <p className="hero-text">
            Discover beautifully listed rentals, turn unused items into earning
            assets, or step into the admin control room. Rento is built to keep
            people reading, browsing, and posting with confidence.
          </p>
          <div className="main-actions">
            <button type="button" className="primary-button" onClick={() => navigate("advertiser")}>
              Are you an Advertiser?
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate("explore")}>
              Explore Rento
            </button>
          </div>
          <p className="status-banner">{statusMessage}</p>
          <div className="story-ribbon">
            <span>More listings get attention</span>
            <span>More renters discover value</span>
            <span>More unused items find a second life</span>
          </div>
          <CuteBadgeRow />
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
          <div className="visual-frame">
            <HomeGraphic />
          </div>
        </div>
      </section>

      <section className="story-grid">
        <article className="story-card">
          <p className="eyebrow">Why People Stay</p>
          <h3>Rento keeps customers engaged by making temporary ownership feel easy.</h3>
          <p>
            The easier it is to discover trusted rentals, the longer people browse,
            compare, and book. That creates more visibility for every advertiser on
            the platform.
          </p>
        </article>
        <article className="story-card">
          <p className="eyebrow">Why Advertisers Post</p>
          <h3>Unused inventory becomes visible, useful, and profitable.</h3>
          <p>
            Furniture, fashion, appliances, and event pieces can all keep moving
            instead of staying idle. Better presentation turns more page visitors
            into real renters.
          </p>
        </article>
      </section>
      <section className="visual-gallery">
        {homeVisuals.map((item) => (
          <article key={item.title} className="image-card">
            <img src={item.image} alt={item.title} />
            <div className="image-card-copy">
              <h3>{item.title}</h3>
              <p>{item.note}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function ExplorePage({
  products,
  overview,
  navigate,
  onRent,
  rentingProductId
}: {
  products: Product[];
  overview: Overview | null;
  navigate: (route: Route) => void;
  onRent: (product: Product) => void;
  rentingProductId: string | null;
}) {
  return (
    <main className="page-shell">
      <section className="section-header">
        <div>
          <p className="eyebrow">Customer Landing Page</p>
          <h2>Explore all posted advertisements and rent what you need.</h2>
          <p className="section-text">
            {overview?.positioning ??
              "Browse products from approved advertisers and start renting immediately."} Every
            listing is designed to pull the customer deeper into discovery so more
            people rent instead of delay.
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={() => navigate("advertiser")}>
          Want to post instead?
        </button>
      </section>
      <section className="feature-band">
        <div className="feature-copy">
          <p className="eyebrow">Explore More</p>
          <h3>More people arrive here to browse useful, stylish, ready-to-rent items.</h3>
          <p>
            The explore page should feel active and trustworthy. Rich visuals and
            strong descriptions help customers rent faster and help advertisers get
            more attention on their products.
          </p>
          <CuteBadgeRow />
        </div>
        <div className="visual-frame slim">
          <ExploreGraphic />
        </div>
      </section>
      <section className="cards cards-wide">
        {products.map((product) => (
          <article key={product.id} className="card product-card">
            <p className="eyebrow">{product.category}</p>
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <p className="meta-line">
              {product.city} | Deposit Rs {product.deposit}
            </p>
            <div className="card-footer">
              <p className="price">Rs {product.dailyRate}/day</p>
              <button
                type="button"
                className="primary-button"
                onClick={() => onRent(product)}
              >
                {rentingProductId === product.id ? "Rental Requested" : "Rent this item"}
              </button>
            </div>
          </article>
        ))}
      </section>
      <section className="visual-gallery compact-gallery">
        {exploreVisuals.map((item) => (
          <article key={item.title} className="image-card mini-image-card">
            <img src={item.image} alt={item.title} />
            <div className="image-card-copy">
              <h3>{item.title}</h3>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function AdvertiserPage({
  advertiserUser,
  hostDashboard,
  statusMessage,
  onRegister,
  onLogin,
  onLogout,
  onSubmitProduct
}: {
  advertiserUser: User | null;
  hostDashboard: HostDashboard | null;
  statusMessage: string;
  onRegister: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onLogin: (event: FormEvent<HTMLFormElement>, role: User["role"]) => Promise<void>;
  onLogout: () => void;
  onSubmitProduct: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <main className="page-shell">
      <section className="section-header">
        <div>
          <p className="eyebrow">Advertiser Page</p>
          <h2>Register, login, and publish advertisements after approval.</h2>
          <p className="section-text">
            Advertisers can create an account first. Once admin approves access, they
            can open their dashboard and post products that attract renters looking
            for flexible, city-friendly solutions.
          </p>
          <CuteBadgeRow />
        </div>
        <p className="status-banner compact">{statusMessage}</p>
      </section>
      <section className="feature-band advertiser-band">
        <div className="feature-copy">
          <p className="eyebrow">Advertise Better</p>
          <h3>Turn every unused item into a clean, discoverable advertisement.</h3>
          <p>
            Better product stories, better visuals, and faster posting create more
            visibility. The more people advertise here, the more customers return to
            browse and rent.
          </p>
        </div>
        <div className="visual-frame slim">
          <AdvertiserGraphic />
        </div>
      </section>

      <section className="auth-layout">
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

        <article className="auth-card">
          <p className="eyebrow">Step 2</p>
          <h3>Advertiser login</h3>
          <form className="stack-form" onSubmit={(event) => void onLogin(event, "ADVERTISER")}>
            <input name="email" type="email" placeholder="Advertiser email" required />
            <input name="password" type="password" placeholder="Password" required />
            <button type="submit" className="secondary-button">
              Login to advertiser panel
            </button>
          </form>
          <p className="meta-line">
            Only approved advertisers can enter the dashboard and post products.
          </p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <p className="eyebrow">Advertiser Dashboard</p>
          {advertiserUser ? (
            <>
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
                  <ul className="list-block">
                    {hostDashboard.actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                  <section className="chart-section">
                    <div className="mini-grid four-up">
                      <div>Portfolio revenue: Rs {hostDashboard.performance.portfolioRevenue}</div>
                      <div>Portfolio cost: Rs {hostDashboard.performance.portfolioCost}</div>
                      <div>ROI gain: {hostDashboard.performance.portfolioRoiPercent}%</div>
                      <div>
                        Best listing ROI:{" "}
                        {Math.max(
                          0,
                          ...hostDashboard.performance.listingPerformance.map(
                            (item) => item.roiPercent
                          )
                        )}
                        %
                      </div>
                    </div>
                    <div className="chart-grid">
                      <div className="chart-card">
                        <p className="eyebrow">Revenue vs Cost</p>
                        <RoiTrendChart trend={hostDashboard.performance.roiTrend} />
                      </div>
                      <div className="chart-card">
                        <p className="eyebrow">Listing Performance</p>
                        <ListingPerformanceChart
                          listings={hostDashboard.performance.listingPerformance}
                        />
                      </div>
                    </div>
                  </section>
                  <div className="listing-stack">
                    {hostDashboard.listings.map((listing) => (
                      <div key={listing.id} className="listing-item">
                        <strong>{listing.name}</strong>
                        <span>
                          {listing.city} | Rs {listing.dailyRate}/day
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
            </>
          ) : (
            <p className="meta-line">
              Login with an approved advertiser account to open the dashboard.
            </p>
          )}
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
            <input name="tags" type="text" placeholder="Tags separated by commas" />
            <button type="submit" className="primary-button">
              Post product advertisement
            </button>
          </form>
        </article>
      </section>
      <section className="visual-gallery compact-gallery">
        {advertiserVisuals.map((item) => (
          <article key={item.title} className="image-card mini-image-card">
            <img src={item.image} alt={item.title} />
            <div className="image-card-copy">
              <h3>{item.title}</h3>
              <p>{item.note}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function AdminPage({
  adminUser,
  adminDashboard,
  statusMessage,
  onLogin,
  onLogout,
  onUpdateAccess
}: {
  adminUser: User | null;
  adminDashboard: AdminDashboard | null;
  statusMessage: string;
  onLogin: (event: FormEvent<HTMLFormElement>, role: User["role"]) => Promise<void>;
  onLogout: () => void;
  onUpdateAccess: (userId: string, accessStatus: User["accessStatus"]) => Promise<void>;
}) {
  return (
    <main className="page-shell">
      <section className="section-header">
        <div>
          <p className="eyebrow">Admin Control Page</p>
          <h2>Monitor registrations and allow access.</h2>
          <p className="section-text">
            This page keeps the approval workflow separate from the customer and
            advertiser journeys.
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
              <div className="mini-grid four-up">
                <div>Total advertisers: {adminDashboard.summary.totalAdvertisers}</div>
                <div>Approved: {adminDashboard.summary.approved}</div>
                <div>Pending: {adminDashboard.summary.pending}</div>
                <div>Suspended: {adminDashboard.summary.suspended}</div>
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
                    {adminDashboard.advertisers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.accessStatus}</td>
                        <td className="action-row">
                          <button
                            type="button"
                            className="tiny-button"
                            onClick={() => void onUpdateAccess(user.id, "APPROVED")}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="tiny-button muted"
                            onClick={() => void onUpdateAccess(user.id, "PENDING")}
                          >
                            Hold
                          </button>
                          <button
                            type="button"
                            className="tiny-button warning"
                            onClick={() => void onUpdateAccess(user.id, "SUSPENDED")}
                          >
                            Suspend
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="secondary-button" onClick={onLogout}>
                Logout admin
              </button>
            </>
          ) : (
            <p className="meta-line">
              Login to review advertiser registrations and change their access.
            </p>
          )}
        </article>
      </section>
    </main>
  );
}

function CuteBadgeRow() {
  return (
    <div className="cute-badge-row" aria-hidden="true">
      <div className="cute-badge">
        <span className="cute-icon">♡</span>
        <span>Warm browsing</span>
      </div>
      <div className="cute-badge">
        <span className="cute-icon">✦</span>
        <span>Happy rentals</span>
      </div>
      <div className="cute-badge">
        <span className="cute-icon">❋</span>
        <span>Fresh listings</span>
      </div>
    </div>
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
  const maxValue = Math.max(
    1,
    ...trend.flatMap((item) => [item.revenue, item.cost])
  );

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
    </div>
  );
}

function HomeGraphic() {
  return (
    <svg viewBox="0 0 420 250" className="scene-graphic" aria-hidden="true">
      <defs>
        <linearGradient id="homeGlow" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#f8d8b8" />
          <stop offset="100%" stopColor="#d7885c" />
        </linearGradient>
      </defs>
      <rect x="22" y="20" width="376" height="210" rx="28" fill="#fff8f1" />
      <rect x="58" y="58" width="116" height="132" rx="24" fill="url(#homeGlow)" opacity="0.94" />
      <circle cx="116" cy="100" r="22" fill="#fff4ea" />
      <path d="M86 156c12-20 27-30 43-30 20 0 35 11 44 31" fill="none" stroke="#fff8f1" strokeWidth="12" strokeLinecap="round" />
      <rect x="198" y="54" width="146" height="54" rx="20" fill="#efe0d0" />
      <rect x="198" y="124" width="62" height="54" rx="18" fill="#ffffff" />
      <rect x="274" y="124" width="66" height="54" rx="18" fill="#efd4bf" />
      <text x="212" y="86" fill="#8d4b29" fontSize="13" fontWeight="700">Live rental momentum</text>
      <text x="209" y="156" fill="#8d4b29" fontSize="12" fontWeight="700">Browse</text>
      <text x="291" y="156" fill="#8d4b29" fontSize="12" fontWeight="700">Post</text>
      <circle cx="352" cy="62" r="8" fill="#f8e6d7" />
      <circle cx="366" cy="80" r="5" fill="#f3d4be" />
    </svg>
  );
}

function ExploreGraphic() {
  return (
    <svg viewBox="0 0 360 220" className="scene-graphic" aria-hidden="true">
      <rect x="18" y="20" width="324" height="180" rx="30" fill="#fff8f1" />
      <rect x="42" y="48" width="104" height="126" rx="22" fill="#ecc5a8" />
      <circle cx="90" cy="96" r="22" fill="#fff5eb" />
      <path d="M70 128l44-40" stroke="#fff6ee" strokeWidth="14" fill="none" strokeLinecap="round" />
      <rect x="160" y="50" width="140" height="44" rx="18" fill="#f0e0cf" />
      <rect x="160" y="108" width="58" height="62" rx="18" fill="#ffffff" />
      <rect x="232" y="108" width="58" height="62" rx="18" fill="#f7d7be" />
      <text x="174" y="77" fill="#8d4b29" fontSize="13" fontWeight="700">Browse active listings</text>
      <text x="177" y="145" fill="#8d4b29" fontSize="12" fontWeight="700">Rent</text>
      <text x="242" y="145" fill="#8d4b29" fontSize="12" fontWeight="700">Repeat</text>
      <circle cx="304" cy="69" r="6" fill="#f3d4be" />
    </svg>
  );
}

function AdvertiserGraphic() {
  return (
    <svg viewBox="0 0 360 220" className="scene-graphic" aria-hidden="true">
      <rect x="18" y="18" width="324" height="184" rx="30" fill="#fff8f1" />
      <rect x="42" y="38" width="126" height="146" rx="24" fill="#f0ddca" />
      <rect x="62" y="58" width="88" height="18" rx="9" fill="#fff" opacity="0.82" />
      <rect x="62" y="88" width="74" height="18" rx="9" fill="#fff" opacity="0.74" />
      <rect x="62" y="118" width="60" height="18" rx="9" fill="#fff" opacity="0.66" />
      <rect x="186" y="38" width="122" height="58" rx="20" fill="#e7b894" />
      <rect x="186" y="114" width="122" height="64" rx="20" fill="#ffffff" />
      <text x="197" y="74" fill="#6e341a" fontSize="13" fontWeight="700">Post your product</text>
      <text x="201" y="151" fill="#8d4b29" fontSize="12" fontWeight="700">Get discovered</text>
      <circle cx="309" cy="50" r="6" fill="#f8e3d0" />
    </svg>
  );
}

function getRouteFromHash(): Route {
  const value = window.location.hash.replace("#", "");
  if (value === "explore" || value === "advertiser" || value === "admin") {
    return value;
  }

  return "home";
}

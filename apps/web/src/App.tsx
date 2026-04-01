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
            People can either explore listed products, become advertisers, or enter
            the admin control room. Each path now has its own dedicated page.
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
        </div>
        <div className="hero-panel">
          <p className="panel-title">Live platform snapshot</p>
          <div className="stat-strip">
            <div>
              <strong>{overview?.stats.listedProducts ?? "-"}</strong>
              <span>Advertisements</span>
            </div>
            <div>
              <strong>{overview?.stats.activeHosts ?? "-"}</strong>
              <span>Advertisers</span>
            </div>
            <div>
              <strong>{overview?.stats.cities ?? "-"}</strong>
              <span>Cities</span>
            </div>
          </div>
        </div>
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
              "Browse products from approved advertisers and start renting immediately."}
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={() => navigate("advertiser")}>
          Want to post instead?
        </button>
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
            can open their dashboard and post products.
          </p>
        </div>
        <p className="status-banner compact">{statusMessage}</p>
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

function getRouteFromHash(): Route {
  const value = window.location.hash.replace("#", "");
  if (value === "explore" || value === "advertiser" || value === "admin") {
    return value;
  }

  return "home";
}

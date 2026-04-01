import { FormEvent, useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  city: string;
  category: string;
  dailyRate: number;
  deposit: number;
  description: string;
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

export default function App() {
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
  const [statusMessage, setStatusMessage] = useState("Ready.");

  useEffect(() => {
    void loadMarketplace();
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

  async function login(
    event: FormEvent<HTMLFormElement>,
    role: User["role"]
  ) {
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

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Rento</p>
          <h1>Rental access with admin-controlled advertiser onboarding.</h1>
          <p className="hero-text">
            Consumers browse products, advertisers request access with a login ID
            and password, and admin approves who can operate on the platform.
          </p>
          <div className="stat-strip">
            <div>
              <strong>{overview?.stats.listedProducts ?? "-"}</strong>
              <span>Listings</span>
            </div>
            <div>
              <strong>{overview?.stats.activeHosts ?? "-"}</strong>
              <span>Hosts</span>
            </div>
            <div>
              <strong>{overview?.stats.pendingAdvertisers ?? "-"}</strong>
              <span>Pending Access</span>
            </div>
          </div>
        </div>
        <div className="hero-panel">
          <p className="panel-title">Current setup</p>
          <ul>
            <li>Advertisers sign up with login ID and password</li>
            <li>Admin decides who gets approved access</li>
            <li>PostgreSQL stores users, sessions, and products</li>
          </ul>
          <p className="status-banner">{statusMessage}</p>
        </div>
      </header>

      <section className="section-grid" id="consumer">
        <div className="section-heading">
          <p className="eyebrow">Consumer Marketplace</p>
          <h2>Discover rental inventory already stored in PostgreSQL.</h2>
          <p>{overview?.positioning ?? "Loading marketplace overview..."}</p>
        </div>
        <div className="cards">
          {products.map((item) => (
            <article key={item.id} className="card">
              <h3>{item.name}</h3>
              <p className="price">Rs {item.dailyRate}/day</p>
              <p>{item.description}</p>
              <p className="meta-line">
                {item.city} · {item.category} · Deposit Rs {item.deposit}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="auth-layout">
        <article className="auth-card">
          <p className="eyebrow">Advertiser Access</p>
          <h2>Create advertiser login</h2>
          <form className="stack-form" onSubmit={registerAdvertiser}>
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
              Request advertiser access
            </button>
          </form>

          <h3>Advertiser login</h3>
          <form className="stack-form" onSubmit={(event) => void login(event, "ADVERTISER")}>
            <input name="email" type="email" placeholder="Advertiser email" required />
            <input name="password" type="password" placeholder="Password" required />
            <button type="submit" className="secondary-button">
              Login as advertiser
            </button>
          </form>

          <div className="session-box">
            <p className="panel-title">Advertiser status</p>
            {advertiserUser ? (
              <>
                <p>{advertiserUser.name}</p>
                <p className="meta-line">
                  {advertiserUser.email} · {advertiserUser.accessStatus}
                </p>
                {hostDashboard ? (
                  <div className="mini-grid">
                    <div>Listings: {hostDashboard.summary.totalListings}</div>
                    <div>Revenue: Rs {hostDashboard.summary.monthlyRevenue}</div>
                    <div>Utilization: {hostDashboard.summary.utilizationRate}%</div>
                    <div>Verified: {hostDashboard.summary.verifiedListings}</div>
                  </div>
                ) : (
                  <p className="meta-line">Waiting for dashboard data.</p>
                )}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setAdvertiserToken(null)}
                >
                  Logout advertiser
                </button>
              </>
            ) : (
              <p className="meta-line">
                Approved advertisers will see their dashboard after login.
              </p>
            )}
          </div>
        </article>

        <article className="auth-card admin-card">
          <p className="eyebrow">Admin Control</p>
          <h2>Monitor registrations and allow access.</h2>
          <p className="meta-line">
            Default admin login: <strong>admin@rento.local</strong> /{" "}
            <strong>Admin@12345</strong>
          </p>

          <form className="stack-form" onSubmit={(event) => void login(event, "ADMIN")}>
            <input name="email" type="email" placeholder="Admin email" required />
            <input name="password" type="password" placeholder="Admin password" required />
            <button type="submit" className="primary-button">
              Login as admin
            </button>
          </form>

          {adminUser && adminDashboard ? (
            <div className="session-box">
              <div className="mini-grid">
                <div>Total: {adminDashboard.summary.totalAdvertisers}</div>
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
                            onClick={() => void updateAdvertiserAccess(user.id, "APPROVED")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="tiny-button muted"
                            onClick={() => void updateAdvertiserAccess(user.id, "PENDING")}
                          >
                            Hold
                          </button>
                          <button
                            type="button"
                            className="tiny-button warning"
                            onClick={() => void updateAdvertiserAccess(user.id, "SUSPENDED")}
                          >
                            Suspend
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setAdminToken(null)}
              >
                Logout admin
              </button>
            </div>
          ) : (
            <div className="session-box">
              <p className="meta-line">
                Admin can review advertiser requests and update access status here.
              </p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

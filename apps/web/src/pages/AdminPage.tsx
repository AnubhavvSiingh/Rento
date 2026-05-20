import type { FormEvent } from "react";
import type {
  AdminDashboard,
  Booking,
  BookingStatus,
  ContentBlock,
  ListingStatus,
  Product,
  QaStatus,
  User
} from "../api";
import { ProductImages } from "../components/marketplace";
import { bookingStatuses, formatStatus } from "../utils/booking";

export function AdminPage({
  adminUser,
  adminDashboard,
  filteredAdvertisers,
  isLoading,
  adminSearch,
  adminFilter,
  productSearch,
  products,
  bookings,
  statusMessage,
  onSearchChange,
  onFilterChange,
  onProductSearchChange,
  onLogin,
  onLogout,
  onUpdateAccess,
  onUpdateProductStatus,
  onUpdateProductQa,
  onUpdateBookingStatus,
  onScheduleReturn,
  onSubmitContent,
  onToggleContentPublish,
  onSubmitPromoCampaign,
  onSubmitReferralCode,
  qaNotesDraft,
  onQaNotesChange,
  returnScheduleDraft,
  onReturnScheduleChange
}: {
  adminUser: User | null;
  adminDashboard: AdminDashboard | null;
  filteredAdvertisers: User[];
  isLoading: boolean;
  adminSearch: string;
  adminFilter: "ALL" | "APPROVED" | "PENDING" | "SUSPENDED";
  productSearch: string;
  products: Product[];
  bookings: Booking[];
  statusMessage: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: "ALL" | "APPROVED" | "PENDING" | "SUSPENDED") => void;
  onProductSearchChange: (value: string) => void;
  onLogin: (event: FormEvent<HTMLFormElement>, role: User["role"]) => Promise<void>;
  onLogout: () => void;
  onUpdateAccess: (userId: string, accessStatus: User["accessStatus"]) => Promise<void>;
  onUpdateProductStatus: (productId: string, status: ListingStatus) => void;
  onUpdateProductQa: (productId: string, status: QaStatus) => void;
  onUpdateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  onScheduleReturn: (bookingId: string) => void;
  onSubmitContent: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleContentPublish: (block: ContentBlock) => Promise<void>;
  onSubmitPromoCampaign: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onSubmitReferralCode: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  qaNotesDraft: Record<string, string>;
  onQaNotesChange: (productId: string, value: string) => void;
  returnScheduleDraft: Record<string, string>;
  onReturnScheduleChange: (bookingId: string, value: string) => void;
}) {
  const filterCards = [
    { label: "Total advertisers", value: adminDashboard?.summary.totalAdvertisers ?? 0, key: "ALL" as const },
    { label: "Approved", value: adminDashboard?.summary.approved ?? 0, key: "APPROVED" as const },
    { label: "Pending", value: adminDashboard?.summary.pending ?? 0, key: "PENDING" as const },
    { label: "Suspended", value: adminDashboard?.summary.suspended ?? 0, key: "SUSPENDED" as const }
  ];
  const showSkeletons = Boolean(isLoading && adminUser && !adminDashboard);
  const contentBlocks = adminDashboard?.contentBlocks ?? [];
  const promoCampaigns = adminDashboard?.promoCampaigns ?? [];
  const referralCodes = adminDashboard?.referralCodes ?? [];
  const risk = adminDashboard?.risk;
  const analytics = adminDashboard?.analytics;
  const auditLogs = adminDashboard?.recentAuditLogs ?? [];
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
        <div className="status-banner compact">
          <strong>{statusMessage}</strong>
          <span className="meta-line">
            Pending QA: {adminDashboard?.summary.pendingQaListings ?? 0}
          </span>
        </div>
      </section>

      <section className="admin-layout" aria-busy={showSkeletons} aria-live="polite">
        <article className="auth-card">
          <p className="eyebrow">Admin Login</p>
          <h3>Enter the control room</h3>
          <p className="meta-line">Admin credentials are managed server-side.</p>
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
          {adminUser && showSkeletons ? (
            <AdminRegistrationSkeleton />
          ) : adminUser && adminDashboard ? (
            <>
              <div className="filter-card-grid">
                {filterCards.map((card) => (
                  <button
                    key={card.key}
                    type="button"
                    className={
                      adminFilter === card.key
                        ? "filter-summary-card active"
                        : "filter-summary-card"
                    }
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
        showSkeletons ? (
          <AdminDashboardSkeleton />
        ) : (
          <>
          <section className="dashboard-card moderation-panel">
            <div className="section-header inner-header">
              <div>
                <p className="eyebrow">Inventory QA</p>
                <h3>Approve or reject listings based on photo quality.</h3>
              </div>
            </div>
            <div className="moderation-list">
              {products
                .filter((product) => product.qaStatus !== "APPROVED")
                .map((product) => (
                  <article key={`qa-${product.id}`} className="moderation-item">
                    <ProductImages product={product} />
                    <div>
                      <h4>{product.name}</h4>
                      <p className="meta-line">
                        QA status: {product.qaStatus} | Photos: {product.photoQuality?.averageScore ?? 0}/100
                      </p>
                      <textarea
                        className="qa-note"
                        value={qaNotesDraft[product.id] ?? product.qaNotes ?? ""}
                        onChange={(event) => onQaNotesChange(product.id, event.target.value)}
                        placeholder="QA notes for host"
                      />
                    </div>
                    <div className="action-row">
                      <button
                        type="button"
                        className="tiny-button"
                        onClick={() => onUpdateProductQa(product.id, "APPROVED")}
                      >
                        Approve QA
                      </button>
                      <button
                        type="button"
                        className="tiny-button warning"
                        onClick={() => onUpdateProductQa(product.id, "REJECTED")}
                      >
                        Reject QA
                      </button>
                    </div>
                  </article>
                ))}
              {products.filter((product) => product.qaStatus !== "APPROVED").length === 0 && (
                <p className="meta-line">No pending QA items.</p>
              )}
            </div>
          </section>
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
                  <ProductImages product={product} />
                  <div>
                    <h4>{product.name}</h4>
                    <p className="meta-line">
                      {product.owner ?? "Advertiser"} | {product.city} | Rs {product.dailyRate}/day
                    </p>
                    <span className="badge">{product.status}</span>
                    <span className="badge qa-badge">QA {product.qaStatus}</span>
                  </div>
                  <div className="action-row">
                    <button
                      type="button"
                      className="tiny-button"
                      onClick={() => onUpdateProductStatus(product.id, "APPROVED")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="tiny-button muted"
                      onClick={() => onUpdateProductStatus(product.id, "PENDING")}
                    >
                      Hold
                    </button>
                    <button
                      type="button"
                      className="tiny-button warning"
                      onClick={() => onUpdateProductStatus(product.id, "SUSPENDED")}
                    >
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
                        className={
                          booking.status === status
                            ? "tiny-button active-chip"
                            : "tiny-button"
                        }
                        onClick={() => onUpdateBookingStatus(booking.id, status)}
                      >
                        {formatStatus(status)}
                      </button>
                    ))}
                  </div>
                  <div className="return-schedule">
                    <input
                      type="date"
                      value={
                        returnScheduleDraft[booking.id] ??
                        booking.shippingDetails.returnScheduledAt ??
                        ""
                      }
                      onChange={(event) =>
                        onReturnScheduleChange(booking.id, event.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="tiny-button"
                      onClick={() => onScheduleReturn(booking.id)}
                    >
                      Schedule return
                    </button>
                  </div>
                </article>
              ))}
              {bookings.length === 0 && <p className="meta-line">No bookings placed yet.</p>}
            </div>
          </section>

          <section className="dashboard-card">
            <p className="eyebrow">Risk Dashboard</p>
            {risk ? (
              <>
                <div className="mini-grid">
                  <div>Cancelled bookings: {risk.cancelledBookings}</div>
                  <div>High-damage listings: {risk.highDamageListings.length}</div>
                  <div>Flagged orders: {risk.suspiciousOrders.length}</div>
                </div>
                <div className="listing-stack">
                  {risk.highDamageListings.map((item) => (
                    <div key={item.productId} className="listing-item">
                      <strong>{item.name}</strong>
                      <span>Damage reports: {item.damageReports}</span>
                    </div>
                  ))}
                  {risk.suspiciousOrders.map((item) => (
                    <div key={item.bookingId} className="listing-item">
                      <strong>{item.productName}</strong>
                      <span>Rs {item.totalAmount} | {item.reason}</span>
                    </div>
                  ))}
                  {risk.highDamageListings.length === 0 && risk.suspiciousOrders.length === 0 && (
                    <p className="meta-line">No current risk flags.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="meta-line">Risk analytics are loading.</p>
            )}
          </section>

          <section className="dashboard-card">
            <p className="eyebrow">Analytics Overview</p>
            {analytics ? (
              <div className="mini-grid four-up">
                <div>Total sessions: {analytics.totalSessions}</div>
                <div>Product views: {analytics.productViews}</div>
                <div>Checkout starts: {analytics.checkoutStarts}</div>
                <div>Bookings: {analytics.bookingCompletions}</div>
                <div>Conversion: {analytics.conversionRate}%</div>
                <div>Retention: {analytics.retentionRate}%</div>
                <div>Avg LTV: Rs {analytics.averageLtv}</div>
                <div>Utilization: {analytics.utilizationRate}%</div>
              </div>
            ) : (
              <p className="meta-line">Analytics data pending.</p>
            )}
          </section>

          <section className="dashboard-card">
            <p className="eyebrow">Content Management</p>
            <form className="stack-form" onSubmit={(event) => void onSubmitContent(event)}>
              <input name="key" type="text" placeholder="Content key (e.g. home-hero)" required />
              <input name="title" type="text" placeholder="Title" required />
              <textarea name="body" placeholder="Body text" required />
              <select name="type" defaultValue="HERO">
                <option value="HERO">Hero</option>
                <option value="BANNER">Banner</option>
                <option value="FAQ">FAQ</option>
                <option value="POLICY">Policy</option>
              </select>
              <button type="submit" className="secondary-button">
                Create content block
              </button>
            </form>
            <div className="listing-stack">
              {contentBlocks.map((block) => (
                <div key={block.id} className="listing-item">
                  <strong>{block.title}</strong>
                  <span>
                    {block.type} | {block.isPublished ? "Published" : "Draft"}
                  </span>
                  <button
                    type="button"
                    className="tiny-button"
                    onClick={() => void onToggleContentPublish(block)}
                  >
                    {block.isPublished ? "Unpublish" : "Publish"}
                  </button>
                </div>
              ))}
              {contentBlocks.length === 0 && <p className="meta-line">No content blocks yet.</p>}
            </div>
          </section>

          <section className="dashboard-card">
            <p className="eyebrow">Marketing Tools</p>
            <div className="admin-layout">
              <div className="card">
                <p className="panel-title">Promo campaigns</p>
                <form className="stack-form" onSubmit={(event) => void onSubmitPromoCampaign(event)}>
                  <input name="code" type="text" placeholder="Promo code" required />
                  <input name="description" type="text" placeholder="Description" required />
                  <select name="discountType" defaultValue="PERCENT">
                    <option value="PERCENT">Percent</option>
                    <option value="FIXED">Fixed</option>
                  </select>
                  <div className="form-grid">
                    <input name="value" type="number" placeholder="Value" min="1" required />
                    <input name="minOrderAmount" type="number" placeholder="Min order" />
                  </div>
                  <div className="form-grid">
                    <label>
                      Starts
                      <input name="startsAt" type="date" required />
                    </label>
                    <label>
                      Ends
                      <input name="endsAt" type="date" required />
                    </label>
                  </div>
                  <input name="usageLimit" type="number" placeholder="Usage limit" />
                  <button type="submit" className="secondary-button">Create promo</button>
                </form>
                <div className="listing-stack">
                  {promoCampaigns.map((promo) => (
                    <div key={promo.id} className="listing-item">
                      <strong>{promo.code}</strong>
                      <span>
                        {promo.discountType} {promo.value} | Used {promo.usedCount}/{promo.usageLimit ?? "∞"}
                      </span>
                    </div>
                  ))}
                  {promoCampaigns.length === 0 && <p className="meta-line">No promos yet.</p>}
                </div>
              </div>
              <div className="card">
                <p className="panel-title">Referral codes</p>
                <form className="stack-form" onSubmit={(event) => void onSubmitReferralCode(event)}>
                  <input name="code" type="text" placeholder="Referral code" required />
                  <input name="rewardAmount" type="number" placeholder="Reward amount" min="1" required />
                  <button type="submit" className="secondary-button">Create referral</button>
                </form>
                <div className="listing-stack">
                  {referralCodes.map((referral) => (
                    <div key={referral.id} className="listing-item">
                      <strong>{referral.code}</strong>
                      <span>Reward Rs {referral.rewardAmount} | Used {referral.usageCount}</span>
                    </div>
                  ))}
                  {referralCodes.length === 0 && <p className="meta-line">No referrals yet.</p>}
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-card">
            <p className="eyebrow">Audit Log</p>
            <div className="listing-stack">
              {auditLogs.map((log) => (
                <div key={log.id} className="listing-item">
                  <strong>{log.action}</strong>
                  <span>
                    {log.targetType} {log.targetId ?? ""} | {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
              {auditLogs.length === 0 && <p className="meta-line">No audit logs yet.</p>}
            </div>
          </section>
          </>
        )
      )}
    </main>
  );
}

function AdminRegistrationSkeleton() {
  return (
    <>
      <div className="filter-card-grid" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`admin-filter-${index}`} className="filter-summary-card skeleton-card">
            <div className="skeleton skeleton-line" style={{ width: "70%" }} />
            <div className="skeleton skeleton-line medium" style={{ width: "40%" }} />
          </div>
        ))}
      </div>
      <div className="search-row" aria-hidden="true">
        <div className="skeleton skeleton-line medium" style={{ width: "45%" }} />
      </div>
      <div className="table-wrap" aria-hidden="true">
        <div className="skeleton-stack">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`admin-row-${index}`} className="skeleton skeleton-line" style={{ width: "100%" }} />
          ))}
        </div>
      </div>
    </>
  );
}

function AdminDashboardSkeleton() {
  return (
    <>
      <section className="dashboard-card moderation-panel skeleton-card" aria-hidden="true">
        <div className="section-header inner-header">
          <div className="skeleton-stack">
            <div className="skeleton skeleton-line" style={{ width: "30%" }} />
            <div className="skeleton skeleton-line medium" style={{ width: "55%" }} />
          </div>
        </div>
        <div className="moderation-list">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={`admin-qa-${index}`} className="moderation-item">
              <div className="skeleton skeleton-media" style={{ height: "140px" }} />
              <div className="skeleton-stack">
                <div className="skeleton skeleton-line" style={{ width: "72%" }} />
                <div className="skeleton skeleton-line" style={{ width: "58%" }} />
                <div className="skeleton skeleton-line" style={{ width: "88%" }} />
              </div>
              <div className="skeleton-stack">
                <div className="skeleton skeleton-button" />
                <div className="skeleton skeleton-button" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-card moderation-panel skeleton-card" aria-hidden="true">
        <div className="section-header inner-header">
          <div className="skeleton-stack">
            <div className="skeleton skeleton-line" style={{ width: "28%" }} />
            <div className="skeleton skeleton-line medium" style={{ width: "62%" }} />
          </div>
        </div>
        <div className="moderation-list">
          {Array.from({ length: 2 }).map((_, index) => (
            <article key={`admin-product-${index}`} className="moderation-item">
              <div className="skeleton skeleton-media" style={{ height: "120px" }} />
              <div className="skeleton-stack">
                <div className="skeleton skeleton-line" style={{ width: "70%" }} />
                <div className="skeleton skeleton-line" style={{ width: "52%" }} />
              </div>
              <div className="skeleton skeleton-button" />
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-card skeleton-card" aria-hidden="true">
        <div className="skeleton-stack">
          <div className="skeleton skeleton-line" style={{ width: "26%" }} />
          <div className="skeleton skeleton-line" style={{ width: "84%" }} />
          <div className="skeleton skeleton-line" style={{ width: "76%" }} />
        </div>
      </section>
    </>
  );
}

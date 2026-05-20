import type { FormEvent } from "react";
import type { Booking, HostDashboard, User } from "../api";
import { advertiserCategories, advertiserVisuals } from "../content";
import { ImageCard } from "../components/marketplace";
import { formatStatus } from "../utils/booking";

export function AdvertiserPage({
  advertiserUser,
  hostDashboard,
  isLoading,
  statusMessage,
  registeredAdvertiserEmail,
  advertiserRegistrationStatus,
  bookings,
  onRegister,
  onRefreshApproval,
  onLogin,
  onLogout,
  onSubmitProduct,
  onSubmitAvailability,
  onSubmitPricingRule
}: {
  advertiserUser: User | null;
  hostDashboard: HostDashboard | null;
  isLoading: boolean;
  statusMessage: string;
  registeredAdvertiserEmail: string | null;
  advertiserRegistrationStatus: User["accessStatus"] | null;
  bookings: Booking[];
  onRegister: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onRefreshApproval: () => Promise<void>;
  onLogin: (event: FormEvent<HTMLFormElement>, role: User["role"]) => Promise<void>;
  onLogout: () => void;
  onSubmitProduct: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onSubmitAvailability: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onSubmitPricingRule: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const showSkeletons = isLoading && !hostDashboard;

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
        <section className="dashboard-grid" aria-busy={showSkeletons} aria-live="polite">
          <article className="dashboard-card">
            <p className="eyebrow">Advertiser Dashboard</p>
            <h3>{advertiserUser.name}</h3>
            <p className="meta-line">
              {advertiserUser.email} | {advertiserUser.accessStatus}
            </p>
            {showSkeletons ? (
              <AdvertiserDashboardSkeleton />
            ) : hostDashboard ? (
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
                        {listing.status}
                      </span>
                      <span>
                        QA: {listing.qaStatus} | Photos: {listing.photoQuality?.averageScore ?? "-"}/100
                      </span>
                      {listing.qaNotes && (
                        <span className="meta-line">QA note: {listing.qaNotes}</span>
                      )}
                      <span className="meta-line">
                        Availability blocks: {listing.availabilityBlocks?.length ?? 0} | Pricing rules:{" "}
                        {listing.pricingRules?.length ?? 0}
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
              <div className="form-grid">
                <input
                  name="leadTimeDays"
                  type="number"
                  placeholder="Lead time (days)"
                  min="0"
                />
                <input
                  name="bufferDays"
                  type="number"
                  placeholder="Buffer days"
                  min="0"
                />
                <input
                  name="minPhotoCount"
                  type="number"
                  placeholder="Min photo count"
                  min="1"
                />
              </div>
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

          <article className="dashboard-card">
            <p className="eyebrow">Availability Calendar</p>
            <h3>Block dates when inventory is unavailable</h3>
            <form className="stack-form" onSubmit={(event) => void onSubmitAvailability(event)}>
              <select name="productId" required>
                <option value="">Select product</option>
                {hostDashboard?.listings.map((listing) => (
                  <option key={listing.id} value={listing.id}>
                    {listing.name}
                  </option>
                ))}
              </select>
              <div className="form-grid">
                <label>
                  Start date
                  <input name="startDate" type="date" required />
                </label>
                <label>
                  End date
                  <input name="endDate" type="date" required />
                </label>
              </div>
              <input name="reason" type="text" placeholder="Reason (optional)" />
              <button type="submit" className="secondary-button">
                Save availability block
              </button>
            </form>
          </article>

          <article className="dashboard-card">
            <p className="eyebrow">Dynamic Pricing</p>
            <h3>Create weekday, weekend, or seasonal pricing rules</h3>
            <form className="stack-form" onSubmit={(event) => void onSubmitPricingRule(event)}>
              <select name="productId" required>
                <option value="">Select product</option>
                {hostDashboard?.listings.map((listing) => (
                  <option key={listing.id} value={listing.id}>
                    {listing.name}
                  </option>
                ))}
              </select>
              <input name="label" type="text" placeholder="Rule label" required />
              <select name="type" defaultValue="WEEKEND">
                <option value="WEEKDAY">Weekday</option>
                <option value="WEEKEND">Weekend</option>
                <option value="SEASONAL">Seasonal</option>
                <option value="DEMAND">Demand</option>
              </select>
              <div className="form-grid">
                <input name="multiplier" type="number" step="0.05" placeholder="Multiplier" />
                <input name="fixedDailyRate" type="number" placeholder="Fixed daily rate" />
              </div>
              <div className="form-grid">
                <label>
                  Start date
                  <input name="startDate" type="date" />
                </label>
                <label>
                  End date
                  <input name="endDate" type="date" />
                </label>
              </div>
              <input name="daysOfWeek" type="text" placeholder="Days (e.g. SAT,SUN)" />
              <input name="demandThreshold" type="number" placeholder="Demand threshold" />
              <button type="submit" className="secondary-button">
                Save pricing rule
              </button>
            </form>
          </article>

          <article className="dashboard-card wide-card">
            <p className="eyebrow">Booking Requests</p>
            <div className="booking-stack compact">
              {showSkeletons
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div key={`booking-loading-${index}`} className="booking-card small-card skeleton-card">
                      <div className="skeleton skeleton-line" style={{ width: "60%" }} />
                      <div className="skeleton skeleton-line" style={{ width: "70%" }} />
                      <div className="skeleton skeleton-line" style={{ width: "50%" }} />
                    </div>
                  ))
                : (
                  <>
                    {bookings.map((booking) => (
                      <div key={booking.id} className="booking-card small-card">
                        <strong>{booking.productName}</strong>
                        <span>{booking.customerName} | {formatStatus(booking.status)}</span>
                        <span>Tracking {booking.trackingCode} | Rs {booking.totalAmount}</span>
                      </div>
                    ))}
                    {bookings.length === 0 && (
                      <p className="meta-line">No bookings for your listings yet.</p>
                    )}
                  </>
                )}
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

function AdvertiserDashboardSkeleton() {
  return (
    <>
      <div className="mini-grid four-up" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`host-summary-${index}`} className="skeleton skeleton-tile" />
        ))}
      </div>
      <section className="chart-section" aria-hidden="true">
        <div className="mini-grid four-up">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`host-metric-${index}`} className="skeleton skeleton-tile" />
          ))}
        </div>
        <div className="chart-grid">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={`host-chart-${index}`} className="chart-card">
              <div className="skeleton skeleton-media" style={{ height: "160px" }} />
            </div>
          ))}
        </div>
      </section>
      <div className="listing-stack" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`host-listing-${index}`} className="listing-item skeleton-card">
            <div className="skeleton skeleton-line" style={{ width: "70%" }} />
            <div className="skeleton skeleton-line" style={{ width: "84%" }} />
            <div className="skeleton skeleton-line" style={{ width: "62%" }} />
          </div>
        ))}
      </div>
    </>
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

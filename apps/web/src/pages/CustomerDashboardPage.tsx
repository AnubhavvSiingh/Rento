// Customer dashboard showing bookings, notifications, and review flow.
import type { FormEvent } from "react";
import type { Booking, CustomerProfile, NotificationItem, Review } from "../api";
import { ratingOptions } from "../app/constants";
import { PremiumSelect } from "../components/PremiumSelect";
import { StatusTrack, TrackingTimeline } from "../components/marketplace";
import { formatStatus } from "../utils/booking";

export function CustomerDashboardPage({
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

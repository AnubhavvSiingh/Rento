// Confirmation page shown after a customer places a booking.
import type { Booking, CustomerProfile, Product, ShippingDetails } from "../api";

export function CustomerConfirmationPage({
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

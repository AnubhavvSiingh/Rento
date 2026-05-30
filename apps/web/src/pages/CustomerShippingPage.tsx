// Customer checkout form for shipment, rental dates, and payment details.
import type { FormEvent } from "react";
import { useState } from "react";
import type { CustomerProfile, Product } from "../api";
import { paymentOptions } from "../app/constants";
import { getRentalDays } from "../utils/booking";

export function CustomerShippingPage({
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
            <input name="promoCode" type="text" placeholder="Promo code (optional)" />
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

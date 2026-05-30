// Marketplace UI building blocks such as cards, status, and timelines.
import { motion } from "framer-motion";
import type { SyntheticEvent } from "react";
import type { BookingStatus, Product, TrackingEvent } from "../api";
import type { MediaCard, Testimonial, VideoFeature } from "../content";
import { categoryImages } from "../content";
import { bookingStatuses, formatStatus } from "../utils/booking";

function getCategoryImages(category: string) {
  return categoryImages[category] ?? categoryImages.Furniture;
}

function getProductImages(product: Product) {
  return product.images.length > 0 ? product.images : getCategoryImages(product.category);
}

function handleImageError(category: string) {
  return (event: SyntheticEvent<HTMLImageElement>) => {
    const fallback = getCategoryImages(category)[0] ?? categoryImages.Furniture[0];
    if (event.currentTarget.src !== fallback) {
      event.currentTarget.src = fallback;
    }
  };
}

export function ProductImages({ product }: { product: Product }) {
  const images = getProductImages(product);

  return (
    <div className="product-image-shell">
      <img src={images[0]} alt={product.name} onError={handleImageError(product.category)} />
      <div className="image-strip">
        {images.slice(0, 3).map((image) => (
          <span key={image} className="image-thumb" style={{ backgroundImage: `url(${image})` }} />
        ))}
      </div>
    </div>
  );
}

export function TrustChipSkeleton() {
  return (
    <div className="trust-chip skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-line medium" style={{ width: "48%" }} />
      <div className="skeleton skeleton-line small" style={{ width: "72%" }} />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-box skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-line large" style={{ width: "44%" }} />
      <div className="skeleton skeleton-line" style={{ width: "68%" }} />
    </div>
  );
}

export function TrustChip({ label, value }: { label: string; value: string | number }) {
  return (
    <motion.div
      className="trust-chip"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.35 }}
    >
      <strong>{value}</strong>
      <span>{label}</span>
    </motion.div>
  );
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <motion.div
      className="stat-box"
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.35 }}
    >
      <strong>{value}</strong>
      <span className="stat-label">{label}</span>
    </motion.div>
  );
}

export function RatingSummary({ product }: { product: Product }) {
  return (
    <p className="meta-line">
      {product.reviewCount === 0
        ? "No reviews yet"
        : `${product.averageRating.toFixed(1)}/5 from ${product.reviewCount} reviews`} | Damage notes: {product.damageReports}
    </p>
  );
}

export function StatusTrack({ status }: { status: BookingStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="status-track">
        <span className="status-step active">Cancelled</span>
      </div>
    );
  }

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

export function TrackingTimeline({ events }: { events: TrackingEvent[] }) {
  return (
    <div className="tracking-timeline">
      {events.map((event, index) => (
        <div key={`${event.status}-${index}`} className="tracking-item">
          <span className="tracking-dot" aria-hidden="true" />
          <div>
            <strong>{formatStatus(event.status)}</strong>
            <span className="meta-line">
              {event.occurredAt} | {event.message}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ImageCard({ item }: { item: MediaCard }) {
  return (
    <motion.article
      className="image-card"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -6 }}
    >
      <img src={item.image} alt={item.title} onError={handleImageError(item.accent ?? "Furniture")} />
      <div className="image-card-copy">
        {item.accent && <span className="badge warm-badge">{item.accent}</span>}
        <h3>{item.title}</h3>
        <p>{item.note}</p>
      </div>
    </motion.article>
  );
}

export function FeatureVideoCard({ feature }: { feature: VideoFeature }) {
  return (
    <div className="feature-video-card">
      <div className="video-shell">
        <video
          src={feature.video}
          poster={feature.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
        <img src={feature.poster} alt={feature.title} onError={handleImageError("Furniture")} />
      </div>
      <div className="feature-video-copy">
        <p className="eyebrow">Premium motion</p>
        <h3>{feature.title}</h3>
        <p>{feature.note}</p>
      </div>
    </div>
  );
}

export function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <motion.article
      className="story-card testimonial-card"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4 }}
    >
      <p className="testimonial-quote">"{item.quote}"</p>
      <strong>{item.name}</strong>
      <span className="meta-line">{item.role}</span>
    </motion.article>
  );
}

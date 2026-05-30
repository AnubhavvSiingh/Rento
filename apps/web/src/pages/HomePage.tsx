// Home/landing page composition for the marketplace entry experience.
import { motion } from "framer-motion";
import type { Overview } from "../api";
import type { Route } from "../app/types";
import { categoryShowcases, homeTestimonials, homeVideoFeature, homeVisuals } from "../content";
import {
  FeatureVideoCard,
  ImageCard,
  StatCard,
  StatCardSkeleton,
  TestimonialCard,
  TrustChip,
  TrustChipSkeleton
} from "../components/marketplace";
import { PremiumAlert, type FeedbackTone } from "../components/feedback";

export function HomePage({
  overview,
  navigate,
  statusMessage,
  statusTone,
  pendingRequest,
  isLoading
}: {
  overview: Overview | null;
  navigate: (route: Route) => void;
  statusMessage: string;
  statusTone: FeedbackTone;
  pendingRequest: string | null;
  isLoading: boolean;
}) {
  const showSkeletons = isLoading;

  return (
    <main className="page-shell">
      <section className="hero hero-home premium-hero">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.55 }}
        >
          <p className="eyebrow">Main Page</p>
          <h1>Rent beautifully. Live lightly. Earn from what you already own.</h1>
          <p className="hero-text">
            Rento turns premium apparel, furniture, appliances, and creator gear into a
            trusted rental marketplace for modern city life. Customers browse faster,
            advertisers earn from underused inventory, and every experience feels more
            polished than buying for one-time use.
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
            <span>Premium listings</span>
            <span>Shipment tracking</span>
            <span>Calendar-ready rentals</span>
            <span>Trusted approvals</span>
          </div>
          <div className="trust-row" aria-busy={showSkeletons} aria-live="polite">
            {showSkeletons
              ? Array.from({ length: 5 }).map((_, index) => (
                  <TrustChipSkeleton key={`trust-skeleton-${index}`} />
                ))
              : (
                <>
                  <TrustChip
                    label="Average savings"
                    value={`${overview?.stats.averageSavingsPercent ?? 61}%`}
                  />
                  <TrustChip label="Approved hosts" value={`${overview?.stats.activeHosts ?? 0}+`} />
                  <TrustChip label="Rental-ready cities" value={`${overview?.stats.cities ?? 0}`} />
                  <TrustChip label="QA queue" value={`${overview?.stats.pendingQaListings ?? 0}`} />
                  <TrustChip label="Verified hosts" value={`${overview?.stats.verifiedHosts ?? 0}`} />
                </>
              )}
          </div>
        </motion.div>
        <div className="hero-stack">
          <motion.div
            className="hero-panel media-panel"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.58 }}
          >
            <FeatureVideoCard feature={homeVideoFeature} />
          </motion.div>
          <motion.div
            className="hero-panel"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.58 }}
          >
            <p className="panel-title">Live platform snapshot</p>
            <div className="stat-strip" aria-busy={showSkeletons} aria-live="polite">
              {showSkeletons
                ? Array.from({ length: 4 }).map((_, index) => (
                    <StatCardSkeleton key={`stat-skeleton-${index}`} />
                  ))
                : (
                  <>
                    <StatCard label="Advertisements" value={overview?.stats.listedProducts ?? "-"} />
                    <StatCard label="Advertisers" value={overview?.stats.activeHosts ?? "-"} />
                    <StatCard label="Cities" value={overview?.stats.cities ?? "-"} />
                    <StatCard label="Active promos" value={overview?.stats.activePromos ?? "-"} />
                  </>
                )}
            </div>
            <PremiumAlert
              message={statusMessage}
              tone={pendingRequest ? "loading" : statusTone}
              isBusy={Boolean(pendingRequest)}
            />
          </motion.div>
        </div>
      </section>

      <section className="feature-band">
        <article className="feature-copy">
          <p className="eyebrow">Why people come back</p>
          <h3>Renting feels easier when the experience looks premium and stays practical.</h3>
          <p className="section-text">
            Rento is built around the reasons people actually rent today: moving cities,
            furnishing short stays, styling one-time ceremonies, creating content, and avoiding
            high upfront ownership costs. Clear visuals, transparent pricing, and tracked
            delivery make the journey feel calm and trustworthy.
          </p>
          <ul className="list-block">
            <li>Discover premium listings with real product visuals.</li>
            <li>Compare daily rent, deposit, and city availability in one place.</li>
            <li>Move from signup to shipment confirmation without friction.</li>
          </ul>
        </article>
        <article className="visual-frame editorial-frame">
          <div className="savings-panel">
            <p className="eyebrow">Savings snapshot</p>
            <strong>Buy less. Experience more.</strong>
            <div className="mini-grid">
              <div>
                <span>Wedding wear saved</span>
                <strong>up to Rs 48k</strong>
              </div>
              <div>
                <span>Move-in setup saved</span>
                <strong>up to Rs 32k</strong>
              </div>
              <div>
                <span>Creator gear saved</span>
                <strong>up to Rs 18k</strong>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="visual-gallery">
        {categoryShowcases.map((item) => (
          <ImageCard key={item.title} item={item} />
        ))}
      </section>

      <section className="visual-gallery">
        {homeVisuals.map((item) => (
          <ImageCard key={item.title} item={item} />
        ))}
      </section>

      <section className="story-grid">
        {homeTestimonials.map((item) => (
          <TestimonialCard key={item.name} item={item} />
        ))}
      </section>
    </main>
  );
}

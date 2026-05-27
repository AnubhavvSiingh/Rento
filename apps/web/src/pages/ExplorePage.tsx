import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { Overview, Product } from "../api";
import {
  advertiserCategories,
  categoryImages,
  categoryShowcases,
  exploreVideoFeature,
  exploreVisuals
} from "../content";
import {
  FeatureVideoCard,
  ImageCard,
  ProductImages,
  RatingSummary
} from "../components/marketplace";
import { PremiumSelect } from "../components/PremiumSelect";

export function ExplorePage({
  products,
  overview,
  selectedProduct,
  onRent,
  isLoading
}: {
  products: Product[];
  overview: Overview | null;
  selectedProduct: Product | null;
  onRent: (product: Product) => void;
  isLoading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [city, setCity] = useState("All");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("recommended");
  const showSkeletons = isLoading;
  const cities = useMemo(
    () => Array.from(new Set(products.map((product) => product.city))).sort(),
    [products]
  );
  const maxAvailableRate = useMemo(
    () => Math.max(1000, ...products.map((product) => product.dailyRate)),
    [products]
  );
  const categoryOptions = useMemo(
    () => [
      {
        value: "All",
        label: "All categories",
        description: "Curated rentals across every collection",
        image: categoryImages.Ceremony[0]
      },
      ...advertiserCategories.map((item) => ({
        value: item,
        label: item,
        description: getCategoryDescription(item),
        image: categoryImages[item]?.[0]
      }))
    ],
    []
  );
  const cityOptions = useMemo(
    () => [
      { value: "All", label: "All cities", description: "Show every available delivery city", icon: "IN" },
      ...cities.map((item) => ({
        value: item,
        label: item,
        description: "Ready for delivery and pickup",
        icon: item.slice(0, 2).toUpperCase()
      }))
    ],
    [cities]
  );
  const sortOptions = [
    {
      value: "recommended",
      label: "Curated first",
      description: "Balanced by quality, trust, and match",
      icon: "01"
    },
    {
      value: "price-low",
      label: "Best daily value",
      description: "Lowest rent per day first",
      icon: "Rs"
    },
    {
      value: "price-high",
      label: "Premium picks",
      description: "Highest daily rate first",
      icon: "Hi"
    }
  ];
  const filteredProducts = useMemo(() => {
    const max = maxPrice ? Number(maxPrice) : Number.POSITIVE_INFINITY;
    const filtered = products.filter((product) => {
      const matchesText = `${product.name} ${product.description} ${product.category}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory = category === "All" || product.category === category;
      const matchesCity = city === "All" || product.city === city;
      const matchesPrice = product.dailyRate <= max;
      return matchesText && matchesCategory && matchesCity && matchesPrice;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "price-low") {
        return a.dailyRate - b.dailyRate;
      }
      if (sort === "price-high") {
        return b.dailyRate - a.dailyRate;
      }
      return a.name.localeCompare(b.name);
    });
  }, [category, city, maxPrice, products, search, sort]);

  return (
    <main className="page-shell">
      <section className="section-header">
        <div>
          <p className="eyebrow">Customer Landing Page</p>
          <h2>Explore rentals that feel curated, useful, and ready for real life.</h2>
          <p className="section-text">
            {overview?.positioning ??
              "Browse approved listings, compare deposits, book dates, and track delivery."}
          </p>
        </div>
        <div className="status-banner compact">
          {showSkeletons
            ? "Loading approved listings..."
            : `${filteredProducts.length} approved listings ready to rent`}
        </div>
      </section>

      <section className="feature-band explore-band">
        <article className="feature-copy">
          <p className="eyebrow">Explore better</p>
          <h3>Find apparel, furniture, appliances, and creator gear with a smoother discovery flow.</h3>
          <p className="section-text">
            Customers come to Rento for stylish ceremony outfits, flexible home setups, and
            short-term essentials. Better visuals, clearer categories, and cleaner browsing help
            more people stay, compare, and place rentals.
          </p>
          <div className="cute-badge-row">
            <span className="cute-badge"><span className="cute-icon">01</span> Search across categories</span>
            <span className="cute-badge"><span className="cute-icon">02</span> Review deposits before checkout</span>
            <span className="cute-badge"><span className="cute-icon">03</span> Track every shipment after booking</span>
          </div>
        </article>
        <article className="hero-panel media-panel">
          <FeatureVideoCard feature={exploreVideoFeature} />
        </article>
      </section>

      <section className="premium-filter-panel" aria-label="Search and filters">
        <label className="premium-search-field">
          <span>Search the collection</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Lehenga, sofa, fridge, camera..."
          />
        </label>
        <PremiumSelect
          label="Category"
          value={category}
          onChange={setCategory}
          options={categoryOptions}
          searchable
        />
        <PremiumSelect
          label="City"
          value={city}
          onChange={setCity}
          options={cityOptions}
          searchable
        />
        <label className="premium-range-field">
          <span>Max daily rent</span>
          <strong>{maxPrice ? `Rs ${maxPrice}/day` : "No limit"}</strong>
          <input
            type="range"
            min="1"
            max={maxAvailableRate}
            step="50"
            value={maxPrice || maxAvailableRate}
            onChange={(event) =>
              setMaxPrice(event.target.value === String(maxAvailableRate) ? "" : event.target.value)
            }
          />
        </label>
        <PremiumSelect
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={sortOptions}
        />
        {(search || category !== "All" || city !== "All" || maxPrice) && (
          <div className="active-filter-row">
            {search && (
              <button type="button" className="active-filter-chip" onClick={() => setSearch("")}>
                Search: {search}
              </button>
            )}
            {category !== "All" && (
              <button type="button" className="active-filter-chip" onClick={() => setCategory("All")}>
                {category}
              </button>
            )}
            {city !== "All" && (
              <button type="button" className="active-filter-chip" onClick={() => setCity("All")}>
                {city}
              </button>
            )}
            {maxPrice && (
              <button type="button" className="active-filter-chip" onClick={() => setMaxPrice("")}>
                Under Rs {maxPrice}/day
              </button>
            )}
          </div>
        )}
      </section>

      <section className="visual-gallery compact-gallery">
        {exploreVisuals.map((item) => (
          <ImageCard key={item.title} item={item} />
        ))}
      </section>

      <section className="cards cards-wide" aria-busy={showSkeletons} aria-live="polite">
        {showSkeletons
          ? Array.from({ length: 6 }).map((_, index) => (
              <ProductSkeletonCard key={`skeleton-product-${index}`} />
            ))
          : filteredProducts.map((product) => (
              <motion.article
                key={product.id}
                className="card product-card"
                whileHover={{ y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <ProductImages product={product} />
                <div className="product-card-body">
                  <div className="badge-row">
                    <span className="badge">{product.category}</span>
                    {product.hostVerified && (
                      <span className="badge warm-badge">Verified host</span>
                    )}
                    {product.qaStatus === "APPROVED" && (
                      <span className="badge qa-badge">QA passed</span>
                    )}
                  </div>
                  <h3>{product.name}</h3>
                  <p className="price">Rs {product.dailyRate}/day</p>
                  <p>{product.description}</p>
                  <p className="meta-line">
                    {product.city} | Deposit Rs {product.deposit} | {product.condition ?? "Verified"}
                  </p>
                  {product.photoQuality && (
                    <p className="meta-line">
                      Photo quality: {product.photoQuality.averageScore}/100 | {product.photoQuality.photoCount} photos
                    </p>
                  )}
                  {product.photoQuality && (
                    <p className="meta-line">
                      {product.photoQuality.meetsMinimum
                        ? "Photo set meets QA standard"
                        : "Photo set below QA standard"}
                    </p>
                  )}
                  <p className="meta-line">
                    Lead time: {product.leadTimeDays} days | Buffer: {product.bufferDays} days
                  </p>
                  {(product.pricingRulesCount ?? 0) > 0 && (
                    <p className="meta-line">
                      Pricing rules active: {product.pricingRulesCount}
                    </p>
                  )}
                  {product.tags && product.tags.length > 0 && (
                    <div className="tag-row">
                      {product.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="tag-pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <RatingSummary product={product} />
                  <div className="card-footer">
                    <button type="button" className="primary-button" onClick={() => onRent(product)}>
                      {selectedProduct?.id === product.id ? "Continue Rental" : "Rent this item"}
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
        {!showSkeletons && filteredProducts.length === 0 && (
          <article className="card">
            <h3>No approved listing matched</h3>
            <p>Try a wider city, category, or price range.</p>
          </article>
        )}
      </section>

      <section className="story-grid">
        {categoryShowcases.slice(0, 2).map((item) => (
          <ImageCard key={`explore-${item.title}`} item={item} />
        ))}
      </section>
    </main>
  );
}

function getCategoryDescription(category: string) {
  const descriptions: Record<string, string> = {
    Furniture: "Sofas, beds, desks, and flexible home setups",
    Appliances: "Fridges, washers, and everyday essentials",
    Fashion: "Statement outfits and creator-ready styling",
    Ceremony: "Lehengas, sherwanis, decor, and event pieces",
    Electronics: "Cameras, monitors, and work gear"
  };

  return descriptions[category] ?? "Premium rental collection";
}

function ProductSkeletonCard() {
  return (
    <article className="card product-card skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-media" />
      <div className="product-card-body">
        <div className="badge-row">
          <span className="skeleton skeleton-chip" />
          <span className="skeleton skeleton-chip skeleton-chip-wide" />
        </div>
        <div className="skeleton-stack">
          <div className="skeleton skeleton-line large" style={{ width: "72%" }} />
          <div className="skeleton skeleton-line medium" style={{ width: "40%" }} />
          <div className="skeleton skeleton-line" style={{ width: "92%" }} />
          <div className="skeleton skeleton-line" style={{ width: "86%" }} />
          <div className="skeleton skeleton-line" style={{ width: "70%" }} />
        </div>
        <div className="card-footer">
          <div className="skeleton skeleton-button" />
        </div>
      </div>
    </article>
  );
}

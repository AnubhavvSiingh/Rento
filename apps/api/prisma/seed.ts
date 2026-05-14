// Seed script to populate demo users, products, and bookings for local development.
import { config as loadEnv } from "dotenv";
import {
  PrismaClient,
  type AccessStatus,
  type BookingStatus,
  type Category,
  type ContentType,
  type DayOfWeek,
  type DiscountType,
  type ListingStatus,
  type PricingRuleType,
  type QaStatus,
  type AnalyticsEventType,
  type ProductCondition
} from "@prisma/client";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hash } from "bcryptjs";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDirectory, "../.env") });

const prisma = new PrismaClient();

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@rento.local";
const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@12345";
const advertiserPassword = process.env.SEED_ADVERTISER_PASSWORD ?? "Advertiser@123";
const customerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? "Customer@123";

const advertisers = [
  {
    id: "usr-shaadi-closet",
    name: "Shaadi Closet",
    email: "shaadi@rento.local",
    accessStatus: "APPROVED" as AccessStatus,
    isVerifiedHost: true
  },
  {
    id: "usr-urban-nest",
    name: "UrbanNest Host",
    email: "urbannest@rento.local",
    accessStatus: "APPROVED" as AccessStatus,
    isVerifiedHost: true
  },
  {
    id: "usr-stayeasy",
    name: "StayEasy Rentals",
    email: "stayeasy@rento.local",
    accessStatus: "PENDING" as AccessStatus,
    isVerifiedHost: false
  },
  {
    id: "usr-influence-rack",
    name: "Influence Rack",
    email: "influence@rento.local",
    accessStatus: "SUSPENDED" as AccessStatus,
    isVerifiedHost: false
  }
];

const customerSeed = {
  id: "cus-rhea-mehta",
  fullName: "Rhea Mehta",
  email: "customer@rento.local",
  phone: "+91 98765 43210"
};

const products = [
  {
    id: "prd-ceremony-lehenga",
    name: "Heritage Bridal Lehenga Set",
    category: "Ceremony" as Category,
    city: "Delhi",
    dailyRate: 1899,
    deposit: 4500,
    owner: "Shaadi Closet",
    ownerId: "usr-shaadi-closet",
    condition: "Verified" as ProductCondition,
    description: [
      "Hand-embroidered bridal lehenga with dupatta, blouse, and styling consultation",
      "for wedding day rentals."
    ].join(" "),
    tags: ["bridal", "lehenga", "luxury", "wedding"],
    status: "APPROVED" as ListingStatus,
    qaStatus: "APPROVED" as QaStatus,
    leadTimeDays: 3,
    bufferDays: 1,
    minPhotoCount: 3,
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "prd-reception-gown",
    name: "Reception Gown in Rose Gold",
    category: "Fashion" as Category,
    city: "Mumbai",
    dailyRate: 999,
    deposit: 2200,
    owner: "Shaadi Closet",
    ownerId: "usr-shaadi-closet",
    condition: "Excellent" as ProductCondition,
    description: [
      "A premium occasion gown for receptions, pre-wedding shoots, influencer content,",
      "and luxury evening events."
    ].join(" "),
    tags: ["reception", "gown", "fashion", "photoshoot"],
    status: "APPROVED" as ListingStatus,
    qaStatus: "APPROVED" as QaStatus,
    leadTimeDays: 2,
    bufferDays: 1,
    minPhotoCount: 3,
    images: [
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "prd-sofa-living",
    name: "Cloud Lounge Sofa Set",
    category: "Furniture" as Category,
    city: "Bengaluru",
    dailyRate: 549,
    deposit: 2500,
    owner: "UrbanNest Host",
    ownerId: "usr-urban-nest",
    condition: "Verified" as ProductCondition,
    description: [
      "Contemporary three-seater sofa with side poufs, perfect for furnished rentals,",
      "photo-ready homes, and short stays."
    ].join(" "),
    tags: ["sofa", "living room", "furnished home", "moving city"],
    status: "APPROVED" as ListingStatus,
    qaStatus: "APPROVED" as QaStatus,
    leadTimeDays: 4,
    bufferDays: 2,
    minPhotoCount: 3,
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "prd-dining-wood",
    name: "Rustic Dining Table for Six",
    category: "Furniture" as Category,
    city: "Pune",
    dailyRate: 459,
    deposit: 1900,
    owner: "UrbanNest Host",
    ownerId: "usr-urban-nest",
    condition: "Good" as ProductCondition,
    description: [
      "Warm wooden dining setup ideal for family rentals, corporate housing, and",
      "temporary furnished apartments."
    ].join(" "),
    tags: ["dining", "wood", "family", "hosted apartment"],
    status: "APPROVED" as ListingStatus,
    qaStatus: "APPROVED" as QaStatus,
    leadTimeDays: 3,
    bufferDays: 1,
    minPhotoCount: 3,
    images: [
      "https://images.unsplash.com/photo-1449247709967-d4461a6a6103?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "prd-mini-fridge",
    name: "Compact Mini Fridge + Microwave Duo",
    category: "Appliances" as Category,
    city: "Hyderabad",
    dailyRate: 379,
    deposit: 1600,
    owner: "StayEasy Rentals",
    ownerId: "usr-stayeasy",
    condition: "Verified" as ProductCondition,
    description: [
      "A practical appliance bundle for hostels, relocations, and short-term",
      "apartments that need fast kitchen setup."
    ].join(" "),
    tags: ["fridge", "microwave", "relocation", "starter kitchen"],
    status: "PENDING" as ListingStatus,
    qaStatus: "PENDING" as QaStatus,
    leadTimeDays: 2,
    bufferDays: 1,
    minPhotoCount: 3,
    images: [
      "https://images.unsplash.com/photo-1586208958839-06c17cacdf08?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "prd-washer-dryer",
    name: "Washer Dryer Pair for Family Stays",
    category: "Appliances" as Category,
    city: "Chennai",
    dailyRate: 529,
    deposit: 2400,
    owner: "StayEasy Rentals",
    ownerId: "usr-stayeasy",
    condition: "Excellent" as ProductCondition,
    description: [
      "Laundry essentials for serviced homes and long-stay rentals, delivered and",
      "installed for the rental period."
    ].join(" "),
    tags: ["washer", "dryer", "family home", "long stay"],
    status: "APPROVED" as ListingStatus,
    qaStatus: "APPROVED" as QaStatus,
    leadTimeDays: 2,
    bufferDays: 1,
    minPhotoCount: 3,
    images: [
      "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1549187774-b4e9b0445b41?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "prd-creator-camera",
    name: "Creator Camera + Lighting Kit",
    category: "Electronics" as Category,
    city: "Mumbai",
    dailyRate: 899,
    deposit: 3200,
    owner: "Influence Rack",
    ownerId: "usr-influence-rack",
    condition: "Good" as ProductCondition,
    description: [
      "A compact creator bundle with mirrorless camera, tripod, and lighting gear",
      "for reels, campaigns, and events."
    ].join(" "),
    tags: ["camera", "creator", "influencer", "lighting"],
    status: "SUSPENDED" as ListingStatus,
    qaStatus: "REJECTED" as QaStatus,
    leadTimeDays: 5,
    bufferDays: 2,
    minPhotoCount: 3,
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1495707902641-75cac588d2e9?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "prd-workstation-bundle",
    name: "Remote Workstation Bundle",
    category: "Electronics" as Category,
    city: "Gurugram",
    dailyRate: 699,
    deposit: 2800,
    owner: "UrbanNest Host",
    ownerId: "usr-urban-nest",
    condition: "Verified" as ProductCondition,
    description: [
      "Laptop stand, monitor, ergonomic chair, and desk lamp package for hybrid",
      "teams and fast-moving professionals."
    ].join(" "),
    tags: ["work from home", "monitor", "chair", "professional"],
    status: "APPROVED" as ListingStatus,
    qaStatus: "APPROVED" as QaStatus,
    leadTimeDays: 2,
    bufferDays: 1,
    minPhotoCount: 3,
    images: [
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
    ]
  }
] as const;

const bookings = [
  {
    id: "bkg-lehenga-rhea",
    productId: "prd-ceremony-lehenga",
    customerId: customerSeed.id,
    dailyRate: 1899,
    deposit: 4500,
    totalAmount: 8298,
    status: "DELIVERED" as BookingStatus,
    payment: {
      id: "pay-lehenga-rhea",
      method: "UPI",
      reference: "UPI-RENTO-1101",
      amount: 8298
    },
    shipment: {
      id: "shp-lehenga-rhea",
      addressLine1: "C-204, South Extension",
      addressLine2: "Near Green Park Metro",
      city: "Delhi",
      state: "Delhi",
      postalCode: "110049",
      shipmentDate: new Date("2026-05-15"),
      rentalStartDate: new Date("2026-05-16"),
      rentalEndDate: new Date("2026-05-18"),
      deliveryInstructions: [
        "Call before delivery.",
        "Bride outfit trial arranged in afternoon."
      ].join(" "),
      conditionPhotoUrl:
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
      trackingCode: "RENTO-110315"
    },
    review: {
      id: "rev-lehenga-rhea",
      rating: 5,
      comment: "Looked premium on camera and fit perfectly for the ceremony day.",
      conditionNote: "Delivered steamed and neatly packed."
    }
  },
  {
    id: "bkg-sofa-rhea",
    productId: "prd-sofa-living",
    customerId: customerSeed.id,
    dailyRate: 549,
    deposit: 2500,
    totalAmount: 5794,
    status: "OUT_FOR_DELIVERY" as BookingStatus,
    payment: {
      id: "pay-sofa-rhea",
      method: "Card",
      reference: "CARD-RENTO-2207",
      amount: 5794
    },
    shipment: {
      id: "shp-sofa-rhea",
      addressLine1: "Tower 5, Whitefield Residency",
      addressLine2: "Flat 902",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560066",
      shipmentDate: new Date("2026-05-20"),
      rentalStartDate: new Date("2026-05-21"),
      rentalEndDate: new Date("2026-05-27"),
      deliveryInstructions: "Use service lift for delivery and install near the bay window.",
      conditionPhotoUrl:
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80",
      trackingCode: "RENTO-220720"
    }
  },
  {
    id: "bkg-workstation-rhea",
    productId: "prd-workstation-bundle",
    customerId: customerSeed.id,
    dailyRate: 699,
    deposit: 2800,
    totalAmount: 7693,
    status: "PLACED" as BookingStatus,
    payment: {
      id: "pay-workstation-rhea",
      method: "Net Banking",
      reference: "NB-RENTO-4408",
      amount: 7693
    },
    shipment: {
      id: "shp-workstation-rhea",
      addressLine1: "DLF Phase 4",
      addressLine2: "Near Galleria Market",
      city: "Gurugram",
      state: "Haryana",
      postalCode: "122002",
      shipmentDate: new Date("2026-05-24"),
      rentalStartDate: new Date("2026-05-25"),
      rentalEndDate: new Date("2026-05-31"),
      deliveryInstructions: "Deliver after 10 AM. Setup required in study room.",
      conditionPhotoUrl:
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
      trackingCode: "RENTO-440825"
    }
  }
] as const;

const notifications = [
  {
    id: "ntf-order-confirmed",
    customerId: customerSeed.id,
    title: "Order confirmed",
    message:
      "Your Heritage Bridal Lehenga Set is booked. We will email the shipment tracking link shortly."
  },
  {
    id: "ntf-shipment-update",
    customerId: customerSeed.id,
    title: "Shipment update",
    message: "Your Cloud Lounge Sofa Set is now out for delivery."
  }
];

const shipmentEvents = [
  {
    id: "evt-shp-lehenga-placed",
    bookingId: "bkg-lehenga-rhea",
    status: "PLACED" as BookingStatus,
    message: "Order confirmed and assigned to delivery.",
    occurredAt: new Date("2026-05-15")
  },
  {
    id: "evt-shp-lehenga-delivered",
    bookingId: "bkg-lehenga-rhea",
    status: "DELIVERED" as BookingStatus,
    message: "Delivery completed with condition checklist verified.",
    occurredAt: new Date("2026-05-16")
  },
  {
    id: "evt-shp-sofa-packed",
    bookingId: "bkg-sofa-rhea",
    status: "PACKED" as BookingStatus,
    message: "Item packed with protective wrapping.",
    occurredAt: new Date("2026-05-19")
  }
];

const availabilityBlocks = [
  {
    id: "blk-lehenga-bridal",
    productId: "prd-ceremony-lehenga",
    startDate: new Date("2026-06-10"),
    endDate: new Date("2026-06-12"),
    reason: "In-studio styling trials"
  },
  {
    id: "blk-sofa-refresh",
    productId: "prd-sofa-living",
    startDate: new Date("2026-06-01"),
    endDate: new Date("2026-06-03"),
    reason: "Fabric refresh and cleaning"
  }
];

const pricingRules = [
  {
    id: "prc-lehenga-weekend",
    productId: "prd-ceremony-lehenga",
    label: "Weekend peak",
    type: "WEEKEND" as PricingRuleType,
    multiplier: 1.25,
    fixedDailyRate: null,
    startDate: null,
    endDate: null,
    daysOfWeek: ["SAT", "SUN"] as DayOfWeek[],
    demandThreshold: null,
    isActive: true
  },
  {
    id: "prc-festive-season",
    productId: "prd-ceremony-lehenga",
    label: "Festive season",
    type: "SEASONAL" as PricingRuleType,
    multiplier: 1.4,
    fixedDailyRate: null,
    startDate: new Date("2026-10-01"),
    endDate: new Date("2026-11-15"),
    daysOfWeek: [],
    demandThreshold: null,
    isActive: true
  },
  {
    id: "prc-sofa-demand",
    productId: "prd-sofa-living",
    label: "High demand",
    type: "DEMAND" as PricingRuleType,
    multiplier: 1.15,
    fixedDailyRate: null,
    startDate: null,
    endDate: null,
    daysOfWeek: [],
    demandThreshold: 2,
    isActive: true
  },
  {
    id: "prc-workstation-weekday",
    productId: "prd-workstation-bundle",
    label: "Weekday focus",
    type: "WEEKDAY" as PricingRuleType,
    multiplier: 0.95,
    fixedDailyRate: null,
    startDate: null,
    endDate: null,
    daysOfWeek: ["MON", "TUE", "WED", "THU"] as DayOfWeek[],
    demandThreshold: null,
    isActive: true
  }
];

const contentBlocks = [
  {
    id: "cnt-home-hero",
    key: "home-hero",
    title: "Rent the moment, keep the memory",
    body: "Premium rentals across fashion, furniture, and tech with concierge-level care.",
    type: "HERO" as ContentType,
    isPublished: true
  },
  {
    id: "cnt-home-banner",
    key: "home-banner",
    title: "Festive season edit",
    body: "Curated ceremony rentals with verified condition grading and delivery support.",
    type: "BANNER" as ContentType,
    isPublished: true
  },
  {
    id: "cnt-faq",
    key: "faq",
    title: "Frequently asked questions",
    body: "Find answers about deposits, delivery timing, and return handling in one place.",
    type: "FAQ" as ContentType,
    isPublished: true
  },
  {
    id: "cnt-policy",
    key: "policy",
    title: "Rental policy",
    body: "Transparent pricing, verified hosts, and protection plans for every booking.",
    type: "POLICY" as ContentType,
    isPublished: true
  }
];

const promoCampaigns = [
  {
    id: "promo-first-rent",
    code: "FIRSTRENT",
    description: "Welcome discount for first-time renters.",
    discountType: "PERCENT" as DiscountType,
    value: 12,
    startsAt: new Date("2026-05-01"),
    endsAt: new Date("2026-12-31"),
    minOrderAmount: 1500,
    usageLimit: 250,
    usedCount: 34,
    isActive: true
  },
  {
    id: "promo-host-push",
    code: "HOSTLOVE",
    description: "Limited-time boost for verified hosts.",
    discountType: "FIXED" as DiscountType,
    value: 250,
    startsAt: new Date("2026-05-10"),
    endsAt: new Date("2026-08-31"),
    minOrderAmount: 2200,
    usageLimit: 120,
    usedCount: 18,
    isActive: true
  }
];

const referralCodes = [
  {
    id: "ref-rento-rhea",
    code: "RHEA100",
    rewardAmount: 100,
    usageCount: 6,
    isActive: true
  },
  {
    id: "ref-rento-shaadi",
    code: "SHAADI150",
    rewardAmount: 150,
    usageCount: 12,
    isActive: true
  }
];

const analyticsEvents = [
  {
    id: "evt-home-view",
    eventType: "PAGE_VIEW" as AnalyticsEventType,
    sessionId: "sess-home-1",
    customerId: null,
    productId: null,
    metadata: { path: "#/home" },
    createdAt: new Date("2026-05-12")
  },
  {
    id: "evt-product-view",
    eventType: "PRODUCT_VIEW" as AnalyticsEventType,
    sessionId: "sess-prod-1",
    customerId: customerSeed.id,
    productId: "prd-ceremony-lehenga",
    metadata: { source: "hero" },
    createdAt: new Date("2026-05-12")
  },
  {
    id: "evt-booking-complete",
    eventType: "BOOKING_COMPLETE" as AnalyticsEventType,
    sessionId: "sess-book-1",
    customerId: customerSeed.id,
    productId: "prd-ceremony-lehenga",
    metadata: { channel: "organic" },
    createdAt: new Date("2026-05-12")
  }
];

const auditLogs = [
  {
    id: "audit-admin-approve",
    actorUserId: "usr-rento-admin",
    action: "PRODUCT_QA_APPROVED",
    targetType: "PRODUCT",
    targetId: "prd-ceremony-lehenga",
    details: { note: "All images meet quality bar." },
    ipAddress: "127.0.0.1",
    userAgent: "seed"
  }
];

async function main() {
  const adminHash = await hash(adminPassword, 10);
  const advertiserHash = await hash(advertiserPassword, 10);
  const customerHash = await hash(customerPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      id: "usr-rento-admin",
      name: "Rento Admin",
      email: adminEmail,
      passwordHash: adminHash,
      role: "ADMIN",
      accessStatus: "APPROVED",
      provider: "LOCAL",
      isVerifiedHost: false
    },
    update: {
      name: "Rento Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      accessStatus: "APPROVED",
      provider: "LOCAL",
      isVerifiedHost: false
    }
  });

  for (const advertiser of advertisers) {
    await prisma.user.upsert({
      where: { email: advertiser.email },
      create: {
        id: advertiser.id,
        name: advertiser.name,
        email: advertiser.email,
        passwordHash: advertiserHash,
        role: "ADVERTISER",
        accessStatus: advertiser.accessStatus,
        provider: "LOCAL",
        isVerifiedHost: advertiser.isVerifiedHost
      },
      update: {
        name: advertiser.name,
        passwordHash: advertiserHash,
        role: "ADVERTISER",
        accessStatus: advertiser.accessStatus,
        provider: "LOCAL",
        isVerifiedHost: advertiser.isVerifiedHost
      }
    });
  }

  await prisma.customer.upsert({
    where: { email: customerSeed.email },
    create: {
      id: customerSeed.id,
      fullName: customerSeed.fullName,
      email: customerSeed.email,
      phone: customerSeed.phone,
      passwordHash: customerHash
    },
    update: {
      fullName: customerSeed.fullName,
      phone: customerSeed.phone,
      passwordHash: customerHash
    }
  });

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      create: {
        id: product.id,
        name: product.name,
        category: product.category,
        city: product.city,
        dailyRate: product.dailyRate,
        deposit: product.deposit,
        owner: product.owner,
        ownerId: product.ownerId,
        condition: product.condition,
        description: product.description,
        tags: [...product.tags],
        status: product.status,
        qaStatus: product.qaStatus,
        leadTimeDays: product.leadTimeDays,
        bufferDays: product.bufferDays,
        minPhotoCount: product.minPhotoCount
      },
      update: {
        name: product.name,
        category: product.category,
        city: product.city,
        dailyRate: product.dailyRate,
        deposit: product.deposit,
        owner: product.owner,
        ownerId: product.ownerId,
        condition: product.condition,
        description: product.description,
        tags: [...product.tags],
        status: product.status,
        qaStatus: product.qaStatus,
        leadTimeDays: product.leadTimeDays,
        bufferDays: product.bufferDays,
        minPhotoCount: product.minPhotoCount
      }
    });

    for (const [index, url] of product.images.entries()) {
      const qualityScore = inferQualityScore(url);
      const autoTags = buildImageTags(product, url);
      const isPrimary = index === 0;

      await prisma.productImage.upsert({
        where: { id: `${product.id}-img-${index + 1}` },
        create: {
          id: `${product.id}-img-${index + 1}`,
          productId: product.id,
          url,
          sortOrder: index,
          qualityScore,
          autoTags,
          isPrimary
        },
        update: {
          productId: product.id,
          url,
          sortOrder: index,
          qualityScore,
          autoTags,
          isPrimary
        }
      });
    }
  }

  for (const block of availabilityBlocks) {
    await prisma.availabilityBlock.upsert({
      where: { id: block.id },
      create: block,
      update: {
        startDate: block.startDate,
        endDate: block.endDate,
        reason: block.reason
      }
    });
  }

  for (const rule of pricingRules) {
    await prisma.pricingRule.upsert({
      where: { id: rule.id },
      create: rule,
      update: {
        label: rule.label,
        type: rule.type,
        multiplier: rule.multiplier,
        fixedDailyRate: rule.fixedDailyRate,
        startDate: rule.startDate,
        endDate: rule.endDate,
        daysOfWeek: rule.daysOfWeek,
        demandThreshold: rule.demandThreshold,
        isActive: rule.isActive
      }
    });
  }

  for (const booking of bookings) {
    await prisma.booking.upsert({
      where: { id: booking.id },
      create: {
        id: booking.id,
        productId: booking.productId,
        customerId: booking.customerId,
        dailyRate: booking.dailyRate,
        deposit: booking.deposit,
        totalAmount: booking.totalAmount,
        status: booking.status,
        payment: {
          create: {
            id: booking.payment.id,
            method: booking.payment.method,
            reference: booking.payment.reference,
            amount: booking.payment.amount,
            status: "PAID"
          }
        },
        shipment: {
          create: {
            id: booking.shipment.id,
            addressLine1: booking.shipment.addressLine1,
            addressLine2: booking.shipment.addressLine2,
            city: booking.shipment.city,
            state: booking.shipment.state,
            postalCode: booking.shipment.postalCode,
            shipmentDate: booking.shipment.shipmentDate,
            rentalStartDate: booking.shipment.rentalStartDate,
            rentalEndDate: booking.shipment.rentalEndDate,
            deliveryInstructions: booking.shipment.deliveryInstructions,
            conditionPhotoUrl: booking.shipment.conditionPhotoUrl,
            trackingCode: booking.shipment.trackingCode
          }
        }
      },
      update: {
        productId: booking.productId,
        customerId: booking.customerId,
        dailyRate: booking.dailyRate,
        deposit: booking.deposit,
        totalAmount: booking.totalAmount,
        status: booking.status,
        payment: {
          upsert: {
            create: {
              id: booking.payment.id,
              method: booking.payment.method,
              reference: booking.payment.reference,
              amount: booking.payment.amount,
              status: "PAID"
            },
            update: {
              method: booking.payment.method,
              reference: booking.payment.reference,
              amount: booking.payment.amount,
              status: "PAID"
            }
          }
        },
        shipment: {
          upsert: {
            create: {
              id: booking.shipment.id,
              addressLine1: booking.shipment.addressLine1,
              addressLine2: booking.shipment.addressLine2,
              city: booking.shipment.city,
              state: booking.shipment.state,
              postalCode: booking.shipment.postalCode,
              shipmentDate: booking.shipment.shipmentDate,
              rentalStartDate: booking.shipment.rentalStartDate,
              rentalEndDate: booking.shipment.rentalEndDate,
              deliveryInstructions: booking.shipment.deliveryInstructions,
              conditionPhotoUrl: booking.shipment.conditionPhotoUrl,
              trackingCode: booking.shipment.trackingCode
            },
            update: {
              addressLine1: booking.shipment.addressLine1,
              addressLine2: booking.shipment.addressLine2,
              city: booking.shipment.city,
              state: booking.shipment.state,
              postalCode: booking.shipment.postalCode,
              shipmentDate: booking.shipment.shipmentDate,
              rentalStartDate: booking.shipment.rentalStartDate,
              rentalEndDate: booking.shipment.rentalEndDate,
              deliveryInstructions: booking.shipment.deliveryInstructions,
              conditionPhotoUrl: booking.shipment.conditionPhotoUrl,
              trackingCode: booking.shipment.trackingCode
            }
          }
        }
      }
    });

    if ("review" in booking) {
      await prisma.review.upsert({
        where: { bookingId: booking.id },
        create: {
          id: booking.review.id,
          bookingId: booking.id,
          productId: booking.productId,
          customerId: booking.customerId,
          rating: booking.review.rating,
          comment: booking.review.comment,
          conditionNote: booking.review.conditionNote
        },
        update: {
          rating: booking.review.rating,
          comment: booking.review.comment,
          conditionNote: booking.review.conditionNote
        }
      });
    }
  }

  for (const event of shipmentEvents) {
    await prisma.shipmentEvent.upsert({
      where: { id: event.id },
      create: event,
      update: {
        status: event.status,
        message: event.message,
        occurredAt: event.occurredAt
      }
    });
  }

  for (const notification of notifications) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      create: notification,
      update: {
        title: notification.title,
        message: notification.message
      }
    });
  }

  for (const block of contentBlocks) {
    await prisma.contentBlock.upsert({
      where: { id: block.id },
      create: block,
      update: {
        title: block.title,
        body: block.body,
        type: block.type,
        isPublished: block.isPublished
      }
    });
  }

  for (const campaign of promoCampaigns) {
    await prisma.promoCampaign.upsert({
      where: { id: campaign.id },
      create: campaign,
      update: {
        description: campaign.description,
        discountType: campaign.discountType,
        value: campaign.value,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
        minOrderAmount: campaign.minOrderAmount,
        usageLimit: campaign.usageLimit,
        usedCount: campaign.usedCount,
        isActive: campaign.isActive
      }
    });
  }

  for (const referral of referralCodes) {
    await prisma.referralCode.upsert({
      where: { id: referral.id },
      create: referral,
      update: {
        rewardAmount: referral.rewardAmount,
        usageCount: referral.usageCount,
        isActive: referral.isActive
      }
    });
  }

  for (const event of analyticsEvents) {
    await prisma.analyticsEvent.upsert({
      where: { id: event.id },
      create: event,
      update: {
        eventType: event.eventType,
        sessionId: event.sessionId,
        customerId: event.customerId,
        productId: event.productId,
        metadata: event.metadata,
        createdAt: event.createdAt
      }
    });
  }

  for (const log of auditLogs) {
    await prisma.auditLog.upsert({
      where: { id: log.id },
      create: log,
      update: {
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent
      }
    });
  }

  console.log("Seeded Rento demo data.");
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
  console.log(`Advertiser login: shaadi@rento.local / ${advertiserPassword}`);
  console.log(`Customer login: ${customerSeed.email} / ${customerPassword}`);
}

function inferQualityScore(url: string) {
  const widthMatch = url.match(/w=(\d+)/);
  const qualityMatch = url.match(/q=(\d+)/);
  const width = widthMatch ? Number(widthMatch[1]) : 0;
  const quality = qualityMatch ? Number(qualityMatch[1]) : 0;
  let score = 50;

  if (width >= 1200) {
    score += 30;
  } else if (width >= 800) {
    score += 20;
  }

  if (quality >= 80) {
    score += 15;
  } else if (quality >= 60) {
    score += 5;
  }

  return Math.min(100, score);
}

function buildImageTags(
  product: { name: string; category: Category; tags: string[] },
  url: string
) {
  const baseTags = new Set<string>([...product.tags, product.category.toLowerCase()]);
  const nameTags = product.name
    .toLowerCase()
    .split(/\s+/)
    .map((tag) => tag.replace(/[^a-z0-9]/g, ""))
    .filter((tag) => tag.length > 3)
    .slice(0, 2);

  for (const tag of nameTags) {
    baseTags.add(tag);
  }

  if (url.includes("w=1200") || url.includes("w=1400")) {
    baseTags.add("hires");
  }

  return Array.from(baseTags).slice(0, 8);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });

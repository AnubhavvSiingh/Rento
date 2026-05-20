export type MediaCard = { title: string; note: string; image: string; accent?: string };
export type Testimonial = { quote: string; name: string; role: string };
export type VideoFeature = { title: string; note: string; poster: string; video: string };

export const advertiserCategories = [
  "Furniture",
  "Appliances",
  "Fashion",
  "Ceremony",
  "Electronics"
];

export const categoryImages: Record<string, string[]> = {
  Furniture: [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80"
  ],
  Appliances: [
    "https://images.unsplash.com/photo-1586208958839-06c17cacdf08?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=1200&q=80"
  ],
  Fashion: [
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80"
  ],
  Ceremony: [
    "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80"
  ],
  Electronics: [
    "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80"
  ]
};

export const homeVisuals: MediaCard[] = [
  {
    title: "Occasion wear that does not sit unused",
    note: [
      "Premium lehengas, gowns, and statement pieces move from one beautiful day",
      "to the next instead of sitting in wardrobes."
    ].join(" "),
    image: categoryImages.Ceremony[2],
    accent: "Ceremony"
  },
  {
    title: "Furniture for flexible city living",
    note: [
      "Moving cities gets easier when comfort arrives ready-made and leaves without",
      "stress when plans change."
    ].join(" "),
    image: categoryImages.Furniture[2],
    accent: "Furniture"
  },
  {
    title: "Everyday essentials that arrive fast",
    note: [
      "Appliances, electronics, and ceremony must-haves become affordable through",
      "access instead of ownership."
    ].join(" "),
    image: categoryImages.Appliances[2],
    accent: "Appliances"
  }
];

export const exploreVisuals: MediaCard[] = [
  {
    title: "Browse by moment, not only category",
    note: [
      "From wedding mornings to furnished move-ins, every listing is organized",
      "around why people rent in real life."
    ].join(" "),
    image: categoryImages.Ceremony[1],
    accent: "Ceremony"
  },
  {
    title: "Premium shots make browsing feel effortless",
    note: [
      "A more editorial product view helps customers imagine the rental before they",
      "even open checkout."
    ].join(" "),
    image: categoryImages.Fashion[2],
    accent: "Fashion"
  },
  {
    title: "Fast-moving homes need short-term setup",
    note: [
      "Beds, workstations, appliances, and sofas can be rented city by city with",
      "less upfront cost."
    ].join(" "),
    image: categoryImages.Furniture[1],
    accent: "Furniture"
  }
];

export const advertiserVisuals: MediaCard[] = [
  {
    title: "Photographed listings perform better",
    note: [
      "Clear, aesthetic product images help renters trust the condition, styling,",
      "and value of each listing."
    ].join(" "),
    image: categoryImages.Fashion[1],
    accent: "Fashion"
  },
  {
    title: "Homes and events need temporary items",
    note: [
      "Unused products can become steady rental income with approval, tracking,",
      "and live performance visibility."
    ].join(" "),
    image: categoryImages.Furniture[0],
    accent: "Furniture"
  },
  {
    title: "Measure income against upkeep",
    note: [
      "Advertisers can see booking demand, revenue, cost, and ROI from one",
      "dashboard built for repeat rentals."
    ].join(" "),
    image: categoryImages.Electronics[1],
    accent: "Electronics"
  }
];

export const categoryShowcases: MediaCard[] = [
  {
    title: "Wedding and ceremony wear",
    note: [
      "Lehengas, gowns, sherwanis, and premium styling accessories for one-time",
      "moments."
    ].join(" "),
    image: categoryImages.Ceremony[0],
    accent: "Ceremony"
  },
  {
    title: "Ready-to-live furniture",
    note: [
      "Sofas, dining sets, beds, and desks for relocations, rentals, and flexible",
      "homes."
    ].join(" "),
    image: categoryImages.Furniture[0],
    accent: "Furniture"
  },
  {
    title: "Appliances for short stays",
    note: [
      "Fridges, laundry, microwaves, and kitchen essentials without heavy upfront",
      "buying."
    ].join(" "),
    image: categoryImages.Appliances[0],
    accent: "Appliances"
  },
  {
    title: "Creator and work gear",
    note: [
      "Cameras, monitors, and productivity bundles for campaigns, gigs, and",
      "temporary setups."
    ].join(" "),
    image: categoryImages.Electronics[0],
    accent: "Electronics"
  }
];

export const homeVideoFeature: VideoFeature = {
  title: "See how modern renting feels inside Rento",
  note: [
    "From occasion wear to apartment essentials, customers can move through",
    "inspiration, trust, checkout, and tracking without friction."
  ].join(" "),
  poster: categoryImages.Ceremony[0],
  video: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-browsing-clothes-in-a-boutique-4626-large.mp4"
};

export const exploreVideoFeature: VideoFeature = {
  title: "Browse rentals like a premium marketplace",
  note: [
    "A calm discovery experience, expressive visuals, and fast filtering make",
    "customers stay longer and convert better."
  ].join(" "),
  poster: categoryImages.Furniture[0],
  video: "https://assets.mixkit.co/videos/preview/mixkit-modern-living-room-interior-44783-large.mp4"
};

export const homeTestimonials: Testimonial[] = [
  {
    quote: [
      "I rented my ceremony lehenga instead of buying one for a single day, and",
      "the experience felt premium from start to finish."
    ].join(" "),
    name: "Ananya",
    role: "Bride in Delhi"
  },
  {
    quote: [
      "Moving into Bengaluru for six months was easier because I could rent a",
      "sofa, desk, and appliances in one place."
    ].join(" "),
    name: "Rahul",
    role: "Consultant relocating cities"
  },
  {
    quote: [
      "Posting unused furniture on Rento turned storage into revenue. The approval",
      "and tracking flow made it feel reliable."
    ].join(" "),
    name: "Mitali",
    role: "Advertiser host"
  }
];

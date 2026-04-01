export const products: Product[] = [
  {
    id: "prd-001",
    name: "Studio Apartment Furniture Set",
    category: "Furniture",
    city: "Bengaluru",
    dailyRate: 399,
    deposit: 1500,
    owner: "UrbanNest Host",
    condition: "Verified",
    description: "Bed, table, chairs, and storage setup for temporary city living.",
    tags: ["moving", "student", "monthly rental"]
  },
  {
    id: "prd-002",
    name: "Wedding Lehenga Premium Collection",
    category: "Ceremony",
    city: "Delhi",
    dailyRate: 1299,
    deposit: 3000,
    owner: "Shaadi Closet",
    condition: "Excellent",
    description: "Designer bridal wear for one-day and weekend ceremonies.",
    tags: ["bridal", "ceremony", "fashion rental"]
  },
  {
    id: "prd-003",
    name: "Content Creator Partywear Dress",
    category: "Fashion",
    city: "Mumbai",
    dailyRate: 499,
    deposit: 1000,
    owner: "Influence Rack",
    condition: "Good",
    description: "Short-term rental for shoots, events, reels, and collaborations.",
    tags: ["influencer", "fast delivery", "photoshoot"]
  },
  {
    id: "prd-004",
    name: "Work-From-Home Appliance Bundle",
    category: "Appliances",
    city: "Hyderabad",
    dailyRate: 349,
    deposit: 1200,
    owner: "StayEasy Rentals",
    condition: "Verified",
    description: "Fan, microwave, induction stove, and mini-fridge bundle.",
    tags: ["relocation", "kitchen", "starter pack"]
  }
];

export type Category =
  | "Furniture"
  | "Appliances"
  | "Fashion"
  | "Ceremony"
  | "Electronics";

export type ProductCondition = "Excellent" | "Good" | "Verified";

export interface Product {
  id: string;
  name: string;
  category: Category;
  city: string;
  dailyRate: number;
  deposit: number;
  owner: string;
  condition: ProductCondition;
  description: string;
  tags: string[];
}

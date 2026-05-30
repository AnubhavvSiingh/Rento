// App-wide constants for storage keys and UI option lists.
export const themeKey = "rento_theme";
export const analyticsSessionKey = "rento_analytics_session";

export const paymentOptions = [
  {
    value: "UPI",
    label: "UPI",
    description: "Fast confirmation with any UPI ID",
    icon: "UPI"
  },
  {
    value: "Card",
    label: "Card",
    description: "Credit or debit card reference",
    icon: "Card"
  },
  {
    value: "Net banking",
    label: "Net banking",
    description: "Bank transfer confirmation",
    icon: "Bank"
  },
  {
    value: "Wallet",
    label: "Wallet",
    description: "Wallet or prepaid transaction ID",
    icon: "Pay"
  }
];

export const ratingOptions = [
  { value: "5", label: "5 - Excellent", description: "Premium from start to finish", icon: "5" },
  { value: "4", label: "4 - Good", description: "Smooth experience with small gaps", icon: "4" },
  { value: "3", label: "3 - Okay", description: "Acceptable but could improve", icon: "3" },
  { value: "2", label: "2 - Needs improvement", description: "Noticeable service issues", icon: "2" },
  { value: "1", label: "1 - Poor", description: "Major rental experience problem", icon: "1" }
];

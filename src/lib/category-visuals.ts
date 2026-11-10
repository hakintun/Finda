export interface CategoryVisual {
  emoji: string;
  bg: string;
  accent: string;
  shortLabel: string;
}

const VISUAL_MAP: Record<string, CategoryVisual> = {
  Provisions: {
    emoji: "🍚",
    bg: "#FFF7ED",
    accent: "#C2410C",
    shortLabel: "Food & Provisions",
  },
  "Food & Produce": {
    emoji: "🍅",
    bg: "#FEF2F2",
    accent: "#B91C1C",
    shortLabel: "Fresh Foodstuff",
  },
  Electronics: {
    emoji: "📱",
    bg: "#EFF6FF",
    accent: "#1D4ED8",
    shortLabel: "Phones & Electronics",
  },
  "Power & Solar": {
    emoji: "⚡",
    bg: "#FEFCE8",
    accent: "#A16207",
    shortLabel: "Generators & Solar",
  },
  Power: {
    emoji: "⚡",
    bg: "#FEFCE8",
    accent: "#A16207",
    shortLabel: "Generators & Power",
  },
  "Building Materials": {
    emoji: "🧱",
    bg: "#F3F4F6",
    accent: "#374151",
    shortLabel: "Building & Hardware",
  },
  Hardware: {
    emoji: "🛠️",
    bg: "#F3F4F6",
    accent: "#374151",
    shortLabel: "Tools & Hardware",
  },
  "Auto Parts": {
    emoji: "🚗",
    bg: "#F0FDF4",
    accent: "#15803D",
    shortLabel: "Vehicles & Parts",
  },
  "Home & Gas": {
    emoji: "🏠",
    bg: "#FAF5FF",
    accent: "#7E22CE",
    shortLabel: "Home & Appliances",
  },
  Appliances: {
    emoji: "📺",
    bg: "#FAF5FF",
    accent: "#7E22CE",
    shortLabel: "Home Appliances",
  },
  "Health & Beauty": {
    emoji: "💄",
    bg: "#FDF2F8",
    accent: "#BE185D",
    shortLabel: "Beauty & Care",
  },
  Fashion: {
    emoji: "👕",
    bg: "#FDF2F8",
    accent: "#BE185D",
    shortLabel: "Fashion & Wear",
  },
};

export function getCategoryVisual(category?: string | null): CategoryVisual {
  const key = (category || "").trim();
  if (VISUAL_MAP[key]) return VISUAL_MAP[key];
  const lower = key.toLowerCase();
  if (lower.includes("gen") || lower.includes("power") || lower.includes("solar")) {
    return VISUAL_MAP["Power & Solar"];
  }
  if (lower.includes("build") || lower.includes("cement") || lower.includes("iron")) {
    return VISUAL_MAP["Building Materials"];
  }
  if (lower.includes("phone") || lower.includes("elect") || lower.includes("laptop")) {
    return VISUAL_MAP.Electronics;
  }
  if (lower.includes("auto") || lower.includes("car") || lower.includes("tyre")) {
    return VISUAL_MAP["Auto Parts"];
  }
  if (lower.includes("food") || lower.includes("prov") || lower.includes("rice")) {
    return VISUAL_MAP.Provisions;
  }
  if (lower.includes("home") || lower.includes("gas") || lower.includes("furn")) {
    return VISUAL_MAP["Home & Gas"];
  }
  return {
    emoji: "🛍️",
    bg: "#ECFDF5",
    accent: "#047857",
    shortLabel: key || "General Goods",
  };
}

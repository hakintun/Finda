export interface CategoryVisual {
  emoji: string;
  bg: string;
  bgGradient: string;
  accent: string;
  shortLabel: string;
}

const VISUAL_MAP: Record<string, CategoryVisual> = {
  Provisions: {
    emoji: "🍚",
    bg: "#FFF7ED",
    bgGradient: "from-[#FFF7ED] to-[#FEF3C7]",
    accent: "#C2410C",
    shortLabel: "Food & Provisions",
  },
  "Food & Produce": {
    emoji: "🍅",
    bg: "#FEF2F2",
    bgGradient: "from-[#FEF2F2] to-[#FFEDD5]",
    accent: "#B91C1C",
    shortLabel: "Fresh Foodstuff",
  },
  Electronics: {
    emoji: "📱",
    bg: "#EFF6FF",
    bgGradient: "from-[#EFF6FF] to-[#E0F2FE]",
    accent: "#1D4ED8",
    shortLabel: "Phones & Electronics",
  },
  "Power & Solar": {
    emoji: "⚡",
    bg: "#FEFCE8",
    bgGradient: "from-[#FEFCE8] to-[#ECFDF5]",
    accent: "#A16207",
    shortLabel: "Generators & Solar",
  },
  Power: {
    emoji: "⚡",
    bg: "#FEFCE8",
    bgGradient: "from-[#FEFCE8] to-[#ECFDF5]",
    accent: "#A16207",
    shortLabel: "Generators & Power",
  },
  "Building Materials": {
    emoji: "🧱",
    bg: "#F3F4F6",
    bgGradient: "from-[#F3F2EC] to-[#E5E7EB]",
    accent: "#374151",
    shortLabel: "Building & Hardware",
  },
  Hardware: {
    emoji: "🛠️",
    bg: "#F3F4F6",
    bgGradient: "from-[#F3F2EC] to-[#E5E7EB]",
    accent: "#374151",
    shortLabel: "Tools & Hardware",
  },
  "Auto Parts": {
    emoji: "🚗",
    bg: "#F0FDF4",
    bgGradient: "from-[#ECFDF5] to-[#D1FAE5]",
    accent: "#15803D",
    shortLabel: "Vehicles & Parts",
  },
  "Home & Gas": {
    emoji: "🏠",
    bg: "#FAF5FF",
    bgGradient: "from-[#ECFDF5] to-[#FEF3C7]",
    accent: "#065F46",
    shortLabel: "Home & Cooking Gas",
  },
  Appliances: {
    emoji: "📺",
    bg: "#FAF5FF",
    bgGradient: "from-[#EFF6FF] to-[#ECFDF5]",
    accent: "#065F46",
    shortLabel: "Home Appliances",
  },
  "Health & Beauty": {
    emoji: "💄",
    bg: "#FDF2F8",
    bgGradient: "from-[#FDF2F8] to-[#FCE7F3]",
    accent: "#BE185D",
    shortLabel: "Beauty & Care",
  },
  Fashion: {
    emoji: "👕",
    bg: "#FDF2F8",
    bgGradient: "from-[#FDF2F8] to-[#F3E8FF]",
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
  if (lower.includes("phone") || lower.includes("elect") || lower.includes("computer")) {
    return VISUAL_MAP.Electronics;
  }
  if (lower.includes("food") || lower.includes("prov") || lower.includes("rice")) {
    return VISUAL_MAP.Provisions;
  }
  if (lower.includes("gas") || lower.includes("home") || lower.includes("kitchen")) {
    return VISUAL_MAP["Home & Gas"];
  }
  if (lower.includes("auto") || lower.includes("car") || lower.includes("motor")) {
    return VISUAL_MAP["Auto Parts"];
  }
  if (lower.includes("health") || lower.includes("pharm") || lower.includes("beauty")) {
    return VISUAL_MAP["Health & Beauty"];
  }
  return {
    emoji: "🛍️",
    bg: "#ECFDF5",
    bgGradient: "from-[#ECFDF5] to-[#F3F2EC]",
    accent: "#065F46",
    shortLabel: key || "General Stock",
  };
}

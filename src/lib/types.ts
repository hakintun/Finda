export type StockStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "unconfirmed";

export type VerificationTier = "unverified" | "phone" | "id" | "visit";

export type FreshnessBucket = "fresh" | "aging" | "stale" | "expired";

export type SellerType = "stall" | "shop" | "service";

export type ClusterId =
  | "Mile1"
  | "Mile3"
  | "CreekRd"
  | "AdaGeorge"
  | "Rumuokoro";

export interface ClusterOption {
  id: ClusterId;
  label: string;
  zonesHint: string;
}

export const PORT_HARCOURT_CLUSTERS: readonly ClusterOption[] = [
  {
    id: "Mile1",
    label: "Mile 1 Market",
    zonesHint: "Mile 1, Ikwerre Rd, Diobu lines",
  },
  {
    id: "Mile3",
    label: "Mile 3 Market",
    zonesHint: "Mile 3, Nkpolu, Olu Obasanjo",
  },
  {
    id: "CreekRd",
    label: "Creek Road / Town",
    zonesHint: "Creek Rd, Aggrey Rd, Old GRA",
  },
  {
    id: "AdaGeorge",
    label: "Ada George",
    zonesHint: "Ada George, Mgbuoba, Location",
  },
  {
    id: "Rumuokoro",
    label: "Rumuokoro / Choba",
    zonesHint: "Rumuokoro, East-West Rd, UNIPORT/RSU",
  },
] as const;

export interface ResultCardListing {
  id: string;
  productSlug: string;
  titleAsListed: string;
  /** Always integer kobo (e.g. ₦185,000 = 18_500_000) — never floats (PRD §11) */
  priceKobo: number;
  priceNegotiable: boolean;
  stockStatus: StockStatus;
  /** ISO UTC timestamp of last seller/agent confirmation */
  confirmedAt: string | null;
  distanceKm: number | null;
  zoneName: string;
  landmarkText: string;
  sellerName: string;
  sellerSlug: string;
  sellerType: SellerType;
  verificationTier: VerificationTier;
  isClosedNow?: boolean;
  opensAtLabel?: string;
}

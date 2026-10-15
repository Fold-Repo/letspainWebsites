export const partnershipCategories = ["sponsor", "vendor", "artist", "community", "other"] as const;

export type PartnershipCategory = (typeof partnershipCategories)[number];

const labels: Record<PartnershipCategory, string> = {
  sponsor: "Sponsor",
  vendor: "Vendor",
  artist: "Artist",
  community: "Community",
  other: "Other",
};

export function categoryLabel(category: PartnershipCategory) {
  return labels[category];
}

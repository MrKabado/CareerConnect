export type CompanyMediaAsset = {
  id: string;
  url: string;
  altText: string;
};

export type CompanyMediaCollection = {
  logo: CompanyMediaAsset | null;
  banner: CompanyMediaAsset | null;
  gallery: CompanyMediaAsset[];
  videoUrl: string;
  coverImageId: string | null;
};

export type CompanyProfileStrengthInput = {
  name: string;
  industry: string;
  teamSize: string;
  website?: string;
  overview: string;
  locations?: ReadonlyArray<{ city: string; label: string }>;
  benefits?: ReadonlyArray<string>;
  cultureSummary?: string;
  lifeAt?: ReadonlyArray<{ title: string; description: string }>;
};

export type ProfileStrengthItemId =
  | "company_information"
  | "hiring_locations"
  | "benefits_and_culture"
  | "company_values"
  | "company_media";

export type ProfileStrengthItem = {
  id: ProfileStrengthItemId;
  label: string;
  complete: boolean;
  hint: string;
};

export type ProfileStrengthResult = {
  percent: number;
  items: ProfileStrengthItem[];
  nextAction: {
    id: ProfileStrengthItemId;
    label: string;
  } | null;
};

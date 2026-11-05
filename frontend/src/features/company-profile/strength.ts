import type {
  CompanyMediaCollection,
  CompanyProfileStrengthInput,
  ProfileStrengthItem,
  ProfileStrengthItemId,
  ProfileStrengthResult,
} from "@/features/company-profile/types";

export type ProfileStrengthConfigItem = {
  id: ProfileStrengthItemId;
  label: string;
  weight: number;
  isComplete: (
    profile: CompanyProfileStrengthInput,
    media: CompanyMediaCollection,
  ) => boolean;
  hint: string;
};

export const profileStrengthConfig: readonly ProfileStrengthConfigItem[] = [
  {
    id: "company_information",
    label: "Company information",
    weight: 25,
    isComplete: (profile) =>
      profile.name.trim().length > 0 &&
      profile.industry.trim().length > 0 &&
      profile.teamSize.trim().length > 0 &&
      Boolean(profile.website?.trim()) &&
      profile.overview.trim().length >= 100,
    hint: "Add your company name, industry, size, website, and a description of at least 100 characters.",
  },
  {
    id: "hiring_locations",
    label: "Hiring locations",
    weight: 15,
    isComplete: (profile) =>
      Boolean(profile.locations?.some((location) => location.city.trim().length > 0)),
    hint: "Add at least one hiring location.",
  },
  {
    id: "benefits_and_culture",
    label: "Benefits and culture",
    weight: 20,
    isComplete: (profile) =>
      (profile.benefits?.filter((benefit) => benefit.trim().length > 0).length ?? 0) >= 3 &&
      Boolean(profile.cultureSummary?.trim()),
    hint: "Add at least 3 benefits and a culture summary.",
  },
  {
    id: "company_values",
    label: "Company values",
    weight: 15,
    isComplete: (profile) =>
      (profile.lifeAt?.filter(
        (value) => value.title.trim().length > 0 && value.description.trim().length > 0,
      ).length ?? 0) >= 3,
    hint: "Add at least 3 company values with descriptions.",
  },
  {
    id: "company_media",
    label: "Company media",
    weight: 25,
    isComplete: (_profile, media) =>
      Boolean(media.logo) && media.gallery.length >= 3,
    hint: "Add a company logo and at least 3 photos.",
  },
];

export function assertProfileStrengthWeights(
  config: readonly Pick<ProfileStrengthConfigItem, "weight">[] = profileStrengthConfig,
): void {
  const total = config.reduce((sum, item) => sum + item.weight, 0);
  if (total !== 100) {
    throw new Error(`Profile strength weights must total 100; received ${total}.`);
  }
}

function getActionLabel(id: ProfileStrengthItemId): string {
  switch (id) {
    case "company_information":
      return "Complete company information";
    case "hiring_locations":
      return "Add hiring locations";
    case "benefits_and_culture":
      return "Add benefits and culture";
    case "company_values":
      return "Add company values";
    case "company_media":
      return "Add company media";
  }
}

export function computeProfileStrength(
  profile: CompanyProfileStrengthInput,
  media: CompanyMediaCollection = {
    logo: null,
    banner: null,
    gallery: [],
    videoUrl: "",
    coverImageId: null,
  },
): ProfileStrengthResult {
  assertProfileStrengthWeights();

  const items: ProfileStrengthItem[] = profileStrengthConfig.map((item) => ({
    id: item.id,
    label: item.label,
    complete: item.isComplete(profile, media),
    hint: item.hint,
  }));
  const percent = profileStrengthConfig.reduce(
    (total, configItem, index) =>
      total + (items[index].complete ? configItem.weight : 0),
    0,
  );
  const nextItem = items.find((item) => !item.complete);

  return {
    percent,
    items,
    nextAction: nextItem
      ? { id: nextItem.id, label: getActionLabel(nextItem.id) }
      : { id: "company_media", label: "Manage media" },
  };
}

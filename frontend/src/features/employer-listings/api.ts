import type { DefaultsSnapshot, ListingOnboarding, OnboardingStatus } from "@/features/employer-listings/types";
import {
  getEmployerListingsSnapshot,
  saveEmployerListing,
} from "@/features/employer-listings/listings";

const STORAGE_KEY = "careerconnect.employer-listings.onboarding";
const LISTINGS_KEY = "careerconnect.employer-listings.listings";
const PUBLISHED_KEY = "careerconnect.employer-listings.published";

const wait = (ms = 550) => new Promise((resolve) => window.setTimeout(resolve, ms));

function readStore(): Record<string, ListingOnboarding> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ListingOnboarding>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, ListingOnboarding>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function readListingStore() {
  try {
    const raw = window.localStorage.getItem(LISTINGS_KEY);
    if (!raw) return {} as Record<string, { id: string; onboarding?: { confirmedAt: string | null; confirmedBy: string | null; defaultsSnapshot: DefaultsSnapshot | null }; onboardingStatus?: OnboardingStatus; publishedAt?: string | null }>;
    return JSON.parse(raw) as Record<string, { id: string; onboarding?: { confirmedAt: string | null; confirmedBy: string | null; defaultsSnapshot: DefaultsSnapshot | null }; onboardingStatus?: OnboardingStatus; publishedAt?: string | null }>;
  } catch {
    return {} as Record<string, { id: string; onboarding?: { confirmedAt: string | null; confirmedBy: string | null; defaultsSnapshot: DefaultsSnapshot | null }; onboardingStatus?: OnboardingStatus; publishedAt?: string | null }>;
  }
}

function writeListingStore(store: Record<string, { id: string; onboarding?: { confirmedAt: string | null; confirmedBy: string | null; defaultsSnapshot: DefaultsSnapshot | null }; onboardingStatus?: OnboardingStatus; publishedAt?: string | null }>) {
  window.localStorage.setItem(LISTINGS_KEY, JSON.stringify(store));
}

function buildDefaultSnapshot(listingId: string): DefaultsSnapshot {
  const listing = getEmployerListingsSnapshot().find((item) => item.id === listingId);
  const listingType = listing?.type ?? "Job";
  return {
    hiringFor: listing?.hiring.type ?? "",
    defaultWorkspace: listing?.hiring.workspace ?? "",
    schoolPartnerships: listing?.hiring.schoolPartnerships ?? "",
    acceptedCourses: [],
    listingType,
  };
}

function normalizeStatus(status: string | undefined): OnboardingStatus {
  if (status === "confirmed") return "confirmed";
  if (status === "needs_changes") return "needs_changes";
  return "pending_confirmation";
}

export async function getListingOnboarding(listingId: string): Promise<ListingOnboarding> {
  await wait();

  const store = readStore();
  const existing = store[listingId];

  if (existing) {
    return {
      ...existing,
      status: normalizeStatus(existing.status),
    };
  }

  const defaultSnapshot = buildDefaultSnapshot(listingId);
  const record: ListingOnboarding = {
    listingId,
    status: "pending_confirmation",
    confirmedAt: null,
    confirmedBy: null,
    defaultsSnapshot: defaultSnapshot,
    requiresAttentionNote: null,
    updatedAt: new Date().toISOString(),
  };

  store[listingId] = record;
  writeStore(store);

  return record;
}

export async function confirmOnboarding(
  listingId: string,
  confirmedBy: string,
  defaultsSnapshot?: DefaultsSnapshot,
): Promise<ListingOnboarding> {
  await wait();

  const store = readStore();
  const existing = store[listingId] ?? {
    listingId,
    status: "pending_confirmation",
    confirmedAt: null,
    confirmedBy: null,
    defaultsSnapshot: defaultsSnapshot ?? buildDefaultSnapshot(listingId),
    requiresAttentionNote: null,
    updatedAt: new Date().toISOString(),
  };

  const next: ListingOnboarding = {
    ...existing,
    status: "confirmed",
    confirmedAt: new Date().toISOString(),
    confirmedBy,
    defaultsSnapshot: defaultsSnapshot ?? existing.defaultsSnapshot ?? buildDefaultSnapshot(listingId),
    requiresAttentionNote: null,
    updatedAt: new Date().toISOString(),
  };

  store[listingId] = next;
  writeStore(store);

  const listingStore = readListingStore();
  listingStore[listingId] = {
    id: listingId,
    onboarding: {
      confirmedAt: next.confirmedAt,
      confirmedBy: next.confirmedBy,
      defaultsSnapshot: next.defaultsSnapshot,
    },
    onboardingStatus: next.status,
  };
  writeListingStore(listingStore);

  return next;
}

export async function requestChanges(
  listingId: string,
  note: string,
): Promise<ListingOnboarding> {
  await wait();

  const store = readStore();
  const existing = store[listingId] ?? {
    listingId,
    status: "pending_confirmation",
    confirmedAt: null,
    confirmedBy: null,
    defaultsSnapshot: buildDefaultSnapshot(listingId),
    requiresAttentionNote: null,
    updatedAt: new Date().toISOString(),
  };

  const next: ListingOnboarding = {
    ...existing,
    status: "needs_changes",
    requiresAttentionNote: note,
    updatedAt: new Date().toISOString(),
  };

  store[listingId] = next;
  writeStore(store);

  const listingStore = readListingStore();
  listingStore[listingId] = {
    id: listingId,
    onboarding: {
      confirmedAt: next.confirmedAt,
      confirmedBy: next.confirmedBy,
      defaultsSnapshot: next.defaultsSnapshot,
    },
    onboardingStatus: next.status,
  };
  writeListingStore(listingStore);

  return next;
}

export async function resetOnboarding(listingId: string): Promise<ListingOnboarding> {
  await wait();

  const store = readStore();
  const existing = store[listingId] ?? {
    listingId,
    status: "pending_confirmation",
    confirmedAt: null,
    confirmedBy: null,
    defaultsSnapshot: buildDefaultSnapshot(listingId),
    requiresAttentionNote: null,
    updatedAt: new Date().toISOString(),
  };

  const next: ListingOnboarding = {
    ...existing,
    status: "pending_confirmation",
    confirmedAt: null,
    confirmedBy: null,
    requiresAttentionNote: "Defaults changed, please confirm again.",
    updatedAt: new Date().toISOString(),
  };

  store[listingId] = next;
  writeStore(store);

  const listingStore = readListingStore();
  listingStore[listingId] = {
    id: listingId,
    onboarding: {
      confirmedAt: null,
      confirmedBy: null,
      defaultsSnapshot: next.defaultsSnapshot,
    },
    onboardingStatus: next.status,
    publishedAt: null,
  };
  writeListingStore(listingStore);
  localStorage.setItem(PUBLISHED_KEY, JSON.stringify({ ...JSON.parse(localStorage.getItem(PUBLISHED_KEY) ?? "{}"), [listingId]: null }));

  const listing = getEmployerListingsSnapshot().find((item) => item.id === listingId);
  if (listing) {
    saveEmployerListing({ ...listing, status: "draft", updated: "Draft saved after setup change" });
  }

  return next;
}

export async function publishListing(listingId: string): Promise<{ listingId: string; publishedAt: string; isPublished: true }> {
  await wait();

  const listing = getEmployerListingsSnapshot().find((item) => item.id === listingId);
  if (!listing) {
    throw new Error("The listing could not be found.");
  }

  const publishedAt = new Date().toISOString();
  saveEmployerListing({
    ...listing,
    status: "active",
    updated: "Published just now",
  });

  const listingStore = readListingStore();
  listingStore[listingId] = {
    ...listingStore[listingId],
    id: listingId,
    onboarding: listingStore[listingId]?.onboarding ?? {
      confirmedAt: null,
      confirmedBy: null,
      defaultsSnapshot: buildDefaultSnapshot(listingId),
    },
    onboardingStatus: "confirmed",
    publishedAt,
  };
  writeListingStore(listingStore);

  const publishedRecord = JSON.parse(localStorage.getItem(PUBLISHED_KEY) ?? "{}") as Record<string, string | null>;
  publishedRecord[listingId] = publishedAt;
  localStorage.setItem(PUBLISHED_KEY, JSON.stringify(publishedRecord));

  return { listingId, publishedAt, isPublished: true };
}

// TODO(backend): Replace localStorage mock with real API persistence and server-side validation.

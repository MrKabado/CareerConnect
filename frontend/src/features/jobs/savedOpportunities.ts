export type SavedOpportunityType = "job" | "ojt";

const storageKey = "careerconnect.saved-opportunities";
const listeners = new Set<() => void>();

function loadSavedOpportunities() {
  if (typeof localStorage === "undefined") return [];

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

let savedOpportunities = loadSavedOpportunities();

function getOpportunityKey(type: SavedOpportunityType, id: string) {
  return `${type}:${id}`;
}

export const savedOpportunityStore = {
  getSnapshot: () => savedOpportunities,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  isSaved(type: SavedOpportunityType, id: string) {
    return savedOpportunities.includes(getOpportunityKey(type, id));
  },

  toggle(type: SavedOpportunityType, id: string) {
    const key = getOpportunityKey(type, id);
    savedOpportunities = savedOpportunities.includes(key)
      ? savedOpportunities.filter((saved) => saved !== key)
      : [...savedOpportunities, key];

    try {
      localStorage.setItem(storageKey, JSON.stringify(savedOpportunities));
    } catch {
      // Keep the in-memory bookmark usable if browser storage is unavailable.
    }

    listeners.forEach((listener) => listener());
  },
};
import type {
  EmployerVerificationDocument,
  VerificationDocumentKind,
} from "@/features/employer-verification/types";
import { verificationDocumentRequirements } from "@/features/employer-verification/types";

const STORAGE_KEY = "careerconnect.employer-verification.documents.v1";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const allowedExtensions = /\.(pdf|jpe?g|png)$/i;
const supportedDocumentKinds: readonly string[] = [
  ...verificationDocumentRequirements.map((requirement) => requirement.kind),
  "supporting",
];
const listeners = new Set<() => void>();
const inMemoryFiles = new Map<string, File>();
const EMPTY_DOCUMENTS: EmployerVerificationDocument[] = [];

type VerificationDocumentStore = Record<string, EmployerVerificationDocument[]>;

function isVerificationDocument(value: unknown): value is EmployerVerificationDocument {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<EmployerVerificationDocument>;
  return (
    typeof document.id === "string" &&
    typeof document.employerId === "string" &&
    supportedDocumentKinds.includes(document.kind ?? "") &&
    typeof document.fileName === "string" &&
    typeof document.mimeType === "string" &&
    typeof document.size === "number" &&
    typeof document.uploadedAt === "string"
  );
}

function readStore(): VerificationDocumentStore {
  const serialized = window.localStorage.getItem(STORAGE_KEY);
  if (!serialized) return {};

  const parsed: unknown = JSON.parse(serialized);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Saved verification document records are invalid.");
  }

  const store: VerificationDocumentStore = {};
  for (const [employerId, value] of Object.entries(parsed)) {
    if (!Array.isArray(value)) {
      throw new Error("Saved verification document records are invalid.");
    }

    const currentDocuments = value.filter((document) => {
      if (typeof document !== "object" || document === null || !("kind" in document)) {
        return true;
      }
      return !["company_id", "employer_id_primary", "employer_id_secondary"].includes(
        String(document.kind),
      );
    });
    if (!currentDocuments.every(isVerificationDocument)) {
      throw new Error("Saved verification document records are invalid.");
    }
    store[employerId] = currentDocuments;
  }
  return store;
}

let store = readStore();

function publish(nextStore: VerificationDocumentStore): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
  store = nextStore;
  listeners.forEach((listener) => listener());
}

function simulateDelay(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 300));
}

export function getEmployerVerificationDocuments(
  employerId: string,
): EmployerVerificationDocument[] {
  return store[employerId] ?? EMPTY_DOCUMENTS;
}

export function hasRequiredEmployerVerificationDocuments(employerId: string): boolean {
  const documents = getEmployerVerificationDocuments(employerId);
  return verificationDocumentRequirements.every((requirement) =>
    documents.some((document) => document.kind === requirement.kind),
  );
}

export function subscribeEmployerVerificationDocuments(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function validateEmployerVerificationFile(file: File): string | null {
  if (!allowedMimeTypes.has(file.type) || !allowedExtensions.test(file.name)) {
    return "Choose a PDF, JPG, or PNG file.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Each document must be 5 MB or smaller. Compress or resize the file, then try again.";
  }
  if (file.size === 0) {
    return "The selected file is empty. Choose another document.";
  }
  return null;
}

export async function uploadEmployerVerificationDocument(
  employerId: string,
  kind: VerificationDocumentKind,
  file: File,
): Promise<EmployerVerificationDocument> {
  const validationError = validateEmployerVerificationFile(file);
  if (validationError) throw new Error(validationError);

  await simulateDelay();
  const document: EmployerVerificationDocument = {
    id: globalThis.crypto?.randomUUID?.() ?? `verification-${Date.now()}`,
    employerId,
    kind,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };
  inMemoryFiles.set(document.id, file);

  const documents = [
    ...getEmployerVerificationDocuments(employerId).filter(
      (existing) => existing.kind !== kind,
    ),
    document,
  ];
  publish({ ...store, [employerId]: documents });
  return document;
}

export function getEmployerVerificationDocumentFile(
  documentId: string,
): File | undefined {
  return inMemoryFiles.get(documentId);
}

export async function submitEmployerVerificationDocuments(
  employerId: string,
): Promise<void> {
  await simulateDelay();
  const documents = getEmployerVerificationDocuments(employerId);
  const missing = verificationDocumentRequirements.filter(
    (requirement) => !documents.some((document) => document.kind === requirement.kind),
  );
  if (missing.length) {
    throw new Error("Upload your business registration and business permit documents before submitting for review.");
  }
}

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  store = readStore();
  listeners.forEach((listener) => listener());
});

// TODO(backend): Store uploads in private, access-controlled storage and expose short-lived signed previews.
// TODO(backend): Verify employer ownership and document authorization on every read and write.

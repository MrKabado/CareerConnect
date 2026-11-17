import { allowedFileName, maximumFileSize } from "@/features/user-apply/constants";
import type { SubmittedApplicationDocument } from "@/features/applications/applicationData";

export function validateFile(file: File) {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const hasAllowedType = !file.type || allowedTypes.includes(file.type);

  if (!allowedFileName.test(file.name) || !hasAllowedType) {
    return "Choose a PDF, DOC, or DOCX file.";
  }
  if (file.size > maximumFileSize) {
    return "Files must be 10 MB or smaller.";
  }
  return "";
}

export function getApplicationDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function serializeApplicationDocument(
  id: SubmittedApplicationDocument["id"],
  title: string,
  file: File,
): Promise<SubmittedApplicationDocument> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Unable to read ${file.name}.`));
        return;
      }
      resolve({ id, title, fileName: file.name, mimeType: file.type, size: file.size, dataUrl: reader.result });
    };
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

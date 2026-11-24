import {
  allowedResumeExtension,
  maximumFileSize,
} from "@/features/user-apply/constants";

export function validateFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const allowedTypes =
    extension === "pdf"
      ? ["application/pdf", "application/octet-stream"]
      : extension === "docx"
        ? [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/zip",
            "application/octet-stream",
          ]
        : [];
  const hasAllowedType = !file.type || allowedTypes.includes(file.type);

  if (!allowedResumeExtension.test(file.name) || !hasAllowedType) {
    return "Choose a PDF or DOCX resume with a matching file type and extension.";
  }
  if (file.size === 0) {
    return "The selected resume file is empty.";
  }
  if (file.size > maximumFileSize) {
    return "Files must be 5 MB or smaller.";
  }
  return "";
}

import { allowedFileName, maximumFileSize } from "@/features/user-apply/constants";
export function validateFile(file: File) {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const hasAllowedType = !file.type || allowedTypes.includes(file.type);

  if (!allowedFileName.test(file.name) || !hasAllowedType) {
    return "Choose a valid PDF or DOCX file.";
  }
  if (file.size > maximumFileSize) {
    return "Files must be 5 MB or smaller.";
  }
  return "";
}

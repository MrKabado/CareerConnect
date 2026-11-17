export type MessagingRole = "employer" | "applicant";
export type ConversationStatus = "open" | "closed";
export type MessageKind = "text" | "interview_card" | "system";

export type MessagingActor = {
  id: string;
  email: string;
  name: string;
  role: MessagingRole;
  companyId?: string;
  companyName?: string;
  employerVerified?: boolean;
};

export type MessageAttachment = {
  id: string;
  name: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  size: number;
  dataUrl?: string;
};

export type InterviewProposal = {
  startsAt: string;
  timezone: string;
  provider: "google_meet" | "zoom" | "teams" | "other";
  joinUrl: string;
  status: "proposed" | "accepted" | "reschedule_requested" | "cancelled";
};

export type Conversation = {
  conversationId: string;
  applicationId: string;
  listingId: string;
  employerId: string;
  applicantId: string;
  employerName: string;
  companyName: string;
  companyInitial: string;
  employerVerified: boolean;
  applicantName: string;
  role: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  lastMessageSenderId: string;
  mutedBy: string[];
  blockedBy: string | null;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: MessagingRole;
  senderName: string;
  body: string;
  kind: MessageKind;
  createdAt: string;
  readBy: string[];
  attachments?: MessageAttachment[];
  interviewProposal?: InterviewProposal;
};

export type NotificationItem = {
  id: string;
  recipientId: string;
  conversationId: string;
  type: "message" | "interview" | "status";
  employerName: string;
  companyInitial: string;
  role: string;
  preview: string;
  createdAt: string;
  read: boolean;
};

export type SendMessagePayload = {
  body: string;
  kind?: MessageKind;
  attachments?: MessageAttachment[];
  interviewProposal?: InterviewProposal;
};

export type InterviewResponseAction = "accept" | "reschedule";

export type MessagingErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "applicant_cannot_start"
  | "application_not_found"
  | "application_not_owned"
  | "conversation_not_found"
  | "not_participant"
  | "conversation_closed"
  | "conversation_blocked"
  | "daily_limit"
  | "invalid_message"
  | "invalid_report_reason"
  | "interview_not_found"
  | "invalid_interview_action"
  | "storage_unavailable"
  | "storage_corrupt";

export class MessagingError extends Error {
  readonly code: MessagingErrorCode;

  constructor(
    code: MessagingErrorCode,
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = "MessagingError";
  }
}

export type MessagingRealtimeEvent = {
  type:
    | "conversation_created"
    | "message_created"
    | "conversation_updated"
    | "notification_updated";
  conversationId: string;
  participantIds: string[];
  occurredAt: string;
};

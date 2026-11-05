import { applicationStore, type ApplicationStatus } from "@/features/applications/applicationData";
import { applicantSeedData } from "@/features/employer-applicants/data";
import { employerRegistrationApi } from "@/features/employer-registration/api";
import type {
  Conversation,
  InterviewProposal,
  InterviewResponseAction,
  Message,
  MessageAttachment,
  MessagingActor,
  MessagingErrorCode,
  NotificationItem,
  SendMessagePayload,
} from "@/features/messaging/types";
import { MessagingError } from "@/features/messaging/types";
import { publish } from "@/features/messaging/realtime";

const STORAGE_KEY = "careerconnect.messaging.v1";
const MAX_DAILY_CONVERSATIONS = 20;
const REQUEST_DELAY_MS = 180;

type ReportRecord = {
  conversationId: string;
  reporterId: string;
  reason: string;
  createdAt: string;
};

type DailyStartCount = {
  date: string;
  count: number;
};

type StoredMessagingState = {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  notifications: NotificationItem[];
  reports: ReportRecord[];
  dailyStarts: Record<string, DailyStartCount>;
  applicationStatuses: Record<string, ApplicationStatus>;
};

const emptyState = (): StoredMessagingState => ({
  conversations: [],
  messages: {},
  notifications: [],
  reports: [],
  dailyStarts: {},
  applicationStatuses: {},
});

function createError(code: MessagingErrorCode, message: string): MessagingError {
  return new MessagingError(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStoredMessagingState(value: unknown): value is StoredMessagingState {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.conversations) &&
    isRecord(value.messages) &&
    Array.isArray(value.notifications) &&
    Array.isArray(value.reports) &&
    isRecord(value.dailyStarts) &&
    isRecord(value.applicationStatuses)
  );
}

function readState(): StoredMessagingState {
  let serialized: string | null;
  try {
    serialized = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    throw createError("storage_unavailable", "Messaging storage is unavailable. Please try again.");
  }
  if (!serialized) return emptyState();

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isStoredMessagingState(parsed)) {
      throw createError("storage_corrupt", "Saved messaging data is invalid.");
    }
    return parsed;
  } catch (error) {
    if (error instanceof MessagingError) throw error;
    throw createError("storage_corrupt", "Saved messaging data could not be read.");
  }
}

function writeState(state: StoredMessagingState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // TODO(backend): Persist conversations and messages in the database with atomic application-level uniqueness.
    throw createError("storage_unavailable", "Your message could not be saved. Check browser storage and try again.");
  }
}

function wait(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, REQUEST_DELAY_MS));
}

function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function normalizedEmail(email: string): string {
  return email.trim().toLocaleLowerCase();
}

function requireActor(actor: MessagingActor): void {
  if (!actor.id || !actor.email || !actor.name) {
    throw createError("unauthenticated", "Sign in to use messaging.");
  }
}

function canonicalParticipantId(actor: MessagingActor): string {
  return actor.role === "applicant" ? normalizedEmail(actor.email) : actor.id;
}

function getConversation(state: StoredMessagingState, conversationId: string): Conversation {
  const conversation = state.conversations.find((item) => item.conversationId === conversationId);
  if (!conversation) {
    throw createError("conversation_not_found", "This conversation could not be found.");
  }
  return conversation;
}

function authorizeParticipant(conversation: Conversation, actor: MessagingActor): string {
  requireActor(actor);
  if (actor.role === "employer" && conversation.employerId === actor.id) return actor.id;
  if (actor.role === "applicant" && conversation.applicantId === normalizedEmail(actor.email)) {
    return normalizedEmail(actor.email);
  }
  throw createError("not_participant", "You can’t view or change this conversation.");
}

function requireOpenConversation(conversation: Conversation, participantId: string): void {
  if (conversation.status === "closed") {
    throw createError("conversation_closed", "This conversation is closed and read-only.");
  }
  if (conversation.blockedBy) {
    throw createError(
      "conversation_blocked",
      conversation.blockedBy === participantId
        ? "You blocked this conversation. Unblock support is not available in this mock."
        : "This conversation is unavailable because the other participant blocked it.",
    );
  }
}

function nextNotification(
  conversation: Conversation,
  recipientId: string,
  type: NotificationItem["type"],
  preview: string,
  createdAt: string,
): NotificationItem {
  return {
    id: createId("notification"),
    recipientId,
    conversationId: conversation.conversationId,
    type,
    employerName: conversation.companyName,
    companyInitial: conversation.companyInitial,
    role: conversation.role,
    preview,
    createdAt,
    read: false,
  };
}

function notifyParticipant(
  state: StoredMessagingState,
  conversation: Conversation,
  recipientId: string,
  type: NotificationItem["type"],
  preview: string,
  createdAt: string,
): void {
  state.notifications.unshift(nextNotification(conversation, recipientId, type, preview, createdAt));
}

function ensureMayaDemoConversation(state: StoredMessagingState, actor: MessagingActor): boolean {
  if (
    !import.meta.env.DEV ||
    actor.role !== "applicant" ||
    (normalizedEmail(actor.email) !== "jamie.delacruz@example.com" &&
      actor.name.trim().toLocaleLowerCase() !== "jamie dela cruz") ||
    state.conversations.some((conversation) =>
      conversation.applicationId === "employer-applicant-jamie-dela-cruz",
    )
  ) {
    return false;
  }

  const createdAt = new Date().toISOString();
  const conversationId = "conversation-maya-jamie-demo";
  const employerId = "maya-philippines-demo";
  const applicantId = normalizedEmail(actor.email);
  const body =
    "Hi Jamie, thanks for applying for the Frontend Developer role at Maya Philippines. We’d love to talk about your experience. Are you available for a short interview this week?";
  const conversation: Conversation = {
    conversationId,
    applicationId: "employer-applicant-jamie-dela-cruz",
    listingId: "employer-applicant-jamie-dela-cruz",
    employerId,
    applicantId,
    employerName: "Maya Philippines",
    companyName: "Maya Philippines",
    companyInitial: "M",
    employerVerified: true,
    applicantName: actor.name,
    role: "Frontend Developer",
    status: "open",
    createdAt,
    updatedAt: createdAt,
    lastMessagePreview: body,
    lastMessageAt: createdAt,
    lastMessageSenderId: employerId,
    mutedBy: [],
    blockedBy: null,
  };
  const message: Message = {
    id: "message-maya-jamie-demo",
    conversationId,
    senderId: employerId,
    senderRole: "employer",
    senderName: "Maya Philippines",
    body,
    kind: "text",
    createdAt,
    readBy: [employerId],
  };

  state.conversations.unshift(conversation);
  state.messages[conversationId] = [message];
  notifyParticipant(state, conversation, applicantId, "message", body, createdAt);
  return true;
}

function notifyUpdatedConversation(conversation: Conversation, type: "conversation_created" | "conversation_updated" | "message_created" | "notification_updated"): void {
  publish({
    type,
    conversationId: conversation.conversationId,
    participantIds: [conversation.employerId, conversation.applicantId],
    occurredAt: new Date().toISOString(),
  });
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function employerIsApproved(actor: MessagingActor): boolean {
  const registeredEmployer = employerRegistrationApi.getSnapshot();
  return actor.employerVerified === true &&
    registeredEmployer?.status === "approved" &&
    registeredEmployer.id === actor.companyId;
}

function getRecipientId(conversation: Conversation, actor: MessagingActor): string {
  const participantId = authorizeParticipant(conversation, actor);
  return participantId === conversation.employerId
    ? conversation.applicantId
    : conversation.employerId;
}

function buildMessage(
  conversation: Conversation,
  actor: MessagingActor,
  payload: SendMessagePayload,
  createdAt: string,
): Message {
  const body = payload.body.trim();
  const kind = payload.kind ?? "text";
  if (kind === "system" || (!body && !payload.attachments?.length && kind !== "interview_card")) {
    throw createError("invalid_message", "Write a message or attach a file before sending.");
  }
  if (kind === "interview_card" && !payload.interviewProposal) {
    throw createError("invalid_message", "An interview proposal is required.");
  }

  return {
    id: createId("message"),
    conversationId: conversation.conversationId,
    senderId: canonicalParticipantId(actor),
    senderRole: actor.role,
    senderName: actor.name,
    body,
    kind,
    createdAt,
    readBy: [canonicalParticipantId(actor)],
    ...(payload.attachments?.length ? { attachments: payload.attachments } : {}),
    ...(payload.interviewProposal ? { interviewProposal: payload.interviewProposal } : {}),
  };
}

function commitMessage(
  state: StoredMessagingState,
  conversation: Conversation,
  actor: MessagingActor,
  payload: SendMessagePayload,
): Message {
  const createdAt = new Date().toISOString();
  const message = buildMessage(conversation, actor, payload, createdAt);
  const messages = state.messages[conversation.conversationId] ?? [];
  state.messages[conversation.conversationId] = [...messages, message];
  conversation.updatedAt = createdAt;
  conversation.lastMessageAt = createdAt;
  conversation.lastMessageSenderId = message.senderId;
  conversation.lastMessagePreview = message.kind === "interview_card"
    ? "Interview invitation"
    : message.body || "Attachment";
  notifyParticipant(
    state,
    conversation,
    getRecipientId(conversation, actor),
    message.kind === "interview_card" ? "interview" : "message",
    conversation.lastMessagePreview,
    createdAt,
  );
  return message;
}

function getApplicationId(applicationId: string | number): string {
  return String(applicationId);
}

function readApplicationStatus(applicationId: string, applicationStatus: ApplicationStatus, state: StoredMessagingState): ApplicationStatus {
  return state.applicationStatuses[applicationId] ?? applicationStatus;
}

type ApplicationMessagingDetails = {
  applicationId: string;
  listingId: string;
  companyName: string;
  companyInitial: string;
  role: string;
  applicantName: string;
  applicantEmail: string;
  status: ApplicationStatus;
};

function getApplicationMessagingDetails(
  applicationId: string | number,
  actor: MessagingActor,
): ApplicationMessagingDetails {
  const requestedApplicationId = getApplicationId(applicationId);
  const application = applicationStore.getSnapshot().find((item) => getApplicationId(item.id) === requestedApplicationId);

  if (application) {
    if (application.company.toLocaleLowerCase() !== actor.companyName?.trim().toLocaleLowerCase()) {
      throw createError("application_not_owned", "You can only contact applicants to your company’s listings.");
    }
    if (!application.applicantName?.trim() || !application.applicantEmail?.trim()) {
      throw createError("application_not_owned", "This application is missing the applicant’s account details.");
    }
    return {
      applicationId: requestedApplicationId,
      listingId: application.jobListingId || `application-${requestedApplicationId}`,
      companyName: application.company,
      companyInitial: application.companyInitial,
      role: application.title,
      applicantName: application.applicantName,
      applicantEmail: application.applicantEmail,
      status: application.status,
    };
  }

  const seededApplicant = applicantSeedData.find((applicant) => applicant.id === requestedApplicationId);
  if (!seededApplicant || actor.companyName?.trim().toLocaleLowerCase() !== "maya philippines") {
    throw createError("application_not_found", "This application could not be found.");
  }

  const applicantStatuses: Record<string, ApplicationStatus> = {
    applied: "Applied",
    under_review: "Under Review",
    shortlisted: "Shortlisted",
    interview_scheduled: "Interview Scheduled",
    offer_extended: "Interview Scheduled",
    hired: "Hired",
    rejected: "Rejected",
  };
  return {
    applicationId: requestedApplicationId,
    listingId: `employer-applicant-${requestedApplicationId}`,
    companyName: actor.companyName,
    companyInitial: actor.companyName.slice(0, 1).toUpperCase(),
    role: seededApplicant.role,
    applicantName: seededApplicant.name,
    applicantEmail: seededApplicant.email,
    status: applicantStatuses[seededApplicant.status] ?? "Applied",
  };
}

export async function getConversationForApplication(
  applicationId: string | number,
  actor: MessagingActor,
): Promise<Conversation | null> {
  await wait();
  requireActor(actor);
  if (actor.role !== "employer" || !employerIsApproved(actor)) {
    throw createError("forbidden", "Only an approved employer can contact applicants.");
  }
  const details = getApplicationMessagingDetails(applicationId, actor);
  const conversation = readState().conversations.find((item) => item.applicationId === details.applicationId);
  if (!conversation) return null;
  if (conversation.employerId !== actor.id) {
    throw createError("application_not_owned", "Another employer already started this application’s conversation.");
  }
  return conversation;
}

export async function startConversation(
  applicationId: string | number,
  firstMessage: string,
  actor: MessagingActor,
): Promise<Conversation> {
  await wait();
  requireActor(actor);
  if (actor.role !== "employer") {
    // TODO(backend): Enforce role authorization server-side; applicants cannot initiate conversations.
    throw createError("applicant_cannot_start", "Only the employer can start a conversation.");
  }
  if (!employerIsApproved(actor)) {
    throw createError("forbidden", "Only an approved employer can contact applicants.");
  }
  if (!firstMessage.trim()) {
    throw createError("invalid_message", "Write a first message before starting the conversation.");
  }

  const application = getApplicationMessagingDetails(applicationId, actor);
  if (application.status === "Rejected" || application.status === "Hired") {
    throw createError("forbidden", "This application is no longer accepting new conversations.");
  }

  const state = readState();
  const existing = state.conversations.find((item) => item.applicationId === application.applicationId);
  if (existing) {
    if (existing.employerId !== actor.id) {
      throw createError("application_not_owned", "Another employer already started this application’s conversation.");
    }
    if (existing.status === "closed") {
      throw createError("conversation_closed", "This application already has a closed conversation.");
    }
    return existing;
  }

  const today = dateKey(new Date());
  const dailyStarts = state.dailyStarts[actor.id];
  const startsToday = dailyStarts?.date === today ? dailyStarts.count : 0;
  if (startsToday >= MAX_DAILY_CONVERSATIONS) {
    throw createError("daily_limit", "Daily conversation limit reached (20 new conversations). Try again tomorrow.");
  }

  const createdAt = new Date().toISOString();
  const conversation: Conversation = {
    conversationId: createId("conversation"),
    applicationId: application.applicationId,
    listingId: application.listingId,
    employerId: actor.id,
    applicantId: normalizedEmail(application.applicantEmail),
    employerName: actor.name,
    companyName: application.companyName,
    companyInitial: application.companyInitial,
    employerVerified: employerIsApproved(actor),
    applicantName: application.applicantName,
    role: application.role,
    status: "open",
    createdAt,
    updatedAt: createdAt,
    lastMessagePreview: "",
    lastMessageAt: createdAt,
    lastMessageSenderId: "",
    mutedBy: [],
    blockedBy: null,
  };
  state.conversations.unshift(conversation);
  state.dailyStarts[actor.id] = { date: today, count: startsToday + 1 };
  commitMessage(state, conversation, actor, { body: firstMessage });
  writeState(state);
  notifyUpdatedConversation(conversation, "conversation_created");
  return conversation;
}

export async function listConversations(actor: MessagingActor): Promise<Conversation[]> {
  await wait();
  requireActor(actor);
  const participantId = canonicalParticipantId(actor);
  const state = readState();
  if (ensureMayaDemoConversation(state, actor)) writeState(state);
  return state.conversations
    .filter((conversation) =>
      actor.role === "employer"
        ? conversation.employerId === participantId
        : conversation.applicantId === participantId,
    )
    .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));
}

export async function getMessages(conversationId: string, actor: MessagingActor): Promise<Message[]> {
  await wait();
  const state = readState();
  const conversation = getConversation(state, conversationId);
  authorizeParticipant(conversation, actor);
  return [...(state.messages[conversationId] ?? [])];
}

export async function sendMessage(
  conversationId: string,
  payload: SendMessagePayload,
  actor: MessagingActor,
): Promise<Message> {
  await wait();
  const state = readState();
  const conversation = getConversation(state, conversationId);
  const participantId = authorizeParticipant(conversation, actor);
  requireOpenConversation(conversation, participantId);
  if (payload.attachments?.some((attachment: MessageAttachment) =>
    !["application/pdf", "image/jpeg", "image/png"].includes(attachment.mimeType) ||
    attachment.size <= 0 ||
    attachment.size > 10 * 1024 * 1024 ||
    !attachment.name.trim(),
  )) {
    throw createError("invalid_message", "Attachments must be PDF, JPG or PNG files no larger than 10 MB.");
  }

  const message = commitMessage(state, conversation, actor, payload);
  writeState(state);
  notifyUpdatedConversation(conversation, "message_created");
  return message;
}

export async function markRead(conversationId: string, actor: MessagingActor): Promise<void> {
  await wait();
  const state = readState();
  const conversation = getConversation(state, conversationId);
  const participantId = authorizeParticipant(conversation, actor);
  const now = new Date().toISOString();
  state.messages[conversationId] = (state.messages[conversationId] ?? []).map((message) => ({
    ...message,
    readBy: message.readBy.includes(participantId) ? message.readBy : [...message.readBy, participantId],
  }));
  state.notifications = state.notifications.map((notification) =>
    notification.conversationId === conversationId && notification.recipientId === participantId
      ? { ...notification, read: true }
      : notification,
  );
  conversation.updatedAt = now;
  writeState(state);
  notifyUpdatedConversation(conversation, "notification_updated");
}

export async function listNotifications(actor: MessagingActor): Promise<NotificationItem[]> {
  await wait();
  requireActor(actor);
  const participantId = canonicalParticipantId(actor);
  const state = readState();
  if (ensureMayaDemoConversation(state, actor)) writeState(state);
  return state.notifications
    .filter((notification) => notification.recipientId === participantId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function markAllNotificationsRead(actor: MessagingActor): Promise<void> {
  await wait();
  requireActor(actor);
  const participantId = canonicalParticipantId(actor);
  const state = readState();
  state.notifications = state.notifications.map((notification) =>
    notification.recipientId === participantId ? { ...notification, read: true } : notification,
  );
  writeState(state);
  state.conversations
    .filter((conversation) => conversation.employerId === participantId || conversation.applicantId === participantId)
    .forEach((conversation) => notifyUpdatedConversation(conversation, "notification_updated"));
}

export async function getUnreadCount(actor: MessagingActor): Promise<number> {
  const notifications = await listNotifications(actor);
  return notifications.filter((notification) => !notification.read).length;
}

export async function closeConversation(conversationId: string, actor: MessagingActor): Promise<Conversation> {
  await wait();
  requireActor(actor);
  if (actor.role !== "employer") {
    throw createError("forbidden", "Only the employer can close a conversation.");
  }
  const state = readState();
  const conversation = getConversation(state, conversationId);
  authorizeParticipant(conversation, actor);
  const application = applicationStore.getSnapshot().find((item) => getApplicationId(item.id) === conversation.applicationId);
  if (!application) {
    throw createError("application_not_found", "The linked application could not be found.");
  }
  const status = readApplicationStatus(conversation.applicationId, application.status, state);
  if (status !== "Rejected" && status !== "Hired") {
    throw createError("forbidden", "A conversation can be closed after the application is rejected or hired.");
  }
  conversation.status = "closed";
  conversation.updatedAt = new Date().toISOString();
  writeState(state);
  notifyUpdatedConversation(conversation, "conversation_updated");
  return conversation;
}

export async function muteConversation(conversationId: string, actor: MessagingActor): Promise<Conversation> {
  await wait();
  const state = readState();
  const conversation = getConversation(state, conversationId);
  const participantId = authorizeParticipant(conversation, actor);
  conversation.mutedBy = conversation.mutedBy.includes(participantId)
    ? conversation.mutedBy.filter((id) => id !== participantId)
    : [...conversation.mutedBy, participantId];
  conversation.updatedAt = new Date().toISOString();
  writeState(state);
  notifyUpdatedConversation(conversation, "conversation_updated");
  return conversation;
}

export async function blockEmployer(conversationId: string, actor: MessagingActor): Promise<Conversation> {
  await wait();
  requireActor(actor);
  if (actor.role !== "applicant") {
    throw createError("forbidden", "Only an applicant can block an employer.");
  }
  const state = readState();
  const conversation = getConversation(state, conversationId);
  const participantId = authorizeParticipant(conversation, actor);
  conversation.blockedBy = conversation.blockedBy === participantId ? null : participantId;
  conversation.updatedAt = new Date().toISOString();
  writeState(state);
  notifyUpdatedConversation(conversation, "conversation_updated");
  return conversation;
}

export async function reportConversation(
  conversationId: string,
  reason: string,
  actor: MessagingActor,
): Promise<void> {
  await wait();
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw createError("invalid_report_reason", "Enter a reason before reporting this conversation.");
  }
  const state = readState();
  const conversation = getConversation(state, conversationId);
  const reporterId = authorizeParticipant(conversation, actor);
  state.reports.push({
    conversationId,
    reporterId,
    reason: trimmedReason,
    createdAt: new Date().toISOString(),
  });
  writeState(state);
}

export async function respondToInterview(
  messageId: string,
  action: InterviewResponseAction,
  proposedTime: string | undefined,
  actor: MessagingActor,
): Promise<Message> {
  await wait();
  requireActor(actor);
  if (actor.role !== "applicant") {
    throw createError("forbidden", "Only the applicant can respond to an interview proposal.");
  }
  const state = readState();
  const entry = Object.entries(state.messages).find(([, messages]) => messages.some((message) => message.id === messageId));
  const message = entry?.[1].find((item) => item.id === messageId);
  if (!entry || !message?.interviewProposal) {
    throw createError("interview_not_found", "This interview proposal could not be found.");
  }
  const conversation = getConversation(state, entry[0]);
  const participantId = authorizeParticipant(conversation, actor);
  requireOpenConversation(conversation, participantId);

  if (action === "reschedule" && !proposedTime) {
    throw createError("invalid_interview_action", "Choose a proposed time to request a reschedule.");
  }
  const proposal: InterviewProposal = {
    ...message.interviewProposal,
    status: action === "accept" ? "accepted" : "reschedule_requested",
    ...(action === "reschedule" && proposedTime ? { startsAt: proposedTime } : {}),
  };
  const updatedMessage: Message = { ...message, interviewProposal: proposal };
  state.messages[entry[0]] = entry[1].map((item) => item.id === messageId ? updatedMessage : item);
  if (action === "accept") {
    state.applicationStatuses[conversation.applicationId] = "Interview Scheduled";
  }
  const systemMessage: Message = {
    id: createId("message"),
    conversationId: conversation.conversationId,
    senderId: participantId,
    senderRole: actor.role,
    senderName: actor.name,
    body: action === "accept" ? "Accepted the interview invitation." : "Requested a different interview time.",
    kind: "system",
    createdAt: new Date().toISOString(),
    readBy: [participantId],
  };
  state.messages[entry[0]] = [...state.messages[entry[0]], systemMessage];
  conversation.lastMessageAt = systemMessage.createdAt;
  conversation.updatedAt = systemMessage.createdAt;
  conversation.lastMessageSenderId = participantId;
  conversation.lastMessagePreview = systemMessage.body;
  notifyParticipant(state, conversation, conversation.employerId, "interview", systemMessage.body, systemMessage.createdAt);
  writeState(state);
  notifyUpdatedConversation(conversation, "message_created");
  // TODO(backend): Persist the interview response and update the application status through the authorized application service.
  return updatedMessage;
}

export function getMessagingActor(user: {
  id: number;
  name: string;
  email: string;
  role: "applicant" | "employer";
}): MessagingActor {
  if (user.role === "applicant") {
    return { id: String(user.id), name: user.name, email: user.email, role: "applicant" };
  }
  const employer = employerRegistrationApi.getSnapshot();
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: "employer",
    companyId: employer?.id,
    companyName: employer?.companyName,
    employerVerified: employer?.status === "approved",
  };
}

export function getApplicantMessagingActor(user: {
  id: number;
  name: string;
  email: string;
  role: "applicant" | "employer";
} | null): MessagingActor | null {
  if (user?.role === "applicant") return getMessagingActor(user);
  if (user || !import.meta.env.DEV) return null;

  return {
    id: "demo-jamie-dela-cruz",
    name: "Jamie Dela Cruz",
    email: "jamie.delacruz@example.com",
    role: "applicant",
  };
}

export function getEmployerMessagingActor(user: {
  id: number;
  name: string;
  email: string;
  role: "applicant" | "employer";
} | null): MessagingActor | null {
  if (user?.role === "employer") return getMessagingActor(user);
  if (user) return null;

  const employer = employerRegistrationApi.getSnapshot();
  if (!employer) return null;
  return {
    id: employer.id,
    name: `${employer.firstName} ${employer.lastName}`.trim(),
    email: employer.workEmail,
    role: "employer",
    companyId: employer.id,
    companyName: employer.companyName,
    employerVerified: employer.status === "approved",
  };
}

export const messagingLimits = {
  employerConversationStartsPerDay: MAX_DAILY_CONVERSATIONS,
};

// TODO(backend): Enforce participant authorization on every read and write; client checks are only for mock behavior.
// TODO(backend): Scan uploaded attachments for malware and enforce server-side MIME/size limits.
// TODO(backend): Apply server-side per-employer conversation-start rate limits.

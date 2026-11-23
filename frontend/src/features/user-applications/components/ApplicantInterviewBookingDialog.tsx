import { useEffect, useState } from "react";
import InterviewAvailabilityCalendar from "@/features/interviews/InterviewAvailabilityCalendar";
import {
  applicantApplicationsApi,
  type ApplicantInterviewAvailability,
} from "@/features/user-applications/backendApi";
import { useAuth } from "@/features/auth/useAuth";

function formatTime(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return value;
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

export default function ApplicantInterviewBookingDialog({
  interviewId,
  isScheduled,
  onClose,
  onUpdated,
}: {
  interviewId: number;
  isScheduled: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { token } = useAuth();
  const [availability, setAvailability] = useState<ApplicantInterviewAvailability | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<"book" | "cancel" | null>(null);

  useEffect(() => {
    let active = true;
    async function loadAvailability() {
      if (!token) {
        setError("Your session has expired. Sign in again to manage your interview.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await applicantApplicationsApi.interviewAvailability(token, interviewId);
        if (!active) return;
        const available = response.data.dates.filter((item) => item.slots.length > 0);
        setAvailability(response.data);
        setSelectedDate(available[0]?.date ?? "");
        setSelectedTime(available[0]?.slots[0]?.start_time ?? "");
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load interview availability.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadAvailability();
    return () => { active = false; };
  }, [interviewId, token]);

  const selectedAvailability = availability?.dates.find((item) => item.date === selectedDate);
  const selectedSlot = selectedAvailability?.slots.find((slot) => slot.start_time === selectedTime);

  async function submitBooking() {
    if (!token || !selectedSlot) return;
    setIsSaving(true);
    setError(null);
    try {
      await applicantApplicationsApi.bookInterview(token, interviewId, selectedDate, selectedTime);
      onUpdated();
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to confirm this interview time.");
      setConfirmation(null);
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelInterview() {
    if (!token) return;
    setIsSaving(true);
    setError(null);
    try {
      await applicantApplicationsApi.cancelInterview(token, interviewId);
      onUpdated();
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to cancel this interview.");
      setConfirmation(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-[#132b2c]/45 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) onClose();
    }}>
      <section
        aria-labelledby="interview-booking-title"
        aria-modal="true"
        className="my-auto w-full max-w-xl rounded-2xl border border-[#e1ebea] bg-white shadow-[0_24px_70px_rgba(19,43,44,.24)]"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#e8efee] px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-[#263a3c]" id="interview-booking-title">
              {isScheduled ? "Reschedule interview" : "Choose an interview time"}
            </h2>
            <p className="mt-1 text-xs text-[#718184]">
              Select an available date and time. Times are shown in {availability?.timezone ?? "the employer’s time zone"}.
            </p>
          </div>
          <button type="button" aria-label="Close dialog" disabled={isSaving} onClick={onClose} className="rounded-full px-2 text-xl leading-8 text-[#718184] hover:bg-[#f1f8f7] disabled:opacity-50">×</button>
        </header>

        <div className="space-y-4 p-5">
          {error && <p className="rounded-lg border border-[#f1d2d3] bg-[#fff8f8] px-3 py-2 text-xs text-[#8d393e]" role="alert">{error}</p>}
          {isLoading ? (
            <p aria-live="polite" className="py-8 text-center text-sm text-[#718184]">Loading available interview times…</p>
          ) : availability ? (
            <>
              {(availability.listing_title || availability.company_name) && (
                <p className="rounded-lg bg-[#f3faf8] px-3 py-2 text-xs text-[#496264]">
                  {availability.listing_title}{availability.company_name ? ` · ${availability.company_name}` : ""}
                </p>
              )}
              <InterviewAvailabilityCalendar
                availableDates={availability.dates.filter((item) => item.slots.length > 0).map((item) => item.date)}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setSelectedTime("");
                  setConfirmation(null);
                }}
                restrictToAvailable
                selectedDates={selectedDate ? [selectedDate] : []}
                timezone={availability.timezone}
              />
              {selectedAvailability?.slots.length ? (
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold text-[#496264]">Available times</legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {selectedAvailability.slots.map((slot) => {
                      const selected = selectedTime === slot.start_time;
                      return (
                        <button
                          aria-pressed={selected}
                          className={`rounded-lg border px-3 py-2.5 text-xs font-semibold ${
                            selected
                              ? "border-[#0e8e9b] bg-[#e8f6f5] text-[#0e7e87]"
                              : "border-[#dfe9e7] text-[#526c6e] hover:bg-[#f4faf9]"
                          }`}
                          key={slot.start_time}
                          onClick={() => {
                            setSelectedTime(slot.start_time);
                            setConfirmation(null);
                          }}
                          type="button"
                        >
                          {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ) : (
                <p className="text-xs text-[#718184]">Choose a highlighted date to see its available time slots.</p>
              )}
              {availability.mode === "online" && availability.meeting_url ? (
                <p className="break-all text-xs text-[#647779]">Meeting link: {availability.meeting_url}</p>
              ) : availability.location ? (
                <p className="text-xs text-[#647779]">Location: {availability.location}</p>
              ) : null}
              {availability.meeting_instructions && (
                <p className="whitespace-pre-wrap text-xs leading-5 text-[#647779]">{availability.meeting_instructions}</p>
              )}
              {confirmation === "book" ? (
                <div className="rounded-lg border border-[#cfe7e2] bg-[#f3faf8] p-3" role="alert">
                  <p className="text-xs text-[#496264]">
                    Confirm {selectedSlot ? `${selectedDate} at ${formatTime(selectedSlot.start_time)} ${availability.timezone}` : "this interview time"}?
                    {isScheduled ? " Your current interview time will be replaced." : ""}
                  </p>
                  <div className="mt-3 flex justify-end gap-2">
                    <button type="button" onClick={() => setConfirmation(null)} disabled={isSaving} className="rounded-lg border border-[#dfe8e7] px-3 py-2 text-xs font-medium text-[#4a6467]">Back</button>
                    <button type="button" onClick={() => void submitBooking()} disabled={isSaving} className="rounded-lg bg-[#0e8e9b] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{isSaving ? "Confirming…" : "Confirm time"}</button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {confirmation === "cancel" && (
            <div className="rounded-lg border border-[#f1d2d3] bg-[#fff8f8] p-3" role="alert">
              <p className="text-xs text-[#8d393e]">Cancel this confirmed interview? The employer will be notified.</p>
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmation(null)} disabled={isSaving} className="rounded-lg border border-[#dfe8e7] px-3 py-2 text-xs font-medium text-[#4a6467]">Keep interview</button>
                <button type="button" onClick={() => void cancelInterview()} disabled={isSaving} className="rounded-lg bg-[#a7464b] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{isSaving ? "Cancelling…" : "Confirm cancellation"}</button>
              </div>
            </div>
          )}

          {!confirmation && (
            <footer className="flex flex-wrap justify-between gap-2 border-t border-[#e8efee] pt-4">
              {isScheduled ? (
                <button type="button" onClick={() => setConfirmation("cancel")} disabled={isSaving} className="rounded-lg border border-[#e8cfd0] px-3 py-2 text-xs font-semibold text-[#a7464b] hover:bg-[#fff8f8] disabled:opacity-60">Cancel interview</button>
              ) : <span />}
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg border border-[#dfe8e7] px-3 py-2 text-xs font-medium text-[#4a6467]">Close</button>
                <button type="button" onClick={() => setConfirmation("book")} disabled={isSaving || isLoading || !selectedSlot} className="rounded-lg bg-[#0e8e9b] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{isScheduled ? "Review reschedule" : "Review time"}</button>
              </div>
            </footer>
          )}
        </div>
      </section>
    </div>
  );
}

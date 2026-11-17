import { useState } from "react";
import ApplicantDialog from "@/features/employer-applicants/components/ApplicantDialog";
import type { InterviewDetails } from "@/features/employer-applicants/types";

type ScheduleInterviewDialogProps = {
  open: boolean;
  isSubmitting: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
  onSubmit: (details: InterviewDetails) => Promise<boolean>;
};

function getZonedDateTime(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

export default function ScheduleInterviewDialog({ open, isSubmitting, error, onRetry, onClose, onSubmit }: ScheduleInterviewDialogProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timezone, setTimezone] = useState("Asia/Manila");
  const [format, setFormat] = useState<InterviewDetails["format"]>("online");
  const [locationOrLink, setLocationOrLink] = useState("");
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nowInTimezone = getZonedDateTime(timezone);
    if (date < nowInTimezone.date || (date === nowInTimezone.date && time <= nowInTimezone.time)) {
      setValidationError("Choose a date and time in the future.");
      return;
    }
    setValidationError(null);
    const submitted = await onSubmit({
      date,
      time,
      timezone,
      format,
      locationOrLink: locationOrLink.trim(),
      ...(message.trim() ? { message: message.trim() } : {}),
    });
    if (submitted) onClose();
  }

  return (
    <ApplicantDialog open={open} title="Schedule interview" error={error} onRetry={onRetry} isRetrying={isSubmitting} onClose={onClose}>
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-[#496264]">
            Date
            <input data-dialog-initial type="date" min={getZonedDateTime(timezone).date} required value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#d7e6e5] px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]" />
          </label>
          <label className="block text-xs font-medium text-[#496264]">
            Time
            <input type="time" required value={time} onChange={(event) => setTime(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#d7e6e5] px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]" />
          </label>
        </div>
        <label className="block text-xs font-medium text-[#496264]">
          Time zone
          <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#d7e6e5] bg-white px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]">
            <option value="Asia/Manila">Philippine Time (Asia/Manila)</option>
            <option value="Asia/Singapore">Singapore Time (Asia/Singapore)</option>
            <option value="UTC">UTC</option>
          </select>
        </label>
        <fieldset>
          <legend className="text-xs font-medium text-[#496264]">Format</legend>
          <div className="mt-2 flex gap-2">
            {(["online", "onsite"] as const).map((value) => (
              <label key={value} className={`flex-1 cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm ${format === value ? "border-[#78b9b8] bg-[#f0f8f7] text-[#176d73]" : "border-[#dfe9e7] text-[#526c6e]"}`}>
                <input className="sr-only" type="radio" name="interview-format" value={value} checked={format === value} onChange={() => setFormat(value)} />
                {value === "online" ? "Online link" : "On-site"}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-xs font-medium text-[#496264]">
          {format === "online" ? "Meeting link" : "On-site address"}
          <input required value={locationOrLink} onChange={(event) => setLocationOrLink(event.target.value)} placeholder={format === "online" ? "https://..." : "Office address"} className="mt-1.5 w-full rounded-lg border border-[#d7e6e5] px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]" />
        </label>
        <label className="block text-xs font-medium text-[#496264]">
          Message <span className="font-normal text-[#829293]">(optional)</span>
          <textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add a note for the applicant" className="mt-1.5 w-full resize-y rounded-lg border border-[#d7e6e5] px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]" />
        </label>
        <p className="rounded-md bg-[#f1f8f7] px-3 py-2 text-xs text-[#507174]">Applicant will be notified when this interview is scheduled.</p>
        {validationError ? <p className="text-xs text-[#b85054]" role="alert">{validationError}</p> : null}
        <div className="flex justify-end gap-2 border-t border-[#e7efee] pt-4">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-[#dfe8e7] px-3 py-2 text-sm font-medium text-[#4a6467] disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#0e8e9b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSubmitting ? "Scheduling..." : "Schedule interview"}</button>
        </div>
      </form>
    </ApplicantDialog>
  );
}
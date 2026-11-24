import { useState } from "react";
import ApplicantDialog from "@/features/employer-applicants/components/ApplicantDialog";
import InterviewAvailabilityCalendar from "@/features/interviews/InterviewAvailabilityCalendar";
import type { InterviewAvailabilityDetails } from "@/features/employer-applicants/types";
import LocationSelector from "@/features/locations/LocationSelector";
import { formatPhilippineAddressLabel } from "@/features/locations/api";
import { emptyPhilippineAddress } from "@/features/locations/types";

type ScheduleInterviewDialogProps = {
  open: boolean;
  isSubmitting: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
  initialAvailability?: InterviewAvailabilityDetails;
  isReinvite?: boolean;
  onSubmit: (details: InterviewAvailabilityDetails) => Promise<boolean>;
};

const supportedTimezones = typeof Intl.supportedValuesOf === "function"
  ? Intl.supportedValuesOf("timeZone")
  : [Intl.DateTimeFormat().resolvedOptions().timeZone];
const timezones = ["UTC", ...supportedTimezones.filter((timezone) => timezone !== "UTC")];

function todayInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default function ScheduleInterviewDialog({
  open,
  isSubmitting,
  error,
  onRetry,
  onClose,
  initialAvailability,
  isReinvite = false,
  onSubmit,
}: ScheduleInterviewDialogProps) {
  const initialTimezone = initialAvailability?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  const [dates, setDates] = useState<string[]>(() =>
    (initialAvailability?.dates ?? []).filter((date) => date >= todayInTimezone(initialTimezone)),
  );
  const [startTime, setStartTime] = useState(() => initialAvailability?.startTime ?? "10:00");
  const [endTime, setEndTime] = useState(() => initialAvailability?.endTime ?? "17:00");
  const [hasBreak, setHasBreak] = useState(() => Boolean(initialAvailability?.breakStartTime));
  const [breakStartTime, setBreakStartTime] = useState(() => initialAvailability?.breakStartTime ?? "12:00");
  const [breakEndTime, setBreakEndTime] = useState(() => initialAvailability?.breakEndTime ?? "13:00");
  const [durationMinutes, setDurationMinutes] = useState(() => initialAvailability?.durationMinutes ?? 30);
  const [bufferMinutes, setBufferMinutes] = useState(() => initialAvailability?.bufferMinutes ?? 0);
  const [timezone, setTimezone] = useState(() => initialTimezone);
  const [format, setFormat] = useState<InterviewAvailabilityDetails["format"]>(
    () => initialAvailability?.format ?? "online",
  );
  const [locationOrLink, setLocationOrLink] = useState(() => initialAvailability?.locationOrLink ?? "");
  const [locationAddress, setLocationAddress] = useState(
    () => initialAvailability?.locationAddress ?? emptyPhilippineAddress(),
  );
  const [message, setMessage] = useState(() => initialAvailability?.message ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  function toggleDate(date: string) {
    setDates((selected) => selected.includes(date)
      ? selected.filter((item) => item !== date)
      : [...selected, date].sort());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dates.length === 0) {
      setValidationError("Select at least one available date.");
      return;
    }
    if (startTime >= endTime) {
      setValidationError("The end time must be after the start time.");
      return;
    }
    if (hasBreak && (breakStartTime >= breakEndTime || breakStartTime < startTime || breakEndTime > endTime)) {
      setValidationError("The break must be inside working hours and end after it starts.");
      return;
    }
    if (format === "onsite" && (!locationAddress.region_code
      || !locationAddress.city_municipality_code
      || !locationAddress.barangay_code
      || !locationAddress.street_address?.trim())) {
      setValidationError("Select the onsite location, barangay, and street address.");
      return;
    }
    setValidationError(null);
    const submitted = await onSubmit({
      dates,
      startTime,
      endTime,
      breakStartTime: hasBreak ? breakStartTime : null,
      breakEndTime: hasBreak ? breakEndTime : null,
      durationMinutes,
      bufferMinutes,
      timezone,
      format,
      locationOrLink: format === "onsite"
        ? formatPhilippineAddressLabel(locationAddress)
        : locationOrLink.trim(),
      ...(format === "onsite" ? { locationAddress } : {}),
      ...(message.trim() ? { message: message.trim() } : {}),
    });
    if (submitted) onClose();
  }

  return (
    <ApplicantDialog open={open} title={isReinvite ? "Invite applicant to schedule again" : initialAvailability ? "Edit interview availability" : "Invite applicant to schedule"} error={error} onRetry={onRetry} isRetrying={isSubmitting} onClose={onClose}>
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        {validationError ? <p className="rounded-lg border border-[#f1d2d3] bg-[#fff8f8] px-3 py-2 text-xs text-[#8d393e]" role="alert">{validationError}</p> : null}
        <div>
          <p className="mb-2 text-xs font-medium text-[#496264]">Select available interview dates</p>
          <InterviewAvailabilityCalendar
            onSelectDate={toggleDate}
            selectedDates={dates}
            timezone={timezone}
          />
          <p className="mt-2 text-[11px] text-[#718586]">
            {dates.length} date{dates.length === 1 ? "" : "s"} selected. The same hours and slot settings apply to each.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-[#496264]">
            Available from
            <input data-dialog-initial type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#d7e6e5] px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]" />
          </label>
          <label className="block text-xs font-medium text-[#496264]">
            Available until
            <input type="time" required value={endTime} onChange={(event) => setEndTime(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#d7e6e5] px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]" />
          </label>
          <label className="block text-xs font-medium text-[#496264]">
            Time zone
            <select disabled={Boolean(initialAvailability)} value={timezone} onChange={(event) => setTimezone(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#d7e6e5] bg-white px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8] disabled:bg-[#f4f7f6] disabled:text-[#849394]">
              {timezones.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-[#496264]">
            Interview duration
            <select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-[#d7e6e5] bg-white px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]">
              {[15, 30, 45, 60, 90, 120].map((value) => <option key={value} value={value}>{value} minutes</option>)}
            </select>
          </label>
        </div>
        <div className="rounded-lg border border-[#e4edeb] p-3">
          <label className="flex items-center gap-2 text-xs font-medium text-[#496264]">
            <input checked={hasBreak} onChange={(event) => setHasBreak(event.target.checked)} type="checkbox" />
            Exclude a break from interview slots
          </label>
          {hasBreak && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-[#496264]">
                Break starts
                <input type="time" required value={breakStartTime} onChange={(event) => setBreakStartTime(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#d7e6e5] px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]" />
              </label>
              <label className="block text-xs font-medium text-[#496264]">
                Break ends
                <input type="time" required value={breakEndTime} onChange={(event) => setBreakEndTime(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#d7e6e5] px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]" />
              </label>
            </div>
          )}
        </div>
        <label className="block text-xs font-medium text-[#496264]">
          Buffer between interviews
          <select value={bufferMinutes} onChange={(event) => setBufferMinutes(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-[#d7e6e5] bg-white px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]">
            {[0, 5, 10, 15, 30].map((value) => <option key={value} value={value}>{value === 0 ? "No buffer" : `${value} minutes`}</option>)}
          </select>
        </label>
        <fieldset>
          <legend className="text-xs font-medium text-[#496264]">Interview format</legend>
          <div className="mt-2 flex gap-2">
            {(["online", "onsite", "phone"] as const).map((value) => (
              <label key={value} className={`flex-1 cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm ${format === value ? "border-[#78b9b8] bg-[#f0f8f7] text-[#176d73]" : "border-[#dfe9e7] text-[#526c6e]"}`}>
                <input className="sr-only" type="radio" name="interview-format" value={value} checked={format === value} onChange={() => setFormat(value)} />
                {value === "online" ? "Online" : value === "onsite" ? "On-site" : "Phone"}
              </label>
            ))}
          </div>
        </fieldset>
        {format === "onsite" ? (
          <LocationSelector
            legacyLocation={initialAvailability?.locationOrLink}
            onChange={setLocationAddress}
            requireBarangay
            requireStreetAddress
            required
            title="On-site address"
            value={locationAddress}
          />
        ) : format === "online" ? (
          <label className="block text-xs font-medium text-[#496264]">
            Meeting link or instructions
            <input required type="url" value={locationOrLink} onChange={(event) => setLocationOrLink(event.target.value)} placeholder="https://..." className="mt-1.5 w-full rounded-lg border border-[#d7e6e5] px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]" />
          </label>
        ) : null}
        <label className="block text-xs font-medium text-[#496264]">
          Applicant instructions <span className="font-normal text-[#829293]">(optional)</span>
          <textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add a note for the applicant" className="mt-1.5 w-full resize-y rounded-lg border border-[#d7e6e5] px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]" />
        </label>
        <p className="rounded-md bg-[#f1f8f7] px-3 py-2 text-xs text-[#507174]">The applicant will choose a slot from these dates. Confirmed interviews are not removed if you later edit availability.</p>
        {validationError ? <p className="text-xs text-[#b85054]" role="alert">{validationError}</p> : null}
        <div className="flex justify-end gap-2 border-t border-[#e7efee] pt-4">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-[#dfe8e7] px-3 py-2 text-sm font-medium text-[#4a6467] disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={isSubmitting || dates.length === 0} className="rounded-lg bg-[#0e8e9b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSubmitting ? "Publishing..." : isReinvite ? "Send new invitation" : initialAvailability ? "Save availability" : "Invite to schedule"}</button>
        </div>
      </form>
    </ApplicantDialog>
  );
}
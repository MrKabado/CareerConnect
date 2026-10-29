import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { employerRegistrationApi } from "@/features/employer-registration/api";
import { validateEmployerRegistration } from "@/features/employer-registration/schemas";
import type { EmployerRegistrationInput } from "@/features/employer-registration/types";

const initialForm: EmployerRegistrationInput = {
  firstName: "",
  lastName: "",
  workEmail: "",
  password: "",
  companyName: "",
  website: "",
  companySize: "",
  industry: "",
  companyRole: "",
  termsAccepted: false,
};

const companySizes = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
];

const industries = [
  "Technology",
  "Financial services",
  "Healthcare",
  "Education",
  "Retail and commerce",
  "Manufacturing",
  "Media and entertainment",
  "Professional services",
  "Other",
];

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-[10px] font-semibold text-[#354749]">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-[9px] text-[#b34b4b]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClassName =
  "h-10 w-full rounded-lg border border-[#dfe8e8] bg-white px-3 text-[11px] text-[#354749] outline-none placeholder:text-[#a0acad] focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10";

export default function EmployerRegistrationForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<Key extends keyof EmployerRegistrationInput>(
    field: Key,
    value: EmployerRegistrationInput[Key],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    const validationErrors = validateEmployerRegistration(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await employerRegistrationApi.register(form);
      navigate("/employer/verify-email", { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to create your account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-dvh grid-cols-[minmax(300px,0.8fr)_minmax(520px,1.2fr)] bg-[#f5f8f8] font-sans text-[#263a3c] max-[900px]:grid-cols-1">
      <aside className="relative flex min-h-[760px] flex-col justify-end overflow-hidden bg-[#253b3c] bg-cover bg-center px-8 py-9 text-white max-[900px]:hidden" style={{ backgroundImage: "linear-gradient(180deg,rgba(17,34,36,0.04) 20%,rgba(17,34,36,0.88) 100%),url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=85')" }}>
        <div className="relative z-10 max-w-[410px]">
          <span className="inline-flex rounded-full bg-[#fff3df] px-2.5 py-1 text-[9px] font-semibold text-[#98712d]">
            Built for growing teams
          </span>
          <h1 className="mt-4 text-[32px] font-bold leading-[1.12] text-white">
            Meet the people who will move your company forward.
          </h1>
          <p className="mt-3 text-[13px] leading-6 text-white/80">
            Publish jobs and OJT opportunities, review applicants, and keep every hiring decision in one place.
          </p>
          <ul className="mt-6 space-y-3 text-[10px] font-medium text-white/90">
            <li>✓ Create job and OJT listings</li>
            <li>✓ Track candidates through every hiring stage</li>
            <li>✓ Build a trusted company presence</li>
          </ul>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[#e7eeee] bg-white px-8 max-[520px]:px-4">
          <Link className="inline-flex items-center gap-2 text-[14px] font-bold text-[#263a3c]" to="/">
            <span className="grid size-7 place-items-center rounded-lg bg-[#078b8d] text-white">C</span>
            <span>Career<span className="text-[#078b8d]">Connect</span></span>
          </Link>
          <p className="text-[9px] text-[#829092]">
            Already have an employer account?{" "}
            <Link className="font-semibold text-[#078b8d] hover:underline" to="/login">
              Sign in
            </Link>
          </p>
        </header>

        <section className="mx-auto w-full max-w-[660px] flex-1 px-10 py-8 max-[600px]:px-4 max-[600px]:py-6">
          <span className="inline-flex rounded-full bg-[#e5f4f2] px-2.5 py-1 text-[9px] font-semibold text-[#32817e]">
            Employer account
          </span>
          <h2 className="mt-3 text-[25px] font-bold tracking-[-0.5px] text-[#293d3e] max-[520px]:text-[22px]">
            Start hiring with CareerConnect
          </h2>
          <p className="mt-1.5 text-[11px] leading-5 text-[#829092]">
            Tell us about you and your company. You can complete your employer profile after creating your account.
          </p>

          <form
            className="mt-5 space-y-5 rounded-[14px] border border-[#e7eeee] bg-white p-5 shadow-[0_6px_20px_rgba(32,67,65,0.045)] max-[520px]:p-4"
            noValidate
            onSubmit={submit}
          >
            <section aria-labelledby="employer-person-heading">
              <h3 className="sr-only" id="employer-person-heading">Your details</h3>
              <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
                <Field error={errors.firstName} label="First name *">
                  <input autoComplete="given-name" className={inputClassName} onChange={(event) => update("firstName", event.target.value)} placeholder="e.g. Mika" value={form.firstName} />
                </Field>
                <Field error={errors.lastName} label="Last name *">
                  <input autoComplete="family-name" className={inputClassName} onChange={(event) => update("lastName", event.target.value)} placeholder="e.g. Santos" value={form.lastName} />
                </Field>
              </div>
              <div className="mt-3">
                <Field error={errors.workEmail} label="Work email *">
                  <input autoComplete="email" className={inputClassName} onChange={(event) => update("workEmail", event.target.value)} placeholder="you@company.com" type="email" value={form.workEmail} />
                </Field>
              </div>
              <div className="mt-3">
                <Field error={errors.password} label="Password *">
                  <input autoComplete="new-password" className={inputClassName} minLength={8} onChange={(event) => update("password", event.target.value)} placeholder="Create a secure password" type="password" value={form.password} />
                </Field>
                <p className="mt-1 text-right text-[8px] text-[#9aa6a7]">At least 8 characters</p>
              </div>
            </section>

            <section aria-labelledby="employer-company-heading" className="border-t border-[#edf1f1] pt-4">
              <h3 className="text-[12px] font-bold text-[#354749]" id="employer-company-heading">Company details</h3>
              <p className="mt-1 text-[9px] text-[#829092]">These details help applicants recognize your organization.</p>
              <div className="mt-3 grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
                <Field error={errors.companyName} label="Company name *">
                  <input autoComplete="organization" className={inputClassName} onChange={(event) => update("companyName", event.target.value)} placeholder="e.g. Acme Philippines" value={form.companyName} />
                </Field>
                <Field error={errors.website} label="Company website">
                  <input autoComplete="url" className={inputClassName} onChange={(event) => update("website", event.target.value)} placeholder="https://company.com" type="url" value={form.website} />
                </Field>
                <Field error={errors.companySize} label="Company size *">
                  <select className={inputClassName} onChange={(event) => update("companySize", event.target.value)} value={form.companySize}>
                    <option value="">Select size</option>
                    {companySizes.map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                </Field>
                <Field error={errors.industry} label="Industry *">
                  <select className={inputClassName} onChange={(event) => update("industry", event.target.value)} value={form.industry}>
                    <option value="">Select industry</option>
                    {industries.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
                  </select>
                </Field>
              </div>
              <div className="mt-3">
                <Field error={errors.companyRole} label="Your role at the company *">
                  <input autoComplete="organization-title" className={inputClassName} onChange={(event) => update("companyRole", event.target.value)} placeholder="e.g. HR Manager, Founder, Recruiter" value={form.companyRole} />
                </Field>
              </div>
            </section>

            <div>
              <label className="flex items-start gap-2 text-[9px] leading-4 text-[#718082]">
                <input checked={form.termsAccepted} className="mt-0.5 size-3.5 accent-[#078b8d]" onChange={(event) => update("termsAccepted", event.target.checked)} type="checkbox" />
                <span>I agree to the Terms of Service, Privacy Policy, and Employer Guidelines.</span>
              </label>
              {errors.termsAccepted && <p className="mt-1 text-[9px] text-[#b34b4b]" role="alert">{errors.termsAccepted}</p>}
            </div>

            {submitError && <p className="text-[10px] text-[#b34b4b]" role="alert">{submitError}</p>}
            <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#078b8d] text-[11px] font-semibold text-white shadow-[0_4px_12px_rgba(0,128,139,0.18)] hover:bg-[#007985] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating account…" : "Continue"}
            </button>
            <p className="text-center text-[8px] text-[#9aa6a7]">We may verify your company details before your first listing is published.</p>
          </form>
        </section>
      </div>
    </main>
  );
}
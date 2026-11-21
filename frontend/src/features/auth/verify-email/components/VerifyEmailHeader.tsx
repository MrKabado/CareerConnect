export function VerifyEmailHeader({
  codeRequested,
  email,
}: {
  codeRequested: boolean;
  email: string;
}) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#078b8d]">
        CareerConnect
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-[-0.6px]">
        Verify your email
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#718082]">
        {codeRequested
          ? `Enter the six-digit verification code sent to ${email}, if the account needs verification.`
          : "Check your inbox for the six-digit code sent when you registered. If it hasn’t arrived, request another code below."}
      </p>
    </>
  );
}

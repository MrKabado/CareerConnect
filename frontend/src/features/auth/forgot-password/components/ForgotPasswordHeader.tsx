export function ForgotPasswordHeader({
  codeRequested,
  email,
}: {
  codeRequested: boolean;
  email: string;
}) {
  return (
    <header className="mb-7 max-[760px]:mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#078b8d]">
        CareerConnect
      </p>
      <h2 className="mt-4 text-[30px] leading-tight font-semibold tracking-[-1px] text-[#263538] max-[760px]:text-[21px]">
        Reset your password
      </h2>
      <p className="mt-2 text-[13px] leading-[1.6] text-[#748184] max-[760px]:mt-1 max-[760px]:text-[11px]">
        {codeRequested
          ? `Enter the verification code sent to ${email}, then choose a new password.`
          : "Enter your account email and we’ll send a password reset code if it’s eligible."}
      </p>
    </header>
  );
}

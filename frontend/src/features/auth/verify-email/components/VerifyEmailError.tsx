export function VerifyEmailError({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return (
    <p className="mt-4 text-sm text-red-700" role="alert">
      {error}
    </p>
  );
}

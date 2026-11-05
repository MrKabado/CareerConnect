import { Link } from "react-router";

export function BackToSignInLink() {
  return (
    <p className="mt-6 text-center text-[12px] text-[#718082] max-[760px]:text-[10px]">
      Remembered it?{" "}
      <Link
        className="font-semibold text-[#078b8d] underline decoration-[#078b8d]/40 underline-offset-2 hover:text-[#066f72]"
        to="/login"
      >
        Back to sign in
      </Link>
    </p>
  );
}

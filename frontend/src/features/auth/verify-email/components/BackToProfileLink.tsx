import { Link } from "react-router";

export function BackToProfileLink() {
  return (
    <p className="mt-6 text-center text-sm text-[#718082]">
      <Link className="font-semibold text-[#078b8d] hover:underline" to="/profile">
        Back to profile
      </Link>
    </p>
  );
}

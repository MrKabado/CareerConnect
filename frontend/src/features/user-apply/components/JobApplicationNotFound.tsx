import { Link } from "react-router";
import ApplicationLayout from "@/features/user-apply/components/ApplicationLayout";

type JobApplicationNotFoundProps = {
  returnPath: string;
};

export default function JobApplicationNotFound({ returnPath }: JobApplicationNotFoundProps) {
  return (
    <ApplicationLayout>
      <div className="mx-auto flex min-h-110 max-w-162.5 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[23px] font-bold text-[#263a3c]">Job opportunity not found</h1>
        <p className="mt-2 text-[12px] text-[#7d8c8d]">
          This listing may have expired or is no longer available.
        </p>
        <Link
          className="mt-5 rounded-lg bg-[#078b98] px-4 py-2.5 text-[11px] font-semibold text-white"
          to={returnPath}
        >
          Back to opportunity search
        </Link>
      </div>
    </ApplicationLayout>
  );
}

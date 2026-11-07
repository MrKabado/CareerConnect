import { EmailVerificationNotice } from "@/components/common/user/recommendationComponents";

type UserRecommendationsHeroProps = {
  firstName: string;
  noticeDismissed: boolean;
  setNoticeDismissed: (value: boolean) => void;
  verificationEmail: string;
};

export default function UserRecommendationsHero({
  firstName,
  noticeDismissed,
  setNoticeDismissed,
  verificationEmail,
}: UserRecommendationsHeroProps) {
  return (
    <>
      <section className="border-b border-[#deeeeb] bg-[radial-gradient(ellipse_at_77%_0%,rgba(194,236,228,0.56),transparent_44%),linear-gradient(112deg,#f0faf8_0%,#e8f7f4_53%,#e4f5f2_100%)] px-10 pt-9 pb-8 max-[920px]:px-6 max-[680px]:px-4 max-[680px]:pt-6">
        <div className="mx-auto max-w-[1136px]">
          {verificationEmail && !noticeDismissed && (
            <EmailVerificationNotice
              email={verificationEmail}
              onDismiss={() => setNoticeDismissed(true)}
            />
          )}

          <section>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f4f1] px-2.5 py-1 text-[12px] font-semibold text-[#25827e]">
                <span aria-hidden="true">✦</span>
                Personalized for you
              </span>
              <h1 className="mt-2.5 text-[28px] font-bold leading-tight tracking-[-0.8px] text-[#293d3e] max-[680px]:text-[24px]">
                Good day, {firstName}
              </h1>
              <p className="mt-1.5 text-[12px] text-[#7b8b8d]">
                Fresh opportunities matched to your goals, skills, and preferred
                work setup.
              </p>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}

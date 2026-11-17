type ProgressBarProps = {
  currentStep: number;
  totalSteps: number;
};

export default function ProgressBar({
  currentStep,
  totalSteps,
}: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div
      aria-label={`Step ${currentStep} of ${totalSteps}`}
      className="w-full"
      role="group"
    >
      <div className="mb-2 flex items-center justify-between text-xs text-[#738285]">
        <span>
          Step {currentStep} of {totalSteps}
        </span>
        <span>{Math.round(progress)}% complete</span>
      </div>
      <div
        aria-valuemax={totalSteps}
        aria-valuemin={0}
        aria-valuenow={currentStep}
        className="h-1.5 overflow-hidden rounded-full bg-[#e6eeee]"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-[#078b8d] transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

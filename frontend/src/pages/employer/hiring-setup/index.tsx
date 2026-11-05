import HiringSetupForm from "@/features/employer-hiring-setup/components/HiringSetupForm";
import { useHiringSetup } from "@/features/employer-hiring-setup/hooks/useHiringSetup";

export default function EmployerHiringSetupPage() {
  const { draft, updateField, handleSave, handleCancel } = useHiringSetup();

  return <HiringSetupForm draft={draft} onFieldChange={updateField} onSave={handleSave} onCancel={handleCancel} />;
}

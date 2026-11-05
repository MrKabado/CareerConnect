import UserRecommendationsPageContent from "@/features/user-recommendations/components/UserRecommendationsPageContent";
import { useUserRecommendations } from "@/features/user-recommendations/hooks/useUserRecommendations";

export default function RecommendationsPage() {
  const recommendations = useUserRecommendations();

  return <UserRecommendationsPageContent {...recommendations} />;
}

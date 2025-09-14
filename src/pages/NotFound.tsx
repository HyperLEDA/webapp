import { useNavigate } from "react-router-dom";
import { ErrorPage, ErrorPageHomeButton } from "../components/ui/error-page";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <ErrorPage
      title="Page Not Found"
      message="The page you're looking for doesn't exist or has been moved."
      showLargeText={true}
    >
      <ErrorPageHomeButton onClick={() => navigate("/")} />
    </ErrorPage>
  );
}

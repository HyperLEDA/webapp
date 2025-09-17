import { useNavigate } from "react-router-dom";
import { ErrorPage } from "../components/ui/error-page";
import { Button } from "../components/ui/button";
import { useEffect } from "react";

export function NotFoundPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `404 | HyperLEDA`;
  }, []);

  return (
    <ErrorPage
      title="Page Not Found"
      message="The page you're looking for doesn't exist or has been moved."
      showLargeText={true}
    >
      <Button onClick={() => navigate("/")} className="px-6 py-3 text-base">
        Go to homepage
      </Button>
    </ErrorPage>
  );
}

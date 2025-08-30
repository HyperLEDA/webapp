import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold">404</h1>
          <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
          <p className="text-gray-400 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex justify-center">
          <Button onClick={() => navigate("/")} className="px-6 py-3 text-base">
            Go Back Home
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "wasp/client/auth";

export function LandingRedirectPage() {
  const { data: user, isSuccess } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSuccess) {
      if (user) {
        navigate("/dashboard");
      } else {
        navigate("/login");
      }
    }
  }, [user, isSuccess, navigate]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="text-muted-foreground animate-pulse text-sm">Redirection...</div>
    </div>
  );
}

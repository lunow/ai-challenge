import { useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", search: { returnTo: loc.pathname }, replace: true });
    }
  }, [user, loading, navigate, loc.pathname]);

  if (loading || !user) {
    return (
      <div className="container mx-auto px-4 py-16 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  return <>{children}</>;
}

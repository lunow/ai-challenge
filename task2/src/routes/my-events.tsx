import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/my-events")({
  component: () => (
    <RequireAuth>
      <MyEventsPage />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "My events — Localhost" }] }),
});

function MyEventsPage() {
  const { user } = useAuth();

  const { data: events, isLoading } = useQuery({
    queryKey: ["my-events", user!.id],
    queryFn: async () => {
      const { data: hostIds } = await supabase
        .from("host_members")
        .select("host_id")
        .eq("user_id", user!.id);
      const ids = (hostIds ?? []).map((m) => m.host_id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("events")
        .select("*, hosts!inner(id, name, slug, logo_url)")
        .in("host_id", ids)
        .order("start_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Events</h1>
          <p className="text-muted-foreground mt-1">Events you organize.</p>
        </div>
        <Button asChild>
          <Link to="/dashboard"><Plus className="h-4 w-4 mr-2" />New event</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : (events?.length ?? 0) === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">You haven't created any events yet.</p>
          <Button className="mt-4" asChild><Link to="/dashboard">Go to dashboard</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events!.map((e: any) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

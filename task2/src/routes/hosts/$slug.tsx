import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EventCard } from "@/components/EventCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/hosts/$slug")({
  component: HostPage,
});

function HostPage() {
  const { slug } = Route.useParams();

  const { data: host, isLoading } = useQuery({
    queryKey: ["host", slug],
    queryFn: async () => {
      const { data } = await supabase.from("hosts").select("*").eq("slug", slug).maybeSingle();
      return data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ["host-events", host?.id],
    enabled: !!host,
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*, hosts!inner(id, name, slug, logo_url)")
        .eq("host_id", host!.id)
        .eq("status", "published")
        .order("start_at", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }
  if (!host) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Host not found</h1>
        <Button asChild className="mt-4"><Link to="/explore">Back to explore</Link></Button>
      </div>
    );
  }

  const now = new Date();
  const upcoming = (events ?? []).filter((e: any) => new Date(e.start_at) >= now);
  const past = (events ?? []).filter((e: any) => new Date(e.start_at) < now);

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 rounded-2xl border bg-card shadow-card mb-10">
        <Avatar className="h-20 w-20">
          <AvatarImage src={host.logo_url ?? undefined} />
          <AvatarFallback className="text-2xl">{host.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">{host.name}</h1>
          {host.bio && <p className="text-muted-foreground mt-2 max-w-2xl">{host.bio}</p>}
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Upcoming events</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground">No upcoming events from this host.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcoming.map((e: any) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Past events</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {past.map((e: any) => <EventCard key={e.id} event={e} />)}
          </div>
        </section>
      )}
    </div>
  );
}

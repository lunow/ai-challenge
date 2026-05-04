import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "@/components/EventCard";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Localhost — Discover and host community events" },
      { name: "description", content: "Find local events, RSVP in seconds, and get a QR ticket. Organizers can publish events and check attendees in." },
    ],
  }),
});

function HomePage() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["home-upcoming"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*, hosts!inner(id, name, slug, logo_url)")
        .eq("status", "published")
        .eq("visibility", "public")
        .gt("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(6);
      return data ?? [];
    },
  });

  return (
    <div>
      <section className="bg-gradient-subtle border-b">
        <div className="container mx-auto px-4 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl mx-auto">
            Localhost —{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">where every idea starts</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Reclaimed as a place for real-world gatherings. RSVP in seconds, get a QR ticket, and breeze through check-in. Powerful dashboards free for organizers.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/explore">Explore Events</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/profile">Host an Event</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Upcoming events</h2>
            <p className="text-muted-foreground mt-1">Hand-picked happenings, soonest first.</p>
          </div>
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to="/explore">Browse all →</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        ) : (events?.length ?? 0) === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center">
            <p className="text-muted-foreground">No upcoming events yet. Be the first to host one!</p>
            <Button className="mt-4" asChild><Link to="/profile">Host an Event</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events!.map((e: any) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

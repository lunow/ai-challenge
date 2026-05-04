import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "@/components/EventCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
  head: () => ({
    meta: [
      { title: "Explore events — Localhost" },
      { name: "description", content: "Browse upcoming community events near you and across the world." },
    ],
  }),
});

function ExplorePage() {
  const [query, setQuery] = useState("");
  const [includePast, setIncludePast] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["explore", query, includePast],
    queryFn: async () => {
      let q = supabase
        .from("events")
        .select("*, hosts!inner(id, name, slug, logo_url)")
        .eq("status", "published")
        .eq("visibility", "public");
      if (!includePast) q = q.gt("start_at", new Date().toISOString());
      if (query.trim()) q = q.ilike("title", `%${query.trim()}%`);
      q = q.order("start_at", { ascending: true }).limit(60);
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">Explore events</h1>
        <p className="text-muted-foreground mt-2">
          Discover upcoming gatherings from hosts around the world.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="include-past" checked={includePast} onCheckedChange={setIncludePast} />
          <Label htmlFor="include-past" className="cursor-pointer">
            Include past events
          </Label>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : (events?.length ?? 0) === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">No events match your filters.</p>
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

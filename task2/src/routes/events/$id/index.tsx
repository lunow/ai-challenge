import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, MapPin, Users, ExternalLink, Download, Edit, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtRangeInTz, buildIcs, googleCalUrl, downloadFile, makeTicketCode } from "@/lib/format";

export const Route = createFileRoute("/events/$id/")({
  component: EventDetailPage,
});

function EventDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, hosts!inner(id, name, slug, logo_url, bio)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["event-counts", id],
    enabled: !!event,
    queryFn: async () => {
      const { count: confirmed } = await supabase
        .from("rsvps")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "confirmed");
      const { count: waitlisted } = await supabase
        .from("rsvps")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "waitlisted");
      return { confirmed: confirmed ?? 0, waitlisted: waitlisted ?? 0 };
    },
  });

  const { data: myRsvp } = useQuery({
    queryKey: ["my-rsvp", id, user?.id],
    enabled: !!user && !!event,
    queryFn: async () => {
      const { data } = await supabase
        .from("rsvps")
        .select("*")
        .eq("event_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: isTeam } = useQuery({
    queryKey: ["is-team", event?.host_id, user?.id],
    enabled: !!user && !!event,
    queryFn: async () => {
      const { data } = await supabase
        .from("host_members")
        .select("role")
        .eq("host_id", event!.host_id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const rsvp = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to RSVP");
      const slotsLeft = (event!.capacity ?? 0) - (counts?.confirmed ?? 0);
      const status = slotsLeft > 0 ? "confirmed" : "waitlisted";
      const waitlist_position = status === "waitlisted" ? (counts?.waitlisted ?? 0) + 1 : null;
      const { data: r, error } = await supabase
        .from("rsvps")
        .insert({ event_id: id, user_id: user.id, status, waitlist_position })
        .select()
        .single();
      if (error) throw error;
      if (status === "confirmed") {
        const { error: tErr } = await supabase
          .from("tickets")
          .insert({ event_id: id, user_id: user.id, rsvp_id: r.id, code: makeTicketCode() });
        if (tErr) throw tErr;
      }
      return status;
    },
    onSuccess: (status) => {
      toast.success(status === "confirmed" ? "You're in! Check My Tickets." : "Added to waitlist.");
      qc.invalidateQueries({ queryKey: ["my-rsvp", id] });
      qc.invalidateQueries({ queryKey: ["event-counts", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      if (!myRsvp) return;
      // Delete tickets first then rsvp
      await supabase.from("tickets").delete().eq("rsvp_id", myRsvp.id);
      const { error } = await supabase.from("rsvps").delete().eq("id", myRsvp.id);
      if (error) throw error;
      // Try to promote waitlist via server function (best-effort)
      try {
        const { promoteWaitlist } = await import("@/server/events.functions");
        await promoteWaitlist({ data: { eventId: id } });
      } catch {
        // ignore — server function may not be reachable in some envs
      }
    },
    onSuccess: () => {
      toast.success("RSVP cancelled.");
      qc.invalidateQueries({ queryKey: ["my-rsvp", id] });
      qc.invalidateQueries({ queryKey: ["event-counts", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <Skeleton className="h-72 w-full rounded-xl mb-8" />
        <Skeleton className="h-10 w-2/3 mb-4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <Button asChild className="mt-4"><Link to="/explore">Browse events</Link></Button>
      </div>
    );
  }

  const ended = new Date(event.end_at) < new Date();
  const slotsLeft = (event.capacity ?? 0) - (counts?.confirmed ?? 0);
  const location = event.venue_address ?? (event.online_link ? "Online" : "TBA");

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="aspect-[16/7] rounded-2xl overflow-hidden bg-muted mb-8 shadow-elevated">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-hero" />
        )}
      </div>

      {ended && (
        <div className="rounded-lg border-l-4 border-warning bg-warning/10 p-4 mb-6">
          <p className="font-medium text-warning-foreground">This event has ended.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div>
            <Badge variant="secondary" className="mb-3">{event.visibility}</Badge>
            <h1 className="text-3xl md:text-4xl font-bold">{event.title}</h1>
          </div>

          <Link
            to="/hosts/$slug"
            params={{ slug: event.hosts!.slug }}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors w-fit"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={event.hosts!.logo_url ?? undefined} />
              <AvatarFallback>{event.hosts!.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xs text-muted-foreground">Hosted by</div>
              <div className="font-medium">{event.hosts!.name}</div>
            </div>
          </Link>

          {event.description && (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">{event.description}</div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-5 space-y-4 shadow-card">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">{fmtRangeInTz(event.start_at, event.end_at, event.timezone)}</div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                {location}
                {event.online_link && (
                  <a href={event.online_link} target="_blank" rel="noreferrer" className="block text-primary hover:underline mt-1 inline-flex items-center gap-1">
                    Join link <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                {counts?.confirmed ?? 0} / {event.capacity} attending
                {(counts?.waitlisted ?? 0) > 0 && (
                  <span className="block text-muted-foreground text-xs">
                    {counts!.waitlisted} on waitlist
                  </span>
                )}
              </div>
            </div>

            {!ended && (
              <div className="pt-2">
                {!user ? (
                  <Button className="w-full" asChild>
                    <Link to="/auth" search={{ returnTo: `/events/${id}` }}>Sign in to RSVP</Link>
                  </Button>
                ) : myRsvp ? (
                  <div className="space-y-2">
                    <Badge className="w-full justify-center py-2" variant={myRsvp.status === "confirmed" ? "default" : "secondary"}>
                      {myRsvp.status === "confirmed" ? "✓ You're going" : `Waitlist #${myRsvp.waitlist_position}`}
                    </Badge>
                    <Button variant="outline" className="w-full" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                      Cancel RSVP
                    </Button>
                    {myRsvp.status === "confirmed" && (
                      <Button variant="ghost" className="w-full" asChild>
                        <Link to="/my-tickets">View ticket</Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => rsvp.mutate()} disabled={rsvp.isPending}>
                    {slotsLeft > 0 ? "RSVP" : "Join waitlist"}
                  </Button>
                )}
              </div>
            )}

            <div className="pt-2 border-t flex flex-col gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  downloadFile(
                    `${event.title}.ics`,
                    buildIcs({
                      uid: event.id,
                      title: event.title,
                      description: event.description ?? undefined,
                      location,
                      startIso: event.start_at,
                      endIso: event.end_at,
                    }),
                    "text/calendar",
                  )
                }
              >
                <Download className="h-4 w-4 mr-2" />Add to calendar (.ics)
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={googleCalUrl({
                    title: event.title,
                    description: event.description ?? undefined,
                    location,
                    startIso: event.start_at,
                    endIso: event.end_at,
                  })}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />Add to Google Calendar
                </a>
              </Button>
            </div>
          </div>

          {isTeam && (
            <div className="rounded-xl border bg-card p-5 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Organizer tools</p>
              <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/dashboard" })}>
                <Edit className="h-4 w-4 mr-2" />Manage
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/events/$id/checkin" params={{ id }}>
                  <ScanLine className="h-4 w-4 mr-2" />Check-in
                </Link>
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

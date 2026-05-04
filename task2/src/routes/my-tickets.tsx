import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fmtDateInTz } from "@/lib/format";

export const Route = createFileRoute("/my-tickets")({
  component: () => (
    <RequireAuth>
      <MyTicketsPage />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "My tickets — Localhost" }] }),
});

function MyTicketsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-tickets", user!.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tickets")
        .select("*, events:events!inner(id, title, start_at, end_at, timezone, venue_address, online_link, cover_image_url)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Realtime: keep checked_in status fresh
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`tickets-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tickets", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["my-tickets", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">My Tickets</h1>
      <p className="text-muted-foreground mb-8">Show the QR code at the door to check in.</p>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : (tickets?.length ?? 0) === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">You don't have any tickets yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {tickets!.map((t: any) => {
            const ev = t.events;
            const checked = !!t.checked_in_at;
            return (
              <div key={t.id} className="rounded-xl border bg-card overflow-hidden shadow-card">
                <div className="md:flex">
                  <div className="md:w-1/3 aspect-video md:aspect-auto bg-muted">
                    {ev.cover_image_url ? (
                      <img src={ev.cover_image_url} alt={ev.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-hero" />
                    )}
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link to="/events/$id" params={{ id: ev.id }} className="hover:text-primary">
                          <h3 className="text-xl font-semibold">{ev.title}</h3>
                        </Link>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {fmtDateInTz(ev.start_at, ev.timezone)}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {ev.venue_address ?? (ev.online_link ? "Online" : "TBA")}
                          </div>
                        </div>
                      </div>
                      {checked && (
                        <Badge variant="default" className="bg-success text-success-foreground">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Checked in
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-4">
                      <div className="rounded-lg bg-white p-3 border">
                        <QRCodeSVG value={t.code} size={120} level="M" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Ticket code</div>
                        <div className="font-mono text-lg font-bold">{t.code}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

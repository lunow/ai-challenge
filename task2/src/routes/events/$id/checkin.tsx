import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ScanLine, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/events/$id/checkin")({
  component: () => (
    <RequireAuth>
      <CheckinPage />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Check-in — Localhost" }] }),
});

function CheckinPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [last, setLast] = useState<{ ok: boolean; msg: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: event, isLoading } = useQuery({
    queryKey: ["checkin-event", id],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("id, title, capacity, host_id").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: isTeam, isLoading: loadingTeam } = useQuery({
    queryKey: ["checkin-team", event?.host_id, user?.id],
    enabled: !!event,
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

  const { data: stats } = useQuery({
    queryKey: ["checkin-stats", id],
    queryFn: async () => {
      const { count: total } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id);
      const { count: checked } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id)
        .not("checked_in_at", "is", null);
      return { total: total ?? 0, checked: checked ?? 0 };
    },
  });

  // Realtime: refresh stats when any ticket updates
  useEffect(() => {
    const ch = supabase
      .channel(`checkin-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tickets", filter: `event_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["checkin-stats", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);

  const checkIn = useMutation({
    mutationFn: async (rawCode: string) => {
      const c = rawCode.trim().toUpperCase();
      if (!c) throw new Error("Enter a code");
      const { data: ticket, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("event_id", id)
        .eq("code", c)
        .maybeSingle();
      if (error) throw error;
      if (!ticket) throw new Error("Ticket not found for this event");
      if (ticket.checked_in_at) throw new Error(`Already checked in at ${new Date(ticket.checked_in_at).toLocaleTimeString()}`);
      const { error: upErr } = await supabase
        .from("tickets")
        .update({ checked_in_at: new Date().toISOString(), checked_in_by: user!.id })
        .eq("id", ticket.id);
      if (upErr) throw upErr;
      return ticket;
    },
    onSuccess: () => {
      setLast({ ok: true, msg: `Checked in: ${code.trim().toUpperCase()}` });
      setCode("");
      inputRef.current?.focus();
      qc.invalidateQueries({ queryKey: ["checkin-stats", id] });
    },
    onError: (e: any) => {
      setLast({ ok: false, msg: e.message });
      inputRef.current?.select();
    },
  });

  if (isLoading || loadingTeam) {
    return <div className="container mx-auto px-4 py-10 max-w-xl"><Skeleton className="h-64 w-full" /></div>;
  }
  if (!event) {
    return <div className="container mx-auto px-4 py-20 text-center">Event not found.</div>;
  }
  if (!isTeam) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-md text-center">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-muted-foreground mt-2">You're not on this event's team.</p>
        <Button asChild className="mt-4"><Link to="/events/$id" params={{ id }}>Back to event</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-xl">
      <div className="mb-6">
        <Link to="/events/$id" params={{ id }} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to event
        </Link>
        <h1 className="text-3xl font-bold mt-2">{event.title}</h1>
        <p className="text-muted-foreground">Door check-in</p>
      </div>

      <Card className="mb-6">
        <CardContent className="py-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Checked in</div>
            <div className="text-3xl font-bold">{stats?.checked ?? 0}<span className="text-base text-muted-foreground"> / {stats?.total ?? 0}</span></div>
          </div>
          <Badge variant="secondary"><ScanLine className="h-3 w-3 mr-1" />Live</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Scan or enter ticket code</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              checkIn.mutate(code);
            }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="E.g. AB12CD34"
              className="font-mono uppercase"
              autoComplete="off"
            />
            <Button type="submit" disabled={checkIn.isPending}>Check in</Button>
          </form>

          {last && (
            <div
              className={`mt-4 rounded-md p-3 text-sm flex items-center gap-2 ${
                last.ok ? "bg-success/10 text-success-foreground border border-success/30" : "bg-destructive/10 text-destructive border border-destructive/30"
              }`}
            >
              {last.ok ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
              <span>{last.msg}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

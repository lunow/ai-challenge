import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Users, Download, ExternalLink, Pencil, UserPlus, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { fmtDateInTz, csvEscape, downloadFile } from "@/lib/format";

export const Route = createFileRoute("/dashboard/")({
  component: () => (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Dashboard — Localhost" }] }),
});

function DashboardPage() {
  const { user } = useAuth();

  const { data: memberships, isLoading } = useQuery({
    queryKey: ["dash-memberships", user!.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("host_members")
        .select("role, host_id, hosts:hosts!inner(id, name, slug, logo_url, bio)")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const [activeHost, setActiveHost] = useState<string | null>(null);
  useEffect(() => {
    if (!activeHost && memberships && memberships.length > 0) {
      setActiveHost((memberships[0] as any).host_id);
    }
  }, [memberships, activeHost]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!memberships || memberships.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-xl text-center">
        <h1 className="text-3xl font-bold mb-2">Become a host</h1>
        <p className="text-muted-foreground mb-6">
          Create a host organization on your profile to start publishing events.
        </p>
        <Button asChild><Link to="/profile">Go to profile</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage events, attendees, and your team.</p>
        </div>
        <div className="flex items-center gap-3">
          {memberships.length > 1 && (
            <Select value={activeHost ?? undefined} onValueChange={setActiveHost}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {memberships.map((m: any) => (
                  <SelectItem key={m.host_id} value={m.host_id}>{m.hosts.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {activeHost && (
            <Button asChild>
              <Link to="/dashboard/events/new" search={{ hostId: activeHost }}>
                <Plus className="h-4 w-4 mr-2" />New event
              </Link>
            </Button>
          )}
        </div>
      </div>

      {activeHost && <HostDashboard hostId={activeHost} />}
    </div>
  );
}

function HostDashboard({ hostId }: { hostId: string }) {
  const { data: events } = useQuery({
    queryKey: ["dash-events", hostId],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("host_id", hostId)
        .order("start_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <Tabs defaultValue="events">
      <TabsList>
        <TabsTrigger value="events">Events</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
      </TabsList>
      <TabsContent value="events" className="mt-6">
        <EventsTable events={events ?? []} />
      </TabsContent>
      <TabsContent value="team" className="mt-6">
        <TeamPanel hostId={hostId} />
      </TabsContent>
    </Tabs>
  );
}

function EventsTable({ events }: { events: any[] }) {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No events yet. Click "New event" to create one.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Event</th>
            <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Date</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventRow({ event }: { event: any }) {
  const { data: counts } = useQuery({
    queryKey: ["dash-counts", event.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("rsvps")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("status", "confirmed");
      return count ?? 0;
    },
  });
  const ended = new Date(event.end_at) < new Date();

  const exportCsv = async () => {
    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("status, created_at, profiles:profiles!inner(full_name, contact_email)")
      .eq("event_id", event.id);
    const headers = ["Name", "Email", "Status", "RSVP at"];
    const rows = (rsvps ?? []).map((r: any) =>
      [r.profiles?.full_name ?? "", r.profiles?.contact_email ?? "", r.status, r.created_at]
        .map(csvEscape)
        .join(","),
    );
    // BOM for Excel compatibility
    const csv = "\uFEFF" + headers.map(csvEscape).join(",") + "\r\n" + rows.join("\r\n");
    downloadFile(`${event.title}-attendees.csv`, csv, "text/csv;charset=utf-8");
  };

  return (
    <tr className="border-t">
      <td className="px-4 py-3">
        <Link to="/events/$id" params={{ id: event.id }} className="font-medium hover:text-primary">
          {event.title}
        </Link>
        <div className="text-xs text-muted-foreground sm:hidden">
          {fmtDateInTz(event.start_at, event.timezone)}
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
        {fmtDateInTz(event.start_at, event.timezone)}
      </td>
      <td className="px-4 py-3">
        <Badge variant={event.status === "published" ? "default" : "secondary"}>
          {event.status}
        </Badge>
        {ended && <Badge variant="outline" className="ml-1">Ended</Badge>}
        <div className="text-xs text-muted-foreground mt-1">
          {counts ?? 0}/{event.capacity} attending
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex gap-1">
          <Button size="sm" variant="ghost" asChild>
            <Link to="/dashboard/events/$id" params={{ id: event.id }}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={exportCsv} title="Export CSV">
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/events/$id/checkin" params={{ id: event.id }}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}

function TeamPanel({ hostId }: { hostId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);

  const { data: members } = useQuery({
    queryKey: ["host-members", hostId],
    queryFn: async () => {
      const { data: hm } = await supabase
        .from("host_members")
        .select("id, role, user_id, joined_at")
        .eq("host_id", hostId);
      const ids = (hm ?? []).map((m) => m.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url, contact_email").in("id", ids)
        : { data: [] as any[] };
      return (hm ?? []).map((m) => ({
        ...m,
        profile: (profs ?? []).find((p: any) => p.id === m.user_id),
      }));
    },
  });

  const { data: invites } = useQuery({
    queryKey: ["host-invites", hostId],
    queryFn: async () => {
      const { data } = await supabase
        .from("invite_links")
        .select("*")
        .eq("host_id", hostId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createInvite = useMutation({
    mutationFn: async (role: string) => {
      const { error } = await supabase
        .from("invite_links")
        .insert({ host_id: hostId, role, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invite link created.");
      qc.invalidateQueries({ queryKey: ["host-invites", hostId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("host_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member removed.");
      qc.invalidateQueries({ queryKey: ["host-members", hostId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invite_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["host-invites", hostId] });
    },
  });

  const inviteUrl = (token: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/invite/${token}` : `/invite/${token}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team members</CardTitle>
            <CardDescription>People who can manage this host.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="h-4 w-4 mr-2" />Invite</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create an invite link</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Anyone with this link can join the host with the selected role.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => createInvite.mutate("host")} disabled={createInvite.isPending}>
                    Invite as Host
                  </Button>
                  <Button variant="outline" onClick={() => createInvite.mutate("checker")} disabled={createInvite.isPending}>
                    Invite as Check-in staff
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {(members ?? []).map((m: any) => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-md border">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{(m.profile?.full_name ?? "?").slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{m.profile?.full_name ?? "Member"}</div>
                  <div className="text-xs text-muted-foreground">{m.profile?.contact_email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{m.role}</Badge>
                {m.user_id !== user!.id && (
                  <Button size="sm" variant="ghost" onClick={() => removeMember.mutate(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {(invites?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invite links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invites!.map((inv) => (
              <div key={inv.id} className="flex items-center gap-2">
                <Badge variant="outline">{inv.role}</Badge>
                <Input ref={linkRef} readOnly value={inviteUrl(inv.token)} className="flex-1 font-mono text-xs" />
                <Button size="sm" variant="ghost" onClick={() => {
                  navigator.clipboard.writeText(inviteUrl(inv.token));
                  toast.success("Copied!");
                }}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteInvite.mutate(inv.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

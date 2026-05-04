import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
  head: () => ({ meta: [{ title: "Accept invite — Localhost" }] }),
});

function InvitePage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  const { data: invite, isLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: async () => {
      const { data } = await supabase
        .from("invite_links")
        .select("*, hosts:hosts!inner(id, name, slug, logo_url)")
        .eq("token", token)
        .maybeSingle();
      return data;
    },
  });

  const accept = useMutation({
    mutationFn: async () => {
      if (!invite || !user) throw new Error("Missing invite or user");
      const { error } = await supabase.from("host_members").insert({
        host_id: invite.host_id,
        user_id: user.id,
        role: invite.role,
        invited_via: token,
      });
      if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
    },
    onSuccess: () => {
      toast.success("You've joined the host!");
      setDone(true);
    },
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => {
    if (!loading && !user && invite) {
      navigate({ to: "/auth", search: { returnTo: `/invite/${token}` }, replace: true });
    }
  }, [loading, user, invite, navigate, token]);

  if (isLoading || loading) {
    return <div className="container mx-auto px-4 py-20 max-w-md"><Skeleton className="h-64 w-full" /></div>;
  }
  if (!invite) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-md text-center">
        <h1 className="text-2xl font-bold">Invite not found</h1>
        <p className="text-muted-foreground mt-2">This link may have expired.</p>
        <Button asChild className="mt-4"><Link to="/">Home</Link></Button>
      </div>
    );
  }

  const host = (invite as any).hosts;
  const expired = invite.expires_at && new Date(invite.expires_at) < new Date();

  return (
    <div className="container mx-auto px-4 py-20 max-w-md">
      <Card className="shadow-elevated">
        <CardHeader className="text-center">
          {host?.logo_url && (
            <img src={host.logo_url} className="h-16 w-16 rounded-full mx-auto mb-3" alt="" />
          )}
          <CardTitle>Join {host?.name}</CardTitle>
          <CardDescription>You're invited as <strong>{invite.role}</strong>.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {expired ? (
            <p className="text-center text-destructive">This invite has expired.</p>
          ) : done ? (
            <Button asChild className="w-full">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <Button className="w-full" onClick={() => accept.mutate()} disabled={accept.isPending}>
              {accept.isPending ? "Joining..." : "Accept invite"}
            </Button>
          )}
          <Button variant="ghost" className="w-full" asChild><Link to="/">Cancel</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}

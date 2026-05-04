import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Menu, Ticket, X, LogOut, User as UserIcon, Calendar, LayoutDashboard } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function Navbar() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: memberships } = useQuery({
    queryKey: ["memberships", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("host_members").select("host_id, role").eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const { data: notifs } = useQuery({
    queryKey: ["notifications-unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, payload, read, created_at")
        .eq("user_id", user!.id)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const isHostMember = (memberships?.length ?? 0) > 0;
  const unreadCount = notifs?.length ?? 0;

  useEffect(() => setMobileOpen(false), [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-sm shadow-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground font-mono">
            ◆
          </span>
          <span>Localhost</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link to="/explore" className="text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground font-medium" }}>
            Explore
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {!user ? (
            <>
              <Button variant="ghost" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button asChild>
                <Link to="/auth" search={{ returnTo: "/profile" }}>
                  Get started
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" asChild aria-label="My tickets">
                <Link to="/my-tickets">
                  <Ticket className="h-5 w-5" />
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs" variant="destructive">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(notifs?.length ?? 0) === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      You're all caught up.
                    </div>
                  ) : (
                    notifs!.map((n) => {
                      const eventId = (n.payload as any)?.eventId ?? (n.payload as any)?.event_id;
                      return (
                        <DropdownMenuItem
                          key={n.id}
                          onClick={() => {
                            markRead(n.id);
                            if (eventId) navigate({ to: "/events/$id", params: { id: eventId } });
                          }}
                          className="flex flex-col items-start gap-1"
                        >
                          <span className="font-medium">
                            {n.type === "waitlist_promoted" ? "You're off the waitlist!" : n.type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(n.created_at!).toLocaleString()}
                          </span>
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" aria-label="Profile menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {(profile?.full_name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">
                    {profile?.full_name ?? user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile"><UserIcon className="mr-2 h-4 w-4" />Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-tickets"><Ticket className="mr-2 h-4 w-4" />My Tickets</Link>
                  </DropdownMenuItem>
                  {isHostMember && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/my-events"><Calendar className="mr-2 h-4 w-4" />My Events</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        <button
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-foreground"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-3 text-sm">
            <Link to="/explore" className="rounded-md px-3 py-2 hover:bg-muted">Explore</Link>
            {user ? (
              <>
                <Link to="/my-tickets" className="rounded-md px-3 py-2 hover:bg-muted">My Tickets</Link>
                <Link to="/profile" className="rounded-md px-3 py-2 hover:bg-muted">Profile</Link>
                {isHostMember && (
                  <>
                    <Link to="/my-events" className="rounded-md px-3 py-2 hover:bg-muted">My Events</Link>
                    <Link to="/dashboard" className="rounded-md px-3 py-2 hover:bg-muted">Dashboard</Link>
                  </>
                )}
                <button onClick={handleSignOut} className="rounded-md px-3 py-2 text-left hover:bg-muted">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" className="rounded-md px-3 py-2 hover:bg-muted">Sign in</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

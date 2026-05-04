import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";
import { fmtDateInTz } from "@/lib/format";

type EventCardEvent = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  venue_address: string | null;
  online_link: string | null;
  cover_image_url: string | null;
  hosts?: { id: string; name: string; slug: string; logo_url: string | null } | null;
};

export function EventCard({ event }: { event: EventCardEvent }) {
  const ended = new Date(event.end_at) < new Date();
  const location = event.venue_address ?? (event.online_link ? "Online" : "TBA");

  return (
    <Link
      to="/events/$id"
      params={{ id: event.id }}
      className="group block rounded-xl border bg-card overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5"
    >
      <div className="aspect-[16/10] bg-muted overflow-hidden relative">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-hero" />
        )}
        {ended && (
          <Badge variant="secondary" className="absolute top-3 left-3 bg-background/90">
            Ended
          </Badge>
        )}
      </div>
      <CardContent className="p-5">
        <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="line-clamp-1">{fmtDateInTz(event.start_at, event.timezone)}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
        </div>
        {event.hosts && (
          <div className="mt-4 flex items-center gap-2 pt-4 border-t">
            {event.hosts.logo_url && (
              <img src={event.hosts.logo_url} alt="" className="h-6 w-6 rounded-full" />
            )}
            <span className="text-xs text-muted-foreground truncate">
              by <span className="text-foreground font-medium">{event.hosts.name}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Link>
  );
}

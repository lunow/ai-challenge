import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Promotes the next waitlisted RSVP for an event into 'confirmed' status,
 * issues a ticket, and creates a notification. Called after a confirmed
 * attendee cancels.
 */
export const promoteWaitlist = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { eventId } = data;
    const admin = supabaseAdmin;

    // Check capacity
    const { data: ev, error: evErr } = await admin
      .from("events")
      .select("id, capacity, title")
      .eq("id", eventId)
      .single();
    if (evErr || !ev) return { promoted: 0, error: evErr?.message ?? "Event not found" };

    const { count: confirmedCount } = await admin
      .from("rsvps")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "confirmed");

    const slots = (ev.capacity ?? 0) - (confirmedCount ?? 0);
    if (slots <= 0) return { promoted: 0 };

    const { data: waitlisted } = await admin
      .from("rsvps")
      .select("id, user_id, waitlist_position")
      .eq("event_id", eventId)
      .eq("status", "waitlisted")
      .order("waitlist_position", { ascending: true })
      .limit(slots);

    if (!waitlisted || waitlisted.length === 0) return { promoted: 0 };

    let promoted = 0;
    for (const r of waitlisted) {
      const { error: upErr } = await admin
        .from("rsvps")
        .update({ status: "confirmed", waitlist_position: null })
        .eq("id", r.id);
      if (upErr) continue;

      // Generate ticket code
      const { data: codeRow } = await admin.rpc("generate_ticket_code" as any);
      const code =
        (typeof codeRow === "string" ? codeRow : null) ??
        Math.random().toString(36).slice(2, 10).toUpperCase();

      await admin.from("tickets").insert({
        event_id: eventId,
        user_id: r.user_id,
        rsvp_id: r.id,
        code,
      });

      await admin.from("notifications").insert({
        user_id: r.user_id,
        type: "waitlist_promoted",
        payload: { event_id: eventId, eventId, title: ev.title },
      });
      promoted++;
    }

    return { promoted };
  });

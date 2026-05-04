import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { EventEditor } from "@/components/EventEditor";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/dashboard/events/new")({
  validateSearch: z.object({ hostId: z.string().uuid().optional() }),
  component: () => (
    <RequireAuth>
      <NewEventPage />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Create event — Localhost" }] }),
});

function NewEventPage() {
  const { hostId } = Route.useSearch();
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Create a new event</h1>
      <EventEditor mode="create" hostId={hostId} />
    </div>
  );
}

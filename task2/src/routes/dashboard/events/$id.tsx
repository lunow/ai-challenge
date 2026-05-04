import { createFileRoute } from "@tanstack/react-router";
import { EventEditor } from "@/components/EventEditor";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/dashboard/events/$id")({
  component: () => (
    <RequireAuth>
      <EditEventPage />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Edit event — Localhost" }] }),
});

function EditEventPage() {
  const { id } = Route.useParams();
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Edit event</h1>
      <EventEditor mode="edit" eventId={id} />
    </div>
  );
}

import {
  Outlet,
  Link,
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import appCss from "../styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">This page doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Localhost — where every idea starts" },
      {
        name: "description",
        content: "Localhost — reclaimed as a place for real-world gatherings. Publish events, RSVP, get QR tickets, and check in at the door.",
      },
      { property: "og:title", content: "Localhost — where every idea starts" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Localhost — where every idea starts" },
      { name: "description", content: "Localhost is an event platform for real-world gatherings, enabling organizers to host events and attendees to RSVP and check in." },
      { property: "og:description", content: "Localhost is an event platform for real-world gatherings, enabling organizers to host events and attendees to RSVP and check in." },
      { name: "twitter:description", content: "Localhost is an event platform for real-world gatherings, enabling organizers to host events and attendees to RSVP and check in." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/80d11e73-6420-41d0-921d-ccc2b458aa8b/id-preview-686b76b6--fc9bc02b-f75e-4f91-8d2e-781d02e21956.lovable.app-1777897803493.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/80d11e73-6420-41d0-921d-ccc2b458aa8b/id-preview-686b76b6--fc9bc02b-f75e-4f91-8d2e-781d02e21956.lovable.app-1777897803493.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              <Outlet />
            </main>
            <footer className="border-t py-8 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Localhost. Discover and host community events.
            </footer>
          </div>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

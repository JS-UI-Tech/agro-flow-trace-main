import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useSession, signOut } from "@/lib/auth-client";
import { Bell, Search, LogOut } from "lucide-react";

// Routes rendered without the app chrome (bare, centered).
const AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/two-factor"];
// Routes reachable without a session (auth pages + the public QR verify page).
const PUBLIC_PATHS = [...AUTH_PATHS, "/verify"];

function isMatch(pathname: string, list: string[]) {
  return list.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AgroTrace — Agroprocessor Traceability System" },
      { name: "description", content: "End-to-end traceability for agro-processing: suppliers, production, QC, dispatch, recalls and audits." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "AgroTrace — Agroprocessor Traceability System" },
      { property: "og:description", content: "End-to-end traceability for agro-processing: suppliers, production, QC, dispatch, recalls and audits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "AgroTrace — Agroprocessor Traceability System" },
      { name: "twitter:description", content: "End-to-end traceability for agro-processing: suppliers, production, QC, dispatch, recalls and audits." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a6cf12dc-f740-4c4e-a1ba-61cc96bec6e5/id-preview-c9eca7e1--237a7d42-c170-4829-b561-e3e070921807.lovable.app-1779217422890.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a6cf12dc-f740-4c4e-a1ba-61cc96bec6e5/id-preview-c9eca7e1--237a7d42-c170-4829-b561-e3e070921807.lovable.app-1779217422890.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
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

function initials(name?: string, email?: string) {
  const src = (name || email || "?").trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppBody />
    </QueryClientProvider>
  );
}

function AppBody() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: session, isPending } = useSession();

  const isAuthRoute = isMatch(pathname, AUTH_PATHS);
  const isPublicRoute = isMatch(pathname, PUBLIC_PATHS);

  // Guard: send unauthenticated users to the login page (client-side).
  useEffect(() => {
    if (!isPending && !session && !isPublicRoute) {
      router.navigate({ to: "/login", search: { redirect: pathname } });
    }
  }, [isPending, session, isPublicRoute, pathname, router]);

  // Bare layout for auth pages (no sidebar / header).
  if (isAuthRoute) return <Outlet />;

  // While redirecting an unauthenticated user away from a protected route.
  if (!isPending && !session && !isPublicRoute) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Redirecting…</div>;
  }

  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="relative hidden flex-1 max-w-md md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                placeholder="Search batches, lots, suppliers, products…"
              />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
              </button>
              <Link
                to="/account"
                className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 hover:bg-accent"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {initials(user?.name, user?.email)}
                </div>
                <div className="hidden text-xs leading-tight sm:block">
                  <div className="font-medium text-foreground">{user?.name ?? user?.email ?? "Account"}</div>
                  <div className="text-muted-foreground">{role ?? "—"}</div>
                </div>
              </Link>
              <button
                onClick={() => signOut().then(() => router.navigate({ to: "/login" }))}
                title="Sign out"
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

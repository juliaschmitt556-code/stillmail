import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/stillmail/dashboard";
import { StillmailMark } from "@/components/stillmail/mark";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="min-h-dvh bg-bg px-4 py-6">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2 text-fg">
            <StillmailMark className="size-7" />
            <span className="text-sm font-medium tracking-wide">Stillmail</span>
          </div>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="mx-auto mt-10 max-w-6xl">
          <h1 className="font-display text-3xl tracking-[-0.03em] text-fg">
            Send the image. Keep every pixel.
          </h1>
          <p className="mt-2 text-sm text-muted">Loading your workspace…</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <Skeleton className="h-[28rem]" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <Dashboard />;
}

import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Image, Lock, Mail } from "lucide-react";
import { StillmailMark } from "@/components/stillmail/mark";
import { Button } from "@/components/ui/button";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <main className="min-h-dvh bg-bg" />;
  }
  if (user) return <Navigate to="/" />;

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-5 py-12 sm:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-accent)_10%,transparent),transparent_70%)]" />
      <div className="relative grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="max-w-xl">
          <div className="mb-6 flex items-center gap-2 text-fg">
            <StillmailMark className="size-8" />
            <span className="text-sm font-medium tracking-wide">Stillmail</span>
          </div>
          <h1 className="font-display text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.08] tracking-[-0.03em]">
            Send the image.
            <br />
            Keep every pixel.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
            Upload a PNG or JPEG once. Stillmail embeds that exact file in the
            email body — no HTML recreation, no recoloring, no compression.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted">
            <li className="flex gap-3">
              <Image className="mt-0.5 size-4 shrink-0 text-accent" />
              Original file stored and sent as an inline CID attachment.
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-accent" />
              Colors, type, shadows, and logos stay inside the image.
            </li>
            <li className="flex gap-3">
              <Lock className="mt-0.5 size-4 shrink-0 text-accent" />
              Fallback text for clients that block images.
            </li>
          </ul>
        </div>

        <div className="rounded-[calc(var(--radius-xl)+12px)] border border-border bg-surface p-6 sm:p-8">
          <h2 className="text-lg font-medium">Sign in to continue</h2>
          <p className="mt-1 mb-6 text-sm text-muted">
            Your templates and send history stay on your account.
          </p>
          {authEnabled ? (
            <div className="flex flex-col gap-3">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant={p.idp === "google" ? "default" : "secondary"}
                  onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                >
                  Continue with {p.label}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
      </div>
    </main>
  );
}

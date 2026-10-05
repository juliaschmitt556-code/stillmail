import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  History,
  ImagePlus,
  LoaderCircle,
  Mail,
  Send,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import {
  ensureTripTemplate,
  getActiveTemplate,
  getProviderStatus,
  listSendHistory,
  saveTemplate,
  sendTemplateEmail,
  updateTemplateAlt,
} from "@/lib/mail/functions";
import { readOriginalImage } from "@/lib/mail/read-image";
import {
  formatBytes,
  isValidEmail,
  MAX_WIDTH_RECOMMENDED,
} from "@/lib/mail/shared";
import type { ActiveTemplate, MailProviderStatus, SendRecord } from "@/lib/mail/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { StillmailMark } from "./mark";
import { cn } from "@/lib/utils";

type Section = "upload" | "compose" | "history";

const TRIP_TEMPLATE_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/E23D27A7-C665-400B-8E38-B0B44B47921B-Hz3mzcbr6CUhSCmBpSBVB81Co3J4vj.png";

const SECTIONS: { id: Section; label: string; icon: typeof Upload }[] = [
  { id: "upload", label: "Template", icon: ImagePlus },
  { id: "compose", label: "Compose", icon: Mail },
  { id: "history", label: "Send history", icon: History },
];

function statusTone(status: SendRecord["status"]) {
  if (status === "sent") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "simulated") return "warn" as const;
  return "neutral" as const;
}

export function Dashboard() {
  const user = useCurrentUser();
  const [section, setSection] = useState<Section>("upload");
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<ActiveTemplate | null>(null);
  const [provider, setProvider] = useState<MailProviderStatus | null>(null);
  const [history, setHistory] = useState<SendRecord[]>([]);
  const [pending, setPending] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [fallbackText, setFallbackText] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(async () => {
    try {
      const [loadedTemplate, status, rows] = await Promise.all([
        getActiveTemplate(),
        getProviderStatus(),
        listSendHistory(),
      ]);
      const tpl = loadedTemplate ?? (await ensureTripTemplate());
      setTemplate(tpl);
      setProvider(status);
      setHistory(rows);
      if (tpl) {
        setAltText(tpl.altText);
        setFallbackText((current) => current || tpl.altText);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const original = await readOriginalImage(file);
      setPending(file);
      setPendingPreview(original.previewUrl);
      if (!altText) setAltText(file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
      if (original.width > MAX_WIDTH_RECOMMENDED) {
        toast.message(`Width is ${original.width}px. Emails often look best at 600–800px.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that file.");
    }
  };

  const onSave = async () => {
    if (!pending) {
      if (template) {
        setSaving(true);
        try {
          await updateTemplateAlt({ data: { altText } });
          setTemplate({ ...template, altText });
          toast.success("Alt text saved.");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not save.");
        } finally {
          setSaving(false);
        }
      } else {
        toast.error("Choose a PNG or JPEG first.");
      }
      return;
    }
    setSaving(true);
    try {
      const original = await readOriginalImage(pending);
      const saved = await saveTemplate({
        data: {
          name: "Permanent Campaign Template",
          altText,
          width: original.width,
          height: original.height,
          originalFilename: original.originalFilename,
          imageBase64: original.imageBase64,
        },
      });
      setTemplate(saved);
      setPending(null);
      setPendingPreview(null);
      setFallbackText((current) => current || altText);
      toast.success("Permanent template saved. The original file was not altered.");
      setSection("compose");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save template.");
    } finally {
      setSaving(false);
    }
  };

  const send = async (isTest: boolean) => {
    const to = isTest ? (user?.primaryEmail ?? recipient) : recipient;
    if (!template) {
      toast.error("Save a template before sending.");
      setSection("upload");
      return;
    }
    if (!isValidEmail(to)) {
      toast.error(
        isTest && !user?.primaryEmail
          ? "Add a recipient, or sign in with an account that has an email."
          : "Enter a valid recipient email.",
      );
      return;
    }
    if (!subject.trim()) {
      toast.error("Add a subject line.");
      return;
    }
    if (isTest) setTesting(true);
    else setSending(true);
    try {
      const record = await sendTemplateEmail({
        data: {
          recipient: to,
          subject: isTest ? `[Test] ${subject.trim()}` : subject.trim(),
          previewText,
          fallbackText: [personalMessage.trim(), fallbackText.trim()].filter(Boolean).join("\n\n"),
          isTest,
        },
      });
      setHistory((prev) => [record, ...prev]);
      if (record.status === "simulated") {
        toast.message("Recorded as a simulated send. Add a Resend API key to deliver live mail.");
      } else {
        toast.success(isTest ? "Test email sent." : `Sent to ${to}.`);
      }
      setSection("history");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setTesting(false);
      setSending(false);
    }
  };

  const previewSrc = pendingPreview ?? template?.dataUrl ?? TRIP_TEMPLATE_URL;

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 text-fg">
            <StillmailMark className="size-7" />
            <div className="leading-tight">
              <p className="text-sm font-medium tracking-wide">Stillmail</p>
              <p className="hidden text-[0.6875rem] text-subtle sm:block">Exact-image email</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 rounded-[var(--radius-md)] bg-surface p-1">
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm transition-colors duration-[var(--motion-quick)]",
                    active ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            {provider && (
              <Badge tone={provider.configured ? "success" : "warn"} className="hidden md:inline-flex">
                {provider.configured ? "Resend live" : "Demo send"}
              </Badge>
            )}
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Skeleton className="h-[28rem]" />
            <Skeleton className="h-64" />
          </div>
        ) : section === "upload" ? (
          <UploadSection
            template={template}
            pending={pending}
            previewSrc={previewSrc}
            altText={altText}
            setAltText={setAltText}
            dragOver={dragOver}
            setDragOver={setDragOver}
            onPickFile={onPickFile}
            onSave={onSave}
            saving={saving}
          />
        ) : section === "compose" ? (
          <ComposeSection
            template={template}
            previewSrc={previewSrc}
            recipient={recipient}
            setRecipient={setRecipient}
            subject={subject}
            setSubject={setSubject}
            previewText={previewText}
            setPreviewText={setPreviewText}
            fallbackText={fallbackText}
            setFallbackText={setFallbackText}
            personalMessage={personalMessage}
            setPersonalMessage={setPersonalMessage}
            sending={sending}
            testing={testing}
            onSend={() => void send(false)}
            onTest={() => void send(true)}
            canTest={Boolean(user?.primaryEmail)}
            provider={provider}
            goUpload={() => setSection("upload")}
          />
        ) : (
          <HistorySection history={history} />
        )}
      </main>
    </div>
  );
}

function UploadSection({
  template,
  pending,
  previewSrc,
  altText,
  setAltText,
  dragOver,
  setDragOver,
  onPickFile,
  onSave,
  saving,
}: {
  template: ActiveTemplate | null;
  pending: File | null;
  previewSrc: string | null;
  altText: string;
  setAltText: (v: string) => void;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onPickFile: (file: File | undefined) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl tracking-[-0.02em]">Your email template</h1>
              <p className="mt-1 text-sm text-muted">
                Save the Trip design once. Every send uses the original proportions, colors, and typography.
              </p>
            </div>
            <Badge tone={template?.active ? "success" : "neutral"}>{template?.active ? "Active" : "Draft"}</Badge>
          </div>
        </div>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void onPickFile(e.dataTransfer.files[0]);
          }}
          className={cn(
            "m-5 flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed px-4 py-10 text-center transition-colors duration-[var(--motion-fast)] sm:m-6",
            dragOver ? "border-accent bg-surface-2" : "border-border bg-bg",
          )}
        >
          <input
            type="file"
            accept="image/png,image/jpeg,.png,.jpg,.jpeg"
            className="sr-only"
            onChange={(e) => void onPickFile(e.target.files?.[0])}
          />
          {previewSrc ? (
            <img
              src={previewSrc}
              alt={altText || "Template preview"}
              className="max-h-[28rem] w-full object-contain"
            />
          ) : (
            <>
              <Upload className="size-8 text-muted" />
              <p className="mt-3 text-sm font-medium">Drop the original file here</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Recommended width 600–800px. Maximum useful width {MAX_WIDTH_RECOMMENDED}px.
              </p>
            </>
          )}
        </label>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="text-sm font-medium">Template details</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="alt">Alternative text</Label>
              <Textarea
                id="alt"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Short description of the announcement"
                maxLength={300}
              />
              <p className="text-[0.75rem] text-subtle">Used when images are blocked. Keep it short.</p>
            </div>
            {(pending || template) && (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-subtle">Type</dt>
                  <dd>{pending?.type || template?.mimeType}</dd>
                </div>
                <div>
                  <dt className="text-subtle">Size</dt>
                  <dd>{formatBytes(pending?.size || template?.fileSize || 0)}</dd>
                </div>
                <div>
                  <dt className="text-subtle">Width</dt>
                  <dd>{template && !pending ? `${template.width}px` : "Original"}</dd>
                </div>
                <div>
                  <dt className="text-subtle">Height</dt>
                  <dd>{template && !pending ? `${template.height}px` : "Original"}</dd>
                </div>
              </dl>
            )}
            <Button type="button" className="w-full" onClick={onSave} disabled={saving}>
              {saving ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
              {pending ? "Save as permanent template" : "Save alt text"}
            </Button>
          </div>
        </Card>
        <Card>
          <p className="text-sm text-muted">
            The email body is a single responsive image with Content-ID{" "}
            <code className="text-fg">permanent-template</code>. Stillmail does not rebuild the design in HTML.
          </p>
        </Card>
      </div>
    </div>
  );
}

function ComposeSection({
  template,
  previewSrc,
  recipient,
  setRecipient,
  subject,
  setSubject,
  previewText,
  setPreviewText,
  fallbackText,
  setFallbackText,
  personalMessage,
  setPersonalMessage,
  sending,
  testing,
  onSend,
  onTest,
  canTest,
  provider,
  goUpload,
}: {
  template: ActiveTemplate | null;
  previewSrc: string | null;
  recipient: string;
  setRecipient: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  previewText: string;
  setPreviewText: (v: string) => void;
  fallbackText: string;
  setFallbackText: (v: string) => void;
  personalMessage: string;
  setPersonalMessage: (v: string) => void;
  sending: boolean;
  testing: boolean;
  onSend: () => void;
  onTest: () => void;
  canTest: boolean;
  provider: MailProviderStatus | null;
  goUpload: () => void;
}) {
  if (!template || !previewSrc) {
    return (
      <Card className="flex min-h-80 flex-col items-center justify-center text-center">
        <TriangleAlert className="size-6 text-muted" />
        <h1 className="mt-3 font-display text-2xl">No template yet</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Upload and save the original image first. The composer sends that file, unchanged.
        </p>
        <Button className="mt-6" type="button" onClick={goUpload}>
          Upload template
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <Card>
        <h1 className="font-display text-2xl tracking-[-0.02em]">Email composer</h1>
        <p className="mt-1 text-sm text-muted">
          From {provider?.fromEmail ?? "Stillmail"}. Image is attached inline, not as a download.
        </p>
        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="to">Recipient</Label>
            <Input
              id="to"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Your announcement"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preview">Preheader text</Label>
            <Input
              id="preview"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Inbox snippet, optional"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">Personalized message <span className="text-subtle">(optional)</span></Label>
            <Textarea
              id="message"
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              placeholder="Add a short note for this recipient"
              rows={3}
              maxLength={1000}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fallback">Plain-text fallback</Label>
            <Textarea
              id="fallback"
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              placeholder="Shown when images are blocked"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" className="flex-1" onClick={onTest} disabled={testing || sending}>
              {testing ? <LoaderCircle className="animate-spin" /> : <Mail />}
              {canTest ? "Send test to me" : "Send test"}
            </Button>
            <Button type="button" className="flex-1" onClick={onSend} disabled={sending || testing}>
              {sending ? <LoaderCircle className="animate-spin" /> : <Send />}
              Send email
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-medium">Exact preview</p>
            <p className="text-[0.75rem] text-subtle">
              {template.width} × {template.height} · {formatBytes(template.fileSize)}
            </p>
          </div>
          <Badge tone="accent">{template.mimeType.replace("image/", "").toUpperCase()}</Badge>
        </div>
        <div className="bg-bg p-4 sm:p-6">
          <img
            src={previewSrc}
            alt={template.altText || "Email template"}
            width={template.width}
            height={template.height}
            className="mx-auto block h-auto w-full max-w-full"
          />
        </div>
      </Card>
    </div>
  );
}

function HistorySection({ history }: { history: SendRecord[] }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-[-0.03em]">Send history</h1>
        <p className="mt-1 text-sm text-muted">Delivery status for live Resend sends and simulated demo sends.</p>
      </div>
      {history.length === 0 ? (
        <Card className="flex min-h-64 flex-col items-center justify-center text-center">
          <History className="size-6 text-muted" />
          <p className="mt-3 text-sm text-muted">Nothing sent yet.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {history.map((row) => (
            <li key={row.id}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.subject}</p>
                  <p className="mt-0.5 truncate text-sm text-muted">{row.recipient}</p>
                  <p className="mt-1 text-[0.75rem] text-subtle">
                    {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                    {row.isTest ? " · test" : ""}
                    {row.providerId ? ` · ${row.providerId}` : ""}
                  </p>
                  {row.errorMessage && (
                    <p className="mt-1 text-[0.75rem] text-danger">{row.errorMessage}</p>
                  )}
                </div>
                <Badge tone={statusTone(row.status)} className="self-start capitalize">
                  {row.status}
                </Badge>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

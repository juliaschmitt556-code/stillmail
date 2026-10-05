import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { env } from "@/lib/env.server";
import { buildEmailHtml, buildPlainText } from "./html";
import {
  CID,
  decodeBase64,
  extensionForMime,
  isValidEmail,
  MAX_IMAGE_BYTES,
  sniffImageMime,
} from "./validate";
import type { ActiveTemplate, MailProviderStatus, SendRecord, TemplateMeta } from "./types";

const saveTemplateInput = z.object({
  name: z.string().trim().min(1).max(120).default("Permanent Campaign Template"),
  altText: z.string().trim().max(300).default(""),
  width: z.number().int().positive().max(8000),
  height: z.number().int().positive().max(20000),
  originalFilename: z.string().trim().max(200).default("email-template.png"),
  imageBase64: z.string().min(16).max(Math.ceil(MAX_IMAGE_BYTES * 1.4)),
});

const TRIP_TEMPLATE_SOURCE_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/E23D27A7-C665-400B-8E38-B0B44B47921B-mDXwV8ZA3z2F8G3v8QVHBCgPucWOlb.png";

const sendInput = z.object({
  recipient: z.string().trim().min(3).max(254),
  subject: z.string().trim().min(1).max(200),
  previewText: z.string().trim().max(200).optional().default(""),
  fallbackText: z.string().trim().max(4000).optional().default(""),
  isTest: z.boolean().optional().default(false),
});

type TemplateRow = {
  id: string;
  name: string;
  mime_type: string;
  width: number;
  height: number;
  alt_text: string;
  file_size: number;
  original_filename: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  image_data?: string;
};

type HistoryRow = {
  id: string;
  template_id: string | null;
  recipient: string;
  subject: string;
  preview_text: string;
  fallback_text: string;
  is_test: boolean;
  status: SendRecord["status"];
  error_message: string | null;
  provider_id: string | null;
  created_at: string;
};

function mapTemplate(row: TemplateRow): TemplateMeta {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mime_type,
    width: Number(row.width),
    height: Number(row.height),
    altText: row.alt_text,
    fileSize: Number(row.file_size),
    originalFilename: row.original_filename,
    active: Boolean(row.active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapHistory(row: HistoryRow): SendRecord {
  return {
    id: row.id,
    templateId: row.template_id,
    recipient: row.recipient,
    subject: row.subject,
    previewText: row.preview_text,
    fallbackText: row.fallback_text,
    isTest: Boolean(row.is_test),
    status: row.status,
    errorMessage: row.error_message,
    providerId: row.provider_id,
    createdAt: String(row.created_at),
  };
}

function fromAddress(): string {
  return env("RESEND_FROM_EMAIL") ?? "Stillmail <onboarding@resend.dev>";
}

export const getProviderStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<MailProviderStatus> => {
    return {
      configured: Boolean(env("RESEND_API_KEY")),
      provider: "resend",
      fromEmail: fromAddress(),
    };
  });

export const getActiveTemplate = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ActiveTemplate | null> => {
    const sql = await getSql();
    const rows = await sql<TemplateRow>`
      select id, name, mime_type, width, height, alt_text, file_size,
             original_filename, active, created_at::text as created_at,
             updated_at::text as updated_at, image_data
      from email_templates
      where user_id = ${context.userId} and active = true
      order by updated_at desc
      limit 1
    `;
    const row = rows[0];
    if (!row?.image_data) return null;
    return {
      ...mapTemplate(row),
      dataUrl: `data:${row.mime_type};base64,${row.image_data}`,
    };
  });

export const ensureTripTemplate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ActiveTemplate | null> => {
    const sql = await getSql();
    const existing = await sql<TemplateRow>`
      select id, name, mime_type, width, height, alt_text, file_size,
             original_filename, active, created_at::text as created_at,
             updated_at::text as updated_at, image_data
      from email_templates
      where user_id = ${context.userId} and active = true
      limit 1
    `;
    if (existing[0]?.image_data) {
      return { ...mapTemplate(existing[0]), dataUrl: `data:${existing[0].mime_type};base64,${existing[0].image_data}` };
    }

    const response = await fetch(TRIP_TEMPLATE_SOURCE_URL);
    if (!response.ok) throw new Error("Could not load the Trip template artwork.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    const imageBase64 = Buffer.from(bytes).toString("base64");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await sql`
      insert into email_templates (
        id, user_id, name, mime_type, width, height, alt_text, file_size,
        original_filename, image_data, active
      ) values (
        ${id}, ${context.userId}, ${"Trip Welcome Email"}, ${"image/png"},
        ${1024}, ${1536}, ${"Trip welcome email design"}, ${bytes.byteLength},
        ${"trip-email-template.png"}, ${imageBase64}, true
      )
    `;
    return {
      id,
      name: "Trip Welcome Email",
      mimeType: "image/png",
      width: 1024,
      height: 1536,
      altText: "Trip welcome email design",
      fileSize: bytes.byteLength,
      originalFilename: "trip-email-template.png",
      active: true,
      createdAt: now,
      updatedAt: now,
      dataUrl: `data:image/png;base64,${imageBase64}`,
    };
  });

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => saveTemplateInput.parse(input))
  .handler(async ({ context, data }): Promise<ActiveTemplate> => {
    const bytes = decodeBase64(data.imageBase64);
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Image must be 5 MB or smaller.");
    }
    const mime = sniffImageMime(bytes);
    if (!mime) {
      throw new Error("Upload a PNG or JPEG. The original file is stored as-is.");
    }

    const sql = await getSql();
    const id = crypto.randomUUID();
    const filename = data.originalFilename.replace(/[^\w.\- ]+/g, "") || `email-template.${extensionForMime(mime)}`;

    await sql`
      update email_templates
      set active = false, updated_at = now()
      where user_id = ${context.userId} and active = true
    `;

    await sql`
      insert into email_templates (
        id, user_id, name, mime_type, width, height, alt_text, file_size,
        original_filename, image_data, active
      ) values (
        ${id},
        ${context.userId},
        ${data.name},
        ${mime},
        ${data.width},
        ${data.height},
        ${data.altText},
        ${bytes.byteLength},
        ${filename},
        ${data.imageBase64},
        true
      )
    `;

    return {
      id,
      name: data.name,
      mimeType: mime,
      width: data.width,
      height: data.height,
      altText: data.altText,
      fileSize: bytes.byteLength,
      originalFilename: filename,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dataUrl: `data:${mime};base64,${data.imageBase64}`,
    };
  });

export const updateTemplateAlt = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ altText: z.string().trim().max(300) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update email_templates
      set alt_text = ${data.altText}, updated_at = now()
      where user_id = ${context.userId} and active = true
    `;
    return { ok: true as const };
  });

export const listSendHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<SendRecord[]> => {
    const sql = await getSql();
    const rows = await sql<HistoryRow>`
      select id, template_id, recipient, subject, preview_text, fallback_text,
             is_test, status, error_message, provider_id, created_at::text as created_at
      from send_history
      where user_id = ${context.userId}
      order by created_at desc
      limit 80
    `;
    return rows.map(mapHistory);
  });

export const sendTemplateEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => sendInput.parse(input))
  .handler(async ({ context, data }): Promise<SendRecord> => {
    const recipient = data.recipient.trim().toLowerCase();
    if (!isValidEmail(recipient)) {
      throw new Error("Enter a valid recipient email address.");
    }

    const sql = await getSql();
    const templates = await sql<TemplateRow>`
      select id, name, mime_type, width, height, alt_text, file_size,
             original_filename, active, created_at::text as created_at,
             updated_at::text as updated_at, image_data
      from email_templates
      where user_id = ${context.userId} and active = true
      limit 1
    `;
    const template = templates[0];
    if (!template?.image_data) {
      throw new Error("Save a PNG or JPEG as your permanent template first.");
    }

    const html = buildEmailHtml({
      altText: template.alt_text,
      width: Number(template.width),
      previewText: data.previewText,
      fallbackText: data.fallbackText,
    });
    const text = buildPlainText({
      altText: template.alt_text,
      fallbackText: data.fallbackText,
      subject: data.subject,
    });

    const id = crypto.randomUUID();
    const filename = `email-template.${extensionForMime(template.mime_type)}`;
    const apiKey = env("RESEND_API_KEY");

    let status: SendRecord["status"] = "queued";
    let errorMessage: string | null = null;
    let providerId: string | null = null;

    if (!apiKey) {
      status = "simulated";
    } else {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(apiKey);
        const result = await resend.emails.send({
          from: fromAddress(),
          to: [recipient],
          subject: data.subject,
          html,
          text,
          attachments: [
            {
              filename,
              content: template.image_data,
              contentId: CID,
              contentType: template.mime_type,
            },
          ],
        });
        if (result.error) {
          status = "failed";
          errorMessage = result.error.message;
        } else {
          status = "sent";
          providerId = result.data?.id ?? null;
        }
      } catch (err) {
        status = "failed";
        errorMessage = err instanceof Error ? err.message : "Send failed.";
      }
    }

    await sql`
      insert into send_history (
        id, user_id, template_id, recipient, subject, preview_text, fallback_text,
        is_test, status, error_message, provider_id
      ) values (
        ${id},
        ${context.userId},
        ${template.id},
        ${recipient},
        ${data.subject},
        ${data.previewText ?? ""},
        ${data.fallbackText ?? ""},
        ${data.isTest ?? false},
        ${status},
        ${errorMessage},
        ${providerId}
      )
    `;

    if (status === "failed") {
      throw new Error(errorMessage || "The email could not be sent.");
    }

    return {
      id,
      templateId: template.id,
      recipient,
      subject: data.subject,
      previewText: data.previewText ?? "",
      fallbackText: data.fallbackText ?? "",
      isTest: Boolean(data.isTest),
      status,
      errorMessage,
      providerId,
      createdAt: new Date().toISOString(),
    };
  });

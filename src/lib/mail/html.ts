import { CID } from "./validate";

const ENTITIES: Record<string, string> = {
  "&": ["&", "amp;"].join(""),
  "<": ["&", "lt;"].join(""),
  ">": ["&", "gt;"].join(""),
  '"': ["&", "quot;"].join(""),
  "'": ["&", "#39;"].join(""),
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ENTITIES[ch] ?? ch);
}

export function buildEmailHtml(input: {
  altText: string;
  width: number;
  previewText?: string;
  fallbackText?: string;
}): string {
  const alt = escapeHtml(input.altText || "Email announcement");
  const width = Math.max(1, Math.round(input.width));
  const preview = input.previewText?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">${escapeHtml(input.previewText.trim())}</div>`
    : "";
  const fallback = input.fallbackText?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#ffffff;">${escapeHtml(input.fallbackText.trim())}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  ${preview}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;">
    <tr>
      <td align="center">
        <img
          src="cid:${CID}"
          alt="${alt}"
          width="${width}"
          style="display:block;width:100%;max-width:${width}px;height:auto;border:0;margin:0 auto;"
        />
      </td>
    </tr>
  </table>
  ${fallback}
</body>
</html>`;
}

export function buildPlainText(input: {
  altText: string;
  fallbackText?: string;
  subject: string;
}): string {
  const fallback = input.fallbackText?.trim();
  if (fallback) return fallback;
  const alt = input.altText.trim();
  if (alt) return alt;
  return input.subject;
}

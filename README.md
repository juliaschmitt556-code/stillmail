# Stillmail

Stillmail sends **pixel-perfect emails from an uploaded image**. The original PNG or JPEG is the template. It is not redrawn with HTML, CSS, background images, or separate text layers.

Colors, typography, spacing, gradients, shadows, logos, and layout stay inside the file you uploaded.

**Repository:** [juliaschmitt556-code/stillmail](https://github.com/juliaschmitt556-code/stillmail)

## What it does

1. **Template upload** — Drop a PNG or JPEG (max 5 MB). Preview it at the original aspect ratio. Add alt text. Save it as the active permanent template. The original bytes and dimensions are stored.
2. **Email composer** — Enter recipient, subject, optional preview text, and optional plain-text fallback. Preview the exact image. Send it, or send a test to your signed-in email.
3. **Send history** — Status for each delivery: sent, simulated, or failed.

The email body is a single responsive image:

```html
<img src="cid:permanent-template" style="display:block;width:100%;height:auto;" />
```

The original file is attached inline with Content-ID `permanent-template`, so it renders in the message instead of as a downloadable attachment.

## Stack

- React + Vite (TanStack Start)
- Postgres for templates and send history
- [Resend](https://resend.com) for delivery (simple email provider)
- Sign-in with Google or X

The Resend API key stays on the server. It is never sent to the browser.

## Email provider

Set these on the server (never in frontend code):

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend secret. Required for live delivery. |
| `RESEND_FROM_EMAIL` | From address, e.g. `Stillmail <hello@yourdomain.com>`. Defaults to Resend’s onboarding address for tests. |

Without `RESEND_API_KEY`, sends are **simulated** and recorded in history so you can try the full workflow. Add the key to deliver real mail.

Resend test domain: `Stillmail <onboarding@resend.dev>` (can send to your own Resend account email). For production, verify your domain in Resend and set `RESEND_FROM_EMAIL`.

## Image rules

- Formats: PNG or JPEG only (magic-byte checked)
- Max size: 5 MB
- Recommended width: 600–800 px
- Useful maximum: 1200 px
- Original aspect ratio preserved
- No automatic resize, recolor, crop, or conversion

Use PNG for text, logos, sharp edges, and flat color. Use JPEG for photography and heavy illustration.

## Accessibility

Image-only mail disappears when a client blocks images. Stillmail always includes:

- Meaningful `alt` on the image
- Optional preview / preheader text
- Optional plain-text fallback body

## Limitations

No provider can guarantee pixel-perfect rendering in every client. Recipients may block images, use dark mode, zoom, or a narrow screen. When images are allowed, embedding the original file is the closest way to keep the design exact.

## Local development

```bash
npm install
npm run dev
```

Sign in, upload a PNG or JPEG, save it, then send a test.

```bash
npm run build
npm run typecheck
```

## License

Private use unless you add a license.

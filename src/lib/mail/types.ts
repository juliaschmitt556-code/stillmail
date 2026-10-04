export type TemplateMeta = {
  id: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  altText: string;
  fileSize: number;
  originalFilename: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ActiveTemplate = TemplateMeta & {
  dataUrl: string;
};

export type SendRecord = {
  id: string;
  templateId: string | null;
  recipient: string;
  subject: string;
  previewText: string;
  fallbackText: string;
  isTest: boolean;
  status: "queued" | "sent" | "failed" | "simulated";
  errorMessage: string | null;
  providerId: string | null;
  createdAt: string;
};

export type MailProviderStatus = {
  configured: boolean;
  provider: "resend";
  fromEmail: string;
};

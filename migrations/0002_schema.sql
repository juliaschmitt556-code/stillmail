-- Stillmail: one original image template + send history per user.

create table if not exists email_templates (
  id text primary key,
  user_id text not null,
  name text not null default 'Permanent Campaign Template',
  mime_type text not null,
  width integer not null,
  height integer not null,
  alt_text text not null default '',
  file_size integer not null,
  original_filename text not null default 'email-template.png',
  image_data text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_templates_user_id_idx
  on email_templates (user_id);

create table if not exists send_history (
  id text primary key,
  user_id text not null,
  template_id text,
  recipient text not null,
  subject text not null,
  preview_text text not null default '',
  fallback_text text not null default '',
  is_test boolean not null default false,
  status text not null,
  error_message text,
  provider_id text,
  created_at timestamptz not null default now()
);

create index if not exists send_history_user_idx
  on send_history (user_id, created_at desc);

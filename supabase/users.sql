-- KTIS X VISIT FARM
-- Simple username/password users (plaintext password per project requirement)
--
-- NOTE:
-- - This is intentionally NOT using Supabase Auth.
-- - Passwords are stored in plaintext as requested (not recommended for production).
-- - `promoter_id` is reserved for future linking with `promoters`.

create extension if not exists pgcrypto;

create table if not exists public.ktisx_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  username text not null unique,
  password text not null,
  role text not null,

  promoter_id text,

  constraint ktisx_users_role_chk check (role in ('user', 'admin'))
);


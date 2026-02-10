-- Create KV table required by Edge Function
create table if not exists public.kv_store_e04b5d68 (
  key text primary key,
  value jsonb not null
);



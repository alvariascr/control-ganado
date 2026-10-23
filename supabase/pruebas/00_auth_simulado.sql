-- Simula lo mínimo de Supabase Auth para probar los scripts en un Postgres local:
-- la tabla auth.users, la función auth.uid() (que lee el usuario de la variable test.uid)
-- y los roles anon y authenticated.
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;
create role authenticated;
create role anon;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'luis@x.com');

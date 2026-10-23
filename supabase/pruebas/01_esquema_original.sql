-- El primer esquema que se corrió en Supabase (compras y ventas), antes del cambio 001.
create table compras (id uuid primary key default gen_random_uuid(), fecha date not null default current_date, descripcion text not null, monto numeric not null check (monto > 0), usuario_id uuid references auth.users(id) default auth.uid(), creado_en timestamptz not null default now());
create table ventas (id uuid primary key default gen_random_uuid(), fecha date not null default current_date, descripcion text not null, monto numeric not null check (monto > 0), usuario_id uuid references auth.users(id) default auth.uid(), creado_en timestamptz not null default now());
create view v_resumen as select 1 as x;
alter table compras enable row level security;
alter table ventas enable row level security;
create policy "autenticados_todo_compras" on compras for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "autenticados_todo_ventas" on ventas for all using (auth.uid() is not null) with check (auth.uid() is not null);
grant select, insert, update, delete on compras, ventas to authenticated;

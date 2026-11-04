-- Cambio 007: aportes semanales para pagar a los trabajadores.
-- Cada finca anota quiénes ponen plata (con su aporte de cada semana) y, semana por semana,
-- cuánto puso cada uno. No toca a los animales ni a las compras.
--
-- Correr UNA sola vez en Supabase (SQL Editor -> New query -> pegar -> Run).

-- Las personas que aportan. monto_semanal es lo que pone normalmente cada semana; la app lo
-- usa para llenar el monto. "activo = false" es para alguien que ya no aporta (se guarda lo
-- que ya puso).
create table aportantes (
  id uuid primary key default gen_random_uuid(),
  finca_id uuid not null default mi_finca() references fincas(id) on delete restrict,
  nombre text not null check (length(trim(nombre)) > 0),
  monto_semanal numeric not null check (monto_semanal > 0 and monto_semanal <= 250000),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  unique (id, finca_id),
  unique (finca_id, nombre)
);

-- Lo que puso una persona en una semana. "semana" es el lunes de esa semana; cada persona
-- tiene a lo sumo un aporte por semana. La persona tiene que ser de la misma finca, y no se
-- puede eliminar a alguien que ya tiene aportes.
create table aportes (
  id uuid primary key default gen_random_uuid(),
  finca_id uuid not null default mi_finca(),
  aportante_id uuid not null,
  semana date not null check (extract(isodow from semana) = 1),
  monto numeric not null check (monto > 0 and monto <= 250000),
  usuario_id uuid references auth.users(id) default auth.uid(),
  creado_en timestamptz not null default now(),
  unique (aportante_id, semana),
  foreign key (aportante_id, finca_id) references aportantes(id, finca_id) on delete restrict
);

create index idx_aportes_finca_semana on aportes(finca_id, semana desc);

-- ============ SEGURIDAD ============

alter table aportantes enable row level security;
alter table aportes enable row level security;

create policy "finca_propia_aportantes" on aportantes
  for all using (finca_id = mi_finca()) with check (finca_id = mi_finca());

create policy "finca_propia_aportes" on aportes
  for all using (finca_id = mi_finca()) with check (finca_id = mi_finca());

grant select, insert, update, delete on aportantes, aportes to authenticated;

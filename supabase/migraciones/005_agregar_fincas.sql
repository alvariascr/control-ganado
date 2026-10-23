-- Cambio 005: varias fincas, cada cuenta entra a la suya.
-- Cada cuenta (usuario de Authentication) tiene asignada una finca. Al iniciar sesión solo ve
-- y cambia los terneros y compras de esa finca. Varias cuentas pueden tener la misma finca.
--
-- Los datos que ya existen pasan a una finca nueva llamada "Mi finca", y todas las cuentas
-- que ya existen quedan asignadas a ella.
--
-- Para agregar una finca nueva después: crear la cuenta en Authentication -> Add user y
-- correr en el SQL Editor (cambiando el correo y el nombre):
--   select asignar_finca('correo@ejemplo.com', 'Finca Nicoya');
--
-- Correr UNA sola vez en Supabase (SQL Editor -> New query -> pegar -> Run).

-- ============ TABLAS ============

create table fincas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (length(trim(nombre)) > 0),
  creado_en timestamptz not null default now()
);

-- A qué finca entra cada cuenta.
create table cuentas_finca (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  finca_id uuid not null references fincas(id) on delete cascade,
  creado_en timestamptz not null default now()
);

create index idx_cuentas_finca_finca on cuentas_finca(finca_id);

-- ============ FUNCIONES ============

-- Finca de la cuenta con sesión abierta (null si no tiene). security definer para poder leer
-- cuentas_finca sin pasar por sus reglas de seguridad.
create function mi_finca() returns uuid
language sql stable security definer set search_path = public as $$
  select finca_id from cuentas_finca where usuario_id = auth.uid();
$$;

-- Asigna una cuenta a una finca, y crea la finca si no existe. Solo se corre desde el SQL
-- Editor de Supabase (la app no tiene permiso).
create function asignar_finca(p_correo text, p_finca text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_usuario uuid;
  v_finca uuid;
begin
  select id into v_usuario from auth.users where lower(email) = lower(trim(p_correo));
  if v_usuario is null then
    raise exception 'No existe la cuenta %. Créala primero en Authentication -> Add user.', p_correo;
  end if;
  insert into fincas (nombre) values (trim(p_finca))
  on conflict (nombre) do nothing;
  select id into v_finca from fincas where nombre = trim(p_finca);
  insert into cuentas_finca (usuario_id, finca_id) values (v_usuario, v_finca)
  on conflict (usuario_id) do update set finca_id = excluded.finca_id;
  return p_correo || ' ahora entra a ' || trim(p_finca);
end;
$$;

revoke execute on function mi_finca(), asignar_finca(text, text) from public, anon, authenticated;
grant execute on function mi_finca() to authenticated;

-- ============ PASAR LOS DATOS ACTUALES A "Mi finca" ============

do $$
declare
  v_finca uuid;
begin
  insert into fincas (nombre) values ('Mi finca') returning id into v_finca;
  insert into cuentas_finca (usuario_id, finca_id) select id, v_finca from auth.users;
end $$;

-- finca_id se llena solo con la finca de quien registra, así la app no tiene que mandarlo.
alter table animales add column finca_id uuid references fincas(id) on delete restrict;
alter table compras add column finca_id uuid references fincas(id) on delete restrict;
update animales set finca_id = (select id from fincas where nombre = 'Mi finca');
update compras set finca_id = (select id from fincas where nombre = 'Mi finca');
alter table animales alter column finca_id set not null, alter column finca_id set default mi_finca();
alter table compras alter column finca_id set not null, alter column finca_id set default mi_finca();

create index idx_animales_finca on animales(finca_id);
create index idx_compras_finca on compras(finca_id);

-- Una compra "solo para" un ternero tiene que ser de la misma finca que ese ternero.
alter table animales add constraint animales_id_finca_unico unique (id, finca_id);
alter table compras drop constraint compras_animal_id_fkey;
alter table compras
  add constraint compras_animal_misma_finca
  foreign key (animal_id, finca_id) references animales(id, finca_id) on delete restrict;

-- ============ VISTAS ============

-- Igual que antes, pero una compra "para todos" solo se reparte entre los terneros de su
-- misma finca.
create or replace view v_gasto_animal as
select c.animal_id, c.id as compra_id, c.fecha, c.descripcion, c.monto as monto_compra,
  c.monto as monto_animal, false as compartida
from compras c
where c.animal_id is not null
union all
select a.id, c.id, c.fecha, c.descripcion, c.monto,
  round(c.monto / count(*) over (partition by c.id), 2), true
from compras c
join animales a
  on a.finca_id = c.finca_id
 and a.fecha_compra <= c.fecha
 and (coalesce(a.fecha_venta, a.fecha_muerte) is null
      or coalesce(a.fecha_venta, a.fecha_muerte) > c.fecha)
where c.animal_id is null;

-- Totales de la finca. compras_sin_ternero: compras "para todos" de un día en que no había
-- terneros en la finca, así que no se le cargaron a ninguno. Como la seguridad solo deja ver
-- los datos de la finca propia, cada cuenta ve los números de su finca.
create or replace view v_resumen as
select
  (select count(*) from animales where fecha_venta is null and fecha_muerte is null)
    as terneros_en_finca,
  (select count(*) from animales where fecha_venta is not null) as terneros_vendidos,
  (select coalesce(sum(precio_compra), 0) from animales) as total_ganado,
  (select coalesce(sum(monto), 0) from compras) as total_compras,
  (select coalesce(sum(precio_venta), 0) from animales) as total_ventas,
  (select coalesce(sum(precio_venta), 0) from animales)
    - (select coalesce(sum(precio_compra), 0) from animales)
    - (select coalesce(sum(monto), 0) from compras) as balance,
  (select coalesce(sum(monto), 0) from compras c
    where not exists (select 1 from v_gasto_animal g where g.compra_id = c.id)
  ) as compras_sin_ternero,
  (select count(*) from animales where fecha_muerte is not null) as terneros_muertos;

-- "create or replace view" borra este ajuste, así que hay que ponerlo de nuevo en las tres
-- vistas (también en v_resumen_animal, que se reemplazó en los cambios 003 y 004). Sin él,
-- las vistas se saltan la seguridad y una cuenta vería los terneros de otras fincas.
alter view v_gasto_animal set (security_invoker = on);
alter view v_resumen_animal set (security_invoker = on);
alter view v_resumen set (security_invoker = on);

-- ============ SEGURIDAD ============
-- Antes cualquier cuenta veía todo. Ahora cada cuenta solo ve y cambia lo de su finca.

drop policy "autenticados_todo_animales" on animales;
drop policy "autenticados_todo_compras" on compras;

create policy "finca_propia_animales" on animales
  for all using (finca_id = mi_finca()) with check (finca_id = mi_finca());

create policy "finca_propia_compras" on compras
  for all using (finca_id = mi_finca()) with check (finca_id = mi_finca());

alter table fincas enable row level security;
alter table cuentas_finca enable row level security;

-- La app solo necesita leer el nombre de su finca para mostrarlo arriba.
create policy "ver_finca_propia" on fincas for select using (id = mi_finca());

grant select on fincas to authenticated;

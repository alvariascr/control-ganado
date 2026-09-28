-- Esquema completo de la base de datos de Control Ganado (para una base NUEVA).
-- Correr completo en Supabase: Dashboard -> SQL Editor -> New query -> pegar y ejecutar (Run).
-- Si la base ya existe, no correr esto: usar los scripts de supabase/migraciones/ que falten.
--
-- - animales: cada ternero con lo que costó y, cuando se vende, en cuánto se vendió.
-- - compras: productos (concentrado, pacas, medicina...). Pueden ser para todos los terneros
--   (se dividen entre los que estaban en la finca ese día) o para uno específico.

create extension if not exists "pgcrypto";

-- ============ TABLAS ============

create table if not exists animales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  fecha_compra date not null default current_date,
  precio_compra numeric not null check (precio_compra >= 0),
  -- Venta: las dos vacías mientras el ternero esté en la finca. precio_venta es lo que
  -- realmente entró, ya restando comisión de subasta, flete, etc.
  fecha_venta date,
  precio_venta numeric check (precio_venta is null or precio_venta >= 0),
  usuario_id uuid references auth.users(id) default auth.uid(),
  creado_en timestamptz not null default now(),
  -- Si murió. Un ternero puede estar vendido o muerto, no las dos cosas.
  fecha_muerte date,
  check ((fecha_venta is null) = (precio_venta is null)),
  check (fecha_venta is null or fecha_venta >= fecha_compra),
  constraint animales_fecha_muerte_valida
    check (fecha_muerte is null or fecha_muerte >= fecha_compra),
  constraint animales_vendido_o_muerto
    check (fecha_venta is null or fecha_muerte is null),
  -- Máximos (los mismos que en src/lib/limites.ts).
  constraint animales_precio_compra_maximo check (precio_compra <= 1000000),
  constraint animales_precio_venta_maximo check (precio_venta <= 1000000)
);

create table if not exists compras (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  descripcion text not null,
  monto numeric not null check (monto > 0),
  -- Máximo (el mismo que en src/lib/limites.ts).
  constraint compras_monto_maximo check (monto <= 250000),
  -- Vacío = para todos los terneros. Con valor = solo para ese ternero.
  animal_id uuid references animales(id) on delete restrict,
  -- Quién lo registró (se llena solo con el usuario que tiene la sesión abierta).
  usuario_id uuid references auth.users(id) default auth.uid(),
  creado_en timestamptz not null default now()
);

create index if not exists idx_compras_animal on compras(animal_id);

-- ============ VISTAS ============

-- Parte de cada compra que le toca a cada ternero:
-- - compra para un ternero específico: completa a ese ternero.
-- - compra para todos: dividida en partes iguales entre los terneros que estaban en la
--   finca ese día (ya comprados, y todavía sin vender ni muertos).
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
  on a.fecha_compra <= c.fecha
 and (coalesce(a.fecha_venta, a.fecha_muerte) is null
      or coalesce(a.fecha_venta, a.fecha_muerte) > c.fecha)
where c.animal_id is null;

-- ganancia: en un ternero que murió es la pérdida de todo lo invertido.
create or replace view v_resumen_animal as
select
  a.id as animal_id,
  a.nombre,
  a.fecha_compra,
  a.precio_compra,
  coalesce(g.gastos, 0) as gastos,
  a.precio_compra + coalesce(g.gastos, 0) as invertido,
  a.fecha_venta,
  a.precio_venta,
  case
    when a.fecha_muerte is not null then -(a.precio_compra + coalesce(g.gastos, 0))
    else a.precio_venta - (a.precio_compra + coalesce(g.gastos, 0))
  end as ganancia,
  coalesce(a.fecha_venta, a.fecha_muerte, current_date) - a.fecha_compra as dias,
  a.creado_en,
  a.fecha_muerte
from animales a
left join (select animal_id, sum(monto_animal) as gastos from v_gasto_animal group by animal_id) g
  on g.animal_id = a.id;

-- Totales. compras_sin_ternero: compras "para todos" de un día en que no había terneros en
-- la finca (por ejemplo, si se anotó un saco antes de registrar los terneros). Cuentan en el
-- total pero no se le cargan a ninguno, así que se muestran aparte para que se noten.
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

-- Postgres 15+: hace que las vistas respeten el RLS del usuario que consulta.
alter view v_gasto_animal set (security_invoker = on);
alter view v_resumen_animal set (security_invoker = on);
alter view v_resumen set (security_invoker = on);

-- ============ SEGURIDAD ============
-- Solo los usuarios con sesión (los socios, creados a mano en Authentication -> Add user)
-- pueden leer y escribir. Nadie sin sesión puede.

alter table animales enable row level security;
alter table compras enable row level security;

create policy "autenticados_todo_animales" on animales
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "autenticados_todo_compras" on compras
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

grant select, insert, update, delete on animales, compras to authenticated;
grant select on v_gasto_animal, v_resumen_animal, v_resumen to authenticated;

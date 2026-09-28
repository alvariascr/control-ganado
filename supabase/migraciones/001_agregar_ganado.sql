-- Cambio 001: separar el ganado de las compras.
-- Correr UNA sola vez en Supabase (SQL Editor -> New query -> pegar -> Run) sobre la base
-- que ya tiene el esquema anterior (compras + ventas). Si la base es nueva, no hace falta:
-- basta con correr schema.sql, que ya incluye todo esto.
--
-- Qué hace:
-- 1. Crea la tabla animales (cada ternero con su compra y, cuando pase, su venta).
-- 2. Agrega a compras la columna animal_id: vacía = para todos los terneros; con valor =
--    solo para ese ternero.
-- 3. Quita la tabla ventas (la venta ahora se registra en cada ternero). Si tiene datos, el
--    script se detiene sin cambiar nada, para no perderlos.
-- 4. Rehace el resumen y agrega las vistas de gasto por ternero.

do $$
begin
  if exists (select 1 from ventas) then
    raise exception 'La tabla ventas tiene datos. Anótalos aparte y bórralos antes de correr este script.';
  end if;
end $$;

drop view if exists v_resumen;
drop table ventas;

create table animales (
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
  check ((fecha_venta is null) = (precio_venta is null)),
  check (fecha_venta is null or fecha_venta >= fecha_compra)
);

alter table compras
  add column animal_id uuid references animales(id) on delete restrict;

create index idx_compras_animal on compras(animal_id);

-- Parte de cada compra que le toca a cada ternero:
-- - compra para un ternero específico: completa a ese ternero.
-- - compra para todos: dividida en partes iguales entre los terneros que estaban en la
--   finca ese día (ya comprados y todavía sin vender).
create view v_gasto_animal as
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
 and (a.fecha_venta is null or a.fecha_venta > c.fecha)
where c.animal_id is null;

create view v_resumen_animal as
select
  a.id as animal_id,
  a.nombre,
  a.fecha_compra,
  a.precio_compra,
  coalesce(g.gastos, 0) as gastos,
  a.precio_compra + coalesce(g.gastos, 0) as invertido,
  a.fecha_venta,
  a.precio_venta,
  a.precio_venta - (a.precio_compra + coalesce(g.gastos, 0)) as ganancia,
  coalesce(a.fecha_venta, current_date) - a.fecha_compra as dias
from animales a
left join (select animal_id, sum(monto_animal) as gastos from v_gasto_animal group by animal_id) g
  on g.animal_id = a.id;

-- Totales. compras_sin_ternero: compras "para todos" de un día en que no había terneros en
-- la finca (por ejemplo, si se anotó un saco antes de registrar los terneros). Cuentan en el
-- total pero no se le cargan a ninguno, así que se muestran aparte para que se noten.
create view v_resumen as
select
  (select count(*) from animales where fecha_venta is null) as terneros_en_finca,
  (select count(*) from animales where fecha_venta is not null) as terneros_vendidos,
  (select coalesce(sum(precio_compra), 0) from animales) as total_ganado,
  (select coalesce(sum(monto), 0) from compras) as total_compras,
  (select coalesce(sum(precio_venta), 0) from animales) as total_ventas,
  (select coalesce(sum(precio_venta), 0) from animales)
    - (select coalesce(sum(precio_compra), 0) from animales)
    - (select coalesce(sum(monto), 0) from compras) as balance,
  (select coalesce(sum(monto), 0) from compras c
    where not exists (select 1 from v_gasto_animal g where g.compra_id = c.id)
  ) as compras_sin_ternero;

alter view v_gasto_animal set (security_invoker = on);
alter view v_resumen_animal set (security_invoker = on);
alter view v_resumen set (security_invoker = on);

alter table animales enable row level security;

create policy "autenticados_todo_animales" on animales
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

grant select, insert, update, delete on animales to authenticated;
grant select on v_gasto_animal, v_resumen_animal, v_resumen to authenticated;

-- Cambio 004: poder registrar que un ternero murió.
-- Desde la fecha de muerte ya no se le cargan compras "para todos", y lo invertido en él
-- cuenta como pérdida.
--
-- Correr UNA sola vez en Supabase (SQL Editor -> New query -> pegar -> Run).
-- "create or replace view" solo permite agregar columnas al final, por eso las nuevas van
-- de últimas.

alter table animales
  add column fecha_muerte date,
  add constraint animales_fecha_muerte_valida
    check (fecha_muerte is null or fecha_muerte >= fecha_compra),
  add constraint animales_vendido_o_muerto
    check (fecha_venta is null or fecha_muerte is null);

-- Igual que antes, pero un ternero deja de recibir compras "para todos" tanto si se vendió
-- como si murió.
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

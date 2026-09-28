-- Cambio 003: agregar creado_en a la vista v_resumen_animal, para que la app muestre los
-- terneros en el orden en que se agregaron (y no cambien de lugar al editarlos).
--
-- Correr UNA sola vez en Supabase (SQL Editor -> New query -> pegar -> Run).
-- "create or replace view" solo permite agregar columnas al final, por eso va de última.

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
  a.precio_venta - (a.precio_compra + coalesce(g.gastos, 0)) as ganancia,
  coalesce(a.fecha_venta, current_date) - a.fecha_compra as dias,
  a.creado_en
from animales a
left join (select animal_id, sum(monto_animal) as gastos from v_gasto_animal group by animal_id) g
  on g.animal_id = a.id;

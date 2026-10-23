-- Cambio 006: hato completo y sanidad.
-- 1. Cada animal pasa a tener tipo (toro, vaca, novilla, novillo, ternera, ternero), color,
--    fecha de nacimiento, mamá, dueño (vacío = de la finca), lugar (finca o potrero) y nota.
-- 2. Tablas para registrar tratamientos y baños, y a qué animales se les aplicaron (o les
--    quedó pendiente).
-- 3. Las compras "para todos" se reparten solo entre los animales de la finca, no entre el
--    ganado de otros dueños.
--
-- Los animales que ya existen quedan como "Ternero", de la finca, en "Finca". No se borra ni se
-- cambia ningún dato.
--
-- Correr UNA sola vez en Supabase (SQL Editor -> New query -> pegar -> Run).

-- ============ ANIMALES ============

alter table animales
  add column tipo text not null default 'Ternero'
    check (tipo in ('Toro', 'Vaca', 'Novilla', 'Novillo', 'Ternera', 'Ternero')),
  add column color text,
  add column fecha_nacimiento date,
  add column madre_id uuid,
  -- Vacío = de la finca. Con valor = ganado de otra persona (por ejemplo "Freddy Durán").
  add column duenio text check (duenio is null or length(trim(duenio)) > 0),
  add column lugar text not null default 'Finca' check (lugar in ('Finca', 'Potrero')),
  add column nota text;

-- La mamá tiene que ser de la misma finca. Si se elimina la mamá, la cría se queda sin mamá
-- registrada (solo se vacía madre_id).
alter table animales
  add constraint animales_madre_misma_finca
    foreign key (madre_id, finca_id) references animales(id, finca_id)
    on delete set null (madre_id),
  add constraint animales_no_es_su_propia_madre check (madre_id is null or madre_id <> id);

create index idx_animales_madre on animales(madre_id);

-- ============ SANIDAD ============

-- Un tratamiento o un baño, aplicado un día. "grupo" es solo cómo se eligió a quiénes (para
-- mostrarlo); a quiénes se les aplicó de verdad queda en aplicacion_animales.
create table aplicaciones (
  id uuid primary key default gen_random_uuid(),
  finca_id uuid not null default mi_finca() references fincas(id) on delete restrict,
  fecha date not null default current_date,
  clase text not null check (clase in ('Tratamiento', 'Baño')),
  producto text not null check (length(trim(producto)) > 0),
  dosis text,
  grupo text not null check (grupo in ('todos', 'vacas', 'finca', 'potrero', 'elegidos')),
  proxima date check (proxima is null or proxima >= fecha),
  usuario_id uuid references auth.users(id) default auth.uid(),
  creado_en timestamptz not null default now(),
  unique (id, finca_id)
);

create index idx_aplicaciones_finca_fecha on aplicaciones(finca_id, fecha desc);

-- A qué animales se les aplicó (o les quedó pendiente). La aplicación y el animal tienen que
-- ser de la misma finca.
create table aplicacion_animales (
  aplicacion_id uuid not null,
  animal_id uuid not null,
  finca_id uuid not null default mi_finca(),
  estado text not null default 'aplicado' check (estado in ('aplicado', 'pendiente')),
  primary key (aplicacion_id, animal_id),
  foreign key (aplicacion_id, finca_id) references aplicaciones(id, finca_id) on delete cascade,
  foreign key (animal_id, finca_id) references animales(id, finca_id) on delete cascade
);

create index idx_aplicacion_animales_animal on aplicacion_animales(animal_id);

-- ============ VISTAS ============

-- Igual que antes, pero una compra "para todos" se reparte solo entre los animales de la
-- finca (duenio vacío), no entre el ganado de otras personas.
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
 and a.duenio is null
 and a.fecha_compra <= c.fecha
 and (coalesce(a.fecha_venta, a.fecha_muerte) is null
      or coalesce(a.fecha_venta, a.fecha_muerte) > c.fecha)
where c.animal_id is null;

-- Igual que antes, con los datos nuevos del animal al final.
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
  a.fecha_muerte,
  a.finca_id,
  a.tipo,
  a.color,
  a.fecha_nacimiento,
  a.madre_id,
  a.duenio,
  a.lugar,
  a.nota
from animales a
left join (select animal_id, sum(monto_animal) as gastos from v_gasto_animal group by animal_id) g
  on g.animal_id = a.id;

-- "create or replace view" borra este ajuste, así que hay que ponerlo de nuevo. Sin él, las
-- vistas se saltan la seguridad y una cuenta vería los datos de otras fincas.
alter view v_gasto_animal set (security_invoker = on);
alter view v_resumen_animal set (security_invoker = on);

-- ============ SEGURIDAD ============

alter table aplicaciones enable row level security;
alter table aplicacion_animales enable row level security;

create policy "finca_propia_aplicaciones" on aplicaciones
  for all using (finca_id = mi_finca()) with check (finca_id = mi_finca());

create policy "finca_propia_aplicacion_animales" on aplicacion_animales
  for all using (finca_id = mi_finca()) with check (finca_id = mi_finca());

grant select, insert, update, delete on aplicaciones, aplicacion_animales to authenticated;

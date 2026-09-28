-- Cambio 002: poner un máximo a los montos, para que no se guarden cifras equivocadas
-- (por ejemplo, un cero de más).
-- - Compras de productos: hasta ₡250.000 cada una.
-- - Precio de compra y de venta de un ternero: hasta ₡1.000.000.
-- La app tiene los mismos límites (src/lib/limites.ts); si se cambian, cambiar los dos.
--
-- Correr UNA sola vez en Supabase (SQL Editor -> New query -> pegar -> Run). Si ya hay algún
-- dato que pase del límite, Supabase no deja agregar la regla y muestra un error: corregir
-- ese dato en la app y volver a correr el script.

alter table compras
  add constraint compras_monto_maximo check (monto <= 250000);

alter table animales
  add constraint animales_precio_compra_maximo check (precio_compra <= 1000000),
  add constraint animales_precio_venta_maximo check (precio_venta <= 1000000);

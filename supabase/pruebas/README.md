# Pruebas de los scripts de la base

Para probar los scripts de `supabase/migraciones/` en un Postgres local (Docker), antes de
correrlos en Supabase:

1. `00_auth_simulado.sql`: simula Supabase Auth (usuarios y `auth.uid()`).
2. `01_esquema_original.sql`: el esquema con el que empezó la base.
3. Los scripts de `supabase/migraciones/` en orden.

Para simular a un usuario con sesión: `set role authenticated; set test.uid = '<id>';`.

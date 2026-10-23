# Control Ganado

App web para llevar el control de una o varias fincas de ganado: el hato (con mamás, crías,
dueños y lugar), la sanidad (tratamientos y baños) y la plata (compras, lo invertido en cada
animal, ventas y ganancia). Funciona en el celular y en la computadora.

Cada cuenta entra a una sola finca y solo ve los datos de esa finca.

## 1. Base de datos (Supabase)

1. En el proyecto de Supabase, ir a **SQL Editor → New query**, pegar todo
   [`supabase/schema.sql`](supabase/schema.sql) y darle **Run**.
2. En **Authentication → Users → Add user → Create new user**, crear una cuenta (correo y
   contraseña), marcando **Auto Confirm User**. No hay registro público.
3. Asignarle su finca en el SQL Editor (si la finca no existe, se crea):
   `select asignar_finca('correo@ejemplo.com', 'Nombre de la finca');`

## 2. Correr la app en la computadora

```bash
npm install
cp .env.example .env
```

Editar `.env` con los datos de **Project Settings → API Keys** del proyecto de Supabase:

- `VITE_SUPABASE_URL`: la Project URL (`https://xxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: la **publishable key** (`sb_publishable_...`)

Nunca pegar aquí la **secret key** (`sb_secret_...`).

```bash
npm run dev
```

## 3. Publicar en GitHub Pages

1. Crear un repo en GitHub y subir este proyecto a la rama `main`.
2. En el repo: **Settings → Pages → Source: GitHub Actions**.
3. En **Settings → Secrets and variables → Actions**, crear los secretos
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los mismos valores del `.env`.
4. Cada push a `main` publica la app en `https://<usuario>.github.io/<repo>/`.

## Cómo está organizada

- **Ganado**: el hato (toros, vacas, novillas, novillos y crías) con filtros por tipo, lugar
  (finca o potrero) y dueño. Al tocar un animal se abre su ficha: datos, mamá y crías,
  registrar parto, moverlo de lugar, su historial de sanidad y, si es de la finca, la plata
  (lo invertido, en qué, y la venta o muerte).
- **Sanidad**: tratamientos y baños. Se registran para todo el hato, un grupo o animales
  elegidos, con los que quedaron pendientes y la próxima fecha. Muestra lo próximo a aplicar
  (en rojo si ya venció), los pendientes y el historial.
- **Compras**: los gastos con plata. Cada compra puede ser "para todos los animales de la
  finca" (se divide en partes iguales entre los que estaban ese día; el ganado de otros dueños
  no entra) o para un animal específico.

## Cambios a la base

Si la base ya existe, correr en orden los scripts de [`supabase/migraciones/`](supabase/migraciones)
que todavía no se hayan corrido. [`supabase/schema.sql`](supabase/schema.sql) es el esquema
completo, solo para una base nueva.

Antes de correr un script en Supabase, se prueba en un Postgres local: ver
[`supabase/pruebas/`](supabase/pruebas).

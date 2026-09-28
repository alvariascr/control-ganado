# 🐂 Control Ganado

App web sencilla para llevar el registro de compras y ventas de los terneros entre los socios.
Pensada para usarse desde el celular: cada socio inicia sesión, anota lo que se compra
(terneros, concentrado, pacas, medicina...) y lo que se vende, y la app muestra cuánto se ha
invertido, cuánto se ha vendido y la ganancia.

## 1. Base de datos (Supabase)

1. En el proyecto de Supabase, ir a **SQL Editor → New query**, pegar todo
   [`supabase/schema.sql`](supabase/schema.sql) y darle **Run**.
2. En **Authentication → Users → Add user → Create new user**, crear un usuario (correo y
   contraseña) para cada socio, marcando **Auto Confirm User**. No hay registro público.

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

- **Compras**: productos (concentrado, pacas, medicina...). Cada compra puede ser "para todos
  los terneros" (se divide en partes iguales entre los que estaban en la finca ese día) o para
  un ternero específico (se le carga completa). Tocar una compra para editarla o eliminarla.
- **Ganado**: lista de terneros con lo invertido en cada uno (o la ganancia, si ya se vendió).
  Al tocar uno se ve el detalle de en qué se le ha gastado, y ahí se registra la venta, se
  editan sus datos o se elimina.

## Cambios a la base

Si la base ya existe, correr en orden los scripts de [`supabase/migraciones/`](supabase/migraciones)
que todavía no se hayan corrido. [`supabase/schema.sql`](supabase/schema.sql) es el esquema
completo, solo para una base nueva.

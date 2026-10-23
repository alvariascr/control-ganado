-- Esquema completo de la base de Control Ganado, para una base NUEVA de Supabase.
-- Correr completo en Supabase: SQL Editor -> New query -> pegar -> Run.
-- Si la base ya existe, no correr esto: usar los scripts de supabase/migraciones/ que falten.
--
-- Se genera con pg_dump después de aplicar en orden todos los scripts de migraciones/, así
-- que siempre coincide con ellos. Después de correrlo, crear las cuentas en Authentication y
-- asignarles su finca:  select asignar_finca('correo@ejemplo.com', 'Nombre de la finca');

-- Las funciones se crean antes que las tablas que usan; esto evita que Postgres las revise
-- en ese momento.
set check_function_bodies = false;


\restrict hChPDiicxKjdy4Svo2DiPIBzTn0RNsBRs1ce9FPdcdbAfcoockNboYmhUO8hps5

-- Name: public; Type: SCHEMA; Schema: -; Owner: -


-- Name: asignar_finca(text, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.asignar_finca(p_correo text, p_finca text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

-- Name: mi_finca(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.mi_finca() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select finca_id from cuentas_finca where usuario_id = auth.uid();
$$;

-- Name: animales; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.animales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    fecha_compra date DEFAULT CURRENT_DATE NOT NULL,
    precio_compra numeric NOT NULL,
    fecha_venta date,
    precio_venta numeric,
    usuario_id uuid DEFAULT auth.uid(),
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    fecha_muerte date,
    finca_id uuid DEFAULT public.mi_finca() NOT NULL,
    tipo text DEFAULT 'Ternero'::text NOT NULL,
    color text,
    fecha_nacimiento date,
    madre_id uuid,
    duenio text,
    lugar text DEFAULT 'Finca'::text NOT NULL,
    nota text,
    CONSTRAINT animales_check CHECK (((fecha_venta IS NULL) = (precio_venta IS NULL))),
    CONSTRAINT animales_check1 CHECK (((fecha_venta IS NULL) OR (fecha_venta >= fecha_compra))),
    CONSTRAINT animales_duenio_check CHECK (((duenio IS NULL) OR (length(TRIM(BOTH FROM duenio)) > 0))),
    CONSTRAINT animales_fecha_muerte_valida CHECK (((fecha_muerte IS NULL) OR (fecha_muerte >= fecha_compra))),
    CONSTRAINT animales_lugar_check CHECK ((lugar = ANY (ARRAY['Finca'::text, 'Potrero'::text]))),
    CONSTRAINT animales_no_es_su_propia_madre CHECK (((madre_id IS NULL) OR (madre_id <> id))),
    CONSTRAINT animales_precio_compra_check CHECK ((precio_compra >= (0)::numeric)),
    CONSTRAINT animales_precio_compra_maximo CHECK ((precio_compra <= (1000000)::numeric)),
    CONSTRAINT animales_precio_venta_check CHECK (((precio_venta IS NULL) OR (precio_venta >= (0)::numeric))),
    CONSTRAINT animales_precio_venta_maximo CHECK ((precio_venta <= (1000000)::numeric)),
    CONSTRAINT animales_tipo_check CHECK ((tipo = ANY (ARRAY['Toro'::text, 'Vaca'::text, 'Novilla'::text, 'Novillo'::text, 'Ternera'::text, 'Ternero'::text]))),
    CONSTRAINT animales_vendido_o_muerto CHECK (((fecha_venta IS NULL) OR (fecha_muerte IS NULL)))
);

-- Name: aplicacion_animales; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.aplicacion_animales (
    aplicacion_id uuid NOT NULL,
    animal_id uuid NOT NULL,
    finca_id uuid DEFAULT public.mi_finca() NOT NULL,
    estado text DEFAULT 'aplicado'::text NOT NULL,
    CONSTRAINT aplicacion_animales_estado_check CHECK ((estado = ANY (ARRAY['aplicado'::text, 'pendiente'::text])))
);

-- Name: aplicaciones; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.aplicaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    finca_id uuid DEFAULT public.mi_finca() NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    clase text NOT NULL,
    producto text NOT NULL,
    dosis text,
    grupo text NOT NULL,
    proxima date,
    usuario_id uuid DEFAULT auth.uid(),
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT aplicaciones_check CHECK (((proxima IS NULL) OR (proxima >= fecha))),
    CONSTRAINT aplicaciones_clase_check CHECK ((clase = ANY (ARRAY['Tratamiento'::text, 'Baño'::text]))),
    CONSTRAINT aplicaciones_grupo_check CHECK ((grupo = ANY (ARRAY['todos'::text, 'vacas'::text, 'finca'::text, 'potrero'::text, 'elegidos'::text]))),
    CONSTRAINT aplicaciones_producto_check CHECK ((length(TRIM(BOTH FROM producto)) > 0))
);

-- Name: compras; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.compras (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    descripcion text NOT NULL,
    monto numeric NOT NULL,
    usuario_id uuid DEFAULT auth.uid(),
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    animal_id uuid,
    finca_id uuid DEFAULT public.mi_finca() NOT NULL,
    CONSTRAINT compras_monto_check CHECK ((monto > (0)::numeric)),
    CONSTRAINT compras_monto_maximo CHECK ((monto <= (250000)::numeric))
);

-- Name: cuentas_finca; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.cuentas_finca (
    usuario_id uuid NOT NULL,
    finca_id uuid NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);

-- Name: fincas; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.fincas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fincas_nombre_check CHECK ((length(TRIM(BOTH FROM nombre)) > 0))
);

-- Name: v_gasto_animal; Type: VIEW; Schema: public; Owner: -

CREATE VIEW public.v_gasto_animal WITH (security_invoker='on') AS
 SELECT c.animal_id,
    c.id AS compra_id,
    c.fecha,
    c.descripcion,
    c.monto AS monto_compra,
    c.monto AS monto_animal,
    false AS compartida
   FROM public.compras c
  WHERE (c.animal_id IS NOT NULL)
UNION ALL
 SELECT a.id AS animal_id,
    c.id AS compra_id,
    c.fecha,
    c.descripcion,
    c.monto AS monto_compra,
    round((c.monto / (count(*) OVER (PARTITION BY c.id))::numeric), 2) AS monto_animal,
    true AS compartida
   FROM (public.compras c
     JOIN public.animales a ON (((a.finca_id = c.finca_id) AND (a.duenio IS NULL) AND (a.fecha_compra <= c.fecha) AND ((COALESCE(a.fecha_venta, a.fecha_muerte) IS NULL) OR (COALESCE(a.fecha_venta, a.fecha_muerte) > c.fecha)))))
  WHERE (c.animal_id IS NULL);

-- Name: v_resumen; Type: VIEW; Schema: public; Owner: -

CREATE VIEW public.v_resumen WITH (security_invoker='on') AS
 SELECT ( SELECT count(*) AS count
           FROM public.animales
          WHERE ((animales.fecha_venta IS NULL) AND (animales.fecha_muerte IS NULL))) AS terneros_en_finca,
    ( SELECT count(*) AS count
           FROM public.animales
          WHERE (animales.fecha_venta IS NOT NULL)) AS terneros_vendidos,
    ( SELECT COALESCE(sum(animales.precio_compra), (0)::numeric) AS "coalesce"
           FROM public.animales) AS total_ganado,
    ( SELECT COALESCE(sum(compras.monto), (0)::numeric) AS "coalesce"
           FROM public.compras) AS total_compras,
    ( SELECT COALESCE(sum(animales.precio_venta), (0)::numeric) AS "coalesce"
           FROM public.animales) AS total_ventas,
    ((( SELECT COALESCE(sum(animales.precio_venta), (0)::numeric) AS "coalesce"
           FROM public.animales) - ( SELECT COALESCE(sum(animales.precio_compra), (0)::numeric) AS "coalesce"
           FROM public.animales)) - ( SELECT COALESCE(sum(compras.monto), (0)::numeric) AS "coalesce"
           FROM public.compras)) AS balance,
    ( SELECT COALESCE(sum(c.monto), (0)::numeric) AS "coalesce"
           FROM public.compras c
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM public.v_gasto_animal g
                  WHERE (g.compra_id = c.id))))) AS compras_sin_ternero,
    ( SELECT count(*) AS count
           FROM public.animales
          WHERE (animales.fecha_muerte IS NOT NULL)) AS terneros_muertos;

-- Name: v_resumen_animal; Type: VIEW; Schema: public; Owner: -

CREATE VIEW public.v_resumen_animal WITH (security_invoker='on') AS
 SELECT a.id AS animal_id,
    a.nombre,
    a.fecha_compra,
    a.precio_compra,
    COALESCE(g.gastos, (0)::numeric) AS gastos,
    (a.precio_compra + COALESCE(g.gastos, (0)::numeric)) AS invertido,
    a.fecha_venta,
    a.precio_venta,
        CASE
            WHEN (a.fecha_muerte IS NOT NULL) THEN (- (a.precio_compra + COALESCE(g.gastos, (0)::numeric)))
            ELSE (a.precio_venta - (a.precio_compra + COALESCE(g.gastos, (0)::numeric)))
        END AS ganancia,
    (COALESCE(a.fecha_venta, a.fecha_muerte, CURRENT_DATE) - a.fecha_compra) AS dias,
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
   FROM (public.animales a
     LEFT JOIN ( SELECT v_gasto_animal.animal_id,
            sum(v_gasto_animal.monto_animal) AS gastos
           FROM public.v_gasto_animal
          GROUP BY v_gasto_animal.animal_id) g ON ((g.animal_id = a.id)));

-- Name: animales animales_id_finca_unico; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.animales
    ADD CONSTRAINT animales_id_finca_unico UNIQUE (id, finca_id);

-- Name: animales animales_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.animales
    ADD CONSTRAINT animales_pkey PRIMARY KEY (id);

-- Name: aplicacion_animales aplicacion_animales_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.aplicacion_animales
    ADD CONSTRAINT aplicacion_animales_pkey PRIMARY KEY (aplicacion_id, animal_id);

-- Name: aplicaciones aplicaciones_id_finca_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.aplicaciones
    ADD CONSTRAINT aplicaciones_id_finca_id_key UNIQUE (id, finca_id);

-- Name: aplicaciones aplicaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.aplicaciones
    ADD CONSTRAINT aplicaciones_pkey PRIMARY KEY (id);

-- Name: compras compras_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.compras
    ADD CONSTRAINT compras_pkey PRIMARY KEY (id);

-- Name: cuentas_finca cuentas_finca_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.cuentas_finca
    ADD CONSTRAINT cuentas_finca_pkey PRIMARY KEY (usuario_id);

-- Name: fincas fincas_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.fincas
    ADD CONSTRAINT fincas_nombre_key UNIQUE (nombre);

-- Name: fincas fincas_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.fincas
    ADD CONSTRAINT fincas_pkey PRIMARY KEY (id);

-- Name: idx_animales_finca; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_animales_finca ON public.animales USING btree (finca_id);

-- Name: idx_animales_madre; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_animales_madre ON public.animales USING btree (madre_id);

-- Name: idx_aplicacion_animales_animal; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_aplicacion_animales_animal ON public.aplicacion_animales USING btree (animal_id);

-- Name: idx_aplicaciones_finca_fecha; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_aplicaciones_finca_fecha ON public.aplicaciones USING btree (finca_id, fecha DESC);

-- Name: idx_compras_animal; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_compras_animal ON public.compras USING btree (animal_id);

-- Name: idx_compras_finca; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_compras_finca ON public.compras USING btree (finca_id);

-- Name: idx_cuentas_finca_finca; Type: INDEX; Schema: public; Owner: -

CREATE INDEX idx_cuentas_finca_finca ON public.cuentas_finca USING btree (finca_id);

-- Name: animales animales_finca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.animales
    ADD CONSTRAINT animales_finca_id_fkey FOREIGN KEY (finca_id) REFERENCES public.fincas(id) ON DELETE RESTRICT;

-- Name: animales animales_madre_misma_finca; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.animales
    ADD CONSTRAINT animales_madre_misma_finca FOREIGN KEY (madre_id, finca_id) REFERENCES public.animales(id, finca_id) ON DELETE SET NULL (madre_id);

-- Name: animales animales_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.animales
    ADD CONSTRAINT animales_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id);

-- Name: aplicacion_animales aplicacion_animales_animal_id_finca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.aplicacion_animales
    ADD CONSTRAINT aplicacion_animales_animal_id_finca_id_fkey FOREIGN KEY (animal_id, finca_id) REFERENCES public.animales(id, finca_id) ON DELETE CASCADE;

-- Name: aplicacion_animales aplicacion_animales_aplicacion_id_finca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.aplicacion_animales
    ADD CONSTRAINT aplicacion_animales_aplicacion_id_finca_id_fkey FOREIGN KEY (aplicacion_id, finca_id) REFERENCES public.aplicaciones(id, finca_id) ON DELETE CASCADE;

-- Name: aplicaciones aplicaciones_finca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.aplicaciones
    ADD CONSTRAINT aplicaciones_finca_id_fkey FOREIGN KEY (finca_id) REFERENCES public.fincas(id) ON DELETE RESTRICT;

-- Name: aplicaciones aplicaciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.aplicaciones
    ADD CONSTRAINT aplicaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id);

-- Name: compras compras_animal_misma_finca; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.compras
    ADD CONSTRAINT compras_animal_misma_finca FOREIGN KEY (animal_id, finca_id) REFERENCES public.animales(id, finca_id) ON DELETE RESTRICT;

-- Name: compras compras_finca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.compras
    ADD CONSTRAINT compras_finca_id_fkey FOREIGN KEY (finca_id) REFERENCES public.fincas(id) ON DELETE RESTRICT;

-- Name: compras compras_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.compras
    ADD CONSTRAINT compras_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id);

-- Name: cuentas_finca cuentas_finca_finca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.cuentas_finca
    ADD CONSTRAINT cuentas_finca_finca_id_fkey FOREIGN KEY (finca_id) REFERENCES public.fincas(id) ON DELETE CASCADE;

-- Name: cuentas_finca cuentas_finca_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.cuentas_finca
    ADD CONSTRAINT cuentas_finca_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Name: animales; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.animales ENABLE ROW LEVEL SECURITY;

-- Name: aplicacion_animales; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.aplicacion_animales ENABLE ROW LEVEL SECURITY;

-- Name: aplicaciones; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.aplicaciones ENABLE ROW LEVEL SECURITY;

-- Name: compras; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

-- Name: cuentas_finca; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.cuentas_finca ENABLE ROW LEVEL SECURITY;

-- Name: animales finca_propia_animales; Type: POLICY; Schema: public; Owner: -

CREATE POLICY finca_propia_animales ON public.animales USING ((finca_id = public.mi_finca())) WITH CHECK ((finca_id = public.mi_finca()));

-- Name: aplicacion_animales finca_propia_aplicacion_animales; Type: POLICY; Schema: public; Owner: -

CREATE POLICY finca_propia_aplicacion_animales ON public.aplicacion_animales USING ((finca_id = public.mi_finca())) WITH CHECK ((finca_id = public.mi_finca()));

-- Name: aplicaciones finca_propia_aplicaciones; Type: POLICY; Schema: public; Owner: -

CREATE POLICY finca_propia_aplicaciones ON public.aplicaciones USING ((finca_id = public.mi_finca())) WITH CHECK ((finca_id = public.mi_finca()));

-- Name: compras finca_propia_compras; Type: POLICY; Schema: public; Owner: -

CREATE POLICY finca_propia_compras ON public.compras USING ((finca_id = public.mi_finca())) WITH CHECK ((finca_id = public.mi_finca()));

-- Name: fincas; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.fincas ENABLE ROW LEVEL SECURITY;

-- Name: fincas ver_finca_propia; Type: POLICY; Schema: public; Owner: -

CREATE POLICY ver_finca_propia ON public.fincas FOR SELECT USING ((id = public.mi_finca()));

\unrestrict hChPDiicxKjdy4Svo2DiPIBzTn0RNsBRs1ce9FPdcdbAfcoockNboYmhUO8hps5


-- ============ PERMISOS ============
grant DELETE, INSERT, SELECT, UPDATE on animales to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on aplicacion_animales to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on aplicaciones to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on compras to authenticated;
grant SELECT on fincas to authenticated;
grant SELECT on v_gasto_animal to authenticated;
grant SELECT on v_resumen to authenticated;
grant SELECT on v_resumen_animal to authenticated;
revoke execute on function public.mi_finca() from public, anon;
grant execute on function public.mi_finca() to authenticated;
revoke execute on function public.asignar_finca(text, text) from public, anon, authenticated;

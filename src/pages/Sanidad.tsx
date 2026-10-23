import { useCallback, useEffect, useState } from 'react'
import Confirmacion from '../components/Confirmacion'
import FichaAnimal from '../components/FichaAnimal'
import FormAplicacion, { type NuevaAplicacion } from '../components/FormAplicacion'
import Modal from '../components/Modal'
import { diasEntre, NOMBRE_GRUPO } from '../lib/animales'
import { formatoFecha, hoy } from '../lib/formato'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../lib/ToastContext'
import type { Aplicacion, AplicacionAnimal, ResumenAnimal } from '../lib/types'

function titulo(ap: Aplicacion) {
  return ap.clase === 'Baño' ? `Baño ${ap.producto}` : ap.producto
}

// Tratamientos y baños: lo que toca aplicar (próximas), a quién le faltó (pendientes) y el
// historial.
export default function Sanidad() {
  const { show } = useToast()
  const [aplicaciones, setAplicaciones] = useState<Aplicacion[]>([])
  const [filas, setFilas] = useState<AplicacionAnimal[]>([])
  const [animales, setAnimales] = useState<ResumenAnimal[]>([])
  const [cargando, setCargando] = useState(true)
  const [nueva, setNueva] = useState(false)
  const [abiertaId, setAbiertaId] = useState<string | null>(null)
  const [animalAbiertoId, setAnimalAbiertoId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const [apRes, filasRes, animalesRes] = await Promise.all([
      supabase
        .from('aplicaciones')
        .select('id, fecha, clase, producto, dosis, grupo, proxima')
        .order('fecha', { ascending: false })
        .order('creado_en', { ascending: false }),
      supabase.from('aplicacion_animales').select('aplicacion_id, animal_id, estado'),
      supabase.from('v_resumen_animal').select('*').order('creado_en'),
    ])
    if (apRes.error || filasRes.error || animalesRes.error) {
      show('No se pudo cargar la sanidad.', 'error')
    } else {
      setAplicaciones(apRes.data)
      setFilas(filasRes.data)
      setAnimales(animalesRes.data)
    }
    setCargando(false)
  }, [show])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function guardar(datos: NuevaAplicacion) {
    const { data, error } = await supabase
      .from('aplicaciones')
      .insert({
        fecha: datos.fecha,
        clase: datos.clase,
        producto: datos.producto,
        dosis: datos.dosis,
        grupo: datos.grupo,
        proxima: datos.proxima,
      })
      .select('id')
      .single()
    if (error) {
      show('No se pudo guardar la aplicación.', 'error')
      return false
    }
    const nuevasFilas = [
      ...datos.aplicados.map((animal_id) => ({ aplicacion_id: data.id, animal_id, estado: 'aplicado' })),
      ...datos.pendientes.map((animal_id) => ({ aplicacion_id: data.id, animal_id, estado: 'pendiente' })),
    ]
    if (nuevasFilas.length > 0) {
      const { error: errorFilas } = await supabase.from('aplicacion_animales').insert(nuevasFilas)
      if (errorFilas) {
        // Sin los animales la aplicación no sirve: se quita para no dejarla a medias.
        await supabase.from('aplicaciones').delete().eq('id', data.id)
        show('No se pudo guardar la aplicación.', 'error')
        return false
      }
    }
    show(`${datos.clase === 'Baño' ? `Baño ${datos.producto}` : datos.producto} registrado.`)
    setNueva(false)
    await cargar()
    return true
  }

  async function marcarAplicado(fila: AplicacionAnimal) {
    const { error } = await supabase
      .from('aplicacion_animales')
      .update({ estado: 'aplicado' })
      .eq('aplicacion_id', fila.aplicacion_id)
      .eq('animal_id', fila.animal_id)
    if (error) {
      show('No se pudo marcar como aplicado.', 'error')
      return
    }
    show('Marcado como aplicado.')
    await cargar()
  }

  async function eliminar(ap: Aplicacion) {
    const { error } = await supabase.from('aplicaciones').delete().eq('id', ap.id)
    if (error) {
      show('No se pudo eliminar la aplicación.', 'error')
      return
    }
    show(`${titulo(ap)} eliminado.`)
    setAbiertaId(null)
    await cargar()
  }

  const nombre = (animalId: string) => animales.find((a) => a.animal_id === animalId)?.nombre ?? '?'
  const filasDe = (apId: string) => filas.filter((f) => f.aplicacion_id === apId)

  function aQuienes(ap: Aplicacion) {
    if (ap.grupo !== 'elegidos') return NOMBRE_GRUPO[ap.grupo]
    const nombres = filasDe(ap.id)
      .filter((f) => f.estado === 'aplicado')
      .map((f) => nombre(f.animal_id))
    return nombres.length <= 3 ? nombres.join(', ') : `${nombres.length} animales`
  }

  // Próximas: de cada producto, solo la última vez que se aplicó, si tiene próxima fecha. Así
  // no salen las de aplicaciones viejas que ya se repitieron.
  const fechaHoy = hoy()
  const ultimaPorProducto = new Map<string, Aplicacion>()
  for (const ap of aplicaciones) {
    const clave = `${ap.clase}|${ap.producto.toLowerCase()}`
    if (!ultimaPorProducto.has(clave)) ultimaPorProducto.set(clave, ap)
  }
  const proximas = [...ultimaPorProducto.values()]
    .filter((ap) => ap.proxima)
    .sort((x, y) => x.proxima!.localeCompare(y.proxima!))
  const pendientes = filas
    .filter((f) => f.estado === 'pendiente')
    .map((f) => ({ fila: f, ap: aplicaciones.find((ap) => ap.id === f.aplicacion_id)! }))
    .filter(({ ap }) => ap)
    .sort((x, y) => y.ap.fecha.localeCompare(x.ap.fecha))

  const abierta = aplicaciones.find((ap) => ap.id === abiertaId) ?? null
  const animalAbierto = animales.find((a) => a.animal_id === animalAbiertoId) ?? null

  if (cargando) return <div className="empty-state">Cargando...</div>

  return (
    <div className="dos-columnas">
      <section className="columna-formulario">
        <div className="encabezado">
          <h2>Sanidad</h2>
          <button className="btn-agregar" onClick={() => setNueva(true)}>
            + Nueva aplicación
          </button>
        </div>

        <div className="section-title">Próximas</div>
        {proximas.length === 0 ? (
          <div className="empty-state">No hay aplicaciones programadas.</div>
        ) : (
          <ul className="lista">
            {proximas.map((ap) => {
              const dias = diasEntre(fechaHoy, ap.proxima!)
              return (
                <li key={ap.id}>
                  <button className="lista-item" onClick={() => setAbiertaId(ap.id)}>
                    <span className="lista-texto">
                      <span className="lista-descripcion">{titulo(ap)}</span>
                      <span className="lista-detalle">{aQuienes(ap)}</span>
                    </span>
                    <span className="lista-valor">
                      <span className={`lista-monto ${dias < 0 ? 'negativo' : ''}`}>
                        {formatoFecha(ap.proxima!)}
                      </span>
                      <span className={`lista-detalle ${dias < 0 ? 'texto-alerta' : ''}`}>
                        {dias < 0 ? `Vencida hace ${-dias} días` : dias === 0 ? 'Hoy' : `En ${dias} días`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="section-title">Pendientes ({pendientes.length})</div>
        {pendientes.length === 0 ? (
          <div className="empty-state">No hay animales pendientes.</div>
        ) : (
          <ul className="lista">
            {pendientes.map(({ fila, ap }) => (
              <li key={`${fila.aplicacion_id}-${fila.animal_id}`} className="lista-item lista-item-fija">
                <span className="lista-texto">
                  <button className="enlace" onClick={() => setAnimalAbiertoId(fila.animal_id)}>
                    {nombre(fila.animal_id)}
                  </button>
                  <span className="lista-detalle">
                    {titulo(ap)} · desde {formatoFecha(ap.fecha)}
                  </span>
                </span>
                <button className="btn-mini" onClick={() => marcarAplicado(fila)}>
                  Ya se aplicó
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="columna-lista">
        <div className="section-title">Historial</div>
        {aplicaciones.length === 0 ? (
          <div className="empty-state">Todavía no hay tratamientos ni baños registrados.</div>
        ) : (
          <ul className="lista">
            {aplicaciones.map((ap) => {
              const cuantosPendientes = filasDe(ap.id).filter((f) => f.estado === 'pendiente').length
              return (
                <li key={ap.id}>
                  <button className="lista-item" onClick={() => setAbiertaId(ap.id)}>
                    <span className="lista-texto">
                      <span className="lista-descripcion">{titulo(ap)}</span>
                      <span className="lista-detalle">
                        {aQuienes(ap)}
                        {ap.dosis ? ` · ${ap.dosis}` : ''}
                        {cuantosPendientes > 0 && (
                          <span className="texto-alerta"> · {cuantosPendientes} pendiente(s)</span>
                        )}
                      </span>
                    </span>
                    <span className="lista-detalle">{formatoFecha(ap.fecha)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {nueva && (
        <Modal title="Nueva aplicación" onClose={() => setNueva(false)}>
          <FormAplicacion
            animales={animales}
            productosUsados={[...new Set(aplicaciones.map((ap) => ap.producto))].sort()}
            onGuardar={guardar}
          />
        </Modal>
      )}

      {abierta && (
        <DetalleAplicacion
          aplicacion={abierta}
          filas={filasDe(abierta.id)}
          nombre={nombre}
          onCerrar={() => setAbiertaId(null)}
          onAbrirAnimal={(id) => {
            setAbiertaId(null)
            setAnimalAbiertoId(id)
          }}
          onEliminar={() => eliminar(abierta)}
        />
      )}

      {animalAbierto && (
        <FichaAnimal
          key={animalAbierto.animal_id}
          animal={animalAbierto}
          animales={animales}
          onCerrar={() => setAnimalAbiertoId(null)}
          onCambio={cargar}
          onAbrir={setAnimalAbiertoId}
        />
      )}
    </div>
  )
}

function DetalleAplicacion({
  aplicacion,
  filas,
  nombre,
  onCerrar,
  onAbrirAnimal,
  onEliminar,
}: {
  aplicacion: Aplicacion
  filas: AplicacionAnimal[]
  nombre: (animalId: string) => string
  onCerrar: () => void
  onAbrirAnimal: (animalId: string) => void
  onEliminar: () => Promise<void>
}) {
  const [confirmando, setConfirmando] = useState(false)
  const aplicados = filas.filter((f) => f.estado === 'aplicado')
  const pendientes = filas.filter((f) => f.estado === 'pendiente')

  return (
    <Modal title={titulo(aplicacion)} onClose={onCerrar}>
      <div className="resumen">
        <div className="resumen-fila">
          <span>Fecha</span>
          <strong>{formatoFecha(aplicacion.fecha)}</strong>
        </div>
        {aplicacion.dosis && (
          <div className="resumen-fila">
            <span>Dosis o nota</span>
            <strong>{aplicacion.dosis}</strong>
          </div>
        )}
        <div className="resumen-fila">
          <span>A quiénes</span>
          <strong>
            {aplicacion.grupo === 'elegidos' ? 'Animales elegidos' : NOMBRE_GRUPO[aplicacion.grupo]}
          </strong>
        </div>
        {aplicacion.proxima && (
          <div className="resumen-fila">
            <span>Próxima</span>
            <strong>{formatoFecha(aplicacion.proxima)}</strong>
          </div>
        )}
      </div>

      <div className="section-title">Se aplicó a ({aplicados.length})</div>
      <div className="etiquetas">
        {aplicados.map((f) => (
          <button key={f.animal_id} className="etiqueta etiqueta-boton" onClick={() => onAbrirAnimal(f.animal_id)}>
            {nombre(f.animal_id)}
          </button>
        ))}
      </div>
      {pendientes.length > 0 && (
        <>
          <div className="section-title">Pendientes ({pendientes.length})</div>
          <div className="etiquetas">
            {pendientes.map((f) => (
              <button
                key={f.animal_id}
                className="etiqueta etiqueta-boton etiqueta-alerta"
                onClick={() => onAbrirAnimal(f.animal_id)}
              >
                {nombre(f.animal_id)}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="acciones">
        <button className="btn-danger" onClick={() => setConfirmando(true)}>
          Eliminar aplicación
        </button>
      </div>
      {confirmando && (
        <Confirmacion
          pregunta={`¿Eliminar ${titulo(aplicacion)} del ${formatoFecha(aplicacion.fecha)}? No se puede deshacer.`}
          textoConfirmar="Sí, eliminar"
          onConfirmar={onEliminar}
          onCancelar={() => setConfirmando(false)}
        />
      )}
    </Modal>
  )
}

import { useCallback, useEffect, useState } from 'react'
import CompraForm from '../components/CompraForm'
import Confirmacion from '../components/Confirmacion'
import Modal from '../components/Modal'
import { formatoColones, formatoFecha } from '../lib/formato'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../lib/ToastContext'
import type { Compra, CompraInput } from '../lib/types'

interface AnimalOpcion {
  id: string
  nombre: string
  // Ya no está en la finca (vendido o muerto).
  salio: boolean
}

export default function Compras() {
  const { show } = useToast()
  const [compras, setCompras] = useState<Compra[]>([])
  const [animales, setAnimales] = useState<AnimalOpcion[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<Compra | null>(null)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)

  const cargar = useCallback(async () => {
    const [comprasRes, animalesRes] = await Promise.all([
      supabase
        .from('compras')
        .select('id, fecha, descripcion, monto, animal_id')
        .order('fecha', { ascending: false })
        .order('creado_en', { ascending: false }),
      supabase.from('animales').select('id, nombre, fecha_venta, fecha_muerte').order('nombre'),
    ])
    if (comprasRes.error || animalesRes.error) {
      show('No se pudieron cargar las compras.', 'error')
    } else {
      setCompras(comprasRes.data)
      setAnimales(
        animalesRes.data.map((t) => ({
          id: t.id,
          nombre: t.nombre,
          salio: t.fecha_venta !== null || t.fecha_muerte !== null,
        }))
      )
    }
    setCargando(false)
  }, [show])

  useEffect(() => {
    cargar()
  }, [cargar])

  function cerrarEdicion() {
    setEditando(null)
    setConfirmandoEliminar(false)
  }

  async function agregar(datos: CompraInput) {
    const { error } = await supabase.from('compras').insert(datos)
    if (error) {
      show('No se pudo guardar la compra.', 'error')
      return false
    }
    show('Compra guardada.')
    await cargar()
    return true
  }

  async function actualizar(datos: CompraInput) {
    if (!editando) return false
    const { error } = await supabase.from('compras').update(datos).eq('id', editando.id)
    if (error) {
      show('No se pudieron guardar los cambios.', 'error')
      return false
    }
    show('Cambios guardados.')
    cerrarEdicion()
    await cargar()
    return true
  }

  async function eliminar() {
    if (!editando) return
    const { error } = await supabase.from('compras').delete().eq('id', editando.id)
    if (error) {
      show('No se pudo eliminar la compra.', 'error')
      return
    }
    show('Compra eliminada.')
    cerrarEdicion()
    await cargar()
  }

  const nombres = new Map(animales.map((t) => [t.id, t.nombre]))
  const enFinca = animales.filter((t) => !t.salio)
  // Al editar, el animal de la compra tiene que seguir en la lista aunque ya haya salido de la finca.
  const opcionesEdicion = animales.filter((t) => !t.salio || t.id === editando?.animal_id)
  const total = compras.reduce((suma, c) => suma + Number(c.monto), 0)

  return (
    <div className="dos-columnas">
      <section className="columna-formulario">
        <h2>Nueva compra</h2>
        <div className="card">
          <CompraForm animales={enFinca} textoBoton="Agregar compra" onGuardar={agregar} />
        </div>
      </section>

      <section className="columna-lista">
        <div className="total-bar">
          <span>Total en compras</span>
          <strong>{formatoColones(total)}</strong>
        </div>

        {cargando ? (
          <div className="empty-state">Cargando...</div>
        ) : compras.length === 0 ? (
          <div className="empty-state">Todavía no hay compras. Agrega la primera con el formulario.</div>
        ) : (
          <ul className="lista">
            {compras.map((c) => (
              <li key={c.id}>
                <button className="lista-item" onClick={() => setEditando(c)}>
                  <span className="lista-texto">
                    <span className="lista-descripcion">{c.descripcion}</span>
                    <span className="lista-detalle">
                      {formatoFecha(c.fecha)} ·{' '}
                      {c.animal_id ? `Solo ${nombres.get(c.animal_id) ?? '?'}` : 'Todos'}
                    </span>
                  </span>
                  <span className="lista-monto">{formatoColones(Number(c.monto))}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editando && (
        <Modal title="Editar compra" onClose={cerrarEdicion}>
          <CompraForm
            inicial={{
              descripcion: editando.descripcion,
              monto: Number(editando.monto),
              fecha: editando.fecha,
              animal_id: editando.animal_id,
            }}
            animales={opcionesEdicion}
            textoBoton="Guardar cambios"
            onGuardar={actualizar}
          />
          {confirmandoEliminar ? (
            <Confirmacion
              pregunta={`¿Eliminar "${editando.descripcion}"? No se puede deshacer.`}
              textoConfirmar="Sí, eliminar"
              onConfirmar={eliminar}
              onCancelar={() => setConfirmandoEliminar(false)}
            />
          ) : (
            <button className="btn-danger" onClick={() => setConfirmandoEliminar(true)}>
              Eliminar compra
            </button>
          )}
        </Modal>
      )}
    </div>
  )
}

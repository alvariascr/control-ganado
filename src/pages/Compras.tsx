import { useCallback, useEffect, useState } from 'react'
import CompraForm from '../components/CompraForm'
import Confirmacion from '../components/Confirmacion'
import Modal from '../components/Modal'
import { formatoColones, formatoFecha } from '../lib/formato'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../lib/ToastContext'
import type { Compra, CompraInput } from '../lib/types'

interface Ternero {
  id: string
  nombre: string
  // Ya no está en la finca (vendido o muerto).
  salio: boolean
}

export default function Compras() {
  const { show } = useToast()
  const [compras, setCompras] = useState<Compra[]>([])
  const [terneros, setTerneros] = useState<Ternero[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<Compra | null>(null)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)

  const cargar = useCallback(async () => {
    const [comprasRes, ternerosRes] = await Promise.all([
      supabase
        .from('compras')
        .select('id, fecha, descripcion, monto, animal_id')
        .order('fecha', { ascending: false })
        .order('creado_en', { ascending: false }),
      supabase.from('animales').select('id, nombre, fecha_venta, fecha_muerte').order('nombre'),
    ])
    if (comprasRes.error || ternerosRes.error) {
      show('No se pudieron cargar las compras.', 'error')
    } else {
      setCompras(comprasRes.data)
      setTerneros(
        ternerosRes.data.map((t) => ({
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

  const nombres = new Map(terneros.map((t) => [t.id, t.nombre]))
  const enFinca = terneros.filter((t) => !t.salio)
  // Al editar, el ternero de la compra tiene que seguir en la lista aunque ya haya salido de la finca.
  const opcionesEdicion = terneros.filter((t) => !t.salio || t.id === editando?.animal_id)
  const total = compras.reduce((suma, c) => suma + Number(c.monto), 0)

  return (
    <>
      <h2>Nueva compra</h2>
      <div className="card">
        <CompraForm terneros={enFinca} textoBoton="Agregar compra" onGuardar={agregar} />
      </div>

      <div className="total-bar">
        <span>Total en compras</span>
        <strong>{formatoColones(total)}</strong>
      </div>

      {cargando ? (
        <div className="empty-state">Cargando...</div>
      ) : compras.length === 0 ? (
        <div className="empty-state">Todavía no hay compras. Agrega la primera arriba.</div>
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

      {editando && (
        <Modal title="Editar compra" onClose={cerrarEdicion}>
          <CompraForm
            inicial={{
              descripcion: editando.descripcion,
              monto: Number(editando.monto),
              fecha: editando.fecha,
              animal_id: editando.animal_id,
            }}
            terneros={opcionesEdicion}
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
    </>
  )
}

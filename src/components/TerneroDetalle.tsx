import { useEffect, useState, type FormEvent } from 'react'
import { formatoColones, formatoFecha, hoy } from '../lib/formato'
import { MAXIMO_TERNERO } from '../lib/limites'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../lib/ToastContext'
import type { AnimalInput, GastoAnimal, ResumenAnimal } from '../lib/types'
import CampoMonto from './CampoMonto'
import Confirmacion from './Confirmacion'
import Modal from './Modal'
import TerneroForm from './TerneroForm'

// Hoja con el detalle de un ternero: cuánto lleva invertido, en qué, y su salida (venta o
// muerte). Llama a onCambio después de guardar algo, para que la lista de afuera se recargue.
export default function TerneroDetalle({
  ternero,
  onCerrar,
  onCambio,
}: {
  ternero: ResumenAnimal
  onCerrar: () => void
  onCambio: () => Promise<void>
}) {
  const { show } = useToast()
  const [gastos, setGastos] = useState<GastoAnimal[] | null>(null)
  const [editando, setEditando] = useState(false)
  const [tipoSalida, setTipoSalida] = useState<'venta' | 'muerte'>('venta')
  const [precioVenta, setPrecioVenta] = useState('')
  const [fechaSalida, setFechaSalida] = useState(hoy())
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState<'salida' | 'eliminar' | null>(null)

  const vendido = ternero.fecha_venta !== null
  const murio = ternero.fecha_muerte !== null
  const enFinca = !vendido && !murio

  useEffect(() => {
    supabase
      .from('v_gasto_animal')
      .select('compra_id, fecha, descripcion, monto_compra, monto_animal, compartida')
      .eq('animal_id', ternero.animal_id)
      .order('fecha', { ascending: false })
      .then(({ data, error }) => {
        if (error) show('No se pudieron cargar los gastos.', 'error')
        else setGastos(data)
      })
  }, [ternero.animal_id, ternero.invertido, show])

  async function guardarDatos(datos: AnimalInput) {
    const { error } = await supabase.from('animales').update(datos).eq('id', ternero.animal_id)
    if (error) {
      show('No se pudieron guardar los cambios.', 'error')
      return false
    }
    show('Cambios guardados.')
    setEditando(false)
    await onCambio()
    return true
  }

  async function registrarSalida(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    const cambios =
      tipoSalida === 'venta'
        ? { precio_venta: Number(precioVenta), fecha_venta: fechaSalida }
        : { fecha_muerte: fechaSalida }
    const { error } = await supabase.from('animales').update(cambios).eq('id', ternero.animal_id)
    setGuardando(false)
    if (error) {
      show(
        tipoSalida === 'venta' ? 'No se pudo registrar la venta.' : 'No se pudo registrar la muerte.',
        'error'
      )
      return
    }
    show(
      tipoSalida === 'venta'
        ? `Venta de ${ternero.nombre} registrada.`
        : `Muerte de ${ternero.nombre} registrada.`
    )
    await onCambio()
  }

  // Quita la venta o la muerte: el ternero vuelve a quedar en la finca.
  async function quitarSalida() {
    const { error } = await supabase
      .from('animales')
      .update({ precio_venta: null, fecha_venta: null, fecha_muerte: null })
      .eq('id', ternero.animal_id)
    if (error) {
      show(vendido ? 'No se pudo quitar la venta.' : 'No se pudo quitar la muerte.', 'error')
      return
    }
    show(vendido ? 'Venta quitada.' : 'Muerte quitada.')
    setConfirmando(null)
    await onCambio()
  }

  async function eliminar() {
    const { error } = await supabase.from('animales').delete().eq('id', ternero.animal_id)
    if (error) {
      // 23503: hay compras marcadas "solo para" este ternero.
      show(
        error.code === '23503'
          ? `Hay compras solo para ${ternero.nombre}. Cámbialas a otro o elimínalas primero.`
          : 'No se pudo eliminar el ternero.',
        'error'
      )
      return
    }
    show(`${ternero.nombre} eliminado.`)
    onCerrar()
    await onCambio()
  }

  const ganancia = Number(ternero.ganancia)
  const salidaValida =
    fechaSalida !== '' &&
    (tipoSalida === 'muerte' || (precioVenta !== '' && Number(precioVenta) <= MAXIMO_TERNERO))

  return (
    <Modal title={ternero.nombre} onClose={onCerrar}>
      {editando ? (
        <>
          <TerneroForm
            inicial={{
              nombre: ternero.nombre,
              precio_compra: Number(ternero.precio_compra),
              fecha_compra: ternero.fecha_compra,
            }}
            textoBoton="Guardar cambios"
            onGuardar={guardarDatos}
          />
          <button className="btn-secondary" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        </>
      ) : (
        <>
          <div className="resumen">
            <div className="resumen-fila">
              <span>Compra ({formatoFecha(ternero.fecha_compra)})</span>
              <strong>{formatoColones(Number(ternero.precio_compra))}</strong>
            </div>
            <div className="resumen-fila">
              <span>Gastos</span>
              <strong>{formatoColones(Number(ternero.gastos))}</strong>
            </div>
            <div className="resumen-fila resumen-destacado">
              <span>Invertido</span>
              <strong>{formatoColones(Number(ternero.invertido))}</strong>
            </div>
            {vendido && (
              <div className="resumen-fila">
                <span>Venta ({formatoFecha(ternero.fecha_venta!)})</span>
                <strong>{formatoColones(Number(ternero.precio_venta))}</strong>
              </div>
            )}
            {murio && (
              <div className="resumen-fila">
                <span>Murió ({formatoFecha(ternero.fecha_muerte!)})</span>
                <strong>{formatoColones(0)}</strong>
              </div>
            )}
            {!enFinca && (
              <div
                className={`resumen-fila resumen-destacado ${ganancia < 0 ? 'negativo' : 'positivo'}`}
              >
                <span>{ganancia < 0 ? 'Pérdida' : 'Ganancia'}</span>
                <strong>{formatoColones(ganancia)}</strong>
              </div>
            )}
          </div>
          <p className="nota">
            {enFinca
              ? `Lleva ${ternero.dias} días en la finca.`
              : `Estuvo ${ternero.dias} días en la finca.`}
          </p>

          {enFinca && (
            <>
              <div className="section-title">Registrar salida</div>
              <form className="card" onSubmit={registrarSalida}>
                <div className="type-toggle">
                  <button
                    type="button"
                    className={tipoSalida === 'venta' ? 'active' : ''}
                    onClick={() => setTipoSalida('venta')}
                  >
                    Se vendió
                  </button>
                  <button
                    type="button"
                    className={tipoSalida === 'muerte' ? 'active' : ''}
                    onClick={() => setTipoSalida('muerte')}
                  >
                    Murió
                  </button>
                </div>
                <div className={tipoSalida === 'venta' ? 'field-row' : ''}>
                  {tipoSalida === 'venta' && (
                    <CampoMonto
                      id="precio-venta"
                      label="Se vendió en (₡)"
                      valor={precioVenta}
                      maximo={MAXIMO_TERNERO}
                      onChange={setPrecioVenta}
                    />
                  )}
                  <div className="field">
                    <label htmlFor="fecha-salida">Fecha</label>
                    <input
                      id="fecha-salida"
                      type="date"
                      min={ternero.fecha_compra}
                      value={fechaSalida}
                      onChange={(e) => setFechaSalida(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <p className="nota nota-form">
                  {tipoSalida === 'venta'
                    ? 'Pon lo que realmente les quedó, ya sin la comisión de la subasta ni el flete.'
                    : 'Desde esa fecha ya no se le cargan compras, y lo invertido cuenta como pérdida.'}
                </p>
                <button className="btn-primary" type="submit" disabled={!salidaValida || guardando}>
                  {guardando
                    ? 'Guardando...'
                    : tipoSalida === 'venta'
                      ? 'Registrar venta'
                      : 'Registrar muerte'}
                </button>
              </form>
            </>
          )}

          <div className="section-title">En qué se ha invertido</div>
          {gastos === null ? (
            <div className="empty-state">Cargando...</div>
          ) : gastos.length === 0 ? (
            <div className="empty-state">Todavía no tiene gastos.</div>
          ) : (
            <ul className="lista">
              {gastos.map((g) => (
                <li key={g.compra_id} className="lista-item lista-item-fija">
                  <span className="lista-texto">
                    <span className="lista-descripcion">{g.descripcion}</span>
                    <span className="lista-detalle">
                      {formatoFecha(g.fecha)}
                      {g.compartida
                        ? ` · su parte de ${formatoColones(Number(g.monto_compra))}`
                        : ' · solo para él'}
                    </span>
                  </span>
                  <span className="lista-monto">{formatoColones(Number(g.monto_animal))}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="acciones">
            <button className="btn-secondary" onClick={() => setEditando(true)}>
              Editar datos
            </button>
            {!enFinca && (
              <button className="btn-secondary" onClick={() => setConfirmando('salida')}>
                {vendido ? 'Quitar venta' : 'Quitar muerte'}
              </button>
            )}
          </div>
          <button className="btn-danger" onClick={() => setConfirmando('eliminar')}>
            Eliminar ternero
          </button>
          {confirmando === 'salida' && (
            <Confirmacion
              pregunta={`¿Quitar la ${vendido ? 'venta' : 'muerte'} de ${ternero.nombre}? Vuelve a quedar en la finca.`}
              textoConfirmar={vendido ? 'Sí, quitar venta' : 'Sí, quitar muerte'}
              onConfirmar={quitarSalida}
              onCancelar={() => setConfirmando(null)}
            />
          )}
          {confirmando === 'eliminar' && (
            <Confirmacion
              pregunta={`¿Eliminar a ${ternero.nombre}? No se puede deshacer.`}
              textoConfirmar="Sí, eliminar"
              onConfirmar={eliminar}
              onCancelar={() => setConfirmando(null)}
            />
          )}
        </>
      )}
    </Modal>
  )
}

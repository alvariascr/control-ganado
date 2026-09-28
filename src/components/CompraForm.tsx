import { useState, type FormEvent } from 'react'
import { hoy } from '../lib/formato'
import { MAXIMO_GASTO } from '../lib/limites'
import type { CompraInput } from '../lib/types'
import CampoMonto from './CampoMonto'

const PARA_TODOS = ''

// Formulario de compra. Se usa para agregar (vacío) y para editar (con valores).
export default function CompraForm({
  inicial,
  terneros,
  textoBoton,
  onGuardar,
}: {
  inicial?: CompraInput
  // Terneros que se pueden elegir en "Para".
  terneros: { id: string; nombre: string }[]
  textoBoton: string
  // Devuelve true si se guardó, para limpiar el formulario solo en ese caso.
  onGuardar: (datos: CompraInput) => Promise<boolean>
}) {
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '')
  const [monto, setMonto] = useState(inicial ? String(inicial.monto) : '')
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoy())
  const [para, setPara] = useState(inicial?.animal_id ?? PARA_TODOS)
  const [guardando, setGuardando] = useState(false)

  const montoNumero = Number(monto)
  const valido =
    descripcion.trim() !== '' && montoNumero > 0 && montoNumero <= MAXIMO_GASTO && fecha !== ''

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valido) return
    setGuardando(true)
    const ok = await onGuardar({
      descripcion: descripcion.trim(),
      monto: montoNumero,
      fecha,
      animal_id: para === PARA_TODOS ? null : para,
    })
    setGuardando(false)
    if (ok && !inicial) {
      setDescripcion('')
      setMonto('')
      setPara(PARA_TODOS)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="descripcion">Qué se compró</label>
        <input
          id="descripcion"
          value={descripcion}
          placeholder="Ej: 2 sacos de concentrado"
          onChange={(e) => setDescripcion(e.target.value)}
          required
        />
      </div>
      <div className="field-row">
        <CampoMonto
          id="monto"
          label="Monto (₡)"
          valor={monto}
          maximo={MAXIMO_GASTO}
          onChange={setMonto}
        />
        <div className="field">
          <label htmlFor="fecha">Fecha</label>
          <input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="para">Para</label>
        <select id="para" value={para} onChange={(e) => setPara(e.target.value)}>
          <option value={PARA_TODOS}>Todos los terneros</option>
          {terneros.map((t) => (
            <option key={t.id} value={t.id}>
              Solo {t.nombre}
            </option>
          ))}
        </select>
      </div>
      <button className="btn-primary" type="submit" disabled={!valido || guardando}>
        {guardando ? 'Guardando...' : textoBoton}
      </button>
    </form>
  )
}

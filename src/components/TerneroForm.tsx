import { useState, type FormEvent } from 'react'
import { hoy } from '../lib/formato'
import { MAXIMO_TERNERO } from '../lib/limites'
import type { AnimalInput } from '../lib/types'
import CampoMonto from './CampoMonto'

// Formulario de ternero. Se usa para agregar (vacío) y para editar (con valores).
export default function TerneroForm({
  inicial,
  textoBoton,
  onGuardar,
}: {
  inicial?: AnimalInput
  textoBoton: string
  // Devuelve true si se guardó, para limpiar el formulario solo en ese caso.
  onGuardar: (datos: AnimalInput) => Promise<boolean>
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [precio, setPrecio] = useState(inicial ? String(inicial.precio_compra) : '')
  const [fecha, setFecha] = useState(inicial?.fecha_compra ?? hoy())
  const [guardando, setGuardando] = useState(false)

  // Vacío cuenta como ₡0 (terneros regalados).
  const precioNumero = Number(precio)
  const valido =
    nombre.trim() !== '' &&
    precioNumero >= 0 &&
    precioNumero <= MAXIMO_TERNERO &&
    fecha !== ''

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valido) return
    setGuardando(true)
    const ok = await onGuardar({ nombre: nombre.trim(), precio_compra: precioNumero, fecha_compra: fecha })
    setGuardando(false)
    if (ok && !inicial) {
      setNombre('')
      setPrecio('')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="nombre">Nombre o número</label>
        <input
          id="nombre"
          value={nombre}
          placeholder="Ej: Pinto, o arete 123"
          onChange={(e) => setNombre(e.target.value)}
          required
        />
      </div>
      <div className="field-row">
        <CampoMonto
          id="precio"
          label="Precio de compra (₡)"
          valor={precio}
          maximo={MAXIMO_TERNERO}
          requerido={false}
          onChange={setPrecio}
        />
        <div className="field">
          <label htmlFor="fecha-compra">Fecha de compra</label>
          <input
            id="fecha-compra"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </div>
      </div>
      <button className="btn-primary" type="submit" disabled={!valido || guardando}>
        {guardando ? 'Guardando...' : textoBoton}
      </button>
    </form>
  )
}

import { useState, type FormEvent } from 'react'
import { hoy } from '../lib/formato'
import { MAXIMO_TERNERO } from '../lib/limites'
import { HEMBRAS_ADULTAS, TIPOS_ANIMAL, type AnimalInput, type Lugar, type ResumenAnimal, type TipoAnimal } from '../lib/types'
import CampoMonto from './CampoMonto'

const DE_LA_FINCA = ''
const OTRO_DUENIO = '__otro__'

// Formulario de animal. Se usa para agregar (vacío) y para editar (con valores).
export default function AnimalForm({
  inicial,
  animales,
  idEditando,
  textoBoton,
  onGuardar,
}: {
  inicial?: AnimalInput
  // Para elegir la mamá y los dueños que ya existen.
  animales: ResumenAnimal[]
  // Al editar, el animal no puede ser su propia mamá.
  idEditando?: string
  textoBoton: string
  // Devuelve true si se guardó, para limpiar el formulario solo en ese caso.
  onGuardar: (datos: AnimalInput) => Promise<boolean>
}) {
  const duenios = [...new Set(animales.map((a) => a.duenio).filter((d): d is string => d !== null))].sort()

  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoAnimal>(inicial?.tipo ?? 'Vaca')
  const [color, setColor] = useState(inicial?.color ?? '')
  const [nacimiento, setNacimiento] = useState(inicial?.fecha_nacimiento ?? '')
  const [madreId, setMadreId] = useState(inicial?.madre_id ?? '')
  const [duenioElegido, setDuenioElegido] = useState(inicial?.duenio ?? DE_LA_FINCA)
  const [duenioNuevo, setDuenioNuevo] = useState('')
  const [lugar, setLugar] = useState<Lugar>(inicial?.lugar ?? 'Finca')
  const [llegada, setLlegada] = useState(inicial?.fecha_compra ?? hoy())
  // Mientras no se toque "Llegó a la finca", sigue a la fecha de nacimiento (si nació aquí, es
  // la misma).
  const [llegadaTocada, setLlegadaTocada] = useState(inicial !== undefined)
  const [precio, setPrecio] = useState(inicial ? String(inicial.precio_compra) : '')
  const [nota, setNota] = useState(inicial?.nota ?? '')
  const [guardando, setGuardando] = useState(false)

  const madres = animales.filter(
    (a) => HEMBRAS_ADULTAS.includes(a.tipo) && a.animal_id !== idEditando
  )
  const duenio =
    duenioElegido === OTRO_DUENIO ? duenioNuevo.trim() || null : duenioElegido || null
  const deLaFinca = duenio === null
  const precioNumero = deLaFinca ? Number(precio) : 0
  const valido =
    nombre.trim() !== '' &&
    llegada !== '' &&
    precioNumero >= 0 &&
    precioNumero <= MAXIMO_TERNERO &&
    (duenioElegido !== OTRO_DUENIO || duenioNuevo.trim() !== '')

  function cambiarNacimiento(valor: string) {
    setNacimiento(valor)
    if (!llegadaTocada && valor) setLlegada(valor)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valido) return
    setGuardando(true)
    const ok = await onGuardar({
      nombre: nombre.trim(),
      tipo,
      color: color.trim() || null,
      fecha_nacimiento: nacimiento || null,
      madre_id: madreId || null,
      duenio,
      lugar,
      fecha_compra: llegada,
      precio_compra: precioNumero,
      nota: nota.trim() || null,
    })
    setGuardando(false)
    if (ok && !inicial) {
      setNombre('')
      setColor('')
      setNacimiento('')
      setMadreId('')
      setPrecio('')
      setNota('')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="nombre">Nombre</label>
        <input
          id="nombre"
          value={nombre}
          placeholder="Ej: Princesa, o arete 123"
          onChange={(e) => setNombre(e.target.value)}
          required
        />
      </div>
      <div className="field-row field-row-igual">
        <div className="field">
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoAnimal)}>
            {TIPOS_ANIMAL.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="color">Color</label>
          <input
            id="color"
            value={color}
            placeholder="Opcional"
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="madre">Mamá</label>
          <select id="madre" value={madreId} onChange={(e) => setMadreId(e.target.value)}>
            <option value="">No se sabe</option>
            {madres.map((m) => (
              <option key={m.animal_id} value={m.animal_id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="nacimiento">Nació</label>
          <input
            id="nacimiento"
            type="date"
            value={nacimiento}
            onChange={(e) => cambiarNacimiento(e.target.value)}
          />
        </div>
      </div>
      <div className="field-row field-row-igual">
        <div className="field">
          <label htmlFor="duenio">Dueño</label>
          <select
            id="duenio"
            value={duenioElegido}
            onChange={(e) => setDuenioElegido(e.target.value)}
          >
            <option value={DE_LA_FINCA}>De la finca</option>
            {duenios.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
            <option value={OTRO_DUENIO}>Otro dueño...</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="lugar">Lugar</label>
          <select id="lugar" value={lugar} onChange={(e) => setLugar(e.target.value as Lugar)}>
            <option>Finca</option>
            <option>Potrero</option>
          </select>
        </div>
      </div>
      {duenioElegido === OTRO_DUENIO && (
        <div className="field">
          <label htmlFor="duenio-nuevo">Nombre del dueño</label>
          <input
            id="duenio-nuevo"
            value={duenioNuevo}
            placeholder="Ej: Freddy Durán"
            onChange={(e) => setDuenioNuevo(e.target.value)}
            required
          />
        </div>
      )}
      <div className="field-row">
        {deLaFinca && (
          <CampoMonto
            id="precio"
            label="Costó (₡)"
            valor={precio}
            maximo={MAXIMO_TERNERO}
            requerido={false}
            onChange={setPrecio}
          />
        )}
        <div className="field">
          <label htmlFor="llegada">Llegó a la finca</label>
          <input
            id="llegada"
            type="date"
            value={llegada}
            onChange={(e) => {
              setLlegada(e.target.value)
              setLlegadaTocada(true)
            }}
            required
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="nota">Nota</label>
        <input
          id="nota"
          value={nota}
          placeholder="Opcional. Ej: Huérfano"
          onChange={(e) => setNota(e.target.value)}
        />
      </div>
      <button className="btn-primary" type="submit" disabled={!valido || guardando}>
        {guardando ? 'Guardando...' : textoBoton}
      </button>
    </form>
  )
}

import { useState, type FormEvent } from 'react'
import { animalesDelGrupo, estaActivo, sumarDias, sumarMeses } from '../lib/animales'
import { hoy } from '../lib/formato'
import type { ClaseAplicacion, GrupoAplicacion, ResumenAnimal } from '../lib/types'

export interface NuevaAplicacion {
  fecha: string
  clase: ClaseAplicacion
  producto: string
  dosis: string | null
  grupo: GrupoAplicacion
  proxima: string | null
  // Ids de los animales a los que se les aplicó y a los que les quedó pendiente.
  aplicados: string[]
  pendientes: string[]
}

type Marca = 'aplicado' | 'pendiente'

// Productos que se usan en Guapinol, para sugerir aunque todavía no estén en el historial.
const PRODUCTOS_COMUNES = [
  'Albendazol', 'Actyl', 'Baytril', 'Calfon', 'Calfosvit', 'Catosal', 'Dermethon', 'Dexametasona',
  'Diclofenaco', 'Ectotraz', 'Fenbendazol', 'Imidocard', 'Impacto', 'Impulsor', 'Ivermectina 3%',
  'Olivitasan', 'Parasitol', 'Singap', 'Vitamina B12', 'Vitamina complejo B',
]

const GRUPOS: { id: GrupoAplicacion; label: string }[] = [
  { id: 'todos', label: 'Todo el hato' },
  { id: 'vacas', label: 'Vacas y novillas' },
  { id: 'finca', label: 'Finca' },
  { id: 'potrero', label: 'Potrero' },
  { id: 'elegidos', label: 'Elegir animales' },
]

// Formulario para registrar un tratamiento o un baño y a quiénes se les aplicó.
export default function FormAplicacion({
  animales,
  productosUsados,
  onGuardar,
}: {
  animales: ResumenAnimal[]
  productosUsados: string[]
  onGuardar: (datos: NuevaAplicacion) => Promise<boolean>
}) {
  const [clase, setClase] = useState<ClaseAplicacion>('Tratamiento')
  const [producto, setProducto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [dosis, setDosis] = useState('')
  const [grupo, setGrupo] = useState<GrupoAplicacion>('todos')
  const [marcas, setMarcas] = useState<Record<string, Marca>>({})
  const [proxima, setProxima] = useState('ninguna')
  const [proximaFecha, setProximaFecha] = useState('')
  const [guardando, setGuardando] = useState(false)

  const activos = animales.filter(estaActivo)
  const delGrupo = grupo === 'elegidos' ? [] : animalesDelGrupo(grupo, animales)
  const pendientes = Object.keys(marcas).filter((id) => marcas[id] === 'pendiente')
  const aplicados =
    grupo === 'elegidos'
      ? Object.keys(marcas).filter((id) => marcas[id] === 'aplicado')
      : delGrupo.map((a) => a.animal_id).filter((id) => !pendientes.includes(id))
  const productos = [...new Set([...productosUsados, ...PRODUCTOS_COMUNES])].sort()
  const valido = producto.trim() !== '' && fecha !== '' && aplicados.length + pendientes.length > 0

  function cambiarGrupo(nuevo: GrupoAplicacion) {
    setGrupo(nuevo)
    setMarcas({})
  }

  // Elegir animales: un toque marca aplicado, otro pendiente y otro lo quita.
  function alternarElegido(id: string) {
    setMarcas((prev) => {
      const siguiente = { ...prev }
      if (!prev[id]) siguiente[id] = 'aplicado'
      else if (prev[id] === 'aplicado') siguiente[id] = 'pendiente'
      else delete siguiente[id]
      return siguiente
    })
  }

  // En un grupo todos quedan aplicados; un toque deja a uno pendiente.
  function alternarPendiente(id: string) {
    setMarcas((prev) => {
      const siguiente = { ...prev }
      if (prev[id] === 'pendiente') delete siguiente[id]
      else siguiente[id] = 'pendiente'
      return siguiente
    })
  }

  function calcularProxima() {
    if (proxima === '15d') return sumarDias(fecha, 15)
    if (proxima === '1m') return sumarMeses(fecha, 1)
    if (proxima === '3m') return sumarMeses(fecha, 3)
    if (proxima === 'fecha') return proximaFecha || null
    return null
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!valido) return
    setGuardando(true)
    await onGuardar({
      fecha,
      clase,
      producto: producto.trim(),
      dosis: dosis.trim() || null,
      grupo,
      proxima: calcularProxima(),
      aplicados,
      pendientes,
    })
    setGuardando(false)
  }

  return (
    <form onSubmit={guardar}>
      <div className="type-toggle">
        {(['Tratamiento', 'Baño'] as const).map((c) => (
          <button key={c} type="button" className={clase === c ? 'active' : ''} onClick={() => setClase(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="producto">Producto</label>
        <input
          id="producto"
          list="productos"
          value={producto}
          placeholder="Ej: Ivermectina 3%"
          onChange={(e) => setProducto(e.target.value)}
          required
        />
        <datalist id="productos">
          {productos.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="dosis">Dosis o nota</label>
          <input id="dosis" value={dosis} placeholder="Ej: 20 cc c/u" onChange={(e) => setDosis(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="fecha-ap">Fecha</label>
          <input id="fecha-ap" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </div>
      </div>

      <div className="field">
        <label>A quiénes</label>
        <div className="chips chips-form">
          {GRUPOS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={grupo === g.id ? 'active' : ''}
              onClick={() => cambiarGrupo(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {grupo === 'elegidos' ? (
        <>
          <p className="nota nota-form">
            Toca un animal una vez para marcarlo <strong>aplicado</strong>, otra vez para dejarlo{' '}
            <strong>pendiente</strong>, y otra para quitarlo.
          </p>
          <div className="eleccion">
            {activos.map((a) => (
              <button
                key={a.animal_id}
                type="button"
                className={`eleccion-item ${marcas[a.animal_id] ?? ''}`}
                onClick={() => alternarElegido(a.animal_id)}
              >
                <span>{a.nombre}</span>
                <small>
                  {marcas[a.animal_id] === 'aplicado'
                    ? 'Aplicado'
                    : marcas[a.animal_id] === 'pendiente'
                      ? 'Pendiente'
                      : a.tipo}
                </small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <details className="pendientes-grupo">
          <summary>
            Se aplica a {delGrupo.length} animales
            {pendientes.length > 0 ? ` (${pendientes.length} pendiente(s))` : ''}. ¿A alguno le faltó?
          </summary>
          <div className="eleccion">
            {delGrupo.map((a) => (
              <button
                key={a.animal_id}
                type="button"
                className={`eleccion-item ${marcas[a.animal_id] === 'pendiente' ? 'pendiente' : 'aplicado'}`}
                onClick={() => alternarPendiente(a.animal_id)}
              >
                <span>{a.nombre}</span>
                <small>{marcas[a.animal_id] === 'pendiente' ? 'Pendiente' : 'Aplicado'}</small>
              </button>
            ))}
          </div>
        </details>
      )}

      <div className="field-row">
        <div className="field">
          <label htmlFor="proxima">Próxima aplicación</label>
          <select id="proxima" value={proxima} onChange={(e) => setProxima(e.target.value)}>
            <option value="ninguna">No se repite</option>
            <option value="15d">En 15 días</option>
            <option value="1m">En 1 mes</option>
            <option value="3m">En 3 meses</option>
            <option value="fecha">Otra fecha</option>
          </select>
        </div>
        {proxima === 'fecha' && (
          <div className="field">
            <label htmlFor="proxima-fecha">Fecha</label>
            <input
              id="proxima-fecha"
              type="date"
              min={fecha}
              value={proximaFecha}
              onChange={(e) => setProximaFecha(e.target.value)}
            />
          </div>
        )}
      </div>

      <button className="btn-primary" type="submit" disabled={!valido || guardando}>
        {guardando ? 'Guardando...' : 'Guardar aplicación'}
      </button>
    </form>
  )
}

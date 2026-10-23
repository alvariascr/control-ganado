import { useCallback, useEffect, useState } from 'react'
import AnimalForm from '../components/AnimalForm'
import FichaAnimal from '../components/FichaAnimal'
import Modal from '../components/Modal'
import TarjetaAnimal from '../components/TarjetaAnimal'
import { estaActivo } from '../lib/animales'
import { formatoColones } from '../lib/formato'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../lib/ToastContext'
import type { AnimalInput, Lugar, ResumenAnimal, TipoAnimal } from '../lib/types'

type FiltroTipo = 'Todos' | 'Vacas' | 'Novillos' | 'Crías' | 'Toros'

const FILTROS_TIPO: { id: FiltroTipo; label: string; tipos: TipoAnimal[] }[] = [
  { id: 'Todos', label: 'Todos', tipos: ['Toro', 'Vaca', 'Novilla', 'Novillo', 'Ternera', 'Ternero'] },
  { id: 'Vacas', label: 'Vacas', tipos: ['Vaca'] },
  { id: 'Novillos', label: 'Novillas y novillos', tipos: ['Novilla', 'Novillo'] },
  { id: 'Crías', label: 'Crías', tipos: ['Ternera', 'Ternero'] },
  { id: 'Toros', label: 'Toros', tipos: ['Toro'] },
]

const DUENIO_TODOS = '__todos__'
const DUENIO_FINCA = '__finca__'

// El hato: los animales que siguen en la finca (con filtros) y, abajo, los vendidos y los que
// murieron. Al tocar uno se abre su ficha.
export default function Ganado() {
  const { show } = useToast()
  const [animales, setAnimales] = useState<ResumenAnimal[]>([])
  const [sinAnimal, setSinAnimal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [agregando, setAgregando] = useState(false)
  const [abiertoId, setAbiertoId] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('Todos')
  const [lugar, setLugar] = useState<'Todos' | Lugar>('Todos')
  const [duenio, setDuenio] = useState(DUENIO_TODOS)

  const cargar = useCallback(async () => {
    const [animalesRes, resumenRes] = await Promise.all([
      // En el orden en que se agregaron, para que no cambien de lugar al editarlos.
      supabase.from('v_resumen_animal').select('*').order('creado_en'),
      supabase.from('v_resumen').select('compras_sin_ternero').single(),
    ])
    if (animalesRes.error || resumenRes.error) {
      show('No se pudo cargar el ganado.', 'error')
    } else {
      setAnimales(animalesRes.data)
      setSinAnimal(Number(resumenRes.data.compras_sin_ternero))
    }
    setCargando(false)
  }, [show])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function agregar(datos: AnimalInput) {
    const { error } = await supabase.from('animales').insert(datos)
    if (error) {
      show('No se pudo guardar el animal.', 'error')
      return false
    }
    show(`${datos.nombre} agregado.`)
    setAgregando(false)
    await cargar()
    return true
  }

  const duenios = [...new Set(animales.map((a) => a.duenio).filter((d): d is string => d !== null))].sort()
  const tipos = FILTROS_TIPO.find((f) => f.id === filtroTipo)!.tipos
  const pasaFiltros = (a: ResumenAnimal) =>
    tipos.includes(a.tipo) &&
    (lugar === 'Todos' || a.lugar === lugar) &&
    (duenio === DUENIO_TODOS ||
      (duenio === DUENIO_FINCA ? a.duenio === null : a.duenio === duenio))

  const activos = animales.filter((a) => estaActivo(a) && pasaFiltros(a))
  const vendidos = animales.filter((a) => a.fecha_venta !== null && pasaFiltros(a))
  const muertos = animales.filter((a) => a.fecha_muerte !== null && pasaFiltros(a))
  // Se busca en la lista recargada para que la ficha muestre los datos al día.
  const abierto = animales.find((a) => a.animal_id === abiertoId) ?? null

  const lista = (grupo: ResumenAnimal[]) => (
    <ul className="lista lista-tarjetas">
      {grupo.map((a) => (
        <li key={a.animal_id}>
          <TarjetaAnimal animal={a} animales={animales} onAbrir={setAbiertoId} />
        </li>
      ))}
    </ul>
  )

  return (
    <>
      <div className="encabezado">
        <h2>Ganado</h2>
        <button className="btn-agregar" onClick={() => setAgregando(true)}>
          + Agregar animal
        </button>
      </div>

      {sinAnimal > 0 && (
        <div className="msg error">
          Hay {formatoColones(sinAnimal)} en compras "para todos" de días en que no había animales
          de la finca, así que no se le cargaron a ninguno. Revisa las fechas de esas compras o de
          los animales.
        </div>
      )}

      <div className="chips">
        {FILTROS_TIPO.map((f) => (
          <button
            key={f.id}
            className={filtroTipo === f.id ? 'active' : ''}
            onClick={() => setFiltroTipo(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="filtros">
        <label>
          Lugar
          <select value={lugar} onChange={(e) => setLugar(e.target.value as 'Todos' | Lugar)}>
            <option>Todos</option>
            <option>Finca</option>
            <option>Potrero</option>
          </select>
        </label>
        <label>
          Dueño
          <select value={duenio} onChange={(e) => setDuenio(e.target.value)}>
            <option value={DUENIO_TODOS}>Todos</option>
            <option value={DUENIO_FINCA}>De la finca</option>
            {duenios.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      {cargando ? (
        <div className="empty-state">Cargando...</div>
      ) : animales.length === 0 ? (
        <div className="empty-state">Todavía no hay animales.</div>
      ) : (
        <>
          <div className="section-title">En la finca ({activos.length})</div>
          {activos.length === 0 ? (
            <div className="empty-state">No hay animales con estos filtros.</div>
          ) : (
            lista(activos)
          )}

          {vendidos.length > 0 && (
            <>
              <div className="section-title">Vendidos ({vendidos.length})</div>
              {lista(vendidos)}
            </>
          )}

          {muertos.length > 0 && (
            <>
              <div className="section-title">Murieron ({muertos.length})</div>
              {lista(muertos)}
            </>
          )}
        </>
      )}

      {agregando && (
        <Modal title="Nuevo animal" onClose={() => setAgregando(false)}>
          <AnimalForm animales={animales} textoBoton="Agregar animal" onGuardar={agregar} />
        </Modal>
      )}

      {abierto && (
        <FichaAnimal
          key={abierto.animal_id}
          animal={abierto}
          animales={animales}
          onCerrar={() => setAbiertoId(null)}
          onCambio={cargar}
          onAbrir={setAbiertoId}
        />
      )}
    </>
  )
}

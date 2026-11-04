import { useCallback, useEffect, useState, type FormEvent } from 'react'
import CampoMonto from '../components/CampoMonto'
import Confirmacion from '../components/Confirmacion'
import Modal from '../components/Modal'
import { sumarDias } from '../lib/animales'
import { formatoColones, hoy } from '../lib/formato'
import { MAXIMO_GASTO } from '../lib/limites'
import { lunesDe, rangoSemana } from '../lib/semanas'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../lib/ToastContext'
import type { Aportante, Aporte } from '../lib/types'

interface SemanaResumen {
  lunes: string
  total: number
  faltaron: string[]
  // La semana en curso: todavía no se cuenta como incompleta.
  enCurso: boolean
}

interface Mes {
  // AAAA-MM
  clave: string
  semanas: SemanaResumen[]
}

// "2026-10" -> "Octubre 2026"
function nombreMes(clave: string) {
  const [y, m] = clave.split('-').map(Number)
  const mes = new Date(y, m - 1, 1).toLocaleDateString('es-CR', { month: 'long' })
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${y}`
}

// Plata que pone cada persona por semana para pagarles a los trabajadores. Es un gasto de la
// finca aparte: no se suma a lo invertido en los animales.
export default function Aportes() {
  const { show } = useToast()
  const [personas, setPersonas] = useState<Aportante[]>([])
  const [aportes, setAportes] = useState<Aporte[]>([])
  const [cargando, setCargando] = useState(true)
  const estaSemana = lunesDe(hoy())
  const [semana, setSemana] = useState(estaSemana)
  // Persona a la que se le está anotando o cambiando el aporte de la semana elegida.
  const [abiertaId, setAbiertaId] = useState<string | null>(null)
  const [viendoPersonas, setViendoPersonas] = useState(false)
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  // Meses desplegados en la lista; el mes actual empieza abierto.
  const [mesesAbiertos, setMesesAbiertos] = useState(() => new Set([estaSemana.slice(0, 7)]))

  const cargar = useCallback(async () => {
    const [personasRes, aportesRes] = await Promise.all([
      supabase
        .from('aportantes')
        .select('id, nombre, monto_semanal, activo')
        .order('creado_en'),
      supabase
        .from('aportes')
        .select('id, aportante_id, semana, monto')
        .order('semana', { ascending: false }),
    ])
    if (personasRes.error || aportesRes.error) {
      show('No se pudieron cargar los aportes.', 'error')
    } else {
      setPersonas(personasRes.data)
      setAportes(aportesRes.data)
    }
    setCargando(false)
  }, [show])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function anotar(persona: Aportante, monto: number, aporte?: Aporte) {
    const { error } = aporte
      ? await supabase.from('aportes').update({ monto }).eq('id', aporte.id)
      : await supabase.from('aportes').insert({ aportante_id: persona.id, semana, monto })
    if (error) {
      show('No se pudo guardar el aporte.', 'error')
      return false
    }
    show(`Aporte de ${persona.nombre} guardado.`)
    await cargar()
    return true
  }

  async function pagoRapido(persona: Aportante) {
    setGuardandoId(persona.id)
    await anotar(persona, Number(persona.monto_semanal))
    setGuardandoId(null)
  }

  async function quitar(aporte: Aporte) {
    const { error } = await supabase.from('aportes').delete().eq('id', aporte.id)
    if (error) {
      show('No se pudo quitar el aporte.', 'error')
      return
    }
    show('Aporte quitado.')
    setAbiertaId(null)
    await cargar()
  }

    const deLaSemana = aportes.filter((a) => a.semana === semana)
  // En la semana se ven los que aportan ahora y también quien ya no aporta pero sí puso esa semana.
  const filas = personas.filter((p) => p.activo || deLaSemana.some((a) => a.aportante_id === p.id))
  const totalSemana = deLaSemana.reduce((s, a) => s + Number(a.monto), 0)
  const esperado = personas.filter((p) => p.activo).reduce((s, p) => s + Number(p.monto_semanal), 0)
  const total = aportes.reduce((s, a) => s + Number(a.monto), 0)

  const porPersona = personas
    .map((p) => {
      const suyos = aportes.filter((a) => a.aportante_id === p.id)
      return { persona: p, semanas: suyos.length, total: suyos.reduce((s, a) => s + Number(a.monto), 0) }
    })
    .filter((x) => x.semanas > 0)

  // Primera y última semana en que aportó cada persona, para saber en qué semanas le tocaba.
  const desde = new Map<string, string>()
  const hasta = new Map<string, string>()
  for (const a of aportes) {
    if (!desde.has(a.aportante_id) || a.semana < desde.get(a.aportante_id)!) desde.set(a.aportante_id, a.semana)
    if (!hasta.has(a.aportante_id) || a.semana > hasta.get(a.aportante_id)!) hasta.set(a.aportante_id, a.semana)
  }
  function faltaron(lunes: string, deEsa: Aporte[]) {
    return personas.filter(
      (p) =>
        desde.has(p.id) &&
        desde.get(p.id)! <= lunes &&
        (p.activo || hasta.get(p.id)! >= lunes) &&
        !deEsa.some((a) => a.aportante_id === p.id)
    )
  }

  // Todas las semanas desde el primer aporte hasta hoy (también las que nadie aportó),
  // agrupadas por mes (el mes del lunes), de la más reciente a la más vieja.
  const meses: Mes[] = []
  if (aportes.length > 0) {
    const primera = aportes.reduce((m, a) => (a.semana < m ? a.semana : m), aportes[0].semana)
    for (let lunes = estaSemana; lunes >= primera; lunes = sumarDias(lunes, -7)) {
      const deEsa = aportes.filter((a) => a.semana === lunes)
      const fila: SemanaResumen = {
        lunes,
        total: deEsa.reduce((s, a) => s + Number(a.monto), 0),
        faltaron: faltaron(lunes, deEsa).map((p) => p.nombre),
        enCurso: lunes === estaSemana,
      }
      const clave = lunes.slice(0, 7)
      const mes = meses.find((m) => m.clave === clave)
      if (mes) mes.semanas.push(fila)
      else meses.push({ clave, semanas: [fila] })
    }
  }

  function irASemana(lunes: string) {
    setSemana(lunes)
    // En el celular la semana elegida está arriba de la lista.
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function alternarMes(clave: string) {
    setMesesAbiertos((abiertos) => {
      const nuevos = new Set(abiertos)
      if (nuevos.has(clave)) nuevos.delete(clave)
      else nuevos.add(clave)
      return nuevos
    })
  }

  const abierta = personas.find((p) => p.id === abiertaId) ?? null
  const aporteAbierto = deLaSemana.find((a) => a.aportante_id === abiertaId)

  if (cargando) return <div className="empty-state">Cargando...</div>

  return (
    <div className="dos-columnas">
      <section className="columna-formulario">
        <div className="encabezado">
          <h2>Aportes</h2>
          <button className="btn-agregar" onClick={() => setViendoPersonas(true)}>
            Personas
          </button>
        </div>
        <p className="texto-ayuda">Lo que pone cada uno por semana para pagarles a los trabajadores.</p>

        <div className="selector-semana">
          <button aria-label="Semana anterior" onClick={() => setSemana(sumarDias(semana, -7))}>
            ‹
          </button>
          <span>
            <strong>{rangoSemana(semana)}</strong>
            <small>{semana === estaSemana ? 'Esta semana' : semana.slice(0, 4)}</small>
          </span>
          <button
            aria-label="Semana siguiente"
            onClick={() => setSemana(sumarDias(semana, 7))}
            disabled={semana >= estaSemana}
          >
            ›
          </button>
        </div>

        {filas.length === 0 ? (
          <div className="empty-state">
            Todavía no hay personas. Toca <strong>Personas</strong> para agregar a quienes aportan.
          </div>
        ) : (
          <ul className="lista">
            {filas.map((p) => {
              const aporte = deLaSemana.find((a) => a.aportante_id === p.id)
              if (aporte) {
                return (
                  <li key={p.id}>
                    <button className="lista-item" onClick={() => setAbiertaId(p.id)}>
                      <span className="lista-texto">
                        <span className="lista-descripcion">{p.nombre}</span>
                        <span className="lista-detalle">Ya aportó</span>
                      </span>
                      <span className="lista-monto positivo">{formatoColones(Number(aporte.monto))}</span>
                    </button>
                  </li>
                )
              }
              return (
                <li key={p.id} className="lista-item lista-item-fija">
                  <button className="fila-abrir" onClick={() => setAbiertaId(p.id)}>
                    <span className="lista-descripcion">{p.nombre}</span>
                    <span className="lista-detalle">Falta · otro monto</span>
                  </button>
                  <button
                    className="btn-mini"
                    onClick={() => pagoRapido(p)}
                    disabled={guardandoId === p.id}
                  >
                    Aportó {formatoColones(Number(p.monto_semanal))}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {filas.length > 0 && (
          <div className="total-bar total-semana">
            <span>Total de la semana</span>
            <strong>
              {formatoColones(totalSemana)}
              {totalSemana < esperado ? (
                <small> de {formatoColones(esperado)}</small>
              ) : null}
            </strong>
          </div>
        )}
      </section>

      <section className="columna-lista">
        <div className="total-bar">
          <span>Total aportado</span>
          <strong>{formatoColones(total)}</strong>
        </div>

        {porPersona.length > 0 && (
          <>
            <div className="section-title">Por persona</div>
            <ul className="lista">
              {porPersona.map(({ persona, semanas: n, total: suma }) => (
                <li key={persona.id} className="lista-item lista-item-fija">
                  <span className="lista-texto">
                    <span className="lista-descripcion">{persona.nombre}</span>
                    <span className="lista-detalle">
                      {n} {n === 1 ? 'semana' : 'semanas'}
                    </span>
                  </span>
                  <span className="lista-monto">{formatoColones(suma)}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="section-title">Por mes</div>
        {meses.length === 0 ? (
          <div className="empty-state">Todavía no hay aportes anotados.</div>
        ) : (
          <ul className="lista">
            {meses.map((mes) => {
              const abierto = mesesAbiertos.has(mes.clave)
              const cerradas = mes.semanas.filter((w) => !w.enCurso)
              const incompletas = cerradas.filter((w) => w.faltaron.length > 0).length
              const n = cerradas.length
              return (
                <li key={mes.clave}>
                  <button
                    className="lista-item"
                    aria-expanded={abierto}
                    onClick={() => alternarMes(mes.clave)}
                  >
                    <span className="lista-texto">
                      <span className="lista-descripcion">
                        <span className={`flecha-mes ${abierto ? 'abierta' : ''}`}>›</span> {nombreMes(mes.clave)}
                      </span>
                      {incompletas > 0 ? (
                        <span className="lista-detalle texto-alerta">
                          Faltó alguien en {incompletas} {incompletas === 1 ? 'semana' : 'semanas'}
                        </span>
                      ) : n > 0 ? (
                        <span className="lista-detalle">
                          {n} {n === 1 ? 'semana' : 'semanas'}, todos aportaron
                        </span>
                      ) : (
                        <span className="lista-detalle">Semana en curso</span>
                      )}
                    </span>
                    <span className="lista-monto">
                      {formatoColones(mes.semanas.reduce((s, w) => s + w.total, 0))}
                    </span>
                  </button>
                  {abierto && (
                    <ul className="lista lista-semanas">
                      {mes.semanas.map((w) => (
                        <li key={w.lunes}>
                          <button
                            className={`lista-item lista-item-sub ${w.lunes === semana ? 'lista-item-elegido' : ''}`}
                            onClick={() => irASemana(w.lunes)}
                          >
                            <span className="lista-texto">
                              <span className="lista-descripcion">{rangoSemana(w.lunes)}</span>
                              {w.enCurso ? (
                                <span className="lista-detalle">
                                  Esta semana{w.faltaron.length > 0 && ` · falta ${w.faltaron.join(', ')}`}
                                </span>
                              ) : w.faltaron.length > 0 ? (
                                <span className="lista-detalle texto-alerta">
                                  Faltó {w.faltaron.join(', ')}
                                </span>
                              ) : null}
                            </span>
                            <span className="lista-monto">{formatoColones(w.total)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {abierta && (
        <Modal title={abierta.nombre} onClose={() => setAbiertaId(null)}>
          <FormAporte
            key={`${abierta.id}-${semana}`}
            semana={semana}
            inicial={aporteAbierto ? Number(aporteAbierto.monto) : Number(abierta.monto_semanal)}
            textoBoton={aporteAbierto ? 'Guardar cambios' : 'Guardar aporte'}
            onGuardar={async (monto) => {
              const ok = await anotar(abierta, monto, aporteAbierto)
              if (ok) setAbiertaId(null)
            }}
            onQuitar={aporteAbierto ? () => quitar(aporteAbierto) : undefined}
          />
        </Modal>
      )}

      {viendoPersonas && (
        <Modal title="Personas que aportan" onClose={() => setViendoPersonas(false)}>
          <Personas personas={personas} aportes={aportes} onCambio={cargar} />
        </Modal>
      )}
    </div>
  )
}

function FormAporte({
  semana,
  inicial,
  textoBoton,
  onGuardar,
  onQuitar,
}: {
  semana: string
  inicial: number
  textoBoton: string
  onGuardar: (monto: number) => Promise<void>
  onQuitar?: () => Promise<void>
}) {
  const [monto, setMonto] = useState(String(inicial))
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const numero = Number(monto)
  const valido = numero > 0 && numero <= MAXIMO_GASTO

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valido) return
    setGuardando(true)
    await onGuardar(numero)
    setGuardando(false)
  }

  return (
    <>
      <p className="texto-ayuda">Semana del {rangoSemana(semana)} {semana.slice(0, 4)}</p>
      <form onSubmit={handleSubmit}>
        <CampoMonto id="monto-aporte" label="Aporte (₡)" valor={monto} maximo={MAXIMO_GASTO} onChange={setMonto} />
        <button className="btn-primary" type="submit" disabled={!valido || guardando}>
          {guardando ? 'Guardando...' : textoBoton}
        </button>
      </form>
      {onQuitar &&
        (confirmando ? (
          <Confirmacion
            pregunta="¿Quitar el aporte de esta semana?"
            textoConfirmar="Sí, quitar"
            onConfirmar={onQuitar}
            onCancelar={() => setConfirmando(false)}
          />
        ) : (
          <button className="btn-danger" onClick={() => setConfirmando(true)}>
            Quitar aporte
          </button>
        ))}
    </>
  )
}

// Lista de personas y formulario para agregar o cambiar una (nombre, aporte semanal y si
// todavía aporta).
function Personas({
  personas,
  aportes,
  onCambio,
}: {
  personas: Aportante[]
  aportes: Aporte[]
  onCambio: () => Promise<void>
}) {
  const { show } = useToast()
  // null = agregar una nueva.
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const editando = personas.find((p) => p.id === editandoId) ?? null
  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')
  const [activo, setActivo] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  function elegir(p: Aportante | null) {
    setEditandoId(p?.id ?? null)
    setNombre(p?.nombre ?? '')
    setMonto(p ? String(p.monto_semanal) : '')
    setActivo(p?.activo ?? true)
    setConfirmando(false)
  }

  const numero = Number(monto)
  const repetido = personas.some(
    (p) => p.id !== editandoId && p.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()
  )
  const valido = nombre.trim() !== '' && !repetido && numero > 0 && numero <= MAXIMO_GASTO
  const tieneAportes = editando ? aportes.some((a) => a.aportante_id === editando.id) : false

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valido) return
    setGuardando(true)
    const datos = { nombre: nombre.trim(), monto_semanal: numero, activo }
    const { error } = editando
      ? await supabase.from('aportantes').update(datos).eq('id', editando.id)
      : await supabase.from('aportantes').insert(datos)
    setGuardando(false)
    if (error) {
      show('No se pudo guardar la persona.', 'error')
      return
    }
    show(editando ? 'Cambios guardados.' : `${datos.nombre} agregado.`)
    elegir(null)
    await onCambio()
  }

  async function eliminar() {
    if (!editando) return
    const { error } = await supabase.from('aportantes').delete().eq('id', editando.id)
    if (error) {
      show('No se pudo eliminar.', 'error')
      return
    }
    show(`${editando.nombre} eliminado.`)
    elegir(null)
    await onCambio()
  }

  return (
    <>
      {personas.length > 0 && (
        <ul className="lista">
          {personas.map((p) => (
            <li key={p.id}>
              <button
                className={`lista-item ${p.id === editandoId ? 'lista-item-elegido' : ''}`}
                onClick={() => elegir(p)}
              >
                <span className="lista-texto">
                  <span className="lista-descripcion">{p.nombre}</span>
                  <span className="lista-detalle">
                    {p.activo ? `${formatoColones(Number(p.monto_semanal))} por semana` : 'Ya no aporta'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="section-title">{editando ? `Cambiar a ${editando.nombre}` : 'Agregar persona'}</div>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="nombre-persona">Nombre</label>
          <input
            id="nombre-persona"
            value={nombre}
            placeholder="Ej: Laura"
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          {repetido && <p className="campo-error">Ya hay alguien con ese nombre</p>}
        </div>
        <CampoMonto
          id="monto-semanal"
          label="Aporta por semana (₡)"
          valor={monto}
          maximo={MAXIMO_GASTO}
          onChange={setMonto}
        />
        {editando && (
          <label className="field-check">
            <input type="checkbox" checked={!activo} onChange={(e) => setActivo(!e.target.checked)} />
            Ya no aporta (se guarda lo que ya puso)
          </label>
        )}
        <button className="btn-primary" type="submit" disabled={!valido || guardando}>
          {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar persona'}
        </button>
      </form>

      {editando && (
        <>
          <button className="btn-secondary" onClick={() => elegir(null)}>
            Cancelar
          </button>
          {tieneAportes ? (
            <p className="texto-ayuda">
              No se puede eliminar porque ya tiene aportes. Si ya no aporta, marca la casilla de arriba.
            </p>
          ) : confirmando ? (
            <Confirmacion
              pregunta={`¿Eliminar a ${editando.nombre}?`}
              textoConfirmar="Sí, eliminar"
              onConfirmar={eliminar}
              onCancelar={() => setConfirmando(false)}
            />
          ) : (
            <button className="btn-danger" onClick={() => setConfirmando(true)}>
              Eliminar persona
            </button>
          )}
        </>
      )}
    </>
  )
}

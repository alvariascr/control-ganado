import { useEffect, useState, type FormEvent } from 'react'
import { edad, esDeLaFinca, estaActivo, nombreDuenio, NOMBRE_GRUPO } from '../lib/animales'
import { formatoColones, formatoFecha, hoy } from '../lib/formato'
import { MAXIMO_TERNERO } from '../lib/limites'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../lib/ToastContext'
import {
  HEMBRAS_ADULTAS,
  type AnimalInput,
  type Aplicacion,
  type EstadoAplicacion,
  type GastoAnimal,
  type Lugar,
  type ResumenAnimal,
} from '../lib/types'
import AnimalForm from './AnimalForm'
import CampoMonto from './CampoMonto'
import Confirmacion from './Confirmacion'
import Modal from './Modal'

interface EntradaSanidad extends Aplicacion {
  estado: EstadoAplicacion
}

// Hoja con todo lo de un animal: sus datos, mamá y crías, sanidad y, si es de la finca, la
// plata (lo invertido, en qué, y la venta). Llama a onCambio después de guardar algo, para
// que la lista de afuera se recargue.
export default function FichaAnimal({
  animal,
  animales,
  onCerrar,
  onCambio,
  onAbrir,
}: {
  animal: ResumenAnimal
  animales: ResumenAnimal[]
  onCerrar: () => void
  onCambio: () => Promise<void>
  onAbrir: (animalId: string) => void
}) {
  const { show } = useToast()
  const [gastos, setGastos] = useState<GastoAnimal[] | null>(null)
  const [sanidad, setSanidad] = useState<EntradaSanidad[] | null>(null)
  const [editando, setEditando] = useState(false)
  const [registrandoParto, setRegistrandoParto] = useState(false)
  const [tipoSalida, setTipoSalida] = useState<'venta' | 'muerte'>(
    esDeLaFinca(animal) ? 'venta' : 'muerte'
  )
  const [precioVenta, setPrecioVenta] = useState('')
  const [fechaSalida, setFechaSalida] = useState(hoy())
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState<'salida' | 'eliminar' | null>(null)

  const deLaFinca = esDeLaFinca(animal)
  const vendido = animal.fecha_venta !== null
  const murio = animal.fecha_muerte !== null
  const activo = estaActivo(animal)
  const hembraAdulta = HEMBRAS_ADULTAS.includes(animal.tipo)
  const madre = animales.find((a) => a.animal_id === animal.madre_id)
  const crias = animales
    .filter((a) => a.madre_id === animal.animal_id)
    .sort((x, y) => (y.fecha_nacimiento ?? '').localeCompare(x.fecha_nacimiento ?? ''))
  const otroLugar: Lugar = animal.lugar === 'Finca' ? 'Potrero' : 'Finca'

  useEffect(() => {
    if (!deLaFinca) return
    supabase
      .from('v_gasto_animal')
      .select('compra_id, fecha, descripcion, monto_compra, monto_animal, compartida')
      .eq('animal_id', animal.animal_id)
      .order('fecha', { ascending: false })
      .then(({ data, error }) => {
        if (error) show('No se pudieron cargar los gastos.', 'error')
        else setGastos(data)
      })
  }, [animal.animal_id, animal.invertido, deLaFinca, show])

  useEffect(() => {
    async function cargarSanidad() {
      const { data: filas, error } = await supabase
        .from('aplicacion_animales')
        .select('aplicacion_id, estado')
        .eq('animal_id', animal.animal_id)
      if (error) {
        show('No se pudo cargar la sanidad.', 'error')
        return
      }
      if (filas.length === 0) {
        setSanidad([])
        return
      }
      const { data: aplicaciones, error: errorAp } = await supabase
        .from('aplicaciones')
        .select('id, fecha, clase, producto, dosis, grupo, proxima')
        .in(
          'id',
          filas.map((f) => f.aplicacion_id)
        )
        .order('fecha', { ascending: false })
      if (errorAp) {
        show('No se pudo cargar la sanidad.', 'error')
        return
      }
      const estados = new Map(filas.map((f) => [f.aplicacion_id, f.estado as EstadoAplicacion]))
      setSanidad(aplicaciones.map((ap) => ({ ...ap, estado: estados.get(ap.id)! })))
    }
    cargarSanidad()
  }, [animal.animal_id, show])

  async function guardarDatos(datos: AnimalInput) {
    const { error } = await supabase.from('animales').update(datos).eq('id', animal.animal_id)
    if (error) {
      show('No se pudieron guardar los cambios.', 'error')
      return false
    }
    show('Cambios guardados.')
    setEditando(false)
    await onCambio()
    return true
  }

  async function mover() {
    const { error } = await supabase
      .from('animales')
      .update({ lugar: otroLugar })
      .eq('id', animal.animal_id)
    if (error) {
      show('No se pudo mover.', 'error')
      return
    }
    show(`${animal.nombre} ahora está en ${otroLugar.toLowerCase()}.`)
    await onCambio()
  }

  async function registrarSalida(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    const cambios =
      tipoSalida === 'venta'
        ? { precio_venta: Number(precioVenta), fecha_venta: fechaSalida }
        : { fecha_muerte: fechaSalida }
    const { error } = await supabase.from('animales').update(cambios).eq('id', animal.animal_id)
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
        ? `Venta de ${animal.nombre} registrada.`
        : `Muerte de ${animal.nombre} registrada.`
    )
    await onCambio()
  }

  // Quita la venta o la muerte: el animal vuelve a quedar en la finca.
  async function quitarSalida() {
    const { error } = await supabase
      .from('animales')
      .update({ precio_venta: null, fecha_venta: null, fecha_muerte: null })
      .eq('id', animal.animal_id)
    if (error) {
      show(vendido ? 'No se pudo quitar la venta.' : 'No se pudo quitar la muerte.', 'error')
      return
    }
    show(vendido ? 'Venta quitada.' : 'Muerte quitada.')
    setConfirmando(null)
    await onCambio()
  }

  async function eliminar() {
    const { error } = await supabase.from('animales').delete().eq('id', animal.animal_id)
    if (error) {
      // 23503: hay compras marcadas "solo para" este animal.
      show(
        error.code === '23503'
          ? `Hay compras solo para ${animal.nombre}. Cámbialas o elimínalas primero.`
          : 'No se pudo eliminar el animal.',
        'error'
      )
      return
    }
    show(`${animal.nombre} eliminado.`)
    onCerrar()
    await onCambio()
  }

  const ganancia = Number(animal.ganancia)
  const salidaValida =
    fechaSalida !== '' &&
    (tipoSalida === 'muerte' || (precioVenta !== '' && Number(precioVenta) <= MAXIMO_TERNERO))

  if (editando) {
    return (
      <Modal title={`Editar ${animal.nombre}`} onClose={onCerrar}>
        <AnimalForm
          inicial={{
            nombre: animal.nombre,
            tipo: animal.tipo,
            color: animal.color,
            fecha_nacimiento: animal.fecha_nacimiento,
            madre_id: animal.madre_id,
            duenio: animal.duenio,
            lugar: animal.lugar,
            fecha_compra: animal.fecha_compra,
            precio_compra: Number(animal.precio_compra),
            nota: animal.nota,
          }}
          animales={animales}
          idEditando={animal.animal_id}
          textoBoton="Guardar cambios"
          onGuardar={guardarDatos}
        />
        <button className="btn-secondary" onClick={() => setEditando(false)}>
          Cancelar
        </button>
      </Modal>
    )
  }

  return (
    <Modal title={animal.nombre} onClose={onCerrar}>
      <div className="etiquetas etiquetas-ficha">
        <span className="etiqueta etiqueta-tipo">{animal.tipo}</span>
        {activo && <span className="etiqueta">{animal.lugar}</span>}
        {vendido && <span className="etiqueta">Vendido</span>}
        {murio && <span className="etiqueta etiqueta-alerta">Murió</span>}
        {!deLaFinca && <span className="etiqueta etiqueta-ajeno">{animal.duenio}</span>}
      </div>

      <div className="resumen">
        {animal.color && (
          <div className="resumen-fila">
            <span>Color</span>
            <strong>{animal.color}</strong>
          </div>
        )}
        <div className="resumen-fila">
          <span>Nació</span>
          <strong>
            {animal.fecha_nacimiento
              ? `${formatoFecha(animal.fecha_nacimiento)} (${edad(animal.fecha_nacimiento)})`
              : 'No se sabe'}
          </strong>
        </div>
        <div className="resumen-fila">
          <span>Mamá</span>
          {madre ? (
            <button className="enlace" onClick={() => onAbrir(madre.animal_id)}>
              {madre.nombre}
            </button>
          ) : (
            <strong>No registrada</strong>
          )}
        </div>
        <div className="resumen-fila">
          <span>Dueño</span>
          <strong>{nombreDuenio(animal.duenio)}</strong>
        </div>
      </div>
      {animal.nota && <p className="nota">{animal.nota}</p>}

      {activo && (
        <div className="acciones">
          {hembraAdulta && (
            <button className="btn-secondary" onClick={() => setRegistrandoParto(true)}>
              Registrar parto
            </button>
          )}
          <button className="btn-secondary" onClick={mover}>
            Mover a {otroLugar.toLowerCase()}
          </button>
        </div>
      )}

      {registrandoParto && (
        <FormParto
          madre={animal}
          onCancelar={() => setRegistrandoParto(false)}
          onGuardado={async () => {
            setRegistrandoParto(false)
            await onCambio()
          }}
        />
      )}

      {hembraAdulta && (
        <>
          <div className="section-title">Crías ({crias.length})</div>
          {crias.length === 0 ? (
            <div className="empty-state">Todavía no tiene crías registradas.</div>
          ) : (
            <ul className="lista">
              {crias.map((c) => (
                <li key={c.animal_id}>
                  <button className="lista-item" onClick={() => onAbrir(c.animal_id)}>
                    <span className="lista-texto">
                      <span className="lista-descripcion">{c.nombre}</span>
                      <span className="lista-detalle">
                        {c.tipo}
                        {c.color ? ` · ${c.color}` : ''}
                      </span>
                    </span>
                    <span className="lista-detalle">
                      {c.fecha_nacimiento && formatoFecha(c.fecha_nacimiento)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {deLaFinca && (
        <>
          <div className="section-title">Plata</div>
          <div className="resumen">
            <div className="resumen-fila">
              <span>Compra ({formatoFecha(animal.fecha_compra)})</span>
              <strong>{formatoColones(Number(animal.precio_compra))}</strong>
            </div>
            <div className="resumen-fila">
              <span>Gastos</span>
              <strong>{formatoColones(Number(animal.gastos))}</strong>
            </div>
            <div className="resumen-fila resumen-destacado">
              <span>Invertido</span>
              <strong>{formatoColones(Number(animal.invertido))}</strong>
            </div>
            {vendido && (
              <div className="resumen-fila">
                <span>Venta ({formatoFecha(animal.fecha_venta!)})</span>
                <strong>{formatoColones(Number(animal.precio_venta))}</strong>
              </div>
            )}
            {murio && (
              <div className="resumen-fila">
                <span>Murió ({formatoFecha(animal.fecha_muerte!)})</span>
                <strong>{formatoColones(0)}</strong>
              </div>
            )}
            {!activo && (
              <div
                className={`resumen-fila resumen-destacado ${ganancia < 0 ? 'negativo' : 'positivo'}`}
              >
                <span>{ganancia < 0 ? 'Pérdida' : 'Ganancia'}</span>
                <strong>{formatoColones(ganancia)}</strong>
              </div>
            )}
          </div>
          <p className="nota">
            {activo
              ? `Lleva ${animal.dias} días en la finca.`
              : `Estuvo ${animal.dias} días en la finca.`}
          </p>
        </>
      )}
      {!deLaFinca && murio && (
        <p className="nota">Murió el {formatoFecha(animal.fecha_muerte!)}.</p>
      )}

      {activo && (
        <>
          <div className="section-title">Registrar salida</div>
          <form className="card" onSubmit={registrarSalida}>
            {deLaFinca && (
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
            )}
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
                <label htmlFor="fecha-salida">{tipoSalida === 'venta' ? 'Fecha' : 'Fecha de muerte'}</label>
                <input
                  id="fecha-salida"
                  type="date"
                  min={animal.fecha_compra}
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                  required
                />
              </div>
            </div>
            <p className="nota nota-form">
              {tipoSalida === 'venta'
                ? 'Pon lo que realmente les quedó, ya sin la comisión de la subasta ni el flete.'
                : deLaFinca
                  ? 'Desde esa fecha ya no se le cargan compras, y lo invertido cuenta como pérdida.'
                  : 'Desde esa fecha deja de aparecer en el hato.'}
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

      <div className="section-title">Sanidad</div>
      {sanidad === null ? (
        <div className="empty-state">Cargando...</div>
      ) : sanidad.length === 0 ? (
        <div className="empty-state">No tiene tratamientos ni baños registrados.</div>
      ) : (
        <ul className="lista">
          {sanidad.map((ap) => (
            <li key={ap.id} className="lista-item lista-item-fija">
              <span className="lista-texto">
                <span className="lista-descripcion">
                  {ap.clase === 'Baño' ? `Baño ${ap.producto}` : ap.producto}
                </span>
                <span className="lista-detalle">
                  {ap.dosis ?? (ap.grupo === 'elegidos' ? 'Solo a algunos' : NOMBRE_GRUPO[ap.grupo])}
                  {ap.estado === 'pendiente' && <span className="texto-alerta"> · Pendiente</span>}
                </span>
              </span>
              <span className="lista-detalle">{formatoFecha(ap.fecha)}</span>
            </li>
          ))}
        </ul>
      )}

      {deLaFinca && (
        <>
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
                        : ' · solo para este animal'}
                    </span>
                  </span>
                  <span className="lista-monto">{formatoColones(Number(g.monto_animal))}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="acciones">
        <button className="btn-secondary" onClick={() => setEditando(true)}>
          Editar datos
        </button>
        {!activo && (
          <button className="btn-secondary" onClick={() => setConfirmando('salida')}>
            {vendido ? 'Quitar venta' : 'Quitar muerte'}
          </button>
        )}
      </div>
      <button className="btn-danger" onClick={() => setConfirmando('eliminar')}>
        Eliminar animal
      </button>
      {confirmando === 'salida' && (
        <Confirmacion
          pregunta={`¿Quitar la ${vendido ? 'venta' : 'muerte'} de ${animal.nombre}? Vuelve a quedar en la finca.`}
          textoConfirmar={vendido ? 'Sí, quitar venta' : 'Sí, quitar muerte'}
          onConfirmar={quitarSalida}
          onCancelar={() => setConfirmando(null)}
        />
      )}
      {confirmando === 'eliminar' && (
        <Confirmacion
          pregunta={`¿Eliminar a ${animal.nombre}? Se borra también su historial de sanidad. No se puede deshacer.`}
          textoConfirmar="Sí, eliminar"
          onConfirmar={eliminar}
          onCancelar={() => setConfirmando(null)}
        />
      )}
    </Modal>
  )
}

// Registra un parto: crea la cría ligada a su mamá, con el mismo dueño y lugar que ella.
function FormParto({
  madre,
  onCancelar,
  onGuardado,
}: {
  madre: ResumenAnimal
  onCancelar: () => void
  onGuardado: () => Promise<void>
}) {
  const { show } = useToast()
  const [fecha, setFecha] = useState(hoy())
  const [sexo, setSexo] = useState<'Hembra' | 'Macho'>('Hembra')
  const [color, setColor] = useState('')
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const hembra = sexo === 'Hembra'
    const colorFinal = color.trim()
    const nombreFinal =
      nombre.trim() ||
      `${hembra ? 'Ternerita' : 'Ternerito'}${colorFinal ? ` ${colorFinal.toLowerCase()}` : ''}`
    setGuardando(true)
    const { error } = await supabase.from('animales').insert({
      nombre: nombreFinal,
      tipo: hembra ? 'Ternera' : 'Ternero',
      color: colorFinal || null,
      fecha_nacimiento: fecha,
      fecha_compra: fecha,
      precio_compra: 0,
      madre_id: madre.animal_id,
      duenio: madre.duenio,
      lugar: madre.lugar,
    })
    setGuardando(false)
    if (error) {
      show('No se pudo registrar el parto.', 'error')
      return
    }
    show(`Parto registrado: ${nombreFinal}.`)
    await onGuardado()
  }

  return (
    <form className="card form-en-ficha" onSubmit={guardar}>
      <div className="section-title" style={{ marginTop: 0 }}>
        Parto de {madre.nombre}
      </div>
      <div className="type-toggle">
        {(['Hembra', 'Macho'] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={sexo === s ? 'active' : ''}
            onClick={() => setSexo(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="field-row field-row-igual">
        <div className="field">
          <label htmlFor="color-cria">Color</label>
          <input
            id="color-cria"
            value={color}
            placeholder="Ej: Blanca"
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="fecha-parto">Fecha</label>
          <input
            id="fecha-parto"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="nombre-cria">Nombre (opcional)</label>
        <input
          id="nombre-cria"
          value={nombre}
          placeholder="Si no se pone: Ternerita blanca, por ejemplo"
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>
      <button className="btn-primary" type="submit" disabled={fecha === '' || guardando}>
        {guardando ? 'Guardando...' : 'Guardar parto'}
      </button>
      <button className="btn-secondary" type="button" onClick={onCancelar}>
        Cancelar
      </button>
    </form>
  )
}

import { useCallback, useEffect, useState } from 'react'
import ListaTerneros from '../components/ListaTerneros'
import Modal from '../components/Modal'
import TerneroDetalle from '../components/TerneroDetalle'
import TerneroForm from '../components/TerneroForm'
import { formatoColones } from '../lib/formato'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../lib/ToastContext'
import type { AnimalInput, ResumenAnimal } from '../lib/types'

// Lista de terneros con lo invertido (o la ganancia si ya se vendieron). Al tocar uno se abre
// su detalle, donde se registra la venta, se edita o se elimina.
export default function Ganado() {
  const { show } = useToast()
  const [terneros, setTerneros] = useState<ResumenAnimal[]>([])
  const [sinTernero, setSinTernero] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [agregando, setAgregando] = useState(false)
  const [abiertoId, setAbiertoId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const [ternerosRes, resumenRes] = await Promise.all([
      // En el orden en que se agregaron, para que no cambien de lugar al editarlos.
      supabase.from('v_resumen_animal').select('*').order('creado_en'),
      supabase.from('v_resumen').select('compras_sin_ternero').single(),
    ])
    if (ternerosRes.error || resumenRes.error) {
      show('No se pudo cargar el ganado.', 'error')
    } else {
      setTerneros(ternerosRes.data)
      setSinTernero(Number(resumenRes.data.compras_sin_ternero))
    }
    setCargando(false)
  }, [show])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function agregar(datos: AnimalInput) {
    const { error } = await supabase.from('animales').insert(datos)
    if (error) {
      show('No se pudo guardar el ternero.', 'error')
      return false
    }
    show(`${datos.nombre} agregado.`)
    setAgregando(false)
    await cargar()
    return true
  }

  // Se busca en la lista recargada para que el detalle muestre los números al día.
  const abierto = terneros.find((t) => t.animal_id === abiertoId) ?? null

  return (
    <>
      <div className="encabezado">
        <h2>Ganado</h2>
        <button className="btn-agregar" onClick={() => setAgregando(true)}>
          + Agregar ternero
        </button>
      </div>

      {sinTernero > 0 && (
        <div className="msg error">
          Hay {formatoColones(sinTernero)} en compras "para todos" de días en que no había terneros
          en la finca, así que no se le cargaron a ninguno. Revisa las fechas de esas compras o de
          los terneros.
        </div>
      )}

      {cargando ? (
        <div className="empty-state">Cargando...</div>
      ) : terneros.length === 0 ? (
        <div className="empty-state">Todavía no hay terneros.</div>
      ) : (
        <ListaTerneros terneros={terneros} onAbrir={setAbiertoId} />
      )}

      {agregando && (
        <Modal title="Nuevo ternero" onClose={() => setAgregando(false)}>
          <TerneroForm textoBoton="Agregar ternero" onGuardar={agregar} />
        </Modal>
      )}

      {abierto && (
        <TerneroDetalle
          key={abierto.animal_id}
          ternero={abierto}
          onCerrar={() => setAbiertoId(null)}
          onCambio={cargar}
        />
      )}
    </>
  )
}

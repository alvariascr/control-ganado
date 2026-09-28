import { formatoColones } from '../lib/formato'
import type { ResumenAnimal } from '../lib/types'

// Lista de terneros separada en "En la finca" (con lo invertido), "Vendidos" (con la
// ganancia) y "Murieron" (con la pérdida).
export default function ListaTerneros({
  terneros,
  onAbrir,
}: {
  terneros: ResumenAnimal[]
  onAbrir: (animalId: string) => void
}) {
  const enFinca = terneros.filter((t) => t.fecha_venta === null && t.fecha_muerte === null)
  const vendidos = terneros.filter((t) => t.fecha_venta !== null)
  const muertos = terneros.filter((t) => t.fecha_muerte !== null)

  return (
    <>
      <div className="section-title">En la finca ({enFinca.length})</div>
      {enFinca.length === 0 ? (
        <div className="empty-state">No hay terneros en la finca.</div>
      ) : (
        <ul className="lista">
          {enFinca.map((t) => (
            <li key={t.animal_id}>
              <button className="lista-item" onClick={() => onAbrir(t.animal_id)}>
                <span className="lista-texto">
                  <span className="lista-descripcion">{t.nombre}</span>
                  <span className="lista-detalle">{t.dias} días en la finca</span>
                </span>
                <span className="lista-valor">
                  <span className="lista-monto">{formatoColones(Number(t.invertido))}</span>
                  <span className="lista-detalle">invertido</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {vendidos.length > 0 && (
        <>
          <div className="section-title">Vendidos ({vendidos.length})</div>
          <ul className="lista">
            {vendidos.map((t) => (
              <FilaResultado key={t.animal_id} ternero={t} onAbrir={onAbrir} />
            ))}
          </ul>
        </>
      )}

      {muertos.length > 0 && (
        <>
          <div className="section-title">Murieron ({muertos.length})</div>
          <ul className="lista">
            {muertos.map((t) => (
              <FilaResultado key={t.animal_id} ternero={t} onAbrir={onAbrir} />
            ))}
          </ul>
        </>
      )}
    </>
  )
}

// Fila de un ternero que ya salió de la finca: lo invertido y la ganancia o pérdida.
function FilaResultado({
  ternero,
  onAbrir,
}: {
  ternero: ResumenAnimal
  onAbrir: (animalId: string) => void
}) {
  const ganancia = Number(ternero.ganancia)
  return (
    <li>
      <button className="lista-item" onClick={() => onAbrir(ternero.animal_id)}>
        <span className="lista-texto">
          <span className="lista-descripcion">{ternero.nombre}</span>
          <span className="lista-detalle">
            Invertido {formatoColones(Number(ternero.invertido))}
          </span>
        </span>
        <span className="lista-valor">
          <span className={`lista-monto ${ganancia < 0 ? 'negativo' : 'positivo'}`}>
            {formatoColones(ganancia)}
          </span>
          <span className="lista-detalle">{ganancia < 0 ? 'pérdida' : 'ganancia'}</span>
        </span>
      </button>
    </li>
  )
}

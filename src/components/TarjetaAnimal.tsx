import { edad, esDeLaFinca, estaActivo } from '../lib/animales'
import { formatoColones, formatoFecha } from '../lib/formato'
import { HEMBRAS_ADULTAS, type ResumenAnimal } from '../lib/types'

// Tarjeta de un animal en la lista de Ganado. Si sigue en la finca muestra sus crías o su
// mamá y edad; si ya salió (vendido o muerto) y es de la finca, la ganancia o pérdida.
export default function TarjetaAnimal({
  animal,
  animales,
  onAbrir,
}: {
  animal: ResumenAnimal
  animales: ResumenAnimal[]
  onAbrir: (animalId: string) => void
}) {
  const activo = estaActivo(animal)
  const madre = animales.find((a) => a.animal_id === animal.madre_id)
  const crias = animales
    .filter((a) => a.madre_id === animal.animal_id)
    .sort((x, y) => (y.fecha_nacimiento ?? '').localeCompare(x.fecha_nacimiento ?? ''))

  let detalle = ''
  if (HEMBRAS_ADULTAS.includes(animal.tipo) && crias.length > 0) {
    const ultima = crias[0].fecha_nacimiento
    detalle = `${crias.length} ${crias.length === 1 ? 'cría' : 'crías'}${ultima ? ` · última: ${formatoFecha(ultima)}` : ''}`
  } else if (madre) {
    const hijo = ['Ternera', 'Novilla', 'Vaca'].includes(animal.tipo) ? 'Hija' : 'Hijo'
    detalle = `${hijo} de ${madre.nombre}${animal.fecha_nacimiento ? ` · ${edad(animal.fecha_nacimiento)}` : ''}`
  } else if (animal.fecha_nacimiento) {
    detalle = edad(animal.fecha_nacimiento)
  } else if (activo) {
    detalle = `${animal.dias} días en la finca`
  }

  const ganancia = Number(animal.ganancia)
  const mostrarPlata = esDeLaFinca(animal)

  return (
    <button className="lista-item tarjeta-animal" onClick={() => onAbrir(animal.animal_id)}>
      <span className="lista-texto">
        <span className="lista-descripcion">{animal.nombre}</span>
        {detalle && <span className="lista-detalle">{detalle}</span>}
        <span className="etiquetas">
          {activo && <span className="etiqueta">{animal.lugar}</span>}
          {!esDeLaFinca(animal) && <span className="etiqueta etiqueta-ajeno">{animal.duenio}</span>}
          {animal.nota && <span className="etiqueta etiqueta-alerta">{animal.nota}</span>}
        </span>
      </span>
      <span className="lista-valor">
        <span className="etiqueta etiqueta-tipo">{animal.tipo}</span>
        {mostrarPlata && activo && Number(animal.invertido) > 0 && (
          <span className="lista-detalle">Invertido {formatoColones(Number(animal.invertido))}</span>
        )}
        {mostrarPlata && !activo && (
          <span className={`lista-monto ${ganancia < 0 ? 'negativo' : 'positivo'}`}>
            {formatoColones(ganancia)}
          </span>
        )}
      </span>
    </button>
  )
}

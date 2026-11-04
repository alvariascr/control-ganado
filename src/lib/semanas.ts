import { sumarDias } from './animales'

// Las semanas van de lunes a domingo y se identifican por la fecha del lunes (AAAA-MM-DD).

export function lunesDe(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  // getDay(): domingo = 0, lunes = 1 ... sábado = 6.
  const diaSemana = new Date(y, m - 1, d).getDay()
  return sumarDias(fecha, diaSemana === 0 ? -6 : 1 - diaSemana)
}

const corta = (fecha: string) => {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })
}

// "2 nov – 8 nov"
export function rangoSemana(lunes: string) {
  return `${corta(lunes)} – ${corta(sumarDias(lunes, 6))}`
}

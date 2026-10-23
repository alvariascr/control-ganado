import { hoy } from './formato'
import { HEMBRAS_ADULTAS, type GrupoAplicacion, type ResumenAnimal } from './types'

export const NOMBRE_GRUPO: Record<Exclude<GrupoAplicacion, 'elegidos'>, string> = {
  todos: 'Todo el hato',
  vacas: 'Vacas y novillas',
  finca: 'Todo lo de la finca',
  potrero: 'Todo lo del potrero',
}

// Sigue en la finca: ni vendido ni muerto.
export function estaActivo(animal: ResumenAnimal) {
  return animal.fecha_venta === null && animal.fecha_muerte === null
}

export function esDeLaFinca(animal: ResumenAnimal) {
  return animal.duenio === null
}

export function nombreDuenio(duenio: string | null) {
  return duenio ?? 'De la finca'
}

// Animales activos que entran en un grupo de una aplicación.
export function animalesDelGrupo(grupo: Exclude<GrupoAplicacion, 'elegidos'>, animales: ResumenAnimal[]) {
  const activos = animales.filter(estaActivo)
  switch (grupo) {
    case 'todos':
      return activos
    case 'vacas':
      return activos.filter((a) => HEMBRAS_ADULTAS.includes(a.tipo))
    case 'finca':
      return activos.filter((a) => a.lugar === 'Finca')
    case 'potrero':
      return activos.filter((a) => a.lugar === 'Potrero')
  }
}

export function diasEntre(desde: string, hasta: string) {
  const [y1, m1, d1] = desde.split('-').map(Number)
  const [y2, m2, d2] = hasta.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

export function sumarDias(fecha: string, dias: number) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d + dias).toLocaleDateString('en-CA')
}

export function sumarMeses(fecha: string, meses: number) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1 + meses, d).toLocaleDateString('en-CA')
}

// Edad legible a partir de la fecha de nacimiento: "15 días", "8 meses", "1 año 4 meses".
export function edad(nacimiento: string) {
  const dias = diasEntre(nacimiento, hoy())
  if (dias < 60) return `${dias} días`
  const meses = Math.floor(dias / 30.44)
  if (meses < 12) return `${meses} meses`
  const anios = Math.floor(meses / 12)
  const resto = meses % 12
  return `${anios} ${anios === 1 ? 'año' : 'años'}${resto ? ` ${resto} ${resto === 1 ? 'mes' : 'meses'}` : ''}`
}

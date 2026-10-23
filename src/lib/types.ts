export interface Compra {
  id: string
  fecha: string
  descripcion: string
  monto: number
  // null = para todos los animales de la finca.
  animal_id: string | null
}

export interface CompraInput {
  fecha: string
  descripcion: string
  monto: number
  animal_id: string | null
}

export type TipoAnimal = 'Toro' | 'Vaca' | 'Novilla' | 'Novillo' | 'Ternera' | 'Ternero'
export type Lugar = 'Finca' | 'Potrero'

export const TIPOS_ANIMAL: TipoAnimal[] = ['Vaca', 'Novilla', 'Novillo', 'Ternera', 'Ternero', 'Toro']

// Los que pueden parir.
export const HEMBRAS_ADULTAS: TipoAnimal[] = ['Vaca', 'Novilla']

export interface AnimalInput {
  nombre: string
  tipo: TipoAnimal
  color: string | null
  fecha_nacimiento: string | null
  madre_id: string | null
  // null = de la finca.
  duenio: string | null
  lugar: Lugar
  // Fecha en que llegó a la finca (comprado o nacido); desde ahí se le cargan compras.
  fecha_compra: string
  precio_compra: number
  nota: string | null
}

// Fila de la vista v_resumen_animal: el animal con lo que lleva invertido.
export interface ResumenAnimal {
  animal_id: string
  nombre: string
  fecha_compra: string
  precio_compra: number
  gastos: number
  invertido: number
  fecha_venta: string | null
  precio_venta: number | null
  // En un animal que murió es negativa: todo lo invertido.
  ganancia: number | null
  dias: number
  creado_en: string
  fecha_muerte: string | null
  tipo: TipoAnimal
  color: string | null
  fecha_nacimiento: string | null
  madre_id: string | null
  duenio: string | null
  lugar: Lugar
  nota: string | null
}

// Fila de la vista v_gasto_animal: la parte de una compra que le toca a un animal.
export interface GastoAnimal {
  compra_id: string
  fecha: string
  descripcion: string
  monto_compra: number
  monto_animal: number
  compartida: boolean
}

export type ClaseAplicacion = 'Tratamiento' | 'Baño'
export type GrupoAplicacion = 'todos' | 'vacas' | 'finca' | 'potrero' | 'elegidos'
export type EstadoAplicacion = 'aplicado' | 'pendiente'

export interface Aplicacion {
  id: string
  fecha: string
  clase: ClaseAplicacion
  producto: string
  dosis: string | null
  grupo: GrupoAplicacion
  proxima: string | null
}

export interface AplicacionAnimal {
  aplicacion_id: string
  animal_id: string
  estado: EstadoAplicacion
}

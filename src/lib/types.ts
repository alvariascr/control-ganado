export interface Compra {
  id: string
  fecha: string
  descripcion: string
  monto: number
  // null = para todos los terneros.
  animal_id: string | null
}

export interface CompraInput {
  fecha: string
  descripcion: string
  monto: number
  animal_id: string | null
}

export interface AnimalInput {
  nombre: string
  fecha_compra: string
  precio_compra: number
}

// Fila de la vista v_resumen_animal: el ternero con lo que lleva invertido.
export interface ResumenAnimal {
  animal_id: string
  nombre: string
  fecha_compra: string
  precio_compra: number
  gastos: number
  invertido: number
  fecha_venta: string | null
  precio_venta: number | null
  // En un ternero que murió es negativa: todo lo invertido.
  ganancia: number | null
  dias: number
  creado_en: string
  fecha_muerte: string | null
}

// Fila de la vista v_gasto_animal: la parte de una compra que le toca a un ternero.
export interface GastoAnimal {
  compra_id: string
  fecha: string
  descripcion: string
  monto_compra: number
  monto_animal: number
  compartida: boolean
}

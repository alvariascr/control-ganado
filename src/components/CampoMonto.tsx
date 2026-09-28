import { formatoColones } from '../lib/formato'

// Campo de monto en colones, con aviso si pasa del máximo permitido.
export default function CampoMonto({
  id,
  label,
  valor,
  maximo,
  requerido = true,
  onChange,
}: {
  id: string
  label: string
  valor: string
  maximo: number
  requerido?: boolean
  onChange: (valor: string) => void
}) {
  const muyAlto = Number(valor) > maximo

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        max={maximo}
        step="any"
        value={valor}
        placeholder="0"
        aria-invalid={muyAlto}
        onChange={(e) => onChange(e.target.value)}
        required={requerido}
      />
      {muyAlto && <p className="campo-error">Máximo {formatoColones(maximo)}</p>}
    </div>
  )
}

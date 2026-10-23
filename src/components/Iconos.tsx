// Íconos de línea dibujados para la app (en vez de emojis). Toman el color del texto.

interface PropsIcono {
  tamano?: number
  className?: string
}

export function IconoToro({ tamano = 24, className }: PropsIcono) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Cuernos */}
      <path d="M2.5 5.5c1.2 2.4 3.4 3.6 6.3 3.6" />
      <path d="M21.5 5.5c-1.2 2.4-3.4 3.6-6.3 3.6" />
      {/* Orejas */}
      <path d="M8.2 10.4 5 11.6c.9 1.1 2.2 1.5 3.6 1.2" />
      <path d="M15.8 10.4 19 11.6c-.9 1.1-2.2 1.5-3.6 1.2" />
      {/* Cabeza y hocico */}
      <path d="M8.8 9.1h6.4l.6 4.3-1.1 4.4a2.6 2.6 0 0 1-2.5 2h-.4a2.6 2.6 0 0 1-2.5-2l-1.1-4.4z" />
      <path d="M10.4 17.2h3.2" />
    </svg>
  )
}

export function IconoJeringa({ tamano = 24, className }: PropsIcono) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Émbolo */}
      <path d="m18 2.5 3.5 3.5" />
      <path d="m19.75 4.25-3 3" />
      {/* Cuerpo con marcas */}
      <path d="m15.5 6 2.5 2.5-9 9L6.5 15z" />
      <path d="m11 10.5 1.5 1.5" />
      <path d="m9 12.5 1.5 1.5" />
      {/* Aguja */}
      <path d="m7.75 16.25-5.25 5.25" />
    </svg>
  )
}

export function IconoSaco({ tamano = 24, className }: PropsIcono) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Boca del saco amarrada */}
      <path d="M8.5 3.5h7l-1.6 3.4h-3.8z" />
      <path d="M9.6 6.9C6.6 8.6 5 11.4 5 14.8 5 18.2 7.4 20.5 10.4 20.5h3.2c3 0 5.4-2.3 5.4-5.7 0-3.4-1.6-6.2-4.6-7.9" />
      {/* Costuras */}
      <path d="M9 13.5h6" />
      <path d="M9.5 16.5h5" />
    </svg>
  )
}

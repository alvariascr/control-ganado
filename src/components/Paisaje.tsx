// Fondo decorativo: colinas, un árbol de guanacaste y una cerca. "fondo" va fijo abajo detrás
// de la app, en tonos muy oscuros para no estorbar al leer. "atardecer" es la versión del
// login, más grande, con cielo y sol.
export default function Paisaje({ variante }: { variante: 'fondo' | 'atardecer' }) {
  const atardecer = variante === 'atardecer'

  return (
    <svg
      className={`paisaje paisaje-${variante}`}
      viewBox="0 0 1440 360"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`sol-${variante}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0a56b" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#c2703d" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c2703d" stopOpacity="0" />
        </radialGradient>
      </defs>

      {atardecer && (
        <>
          <circle cx="840" cy="170" r="190" fill={`url(#sol-${variante})`} />
          <circle cx="840" cy="170" r="46" fill="#e8955c" opacity="0.85" />
        </>
      )}

      {/* Colinas del fondo */}
      <path
        className="colina-lejana"
        d="M0 210C180 160 360 175 540 168S900 130 1080 150 1340 180 1440 170V360H0Z"
      />

      {/* Guanacaste sobre la colina del medio. El árbol, el sol y la cerca van cerca del centro
          para que se vean también en el celular, donde el dibujo se recorta por los lados. */}
      <g className="arbol" transform="translate(260 0)">
        <path d="M296 252c2-24 3-40 1-58h8c-2 18-1 34 1 58z" />
        <path d="M301 204c-14-10-30-14-46-12M302 200c14-12 32-16 50-14" strokeWidth="5" fill="none" />
        <ellipse cx="300" cy="186" rx="96" ry="20" />
        <ellipse cx="248" cy="194" rx="46" ry="12" />
        <ellipse cx="356" cy="192" rx="50" ry="13" />
        <ellipse cx="302" cy="172" rx="58" ry="13" />
      </g>

      <path
        className="colina-media"
        d="M0 250C220 215 420 240 640 228S1020 200 1220 222 1400 236 1440 232V360H0Z"
      />

      {/* Cerca */}
      <g className="cerca">
        {[880, 960, 1040, 1120, 1200, 1280, 1360, 1440].map((x, i) => (
          <rect key={x} x={x} y={262 - (i % 2) * 2} width="7" height="40" rx="1.5" />
        ))}
        <path d="M876 274C1000 268 1200 270 1440 266" strokeWidth="3" fill="none" />
        <path d="M876 290C1000 284 1200 286 1440 282" strokeWidth="3" fill="none" />
      </g>

      <path
        className="colina-cercana"
        d="M0 292C300 268 560 300 860 286S1260 268 1440 282V360H0Z"
      />
    </svg>
  )
}

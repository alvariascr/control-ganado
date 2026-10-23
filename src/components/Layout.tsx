import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { IconoJeringa, IconoSaco, IconoToro } from './Iconos'
import Paisaje from './Paisaje'

const tabs: { to: string; label: string; icono: ReactNode; end: boolean }[] = [
  { to: '/', label: 'Ganado', icono: <IconoToro tamano={22} />, end: true },
  { to: '/sanidad', label: 'Sanidad', icono: <IconoJeringa tamano={22} />, end: false },
  { to: '/compras', label: 'Compras', icono: <IconoSaco tamano={22} />, end: false },
]

// Las pestañas se dibujan dos veces: arriba en el encabezado (computadora) y abajo
// (celular). El CSS muestra solo una según el ancho de la pantalla.
function Pestanas({ className }: { className: string }) {
  return (
    <nav className={className}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          <span className="icon">{tab.icono}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default function Layout() {
  const { signOut } = useAuth()
  // undefined = cargando, null = la cuenta no tiene finca asignada.
  const [finca, setFinca] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    // Por la seguridad de la base, la cuenta solo puede leer su propia finca. Si la consulta
    // falla (por ejemplo, sin internet) no se muestra el aviso de "sin finca", porque no se sabe.
    supabase
      .from('fincas')
      .select('nombre')
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error) setFinca(data?.nombre ?? null)
      })
  }, [])

  return (
    <>
      <Paisaje variante="fondo" />
      <header className="app-header">
        <h1 className="marca">
          <span className="marca-logo">
            <IconoToro tamano={20} />
          </span>
          <span className="marca-texto">
            Control Ganado
            {finca && <small>{finca}</small>}
          </span>
        </h1>
        <Pestanas className="nav-top" />
        <button className="btn-logout" onClick={() => signOut()}>
          Salir
        </button>
      </header>
      <main>
        {finca === null ? (
          <div className="msg error">
            Esta cuenta no tiene una finca asignada, así que no puede ver ni registrar nada. Hay que
            asignársela en Supabase con <code>asignar_finca</code>.
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <Pestanas className="nav-bottom" />
    </>
  )
}

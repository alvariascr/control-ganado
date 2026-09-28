import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const tabs = [
  { to: '/', label: 'Compras', icon: '🛒', end: true },
  { to: '/ganado', label: 'Ganado', icon: '🐂', end: false },]

export default function Layout() {
  const { signOut } = useAuth()

  return (
    <>
      <header className="app-header">
        <h1>🐂 Control Ganado</h1>
        <button className="btn-logout" onClick={() => signOut()}>
          Salir
        </button>
      </header>
      <main>
        <Outlet />
      </main>
      <nav className="nav-bottom">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span className="icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}

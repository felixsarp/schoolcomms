import { NavLink, Link } from 'react-router-dom';

export default function Sidebar({ classes, user, onLogout, tabColors, onClassCreated }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1>SchoolComms</h1>
        </Link>
        <p>Class parent lists &amp; messages</p>
      </div>

      <ul className="class-list">
        {classes.map((c, i) => (
          <li key={c.id}>
            <NavLink
              to={`/classes/${c.id}`}
              className={({ isActive }) => `class-list__item${isActive ? ' active' : ''}`}
              style={{ '--tab-color': tabColors[i % tabColors.length] }}
            >
              <span className="class-list__name">{c.name}</span>
              <span className="class-list__count">{c.parentCount}</span>
            </NavLink>
          </li>
        ))}
        {classes.length === 0 && (
          <li style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 13.5 }}>
            No classes yet — add one from the dashboard.
          </li>
        )}
      </ul>

      <div className="sidebar__footer">
        <span>{user?.name || user?.email}</span>
        <button className="btn btn--ghost" onClick={onLogout} style={{ padding: '4px 8px' }}>
          Sign out
        </button>
      </div>
    </aside>
  );
}

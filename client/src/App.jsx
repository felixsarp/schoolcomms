import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ClassDetail from './pages/ClassDetail.jsx';
import Sidebar from './components/Sidebar.jsx';
import { api, setToken } from './api/client.js';

const TAB_COLORS = ['var(--tab-yellow)', 'var(--tab-blue)', 'var(--tab-plum)', 'var(--accent)'];

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('schoolcomms_token');
    if (!token) {
      setCheckingSession(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setCheckingSession(false));
  }, []);

  const refreshClasses = useCallback(async () => {
    if (!user) return;
    const list = await api.listClasses();
    setClasses(list);
  }, [user]);

  useEffect(() => {
    refreshClasses();
  }, [refreshClasses]);

  function handleLogout() {
    setToken(null);
    setUser(null);
    navigate('/login');
  }

  if (checkingSession) return null;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLoggedIn={setUser} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        classes={classes}
        user={user}
        onLogout={handleLogout}
        tabColors={TAB_COLORS}
        onClassCreated={refreshClasses}
      />
      <div className="main">
        <Routes>
          <Route
            path="/dashboard"
            element={<Dashboard classes={classes} onChanged={refreshClasses} />}
          />
          <Route
            path="/classes/:classId"
            element={<ClassDetail classes={classes} onChanged={refreshClasses} />}
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

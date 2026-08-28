import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

export default function Dashboard({ classes, onChanged }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return;
    setCreating(true);
    try {
      const created = await api.createClass(name.trim());
      setName('');
      await onChanged();
      navigate(`/classes/${created.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  const totalParents = classes.reduce((sum, c) => sum + c.parentCount, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Classes</h2>
          <p className="sub">
            {classes.length} {classes.length === 1 ? 'class' : 'classes'} · {totalParents} parent
            contacts total
          </p>
        </div>
      </div>

      <form className="inline-form composer" onSubmit={handleCreate}>
        <div className="field">
          <label htmlFor="className">New class name</label>
          <input
            id="className"
            placeholder="e.g. Grade 4 - Blue"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button className="btn btn--primary" type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Add class'}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}

      {classes.length === 0 ? (
        <div className="empty-state ledger">
          <h3>No classes yet</h3>
          <p>Create your first class above — you can add parent contacts to it next.</p>
        </div>
      ) : (
        <div className="ledger">
          <div className="ledger-row ledger-row--head">
            <span>Class</span>
            <span>Created</span>
            <span>Parents</span>
            <span></span>
          </div>
          {classes.map((c) => (
            <div
              className="ledger-row"
              key={c.id}
              onClick={() => navigate(`/classes/${c.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <strong>{c.name}</strong>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                {new Date(c.createdAt).toLocaleDateString()}
              </span>
              <span>{c.parentCount}</span>
              <button className="btn" onClick={(e) => { e.stopPropagation(); navigate(`/classes/${c.id}`); }}>
                Open
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

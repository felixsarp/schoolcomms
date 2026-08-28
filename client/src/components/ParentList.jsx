import { useState } from 'react';
import { api } from '../api/client.js';

export default function ParentList({ classId, parents, otherClasses, onChanged }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [movingId, setMovingId] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setAdding(true);
    try {
      await api.addParent(classId, { name, phone });
      setName('');
      setPhone('');
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(parentId) {
    if (!confirm('Remove this parent from the class?')) return;
    await api.removeParent(classId, parentId);
    await onChanged();
  }

  async function handleMove(parentId, targetClassId) {
    if (!targetClassId) return;
    setMovingId(parentId);
    try {
      await api.moveParent(classId, parentId, targetClassId);
      await onChanged();
    } finally {
      setMovingId(null);
    }
  }

  return (
    <>
      <form className="inline-form composer" onSubmit={handleAdd}>
        <div className="field">
          <label htmlFor="parentName">Parent name</label>
          <input id="parentName" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="parentPhone">WhatsApp number</label>
          <input
            id="parentPhone"
            placeholder="+233241234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <button className="btn btn--primary" type="submit" disabled={adding}>
          {adding ? 'Adding…' : 'Add parent'}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}

      {parents.length === 0 ? (
        <div className="empty-state ledger">
          <h3>No parents in this class yet</h3>
          <p>Add parent contacts above to start building the distribution list.</p>
        </div>
      ) : (
        <div className="ledger">
          <div className="ledger-row ledger-row--head">
            <span>Name</span>
            <span>WhatsApp number</span>
            <span>Move to…</span>
            <span></span>
          </div>
          {parents.map((p) => (
            <div className="ledger-row" key={p.id}>
              <span>{p.name}</span>
              <span style={{ color: 'var(--muted)' }}>{p.phone}</span>
              <select
                value=""
                disabled={movingId === p.id || otherClasses.length === 0}
                onChange={(e) => handleMove(p.id, e.target.value)}
              >
                <option value="" disabled>
                  {otherClasses.length === 0 ? 'No other classes' : 'Choose class'}
                </option>
                {otherClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button className="btn btn--danger" onClick={() => handleRemove(p.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

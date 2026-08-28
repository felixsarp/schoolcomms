import { useEffect, useState, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { api } from '../api/client.js';
import ParentList from '../components/ParentList.jsx';
import MessageComposer from '../components/MessageComposer.jsx';

export default function ClassDetail({ classes, onChanged }) {
  const { classId } = useParams();
  const [parents, setParents] = useState([]);
  const [tab, setTab] = useState('parents');
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const classGroup = classes.find((c) => c.id === classId);

  const loadParents = useCallback(async () => {
    const list = await api.listParents(classId);
    setParents(list);
  }, [classId]);

  useEffect(() => {
    loadParents();
  }, [loadParents]);

  useEffect(() => {
    if (classGroup) setNameDraft(classGroup.name);
  }, [classGroup?.name]);

  if (!classGroup && classes.length > 0) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!classGroup) return null;

  async function handleRename(e) {
    e.preventDefault();
    if (nameDraft.trim() && nameDraft.trim() !== classGroup.name) {
      await api.renameClass(classId, nameDraft.trim());
      await onChanged();
    }
    setRenaming(false);
  }

  async function handleDeleteClass() {
    if (!confirm(`Delete "${classGroup.name}" and all its parent contacts? This can't be undone.`)) {
      return;
    }
    await api.deleteClass(classId);
    await onChanged();
  }

  const otherClasses = classes.filter((c) => c.id !== classId);

  return (
    <>
      <div className="page-header">
        <div>
          {renaming ? (
            <form onSubmit={handleRename} style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={handleRename}
              />
            </form>
          ) : (
            <h2 onClick={() => setRenaming(true)} style={{ cursor: 'text' }} title="Click to rename">
              {classGroup.name}
            </h2>
          )}
          <p className="sub">{parents.length} parent contacts</p>
        </div>
        <button className="btn btn--danger" onClick={handleDeleteClass}>
          Delete class
        </button>
      </div>

      <div className="tabs">
        <button className={tab === 'parents' ? 'active' : ''} onClick={() => setTab('parents')}>
          Parents
        </button>
        <button className={tab === 'messages' ? 'active' : ''} onClick={() => setTab('messages')}>
          Messages
        </button>
      </div>

      {tab === 'parents' ? (
        <ParentList
          classId={classId}
          parents={parents}
          otherClasses={otherClasses}
          onChanged={loadParents}
        />
      ) : (
        <MessageComposer classId={classId} parentCount={parents.length} />
      )}
    </>
  );
}

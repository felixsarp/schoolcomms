const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function getToken() {
  return localStorage.getItem('schoolcomms_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('schoolcomms_token', token);
  else localStorage.removeItem('schoolcomms_token');
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),
  addStaff: (payload) => request('/auth/users', { method: 'POST', body: payload }),

  listClasses: () => request('/classes'),
  getClass: (id) => request(`/classes/${id}`),
  createClass: (name) => request('/classes', { method: 'POST', body: { name } }),
  renameClass: (id, name) => request(`/classes/${id}`, { method: 'PUT', body: { name } }),
  deleteClass: (id) => request(`/classes/${id}`, { method: 'DELETE' }),

  listParents: (classId) => request(`/classes/${classId}/parents`),
  addParent: (classId, payload) =>
    request(`/classes/${classId}/parents`, { method: 'POST', body: payload }),
  updateParent: (classId, parentId, payload) =>
    request(`/classes/${classId}/parents/${parentId}`, { method: 'PUT', body: payload }),
  moveParent: (classId, parentId, targetClassId) =>
    request(`/classes/${classId}/parents/${parentId}/move`, {
      method: 'POST',
      body: { targetClassId },
    }),
  removeParent: (classId, parentId) =>
    request(`/classes/${classId}/parents/${parentId}`, { method: 'DELETE' }),

  listMessages: (classId) => request(`/classes/${classId}/messages`),
  sendMessage: (classId, formData) =>
    request(`/classes/${classId}/messages`, { method: 'POST', body: formData, isForm: true }),
};

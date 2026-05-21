import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { taskAPI } from '../services/api';
import { Icon, StatusBadge, EmptyState, Spinner } from '../components/ui';

export default function ProjectManagement() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(authUser);

  useEffect(() => {
    if (!authUser) {
      const fetchUser = async () => {
        try {
          const response = await axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
          setCurrentUser(response.data.user);
        } catch (err) { console.error('Failed to fetch user:', err); }
      };
      fetchUser();
    } else {
      setCurrentUser(authUser);
    }
  }, [authUser]);

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/tasks', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setTasks(response.data.tasks || []);
    } catch (err) {
      setError('Nu s-au putut încărca task-urile');
    } finally { setLoading(false); }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await taskAPI.createTask({
        title: formData.get('title'),
        description: formData.get('description'),
        budget_ron: parseFloat(formData.get('budget_ron')),
        timeline_days: parseInt(formData.get('timeline_days'))
      });
      setSuccess('Task creat cu succes!');
      setShowCreateModal(false);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la crearea task-ului');
    }
  };

  if (loading) return <div className="escro-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}><Spinner /></div>;

  return (
    <div className="escro-page fade-up" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="page-head" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div className="h-eyebrow">Project Management</div>
          <h1 className="h-title" style={{ fontSize: 28 }}>Task-urile <em>mele</em>.</h1>
          <p className="h-sub">Gestionează task-urile și asignările tale.</p>
        </div>
        <div className="page-actions">
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary"><Icon name="plus" size={13} /> Task nou</button>
        </div>
      </div>

      {/* Alert messages */}
      {error && <div style={{ padding: '.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>{error} <button onClick={() => setError('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)' }}>✕</button></div>}
      {success && <div style={{ padding: '.75rem 1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--r-sm)', color: 'var(--success)', fontSize: 13, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>{success} <button onClick={() => setSuccess('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--success)' }}>✕</button></div>}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Total Task-uri</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-0)' }}>{tasks.length}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>În Lucru</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)' }}>{tasks.filter(t => t.status === 'in_progress').length}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Finalizate</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{tasks.filter(t => t.status === 'completed').length}</div>
        </div>
      </div>

      {/* Tasks card */}
      <div className="card">
        <div className="card-head"><div className="card-title">Task-uri ({tasks.length})</div></div>
        {tasks.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <EmptyState icon="folder" title="Niciun task" description="Creează primul tău task pentru a începe." />
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ marginTop: '1rem' }}><Icon name="plus" size={13} /> Creează primul task</button>
          </div>
        ) : (
          <div className="card-body col" style={{ gap: '.75rem' }}>
            {tasks.map(task => (
              <div key={task.id} className="card-interactive card" style={{ padding: '1rem 1.25rem', cursor: 'pointer' }} onClick={() => navigate(`/project/${task.id}`)}>
                <div className="row-between" style={{ marginBottom: '.625rem' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-0)' }}>{task.title}</div>
                  <StatusBadge status={task.status} />
                </div>
                {task.description && <p style={{ margin: '0 0 .875rem', fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.5 }}>{task.description.substring(0, 100)}{task.description.length > 100 ? '...' : ''}</p>}
                <div className="row" style={{ gap: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Buget</div>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)', marginTop: 2 }}>{task.budget_ron?.toLocaleString()} RON</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Asignări</div>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--violet)', marginTop: 2 }}>{task.assignments_count || 0}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCreateModal(false)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-lg)', padding: '1.5rem', maxWidth: 560, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="row-between" style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--fg-0)' }}>Creare Task Nou</div>
              <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--fg-3)', fontSize: '1.5rem' }}>×</button>
            </div>
            <form onSubmit={handleCreateTask} className="col" style={{ gap: '.875rem' }}>
              <div>
                <label className="label">Titlu Task *</label>
                <input name="title" type="text" required className="input" placeholder="Ex: Dezvoltare Platformă E-commerce" />
              </div>
              <div>
                <label className="label">Descriere *</label>
                <textarea name="description" required className="input" rows={3} placeholder="Descrie ce trebuie realizat..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.875rem' }}>
                <div>
                  <label className="label">Buget (RON) *</label>
                  <input name="budget_ron" type="number" step="0.01" required className="input" placeholder="50000" />
                </div>
                <div>
                  <label className="label">Termen (zile) *</label>
                  <input name="timeline_days" type="number" required className="input" defaultValue={30} />
                </div>
              </div>
              <div className="row" style={{ gap: '.75rem', justifyContent: 'flex-end', marginTop: '.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Anulează</button>
                <button type="submit" className="btn btn-primary">Creează Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

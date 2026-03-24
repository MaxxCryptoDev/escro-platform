import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { taskAPI } from '../services/api';

const styles = {
  container: { padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Inter', -apple-system, sans-serif", backgroundColor: '#f5f7fa', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  title: { margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#1e293b' },
  subtitle: { margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '1rem' },
  button: { padding: '0.75rem 1.5rem', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  buttonPrimary: { backgroundColor: '#3b82f6', color: 'white', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)' },
  buttonSecondary: { backgroundColor: 'white', color: '#475569', border: '1px solid #e2e8f0' },
  card: { backgroundColor: 'white', borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' },
  alert: { padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' },
  alertError: { backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' },
  alertSuccess: { backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' },
  label: { display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151', fontSize: '0.95rem' },
  labelSmall: { display: 'block', marginBottom: '0.35rem', fontWeight: '600', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { width: '100%', padding: '0.875rem 1rem', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '1rem', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none' },
  textarea: { width: '100%', padding: '0.875rem 1rem', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '1rem', backgroundColor: '#f8fafc', color: '#1e293b', outline: 'none', resize: 'vertical', minHeight: '100px', fontFamily: 'inherit' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.85rem', borderRadius: '20px', fontWeight: '600', fontSize: '0.85rem' },
  taskCard: { padding: '1.5rem', borderRadius: '12px', border: '2px solid', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '1rem' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' },
  modalContent: { backgroundColor: 'white', padding: '2.5rem', borderRadius: '20px', maxWidth: '600px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' },
  statCard: { backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  statValue: { fontSize: '1.75rem', fontWeight: '700', margin: '0.25rem 0' },
  statLabel: { fontSize: '0.85rem', color: '#64748b', fontWeight: '500' },
  text: { fontSize: '1rem', color: '#475569', lineHeight: '1.6' }
};

const getStatusColor = (status) => {
  const colors = { open: '#0891b2', in_progress: '#3b82f6', completed: '#22c55e', cancelled: '#ef4444' };
  return colors[status] || '#6b7280';
};

const getStatusLabel = (status) => {
  const labels = { open: 'Deschis', in_progress: 'În Lucru', completed: 'Finalizat', cancelled: 'Anulat' };
  return labels[status] || status;
};

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

  if (loading) return <div style={{...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh'}}><div><h2 style={{color: '#3b82f6'}}>Se încarcă...</h2></div></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📊 Project Management</h1>
          <p style={styles.subtitle}>Gestionează task-urile și asignările tale</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} style={{...styles.button, ...styles.buttonPrimary}}>+ Task Nou</button>
      </div>

      {error && <div style={{...styles.alert, ...styles.alertError}}><span style={{flex: 1}}>{error}</span><button onClick={() => setError('')} style={{border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626'}}>✕</button></div>}
      {success && <div style={{...styles.alert, ...styles.alertSuccess}}><span style={{flex: 1}}>{success}</span><button onClick={() => setSuccess('')} style={{border: 'none', background: 'none', cursor: 'pointer', color: '#16a34a'}}>✕</button></div>}

      <div style={styles.grid3}>
        <div style={styles.statCard}><p style={{...styles.statLabel, margin: 0}}>TOTAL TASK-URI</p><p style={{...styles.statValue, color: '#3b82f6', margin: 0}}>{tasks.length}</p></div>
        <div style={styles.statCard}><p style={{...styles.statLabel, margin: 0}}>ÎN LUCRU</p><p style={{...styles.statValue, color: '#f59e0b', margin: 0}}>{tasks.filter(t => t.status === 'in_progress').length}</p></div>
        <div style={styles.statCard}><p style={{...styles.statLabel, margin: 0}}>FINALIZATE</p><p style={{...styles.statValue, color: '#22c55e', margin: 0}}>{tasks.filter(t => t.status === 'completed').length}</p></div>
      </div>

      <div style={styles.card}>
        <h3 style={{...styles.sectionTitle, marginBottom: '1.5rem'}}>📋 Task-urile Tale</h3>
        {tasks.length === 0 ? (
          <div style={{textAlign: 'center', padding: '3rem', backgroundColor: '#f8fafc', borderRadius: '12px'}}>
            <p style={{color: '#64748b', marginBottom: '1rem'}}>Nu ai niciun task creat.</p>
            <button onClick={() => setShowCreateModal(true)} style={{...styles.button, ...styles.buttonPrimary, margin: '0 auto'}}>+ Creează Primul Task</button>
          </div>
        ) : (
          <div>
            {tasks.map((task) => (
              <div key={task.id} onClick={() => navigate(`/task/${task.id}`)} style={{...styles.taskCard, backgroundColor: '#f8fafc', borderColor: getStatusColor(task.status)}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                  <div>
                    <h4 style={{margin: 0, fontSize: '1.15rem', fontWeight: '600', color: '#1e293b'}}>{task.title}</h4>
                    <p style={{margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.95rem'}}>{task.description?.substring(0, 80)}...</p>
                  </div>
                  <span style={{...styles.badge, backgroundColor: getStatusColor(task.status), color: 'white'}}>{getStatusLabel(task.status)}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{display: 'flex', gap: '2rem'}}>
                    <div><p style={{margin: 0, color: '#64748b', fontSize: '0.8rem'}}>BUGET</p><p style={{margin: '0.25rem 0 0 0', fontWeight: '600', color: '#16a34a'}}>{task.budget_ron?.toLocaleString()} RON</p></div>
                    <div><p style={{margin: 0, color: '#64748b', fontSize: '0.8rem'}}>ASIGNĂRI</p><p style={{margin: '0.25rem 0 0 0', fontWeight: '600', color: '#8b5cf6'}}>{task.assignments_count || 0}</p></div>
                  </div>
                  <span style={{color: '#3b82f6', fontWeight: '500'}}>Vezi detalii →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div style={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{margin: '0 0 1.5rem 0', fontSize: '1.5rem', color: '#1e293b'}}>Creare Task Nou</h2>
            <form onSubmit={handleCreateTask}>
              <div style={{marginBottom: '1.25rem'}}>
                <label style={styles.label}>Titlu Task *</label>
                <input name="title" type="text" required style={styles.input} placeholder="Ex: Dezvoltare Platformă E-commerce" />
              </div>
              <div style={{marginBottom: '1.25rem'}}>
                <label style={styles.label}>Descriere *</label>
                <textarea name="description" required style={styles.textarea} placeholder="Descrie ce trebuie realizat..." />
              </div>
              <div style={styles.grid2}>
                <div style={{marginBottom: '1.25rem'}}>
                  <label style={styles.label}>Buget Total (RON)</label>
                  <input name="budget_ron" type="number" step="0.01" required style={styles.input} placeholder="Ex: 50000" />
                </div>
                <div style={{marginBottom: '1.25rem'}}>
                  <label style={styles.label}>Termen (zile)</label>
                  <input name="timeline_days" type="number" required style={styles.input} defaultValue={30} placeholder="Ex: 30" />
                </div>
              </div>
              <div style={{display: 'flex', gap: '1rem', marginTop: '2rem'}}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{...styles.button, ...styles.buttonSecondary, flex: 1}}>Anulează</button>
                <button type="submit" style={{...styles.button, ...styles.buttonPrimary, flex: 1}}>Creează Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { taskAPI } from '../services/api';

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: '#f0f4f8',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  backButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'white',
    color: '#4a5568',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  alert: {
    padding: '1rem 1.25rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.95rem',
  },
  alertError: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
  },
  alertSuccess: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    border: '1px solid #bbf7d0',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '2rem',
    marginBottom: '1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  cardHover: {
    transition: 'all 0.3s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    }
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    borderBottom: '2px solid #f1f5f9',
    paddingBottom: '1rem',
  },
  cardTitle: {
    margin: 0,
    fontSize: '1.35rem',
    fontWeight: '700',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  button: {
    padding: '0.7rem 1.25rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    border: 'none',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  buttonPrimary: {
    backgroundColor: '#6366f1',
    color: 'white',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
  },
  buttonSecondary: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
  },
  buttonSuccess: {
    backgroundColor: '#10b981',
    color: 'white',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
  },
  buttonDanger: {
    backgroundColor: '#ef4444',
    color: 'white',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
  },
  input: {
    width: '100%',
    padding: '0.875rem 1rem',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    fontSize: '1rem',
    transition: 'all 0.2s ease',
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '0.875rem 1rem',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    fontSize: '1rem',
    transition: 'all 0.2s ease',
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    minHeight: '100px',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: '#374151',
    fontSize: '0.95rem',
  },
  labelSmall: {
    display: 'block',
    marginBottom: '0.35rem',
    fontWeight: '600',
    color: '#64748b',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.25rem',
  },
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
    position: 'relative',
    overflow: 'hidden',
  },
  statCardIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    marginBottom: '1rem',
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: '700',
    margin: '0.25rem 0',
  },
  statLabel: {
    fontSize: '0.85rem',
    color: '#64748b',
    fontWeight: '500',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.4rem 0.85rem',
    borderRadius: '20px',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  assignmentCard: {
    padding: '1.5rem',
    borderRadius: '16px',
    marginBottom: '1rem',
    border: '2px solid',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    overflowY: 'auto',
    padding: '2rem',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '24px',
    maxWidth: '700px',
    width: '100%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  text: {
    fontSize: '1rem',
    color: '#475569',
    lineHeight: '1.6',
  },
  textSmall: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
  link: {
    color: '#6366f1',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'color 0.2s ease',
  },
  avatarGroup: {
    display: 'flex',
    alignItems: 'center',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid white',
    objectFit: 'cover',
    marginRight: '-12px',
  },
  avatarPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    border: '3px solid white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    marginRight: '-12px',
  },
  progressBar: {
    height: '8px',
    borderRadius: '4px',
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
    marginTop: '0.5rem',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.35rem 0.75rem',
    borderRadius: '8px',
    fontWeight: '500',
    fontSize: '0.8rem',
  },
};

const getTaskStatusColor = (status) => {
  const colors = { open: '#0891b2', in_progress: '#3b82f6', completed: '#22c55e', cancelled: '#ef4444' };
  return colors[status] || '#6b7280';
};

const getTaskStatusLabel = (status) => {
  const labels = { open: 'Deschis', in_progress: 'În Lucru', completed: 'Finalizat', cancelled: 'Anulat' };
  return labels[status] || status;
};

const getAssignmentStatusColor = (status) => {
  const colors = { 
    open: '#0891b2', 
    assigned: '#8b5cf6', 
    in_progress: '#3b82f6', 
    completed: '#22c55e', 
    disputed: '#ef4444',
    pending_assignment: '#f59e0b',
    pending_admin_approval: '#f59e0b'
  };
  return colors[status] || '#6b7280';
};

  const getAssignmentStatusLabel = (status) => {
  const labels = { 
    open: 'Deschis', 
    assigned: 'Asignat', 
    in_progress: 'În Lucru', 
    completed: 'Finalizat', 
    disputed: 'Dispută',
    pending_assignment: 'În Așteptare',
    pending_admin_approval: 'Așteaptă Aprobare'
  };
  return labels[status] || status;
};

export default function TaskDashboard() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [task, setTask] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(authUser);
  const [assignmentMilestones, setAssignmentMilestones] = useState([
    { title: '', deliverable_description: '', percentage_of_budget: 50 }
  ]);
  const [formBudget, setFormBudget] = useState(null);

  const user = currentUser;

  useEffect(() => {
    if (!authUser) {
      const fetchUser = async () => {
        try {
          const response = await axios.get('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          setCurrentUser(response.data.user);
        } catch (err) {
          console.error('Failed to fetch user:', err);
        }
      };
      fetchUser();
    } else {
      setCurrentUser(authUser);
    }
  }, [authUser]);

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  console.log('[TaskDashboard] taskId:', taskId);
  console.log('[TaskDashboard] task:', task);
  console.log('[TaskDashboard] assignments:', assignments);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('[TaskDashboard] API response:', response.data);
      setTask(response.data.task);
      setAssignments(response.data.assignments || []);
      setError('');
    } catch (err) {
      setError('Nu s-au putut încărca detaliile task-ului');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMilestoneChange = (index, field, value) => {
    const updated = [...assignmentMilestones];
    updated[index] = { ...updated[index], [field]: field === 'percentage_of_budget' ? parseFloat(value) : value };
    setAssignmentMilestones(updated);
  };

  const addMilestone = () => {
    const newMilestones = [...assignmentMilestones, { title: '', deliverable_description: '', percentage_of_budget: 0 }];
    // Setează procentele egal pentru toate etapele
    const equalPercentage = Math.floor(100 / newMilestones.length);
    const remainder = 100 - (equalPercentage * newMilestones.length);
    newMilestones.forEach((m, i) => {
      m.percentage_of_budget = equalPercentage + (i === 0 ? remainder : 0);
    });
    setAssignmentMilestones(newMilestones);
  };

  const removeMilestone = (index) => {
    if (assignmentMilestones.length > 1) {
      const filtered = assignmentMilestones.filter((_, i) => i !== index);
      // Recalculează procentele egal
      const equalPercentage = Math.floor(100 / filtered.length);
      const remainder = 100 - (equalPercentage * filtered.length);
      filtered.forEach((m, i) => {
        m.percentage_of_budget = equalPercentage + (i === 0 ? remainder : 0);
      });
      setAssignmentMilestones(filtered);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const assignmentBudget = parseFloat(formData.get('budget_ron')) || task.budget_ron;
    
    // Filter out empty milestones
    const validMilestones = assignmentMilestones.filter(m => m.title && m.deliverable_description);
    
    // Validare: suma procentelor trebuie să fie 100%
    if (validMilestones.length > 0) {
      const totalPercentage = validMilestones.reduce((sum, m) => sum + (parseFloat(m.percentage_of_budget) || 0), 0);
      
      if (Math.abs(totalPercentage - 100) > 1) {
        setError(`Suma procentelor trebuie să fie 100% (acum: ${totalPercentage}%)`);
        return;
      }
      
      // Validare: suma procentelor × buget nu trebuie să depășească bugetul alocat
      const totalAmount = (totalPercentage / 100) * assignmentBudget;
      if (totalAmount > assignmentBudget) {
        setError(`Suma etapelor (${totalAmount.toLocaleString()} RON) depășește bugetul colaborării (${assignmentBudget.toLocaleString()} RON)`);
        return;
      }
    }
    
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      budget_ron: assignmentBudget,
      timeline_days: parseInt(formData.get('timeline_days')) || task.timeline_days,
      milestones: validMilestones
    };

    try {
      await taskAPI.createAssignment(taskId, data);
      setSuccess('Colaborare creată cu succes!');
      setShowCreateModal(false);
      setAssignmentMilestones([{ title: '', deliverable_description: '', percentage_of_budget: 50 }]);
      fetchTaskDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la crearea colaborării');
    }
  };

  if (loading) return (
    <div style={{...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
      <div style={{textAlign: 'center'}}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1.5rem',
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <h2 style={{color: '#1e293b', fontSize: '1.5rem', marginBottom: '0.5rem'}}>Se încarcă...</h2>
        <p style={{color: '#64748b'}}>Te rugăm să aștepți</p>
      </div>
    </div>
  );

  if (!task) return (
    <div style={{...styles.container, padding: '4rem 2rem', textAlign: 'center'}}>
      <div style={{...styles.card, textAlign: 'center', padding: '4rem'}}>
        <div style={{fontSize: '4rem', marginBottom: '1rem'}}>🔍</div>
        <h2 style={{color: '#1e293b', marginBottom: '1rem'}}>Task negăsit</h2>
        <p style={{color: '#64748b', marginBottom: '2rem'}}>Task-ul pe care îl cauți nu există sau a fost șters.</p>
        <button onClick={() => navigate(-1)} style={{...styles.button, ...styles.buttonPrimary, margin: '0 auto', padding: '0.85rem 2rem'}}>← Înapoi</button>
      </div>
    </div>
  );

  const isOwner = task.is_owner;
  const remainingBudget = task.remaining_budget || 0;

  const userRole = user?.role || localStorage.getItem('userRole');
  const dashboardUrl = userRole === 'expert' ? '/expert/dashboard' : '/company/dashboard';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button 
          onClick={() => navigate(dashboardUrl)} 
          style={{...styles.backButton, ':hover': {backgroundColor: '#f8fafc', transform: 'translateY(-1px)'}}}
        >
          <span style={{fontSize: '1.2rem'}}>←</span> 
          Înapoi la Dashboard
        </button>
        {isOwner && (
          <button 
            onClick={() => { setAssignmentMilestones([{ title: '', deliverable_description: '', percentage_of_budget: 100 }]); setFormBudget(null); setShowCreateModal(true); }} 
            style={{...styles.button, ...styles.buttonPrimary}}
          >
            <span>+</span> Creează Colaborare
          </button>
        )}
      </div>

      {error && (
        <div style={{...styles.alert, ...styles.alertError}}>
          <span style={{flex: 1}}>{error}</span>
          <button onClick={() => setError('')} style={{border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '1.2rem'}}>✕</button>
        </div>
      )}
      {success && (
        <div style={{...styles.alert, ...styles.alertSuccess}}>
          <span style={{flex: 1}}>{success}</span>
          <button onClick={() => setSuccess('')} style={{border: 'none', background: 'none', cursor: 'pointer', color: '#16a34a', fontSize: '1.2rem'}}>✕</button>
        </div>
      )}

      <div style={{
        ...styles.card, 
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
        position: 'relative',
        overflow: 'hidden',
        cursor: assignments.length > 0 ? 'pointer' : 'default',
      }}
      onClick={() => {
        if (assignments.length > 0) {
          navigate(`/expert/project/${assignments[0].id}`);
        }
      }}
      >
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', position: 'relative'}}>
          <div>
            <span style={{
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              padding: '0.5rem 1rem', 
              borderRadius: '99px', 
              fontWeight: '600', 
              fontSize: '0.85rem', 
              backgroundColor: 'rgba(255,255,255,0.25)', 
              color: 'white',
              marginBottom: '1rem',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getTaskStatusColor(task.status)
              }} />
              {getTaskStatusLabel(task.status)}
            </span>
            <h2 style={{margin: 0, fontSize: '2rem', fontWeight: '800', color: 'white', lineHeight: '1.3', textShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>{task.title}</h2>
          </div>
          <div style={{display: 'flex', gap: '0.5rem'}}>
            <span style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              fontSize: '1.5rem',
              backdropFilter: 'blur(4px)',
            }}>📋</span>
          </div>
        </div>
        <p style={{
          fontSize: '1.05rem', 
          color: 'rgba(255,255,255,0.92)', 
          lineHeight: '1.7', 
          margin: 0, 
          padding: '1.25rem', 
          backgroundColor: 'rgba(255,255,255,0.15)', 
          borderRadius: '12px',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.15)'
        }}>{task.description}</p>
      </div>
      
      <div style={styles.grid4}>
        <div style={{
          ...styles.statCard,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        }}>
          <div style={{...styles.statCardIcon, backgroundColor: 'rgba(255,255,255,0.2)'}}>💰</div>
          <p style={{...styles.statLabel, margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Buget Total</p>
          <p style={{...styles.statValue, color: 'white', margin: '0.25rem 0 0 0', fontSize: '1.5rem'}}>{task.budget_ron?.toLocaleString()} RON</p>
        </div>
        
        <div style={{
          ...styles.statCard,
          background: remainingBudget > 0 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        }}>
          <div style={{...styles.statCardIcon, backgroundColor: 'rgba(255,255,255,0.2)'}}>🏦</div>
          <p style={{...styles.statLabel, margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Buget Rămas</p>
          <p style={{...styles.statValue, color: 'white', margin: '0.25rem 0 0 0', fontSize: '1.5rem'}}>{remainingBudget.toLocaleString()} RON</p>
        </div>
        
        <div style={{
          ...styles.statCard,
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        }}>
          <div style={{...styles.statCardIcon, backgroundColor: 'rgba(255,255,255,0.2)'}}>⏱️</div>
          <p style={{...styles.statLabel, margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Termen Limită</p>
          <p style={{...styles.statValue, color: 'white', margin: '0.25rem 0 0 0', fontSize: '1.5rem'}}>{task.timeline_days} zile</p>
        </div>
        
        <div style={{
          ...styles.statCard,
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        }}>
          <div style={{...styles.statCardIcon, backgroundColor: 'rgba(255,255,255,0.2)'}}>🤝</div>
          <p style={{...styles.statLabel, margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Colaborări</p>
          <p style={{...styles.statValue, color: 'white', margin: '0.25rem 0 0 0', fontSize: '1.5rem'}}>{assignments.length}</p>
        </div>
      </div>

      {task.client_name && (
        <div style={{
          ...styles.card,
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          padding: '1.5rem 2rem',
        }}>
          <div style={{
            width: '56px', 
            height: '56px', 
            borderRadius: '16px', 
            backgroundColor: '#6366f1',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '1.5rem',
            color: 'white',
          }}>👤</div>
          <div style={{flex: 1}}>
            <p style={{margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Beneficiar</p>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '1.15rem', fontWeight: '600', color: '#1e293b' }}>{task.client_name?.split(' ')[0]}</p>
          </div>
          {(task.client_industry || task.client_profession || task.client_experience_years) && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#f1f5f9',
              borderRadius: '10px',
            }}>
              {task.client_industry && <p style={{margin: 0, fontSize: '0.85rem', color: '#64748b'}}>🏭 {task.client_industry}</p>}
              {task.client_profession && <p style={{margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: '#64748b'}}>💼 {task.client_profession}</p>}
              {task.client_experience_years && <p style={{margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: '#64748b'}}>⭐ {task.client_experience_years} ani experiență</p>}
            </div>
          )}
        </div>
      )}

      <div style={{...styles.card, padding: '1.5rem 2rem'}}>
        <h3 style={{...styles.sectionTitle, marginBottom: '1.5rem', fontSize: '1.35rem'}}>
          <span style={{fontSize: '1.4rem'}}>👥</span> Colaborări Active
          <span style={{
            marginLeft: 'auto',
            backgroundColor: '#6366f1',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: '600',
          }}>{assignments.length}</span>
        </h3>

        {assignments.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
            <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🤝</div>
            <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Nu există colaborări pentru acest task încă.</p>
            {isOwner && (
            <button 
              onClick={() => setShowCreateModal(true)}
              style={{
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '0.85rem 1.75rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
              }}
            >
              + Creează Prima Colaborare
            </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            {assignments.map((assignment) => (
              <div 
                key={assignment.id}
                onClick={() => navigate(`/expert/project/${assignment.id}`)}
                style={{
                  ...styles.assignmentCard,
                  backgroundColor: '#fafbfc',
                  borderColor: getAssignmentStatusColor(assignment.status),
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '4px',
                  height: '100%',
                  backgroundColor: getAssignmentStatusColor(assignment.status),
                  borderRadius: '16px 0 0 16px',
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingLeft: '0.5rem' }}>
                  <div style={{flex: 1}}>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#1e293b' }}>{assignment.title}</h4>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>{assignment.description?.substring(0, 120)}...</p>
                  </div>
                  <span style={{
                    ...styles.badge, 
                    backgroundColor: getAssignmentStatusColor(assignment.status), 
                    color: 'white',
                    padding: '0.5rem 1rem',
                    fontSize: '0.8rem',
                  }}>
                    {getAssignmentStatusLabel(assignment.status)}
                  </span>
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  paddingLeft: '0.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#ecfdf5',
                      borderRadius: '10px',
                      border: '1px solid #a7f3d0',
                    }}>
                      <p style={{ margin: 0, color: '#059669', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase' }}>Budget</p>
                      <p style={{ margin: '0.25rem 0 0 0', fontWeight: '700', color: '#047857', fontSize: '1rem' }}>{assignment.budget_ron?.toLocaleString()} RON</p>
                    </div>
                    <div style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#eff6ff',
                      borderRadius: '10px',
                      border: '1px solid #bfdbfe',
                    }}>
                      <p style={{ margin: 0, color: '#0369a1', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase' }}>Timeline</p>
                      <p style={{ margin: '0.25rem 0 0 0', fontWeight: '700', color: '#075985', fontSize: '1rem' }}>{assignment.timeline_days} zile</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {assignment.expert_name && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#fef3c7',
                        borderRadius: '8px',
                      }}>
                        {assignment.expert_image ? (
                          <img src={assignment.expert_image} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{fontSize: '1.2rem'}}>👨‍💻</span>
                        )}
                        <span style={{ fontWeight: '600', color: '#92400e', fontSize: '0.9rem' }}>{assignment.expert_name?.split(' ')[0]}</span>
                      </div>
                    )}
                    {assignment.company_name && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#e0e7ff',
                        borderRadius: '8px',
                      }}>
                        {assignment.company_image ? (
                          <img src={assignment.company_image} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{fontSize: '1.2rem'}}>🏢</span>
                        )}
                        <span style={{ fontWeight: '600', color: '#4338ca', fontSize: '0.9rem' }}>{assignment.company_name?.split(' ')[0]}</span>
                      </div>
                    )}
                    {!assignment.expert_id && !assignment.company_id && (
                      <span style={{ 
                        color: '#f59e0b', 
                        fontWeight: '600',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#fef3c7',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                      }}>⏳ În căutare de prestator...</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div style={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div style={{...styles.modalContent, maxWidth: '800px'}} onClick={(e) => e.stopPropagation()}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem'}}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
              }}>🤝</div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>Creare Colaborare Nouă</h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#64748b' }}>Stabilește termenii colaborării</p>
              </div>
            </div>
            
            <form onSubmit={handleCreateAssignment}>
              <label style={styles.label}>Titlu Colaborare *</label>
              <input name="title" required style={styles.input} placeholder="Ex: Dezvoltare Frontend" />
              
              <label style={styles.label}>Descriere *</label>
              <textarea name="description" required style={styles.textarea} placeholder="Descrie ce trebuie realizat în cadrul acestei colaborări..." />
            
              <div style={styles.grid2}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={styles.label}>Buget (RON)</label>
                  <input 
                    name="budget_ron" 
                    type="number" 
                    step="0.01" 
                    style={styles.input} 
                    defaultValue={task.budget_ron} 
                    placeholder="Ex: 5000"
                    onChange={(e) => setFormBudget(parseFloat(e.target.value) || task.budget_ron)}
                  />
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={styles.label}>Termen (zile)</label>
                  <input name="timeline_days" type="number" style={styles.input} defaultValue={task.timeline_days} placeholder="Ex: 30" />
                </div>
              </div>

              {/* Milestones pentru Assignment */}
              <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ ...styles.label, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🎯</span> Etape (Milestones)
                  </label>
                  <button type="button" onClick={addMilestone} style={{ ...styles.button, ...styles.buttonSecondary, padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    + Adaugă Etapă
                  </button>
                </div>
                
                {assignmentMilestones.length > 0 && (
                  <div style={{ 
                    padding: '1rem', 
                    backgroundColor: '#f0fdf4', 
                    borderRadius: '12px', 
                    marginBottom: '1rem', 
                    border: '1px solid #bbf7d0' 
                  }}>
                    {(() => {
                      const totalPct = assignmentMilestones.reduce((sum, m) => sum + (parseFloat(m.percentage_of_budget) || 0), 0);
                      const budgetValue = formBudget || task.budget_ron;
                      const totalAmount = (totalPct / 100) * budgetValue;
                      const isOverBudget = totalAmount > budgetValue;
                      const isOver100 = totalPct > 100;
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span style={{ color: isOver100 ? '#ef4444' : '#047857', fontWeight: '600' }}>
                            Total: {totalPct}% {isOver100 ? '⚠️' : '✓'}
                          </span>
                          <span style={{ color: isOverBudget ? '#ef4444' : '#047857', fontWeight: '600' }}>
                            {totalAmount.toLocaleString()} RON / {budgetValue.toLocaleString()} RON
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                {assignmentMilestones.map((milestone, index) => (
                  <div key={index} style={{ 
                    padding: '1.25rem', 
                    backgroundColor: '#fafbfc', 
                    borderRadius: '14px', 
                    marginBottom: '1rem', 
                    border: '1px solid #e2e8f0',
                    position: 'relative',
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginBottom: '0.75rem',
                      alignItems: 'center',
                    }}>
                      <span style={{ 
                        color: 'white', 
                        backgroundColor: '#6366f1',
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '0.8rem',
                      }}>
                        Etapa {index + 1}
                      </span>
                      {assignmentMilestones.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeMilestone(index)} 
                          style={{ 
                            border: 'none', 
                            background: '#fee2e2', 
                            color: '#dc2626', 
                            cursor: 'pointer', 
                            fontSize: '0.9rem',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px',
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <input 
                        type="text" 
                        value={milestone.title} 
                        onChange={(e) => handleMilestoneChange(index, 'title', e.target.value)} 
                        placeholder="Titlu etapă (Ex: Design, Development, Testing)" 
                        style={styles.input} 
                      />
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <textarea 
                        value={milestone.deliverable_description} 
                        onChange={(e) => handleMilestoneChange(index, 'deliverable_description', e.target.value)} 
                        placeholder="Descriere livrabil" 
                        style={{ ...styles.textarea, minHeight: '60px' }} 
                      />
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      <input 
                        type="number" 
                        value={milestone.percentage_of_budget} 
                        onChange={(e) => handleMilestoneChange(index, 'percentage_of_budget', e.target.value)} 
                        placeholder="%" 
                        style={{ ...styles.input, width: '100px' }} 
                      />
                      <span style={{ color: '#64748b', fontWeight: '500' }}>% din buget</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => { setShowCreateModal(false); setAssignmentMilestones([{ title: '', deliverable_description: '', percentage_of_budget: 50 }]); setFormBudget(null); }} style={{...styles.button, ...styles.buttonSecondary, flex: 1, justifyContent: 'center'}}>
                  Anulează
                </button>
                <button type="submit" style={{...styles.button, ...styles.buttonPrimary, flex: 1, justifyContent: 'center', padding: '0.85rem'}}>
                  Creează Colaborare
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

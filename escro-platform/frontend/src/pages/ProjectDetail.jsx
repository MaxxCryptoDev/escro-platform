import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { contractAPI, modificationAPI } from '../services/api';
import ContractModal from '../components/ContractModal';
import SignatureModal from '../components/SignatureModal';
import AnnexModal from '../components/AnnexModal';

const getFirstName = (name) => {
  if (!name) return '?';
  return name.split(' ')[0];
};

const formatMessageDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString();
  
  if (isToday) return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  if (isYesterday) return 'Ieri ' + date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' }) + ' ' + date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
};

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [modifications, setModifications] = useState([]);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    budget_ron: '',
    timeline_days: '',
    milestones: []
  });
  const messagesEndRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(authUser);
  const [selectedContract, setSelectedContract] = useState(null);
  const [signingContract, setSigningContract] = useState(false);
  const [signingMilestone, setSigningMilestone] = useState(null);
  const [selectedAnnex, setSelectedAnnex] = useState(null);

  const user = currentUser;

  const calculateTotals = (milestones, budget) => {
    const totalAmount = milestones.reduce((sum, m) => sum + (parseFloat(m.amount_ron) || 0), 0);
    const totalPercentage = milestones.reduce((sum, m) => sum + (parseFloat(m.percentage_of_budget) || 0), 0);
    return { totalAmount, totalPercentage };
  };

  const handleBudgetChange = (newBudget) => {
    const oldBudget = parseFloat(editFormData.budget_ron) || 0;
    if (oldBudget === 0) {
      setEditFormData({ ...editFormData, budget_ron: newBudget });
      return;
    }
    
    const ratio = parseFloat(newBudget) / oldBudget;
    const newMilestones = editFormData.milestones.map(m => ({
      ...m,
      amount_ron: String(Math.round((parseFloat(m.amount_ron) || 0) * ratio * 100) / 100)
    }));
    setEditFormData({ ...editFormData, budget_ron: newBudget, milestones: newMilestones });
  };

  const handleMilestoneAmountChange = (index, newAmount) => {
    const newMilestones = [...editFormData.milestones];
    const budget = parseFloat(editFormData.budget_ron) || 1;
    const amount = parseFloat(newAmount) || 0;
    newMilestones[index] = {
      ...newMilestones[index],
      amount_ron: newAmount,
      percentage_of_budget: String(Math.round((amount / budget) * 10000) / 100)
    };
    setEditFormData({ ...editFormData, milestones: newMilestones });
  };

  const handleMilestonePercentageChange = (index, newPercentage) => {
    const newMilestones = [...editFormData.milestones];
    const budget = parseFloat(editFormData.budget_ron) || 1;
    const percentage = parseFloat(newPercentage) || 0;
    newMilestones[index] = {
      ...newMilestones[index],
      percentage_of_budget: newPercentage,
      amount_ron: String(Math.round((percentage / 100) * budget * 100) / 100)
    };
    setEditFormData({ ...editFormData, milestones: newMilestones });
  };

  const fetchModifications = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/modifications`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setModifications(response.data.modifications || []);
    } catch (err) {
      console.error('Failed to fetch modifications:', err);
    }
  };

  useEffect(() => {
    if (!authUser) {
      const fetchUser = async () => {
        try {
          const response = await axios.get('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          setCurrentUser(response.data.user);
          fetchModifications();
        } catch (err) {
          console.error('Failed to fetch user:', err);
        }
      };
      fetchUser();
    } else {
      setCurrentUser(authUser);
      fetchModifications();
    }
  }, [authUser]);

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'chat') {
      fetchMessages();
    }
    if (activeTab === 'contracts') {
      fetchContracts();
    }
  }, [activeTab]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/messages`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setMessages(response.data.messages || response.data || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setProject({
        ...response.data.project,
        milestones: response.data.milestones
      });
      setError('');
    } catch (err) {
      setError('Failed to load project details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await contractAPI.getProjectContracts(projectId);
      setContracts(response.data.contracts || []);
      const workflowResponse = await contractAPI.getWorkflowStatus(projectId);
      setWorkflowStatus(workflowResponse.data.workflow);
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchContracts();
      fetchModifications();
    }
  }, [projectId]);

  const handleAcceptContract = async (contractId) => {
    try {
      await contractAPI.acceptContract(contractId);
      setSuccess('Ai acceptat contractul!');
      fetchContracts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept contract');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !project) return;
    let recipientId = project.expert_id || project.company_id || project.client_id;
    if (!recipientId) {
      setError('Nu există destinatar pentru acest mesaj');
      return;
    }
    try {
      await axios.post('/api/messages', {
        project_id: projectId,
        content: newMessage,
        recipient_id: recipientId
      }, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    }
  };

  const getMilestoneStatus = (status) => {
    const colors = { pending: '#ffc107', in_progress: '#17a2b8', delivered: '#28a745', approved: '#20c997', disputed: '#dc3545', released: '#6f42c1' };
    return colors[status] || '#6c757d';
  };

  const getStatusBgColor = (status) => {
    const bgColors = { pending: '#fff3cd', in_progress: '#cfe2ff', delivered: '#d1e7dd', approved: '#a8e6cf', disputed: '#f8d7da', released: '#e2d9f3' };
    return bgColors[status] || '#f8f9fa';
  };

  const getStatusLabel = (status) => {
    const labels = { pending: 'În așteptare', in_progress: 'În Lucru', delivered: 'Livrat', approved: 'Aprobat', disputed: 'Dispută', released: 'Eliberat' };
    return labels[status] || status;
  };

  const getStatusIcon = (status) => {
    const icons = { pending: '⏳', in_progress: '🔄', delivered: '📤', approved: '✅', disputed: '⚠️', released: '💰' };
    return icons[status] || '❓';
  };

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: '#f5f7fa',
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
    borderRadius: '10px',
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
  tabs: {
    display: 'flex',
    borderBottom: '3px solid #e2e8f0',
    marginBottom: '2rem',
    backgroundColor: 'white',
    borderRadius: '12px 12px 0 0',
    padding: '0.5rem',
    gap: '0.25rem',
  },
  tab: {
    padding: '1rem 1.75rem',
    backgroundColor: 'transparent',
    color: '#64748b',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.95rem',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
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
    borderRadius: '8px',
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
    backgroundColor: '#3b82f6',
    color: 'white',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
  },
  buttonSecondary: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
  },
  buttonSuccess: {
    backgroundColor: '#22c55e',
    color: 'white',
    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.25)',
  },
  buttonDanger: {
    backgroundColor: '#ef4444',
    color: 'white',
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
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
  inputFocus: {
    borderColor: '#3b82f6',
    backgroundColor: 'white',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
  },
  infoBox: {
    padding: '1.25rem 1.5rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    border: '1px solid',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  infoBoxBlue: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    color: '#1e40af',
  },
  infoBoxYellow: {
    backgroundColor: '#fefce8',
    borderColor: '#fef08a',
    color: '#854d0e',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
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
  milestoneCard: {
    padding: '1.5rem',
    borderRadius: '12px',
    marginBottom: '1rem',
    borderLeft: '4px solid',
  },
  chatContainer: {
    border: '2px solid #e2e8f0',
    borderRadius: '16px',
    height: '500px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
  },
  chatInput: {
    display: 'flex',
    padding: '1rem',
    borderTop: '2px solid #e2e8f0',
    backgroundColor: 'white',
    gap: '0.75rem',
  },
  chatInputField: {
    flex: 1,
    padding: '0.875rem 1rem',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  partyCard: {
    padding: '1.75rem',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    borderTop: '4px solid',
    height: '100%',
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
    borderRadius: '20px',
    maxWidth: '750px',
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
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'color 0.2s ease',
  },
  totalBox: {
    marginTop: '1.5rem',
    padding: '1.25rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #e2e8f0',
  },
};

const getInputStyle = (isFocused) => ({
  ...styles.input,
  ...(isFocused ? styles.inputFocus : {}),
});

  const getProjectStatusColor = (status) => {
    const colors = { pending_admin_approval: '#eab308', open: '#0891b2', in_progress: '#3b82f6', completed: '#22c55e', cancelled: '#ef4444' };
    return colors[status] || '#6b7280';
  };

  const getProjectStatusLabel = (status) => {
    const labels = { pending_admin_approval: 'In asteptare aprobare', open: 'Deschis', in_progress: 'In Lucru', completed: 'Finalizat', cancelled: 'Anulat' };
    return labels[status] || status;
  };

  if (loading) return <div style={{...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center'}}><div style={{textAlign: 'center'}}><h2 style={{color: '#3b82f6', fontSize: '1.5rem'}}>Se încarcă...</h2><p style={{color: '#64748b'}}>Te rugăm să aștepți</p></div></div>;
  if (!project) return <div style={{...styles.container, padding: '4rem 2rem', textAlign: 'center'}}><div style={{...styles.card, textAlign: 'center'}}><h2 style={{color: '#ef4444', marginBottom: '1rem'}}>Proiect negăsit</h2><button onClick={() => navigate(-1)} style={{...styles.button, ...styles.buttonPrimary, margin: '0 auto'}}>← Înapoi</button></div></div>;

  const userRole = user?.role;
  const isCompany = userRole === 'company';
  const isExpertUser = userRole === 'expert';
  const isProjectExpert = user?.id === project?.expert_id;
  const isProjectCompany = user?.id === project?.company_id;
  const isParty1 = user?.id === (project?.expert_id || project?.company_id) || (isExpertUser && project?.company_id);
  const isParty2 = user?.id === (project?.client_id);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          ← Înapoi
        </button>
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

      {modifications.length > 0 && modifications.some(m => m.status === 'pending') && user && (() => {
        const pendingMods = modifications.filter(m => m.status === 'pending');
        const groupedMods = pendingMods.reduce((acc, mod) => {
          const key = mod.proposed_by;
          if (!acc[key]) {
            acc[key] = { proposed_by_name: mod.proposed_by_name, modifications: [] };
          }
          acc[key].modifications.push(mod);
          return acc;
        }, {});
        
        return (
          <div style={{...styles.card, backgroundColor: '#fefce8', border: '1px solid #fef08a', marginBottom: '2rem'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.75rem' }}>⚠️</span>
              <h3 style={{ margin: 0, color: '#854d0e', fontSize: '1.25rem', fontWeight: '700' }}>Modificări Propuse</h3>
            </div>
            {Object.entries(groupedMods).map(([proposedBy, group]) => (
              <div key={proposedBy} style={{ padding: '1.25rem', backgroundColor: 'white', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#374151' }}><strong>{group.proposed_by_name}</strong> a propus {group.modifications.length} modificări:</p>
                <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {group.modifications.map(mod => (
                    <div key={mod.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '0.95rem', border: '1px solid #e2e8f0' }}>
                      <span><strong style={{color: '#475569'}}>{mod.field_name}:</strong></span>
                      <span><span style={{ color: '#dc2626', textDecoration: 'line-through', marginRight: '0.5rem', fontSize: '0.9rem' }}>{mod.old_value || '-'}</span>→ <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{mod.new_value}</span></span>
                    </div>
                  ))}
                </div>
                {proposedBy !== String(user?.id) && user && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={async () => { 
                      try { 
                        for (const mod of group.modifications) {
                          await modificationAPI.approveModification(mod.id);
                        }
                        setSuccess('Modificări aprobate!'); 
                        fetchModifications(); 
                        fetchProjectDetails(); 
                      } catch (err) { setError(err.response?.data?.error || 'Eroare'); } 
                    }} style={{...styles.button, ...styles.buttonSuccess, padding: '0.75rem 1.5rem'}}>✓ Acceptă Tot</button>
                    <button onClick={async () => { 
                      try { 
                        for (const mod of group.modifications) {
                          await modificationAPI.rejectModification(mod.id);
                        }
                        setSuccess('Modificări respinse!'); 
                        fetchModifications(); 
                      } catch (err) { setError(err.response?.data?.error || 'Eroare'); } 
                    }} style={{...styles.button, ...styles.buttonDanger, padding: '0.75rem 1.5rem'}}>✕ Respinge Tot</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      <div style={styles.tabs}>
        {['details', ...(user && (isParty1 || isParty2) ? ['chat', 'contracts'] : [])].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{...styles.tab, ...(activeTab === tab ? styles.tabActive : {})}}>
            {tab === 'details' && '📋 Detalii'}
            {tab === 'chat' && '💬 Chat'}
            {tab === 'contracts' && '📜 Contracte'}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div>
          {user && (isParty1 || isParty2) && (
          <div style={{...styles.infoBox, ...styles.infoBoxBlue}}>
            <span style={{ fontSize: '1.5rem' }}>💡</span>
            <div>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '1rem' }}>Contractul se va construi automat</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.9 }}>Pe baza informațiilor din această pagină. Asigură-te că toate datele sunt corecte înainte de a semna contractul.</p>
            </div>
          </div>
          )}

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>📋 Despre Proiect</h3>
              {user && (isParty1 || isParty2) && (
                <button
                  onClick={() => {
                    setEditFormData({
                      title: project.title,
                      description: project.description,
                      budget_ron: project.budget_ron,
                      timeline_days: project.timeline_days,
                      milestones: project.milestones ? project.milestones.map(m => ({...m})) : []
                    });
                    setShowEditProjectModal(true);
                  }}
                  style={{...styles.button, ...styles.buttonSecondary}}
                >
                  ✏️ Editează
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <p style={styles.labelSmall}>TITLU PROIECT</p>
                <p style={{ margin: 0, fontSize: '1.35rem', fontWeight: '600', color: '#1e293b' }}>{project.title}</p>
              </div>
              <div>
                <p style={styles.labelSmall}>DESCRIERE</p>
                <p style={{ ...styles.text, fontSize: '1.05rem', lineHeight: '1.7' }}>{project.description}</p>
              </div>
              <div style={styles.grid2}>
                <div style={styles.statCard}>
                  <p style={{...styles.statLabel, margin: 0}}>BUGET TOTAL</p>
                  <p style={{...styles.statValue, color: '#16a34a', margin: 0}}>{project.budget_ron} RON</p>
                </div>
                <div style={styles.statCard}>
                  <p style={{...styles.statLabel, margin: 0}}>TERMEN LIMITA</p>
                  <p style={{...styles.statValue, color: '#0891b2', margin: 0}}>{project.timeline_days} zile</p>
                </div>
              </div>
              <div>
                <p style={styles.labelSmall}>STATUS PROIECT</p>
                <span style={{...styles.badge, backgroundColor: getProjectStatusColor(project.status), color: 'white', fontSize: '0.9rem', padding: '0.5rem 1rem'}}>{getProjectStatusLabel(project.status)}</span>
              </div>
            </div>
          </div>

            <div style={styles.grid2}>
              <div style={{...styles.partyCard, borderTopColor: '#3b82f6'}}>
                <h4 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>👤 Beneficiar</h4>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {project.client_name ? (
                  <>
                    {project.client_name && (
                      <div>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Nume</p>
                        <Link to={`/profile/${project.client_id}`} style={{ ...styles.link, fontSize: '1.1rem', marginTop: '0.25rem', display: 'inline-block' }}>
                          {project.client_name.split(' ')[0]} →
                        </Link>
                      </div>
                    )}
                    {project.client_profession && <div><p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Domeniu/Profesie</p><p style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#374151' }}>{project.client_profession}</p></div>}
                    {project.client_industry && <div><p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Industrie</p><p style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#374151' }}>{project.client_industry}</p></div>}
                    {project.client_experience_years && <div><p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Ani Experiență</p><p style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#374151' }}>{project.client_experience_years} ani</p></div>}
                    <div style={{ padding: '0.75rem', backgroundColor: '#fefce8', borderRadius: '8px', fontSize: '0.85rem', color: '#854d0e', border: '1px solid #fef08a' }}>
                      🔒 Date de contact vizibile în chat
                    </div>
                  </>
                ) : project.expert_name ? (
                  <>
                    {project.expert_name && (
                      <div>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Nume</p>
                        <Link to={`/profile/${project.client_id}`} style={{ ...styles.link, fontSize: '1.1rem', marginTop: '0.25rem', display: 'inline-block' }}>
                          {project.expert_name.split(' ')[0]} →
                        </Link>
                      </div>
                    )}
                    {project.expert_expertise && <div><p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Domeniu/Expertiză</p><p style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#374151' }}>{project.expert_expertise}</p></div>}
                    {project.expert_industry && <div><p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Industrie</p><p style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#374151' }}>{project.expert_industry}</p></div>}
                    {project.expert_experience_years && <div><p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Ani Experiență</p><p style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#374151' }}>{project.expert_experience_years} ani</p></div>}
                    <div style={{ padding: '0.75rem', backgroundColor: '#fefce8', borderRadius: '8px', fontSize: '0.85rem', color: '#854d0e', border: '1px solid #fef08a' }}>
                      🔒 Date de contact vizibile în chat
                    </div>
                  </>
                ) : (
                  <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.95rem' }}>Nu există date</p>
                )}
              </div>
            </div>

              <div style={{...styles.partyCard, borderTopColor: '#22c55e'}}>
                <h4 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>👨‍💻 Prestator</h4>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {project.company_id ? (
                  <>
                    <div>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Denumire</p>
                      <Link to={`/profile/${project.company_id}`} style={{ ...styles.link, fontSize: '1.1rem', marginTop: '0.25rem', display: 'inline-block' }}>
                        {(project.company_name || '-')?.split(' ')[0]} →
                      </Link>
                    </div>
                    {project.company_expertise && <div><p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Domeniu/Expertiză</p><p style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#374151' }}>{project.company_expertise}</p></div>}
                    {project.company_industry && <div><p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Industrie</p><p style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#374151' }}>{project.company_industry}</p></div>}
                    {project.company_experience_years && <div><p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Ani Experiență</p><p style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#374151' }}>{project.company_experience_years} ani</p></div>}
                    <div style={{ padding: '0.75rem', backgroundColor: '#fefce8', borderRadius: '8px', fontSize: '0.85rem', color: '#854d0e', border: '1px solid #fef08a' }}>
                      🔒 Date de contact vizibile în chat
                    </div>
                  </>
                ) : project.expert_id ? (
                  <>
                    <div>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Nume</p>
                      <Link to={`/profile/${project.expert_id}`} style={{ ...styles.link, fontSize: '1.1rem', marginTop: '0.25rem', display: 'inline-block' }}>
                        {project.expert_name ? project.expert_name.split(' ')[0] : '-'} →
                      </Link>
                    </div>
                    {project.expert_expertise && <div><p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Domeniu/Expertiză</p><p style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#374151' }}>{project.expert_expertise}</p></div>}
                    {project.expert_industry && <div><p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Industrie</p><p style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#374151' }}>{project.expert_industry}</p></div>}
                    {project.expert_experience_years && <div><p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Ani Experiență</p><p style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#374151' }}>{project.expert_experience_years} ani</p></div>}
                    <div style={{ padding: '0.75rem', backgroundColor: '#fefce8', borderRadius: '8px', fontSize: '0.85rem', color: '#854d0e', border: '1px solid #fef08a' }}>
                      🔒 Date de contact vizibile în chat
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '1.5rem', backgroundColor: '#fefce8', borderRadius: '10px', textAlign: 'center', border: '1px solid #fef08a' }}>
                    <p style={{ margin: 0, color: '#854d0e', fontSize: '1rem', fontWeight: '500' }}>⏳ În căutare de prestator...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={{...styles.sectionTitle, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #f1f5f9'}}>🎯 Milestones</h3>
            {!project.milestones || project.milestones.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem', fontSize: '1.05rem' }}>Nu există milestones definite.</p>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {project.milestones.map((milestone, index) => (
                  <div key={milestone.id} style={{...styles.milestoneCard, backgroundColor: getStatusBgColor(milestone.status), borderLeftColor: getMilestoneStatus(milestone.status)}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: getMilestoneStatus(milestone.status), color: 'white', fontSize: '0.9rem', fontWeight: '700' }}>{index + 1}</span>
                        <strong style={{ fontSize: '1.1rem', color: '#1e293b' }}>{milestone.title}</strong>
                      </div>
                      <span style={{ fontWeight: '700', color: '#16a34a', fontSize: '1.2rem' }}>{milestone.amount_ron} RON</span>
                    </div>
                    {milestone.deliverable_description && <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#475569', lineHeight: '1.5' }}>{milestone.deliverable_description}</p>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: '500' }}>{milestone.percentage_of_budget ? `${milestone.percentage_of_budget}% din buget` : ''}</span>
                      <span style={{...styles.badge, backgroundColor: getMilestoneStatus(milestone.status), color: 'white', fontSize: '0.85rem'}}>{getStatusIcon(milestone.status)} {getStatusLabel(milestone.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {project.milestones && project.milestones.length > 0 && (
              <div style={styles.totalBox}>
                <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1e293b' }}>Total Buget:</span>
                <span style={{ fontWeight: '700', fontSize: '1.35rem', color: '#16a34a' }}>{project.milestones.reduce((sum, m) => sum + (parseFloat(m.amount_ron) || 0), 0)} RON</span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div>
          <h3 style={{...styles.sectionTitle, marginBottom: '1.5rem'}}>💬 Chat cu echipa</h3>
          <div style={styles.chatContainer}>
            <div style={styles.chatMessages}>
              {messages.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', fontSize: '1rem', padding: '2rem' }}>Nu există mesaje. Începe conversația!</p>
              ) : messages.map((msg, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender_id === user?.id ? 'flex-end' : 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ 
                    maxWidth: '70%', 
                    padding: '1rem 1.25rem', 
                    backgroundColor: msg.sender_id === user?.id ? '#3b82f6' : 'white', 
                    color: msg.sender_id === user?.id ? 'white' : '#1e293b', 
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: msg.sender_id === user?.id ? 'none' : '1px solid #e2e8f0',
                  }}>
                    {msg.content}
                  </div>
                  <small style={{ color: '#94a3b8', marginTop: '0.4rem', fontSize: '0.8rem' }}>{formatMessageDate(msg.created_at)}</small>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} style={styles.chatInput}>
              <input 
                type="text" 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                placeholder="Scrie un mesaj..." 
                style={styles.chatInputField}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button type="submit" style={{...styles.button, ...styles.buttonPrimary, padding: '0.875rem 1.75rem'}}>Trimite</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'contracts' && (
        <div>
          <h2 style={{...styles.sectionTitle, marginBottom: '1.5rem'}}>📜 Contracte și Workflow</h2>
          
          {!workflowStatus && <p style={{color: '#ef4444'}}>Se încarcă contractele...</p>}
          <div style={{...styles.card, marginBottom: '2rem', backgroundColor: '#f8fafc'}}>
            <h3 style={{...styles.sectionTitle, marginBottom: '1.25rem', fontSize: '1.1rem'}}>📋 Progresul Proiectului</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%', 
                  backgroundColor: workflowStatus?.projectContract?.status === 'accepted' ? '#22c55e' : '#e2e8f0', 
                  color: workflowStatus?.projectContract?.status === 'accepted' ? 'white' : '#94a3b8', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 0.5rem',
                  fontWeight: '700',
                  fontSize: '1.25rem'
                }}>
                  {workflowStatus?.projectContract?.status === 'accepted' ? '✓' : '1'}
                </div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>Contract Principal</div>
              </div>
              <div style={{ flex: 0.5, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', height: '3px', backgroundColor: workflowStatus?.projectContract?.status === 'accepted' ? '#22c55e' : '#e2e8f0', borderRadius: '2px' }}></div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%', 
                  backgroundColor: workflowStatus?.milestones?.every(m => m.status === 'approved') ? '#22c55e' : '#e2e8f0', 
                  color: workflowStatus?.milestones?.every(m => m.status === 'approved') ? 'white' : '#94a3b8', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 0.5rem',
                  fontWeight: '700',
                  fontSize: '1.25rem'
                }}>2</div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>Milestones</div>
              </div>
              <div style={{ flex: 0.5, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', height: '3px', backgroundColor: workflowStatus?.milestones?.every(m => m.status === 'approved') ? '#22c55e' : '#e2e8f0', borderRadius: '2px' }}></div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%', 
                  backgroundColor: workflowStatus?.finalContract?.status === 'accepted' ? '#22c55e' : '#e2e8f0', 
                  color: workflowStatus?.finalContract?.status === 'accepted' ? 'white' : '#94a3b8', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 0.5rem',
                  fontWeight: '700',
                  fontSize: '1.25rem'
                }}>3</div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>Finalizare</div>
              </div>
            </div>
          </div>

          <div style={{...styles.card, marginBottom: '2rem'}}>
            <h3 style={{...styles.sectionTitle, marginBottom: '1.25rem', fontSize: '1.1rem'}}>📄 Contract Principal</h3>
            {!workflowStatus?.projectContract ? (
              <div style={{ padding: '1.5rem', backgroundColor: '#fefce8', borderRadius: '12px', border: '1px solid #fef08a' }}>
                <p style={{ margin: '0 0 1rem 0', color: '#854d0e', fontSize: '1rem' }}>Pentru a începe colaborarea, trebuie creat și semnat contractul principal.</p>
                {user && (isParty1 || isParty2) && (
                  <div style={{display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap'}}>
                    <button onClick={async () => { 
                      try { 
                        await contractAPI.createProjectContract({ project_id: projectId }); 
                        setSuccess('Contract creat!'); 
                        fetchContracts(); 
                      } catch (err) { setError(err.response?.data?.error || 'Eroare la creare contract'); } 
                    }} style={{...styles.button, ...styles.buttonPrimary, padding: '0.875rem 1.5rem'}}>📝 Creează Contract</button>
                  </div>
                )}
              </div>
            ) : workflowStatus.projectContract.status !== 'accepted' ? (
              <div style={{ padding: '1.5rem', backgroundColor: '#fefce8', borderRadius: '12px', border: '1px solid #fef08a' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#854d0e' }}><strong>Status:</strong> {workflowStatus.projectContract.status === 'pending' ? 'În așteptare semnături' : workflowStatus.projectContract.status}</p>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#854d0e' }}><strong>Prestator:</strong> {workflowStatus.projectContract.party1_accepted ? '✓ Semnat' : '⏳ Nesemnat'}</p>
                  <p style={{ margin: 0, color: '#854d0e' }}><strong>Beneficiar:</strong> {workflowStatus.projectContract.party2_accepted ? '✓ Semnat' : '⏳ Nesemnat'}</p>
                </div>
                {user && (isParty1 || isParty2) && (
                  <div style={{display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap'}}>
                    <button onClick={() => {
                      const contract = contracts.find(c => c.id === workflowStatus.projectContract.id || c.contract_type === 'project');
                      if (contract) setSelectedContract(contract);
                      else if (workflowStatus.projectContract.id) {
                        contractAPI.getContract(workflowStatus.projectContract.id).then(res => {
                          if (res.data.contract) setSelectedContract(res.data.contract);
                        });
                      }
                    }} style={{...styles.button, backgroundColor: '#6366f1', padding: '0.875rem 1.5rem'}}>👁️ Vezi Contract</button>
                    {(user.id === (project.expert_id || project.company_id) ? !workflowStatus.projectContract.party1_accepted : !workflowStatus.projectContract.party2_accepted) && (
                      <button onClick={async () => { 
                        try { 
                          await contractAPI.acceptContract(workflowStatus.projectContract.id); 
                          setSuccess('Ai semnat contractul!'); 
                          fetchContracts(); 
                        } catch (err) { setError(err.response?.data?.error || 'Eroare la semnare'); } 
                      }} style={{...styles.button, ...styles.buttonPrimary, padding: '0.875rem 1.5rem'}}>✍️ Semnează Contract</button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '1.25rem', backgroundColor: '#dcfce7', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <p style={{ margin: 0, color: '#16a34a', fontWeight: '600', fontSize: '1.05rem' }}>✅ Contract semnat și activ!</p>
              </div>
            )}
          </div>

          {workflowStatus?.projectContract && workflowStatus.projectContract.status === 'accepted' && project.milestones && project.milestones.length > 0 && (
            <div style={{...styles.card, marginBottom: '2rem'}}>
              <h3 style={{...styles.sectionTitle, marginBottom: '1rem'}}>🎯 Milestones - Execuție și Finalizare</h3>
              <p style={{ marginBottom: '1.5rem', color: '#64748b', fontSize: '1rem' }}>1. Semnare pentru începere → 2. Prestatorul încarcă materiale → 3. Beneficiarul aprobă și eliberează banii</p>
              {project.milestones.map((milestone, index) => {
                const m = workflowStatus?.milestones?.find(ms => ms.id === milestone.id) || { status: 'pending', party1_approved: false, party2_approved: false };
                const isPendingStart = m.status === 'pending';
                const isInProgress = m.status === 'in_progress';
                const isDelivered = m.status === 'delivered';
                const isApproved = m.status === 'approved';
                const needsBothSignaturesStart = m.status === 'pending' && (!m.party1_approved || !m.party2_approved);
                const prevApproved = index === 0 || (workflowStatus?.milestones?.[index-1]?.status === 'approved');
                const canSignStart = needsBothSignaturesStart && prevApproved;
                // Prestator = company_id sau expert_id (cel asignat), Beneficiar = client_id (cel care a creat task-ul)
                const isPrestator = user?.id === (project.company_id || project.expert_id);
                const isBeneficiar = user?.id === project.client_id;
                const hasUserSignedStart = isPrestator ? m.party1_approved : (isBeneficiar ? m.party2_approved : false);
                
                return (
                  <div key={milestone.id} style={{ padding: '1.5rem', backgroundColor: isApproved ? '#dcfce7' : isDelivered ? '#eff6ff' : isInProgress ? '#fefce8' : '#f8fafc', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid', borderColor: isApproved ? '#bbf7d0' : isDelivered ? '#bfdbfe' : isInProgress ? '#fef08a' : '#e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1e293b' }}>Milestone {index + 1}: {milestone.title}</div>
                      <span style={{ padding: '0.4rem 0.85rem', backgroundColor: isApproved ? '#22c55e' : isDelivered ? '#0ea5e9' : isInProgress ? '#eab308' : '#94a3b8', color: 'white', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                        {isApproved ? '✓ Aprobat' : isDelivered ? '📤 Livrat' : isInProgress ? '🔄 În Lucru' : needsBothSignaturesStart ? '⏳ Nesemnat' : '⏳ Nesemnat'}
                      </span>
                    </div>
                    <div style={{ fontSize: '1rem', color: '#475569', marginBottom: '1rem' }}>
                      <p style={{ margin: '0 0 0.5rem 0' }}><strong>Suma:</strong> <span style={{ color: '#16a34a', fontWeight: '700' }}>{milestone.amount_ron} RON</span> ({milestone.percentage_of_budget}%)</p>
                      {milestone.deliverable_description && <p style={{ margin: 0 }}><strong>Descriere:</strong> {milestone.deliverable_description}</p>}
                    </div>
                    
                    {needsBothSignaturesStart && (
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1rem', fontSize: '0.9rem', padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px' }}>
                        <div style={{ color: '#475569' }}><strong>Începere - Prestator:</strong> {m.party1_approved ? '✓ Semnat' : '⏳ Nesemnat'}</div>
                        <div style={{ color: '#475569' }}><strong>Începere - Beneficiar:</strong> {m.party2_approved ? '✓ Semnat' : '⏳ Nesemnat'}</div>
                      </div>
                    )}

                    {canSignStart && !hasUserSignedStart && user && (
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                        <button onClick={() => setSelectedAnnex(milestone)} style={{...styles.button, backgroundColor: '#8b5cf6', padding: '0.75rem 1.25rem'}}>📋 Vezi Anexă</button>
                        <button onClick={() => setSigningMilestone({ id: milestone.id, title: milestone.title })} style={{...styles.button, ...styles.buttonPrimary, padding: '0.75rem 1.25rem'}}>✍️ Semnează Începere</button>
                      </div>
                    )}

                    {!canSignStart && user && (isParty1 || isParty2) && (
                      <div style={{ marginTop: '1rem' }}>
                        <button onClick={() => setSelectedAnnex(milestone)} style={{...styles.button, backgroundColor: '#8b5cf6', padding: '0.75rem 1.25rem'}}>📋 Vezi Anexă</button>
                      </div>
                    )}

                    {isInProgress && isParty1 && !isDelivered && (
                      <div style={{ marginTop: '1.25rem', padding: '1.25rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#1e293b', fontSize: '1rem' }}>📤 Încarcă Materialele Livrabile</p>
                        <input 
                          type="text" 
                          placeholder="Link către materiale (Google Drive, Dropbox, etc.)" 
                          id={`deliverable-${milestone.id}`}
                          style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '10px', border: '2px solid #e2e8f0', marginBottom: '0.75rem', fontSize: '1rem', outline: 'none' }}
                        />
                        <button onClick={async () => { 
                          const link = document.getElementById(`deliverable-${milestone.id}`).value;
                          if (!link) { setError('Introdu un link'); return; }
                          try { 
                            await contractAPI.deliverMilestone({ project_id: projectId, milestone_id: milestone.id, deliverable_url: link }); 
                            setSuccess('Materiale încărcate! Așteaptă aprobarea beneficiarului.'); 
                            fetchContracts(); 
                          } catch (err) { setError(err.response?.data?.error || 'Eroare'); } 
                        }} style={{...styles.button, ...styles.buttonPrimary, padding: '0.75rem 1.25rem', backgroundColor: '#0891b2'}}>📤 Încarcă Materiale</button>
                      </div>
                    )}

                    {isDelivered && (
                      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '10px', fontSize: '0.95rem', border: '1px solid #bfdbfe' }}>
                        📤 Materiale încărcate, în așteptare pentru aprobare
                        {m.deliverable_file_url && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <strong>Link materiale:</strong> <a href={m.deliverable_file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>{m.deliverable_file_url}</a>
                          </div>
                        )}
                      </div>
                    )}

                    {isDelivered && isParty2 && !isApproved && (
                      <div style={{ marginTop: '1rem' }}>
                        <button onClick={async () => { 
                          try { 
                            await contractAPI.approveMilestone({ project_id: projectId, milestone_id: milestone.id }); 
                            setSuccess('Milestone aprobat! Banii au fost eliberați către prestator.'); 
                            fetchContracts(); 
                          } catch (err) { setError(err.response?.data?.error || 'Eroare'); } 
                        }} style={{...styles.button, ...styles.buttonSuccess, padding: '0.75rem 1.25rem'}}>✅ Aprobă și Eliberează Bani</button>
                      </div>
                    )}

                    {isApproved && (
                      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '10px', fontSize: '0.95rem', border: '1px solid #bbf7d0' }}>
                        ✅ Aprobat - Banii au fost eliberați
                      </div>
                    )}

                    {!canSignStart && !hasUserSignedStart && !isPendingStart && index > 0 && (
                      <p style={{ marginTop: '0.75rem', color: '#dc2626', fontSize: '0.9rem', fontWeight: '500' }}>⏳ Trebuie să semnați milestone-ul anterior mai întâi</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {workflowStatus?.projectContract?.status === 'accepted' && workflowStatus?.milestones?.every(m => m.status === 'approved') && (
            <div style={{...styles.card, marginBottom: '2rem'}}>
              <h3 style={{...styles.sectionTitle, marginBottom: '1.25rem'}}>🏁 Finalizare Proiect</h3>
              <div style={{ padding: '1.5rem', backgroundColor: '#dcfce7', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <p style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '600', color: '#166534' }}>🎉 Toate milestone-urile sunt finalizate!</p>
                {!workflowStatus?.finalContract ? (
                  <button onClick={async () => { try { await contractAPI.createFinalContract({ project_id: projectId }); setSuccess('Contract de finalizare creat!'); fetchContracts(); } catch (err) { setError(err.response?.data?.error || 'Eroare'); } }} style={{...styles.button, ...styles.buttonSuccess, padding: '0.875rem 1.5rem'}}>📝 Creează Contract de Finalizare</button>
                ) : workflowStatus.finalContract.status !== 'accepted' ? (
                  <div>
                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                      <div style={{ color: '#166534' }}><strong>Prestator:</strong> {workflowStatus.finalContract.party1_accepted ? '✓ Semnat' : '⏳ Nesemnat'}</div>
                      <div style={{ color: '#166534' }}><strong>Beneficiar:</strong> {workflowStatus.finalContract.party2_accepted ? '✓ Semnat' : '⏳ Nesemnat'}</div>
                    </div>
                    {user && (isParty1 || isParty2) && (
                      <button onClick={async () => { try { await contractAPI.acceptContract(workflowStatus.finalContract.id); setSuccess('Ai semnat contractul de finalizare!'); fetchContracts(); } catch (err) { setError(err.response?.data?.error || 'Eroare'); } }} style={{...styles.button, ...styles.buttonPrimary, padding: '0.875rem 1.5rem'}}>✍️ Semnează Contract de Finalizare</button>
                    )}
                  </div>
                ) : <div style={{ padding: '1.25rem', backgroundColor: '#22c55e', color: 'white', borderRadius: '10px', fontWeight: '600', fontSize: '1.05rem' }}>✅ Proiect Complet Finalizat!</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {showEditProjectModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>✏️ Editează Task</h2>
            
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '1rem', color: '#1e293b', fontSize: '1.1rem', fontWeight: '600' }}>📝 Date Proiect</h4>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={styles.label}>Titlu</label>
                <input type="text" value={editFormData.title} onChange={(e) => setEditFormData({...editFormData, title: e.target.value})} style={styles.input} />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={styles.label}>Descriere</label>
                <textarea value={editFormData.description} onChange={(e) => setEditFormData({...editFormData, description: e.target.value})} rows={4} style={styles.textarea} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Buget (RON)</label>
                  <input type="number" value={editFormData.budget_ron} onChange={(e) => handleBudgetChange(e.target.value)} style={styles.input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Termen (zile)</label>
                  <input type="number" value={editFormData.timeline_days} onChange={(e) => setEditFormData({...editFormData, timeline_days: e.target.value})} style={styles.input} />
                </div>
              </div>
            </div>

            {editFormData.milestones && editFormData.milestones.length > 0 && (() => {
              const { totalAmount, totalPercentage } = calculateTotals(editFormData.milestones, editFormData.budget_ron);
              const budget = parseFloat(editFormData.budget_ron) || 0;
              const isOverBudget = totalAmount > budget;
              const isOverPercentage = totalPercentage > 100;
              
              return (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: '#1e293b', fontSize: '1.1rem', fontWeight: '600' }}>🎯 Milestones</h4>
                  {editFormData.milestones.map((milestone, index) => (
                    <div key={milestone.id || index} style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>Milestone {index + 1}</div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', marginBottom: '0.4rem', fontWeight: '500' }}>Titlu</label>
                        <input type="text" value={milestone.title || ''} onChange={(e) => {
                          const newMilestones = [...editFormData.milestones];
                          newMilestones[index] = { ...newMilestones[index], title: e.target.value };
                          setEditFormData({...editFormData, milestones: newMilestones});
                        }} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '1rem', outline: 'none' }} />
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', marginBottom: '0.4rem', fontWeight: '500' }}>Descriere</label>
                        <textarea value={milestone.deliverable_description || ''} onChange={(e) => {
                          const newMilestones = [...editFormData.milestones];
                          newMilestones[index] = { ...newMilestones[index], deliverable_description: e.target.value };
                          setEditFormData({...editFormData, milestones: newMilestones});
                        }} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '1rem', outline: 'none', resize: 'vertical' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', marginBottom: '0.4rem', fontWeight: '500' }}>Suma (RON)</label>
                          <input type="number" value={milestone.amount_ron || ''} onChange={(e) => handleMilestoneAmountChange(index, e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '1rem', outline: 'none' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', marginBottom: '0.4rem', fontWeight: '500' }}>Procent (%)</label>
                          <input type="number" value={milestone.percentage_of_budget || ''} onChange={(e) => handleMilestonePercentageChange(index, e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '1rem', outline: 'none' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '1rem', backgroundColor: isOverBudget || isOverPercentage ? '#fee2e2' : '#dcfce7', borderRadius: '10px', marginTop: '0.5rem', border: '1px solid', borderColor: isOverBudget || isOverPercentage ? '#fecaca' : '#bbf7d0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#1e293b' }}>Total Sume:</span>
                      <span style={{ color: isOverBudget ? '#dc2626' : '#16a34a', fontSize: '1.1rem' }}>{totalAmount.toFixed(2)} RON</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                      <span style={{ color: '#1e293b' }}>Total Procent:</span>
                      <span style={{ color: isOverPercentage ? '#dc2626' : '#16a34a', fontSize: '1.1rem' }}>{totalPercentage.toFixed(2)}%</span>
                    </div>
                    {isOverBudget && <p style={{ margin: '0.75rem 0 0 0', color: '#dc2626', fontSize: '0.9rem', fontWeight: '500' }}>⚠️ Sumele depășesc bugetul!</p>}
                    {isOverPercentage && <p style={{ margin: '0.75rem 0 0 0', color: '#dc2626', fontSize: '0.9rem', fontWeight: '500' }}>⚠️ Procentele depășesc 100%!</p>}
                  </div>
                </div>
              );
            })()}

            <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid #bfdbfe' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#1e40af', fontWeight: '500' }}>
                💡 Modificările vor fi trimise pentru aprobarea celeilalte părți.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEditProjectModal(false)} style={{...styles.button, ...styles.buttonSecondary, padding: '0.875rem 1.5rem'}}>Anulează</button>
              <button onClick={async () => {
                try {
                  const totalPercentage = (editFormData.milestones || []).reduce((sum, m) => sum + (parseFloat(m.percentage_of_budget) || 0), 0);
                  const totalAmount = (editFormData.milestones || []).reduce((sum, m) => sum + (parseFloat(m.amount_ron) || 0), 0);
                  const budget = parseFloat(editFormData.budget_ron) || 0;
                  
                  if (totalPercentage > 100) {
                    setError('Suma procentelor depășește 100%');
                    return;
                  }
                  if (totalAmount > budget && budget > 0) {
                    setError('Suma milestone-urilor depășește bugetul proiectului');
                    return;
                  }

                  if (editFormData.title !== project.title) {
                    await modificationAPI.proposeProjectModification({ project_id: projectId, field_name: 'title', old_value: project.title, new_value: editFormData.title });
                  }
                  if (editFormData.description !== project.description) {
                    await modificationAPI.proposeProjectModification({ project_id: projectId, field_name: 'description', old_value: project.description, new_value: editFormData.description });
                  }
                  if (String(editFormData.budget_ron) !== String(project.budget_ron)) {
                    await modificationAPI.proposeProjectModification({ project_id: projectId, field_name: 'budget_ron', old_value: String(project.budget_ron), new_value: String(editFormData.budget_ron) });
                  }
                  if (String(editFormData.timeline_days) !== String(project.timeline_days)) {
                    await modificationAPI.proposeProjectModification({ project_id: projectId, field_name: 'timeline_days', old_value: String(project.timeline_days), new_value: String(editFormData.timeline_days) });
                  }
                  for (const m of editFormData.milestones || []) {
                    const orig = project.milestones?.find(om => om.id === m.id);
                    if (orig && m.id) {
                      if (m.title !== orig.title) {
                        await modificationAPI.proposeMilestoneModification({ project_id: projectId, milestone_id: m.id, field_name: 'title', old_value: orig.title, new_value: m.title });
                      }
                      if (m.deliverable_description !== orig.deliverable_description) {
                        await modificationAPI.proposeMilestoneModification({ project_id: projectId, milestone_id: m.id, field_name: 'deliverable_description', old_value: orig.deliverable_description || '', new_value: m.deliverable_description });
                      }
                      if (String(m.amount_ron) !== String(orig.amount_ron)) {
                        await modificationAPI.proposeMilestoneModification({ project_id: projectId, milestone_id: m.id, field_name: 'amount_ron', old_value: String(orig.amount_ron), new_value: String(m.amount_ron) });
                      }
                      if (String(m.percentage_of_budget) !== String(orig.percentage_of_budget)) {
                        await modificationAPI.proposeMilestoneModification({ project_id: projectId, milestone_id: m.id, field_name: 'percentage_of_budget', old_value: String(orig.percentage_of_budget), new_value: String(m.percentage_of_budget) });
                      }
                    }
                  }
                  setSuccess('Modificări propuse! Așteaptă aprobarea celeilalte părți.');
                  setShowEditProjectModal(false);
                  fetchModifications();
                } catch (err) {
                  setError(err.response?.data?.error || 'Eroare la propunerea modificărilor');
                }
              }} style={{...styles.button, ...styles.buttonPrimary, padding: '0.875rem 1.5rem'}}>💾 Propune Modificări</button>
            </div>
          </div>
        </div>
      )}

      {selectedContract && (
        <ContractModal 
          contract={selectedContract}
          project={project}
          user={user}
          onClose={() => setSelectedContract(null)}
          onSign={async (signature) => {
            setSigningContract(true);
            try {
              await contractAPI.acceptContract(selectedContract.id, { signature });
              setSuccess('Contract semnat cu succes!');
              setSelectedContract(null);
              fetchContracts();
            } catch (err) {
              setError(err.response?.data?.error || 'Eroare la semnare');
            } finally {
              setSigningContract(false);
            }
          }}
          loading={signingContract}
        />
      )}

      {signingMilestone && (
        <SignatureModal
          onSave={async (signature) => {
            try {
              await contractAPI.signMilestoneStart({ 
                project_id: projectId, 
                milestone_id: signingMilestone.id,
                signature 
              });
              setSuccess('Ai semnat pentru începerea milestone-ului!');
              fetchContracts();
            } catch (err) {
              setError(err.response?.data?.error || 'Eroare la semnare');
            } finally {
              setSigningMilestone(null);
            }
          }}
          onCancel={() => setSigningMilestone(null)}
        />
      )}

      {selectedAnnex && (() => {
        const ms = workflowStatus?.milestones?.find(m => m.id === selectedAnnex.id) || {};
        const isUserPrestator = user?.id === (project.company_id || project.expert_id);
        return (
        <AnnexModal
          milestone={selectedAnnex}
          project={project}
          party1Name={project.expert_name}
          party2Name={project.client_name}
          party1Company={project.company_name || project.expert_company}
          party2Company={project.client_company}
          onClose={() => setSelectedAnnex(null)}
          onSign={() => {
            setSelectedAnnex(null);
            setSigningMilestone({ id: selectedAnnex.id, title: selectedAnnex.title });
          }}
          loading={signingMilestone !== null}
          userHasSigned={isUserPrestator ? ms.party1_approved : ms.party2_approved}
          otherHasSigned={isUserPrestator ? ms.party2_approved : ms.party1_approved}
          isParty={isParty1 || isParty2}
          isPrestator={isUserPrestator}
        />
        );
      })()}
    </div>
  );
}

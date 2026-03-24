import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import axios from 'axios';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [trustStats, setTrustStats] = useState(null);
  const [trustProfiles, setTrustProfiles] = useState([]);
  const [referralStats, setReferralStats] = useState(null);
  const [referralCodes, setReferralCodes] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [verificationCalls, setVerificationCalls] = useState([]);
  const [expertPostedTasks, setExpertPostedTasks] = useState([]);
  const [clientPostedTasks, setClientPostedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTrustLevel, setSelectedTrustLevel] = useState(5);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionForm, setCommissionForm] = useState({ projectId: null, service_type: 'matching', commission_percent: 10, assignment_type: null });
  const [projectPage, setProjectPage] = useState(1);
  const PROJECTS_PER_PAGE = 20;

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const loadDashboardData = async () => {
    try {
      const [statsRes, allUsersRes, allProjRes, pendingRes, verCallRes, expertPostedRes, clientPostedRes, trustRes, referralRes, codesRes] = await Promise.all([
        adminAPI.getAdminDashboard().catch(() => ({ data: { stats: {} } })),
        adminAPI.getAllUsers().catch(() => ({ data: { users: [] } })),
        adminAPI.getAllProjects().catch(() => ({ data: { projects: [] } })),
        adminAPI.getPendingApprovalProjects().catch(() => ({ data: { projects: [] } })),
        axios.get('http://localhost:5000/api/verification-calls', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).catch(() => ({ data: { data: [] } })),
        adminAPI.getPendingExpertPostedTasks().catch(() => ({ data: { data: [] } })),
        adminAPI.getPendingClientPostedTasks().catch(() => ({ data: { data: [] } })),
        axios.get('http://localhost:5000/api/trust-profiles/admin/all', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).catch(() => ({ data: { profiles: [] } })),
        axios.get('http://localhost:5000/api/referrals/admin/stats', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).catch(() => ({})),
        axios.get('http://localhost:5000/api/referrals/admin/all-codes', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).catch(() => ({ data: { codes: [] } }))
      ]);

      // Set referral codes by level
      const codesByLevel = { 1: null, 2: null, 3: null, 4: null, 5: null };
      (codesRes.data.codes || []).forEach(code => {
        if (code.trust_level_bonus && codesByLevel[code.trust_level_bonus] === null) {
          codesByLevel[code.trust_level_bonus] = code.code;
        }
      });
      setReferralCodes(codesByLevel);

      setStats(statsRes.data.stats || {});
      setAllUsers(allUsersRes.data.users || []);
      // Combine all projects with pending approval projects (PM tasks)
      const allProjectsList = [...(allProjRes.data.projects || []), ...(pendingRes.data.projects || [])];
      setAllProjects(allProjectsList);
      setVerificationCalls(verCallRes.data?.data || []);
      setExpertPostedTasks(expertPostedRes.data?.data || []);
      setClientPostedTasks(clientPostedRes.data?.data || []);
      
      // Set trust stats
      const profiles = trustRes.data.profiles || [];
      setTrustProfiles(profiles);
      
      const trustByLevel = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      profiles.forEach(p => {
        if (p.trust_level && trustByLevel[p.trust_level] !== undefined) {
          trustByLevel[p.trust_level]++;
        }
      });
      setTrustStats({
        total: profiles.length,
        profiles: profiles,
        ...trustByLevel
      });
      
      // Set referral stats
      setReferralStats(referralRes.data || { total: 0, completed: 0 });
      
      setLoading(false);
      
      // Debug: log pending projects
      const pending = (allProjRes.data.projects || []).filter(p => p.status === 'pending_admin_approval');
      console.log('[Admin] Pending projects:', pending.length);
      console.log('[Admin] Pending titles:', pending.map(p => ({ title: p.title, assignment_type: p.assignment_type })));
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      await adminAPI.approveUser(userId);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Ești sigur că vrei să ștergi acest utilizator?')) return;
    try {
      await adminAPI.deleteUser(userId);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Eroare la ștergerea utilizatorului');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Ești sigur că vrei să ștergi acest proiect/task?')) return;
    try {
      await adminAPI.deleteProject(projectId);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Eroare la ștergerea proiectului');
    }
  };

  const handleUpdateTrustLevel = async (userId, newLevel) => {
    if (newLevel < 1 || newLevel > 5) return;
    if (!window.confirm(`Schimbi Trust Level la ${newLevel}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/trust-profiles/admin/update-level/${userId}`,
        { trust_level: newLevel },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setRefreshKey(prev => prev + 1);
      alert(`Trust Level actualizat la ${newLevel}!`);
    } catch (error) {
      console.error('Error updating trust level:', error);
      alert('Eroare la actualizarea Trust Level');
    }
  };

  const handleCompleteCall = async (callId) => {
    try {
      await axios.put(`http://localhost:5000/api/verification-calls/${callId}/status`, 
        { status: 'completed' },
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error completing call:', error);
    }
  };

  const handleApproveProject = (project, service_type = 'matching', commission_percent = 10) => {
    console.log('[Admin] Approve project:', project.id, 'assignment_type:', project.assignment_type, 'service_type:', project.service_type);
    
    // For project_management PM tasks (pm_task), approve directly
    if (project.assignment_type === 'pm_task') {
      console.log('[Admin] PM task - approving directly');
      approveProjectDirectly(project.id, { assignment_type: 'pm_task' });
      return;
    }
    
    // For project_management without expert/company assigned, approve directly
    if (project.service_type === 'project_management' && !project.expert_id && !project.company_id) {
      console.log('[Admin] PM project without expert/company - approving directly');
      approveProjectDirectly(project.id);
      return;
    }
    
    // For task_assignment (matching), show modal to set commission but preserve service_type
    if (project.assignment_type === 'task_assignment') {
      console.log('[Admin] Task assignment - showing modal for commission');
      // Preserve the original service_type (e.g., 'project_management')
      setCommissionForm({ 
        projectId: project.id, 
        service_type: project.service_type || 'project_management', 
        commission_percent: project.commission_percent || 10,
        assignment_type: project.assignment_type
      });
      setShowCommissionModal(true);
      return;
    }

    // For regular projects, show modal
    console.log('[Admin] Regular project - showing modal');
    setCommissionForm({ projectId: project.id, service_type, commission_percent });
    setShowCommissionModal(true);
  };

  const approveProjectDirectly = async (projectId, extraData = {}) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/projects/${projectId}/approve`, 
        extraData,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      setRefreshKey(prev => prev + 1);
      alert('Proiect aprobat! Mergi la tab-ul "📋 Proiecte" pentru a-l asigna.');
    } catch (error) {
      console.error('Error approving project:', error);
      alert('Eroare la aprobarea proiectului');
    }
  };

  const handleSubmitCommission = async () => {
    try {
      await axios.post(`http://localhost:5000/api/admin/projects/${commissionForm.projectId}/approve`, 
        { 
          service_type: commissionForm.service_type, 
          commission_percent: commissionForm.commission_percent,
          assignment_type: commissionForm.assignment_type
        },
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      setShowCommissionModal(false);
      setRefreshKey(prev => prev + 1);
      alert('Proiect aprobat! Mergi la tab-ul "📋 Proiecte" pentru a-l asigna.');
    } catch (error) {
      console.error('Error approving project:', error);
      alert('Eroare la aprobarea proiectului');
    }
  };

  const handleApproveExpertPostedTask = async (taskId) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/expert-posted-tasks/${taskId}/approve`, {}, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error approving task:', error);
    }
  };

  const handleApproveClientPostedTask = async (taskId) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/client-posted-tasks/${taskId}/approve`, {}, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error approving task:', error);
    }
  };

  const handleOpenAssignModal = (project) => {
    setSelectedProject(project);
    setShowAssignModal(true);
  };

  const handleAssignUser = async (userId, action) => {
    try {
      await axios.put(`http://localhost:5000/api/projects/${selectedProject.id}/assign`, 
        { expert_id: action === 'assign_expert' ? userId : null, company_id: action === 'assign_company' ? userId : null, action },
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      setShowAssignModal(false);
      setSelectedProject(null);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error assigning user:', error);
    }
  };

  const handleUnassignUser = async () => {
    try {
      await axios.put(`http://localhost:5000/api/projects/${selectedProject.id}/assign`, 
        { action: 'unassign' },
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      setShowAssignModal(false);
      setSelectedProject(null);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error unassigning user:', error);
    }
  };

  const experts = allUsers.filter(u => u.role === 'expert');
  const companies = allUsers.filter(u => u.role === 'company');

  const hasCompletedCall = (userId) => {
    return verificationCalls.some(c => c.user_id === userId && c.status === 'completed');
  };

  const getProjectStatusLabel = (status) => {
    const labels = { pending_assignment: 'În așteptare', approved: 'Aprobat', assigned: 'Asignat', in_progress: 'În progres', delivered: 'Livrat', completed: 'Finalizat', disputed: 'Dispută' };
    return labels[status] || status;
  };

  const getProjectStatusColor = (status) => {
    const colors = { pending_assignment: '#f59e0b', approved: '#10b981', assigned: '#3b82f6', in_progress: '#06b6d4', delivered: '#8b5cf6', completed: '#22c55e', disputed: '#ef4444' };
    return colors[status] || '#6b7280';
  };

  const styles = {
    container: { padding: '2rem', backgroundColor: '#f3f4f6', minHeight: '100vh' },
    card: { backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1rem' },
    cardHeader: { marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' },
    cardTitle: { margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' },
    tab: { padding: '0.625rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', border: 'none', backgroundColor: 'transparent', color: '#6b7280', transition: 'all 0.2s' },
    tabActive: { backgroundColor: '#2563eb', color: 'white' },
    table: { width: '100%', borderCollapse: 'collapse' },
    tableHeaderRow: { borderBottom: '2px solid #e5e7eb' },
    tableHeader: { textAlign: 'left', padding: '0.75rem', fontWeight: '600', color: '#6b7280', fontSize: '0.875rem' },
    tableRow: { borderBottom: '1px solid #f3f4f6' },
    tableCell: { padding: '1rem', fontSize: '0.9375rem', color: '#374151' },
    badge: { display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500' },
    button: { padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', border: 'none', transition: 'all 0.2s ease' },
    buttonSuccess: { backgroundColor: '#10b981', color: 'white' },
    buttonPrimary: { backgroundColor: '#2563eb', color: 'white' },
    buttonDanger: { backgroundColor: '#dc2626', color: 'white' }
  };

  // Modal de asignare
  if (showAssignModal && selectedProject) {
    return (
      <div style={styles.container}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <button onClick={() => { setShowAssignModal(false); setSelectedProject(null); }} style={{ ...styles.button, marginBottom: '1rem', backgroundColor: '#6b7280', color: 'white' }}>← Înapoi</button>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Asignează Utilizator la Proiect</h3>
              <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280' }}>{selectedProject.title}</p>
            </div>
            {selectedProject.expert_id && <div style={{ padding: '1rem', backgroundColor: '#dbeafe', borderRadius: '8px', marginBottom: '1rem' }}><strong>Expert actual:</strong> {selectedProject.expert_name}</div>}
            {selectedProject.company_id && <div style={{ padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '8px', marginBottom: '1rem' }}><strong>Companie actuală:</strong> {selectedProject.company_name}</div>}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>👨‍💼 Asignează Expert</h4>
              <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {experts.filter(e => e.kyc_status === 'verified').map(expert => (
                  <div key={expert.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <div><strong>{expert.name}</strong><p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>{expert.expertise}</p></div>
                    <button onClick={() => handleAssignUser(expert.id, 'assign_expert')} style={{ ...styles.button, ...styles.buttonSuccess, fontSize: '0.8rem' }}>Asignează</button>
                  </div>
                ))}
                {experts.filter(e => e.kyc_status === 'verified').length === 0 && <p style={{ color: '#6b7280' }}>Nu există experți verificați</p>}
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>🏢 Asignează Companie</h4>
              <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {companies.map(company => (
                  <div key={company.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <div><strong>{company.name}</strong><p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>{company.company}</p></div>
                    <button onClick={() => handleAssignUser(company.id, 'assign_company')} style={{ ...styles.button, backgroundColor: '#f59e0b', color: 'white', fontSize: '0.8rem' }}>Asignează</button>
                  </div>
                ))}
              </div>
            </div>
            {(selectedProject.expert_id || selectedProject.company_id) && <button onClick={handleUnassignUser} style={{ ...styles.button, backgroundColor: '#dc2626', color: 'white', width: '100%' }}>❌ Anulează Asignarea</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#1f2937' }}>Admin Dashboard</h1>
        <button 
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            navigate('/login');
          }}
          style={{ ...styles.button, backgroundColor: '#dc2626', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          🚪 Logout
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => setActiveTab('stats')} style={activeTab === 'stats' ? {...styles.tab, ...styles.tabActive} : styles.tab}>📊 Statistici</button>
        <button onClick={() => setActiveTab('trust')} style={activeTab === 'trust' ? {...styles.tab, ...styles.tabActive} : styles.tab}>⭐ Trust System</button>
        <button onClick={() => setActiveTab('users')} style={activeTab === 'users' ? {...styles.tab, ...styles.tabActive} : styles.tab}>👥 Utilizatori</button>
        <button onClick={() => setActiveTab('calls')} style={activeTab === 'calls' ? {...styles.tab, ...styles.tabActive} : styles.tab}>📞 Apeluri Verificare</button>
        <button onClick={() => setActiveTab('projects')} style={activeTab === 'projects' ? {...styles.tab, ...styles.tabActive} : styles.tab}>📋 Proiecte</button>
        <button onClick={() => setActiveTab('tasks')} style={activeTab === 'tasks' ? {...styles.tab, ...styles.tabActive} : styles.tab}>✅ Task-uri</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '3rem' }}>Se încarcă...</div> : null}

      {activeTab === 'stats' && stats && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div style={styles.card}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.total_users || 0}</div><div style={{ color: '#6b7280' }}>Total Utilizatori</div></div>
            <div style={styles.card}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👨‍💼</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.total_experts || 0}</div><div style={{ color: '#6b7280' }}>Experți</div></div>
            <div style={styles.card}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏢</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.total_companies || 0}</div><div style={{ color: '#6b7280' }}>Companii</div></div>
            <div style={styles.card}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.total_projects || 0}</div><div style={{ color: '#6b7280' }}>Proiecte</div></div>
          </div>
          
          {/* Trust Level Stats */}
          {trustStats && (
            <div style={styles.card}>
              <div style={{...styles.cardHeader, marginBottom: '1rem'}}>
                <h3 style={styles.cardTitle}>⭐ Sistem Trust Level</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#166534' }}>{trustStats.total || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Profile</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#991b1b' }}>{trustStats[1] || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Nivel 1</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fed7aa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#9a3412' }}>{trustStats[2] || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Nivel 2</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#92400e' }}>{trustStats[3] || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Nivel 3</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#dbeafe', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af' }}>{trustStats[4] || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Nivel 4</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#166534' }}>{trustStats[5] || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Nivel 5</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Referral Stats */}
          {referralStats && (
            <div style={styles.card}>
              <div style={{...styles.cardHeader, marginBottom: '1rem'}}>
                <h3 style={styles.cardTitle}>🎁 Sistem de Referire</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0369a1' }}>{referralStats.total || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Referiri</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#92400e' }}>{referralStats.registered || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Înregistrate</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#dbeafe', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af' }}>{referralStats.verified || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Verificate</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#166534' }}>{referralStats.completed || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Completate</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'trust' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>⭐ Sistem Trust Level</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', padding: '1rem' }}>
              {[1,2,3,4,5].map(level => (
                <div key={level} style={{ 
                  padding: '1.5rem', 
                  borderRadius: '12px', 
                  backgroundColor: level === 5 ? '#dcfce7' : level === 4 ? '#dbeafe' : level === 3 ? '#fef3c7' : level === 2 ? '#fed7aa' : '#fee2e2',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: level === 5 ? '#166534' : level === 4 ? '#1e40af' : level === 3 ? '#92400e' : level === 2 ? '#9a3412' : '#991b1b' }}>
                    {trustStats?.[level] || 0}
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', marginTop: '0.5rem' }}>
                    {level === 5 ? '⭐⭐⭐⭐⭐ Expert Verificat' : 
                     level === 4 ? '⭐⭐⭐⭐ Foarte de Încredere' : 
                     level === 3 ? '⭐⭐⭐ Încredere Medie' : 
                     level === 2 ? '⭐⭐ Încredere Minimă' : '⭐ Încredere Scăzută'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>🎁 Generator Link-uri Trust Level</h3>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <select 
                  value={selectedTrustLevel}
                  onChange={(e) => setSelectedTrustLevel(parseInt(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }}
                >
                  <option value={5}>Nivel 5 - Expert Verificat</option>
                  <option value={4}>Nivel 4 - Foarte de Încredere</option>
                  <option value={3}>Nivel 3 - Încredere Medie</option>
                  <option value={2}>Nivel 2 - Încredere Minimă</option>
                  <option value={1}>Nivel 1 - Încredere Scăzută</option>
                </select>
                
                <button 
                  onClick={async () => {
                    const token = localStorage.getItem('token');
                    
                    try {
                      const response = await axios.post(
                        'http://localhost:5000/api/referrals/admin/generate-vip-code',
                        { trust_level: selectedTrustLevel },
                        { headers: { 'Authorization': `Bearer ${token}` } }
                      );
                      
                      const link = `http://localhost:3000/register?ref=${response.data.code}`;
                      await navigator.clipboard.writeText(link);
                      alert(`Link generat și copiat!\n\nLink: ${link}\nNivel: ${response.data.trust_level}`);
                      setRefreshKey(prev => prev + 1);
                    } catch (err) {
                      console.error('Error generating link:', err);
                      alert('Eroare la generarea link-ului: ' + (err.response?.data?.error || err.message));
                    }
                  }}
                  style={{ 
                    padding: '0.6rem 1.2rem', 
                    backgroundColor: '#10b981', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  ✨ Generează Cod Nou
                </button>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>📋 Toți Utilizatorii Trust</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeader}>Nume</th>
                    <th style={styles.tableHeader}>Email</th>
                    <th style={styles.tableHeader}>Rol</th>
                    <th style={styles.tableHeader}>Trust Level</th>
                    <th style={styles.tableHeader}>Trust Score</th>
                    <th style={styles.tableHeader}>Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.filter(u => u.role === 'expert' || u.role === 'company').map(user => {
                    const profile = (trustProfiles.length > 0 ? trustProfiles : trustStats?.profiles || []).find(p => p.user_id === user.id) || { trust_level: 1, trust_score: 0 };
                    return (
                      <tr key={user.id} style={styles.tableRow}>
                        <td style={styles.tableCell}>{user.name}</td>
                        <td style={styles.tableCell}>{user.email}</td>
                        <td style={styles.tableCell}>{user.role === 'expert' ? '👨‍💼 Expert' : '🏢 Companie'}</td>
                        <td style={styles.tableCell}>
                          <span style={{ 
                            padding: '4px 12px', 
                            borderRadius: '20px',
                            backgroundColor: profile.trust_level === 5 ? '#dcfce7' : profile.trust_level === 4 ? '#dbeafe' : profile.trust_level === 3 ? '#fef3c7' : profile.trust_level === 2 ? '#fed7aa' : '#fee2e2',
                            color: profile.trust_level === 5 ? '#166534' : profile.trust_level === 4 ? '#1e40af' : profile.trust_level === 3 ? '#92400e' : profile.trust_level === 2 ? '#9a3412' : '#991b1b',
                            fontWeight: '600',
                            fontSize: '0.875rem'
                          }}>
                            Nivel {profile.trust_level || 1}
                          </span>
                        </td>
                        <td style={styles.tableCell}>{profile.trust_score || 0}</td>
                        <td style={styles.tableCell}>
                          <button 
                            onClick={() => handleUpdateTrustLevel(user.id, (profile.trust_level || 1) + 1)}
                            style={{ ...styles.buttonSmall, marginRight: '0.5rem', backgroundColor: '#3b82f6' }}
                            disabled={(profile.trust_level || 1) >= 5}
                          >
                            ⬆️
                          </button>
                          <button 
                            onClick={() => handleUpdateTrustLevel(user.id, Math.max(1, (profile.trust_level || 1) - 1))}
                            style={{ ...styles.buttonSmall, backgroundColor: '#ef4444' }}
                            disabled={(profile.trust_level || 1) <= 1}
                          >
                            ⬇️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {allUsers.filter(u => u.kyc_status !== 'verified' && verificationCalls.some(c => c.user_id === u.id && c.status === 'completed')).length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardHeader}><h3 style={styles.cardTitle}>⏳ Utilizatori în Așteptare Aprobare ({allUsers.filter(u => u.kyc_status !== 'verified' && verificationCalls.some(c => c.user_id === u.id && c.status === 'completed')).length})</h3></div>
              <table style={styles.table}>
                <thead><tr style={styles.tableHeaderRow}><th style={styles.tableHeader}>Nume</th><th style={styles.tableHeader}>Email</th><th style={styles.tableHeader}>Rol</th><th style={styles.tableHeader}>Status Verificare</th><th style={styles.tableHeader}>Acțiuni</th></tr></thead>
                <tbody>
                  {allUsers.filter(u => u.kyc_status !== 'verified' && verificationCalls.some(c => c.user_id === u.id && c.status === 'completed')).map(user => (
                    <tr key={user.id} style={styles.tableRow}>
                      <td style={styles.tableCell}><span onClick={() => navigate(`/profile/${user.id}`)} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '500', textDecoration: 'underline' }}>{user.name}</span></td>
                      <td style={styles.tableCell}>{user.email}</td>
                      <td style={styles.tableCell}>{user.role}</td>
                      <td style={styles.tableCell}>
                        <span style={{...styles.badge, backgroundColor: '#d1fae5', color: '#059669'}}>✅ Apel efectuat</span>
                      </td>
                      <td style={styles.tableCell}>
                        <button onClick={() => handleApproveUser(user.id)} style={{ ...styles.button, ...styles.buttonSuccess, marginRight: '0.5rem' }}>✅ Aprobă</button>
                        <button onClick={() => handleDeleteUser(user.id)} style={{ ...styles.button, backgroundColor: '#dc2626', color: 'white' }}>Șterge</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={styles.card}>
            <div style={styles.cardHeader}><h3 style={styles.cardTitle}>👥 Toți Utilizatorii</h3></div>
            <table style={styles.table}>
              <thead><tr style={styles.tableHeaderRow}><th style={styles.tableHeader}>Nume</th><th style={styles.tableHeader}>Email</th><th style={styles.tableHeader}>Rol</th><th style={styles.tableHeader}>Status</th><th style={styles.tableHeader}>Status Verificare</th><th style={styles.tableHeader}>Acțiuni</th></tr></thead>
              <tbody>
                {allUsers.slice(0, 20).map(user => (
                  <tr key={user.id} style={styles.tableRow}>
                    <td style={styles.tableCell}><span onClick={() => navigate(`/profile/${user.id}`)} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '500', textDecoration: 'underline' }}>{user.name}</span></td>
                    <td style={styles.tableCell}>{user.email}</td>
                    <td style={styles.tableCell}>{user.role}</td>
                    <td style={styles.tableCell}><span style={{...styles.badge, backgroundColor: user.kyc_status === 'verified' ? '#d1fae5' : '#fef3c7', color: user.kyc_status === 'verified' ? '#059669' : '#d97706'}}>{user.kyc_status === 'verified' ? 'Verificat' : 'Nev verificat'}</span></td>
                    <td style={styles.tableCell}>
                      {verificationCalls.find(c => c.user_id === user.id && c.status === 'completed') ? (
                        <span style={{...styles.badge, backgroundColor: '#d1fae5', color: '#059669'}}>✅ Apel efectuat</span>
                      ) : verificationCalls.find(c => c.user_id === user.id && c.status === 'scheduled') ? (
                        <span style={{...styles.badge, backgroundColor: '#dbeafe', color: '#1d4ed8'}}>📞 Apel programat</span>
                      ) : (
                        <span style={{...styles.badge, backgroundColor: '#f3f4f6', color: '#6b7280'}}>—</span>
                      )}
                    </td>
                    <td style={styles.tableCell}><button onClick={() => navigate(`/profile/${user.id}`)} style={{ ...styles.button, ...styles.buttonPrimary, marginRight: '0.5rem', fontSize: '0.8rem' }}>👁️ Profil</button>{user.kyc_status !== 'verified' && hasCompletedCall(user.id) && <button onClick={() => handleApproveUser(user.id)} style={{ ...styles.button, ...styles.buttonSuccess, marginRight: '0.5rem' }}>Aprobă</button>}{user.kyc_status !== 'verified' && !hasCompletedCall(user.id) && <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginRight: '0.5rem' }}>necesită apel</span>}<button onClick={() => handleDeleteUser(user.id)} style={{ ...styles.button, backgroundColor: '#dc2626', color: 'white', fontSize: '0.8rem' }}>Șterge</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'calls' && (
        <div style={styles.card}>
          <div style={styles.cardHeader}><h3 style={styles.cardTitle}>📞 Apeluri Verificare</h3></div>
          {verificationCalls.filter(c => c.status !== 'completed').length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Nu există apeluri programate</div>
          ) : (
            <table style={styles.table}>
              <thead><tr style={styles.tableHeaderRow}><th style={styles.tableHeader}>Nume</th><th style={styles.tableHeader}>Email</th><th style={styles.tableHeader}>Telefon</th><th style={styles.tableHeader}>Companie</th><th style={styles.tableHeader}>Data</th><th style={styles.tableHeader}>Ora</th><th style={styles.tableHeader}>Status</th><th style={styles.tableHeader}>Acțiuni</th></tr></thead>
              <tbody>
                {verificationCalls.filter(c => c.status !== 'completed').map(call => (
                  <tr key={call.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{call.name}</td>
                    <td style={styles.tableCell}>{call.email}</td>
                    <td style={styles.tableCell}>{call.phone || '-'}</td>
                    <td style={styles.tableCell}>{call.company || '-'}</td>
                    <td style={styles.tableCell}>{call.scheduled_date}</td>
                    <td style={styles.tableCell}>{call.scheduled_time}</td>
                    <td style={styles.tableCell}>
                      <span style={{...styles.badge, backgroundColor: call.status === 'scheduled' ? '#dbeafe' : '#fee2e2', color: call.status === 'scheduled' ? '#1d4ed8' : '#dc2626'}}>
                        {call.status === 'scheduled' ? 'Programat' : 'Anulat'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      {call.status === 'scheduled' && (
                        <button onClick={() => handleCompleteCall(call.id)} style={{ ...styles.button, ...styles.buttonSuccess, marginRight: '0.5rem' }}>✅ Finalizat</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'projects' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {allProjects.filter(p => p.status === 'pending_admin_approval').length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardHeader}><h3 style={styles.cardTitle}>⏳ Proiecte în Așteptare Aprobare ({allProjects.filter(p => p.status === 'pending_admin_approval').length})</h3></div>
              <table style={styles.table}>
                <thead><tr style={styles.tableHeaderRow}><th style={styles.tableHeader}>Titlu</th><th style={styles.tableHeader}>Creat de</th><th style={styles.tableHeader}>Buget</th><th style={styles.tableHeader}>Tip</th><th style={styles.tableHeader}>Acțiuni</th></tr></thead>
                <tbody>
                  {allProjects.filter(p => p.status === 'pending_admin_approval').map(project => (
                    <tr key={project.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{project.title}</td>
                      <td style={styles.tableCell}>
                        {project.client_name || 'N/A'}
                      </td>
                      <td style={styles.tableCell}>{project.budget_ron} RON</td>
                      <td style={styles.tableCell}>
                        <span style={{...styles.badge, backgroundColor: project.assignment_type === 'pm_task' ? '#fef3c7' : project.posted_by_expert ? '#dbeafe' : '#fce7f3', color: project.assignment_type === 'pm_task' ? '#92400e' : project.posted_by_expert ? '#1d4ed8' : '#be185d'}}>
                          {project.assignment_type === 'pm_task' ? '📊 PM Task' : project.posted_by_expert ? '👨‍💼 Expert' : project.posted_by_client ? '🏢 Companie' : '📌 Client'}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <button onClick={() => handleApproveProject(project)} style={{ ...styles.button, ...styles.buttonSuccess, marginRight: '0.5rem' }}>✅ Aprobă</button>
                        <button onClick={() => handleDeleteProject(project.id)} style={{ ...styles.button, backgroundColor: '#dc2626', color: 'white' }}>Șterge</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
            <div style={styles.card}>
            <div style={styles.cardHeader}><h3 style={styles.cardTitle}>📋 Toate Proiectele ({allProjects.filter(p => p.status !== 'pending_admin_approval').length})</h3></div>
              <table style={styles.table}>
                <thead><tr style={styles.tableHeaderRow}><th style={styles.tableHeader}>Titlu</th><th style={styles.tableHeader}>Creat de</th><th style={styles.tableHeader}>Buget</th><th style={styles.tableHeader}>Status</th><th style={styles.tableHeader}>Asignat</th><th style={styles.tableHeader}>Acțiuni</th></tr></thead>
                <tbody>
                  {allProjects.filter(p => p.status !== 'pending_admin_approval').slice((projectPage - 1) * PROJECTS_PER_PAGE, projectPage * PROJECTS_PER_PAGE).map(project => (
                    <tr key={project.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{project.title}</td>
                      <td style={styles.tableCell}>{project.client_name || 'N/A'}</td>
                      <td style={styles.tableCell}>{project.budget_ron} RON</td>
                      <td style={styles.tableCell}><span style={{...styles.badge, backgroundColor: getProjectStatusColor(project.status) + '20', color: getProjectStatusColor(project.status)}}>{getProjectStatusLabel(project.status)}</span></td>
                      <td style={styles.tableCell}>{project.expert_id ? <span style={{ color: '#007bff', fontSize: '0.85rem' }}>👨‍💼 {project.expert_name}</span> : project.company_id ? <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>🏢 {project.company_name}</span> : <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Neasignat</span>}</td>
                      <td style={styles.tableCell}><button onClick={() => handleOpenAssignModal(project)} style={{ ...styles.button, ...styles.buttonPrimary, fontSize: '0.8rem', padding: '0.4rem 0.8rem', marginRight: '0.5rem' }}>{project.expert_id || project.company_id ? '✏️ Modifică' : '➕ Asignează'}</button><button onClick={() => handleDeleteProject(project.id)} style={{ ...styles.button, backgroundColor: '#dc2626', color: 'white', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Șterge</button></td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {allProjects.filter(p => p.status !== 'pending_admin_approval').length > PROJECTS_PER_PAGE && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem', gap: '1rem' }}>
                <button onClick={() => setProjectPage(p => Math.max(1, p - 1))} disabled={projectPage === 1} style={{ padding: '0.5rem 1rem', backgroundColor: projectPage === 1 ? '#e5e7eb' : '#3b82f6', color: projectPage === 1 ? '#9ca3af' : 'white', border: 'none', borderRadius: '6px', cursor: projectPage === 1 ? 'not-allowed' : 'pointer' }}>⬅️ Anterior</button>
                <span style={{ color: '#6b7280' }}>Pagina {projectPage} din {Math.ceil(allProjects.filter(p => p.status !== 'pending_admin_approval').length / PROJECTS_PER_PAGE)}</span>
                <button onClick={() => setProjectPage(p => p + 1)} disabled={projectPage * PROJECTS_PER_PAGE >= allProjects.filter(p => p.status !== 'pending_admin_approval').length} style={{ padding: '0.5rem 1rem', backgroundColor: projectPage * PROJECTS_PER_PAGE >= allProjects.filter(p => p.status !== 'pending_admin_approval').length ? '#e5e7eb' : '#3b82f6', color: projectPage * PROJECTS_PER_PAGE >= allProjects.filter(p => p.status !== 'pending_admin_approval').length ? '#9ca3af' : 'white', border: 'none', borderRadius: '6px', cursor: projectPage * PROJECTS_PER_PAGE >= allProjects.filter(p => p.status !== 'pending_admin_approval').length ? 'not-allowed' : 'pointer' }}>Următoarea ➡️</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <div style={styles.card}>
            <div style={styles.cardHeader}><h3 style={styles.cardTitle}>👨‍💼 Task-uri de la Experți ({expertPostedTasks.filter(t => t.expert_posting_status === 'pending').length})</h3></div>
            {expertPostedTasks.filter(t => t.expert_posting_status === 'pending').length === 0 ? <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Nu există task-uri în așteptare</div> : (
              <table style={styles.table}>
                <thead><tr style={styles.tableHeaderRow}><th style={styles.tableHeader}>Titlu</th><th style={styles.tableHeader}>Buget</th><th style={styles.tableHeader}>Status</th><th style={styles.tableHeader}>Acțiuni</th></tr></thead>
                <tbody>
                  {expertPostedTasks.filter(t => t.expert_posting_status === 'pending').map(task => (
                    <tr key={task.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{task.title}</td>
                      <td style={styles.tableCell}>{task.budget_ron} RON</td>
                      <td style={styles.tableCell}><span style={{ ...styles.badge, backgroundColor: '#fef3c7', color: '#d97706' }}>{task.expert_posting_status}</span></td>
                      <td style={styles.tableCell}><button onClick={() => handleApproveExpertPostedTask(task.id)} style={{ ...styles.button, ...styles.buttonSuccess, marginRight: '0.5rem' }}>Aprobă</button><button onClick={() => handleDeleteProject(task.id)} style={{ ...styles.button, backgroundColor: '#dc2626', color: 'white' }}>Șterge</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={styles.card}>
            <div style={styles.cardHeader}><h3 style={styles.cardTitle}>🏢 Task-uri de la Companii ({clientPostedTasks.filter(t => t.client_posting_status === 'pending').length})</h3></div>
            {clientPostedTasks.filter(t => t.client_posting_status === 'pending').length === 0 ? <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Nu există task-uri în așteptare</div> : (
              <table style={styles.table}>
                <thead><tr style={styles.tableHeaderRow}><th style={styles.tableHeader}>Titlu</th><th style={styles.tableHeader}>Buget</th><th style={styles.tableHeader}>Status</th><th style={styles.tableHeader}>Acțiuni</th></tr></thead>
                <tbody>
                  {clientPostedTasks.filter(t => t.client_posting_status === 'pending').map(task => (
                    <tr key={task.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{task.title}</td>
                      <td style={styles.tableCell}>{task.budget_ron} RON</td>
                      <td style={styles.tableCell}><span style={{ ...styles.badge, backgroundColor: '#fef3c7', color: '#d97706' }}>{task.client_posting_status}</span></td>
                      <td style={styles.tableCell}><button onClick={() => handleApproveClientPostedTask(task.id)} style={{ ...styles.button, ...styles.buttonSuccess, marginRight: '0.5rem' }}>Aprobă</button><button onClick={() => handleDeleteProject(task.id)} style={{ ...styles.button, backgroundColor: '#dc2626', color: 'white' }}>Șterge</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showCommissionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCommissionModal(false)}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '450px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1f2937', fontSize: '1.5rem' }}>⚙️ Configurează Proiectul</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>Tip Serviciu *</label>
              <select
                value={commissionForm.service_type}
                onChange={e => setCommissionForm({ ...commissionForm, service_type: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem' }}
              >
                <option value="matching">🔗 Matching - Facilitez conexiunea</option>
                <option value="direct">🎯 Direct - Contract direct</option>
                <option value="project_management">📊 Project Management - Supervizare</option>
              </select>
            </div>

            {commissionForm.service_type === 'matching' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>Comision Platformă (%) *</label>
                <input
                  type="number"
                  value={commissionForm.commission_percent}
                  onChange={e => setCommissionForm({ ...commissionForm, commission_percent: parseInt(e.target.value) })}
                  min="1"
                  max="50"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem' }}
                />
                <small style={{ color: '#6b7280', marginTop: '0.25rem', display: 'block' }}>Comisionul reținut din fiecare milestone (1-50%)</small>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={() => setShowCommissionModal(false)}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
              >
                Anulează
              </button>
              <button
                onClick={handleSubmitCommission}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
              >
                ✅ Aprobă
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

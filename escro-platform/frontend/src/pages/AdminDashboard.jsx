import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminAPI, apiClient, escrowAPI, termsAPI, projectAPI } from '../services/api';
import { Icon, Avatar, Stat, StatusBadge, EmptyState, Spinner } from '../components/ui';
import { fmtRON, fmtDate, withAuthToken, serviceLabel } from '../utils/format';
import '../styles/admin-extras.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [stats, setStats] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [verificationCalls, setVerificationCalls] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [trustProfiles, setTrustProfiles] = useState([]);
  const [expertPostedTasks, setExpertPostedTasks] = useState([]);
  const [clientPostedTasks, setClientPostedTasks] = useState([]);
  const [financiar, setFinanciar] = useState(null);
  const [contracts, setContracts] = useState({ projectContracts: [], userContracts: [] });
  const [disputes, setDisputes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityHasMore, setActivityHasMore] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingActions, setLoadingActions] = useState({});
  const [toasts, setToasts] = useState([]);
  const [arbDispute, setArbDispute] = useState(null);
  const [arbBusy, setArbBusy] = useState(false);

  const pushToast = useCallback((toast) => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3800);
  }, []);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionForm, setCommissionForm] = useState({ projectId: null, service_type: 'matching', commission_percent: 10, assignment_type: null });
  const [disputeModal, setDisputeModal] = useState(null);
  const [disputeForm, setDisputeForm] = useState({ decision: '', release_amount: '', decision_type: 'partial' });
  const [contractTab, setContractTab] = useState('project');
  const [referralCodes, setReferralCodes] = useState([]);
  const [vipForm, setVipForm] = useState({ trust_level: 5 });
  const [generatedCode, setGeneratedCode] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignForm, setAssignForm] = useState({ expert_id: '', company_id: '' });
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [createTaskTarget, setCreateTaskTarget] = useState(null);
  const [createTaskForm, setCreateTaskForm] = useState({ title: '', description: '', budget_ron: '', timeline_days: 30, service_type: 'matching', expert_id: '', company_id: '', milestones: [{ title: '', deliverable_description: '', percentage_of_budget: 100 }] });
  const [detailModal, setDetailModal] = useState(null);
  const [detailMilestones, setDetailMilestones] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadedTabs = useRef(new Set());
  const [tabLoading, setTabLoading] = useState(false);

  const refresh = () => {
    loadedTabs.current.clear();
    setRefreshKey(k => k + 1);
  };

  // Initial load: only stats + activity (overview tab needs these)
  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes] = await Promise.all([
        adminAPI.getAdminDashboard().catch(() => ({ data: { stats: {} } })),
        adminAPI.getAdminActivity().catch(() => ({ data: { activity: [] } })),
      ]);
      setStats(statsRes.data.stats || {});
      const actData = activityRes.data;
      setActivity(actData.activity || []);
      setActivityHasMore((actData.pagination?.page || 1) < (actData.pagination?.pages || 1));
      loadedTabs.current.add('overview');
    } catch (e) {
      console.error('Admin overview load error', e);
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  // Lazy-load tab-specific data on demand
  const loadTabData = useCallback(async (tab) => {
    if (loadedTabs.current.has(tab)) return;
    setTabLoading(true);
    try {
      switch (tab) {
        case 'users':
        case 'trust': {
          const [usersRes, trustRes] = await Promise.all([
            adminAPI.getAllUsers().catch(() => ({ data: { users: [] } })),
            adminAPI.getAllTrustProfiles().catch(() => ({ data: { profiles: [] } })),
          ]);
          setAllUsers(usersRes.data.users || []);
          setTrustProfiles(trustRes.data.profiles || []);
          loadedTabs.current.add('users');
          loadedTabs.current.add('trust');
          break;
        }
        case 'projects-tasks': {
          const [projRes, expertRes, clientRes] = await Promise.all([
            adminAPI.getAllProjects().catch(() => ({ data: { projects: [] } })),
            adminAPI.getPendingExpertPostedTasks().catch(() => ({ data: { data: [] } })),
            adminAPI.getPendingClientPostedTasks().catch(() => ({ data: { data: [] } })),
          ]);
          setAllProjects(projRes.data.projects || []);
          setExpertPostedTasks(expertRes.data?.data || []);
          setClientPostedTasks(clientRes.data?.data || []);
          loadedTabs.current.add('projects-tasks');
          break;
        }
        case 'financiar': {
          const finRes = await adminAPI.getAdminFinanciar().catch(() => ({ data: {} }));
          setFinanciar(finRes.data || null);
          loadedTabs.current.add('financiar');
          break;
        }
        case 'contracte': {
          const contRes = await adminAPI.getAdminContracts().catch(() => ({ data: { projectContracts: [], userContracts: [] } }));
          setContracts({ projectContracts: contRes.data.projectContracts || [], userContracts: contRes.data.userContracts || [] });
          loadedTabs.current.add('contracte');
          break;
        }
        case 'dispute': {
          const [dispRes, projRes, expertRes, clientRes] = await Promise.all([
            adminAPI.getAdminDisputes().catch(() => ({ data: { disputes: [] } })),
            adminAPI.getAllProjects().catch(() => ({ data: { projects: [] } })),
            adminAPI.getPendingExpertPostedTasks().catch(() => ({ data: { data: [] } })),
            adminAPI.getPendingClientPostedTasks().catch(() => ({ data: { data: [] } })),
          ]);
          setDisputes(dispRes.data.disputes || []);
          setAllProjects(projRes.data.projects || []);
          setExpertPostedTasks(expertRes.data?.data || []);
          setClientPostedTasks(clientRes.data?.data || []);
          loadedTabs.current.add('dispute');
          loadedTabs.current.add('projects-tasks');
          break;
        }
        case 'calls': {
          const callsRes = await adminAPI.getVerificationCalls().catch(() => ({ data: { data: [] } }));
          setVerificationCalls(callsRes.data?.data || []);
          loadedTabs.current.add('calls');
          break;
        }
        case 'applications': {
          const appsRes = await apiClient.get('/admin/task-requests/pending').catch(() => ({ data: { data: [] } }));
          setPendingApplications(appsRes.data?.data || []);
          loadedTabs.current.add('applications');
          break;
        }
        case 'referral': {
          const refRes = await adminAPI.getAllReferralCodes().catch(() => ({ data: { codes: [] } }));
          setReferralCodes(refRes.data?.codes || []);
          loadedTabs.current.add('referral');
          break;
        }
        default: break;
      }
    } catch (e) {
      console.error('Tab load error', tab, e);
    } finally {
      setTabLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  // When tab changes, load its data if not yet loaded
  useEffect(() => {
    if (!loading) loadTabData(activeTab);
  }, [activeTab, loading, loadTabData]);

  const withLoading = (key, fn) => async (...args) => {
    if (loadingActions[key]) return;
    setLoadingActions(p => ({ ...p, [key]: true }));
    try { await fn(...args); refresh(); }
    catch (e) { console.error(e); }
    finally { setLoadingActions(p => ({ ...p, [key]: false })); }
  };

  const handleApproveUser = (id) => {
    const u = allUsers.find(x => x.id === id);
    if (!window.confirm(`Aprobi userul "${u?.name || id}" (${u?.email || ''})? Contul va fi marcat ca verificat de admin. KYC-ul Stripe rămâne în responsabilitatea userului.`)) return;
    return withLoading(`approve-${id}`, () => adminAPI.approveUser(id))();
  };
  const handleRejectUser = (id) => {
    const u = allUsers.find(x => x.id === id);
    if (!window.confirm(`Respingi userul "${u?.name || id}" (${u?.email || ''})? Nu va putea folosi platforma.`)) return;
    return withLoading(`reject-${id}`, () => adminAPI.rejectUser(id))();
  };
  const handleDeleteUser = async (id) => {
    if (!confirm('Dezactivezi utilizatorul? (soft delete — datele sunt păstrate)')) return;
    try { await adminAPI.deleteUser(id); refresh(); } catch { alert('Eroare'); }
  };
  const handleRestoreUser = async (id) => {
    try {
      await apiClient.post(`/admin/users/${id}/restore`);
      refresh();
    } catch { alert('Eroare la restaurare'); }
  };
  const handleDeleteProject = async (id) => {
    if (!confirm('Arhivezi proiectul? (soft delete — datele sunt păstrate)')) return;
    try { await adminAPI.deleteProject(id); refresh(); } catch { alert('Eroare'); }
  };
  const handleRejectProject = async (project) => {
    const key = `reject-project-${project.id}`;
    if (loadingActions[key]) return;
    const reason = window.prompt(`Respingi proiectul "${project.title}"? Motivul (obligatoriu):`);
    if (reason === null) return;
    if (!reason.trim()) { alert('Motivul respingerii este obligatoriu.'); return; }
    setLoadingActions(p => ({ ...p, [key]: true }));
    try {
      await apiClient.post(`/admin/projects/${project.id}/reject`, { reason: reason.trim() });
      refresh();
    } catch (e) { alert(e.response?.data?.error || 'Eroare la respingere.'); }
    finally { setLoadingActions(p => ({ ...p, [key]: false })); }
  };
  const [historyModal, setHistoryModal] = useState(null);
  const handleOpenHistory = async (project) => {
    try {
      const r = await adminAPI.getProjectHistory(project.id);
      setHistoryModal({ project, entries: r.data?.history || [] });
    } catch (e) {
      alert(e.response?.data?.error || 'Eroare la încărcarea istoricului.');
    }
  };

  const handleRemoveExpert = async (project) => {
    const key = `remove-expert-${project.id}`;
    if (loadingActions[key]) return;
    const partyName = project.expert_name || project.company_name || 'prestatorul';
    if (!confirm(`Dezasignezi ${partyName} de la proiectul "${project.title}"? Proiectul va reveni la status 'pending_assignment'.`)) return;
    setLoadingActions(p => ({ ...p, [key]: true }));
    try {
      await adminAPI.removeExpertFromProject(project.id);
      refresh();
    } catch (e) { alert(e.response?.data?.message || 'Eroare la dezasignare.'); }
    finally { setLoadingActions(p => ({ ...p, [key]: false })); }
  };
  const handleRefundProject = async (project) => {
    const key = `refund-${project.id}`;
    if (loadingActions[key]) return;
    if (!confirm(`Refund escrow pentru "${project.title}"? Suma rămasă în escrow va fi returnată clientului.`)) return;
    setLoadingActions(p => ({ ...p, [key]: true }));
    try {
      const res = await escrowAPI.refundEscrow(project.id);
      alert(`Refund procesat: ${res.data?.refunded_amount || 0} RON returnați.`);
      refresh();
    } catch (e) { alert(e.response?.data?.error || 'Eroare la refund.'); }
    finally { setLoadingActions(p => ({ ...p, [key]: false })); }
  };
  const [editProjectModal, setEditProjectModal] = useState(null);
  const handleOpenEdit = async (project) => {
    // Load milestones + last_user_feedback for editing
    let milestones = [];
    let lastFeedback = null;
    try {
      const detail = await projectAPI.getProjectDetail(project.id);
      milestones = (detail.data?.milestones || []).map(m => ({
        id: m.id,
        title: m.title || '',
        deliverable_description: m.deliverable_description || '',
        percentage_of_budget: m.percentage_of_budget || 0,
      }));
      lastFeedback = detail.data?.project?.last_user_feedback || null;
    } catch { /* fallback empty */ }
    setEditProjectModal({
      id: project.id,
      title: project.title || '',
      description: project.description || '',
      budget_ron: project.budget_ron || '',
      timeline_days: project.timeline_days || '',
      milestones,
      last_user_feedback: lastFeedback,
    });
  };
  const handleSubmitEdit = async () => {
    if (!editProjectModal) return;
    // Validate milestones sum to 100 if any are provided
    if (editProjectModal.milestones.length > 0) {
      const totalPct = editProjectModal.milestones.reduce((s, m) => s + parseFloat(m.percentage_of_budget || 0), 0);
      if (Math.abs(totalPct - 100) > 0.5) {
        alert(`Suma procentelor milestone trebuie să fie 100%. Acum: ${totalPct}%`);
        return;
      }
    }
    try {
      await projectAPI.adminEditProject(editProjectModal.id, {
        title: editProjectModal.title,
        description: editProjectModal.description,
        budget_ron: parseFloat(editProjectModal.budget_ron) || undefined,
        timeline_days: parseInt(editProjectModal.timeline_days) || undefined,
        milestones: editProjectModal.milestones.length > 0 ? editProjectModal.milestones : undefined,
      });
      alert('Modificările au fost trimise utilizatorului pentru confirmare.');
      setEditProjectModal(null);
      refresh();
    } catch (e) {
      alert(e.response?.data?.message || 'Eroare la salvare.');
    }
  };

  const handleUpdateTrustLevel = async (userId, level) => {
    if (!confirm(`Schimbi Trust Level la ${level}?`)) return;
    try { await apiClient.put(`/trust-profiles/admin/update-level/${userId}`, { trust_level: level }); refresh(); }
    catch { alert('Eroare trust level'); }
  };
  const handleCompleteCall = async (callId) => {
    if (!window.confirm('Marchezi apelul ca finalizat?')) return;
    try { await apiClient.put(`/verification-calls/${callId}/status`, { status: 'completed' }); refresh(); }
    catch (e) { console.error(e); }
  };
  const handleApproveTask = (kind, id) => {
    if (!window.confirm(`Aprobi acest task ${kind}? Va deveni vizibil pe platformă.`)) return;
    return withLoading(`task-${id}`, () =>
      kind === 'expert' ? adminAPI.approveExpertPostedTask(id) : adminAPI.approveClientPostedTask(id)
    )();
  };
  const handleRejectTask = (kind, id) => {
    if (!window.confirm(`Respingi acest task ${kind}? Userul va fi notificat.`)) return;
    return withLoading(`reject-task-${id}`, () =>
      kind === 'expert' ? adminAPI.rejectExpertPostedTask(id) : adminAPI.rejectClientPostedTask(id)
    )();
  };

  const handleApproveProject = (project) => {
    if (project.assignment_type === 'pm_task') {
      apiClient.post(`/admin/projects/${project.id}/approve`, { assignment_type: 'pm_task' }).then(refresh);
      return;
    }
    setCommissionForm({ projectId: project.id, service_type: project.service_type || 'matching', commission_percent: project.commission_percent || 10, assignment_type: project.assignment_type });
    setShowCommissionModal(true);
  };

  const handleSubmitCommission = async () => {
    try {
      await apiClient.post(`/admin/projects/${commissionForm.projectId}/approve`, commissionForm);
      setShowCommissionModal(false);
      refresh();
    } catch { alert('Eroare la aprobare'); }
  };

  const handleGenerateVipCode = async () => {
    setGeneratingCode(true);
    setGeneratedCode(null);
    try {
      const res = await adminAPI.generateVipCode({ trust_level: parseInt(vipForm.trust_level) });
      setGeneratedCode(res.data);
      refresh();
    } catch (e) {
      alert('Eroare la generarea codului');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenAssignModal = async (project) => {
    setAssignTarget(project);
    setAssignForm({ expert_id: project.expert_id || '', company_id: project.company_id || '' });
    setShowAssignModal(true);
    // Lazy-load users list if not already fetched (admin might open this from Proiecte/Dispute tabs)
    if (allUsers.length === 0) {
      try {
        const usersRes = await adminAPI.getAllUsers();
        setAllUsers(usersRes.data.users || []);
      } catch (e) { console.warn('[assign-modal users]', e?.message); }
    }
  };

  const handleSubmitAssign = async () => {
    if (!assignTarget) return;
    try {
      const body = {};
      if (assignForm.expert_id !== undefined) body.expert_id = assignForm.expert_id || null;
      if (assignForm.company_id !== undefined) body.company_id = assignForm.company_id || null;
      await apiClient.put(`/admin/projects/${assignTarget.id}/assign`, body);
      setShowAssignModal(false);
      setAssignTarget(null);
      refresh();
    } catch { alert('Eroare la asignare'); }
  };

  const handleOpenCreateTaskModal = (pmItem) => {
    setCreateTaskTarget(pmItem);
    setCreateTaskForm({ title: '', description: '', budget_ron: pmItem.budget_ron || '', timeline_days: pmItem.timeline_days || 30, service_type: 'matching', expert_id: '', company_id: '', milestones: [{ title: '', deliverable_description: '', percentage_of_budget: 100 }] });
    setShowCreateTaskModal(true);
  };

  const handleSubmitCreateTask = async () => {
    if (!createTaskTarget) return;
    const validMilestones = createTaskForm.milestones.filter(m => m.title.trim());
    if (validMilestones.length === 0) { alert('Adaugă cel puțin un milestone cu titlu.'); return; }
    if (validMilestones.some(m => !m.percentage_of_budget || parseFloat(m.percentage_of_budget) <= 0)) { alert('Toate milestone-urile trebuie să aibă un procent valid (> 0%).'); return; }
    const totalPct = validMilestones.reduce((s, m) => s + parseFloat(m.percentage_of_budget), 0);
    if (Math.abs(totalPct - 100) > 0.5) { alert(`Suma procentelor milestone-urilor trebuie să fie 100%. Acum este ${totalPct}%.`); return; }
    try {
      await apiClient.post(`/admin/tasks/${createTaskTarget.id}/create-assignment`, {
        ...createTaskForm,
        expert_id: createTaskForm.expert_id || undefined,
        company_id: createTaskForm.company_id || undefined,
        milestones: validMilestones,
      });
      setShowCreateTaskModal(false);
      setCreateTaskTarget(null);
      refresh();
    } catch (e) { alert(e.response?.data?.error || 'Eroare la creare task'); }
  };

  const updateMilestone = (setter, idx, field, value) => {
    setter(prev => ({ ...prev, milestones: prev.milestones.map((m, i) => i === idx ? { ...m, [field]: value } : m) }));
  };
  const addMilestone = (setter) => {
    setter(prev => ({ ...prev, milestones: [...prev.milestones, { title: '', deliverable_description: '', percentage_of_budget: '' }] }));
  };
  const removeMilestone = (setter, idx) => {
    setter(prev => ({ ...prev, milestones: prev.milestones.filter((_, i) => i !== idx) }));
  };

  const [disputeBusy, setDisputeBusy] = useState(false);
  // Arbitrage modal resolver — maps split/decision payload to existing resolveAdminDispute API
  const handleArbResolve = async (payload) => {
    if (!arbDispute || arbBusy) return;
    setArbBusy(true);
    let decision_type = 'partial';
    let release_amount = payload.expert_amount;
    if (payload.decision === 'client') { decision_type = 'rejected'; release_amount = 0; }
    if (payload.decision === 'expert') {
      decision_type = 'full';
      release_amount = parseFloat(arbDispute.amount_disputed || arbDispute.escrow_amount || arbDispute.amount || 0);
    }
    try {
      await adminAPI.resolveAdminDispute(arbDispute.id, {
        decision: payload.note,
        release_amount: release_amount > 0 ? release_amount : null,
        decision_type,
      });
      pushToast({
        title: 'Decizie aplicată',
        msg: `Arbitraj ${payload.decision === 'split' ? `${payload.split.client}/${payload.split.expert}` : payload.decision} · sumă distribuită din escrow.`,
        tone: 'success',
      });
      setArbDispute(null);
      refresh();
    } catch (e) {
      pushToast({
        title: 'Eroare arbitraj',
        msg: e.response?.data?.error || e.message || 'Nu am putut aplica decizia.',
        tone: 'danger',
      });
    } finally {
      setArbBusy(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!disputeModal || disputeBusy) return;
    // Validation
    if (!disputeForm.decision || !disputeForm.decision.trim()) {
      alert('Decizia (text explicativ) este obligatorie.');
      return;
    }
    if (!disputeForm.decision_type) {
      alert('Tipul deciziei este obligatoriu.');
      return;
    }
    const releaseAmt = parseFloat(disputeForm.release_amount) || 0;
    if ((disputeForm.decision_type === 'rejected' || disputeForm.decision_type === 'refund') && releaseAmt > 0) {
      alert(`Pentru decizie "${disputeForm.decision_type}" suma trebuie să fie 0 (banii rămân la client).`);
      return;
    }
    if (disputeForm.decision_type === 'full' && releaseAmt === 0) {
      alert('Pentru decizie "full" trebuie să specifici o sumă > 0.');
      return;
    }
    setDisputeBusy(true);
    try {
      await adminAPI.resolveAdminDispute(disputeModal.id, {
        decision: disputeForm.decision,
        release_amount: disputeForm.release_amount || null,
        decision_type: disputeForm.decision_type || 'partial',
      });
      setDisputeModal(null);
      setDisputeForm({ decision: '', release_amount: '', decision_type: 'partial' });
      refresh();
    } catch (e) {
      alert(e.response?.data?.error || 'Eroare la rezolvare');
    } finally {
      setDisputeBusy(false);
    }
  };

  const handleOpenDetail = async (project) => {
    setDetailModal(project);
    setEditMode(false);
    setLoadingDetail(true);
    try {
      const res = await apiClient.get(`/projects/${project.id}`);
      const fullProject = res.data.project || res.data;
      setDetailModal(fullProject);
      setDetailMilestones(fullProject.milestones || []);
      setEditForm({
        title: fullProject.title,
        description: fullProject.description,
        budget_ron: fullProject.budget_ron,
        timeline_days: fullProject.timeline_days,
      });
    } catch (e) { console.error(e); }
    finally { setLoadingDetail(false); }
  };

  const handleSubmitAdminEdit = async () => {
    try {
      await apiClient.post(`/admin/projects/${detailModal.id}/admin-edit`, {
        ...editForm,
        milestones: detailMilestones,
      });
      setEditMode(false);
      setDetailModal(null);
      refresh();
    } catch (e) { alert('Eroare la salvare'); }
  };

  // Derived
  // "Pending" for the admin's perspective = admin hasn't approved yet (verification_date null) AND not rejected.
  const pendingUsers = allUsers.filter(u => u.role !== 'admin' && !u.verification_date && u.kyc_status !== 'rejected');
  const pmProjects = allProjects.filter(p => p.assignment_type === 'pm_task');
  const taskProjects = allProjects.filter(p => p.assignment_type !== 'pm_task');
  const pendingProjects = allProjects.filter(p => p.status === 'pending_admin_approval');
  const experts = allUsers.filter(u => u.role === 'expert');
  const companies = allUsers.filter(u => u.role === 'company');
  const pendingCalls = verificationCalls.filter(c => c.status === 'pending' || c.status === 'scheduled');
  const pendingTasks = [...expertPostedTasks, ...clientPostedTasks];
  const pendingDisputes = disputes.filter(d => d.status === 'open' || d.status === 'pending');

  const tabs = [
    { id: 'overview',   label: 'Overview',     icon: 'home' },
    { id: 'users',      label: 'Utilizatori',   icon: 'users',       count: stats.pending_kyc || pendingUsers.length || 0, tone: 'warn' },
    { id: 'projects-tasks', label: 'Proiecte & Taskuri', icon: 'folder', count: ((pendingProjects.length || 0) + (pendingTasks.length || 0)) || 0 },
    { id: 'applications', label: 'Aplicații', icon: 'briefcase', count: pendingApplications.length || 0, tone: 'urgent' },
    { id: 'dispute',    label: 'Dispute',       icon: 'shield', count: stats.pending_disputes || pendingDisputes.length || 0, tone: 'urgent' },
    { id: 'calls',      label: 'Apeluri KYC',   icon: 'phone',   count: pendingCalls.length || 0, tone: 'urgent' },
    { id: 'financiar',  label: 'Financiar',     icon: 'trend' },
    { id: 'contracte',  label: 'Contracte',     icon: 'file' },
    { id: 'trust',      label: 'Trust',         icon: 'shield' },
    { id: 'referral',   label: 'Referral',      icon: 'gift' },
    { id: 'audit',      label: 'Audit Log',     icon: 'list' },
    { id: 'terms',      label: 'T&C',           icon: 'file' },
  ];

  const urgentTotal = (pendingDisputes.length || 0) + (pendingApplications.length || 0);

  return (
    <div className="escro-page adm-page fade-up">
      {/* New page header with eyebrow + live status */}
      <div className="adm-head">
        <div>
          <div className="h-eyebrow">
            <span className="pulse ok" /> Admin · {fmtRON(stats.total_revenue || 0).replace(' RON','')} RON comision lifetime
          </div>
          <h1 className="h-title">
            Centru de <em>control</em> platformă
          </h1>
          <p className="h-sub" style={{ marginTop: 8 }}>
            {pendingDisputes.length || 0} dispute deschise · {pendingUsers.length || 0} useri pending KYC · {pendingApplications.length || 0} aplicații marketplace
            {urgentTotal > 0 ? '. Începe cu ce-i mai urgent.' : '. Totul e sub control.'}
          </p>
        </div>
        <div className="adm-head-meta">
          <span className="pulse ok" />
          <span>Live · {allUsers.length} useri · {allProjects.length} proiecte</span>
        </div>
      </div>

      {/* New tab navigation — sticky underline + colored counts */}
      <div className="adm-tabs">
        {tabs.map(t => {
          const countCls = t.tone === 'urgent' ? 'urgent' : t.tone === 'warn' ? 'warn' : '';
          return (
            <div
              key={t.id}
              className={`adm-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className={`adm-tab-count ${countCls}`}>{t.count > 99 ? '99+' : t.count}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile tab dropdown */}
      <div className="adm-tabs-mobile">
        <select value={activeTab} onChange={e => setActiveTab(e.target.value)}>
          {tabs.map(t => (
            <option key={t.id} value={t.id}>
              {t.label}{t.count ? ` · ${t.count}` : ''}
            </option>
          ))}
        </select>
      </div>

      {loading && <Spinner />}
      {!loading && tabLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <Spinner />
        </div>
      )}

      {/* ——— OVERVIEW (refactored per design handoff) ——— */}
      {!loading && !tabLoading && activeTab === 'overview' && (
        <div>
          {/* Urgent action cards */}
          <div className="adm-sect" style={{ marginTop: 0 }}>
            <div className="adm-sect-t">Acțiuni urgente</div>
            <div className="adm-sect-meta">Necesită atenție acum</div>
          </div>
          {(pendingDisputes.length + pendingUsers.length + pendingApplications.length + pendingCalls.length) === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--success-border)', background: 'var(--success-bg)' }}>
              <Icon name="check" size={28} style={{ color: 'var(--success)', marginBottom: 8 }} />
              <div style={{ fontWeight: 700, color: 'var(--success)' }}>Totul e în ordine</div>
              <div style={{ fontSize: 12.5, color: 'var(--fg-2)', marginTop: 4 }}>Nicio acțiune urgentă. Bun moment pentru raportări și planning.</div>
            </div>
          ) : (
            <div className="urgent-grid">
              {pendingDisputes.length > 0 && (
                <UrgentCard
                  tone="danger" icon="shield"
                  num={pendingDisputes.length}
                  label="Dispute deschise"
                  sub={pendingDisputes.length > 1 ? `${pendingDisputes.length} dispute necesită arbitraj` : 'Necesită arbitraj imediat'}
                  cta="Rezolvă"
                  onClick={() => setActiveTab('dispute')}
                />
              )}
              {pendingApplications.length > 0 && (
                <UrgentCard
                  tone="danger" icon="briefcase"
                  num={pendingApplications.length}
                  label="Aplicații marketplace"
                  sub="Prestatori care așteaptă răspuns"
                  cta="Revizuiește"
                  onClick={() => setActiveTab('applications')}
                />
              )}
              {pendingUsers.length > 0 && (
                <UrgentCard
                  tone="warn" icon="users"
                  num={pendingUsers.length}
                  label="Useri pending"
                  sub={pendingCalls.length > 0 ? `${pendingCalls.length} apeluri programate` : 'Așteaptă verificare KYC'}
                  cta="Aprobă"
                  onClick={() => setActiveTab('users')}
                />
              )}
              {pendingCalls.length > 0 && (
                <UrgentCard
                  tone="info" icon="phone"
                  num={pendingCalls.length}
                  label="Apeluri KYC"
                  sub="Programate sau în așteptare"
                  cta="Vezi calendar"
                  onClick={() => setActiveTab('calls')}
                />
              )}
            </div>
          )}

          {/* Indicators with sparklines */}
          <div className="adm-sect">
            <div className="adm-sect-t">Indicatori platformă</div>
            <div className="adm-sect-meta">Snapshot curent</div>
          </div>
          <div className="adm-stat-grid">
            <AdmStat
              label="Utilizatori totali" icon="users"
              value={allUsers.length}
              delta={`+${pendingUsers.length} pending`} deltaTone={pendingUsers.length > 0 ? 'up' : 'down'}
            />
            <AdmStat
              label="Valoare în escrow" icon="lock"
              value={fmtRON(parseFloat(financiar?.summary?.currently_held) || stats.escrow_held || 0).replace(' RON','')}
              unit="RON"
              sparkColor="var(--success)"
            />
            <AdmStat
              label="Comision lifetime" icon="trend"
              value={fmtRON(parseFloat(financiar?.summary?.total_commission) || stats.total_revenue || 0).replace(' RON','')}
              unit="RON"
              sparkColor="var(--warning)"
            />
            <AdmStat
              label="Dispute deschise" icon="alert-triangle"
              value={pendingDisputes.length}
              delta={pendingDisputes.length > 2 ? 'Atenție' : 'Sub control'}
              deltaTone={pendingDisputes.length > 2 ? 'up' : 'down'}
              sparkColor="var(--danger)"
            />
          </div>

          {/* Activity + Platform health */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.5rem', marginTop: '1.75rem' }} className="ov-split">
            <div>
              <div className="adm-sect" style={{ marginTop: 0 }}>
                <div className="adm-sect-t">Activitate recentă</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('audit')}>
                  Vezi tot audit log <Icon name="arrow-right" size={12} />
                </button>
              </div>
              <div className="card" style={{ padding: '0.5rem 1rem' }}>
                <AuditTimeline
                  items={(activity || []).slice(0, 6).map(a => ({
                    id: a.id,
                    type: a.type || a.action_type || 'user_approve',
                    actor: a.actor_name || a.admin_email || 'admin',
                    target: a.target_label || a.target_name || a.target_id || '—',
                    detail: a.description || a.detail || '',
                    when: a.created_at || a.when,
                  }))}
                />
              </div>
            </div>

            <div>
              <div className="adm-sect" style={{ marginTop: 0 }}>
                <div className="adm-sect-t">Stare platformă</div>
              </div>
              <div className="card" style={{ padding: '1.125rem' }}>
                {[
                  { label: 'API uptime',         value: 'OK',  tone: 'success' },
                  { label: 'Stripe payments',    value: 'OK',  tone: 'success' },
                  { label: 'KYC sync (6h cron)', value: 'OK',  tone: 'success' },
                  { label: 'Webhook ingest',     value: 'OK',  tone: 'success' },
                  { label: 'Dispute timeout cron', value: 'OK', tone: 'success' },
                ].map(it => (
                  <div key={it.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.625rem 0', borderBottom: '1px solid var(--border-1)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`pulse-dot ${it.tone === 'success' ? 'green' : ''}`} style={{
                        background: it.tone === 'warn' ? 'var(--warning)' : undefined,
                        width: 7, height: 7,
                      }} />
                      <span style={{ fontSize: 12.5, color: 'var(--fg-1)' }}>{it.label}</span>
                    </div>
                    <span style={{
                      fontFamily: 'var(--f-mono)', fontSize: 11.5, fontWeight: 600,
                      color: it.tone === 'success' ? 'var(--success)' : it.tone === 'warn' ? 'var(--warning)' : 'var(--danger)',
                    }}>{it.value}</span>
                  </div>
                ))}
              </div>

              <div className="adm-sect">
                <div className="adm-sect-t">Acțiuni rapide</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('financiar')}>
                  <Icon name="trend" size={14} /> Vezi raport financiar
                </button>
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('users')}>
                  <Icon name="users" size={14} /> Aprobă useri pending
                </button>
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('terms')}>
                  <Icon name="file" size={14} /> Management T&C
                </button>
              </div>
            </div>
          </div>
          <style>{`
            @media (max-width: 1100px) {
              .ov-split { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      )}

      {/* ——— USERS ——— */}
      {!loading && !tabLoading && activeTab === 'users' && (
        <UsersTab allUsers={allUsers} loadingActions={loadingActions}
          handleApproveUser={handleApproveUser} handleRejectUser={handleRejectUser}
          handleDeleteUser={handleDeleteUser} handleRestoreUser={handleRestoreUser}
          refresh={refresh} />
      )}


      {/* ——— PROJECTS ——— */}
      {!loading && !tabLoading && activeTab === 'projects-tasks' && (
        <div className="col" style={{ gap: '1.5rem' }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Toate proiectele & task-urile ({allProjects.length})</div>
            </div>
            {allProjects.length === 0 ? <EmptyState icon="folder" title="Niciun proiect" description="Nu există proiecte sau task-uri." /> : (
              <table className="tbl">
                <thead><tr><th>Titlu</th><th>Client</th><th>Tip</th><th>Status</th><th>Buget</th><th>Comision</th><th>Asignat</th><th>Data</th><th>Acțiuni</th></tr></thead>
                <tbody>
                  <AdminProjectRows
                    projects={allProjects}
                    navigate={navigate}
                    handleOpenDetail={handleOpenDetail}
                    handleApproveProject={handleApproveProject}
                    handleOpenCreateTaskModal={handleOpenCreateTaskModal}
                    handleOpenAssignModal={handleOpenAssignModal}
                    handleDeleteProject={handleDeleteProject}
                    handleRefund={handleRefundProject}
                    handleOpenEdit={handleOpenEdit}
                    handleRemoveExpert={handleRemoveExpert}
                    handleOpenHistory={handleOpenHistory}
                    handleRejectProject={handleRejectProject}
                    loadingActions={loadingActions}
                  />
                </tbody>
              </table>
            )}
          </div>

          {/* Task-uri postate de experți */}
          <div className="card">
            <div className="card-head"><div className="card-title">Task-uri experți ({expertPostedTasks.length})</div></div>
            {expertPostedTasks.length === 0 ? <EmptyState icon="kanban" title="Niciun task" description="" /> : (
              <table className="tbl">
                <thead><tr><th>Titlu</th><th>Expert</th><th>Status</th><th>Data</th><th>Acțiuni</th></tr></thead>
                <tbody>
                  {expertPostedTasks.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.title || t.task_title}</td>
                      <td style={{ fontSize: 12 }}>{t.expert_name || '—'}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td className="muted-2" style={{ fontSize: 12 }}>{fmtDate(t.created_at)}</td>
                      <td>
                        <div className="row" style={{ gap: '.375rem' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleOpenDetail(t)}>
                            <Icon name="eye" size={11} /> Detalii
                          </button>
                          {t.expert_posting_status === 'pending' && (
                            <>
                              <button className="btn btn-success btn-sm"
                                disabled={loadingActions[`task-${t.id}`]}
                                onClick={() => handleApproveTask('expert', t.id)}>Aprobă</button>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--warning)' }}
                                disabled={loadingActions[`reject-task-${t.id}`]}
                                onClick={() => handleRejectTask('expert', t.id)}>Respinge</button>
                            </>
                          )}
                          {t.expert_posting_status && t.expert_posting_status !== 'pending' && (
                            <StatusBadge status={t.expert_posting_status} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Task-uri postate de clienți */}
          <div className="card">
            <div className="card-head"><div className="card-title">Task-uri clienți ({clientPostedTasks.length})</div></div>
            {clientPostedTasks.length === 0 ? <EmptyState icon="kanban" title="Niciun task" description="" /> : (
              <table className="tbl">
                <thead><tr><th>Titlu</th><th>Client</th><th>Status</th><th>Data</th><th>Acțiuni</th></tr></thead>
                <tbody>
                  {clientPostedTasks.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.title || t.task_title}</td>
                      <td style={{ fontSize: 12 }}>{t.client_name || t.company_name || '—'}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td className="muted-2" style={{ fontSize: 12 }}>{fmtDate(t.created_at)}</td>
                      <td>
                        <div className="row" style={{ gap: '.375rem' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleOpenDetail(t)}>
                            <Icon name="eye" size={11} /> Detalii
                          </button>
                          {t.client_posting_status === 'pending' && (
                            <>
                              <button className="btn btn-success btn-sm"
                                disabled={loadingActions[`task-${t.id}`]}
                                onClick={() => handleApproveTask('client', t.id)}>Aprobă</button>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--warning)' }}
                                disabled={loadingActions[`reject-task-${t.id}`]}
                                onClick={() => handleRejectTask('client', t.id)}>Respinge</button>
                            </>
                          )}
                          {t.client_posting_status && t.client_posting_status !== 'pending' && (
                            <StatusBadge status={t.client_posting_status} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ——— FINANCIAR ——— */}
      {!loading && !tabLoading && activeTab === 'financiar' && (
        <div className="col" style={{ gap: '1.5rem' }}>
          {/* Quick nav to payouts management page */}
          <div className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg-0)' }}>Cereri de retragere (payouts)</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>
                Aprobă/respinge/marchează ca plătite cererile de payout ale utilizatorilor.
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/financiar')}>
              <Icon name="dollar-sign" size={13} /> Deschide gestionare payouts
            </button>
          </div>

          {financiar?.summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
              {[
                { label: 'Comision câștigat total', value: financiar.summary.total_commission, color: 'var(--success)', icon: 'trending-up' },
                { label: 'Plătit experților total', value: financiar.summary.total_released_experts, color: 'var(--accent)', icon: 'users' },
                { label: 'Total volume escrow', value: financiar.summary.total_escrow_ever, color: 'var(--fg-1)', icon: 'lock' },
                { label: 'Escrow blocat activ', value: financiar.summary.currently_held, color: 'var(--warning)', icon: 'alert-circle' },
              ].map(x => (
                <div key={x.label} className="card" style={{ padding: '1rem 1.25rem' }}>
                  <div className="row" style={{ gap: '.5rem', marginBottom: '.5rem' }}>
                    <Icon name={x.icon} size={14} style={{ color: x.color }} />
                    <span style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{x.label}</span>
                  </div>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: x.color }}>
                    {fmtRON(parseFloat(x.value) || 0)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {financiar?.monthly?.length > 0 && (
            <div className="card">
              <div className="card-head"><div className="card-title">Lunar (ultimele 12 luni)</div></div>
              <table className="tbl">
                <thead>
                  <tr><th>Lună</th><th>Comision Claudiu</th><th>Plătit Experți</th><th>Nr. Eliberări</th></tr>
                </thead>
                <tbody>
                  {financiar.monthly.map((m, i) => (
                    <tr key={i}>
                      <td className="mono" style={{ fontWeight: 600 }}>{new Date(m.month).toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' })}</td>
                      <td className="mono" style={{ color: 'var(--success)', fontWeight: 600 }}>{fmtRON(parseFloat(m.commission) || 0)}</td>
                      <td className="mono" style={{ color: 'var(--accent)' }}>{fmtRON(parseFloat(m.expert_paid) || 0)}</td>
                      <td className="mono">{m.releases}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CSV Exports */}
          <div className="card">
            <div className="card-head"><div className="card-title">Export date</div></div>
            <div style={{ padding: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Financiar CSV', url: '/api/admin/export/financial', filename: 'escro-financiar.csv' },
                { label: 'Utilizatori CSV', url: '/api/admin/export/users', filename: 'escro-utilizatori.csv' },
                { label: 'Dispute CSV', url: '/api/admin/export/disputes', filename: 'escro-dispute.csv' },
              ].map(({ label, url, filename }) => (
                <button
                  key={url}
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                      if (!r.ok) throw new Error('Eroare server');
                      const blob = await r.blob();
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = filename;
                      a.click();
                    } catch { alert('Export eșuat. Încearcă din nou.'); }
                  }}
                >
                  <Icon name="download" size={12} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Eliberări milestone ({financiar?.releases?.length || 0})</div></div>
            {!financiar?.releases?.length ? (
              <EmptyState icon="trending-up" title="Nicio eliberare" description="Nu există milestone-uri eliberate." />
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Proiect</th><th>Milestone</th><th>Expert</th><th>Comision</th><th>Expert primește</th><th>Data</th></tr>
                </thead>
                <tbody>
                  {financiar.releases.map(r => (
                    <tr key={r.id} onClick={() => navigate(`/project/${r.project_id}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 600 }}>{r.project_title}</td>
                      <td style={{ fontSize: 12, color: 'var(--fg-2)' }}>{r.milestone_title}</td>
                      <td style={{ fontSize: 12 }}>{r.expert_name || '—'}</td>
                      <td className="mono" style={{ color: 'var(--success)', fontWeight: 600 }}>{fmtRON(parseFloat(r.claudiu_commission_amount_ron) || 0)}</td>
                      <td className="mono" style={{ color: 'var(--accent)' }}>{fmtRON(parseFloat(r.expert_amount_ron) || 0)}</td>
                      <td className="muted-2" style={{ fontSize: 12 }}>{fmtDate(r.released_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ——— CONTRACTE ——— */}
      {!loading && !tabLoading && activeTab === 'contracte' && (
        <div className="col" style={{ gap: '1.5rem' }}>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-1)' }}>
            {[
              { id: 'project', label: `Contracte proiecte (${contracts.projectContracts.length})` },
              { id: 'user', label: `Contracte utilizatori (${contracts.userContracts.length})` },
            ].map(t => (
              <div key={t.id} onClick={() => setContractTab(t.id)} style={{
                padding: '.5rem 1rem', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                color: contractTab === t.id ? 'var(--fg-0)' : 'var(--fg-3)',
                borderBottom: `2px solid ${contractTab === t.id ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -1,
              }}>{t.label}</div>
            ))}
          </div>

          {contractTab === 'project' && (
            <div className="card">
              <div className="card-head"><div className="card-title">Contracte de proiect</div></div>
              {contracts.projectContracts.length === 0 ? (
                <EmptyState icon="file-text" title="Niciun contract" description="Nu există contracte de proiect." />
              ) : (
                <table className="tbl">
                  <thead>
                    <tr><th>Proiect</th><th>Tip</th><th>Parte 1</th><th>Parte 2</th><th>Status</th><th>PDF</th><th>Data</th></tr>
                  </thead>
                  <tbody>
                    {contracts.projectContracts.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/project/${c.project_id}`)}>{c.project_title}</div>
                          {c.contract_number && <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{c.contract_number}</div>}
                        </td>
                        <td><span className="tag">{c.contract_type}</span></td>
                        <td>
                          <div style={{ fontSize: 12 }}>{c.party1_name || '—'}</div>
                          {c.party1_accepted && <span className="badge badge-green" style={{ fontSize: 10 }}>semnat</span>}
                        </td>
                        <td>
                          <div style={{ fontSize: 12 }}>{c.party2_name || '—'}</div>
                          {c.party2_accepted && <span className="badge badge-green" style={{ fontSize: 10 }}>semnat</span>}
                        </td>
                        <td>
                          <ContractStatusBadge p1={c.party1_accepted} p2={c.party2_accepted} />
                        </td>
                        <td>
                          {c.pdf_url ? (
                            <a href={withAuthToken(c.pdf_url)} target="_blank" rel="noreferrer"
                              className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                              <Icon name="download" size={11} /> PDF
                            </a>
                          ) : <span className="muted-2">—</span>}
                        </td>
                        <td className="muted-2" style={{ fontSize: 12 }}>{fmtDate(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {contractTab === 'user' && (
            <div className="card">
              <div className="card-head"><div className="card-title">Contracte utilizatori (ToS)</div></div>
              {contracts.userContracts.length === 0 ? (
                <EmptyState icon="file-text" title="Niciun contract" description="Nu există contracte ToS semnate." />
              ) : (
                <table className="tbl">
                  <thead>
                    <tr><th>Utilizator</th><th>Rol</th><th>Tip</th><th>IP</th><th>PDF</th><th>Semnat la</th></tr>
                  </thead>
                  <tbody>
                    {contracts.userContracts.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.user_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{c.user_email}</div>
                        </td>
                        <td><span className="tag">{c.user_role}</span></td>
                        <td><span className="tag">{c.contract_type}</span></td>
                        <td className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{c.ip_address || '—'}</td>
                        <td>
                          {c.contract_pdf_url ? (
                            <a href={withAuthToken(c.contract_pdf_url)} target="_blank" rel="noreferrer"
                              className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                              <Icon name="download" size={11} /> PDF
                            </a>
                          ) : <span className="muted-2">—</span>}
                        </td>
                        <td className="muted-2" style={{ fontSize: 12 }}>{fmtDate(c.signed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ——— DISPUTE ——— */}
      {!loading && !tabLoading && activeTab === 'dispute' && (
        <div className="col" style={{ gap: '1.5rem' }}>

        {/* Toate proiectele — click pentru analiză completă (excluse PM, care nu pot fi disputate) */}
        {(() => {
          const disputableProjects = allProjects.filter(p =>
            p.service_type !== 'project_management' && p.assignment_type !== 'pm_task'
          );
          return (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Proiecte direct & matching ({disputableProjects.length}) — click pentru analiză completă</div>
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
              {pendingDisputes.length > 0 && <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{pendingDisputes.length} dispute deschise</span>}
            </span>
          </div>
          {disputableProjects.length === 0 ? <EmptyState icon="folder" title="Niciun proiect" description="Nu există proiecte disputabile." /> : (
            <table className="tbl">
              <thead><tr><th>Titlu</th><th>Client</th><th>Prestator</th><th>Status</th><th>Buget</th><th>Data</th></tr></thead>
              <tbody>
                {disputableProjects.map(p => {
                  const hasDispute = disputes.some(d => d.project_id === p.id && (d.status === 'open' || d.status === 'pending'));
                  return (
                    <tr key={p.id} onClick={() => navigate(`/project/${p.id}`)} style={{ cursor: 'pointer', background: hasDispute ? 'var(--danger-bg)' : undefined }}>
                      <td>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {hasDispute && <Icon name="alert-triangle" size={12} style={{ color: 'var(--danger)' }} />}
                          {p.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{p.service_type ? serviceLabel(p.service_type) : '—'}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>{p.client_name || '—'}</td>
                      <td style={{ fontSize: 12 }}>{p.expert_name || p.company_name || '—'}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td className="mono" style={{ fontSize: 12 }}>{fmtRON(parseFloat(p.budget_ron) || 0)}</td>
                      <td className="muted-2" style={{ fontSize: 12 }}>{fmtDate(p.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
          );
        })()}

        <div className="card">
          <div className="card-head">
            <div className="card-title">Dispute milestone ({disputes.length})</div>
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{pendingDisputes.length} deschise</span>
          </div>
          {disputes.length === 0 ? (
            <EmptyState icon="alert-triangle" title="Nicio dispută" description="Nu există dispute de milestone." />
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>Milestone</th><th>Proiect</th><th>Ridicat de</th><th>Motiv</th><th>Status</th><th>Data</th><th>Acțiuni</th></tr>
              </thead>
              <tbody>
                {disputes.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.milestone_title}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{fmtRON(parseFloat(d.milestone_amount) || 0)}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5, cursor: 'pointer', color: 'var(--accent)' }}
                        onClick={() => navigate(`/project/${d.project_id}`)}>
                        {d.project_title}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>{d.raised_by_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{d.raised_by_email}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--fg-2)', maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.reason || '—'}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${d.status === 'resolved' ? 'badge-green' : 'badge-amber'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="muted-2" style={{ fontSize: 12 }}>{fmtDate(d.created_at)}</td>
                    <td>
                      {(d.status === 'open' || d.status === 'pending') && (
                        <div className="row" style={{ gap: '.375rem' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => {
                            setArbDispute({
                              id: d.id,
                              project_title: d.project_title || d.milestone_title,
                              amount_disputed: parseFloat(d.amount_disputed || d.escrow_amount || d.amount || 0),
                            });
                          }} title="Arbitraj rapid cu slider split client/prestator">
                            <Icon name="shield" size={11} /> Arbitraj
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            setDisputeModal(d);
                            setDisputeForm({ decision: '', release_amount: '', decision_type: 'partial' });
                          }} title="Vezi detalii dispută">
                            Detalii
                          </button>
                        </div>
                      )}
                      {d.status === 'resolved' && d.claudiu_decision && (
                        <div style={{ fontSize: 11, color: 'var(--fg-3)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.claudiu_decision}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </div>
      )}

      {/* ——— APLICAȚII MARKETPLACE ——— */}
      {!loading && !tabLoading && activeTab === 'applications' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Aplicații în așteptare ({pendingApplications.length})</div>
          </div>
          {pendingApplications.length === 0 ? (
            <EmptyState icon="send" title="Nicio aplicație" description="Nu există aplicații pending în acest moment." />
          ) : (
            <table className="tbl tbl-stack">
              <thead>
                <tr>
                  <th>Aplicant</th>
                  <th>Rol</th>
                  <th>Proiect</th>
                  <th>Client</th>
                  <th>Mesaj</th>
                  <th>Data</th>
                  <th>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {pendingApplications.map(app => (
                  <tr key={app.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{app.user_name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{app.user_email}</div>
                      {app.company && <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{app.company}</div>}
                    </td>
                    <td><span className="tag">{app.role}</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{app.project_title || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.project_description}
                      </div>
                    </td>
                    <td className="muted-2">{app.client_name || '—'}</td>
                    <td style={{ fontSize: 12, maxWidth: 240 }}>
                      {app.message ? (
                        <div style={{ background: 'var(--bg-1)', padding: '0.5rem 0.625rem', borderRadius: 'var(--r-sm)', fontStyle: 'italic' }}>
                          "{app.message.length > 100 ? app.message.slice(0, 100) + '...' : app.message}"
                        </div>
                      ) : <span style={{ color: 'var(--fg-3)' }}>—</span>}
                    </td>
                    <td className="muted-2" style={{ fontSize: 12 }}>{fmtDate(app.created_at)}</td>
                    <td>
                      <div className="row" style={{ gap: '.5rem' }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={async () => {
                            if (!window.confirm(`Aprobi candidatura ${app.user_name} la "${app.project_title}"? ${app.role === 'expert' ? 'Expertul' : 'Compania'} va fi asignată la proiect.`)) return;
                            try {
                              await apiClient.put(`/admin/task-requests/${app.id}/approve`);
                              setPendingApplications(p => p.filter(x => x.id !== app.id));
                            } catch (e) {
                              alert(e.response?.data?.error || e.response?.data?.message || 'Eroare la aprobare.');
                            }
                          }}
                        >
                          <Icon name="check" size={12} /> Aprobă
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={async () => {
                            if (!window.confirm(`Respingi candidatura ${app.user_name}?`)) return;
                            try {
                              await apiClient.put(`/admin/task-requests/${app.id}/reject`);
                              setPendingApplications(p => p.filter(x => x.id !== app.id));
                            } catch (e) {
                              alert(e.response?.data?.error || e.response?.data?.message || 'Eroare la respingere.');
                            }
                          }}
                        >
                          <Icon name="x" size={12} /> Respinge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ——— APELURI IDENTITATE ——— */}
      {!loading && !tabLoading && activeTab === 'calls' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Apeluri de validare identitate ({verificationCalls.length})</div>
            <span style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>Validare internă — KYC Stripe este separat</span>
          </div>
          {verificationCalls.length === 0 ? <EmptyState icon="phone" title="Niciun apel programat" description="Nu există apeluri de validare internă a identității." /> : (
            <table className="tbl">
              <thead><tr><th>Utilizator</th><th>Telefon</th><th>Status</th><th>Data</th><th>Acțiuni</th></tr></thead>
              <tbody>
                {verificationCalls.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name || c.email || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{c.email}</div>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{c.phone || '—'}</td>
                    <td><span className={`badge ${c.status === 'completed' ? 'badge-green' : 'badge-amber'}`}>{c.status}</span></td>
                    <td className="muted-2" style={{ fontSize: 12 }}>{fmtDate(c.created_at)}</td>
                    <td>
                      {(c.status === 'pending' || c.status === 'scheduled') && (
                        <button className="btn btn-success btn-sm" onClick={() => handleCompleteCall(c.id)}>Marchează completat</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ——— TRUST ——— */}
      {!loading && !tabLoading && activeTab === 'trust' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Trust Profiles ({trustProfiles.length})</div></div>
          {trustProfiles.length === 0 ? <EmptyState icon="shield" title="Niciun profil" description="" /> : (
            <table className="tbl">
              <thead>
                <tr><th>Expert</th><th>Trust Level</th><th>Trust Score</th><th>Identity pts</th><th>Reward pts</th><th>Acțiuni</th></tr>
              </thead>
              <tbody>
                {trustProfiles.map(p => (
                  <tr key={p.user_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.user_name || '—'}</div>
                      {p.user_company && (
                        <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>{p.user_company}</div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                        {p.user_email}{p.user_role ? ` · ${p.user_role}` : ''}
                      </div>
                    </td>
                    <td>
                      <TrustLevelBar level={p.trust_level || 1} />
                    </td>
                    <td>
                      <span className="mono" style={{ fontWeight: 600 }}>{p.trust_score || 0}</span>
                      <span style={{ color: 'var(--fg-3)', fontSize: 11 }}> pts</span>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{p.type2_points || 0} / 100</td>
                    <td className="mono" style={{ fontSize: 12 }}>{p.type1_points || 0}</td>
                    <td>
                      <div className="row" style={{ gap: '.25rem' }}>
                        {[1,2,3,4,5].map(lvl => (
                          <button key={lvl}
                            className={`btn btn-sm ${(p.trust_level || 1) === lvl ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ minWidth: 28, padding: '2px 6px', fontSize: 11 }}
                            onClick={() => handleUpdateTrustLevel(p.user_id, lvl)}
                          >{lvl}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ——— TASKS ——— */}
      {/* ——— REFERRAL ——— */}
      {!loading && !tabLoading && activeTab === 'referral' && (
        <div className="col" style={{ gap: '1.5rem' }}>

          {/* Generator */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Generează cod de invitație</div>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
                <div className="col" style={{ gap: '1rem' }}>
                  <div>
                    <label className="label">Nivelul de identitate acordat invitatului</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '.5rem', marginTop: '.5rem' }}>
                      {[1,2,3,4,5].map(lvl => {
                        const desc = {
                          1: 'Nivel de bază',
                          2: 'Nivel standard',
                          3: 'Nivel avansat',
                          4: 'Nivel înalt',
                          5: 'Nivel maxim',
                        };
                        const colors = { 1:'var(--fg-3)', 2:'var(--accent)', 3:'var(--warning)', 4:'var(--success)', 5:'#a855f7' };
                        const selected = vipForm.trust_level === lvl;
                        return (
                          <button key={lvl} onClick={() => setVipForm({ trust_level: lvl })} style={{
                            padding: '.75rem .5rem', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                            border: `2px solid ${selected ? colors[lvl] : 'var(--border-1)'}`,
                            background: selected ? `color-mix(in srgb, ${colors[lvl]} 12%, transparent)` : 'var(--bg-2)',
                            transition: 'all .15s',
                          }}>
                            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: colors[lvl] }}>{lvl}</div>
                            <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2 }}>{desc[lvl]}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ padding: '.75rem', background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--border-1)', fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.6 }}>
                    {vipForm.trust_level === 1 && 'Invitatul pornește la nivelul 1 de identitate (ca orice utilizator nou).'}
                    {vipForm.trust_level === 2 && 'Invitatul pornește la nivelul 2 de identitate — primește +20 puncte de identitate din referral.'}
                    {vipForm.trust_level === 3 && 'Invitatul pornește la nivelul 3 — identitate avansată de la start.'}
                    {vipForm.trust_level === 4 && 'Invitatul pornește la nivelul 4 — aproape complet verificat.'}
                    {vipForm.trust_level === 5 && 'Cod VIP — invitatul primește nivel maxim de identitate (80 puncte + trust score 100).'}
                  </div>

                  <button className="btn btn-primary" onClick={handleGenerateVipCode} disabled={generatingCode}
                    style={{ alignSelf: 'flex-start', padding: '.625rem 1.5rem' }}>
                    <Icon name="gift" size={14} />
                    {generatingCode ? 'Se generează...' : `Generează cod Nivel ${vipForm.trust_level}`}
                  </button>
                </div>

                {/* Result */}
                <div>
                  {generatedCode ? (
                    <div className="col" style={{ gap: '.75rem' }}>
                      <div style={{ fontSize: 12.5, color: 'var(--fg-2)' }}>Cod generat cu succes:</div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '.75rem',
                        padding: '1rem 1.25rem', background: 'var(--bg-2)', borderRadius: 10,
                        border: '2px solid var(--success)', cursor: 'pointer',
                      }} onClick={() => handleCopyCode(generatedCode.code)}>
                        <div className="mono" style={{ fontSize: 26, fontWeight: 800, letterSpacing: 4, color: 'var(--fg-0)', flex: 1 }}>
                          {generatedCode.code}
                        </div>
                        <Icon name={copiedCode === generatedCode.code ? 'check' : 'copy'} size={18}
                          style={{ color: copiedCode === generatedCode.code ? 'var(--success)' : 'var(--fg-3)', flexShrink: 0 }} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                        Nivel {generatedCode.trust_level} · Click pe cod pentru a copia
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      height: '100%', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px dashed var(--border-1)', borderRadius: 10,
                      color: 'var(--fg-3)', fontSize: 13,
                    }}>
                      Codul generat va apărea aici
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* All codes */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Toate codurile de invitație ({referralCodes.length})</div>
            </div>
            {referralCodes.length === 0 ? (
              <EmptyState icon="gift" title="Niciun cod" description="Nu există coduri generate." />
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Cod</th><th>Nivel</th><th>Tip</th><th>Utilizări</th><th>Max</th><th>Activ</th><th>Creat</th><th>Copiază</th></tr>
                </thead>
                <tbody>
                  {referralCodes.map(c => {
                    const levelColors = { 1:'var(--fg-3)', 2:'var(--accent)', 3:'var(--warning)', 4:'var(--success)', 5:'#a855f7' };
                    const lvl = parseInt(c.trust_level_bonus) || null;
                    return (
                      <tr key={c.id}>
                        <td>
                          <span className="mono" style={{ fontWeight: 700, fontSize: 14, letterSpacing: 2 }}>{c.code}</span>
                        </td>
                        <td>
                          {lvl ? (
                            <span className="mono" style={{ fontWeight: 700, color: levelColors[lvl] || 'var(--fg-1)' }}>
                              Nivel {lvl}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>Standard</span>
                          )}
                        </td>
                        <td>
                          <span className="tag">{lvl === 5 ? 'VIP' : lvl ? 'Admin' : 'User'}</span>
                        </td>
                        <td className="mono">{c.usage_count || 0}</td>
                        <td className="mono" style={{ color: 'var(--fg-3)' }}>{c.max_uses || '∞'}</td>
                        <td>
                          <span className={`badge ${c.is_active ? 'badge-green' : ''}`}>
                            {c.is_active ? 'Activ' : 'Inactiv'}
                          </span>
                        </td>
                        <td className="muted-2" style={{ fontSize: 12 }}>{fmtDate(c.created_at)}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleCopyCode(c.code)}>
                            <Icon name={copiedCode === c.code ? 'check' : 'copy'} size={12} />
                            {copiedCode === c.code ? 'Copiat' : 'Copiază'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ——— AUDIT LOG ——— */}
      {!loading && !tabLoading && activeTab === 'audit' && (
        <AuditLogTab />
      )}

      {/* ——— TERMS MANAGEMENT ——— */}
      {!loading && !tabLoading && activeTab === 'terms' && (
        <TermsAdminTab />
      )}

      {/* ——— Edit Project Modal (admin proposes changes to pending project) ——— */}
      {editProjectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setEditProjectModal(null); }}>
          <div className="card" style={{ width: 560, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div className="card-title" style={{ marginBottom: '.5rem' }}>Editează proiect înainte de aprobare</div>
            {editProjectModal.last_user_feedback && (
              <div style={{
                padding: '.75rem 1rem',
                background: 'var(--warning-bg)',
                border: '1px solid var(--warning-border)',
                borderRadius: 'var(--r-sm)',
                marginBottom: '1rem',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                  ⚠ Feedback de la utilizator (a respins ultima propunere)
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-1)', whiteSpace: 'pre-wrap' }}>
                  {editProjectModal.last_user_feedback}
                </div>
              </div>
            )}
            <div style={{ padding: '.625rem .75rem', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--accent-hi)', marginBottom: '1rem' }}>
              ℹ Utilizatorul va fi notificat că ai propus modificări și trebuie să confirme înainte ca proiectul să fie activ.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
              <div>
                <label className="label">Titlu</label>
                <input className="input" type="text" value={editProjectModal.title}
                  onChange={e => setEditProjectModal(m => ({ ...m, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Descriere</label>
                <textarea className="input" rows={4} value={editProjectModal.description}
                  onChange={e => setEditProjectModal(m => ({ ...m, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                <div>
                  <label className="label">Buget (RON)</label>
                  <input className="input" type="number" min="0" value={editProjectModal.budget_ron}
                    onChange={e => setEditProjectModal(m => ({ ...m, budget_ron: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Timeline (zile)</label>
                  <input className="input" type="number" min="1" value={editProjectModal.timeline_days}
                    onChange={e => setEditProjectModal(m => ({ ...m, timeline_days: e.target.value }))} />
                </div>
              </div>
              {editProjectModal.milestones.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
                    <label className="label" style={{ margin: 0 }}>Milestones ({editProjectModal.milestones.length})</label>
                    <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                      Total: {editProjectModal.milestones.reduce((s, m) => s + parseFloat(m.percentage_of_budget || 0), 0).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', maxHeight: 260, overflowY: 'auto', padding: '.5rem', background: 'var(--bg-2)', borderRadius: 'var(--r-sm)' }}>
                    {editProjectModal.milestones.map((m, i) => (
                      <div key={m.id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 80px', gap: '.5rem', alignItems: 'center' }}>
                        <input className="input" type="text" placeholder="Titlu milestone" value={m.title}
                          style={{ fontSize: 12 }}
                          onChange={e => setEditProjectModal(p => {
                            const ms = [...p.milestones]; ms[i] = { ...ms[i], title: e.target.value }; return { ...p, milestones: ms };
                          })} />
                        <input className="input" type="text" placeholder="Livrabil" value={m.deliverable_description}
                          style={{ fontSize: 12 }}
                          onChange={e => setEditProjectModal(p => {
                            const ms = [...p.milestones]; ms[i] = { ...ms[i], deliverable_description: e.target.value }; return { ...p, milestones: ms };
                          })} />
                        <input className="input" type="number" min="0" max="100" step="0.5" placeholder="%" value={m.percentage_of_budget}
                          style={{ fontSize: 12 }}
                          onChange={e => setEditProjectModal(p => {
                            const ms = [...p.milestones]; ms[i] = { ...ms[i], percentage_of_budget: e.target.value }; return { ...p, milestones: ms };
                          })} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditProjectModal(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleSubmitEdit}>Trimite spre confirmare</button>
            </div>
          </div>
        </div>
      )}

      {/* ——— Project History Modal ——— */}
      {historyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setHistoryModal(null); }}>
          <div className="card" style={{ width: 640, maxHeight: '85vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div className="card-title" style={{ marginBottom: '.5rem' }}>Istoric modificări</div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: '1rem' }}>
              {historyModal.project.title}
            </div>
            {historyModal.entries.length === 0 ? (
              <EmptyState icon="clock" title="Niciun istoric" description="Nu există modificări înregistrate pentru acest proiect." />
            ) : (
              <table className="tbl">
                <thead><tr><th>Data</th><th>Actor</th><th>Acțiune</th><th>Câmp</th><th>De la → La</th></tr></thead>
                <tbody>
                  {historyModal.entries.map(h => (
                    <tr key={h.id}>
                      <td className="muted-2" style={{ fontSize: 11 }}>{fmtDate(h.created_at)}</td>
                      <td style={{ fontSize: 12 }}>
                        {h.actor_name || '—'}
                        {h.actor_role && <span className="tag" style={{ fontSize: 9, marginLeft: 4 }}>{h.actor_role}</span>}
                      </td>
                      <td><span className="tag" style={{ fontSize: 10 }}>{h.action}</span></td>
                      <td style={{ fontSize: 12, fontFamily: 'var(--f-mono)' }}>{h.field_name || '—'}</td>
                      <td style={{ fontSize: 11, color: 'var(--fg-2)', maxWidth: 260 }}>
                        {h.field_name ? (
                          <>
                            <span style={{ textDecoration: 'line-through', color: 'var(--fg-3)' }}>{(h.old_value || '').slice(0, 60)}</span>
                            <span style={{ margin: '0 .5rem' }}>→</span>
                            <span style={{ color: 'var(--success)' }}>{(h.new_value || '').slice(0, 60)}</span>
                          </>
                        ) : (
                          h.details ? JSON.stringify(h.details) : '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setHistoryModal(null)}>Închide</button>
            </div>
          </div>
        </div>
      )}

      {/* ——— Commission Modal ——— */}
      {showCommissionModal && (
        <Modal onClose={() => setShowCommissionModal(false)}>
          <div className="card-title" style={{ marginBottom: '1rem' }}>Setează comision</div>
          <div className="col" style={{ gap: '.875rem' }}>
            <div>
              <label className="label">Tip serviciu</label>
              <select className="input" value={commissionForm.service_type}
                onChange={e => setCommissionForm(p => ({ ...p, service_type: e.target.value }))}>
                <option value="matching">Matching</option>
                <option value="project_management">Project Management</option>
                <option value="consulting">Consulting</option>
              </select>
            </div>
            <div>
              <label className="label">Comision (%)</label>
              <input className="input" type="number" min="0" max="50"
                value={commissionForm.commission_percent}
                onChange={e => setCommissionForm(p => ({ ...p, commission_percent: Number(e.target.value) }))} />
            </div>
            <div className="row" style={{ gap: '.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowCommissionModal(false)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleSubmitCommission}>Aprobă proiectul</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ——— Dispute Resolve Modal ——— */}
      {disputeModal && (
        <Modal onClose={() => setDisputeModal(null)}>
          <div className="card-title" style={{ marginBottom: '.25rem' }}>Rezolvă disputa</div>
          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: '1rem' }}>
            {disputeModal.milestone_title} · {disputeModal.project_title}
          </div>
          <div className="col" style={{ gap: '.875rem' }}>
            <div style={{ padding: '.75rem', background: 'var(--bg-2)', borderRadius: 6, fontSize: 12.5, color: 'var(--fg-2)', border: '1px solid var(--border-1)' }}>
              <strong style={{ color: 'var(--fg-1)' }}>Motiv invocat:</strong> {disputeModal.reason || '—'}
            </div>
            {/* Evidence files */}
            {Array.isArray(disputeModal.evidence_files) && disputeModal.evidence_files.length > 0 && (
              <div>
                <label className="label">Dovezi trimise ({disputeModal.evidence_files.length})</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.375rem' }}>
                  {disputeModal.evidence_files.map((f, i) => (
                    <a key={i} href={withAuthToken(f.url)} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, padding: '.25rem .625rem', background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 4, color: 'var(--accent-hi)', textDecoration: 'none', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📎 {f.name || `Fișier ${i+1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="label">Tip decizie</label>
              <select className="input"
                value={disputeForm.decision_type || 'partial'}
                onChange={e => setDisputeForm(p => ({ ...p, decision_type: e.target.value }))}>
                <option value="full">Eliberare integrală (expertul câștigă)</option>
                <option value="partial">Eliberare parțială</option>
                <option value="rejected">Fonduri returnate (clientul câștigă)</option>
                <option value="refund">Refund complet (escrow returnat)</option>
              </select>
            </div>
            <div>
              <label className="label">Decizie (text explicativ)</label>
              <textarea className="input" rows={3} placeholder="Ex: Expertul livrează conform contractului. Se eliberează suma integral." style={{ resize: 'vertical' }}
                value={disputeForm.decision}
                onChange={e => setDisputeForm(p => ({ ...p, decision: e.target.value }))} />
            </div>
            <div>
              <label className="label">
                Sumă de eliberat (RON)
                {disputeModal.milestone_amount > 0 && (
                  <span style={{ fontWeight: 400, color: 'var(--fg-3)', marginLeft: '.5rem' }}>
                    — total milestone: {parseFloat(disputeModal.milestone_amount).toLocaleString('ro-RO')} RON
                  </span>
                )}
              </label>
              <input className="input" type="number" min="0"
                placeholder={disputeForm.decision_type === 'full' ? String(disputeModal.milestone_amount || '') : 'Suma parțială'}
                value={disputeForm.release_amount}
                onChange={e => setDisputeForm(p => ({ ...p, release_amount: e.target.value }))} />
            </div>
            <div className="row" style={{ gap: '.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDisputeModal(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleResolveDispute}
                disabled={!disputeForm.decision.trim() || disputeBusy}>
                {disputeBusy ? 'Se procesează...' : 'Marchează rezolvat'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Assign Expert + Company Modal ── */}
      {showAssignModal && assignTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setShowAssignModal(false)}>
          <div className="card" style={{ width: 460, padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="row-between" style={{ marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg-0)' }}>Asignare prestatori</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>{assignTarget.title}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAssignModal(false)}>✕</button>
            </div>
            <div className="col" style={{ gap: '1rem' }}>
              <div>
                <label className="label">Expert (opțional)</label>
                <select className="input" value={assignForm.expert_id}
                  onChange={e => setAssignForm(p => ({ ...p, expert_id: e.target.value }))}>
                  <option value="">— Fără expert —</option>
                  {allUsers.filter(u => u.role === 'expert' && u.verification_date && u.kyc_status !== 'rejected').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.expertise || u.email}){u.kyc_status !== 'verified' ? ' · KYC neîncheiat' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Companie (opțional)</label>
                <select className="input" value={assignForm.company_id}
                  onChange={e => setAssignForm(p => ({ ...p, company_id: e.target.value }))}>
                  <option value="">— Fără companie —</option>
                  {allUsers.filter(u => u.role === 'company' && u.verification_date && u.kyc_status !== 'rejected').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.company || u.email}){u.kyc_status !== 'verified' ? ' · KYC neîncheiat' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row" style={{ gap: '.75rem', justifyContent: 'flex-end', marginTop: '.5rem' }}>
                <button className="btn btn-ghost" onClick={() => setShowAssignModal(false)}>Anulează</button>
                <button className="btn btn-primary" onClick={handleSubmitAssign}
                  disabled={!assignForm.expert_id && !assignForm.company_id}>
                  <Icon name="user-check" size={13} /> Asignează
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail / Edit Modal ── */}
      {detailModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'var(--bg-1)', borderRadius:12, width:'100%', maxWidth:720, maxHeight:'90vh', overflow:'auto', padding:'1.5rem', position:'relative' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <div>
                <div style={{ fontSize:11, color:'var(--fg-3)', textTransform:'uppercase', letterSpacing:1 }}>Detalii task</div>
                <div style={{ fontSize:18, fontWeight:700 }}>{detailModal.title}</div>
              </div>
              <div className="row" style={{ gap:'.5rem' }}>
                {!editMode && (
                  <button className="btn btn-primary btn-sm" onClick={() => setEditMode(true)}>
                    <Icon name="edit-2" size={12}/> Editează
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => { setDetailModal(null); setEditMode(false); }}>✕</button>
              </div>
            </div>

            {loadingDetail ? <div>Se încarcă...</div> : editMode ? (
              <div className="col" style={{ gap:'1rem' }}>
                <div>
                  <label className="label">Titlu</label>
                  <input className="input" value={editForm.title || ''} onChange={e => setEditForm(f => ({...f, title: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Descriere</label>
                  <textarea className="input" rows={5} value={editForm.description || ''} onChange={e => setEditForm(f => ({...f, description: e.target.value}))} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div>
                    <label className="label">Buget (RON)</label>
                    <input className="input" type="number" value={editForm.budget_ron || ''} onChange={e => setEditForm(f => ({...f, budget_ron: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Timeline (zile)</label>
                    <input className="input" type="number" value={editForm.timeline_days || ''} onChange={e => setEditForm(f => ({...f, timeline_days: e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label className="label">Milestone-uri</label>
                  {detailMilestones.map((m, idx) => (
                    <div key={idx} style={{ background:'var(--bg-2)', borderRadius:8, padding:'.75rem', marginBottom:'.5rem', border:'1px solid var(--border-1)' }}>
                      <input className="input" style={{ marginBottom:'.5rem' }} placeholder="Titlu milestone" value={m.title || ''} onChange={e => setDetailMilestones(ms => ms.map((x,i) => i===idx ? {...x, title: e.target.value} : x))} />
                      <textarea className="input" rows={2} placeholder="Descriere livrabil" value={m.deliverable_description || ''} onChange={e => setDetailMilestones(ms => ms.map((x,i) => i===idx ? {...x, deliverable_description: e.target.value} : x))} />
                      <div style={{ display:'flex', gap:'.5rem', marginTop:'.5rem', alignItems:'center' }}>
                        <input className="input" type="number" placeholder="% buget" style={{ width:100 }} value={m.percentage_of_budget || ''} onChange={e => setDetailMilestones(ms => ms.map((x,i) => i===idx ? {...x, percentage_of_budget: e.target.value, amount_ron: Math.round(parseFloat(editForm.budget_ron||0) * parseFloat(e.target.value||0) / 100 * 100)/100} : x))} />
                        <span style={{ fontSize:12, color:'var(--fg-3)' }}>{fmtRON(m.amount_ron || 0)}</span>
                        <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)', marginLeft:'auto' }} onClick={() => setDetailMilestones(ms => ms.filter((_,i) => i!==idx))}>✕</button>
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" onClick={() => setDetailMilestones(ms => [...ms, { title:'', deliverable_description:'', percentage_of_budget:'', amount_ron:0 }])}>
                    <Icon name="plus" size={12}/> Adaugă milestone
                  </button>
                </div>
                <div className="row" style={{ gap:'.75rem', justifyContent:'flex-end', borderTop:'1px solid var(--border-1)', paddingTop:'1rem' }}>
                  <button className="btn btn-ghost" onClick={() => setEditMode(false)}>Anulează</button>
                  <button className="btn btn-primary" onClick={handleSubmitAdminEdit}>Salvează și notifică userul</button>
                </div>
              </div>
            ) : (
              <div className="col" style={{ gap:'1rem' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div className="card" style={{ padding:'.75rem' }}>
                    <div style={{ fontSize:11, color:'var(--fg-3)' }}>Tip</div>
                    <div style={{ fontWeight:600 }}>{detailModal.is_pm_task || detailModal.assignment_type === 'pm_task' ? 'Project Management' : (detailModal.service_type ? serviceLabel(detailModal.service_type) : (detailModal.assignment_type || '—'))}</div>
                  </div>
                  <div className="card" style={{ padding:'.75rem' }}>
                    <div style={{ fontSize:11, color:'var(--fg-3)' }}>Status</div>
                    <StatusBadge status={detailModal.status} />
                  </div>
                  <div className="card" style={{ padding:'.75rem' }}>
                    <div style={{ fontSize:11, color:'var(--fg-3)' }}>Buget</div>
                    <div className="mono" style={{ fontWeight:700 }}>{fmtRON(detailModal.budget_ron || 0)}</div>
                  </div>
                  <div className="card" style={{ padding:'.75rem' }}>
                    <div style={{ fontSize:11, color:'var(--fg-3)' }}>Timeline</div>
                    <div style={{ fontWeight:600 }}>{detailModal.timeline_days || '—'} zile</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--fg-3)', marginBottom:4 }}>Descriere</div>
                  <div style={{ background:'var(--bg-2)', padding:'.75rem', borderRadius:8, fontSize:14, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{detailModal.description || '—'}</div>
                </div>
                {detailMilestones.length > 0 && (
                  <div>
                    <div style={{ fontSize:11, color:'var(--fg-3)', marginBottom:4 }}>Milestone-uri ({detailMilestones.length})</div>
                    {detailMilestones.map((m, idx) => (
                      <div key={idx} style={{ background:'var(--bg-2)', borderRadius:8, padding:'.75rem', marginBottom:'.5rem', border:'1px solid var(--border-1)' }}>
                        <div style={{ fontWeight:600, marginBottom:4 }}>{idx+1}. {m.title}</div>
                        {m.deliverable_description && <div style={{ fontSize:13, color:'var(--fg-2)', marginBottom:4 }}>{m.deliverable_description}</div>}
                        <div style={{ fontSize:12, color:'var(--fg-3)' }}>{m.percentage_of_budget}% · {fmtRON(m.amount_ron || 0)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {detailModal.status === 'pending_admin_approval' && (
                  <div className="row" style={{ gap:'.75rem', justifyContent:'flex-end', borderTop:'1px solid var(--border-1)', paddingTop:'1rem' }}>
                    <button className="btn btn-success" onClick={() => { handleApproveProject(detailModal); setDetailModal(null); }}>Aprobă</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create Task for Client Modal ── */}
      {showCreateTaskModal && createTaskTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setShowCreateTaskModal(false)}>
          <div className="card" style={{ width: 520, padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="row-between" style={{ marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg-0)' }}>Creare task pentru client</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>
                  PM Task: {createTaskTarget.title} · Necesită aprobare client
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateTaskModal(false)}>✕</button>
            </div>
            <div className="col" style={{ gap: '1rem' }}>
              <div>
                <label className="label">Titlu task *</label>
                <input className="input" value={createTaskForm.title} placeholder="Ex: Design UI aplicație mobilă"
                  onChange={e => setCreateTaskForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Descriere *</label>
                <textarea className="input" rows={3} value={createTaskForm.description} placeholder="Detaliază ce trebuie realizat..."
                  onChange={e => setCreateTaskForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                <div>
                  <label className="label">Buget (RON)</label>
                  <input className="input" type="number" value={createTaskForm.budget_ron}
                    onChange={e => setCreateTaskForm(p => ({ ...p, budget_ron: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Termen (zile)</label>
                  <input className="input" type="number" value={createTaskForm.timeline_days}
                    onChange={e => setCreateTaskForm(p => ({ ...p, timeline_days: parseInt(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="label">Tip task</label>
                <div className="row" style={{ gap: '.75rem' }}>
                  {[{ v: 'matching', l: 'Matching', d: 'Admin asignează prestator' }, { v: 'direct', l: 'Direct', d: 'Prestator specificat' }].map(o => (
                    <div key={o.v} onClick={() => setCreateTaskForm(p => ({ ...p, service_type: o.v }))}
                      style={{ flex: 1, padding: '.75rem', borderRadius: 8, border: `1.5px solid ${createTaskForm.service_type === o.v ? 'var(--accent)' : 'var(--border-1)'}`, cursor: 'pointer', background: createTaskForm.service_type === o.v ? 'var(--accent-bg)' : 'var(--bg-1)' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg-0)' }}>{o.l}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{o.d}</div>
                    </div>
                  ))}
                </div>
              </div>
              {createTaskForm.service_type === 'direct' && (
                <>
                  <div>
                    <label className="label">Expert (pentru Direct)</label>
                    <select className="input" value={createTaskForm.expert_id}
                      onChange={e => setCreateTaskForm(p => ({ ...p, expert_id: e.target.value }))}>
                      <option value="">— Selectează expert —</option>
                      {allUsers.filter(u => u.role === 'expert' && u.kyc_status === 'verified').map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Companie (pentru Direct)</label>
                    <select className="input" value={createTaskForm.company_id}
                      onChange={e => setCreateTaskForm(p => ({ ...p, company_id: e.target.value }))}>
                      <option value="">— Selectează companie —</option>
                      {allUsers.filter(u => u.role === 'company' && u.kyc_status === 'verified').map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.company})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {/* Milestones */}
              <div>
                <div className="row-between" style={{ marginBottom: '.625rem' }}>
                  <label className="label" style={{ margin: 0 }}>Milestones * <span style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 400 }}>(suma procentelor = 100%)</span></label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => addMilestone(setCreateTaskForm)}>
                    <Icon name="plus" size={12} /> Adaugă
                  </button>
                </div>
                <div className="col" style={{ gap: '.5rem' }}>
                  {createTaskForm.milestones.map((m, i) => (
                    <div key={i} style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '.75rem' }}>
                      <div className="row-between" style={{ marginBottom: '.5rem' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>MS {i + 1}</span>
                        {createTaskForm.milestones.length > 1 && (
                          <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', padding: '2px 6px' }} onClick={() => removeMilestone(setCreateTaskForm, i)}>✕</button>
                        )}
                      </div>
                      <div className="col" style={{ gap: '.5rem' }}>
                        <input className="input" style={{ fontSize: 13 }} placeholder="Titlu milestone *" value={m.title}
                          onChange={e => updateMilestone(setCreateTaskForm, i, 'title', e.target.value)} />
                        <input className="input" style={{ fontSize: 13 }} placeholder="Descriere livrabil" value={m.deliverable_description}
                          onChange={e => updateMilestone(setCreateTaskForm, i, 'deliverable_description', e.target.value)} />
                        <div className="row" style={{ gap: '.5rem', alignItems: 'center' }}>
                          <input className="input" style={{ fontSize: 13, width: 80 }} type="number" min="1" max="100" placeholder="%" value={m.percentage_of_budget}
                            onChange={e => updateMilestone(setCreateTaskForm, i, 'percentage_of_budget', e.target.value)} />
                          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>% din buget</span>
                          {createTaskForm.budget_ron && m.percentage_of_budget && (
                            <span style={{ fontSize: 12, color: 'var(--success)', fontFamily: 'var(--f-mono)', marginLeft: 'auto' }}>
                              ≈ {Math.round(parseFloat(createTaskForm.budget_ron) * parseFloat(m.percentage_of_budget) / 100).toLocaleString()} RON
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {(() => {
                  const total = createTaskForm.milestones.reduce((s, m) => s + (parseFloat(m.percentage_of_budget) || 0), 0);
                  return total !== 100 && total > 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>Suma curentă: {total}% (trebuie să fie 100%)</div>
                  ) : total === 100 ? (
                    <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 6 }}>✓ 100% alocat</div>
                  ) : null;
                })()}
              </div>

              <div style={{ padding: '.625rem .875rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 8, fontSize: 12, color: 'var(--warning)' }}>
                Taskul va fi trimis clientului pentru aprobare înainte de a deveni activ.
              </div>
              <div className="row" style={{ gap: '.75rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowCreateTaskModal(false)}>Anulează</button>
                <button className="btn btn-primary" onClick={handleSubmitCreateTask}
                  disabled={!createTaskForm.title || !createTaskForm.description}>
                  <Icon name="send" size={13} /> Trimite spre aprobare client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────

// Relative time formatter (e.g. "5m", "2h", "1z") for activity timelines
function fmtRelTime(d) {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'acum';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}z`;
  return fmtDate(d);
}

// Sparkline — pure CSS bars driven by an array of numbers
function Sparkline({ data = [], color = 'var(--accent)', height = 28 }) {
  const max = Math.max(...data, 1);
  return (
    <div className="spark-grid" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} className="spark-bar" style={{ height: `${(v / max) * 100}%`, background: color }} />
      ))}
    </div>
  );
}

// Toast notifications (transient feedback)
function Toast({ toast }) {
  const icon = toast.tone === 'success' ? 'check' : toast.tone === 'danger' ? 'alert-triangle' : 'sparkle';
  return (
    <div className={`toast ${toast.tone || 'info'}`}>
      <div className="toast-icon"><Icon name={icon} size={12} /></div>
      <div style={{ flex: 1 }}>
        <div className="toast-title">{toast.title}</div>
        {toast.msg && <div className="toast-msg">{toast.msg}</div>}
      </div>
    </div>
  );
}
function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack">
      {toasts.map(t => <Toast key={t.id} toast={t} />)}
    </div>
  );
}

// Urgent action card — large clickable hero in Overview tab
function UrgentCard({ tone, icon, num, label, sub, cta, onClick }) {
  return (
    <div className={`urgent-card ${tone}`} onClick={onClick}>
      <div className="urgent-icon"><Icon name={icon} size={18} /></div>
      <div className="urgent-body">
        <div className="urgent-num">{num}</div>
        <div className="urgent-label">{label}</div>
        {sub && <div className="urgent-sub">{sub}</div>}
        {cta && (
          <div className="urgent-cta">
            {cta} <Icon name="arrow-right" size={11} />
          </div>
        )}
      </div>
    </div>
  );
}

// Stat card with sparkline + delta
function AdmStat({ label, value, unit, delta, deltaTone, icon, spark, sparkColor }) {
  return (
    <div className="adm-stat">
      <div className="adm-stat-h">
        <div className="adm-stat-l">{label}</div>
        {icon && <div className="adm-stat-i"><Icon name={icon} size={13} /></div>}
      </div>
      <div className="adm-stat-v">
        {value}{unit && <span className="adm-stat-u">{unit}</span>}
      </div>
      <div className="adm-stat-foot">
        {delta && (
          <span className={`adm-stat-delta ${deltaTone || 'up'}`}>
            <Icon name={deltaTone === 'down' ? 'arrow-down' : 'arrow-up'} size={10} />
            {delta}
          </span>
        )}
        {spark && <Sparkline data={spark} color={sparkColor} height={26} />}
      </div>
    </div>
  );
}

// Audit timeline row — used in Overview activity feed
const AUDIT_TYPE_META = {
  user_approve:         { icon: 'check',           tone: 'success', verb: 'a aprobat utilizatorul' },
  user_reject:          { icon: 'x',               tone: 'danger',  verb: 'a respins utilizatorul' },
  project_approve:      { icon: 'check',           tone: 'success', verb: 'a aprobat proiectul' },
  application_approve:  { icon: 'check',           tone: 'success', verb: 'a aprobat aplicația' },
  dispute_open:         { icon: 'alert-triangle',  tone: 'danger',  verb: 'a deschis dispută pe' },
  dispute_resolve:      { icon: 'shield',          tone: 'success', verb: 'a rezolvat disputa' },
  payout_processed:     { icon: 'wallet',          tone: 'info',    verb: 'a procesat plata către' },
  commission_set:       { icon: 'trending-up',     tone: 'warning', verb: 'a setat comision pe' },
  kyc_schedule:         { icon: 'phone',           tone: 'info',    verb: 'a programat apel KYC cu' },
};
function AuditTimelineRow({ ev }) {
  const meta = AUDIT_TYPE_META[ev.type] || AUDIT_TYPE_META.user_approve;
  return (
    <div className="audit-row">
      <div className={`audit-dot ${meta.tone}`}><Icon name={meta.icon} size={11} /></div>
      <div className="audit-line-1">
        <span className="audit-actor">{ev.actor || ev.admin_email || 'system'}</span>
        <span className="audit-verb">{meta.verb}</span>
        <span className="audit-target">{ev.target || ev.target_label || '—'}</span>
        <span className="audit-time">{fmtRelTime(ev.when || ev.created_at)}</span>
      </div>
      {(ev.detail || ev.description) && (
        <div className="audit-detail">{ev.detail || ev.description}</div>
      )}
    </div>
  );
}
function AuditTimeline({ items, limit }) {
  const list = limit ? (items || []).slice(0, limit) : (items || []);
  if (!list.length) {
    return <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: 13, color: 'var(--fg-3)' }}>Niciun eveniment recent.</div>;
  }
  return <div className="audit-tl">{list.map((ev, idx) => <AuditTimelineRow key={ev.id || idx} ev={ev} />)}</div>;
}

// Arbitrage modal — used when admin resolves a dispute with a custom split
function ArbitrageModal({ dispute, onClose, onResolve, busy }) {
  const [decision, setDecision] = useState('split');
  const [splitClient, setSplitClient] = useState(50);
  const [note, setNote] = useState('');
  if (!dispute) return null;

  const amount = parseFloat(dispute.amount_disputed || dispute.escrow_amount || dispute.amount || 0);
  const splitExpert = 100 - splitClient;
  const clientAmt = Math.round(amount * splitClient / 100);
  const expertAmt = Math.round(amount - clientAmt);

  const submit = () => {
    if (!note.trim()) return; // require admin note for audit
    onResolve({
      dispute_id: dispute.id,
      decision,
      split: { client: splitClient, expert: splitExpert },
      client_amount: clientAmt,
      expert_amount: expertAmt,
      note,
    });
  };

  return (
    <div className="adm-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="adm-modal">
        <div className="adm-modal-h">
          <div>
            <div className="adm-modal-h-title">Arbitraj dispută</div>
            <div className="adm-modal-h-sub">
              {dispute.id ? `#${String(dispute.id).slice(0, 8)}` : ''} {dispute.project_title || ''}
            </div>
          </div>
          <button className="adm-modal-close" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="adm-modal-b">
          <div style={{ marginBottom: 18 }}>
            <div className="label">Decizie</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { id: 'client', label: 'Către client',   sub: '100% retur' },
                { id: 'split',  label: 'Împărțit',       sub: 'Pro-rata' },
                { id: 'expert', label: 'Către prestator', sub: '100% eliberat' },
              ].map(opt => (
                <div key={opt.id} onClick={() => setDecision(opt.id)} style={{
                  padding: '0.75rem', borderRadius: 'var(--r-md)', cursor: 'pointer',
                  border: `1px solid ${decision === opt.id ? 'var(--accent-border)' : 'var(--border-2)'}`,
                  background: decision === opt.id ? 'var(--accent-bg)' : 'var(--bg-card)',
                  textAlign: 'center', transition: 'all 120ms',
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: decision === opt.id ? 'var(--accent-hi)' : 'var(--fg-1)' }}>{opt.label}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 2, fontFamily: 'var(--f-mono)' }}>{opt.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {decision === 'split' && (
            <div style={{ marginBottom: 18 }}>
              <div className="label">Distribuție</div>
              <div style={{ background: 'var(--bg-1)', padding: '1rem', borderRadius: 'var(--r-md)', border: '1px solid var(--border-1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 8, color: 'var(--fg-2)' }}>
                  <span>Client: <strong style={{ color: 'var(--fg-0)' }}>{splitClient}%</strong> · {fmtRON(clientAmt)}</span>
                  <span>Prestator: <strong style={{ color: 'var(--fg-0)' }}>{splitExpert}%</strong> · {fmtRON(expertAmt)}</span>
                </div>
                <input
                  type="range" min="0" max="100" step="5" value={splitClient}
                  onChange={e => setSplitClient(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>
            </div>
          )}

          <div>
            <div className="label">Notă admin (obligatorie pentru audit) *</div>
            <textarea
              className="input"
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Motivează decizia — va fi vizibilă ambelor părți și înregistrată în audit log."
            />
          </div>

          <div style={{ marginTop: 14, padding: '0.75rem 0.875rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--warning)' }}>
            <Icon name="alert-triangle" size={12} style={{ verticalAlign: -1, marginRight: 5 }} />
            Această acțiune este irevocabilă. Suma din escrow va fi distribuită conform deciziei.
          </div>
        </div>
        <div className="adm-modal-f">
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Anulează</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy || !note.trim()}>
            <Icon name="shield" size={13} /> {busy ? 'Se procesează…' : 'Aplică decizia'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: 440, padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function TrustLevelBar({ level }) {
  const colors = ['', 'var(--fg-3)', 'var(--accent)', 'var(--warning)', 'var(--success)', 'var(--success)'];
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 12, height: 12, borderRadius: 2,
          background: i <= level ? (colors[level] || 'var(--accent)') : 'var(--border-1)',
        }} />
      ))}
      <span className="mono" style={{ fontSize: 11, color: 'var(--fg-2)', marginLeft: 4 }}>Lvl {level}</span>
    </div>
  );
}

function ContractStatusBadge({ p1, p2 }) {
  if (p1 && p2) return <span className="badge badge-green">Semnat complet</span>;
  if (p1 || p2) return <span className="badge badge-amber">Parțial semnat</span>;
  return <span className="badge">Nesemnat</span>;
}

const ADMIN_EVENT_META = {
  milestone_delivered: { icon: 'upload', color: 'var(--accent)', bg: 'rgba(99,102,241,.12)', label: 'a livrat' },
  milestone_approved: { icon: 'check', color: 'var(--success)', bg: 'rgba(34,197,94,.12)', label: 'a aprobat' },
  funds_released: { icon: 'trending-up', color: 'var(--success)', bg: 'rgba(34,197,94,.12)', label: 'eliberare fonduri' },
  escrow_deposit: { icon: 'lock', color: 'var(--warning)', bg: 'rgba(234,179,8,.12)', label: 'depus escrow' },
  user_registered: { icon: 'user-plus', color: 'var(--accent)', bg: 'rgba(99,102,241,.12)', label: 's-a înregistrat' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? 'oră' : 'ore'}`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'ieri';
  if (days < 7) return `${days} zile`;
  return new Date(dateStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
}

function AdminActivityPanel({ activity, navigate, hasMore, loading, onLoadMore }) {
  return (
    <div className="card" style={{ position: 'sticky', top: 80 }}>
      <div className="card-head">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Activitate platformă
          {activity.length > 0 && (
            <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--fg-3)', background: 'var(--border-1)', padding: '1px 6px', borderRadius: 3 }}>
              {activity.length}
            </span>
          )}
        </div>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', boxShadow: '0 0 0 3px rgba(34,197,94,.2)' }} />
      </div>
      <div style={{ maxHeight: 600, overflowY: 'auto' }}>
        {activity.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
            Nicio activitate recentă
          </div>
        ) : activity.map((ev, i) => {
          const meta = ADMIN_EVENT_META[ev.event_type] || ADMIN_EVENT_META.milestone_delivered;
          const isLast = i === activity.length - 1;
          return (
            <div
              key={i}
              onClick={() => ev.project_id && navigate(`/project/${ev.project_id}`)}
              style={{
                display: 'flex', gap: '.625rem', padding: '.625rem 1rem',
                borderBottom: isLast ? 'none' : '1px solid var(--border-1)',
                cursor: ev.project_id ? 'pointer' : 'default',
                transition: 'background .12s',
              }}
              onMouseEnter={e => ev.project_id && (e.currentTarget.style.background = 'var(--bg-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 2,
              }}>
                <Icon name={meta.icon} size={12} style={{ color: meta.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--fg-0)', lineHeight: 1.4, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600 }}>{ev.actor_name}</span>
                  {' — '}{meta.label}
                  {ev.project_title && (
                    <span style={{ color: 'var(--fg-2)' }}> pe <em>{ev.project_title}</em></span>
                  )}
                </div>
                {ev.milestone_title && (
                  <div style={{ fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ev.milestone_title}{ev.amount ? ` · ${parseFloat(ev.amount).toLocaleString('ro-RO')} RON` : ''}
                  </div>
                )}
                {!ev.milestone_title && ev.amount && (
                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{parseFloat(ev.amount).toLocaleString('ro-RO')} RON</div>
                )}
              </div>
              <div style={{ flexShrink: 0, fontSize: 11, color: 'var(--fg-3)', paddingTop: 2 }}>
                {timeAgo(ev.event_time)}
              </div>
            </div>
          );
        })}
        {hasMore && (
          <div style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid var(--border-1)' }}>
            <button className="btn btn-ghost btn-sm" onClick={onLoadMore} disabled={loading} style={{ fontSize: 11, width: '100%' }}>
              {loading ? '…' : 'Mai mult'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ——— Admin Projects: unified grouped view (PM + subtasks + standalone tasks) ———
function AdminProjectRow({ p, navigate, isSubtask, isParent, handleOpenDetail, handleApproveProject, handleOpenCreateTaskModal, handleOpenAssignModal, handleDeleteProject, handleRefund, handleOpenEdit, handleRemoveExpert, handleOpenHistory, handleRejectProject, loadingActions }) {
  const isPm = p.assignment_type === 'pm_task';
  const commissionLabel = p.commission_percent != null
    ? <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 600, color: 'var(--success)' }}>{p.commission_percent}%</span>
    : <span style={{ color: 'var(--fg-3)' }}>—</span>;

  return (
    <tr style={isSubtask ? { background: 'var(--bg-0)' } : isParent ? { background: 'var(--bg-1)' } : {}}>
      <td>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: isSubtask ? '1.5rem' : 0 }}>
          {isSubtask && <span style={{ color: 'var(--fg-3)', fontSize: 13, lineHeight: '20px', flexShrink: 0 }}>↳</span>}
          <div>
            <div
              style={{ fontWeight: isParent ? 700 : 600, cursor: 'pointer', color: 'var(--fg-0)', marginBottom: 2 }}
              onClick={() => navigate(`/project/${p.id}`)}
            >{p.title}</div>
            {isPm && <span className="tag" style={{ fontSize: 10 }}>Project Management</span>}
            {isSubtask && p.service_type && <span className="tag" style={{ fontSize: 10 }}>{serviceLabel(p.service_type)}</span>}
          </div>
        </div>
      </td>
      <td style={{ fontSize: 12, color: 'var(--fg-2)' }}>{p.client_name || '—'}</td>
      <td>
        {!isPm && !isSubtask && <span className="tag" style={{ fontSize: 10 }}>{serviceLabel(p.service_type || 'matching')}</span>}
        {isPm && <span className="tag" style={{ fontSize: 10 }}>PM</span>}
        {isSubtask && <span className="tag" style={{ fontSize: 10, background: 'var(--accent-bg)', color: 'var(--accent)' }}>sub-task</span>}
      </td>
      <td><StatusBadge status={p.status} /></td>
      <td className="mono" style={{ fontSize: 12 }}>{fmtRON(p.budget_ron || 0)}</td>
      <td>{commissionLabel}</td>
      <td style={{ fontSize: 12, color: 'var(--fg-2)' }}>
        {p.expert_name && <div>{p.expert_name}</div>}
        {p.company_name && <div>{p.company_name}</div>}
        {!p.expert_name && !p.company_name && <span style={{ color: 'var(--fg-3)' }}>—</span>}
      </td>
      <td className="muted-2" style={{ fontSize: 11 }}>{fmtDate(p.created_at)}</td>
      <td>
        <div className="row" style={{ gap: '.375rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => handleOpenDetail(p)}>
            <Icon name="eye" size={11} /> Detalii
          </button>
          {p.status === 'pending_admin_approval' && (
            <>
              <button className="btn btn-success btn-sm" onClick={() => handleApproveProject(p)}>Aprobă</button>
              {!isPm && (
                <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(p)} title="Modifică înainte de aprobare">
                  <Icon name="edit" size={11} /> Editează
                </button>
              )}
              {handleRejectProject && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--warning)' }}
                  disabled={loadingActions?.[`reject-project-${p.id}`]}
                  onClick={() => handleRejectProject(p)} title="Respinge proiect">
                  <Icon name="x" size={11} /> {loadingActions?.[`reject-project-${p.id}`] ? 'Se procesează...' : 'Respinge'}
                </button>
              )}
            </>
          )}
          {p.status === 'pending_client_approval' && (
            <span className="tag" style={{ fontSize: 10, background: 'var(--accent-bg)', color: 'var(--accent-hi)' }}>
              Așteaptă confirmare user
            </span>
          )}
          {/* Unassign (only if currently assigned) */}
          {!isPm && (p.expert_id || p.company_id) && ['assigned', 'in_progress', 'open'].includes(p.status) && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--warning)' }}
              disabled={loadingActions?.[`remove-expert-${p.id}`]}
              onClick={() => handleRemoveExpert && handleRemoveExpert(p)} title="Dezasignează prestatorul">
              <Icon name="user-minus" size={11} /> {loadingActions?.[`remove-expert-${p.id}`] ? 'Se procesează...' : 'Dezasignează'}
            </button>
          )}
          {isPm && ['in_progress', 'open'].includes(p.status) && (
            <button className="btn btn-primary btn-sm" onClick={() => handleOpenCreateTaskModal(p)}>
              <Icon name="plus" size={11} /> Task
            </button>
          )}
          {!isPm && ['open', 'in_progress', 'assigned', 'pending_assignment'].includes(p.status) && (
            <button className="btn btn-primary btn-sm" onClick={() => handleOpenAssignModal(p)}>
              <Icon name="user-plus" size={11} /> Asignează
            </button>
          )}
          {!isPm && ['cancelled', 'rejected', 'disputed', 'completed'].includes(p.status) && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--warning)' }}
              disabled={loadingActions?.[`refund-${p.id}`]}
              onClick={() => handleRefund && handleRefund(p)} title="Refund escrow rămas">
              <Icon name="reload" size={12} /> {loadingActions?.[`refund-${p.id}`] ? 'Se procesează...' : 'Refund'}
            </button>
          )}
          {!isPm && handleOpenHistory && (
            <button className="btn btn-ghost btn-sm" onClick={() => handleOpenHistory(p)} title="Istoric modificări">
              <Icon name="clock" size={12} />
            </button>
          )}
          {!isPm && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteProject(p.id)}>
              <Icon name="trash" size={12} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function AdminProjectRows({ projects, navigate, handleOpenDetail, handleApproveProject, handleOpenCreateTaskModal, handleOpenAssignModal, handleDeleteProject, handleRefund, handleOpenEdit, handleRemoveExpert, handleOpenHistory, handleRejectProject, loadingActions }) {
  const pmProjects = projects.filter(p => p.assignment_type === 'pm_task');
  const pmIds = new Set(pmProjects.map(p => p.id));
  const subtasks = projects.filter(p => p.task_id && p.assignment_type !== 'pm_task');
  const standalone = projects.filter(p => !p.task_id && p.assignment_type !== 'pm_task');

  const groups = {};
  subtasks.forEach(p => {
    if (!groups[p.task_id]) groups[p.task_id] = [];
    groups[p.task_id].push(p);
  });

  const pmStandalone = pmProjects.filter(p => !groups[p.id]);
  const groupsWithPmRow = Object.entries(groups).filter(([id]) => pmIds.has(id));
  const groupsWithoutPmRow = Object.entries(groups).filter(([id]) => !pmIds.has(id));

  const rowProps = { navigate, handleOpenDetail, handleApproveProject, handleOpenCreateTaskModal, handleOpenAssignModal, handleDeleteProject, handleRefund, handleOpenEdit, handleRemoveExpert, handleOpenHistory, handleRejectProject, loadingActions };

  return (
    <>
      {standalone.map(p => <AdminProjectRow key={p.id} p={p} {...rowProps} />)}
      {pmStandalone.map(p => <AdminProjectRow key={p.id} p={p} isParent {...rowProps} />)}
      {groupsWithPmRow.map(([taskId, children]) => {
        const parent = pmProjects.find(p => p.id === taskId);
        return (
          <React.Fragment key={taskId}>
            <AdminProjectRow p={parent} isParent {...rowProps} />
            {children.map(c => <AdminProjectRow key={c.id} p={c} isSubtask {...rowProps} />)}
          </React.Fragment>
        );
      })}
      {groupsWithoutPmRow.map(([taskId, children]) => (
        <React.Fragment key={taskId}>
          <tr style={{ background: 'var(--bg-1)' }}>
            <td colSpan={9} style={{ padding: '0.5rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="folder" size={13} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg-0)' }}>{children[0]?.task_title || 'Proiect parent'}</span>
                <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>{children.length} subtask{children.length !== 1 ? 'uri' : ''}</span>
              </div>
            </td>
          </tr>
          {children.map(c => <AdminProjectRow key={c.id} p={c} isSubtask {...rowProps} />)}
        </React.Fragment>
      ))}
    </>
  );
}

function AuditLogTab() {
  const [log, setLog] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ target_type: '', admin_id: '' });

  // Load list of admins once for dropdown (distinct admins from full audit log)
  useEffect(() => {
    let cancelled = false;
    adminAPI.getAuditLog({ limit: 200 })
      .then(res => {
        if (cancelled) return;
        const rows = res.data?.audit_log || [];
        const map = new Map();
        for (const r of rows) {
          if (r.admin_id && !map.has(r.admin_id)) {
            map.set(r.admin_id, { id: r.admin_id, name: r.admin_name || r.admin_email || r.admin_id });
          }
        }
        setAdmins([...map.values()]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { page, limit: 50 };
    if (filter.target_type) params.target_type = filter.target_type;
    if (filter.admin_id) params.admin_id = filter.admin_id;
    adminAPI.getAuditLog(params)
      .then(res => { if (!cancelled) setLog(res.data?.audit_log || []); })
      .catch(() => { if (!cancelled) setLog([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, filter]);

  const resetFilters = () => { setFilter({ target_type: '', admin_id: '' }); setPage(1); };
  const hasFilters = filter.target_type || filter.admin_id;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Audit Log Admin ({log.length})</div>
        <div className="row" style={{ gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="input input-sm" style={{ minWidth: 130, fontSize: 12 }} value={filter.target_type}
            onChange={(e) => { setFilter(f => ({ ...f, target_type: e.target.value })); setPage(1); }}>
            <option value="">Toate tipurile</option>
            <option value="user">User</option>
            <option value="project">Project</option>
            <option value="dispute">Dispute</option>
            <option value="payout">Payout</option>
          </select>
          <select className="input input-sm" style={{ minWidth: 160, fontSize: 12 }} value={filter.admin_id}
            onChange={(e) => { setFilter(f => ({ ...f, admin_id: e.target.value })); setPage(1); }}>
            <option value="">Toți adminii</option>
            {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={resetFilters} style={{ fontSize: 11 }}>✕ Reset</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>‹</button>
          <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>p. {page}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p + 1)} disabled={log.length < 50}>›</button>
        </div>
      </div>
      {loading ? <Spinner /> : log.length === 0 ? (
        <EmptyState icon="list" title="Niciun log" description="Nu există acțiuni înregistrate pe acest filtru." />
      ) : (
        <table className="tbl">
          <thead><tr><th>Data</th><th>Admin</th><th>Acțiune</th><th>Țintă</th><th>Detalii</th><th>IP</th></tr></thead>
          <tbody>
            {log.map(row => (
              <tr key={row.id}>
                <td className="muted-2" style={{ fontSize: 11 }}>{fmtDate(row.created_at)}</td>
                <td style={{ fontSize: 12 }}>{row.admin_name || row.admin_email || '—'}</td>
                <td><span className="tag" style={{ fontSize: 10 }}>{row.action_type}</span></td>
                <td style={{ fontSize: 11, fontFamily: 'var(--f-mono)' }}>{row.target_type}:{row.target_id?.substring(0, 8)}</td>
                <td style={{ fontSize: 11, color: 'var(--fg-2)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.details ? JSON.stringify(row.details) : '—'}
                </td>
                <td className="muted-2" style={{ fontSize: 11 }}>{row.ip_address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function UsersTab({ allUsers, loadingActions, handleApproveUser, handleRejectUser, handleDeleteUser, handleRestoreUser, refresh }) {
  const [selected, setSelected] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);

  // Only non-admin users are bulk-selectable
  const eligibleUsers = allUsers.filter(u => u.role !== 'admin');
  const allSelected = eligibleUsers.length > 0 && eligibleUsers.every(u => selected.has(u.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(eligibleUsers.map(u => u.id)));
  };

  const toggleOne = (id) => {
    setSelected(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const runBulk = async () => {
    if (!bulkAction || selected.size === 0) return;
    const labelMap = { approve: 'aprobi', reject: 'respingi', suspend: 'suspendezi' };
    if (!window.confirm(`Sigur ${labelMap[bulkAction]} ${selected.size} utilizator(i)?`)) return;
    setBulkRunning(true);
    try {
      const r = await adminAPI.bulkUserAction({
        action: bulkAction,
        user_ids: [...selected],
      });
      const res = r.data?.results || { success: [], failed: [], blocked: [] };
      const lines = [
        `Reușit: ${res.success.length}`,
        res.failed.length ? `Eșuat: ${res.failed.length}` : null,
        res.blocked.length ? `Blocat (admin/self): ${res.blocked.length}` : null,
      ].filter(Boolean).join(' · ');
      alert('Bulk action complet. ' + lines);
      setSelected(new Set());
      setBulkAction('');
      refresh();
    } catch (e) {
      alert(e.response?.data?.error || 'Eroare la bulk action.');
    } finally {
      setBulkRunning(false);
    }
  };

  return (
    <div className="card">
      <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
        <div className="card-title">Toți utilizatorii ({allUsers.length})</div>
        {selected.size > 0 && (
          <div className="row" style={{ gap: '.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{selected.size} selectați</span>
            <select className="input input-sm" style={{ fontSize: 12, minWidth: 140 }} value={bulkAction}
              onChange={e => setBulkAction(e.target.value)}>
              <option value="">— Acțiune bulk —</option>
              <option value="approve">Aprobă KYC</option>
              <option value="reject">Respinge</option>
              <option value="suspend">Suspendă</option>
            </select>
            <button className="btn btn-primary btn-sm" disabled={!bulkAction || bulkRunning} onClick={runBulk}>
              {bulkRunning ? '...' : 'Aplică'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>✕</button>
          </div>
        )}
      </div>
      {allUsers.length === 0 ? <EmptyState icon="users" title="Niciun utilizator" description="" /> : (
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 28 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  title="Selectează toți non-admin" />
              </th>
              <th>Utilizator</th><th>Rol</th><th>KYC</th><th>Status</th><th>Data</th><th>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map(u => {
              const isAdminUser = u.role === 'admin';
              return (
                <tr key={u.id}>
                  <td>
                    {!isAdminUser && (
                      <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleOne(u.id)}
                        style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{u.email}</div>
                  </td>
                  <td><span className="tag">{u.role}</span></td>
                  <td>
                    <span className={`badge ${u.kyc_status === 'verified' ? 'badge-green' : u.kyc_status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>
                      KYC: {u.kyc_status || 'pending'}
                    </span>
                  </td>
                  <td>
                    {u.kyc_status === 'rejected' ? <span className="badge badge-red">Respins</span>
                      : u.verification_date ? <span className="badge badge-green">Aprobat admin</span>
                      : <span className="badge badge-amber">Pending admin</span>}
                  </td>
                  <td className="muted-2" style={{ fontSize: 12 }}>{fmtDate(u.created_at)}</td>
                  <td>
                    <div className="row" style={{ gap: '.5rem' }}>
                      {!isAdminUser && !u.verification_date && u.kyc_status !== 'rejected' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleApproveUser(u.id)}
                          disabled={loadingActions[`approve-${u.id}`]}>Aprobă</button>
                      )}
                      {!isAdminUser && u.kyc_status !== 'rejected' && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--warning)' }}
                          onClick={() => handleRejectUser(u.id)} disabled={loadingActions[`reject-${u.id}`]}>Respinge</button>
                      )}
                      {!isAdminUser && !u.deleted_at && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteUser(u.id)}>
                          <Icon name="trash" size={12} />
                        </button>
                      )}
                      {u.deleted_at && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--success)' }}
                          onClick={() => handleRestoreUser(u.id)} title="Restaurează">↺</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TermsAdminTab() {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [form, setForm] = useState({ version: '', content: '', summary: '' });
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [viewVersion, setViewVersion] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await termsAPI.listVersions();
      setVersions(r.data?.versions || []);
    } catch { setVersions([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!form.version.trim() || !form.content.trim()) {
      setPublishError('Versiunea și conținutul sunt obligatorii.');
      return;
    }
    if (!confirm(`Publici versiunea ${form.version}? Toți utilizatorii vor fi re-prompted să accepte noua versiune.`)) return;
    setPublishing(true);
    setPublishError('');
    try {
      await termsAPI.publishVersion(form);
      setShowPublish(false);
      setForm({ version: '', content: '', summary: '' });
      refresh();
    } catch (err) {
      setPublishError(err.response?.data?.error || 'Publicare eșuată.');
    } finally {
      setPublishing(false);
    }
  };

  const openView = async (v) => {
    try {
      const r = await termsAPI.getVersion(v.id);
      setViewVersion(r.data.terms);
    } catch { alert('Eroare la încărcarea versiunii'); }
  };

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Termeni și Condiții — versiuni ({versions.length})</div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowPublish(true)}>
          <Icon name="plus" size={12} /> Publică versiune nouă
        </button>
      </div>

      {loading ? <Spinner /> : versions.length === 0 ? (
        <EmptyState icon="file-text" title="Nicio versiune" description="Publică prima versiune a T&C." />
      ) : (
        <table className="tbl">
          <thead>
            <tr><th>Versiune</th><th>Status</th><th>Data efectivă</th><th>Publicat de</th><th>Acceptări</th><th>Acțiuni</th></tr>
          </thead>
          <tbody>
            {versions.map(v => (
              <tr key={v.id}>
                <td style={{ fontFamily: 'var(--f-mono)', fontWeight: 700 }}>{v.version}</td>
                <td>
                  {v.is_current ? (
                    <span className="tag" style={{ background: 'var(--success-bg)', color: 'var(--success)', fontSize: 10 }}>● ACTIVĂ</span>
                  ) : (
                    <span className="muted-2" style={{ fontSize: 11 }}>arhivă</span>
                  )}
                </td>
                <td style={{ fontSize: 12 }}>{fmtDate(v.effective_date)}</td>
                <td style={{ fontSize: 12 }}>{v.created_by_name || '—'}</td>
                <td className="mono" style={{ fontSize: 12 }}>{v.users_accepted}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => openView(v)}>
                    <Icon name="eye" size={11} /> Vezi
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showPublish && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setShowPublish(false); }}>
          <form className="card" style={{ width: 580, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }} onSubmit={handlePublish}>
            <div className="card-title" style={{ marginBottom: '1rem' }}>Publică versiune nouă T&C</div>
            <div style={{ padding: '.75rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--warning)', marginBottom: '1rem' }}>
              ⚠ După publicare, toți utilizatorii vor fi prompted să accepte noua versiune la următoarea încărcare a paginii.
            </div>
            <div style={{ marginBottom: '.875rem' }}>
              <label className="label">Versiune <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="input" type="text" placeholder="ex: 2.0 sau 2026-05" maxLength={20}
                value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} required />
            </div>
            <div style={{ marginBottom: '.875rem' }}>
              <label className="label">Rezumat schimbări (opțional)</label>
              <textarea className="input" rows={3}
                placeholder="Ce s-a schimbat în această versiune? Va fi afișat utilizatorilor în prompt."
                value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
            </div>
            <div style={{ marginBottom: '.875rem' }}>
              <label className="label">Conținut complet <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea className="input" rows={12} style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}
                placeholder="Textul integral al T&C..."
                value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
            </div>
            {publishError && (
              <div style={{ padding: '.5rem .75rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--r-sm)', fontSize: 12, marginBottom: '.75rem' }}>
                {publishError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowPublish(false)} disabled={publishing}>Anulează</button>
              <button type="submit" className="btn btn-primary" disabled={publishing}>
                {publishing ? 'Se publică...' : 'Publică'}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewVersion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setViewVersion(null); }}>
          <div className="card" style={{ width: 640, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div className="card-title" style={{ marginBottom: '.5rem' }}>
              T&C versiunea {viewVersion.version} {viewVersion.is_current && <span className="tag" style={{ background: 'var(--success-bg)', color: 'var(--success)', fontSize: 10 }}>ACTIVĂ</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: '1rem' }}>
              Publicată {fmtDate(viewVersion.effective_date)}
            </div>
            {viewVersion.summary && (
              <div style={{ padding: '.75rem', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--r-sm)', fontSize: 13, marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                <strong>Rezumat:</strong> {viewVersion.summary}
              </div>
            )}
            <div style={{ padding: '1rem', background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-sm)', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 360, overflowY: 'auto' }}>
              {viewVersion.content}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setViewVersion(null)}>Închide</button>
            </div>
          </div>
        </div>
      )}

      {/* Arbitrage modal — admin can resolve disputes with split decision */}
      <ArbitrageModal
        dispute={arbDispute}
        busy={arbBusy}
        onClose={() => !arbBusy && setArbDispute(null)}
        onResolve={handleArbResolve}
      />

      {/* Toast notifications — transient feedback for admin actions */}
      <ToastStack toasts={toasts} />
    </div>
  );
}

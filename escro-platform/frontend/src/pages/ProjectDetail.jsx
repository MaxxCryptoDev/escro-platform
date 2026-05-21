import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { contractAPI, modificationAPI, projectAPI, escrowAPI } from '../services/api';
import ContractModal from '../components/ContractModal';
import ContractStep from '../components/ContractStep';
import ActionBanner from '../components/ActionBanner';
import SignatureModal from '../components/SignatureModal';
import AnnexModal from '../components/AnnexModal';
import ReviewModal from '../components/ReviewModal';
import { Icon, Avatar, StatusBadge, EscrowBar, Spinner, EmptyState } from '../components/ui';
import { fmtRON, fmtDate, getInitials, withAuthToken, serviceLabel } from '../utils/format';

const fmtMsgDate = (s) => {
  const d = new Date(s);
  const now = new Date();
  const today = d.toDateString() === now.toDateString();
  const yesterday = new Date(now - 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  if (today) return time;
  if (yesterday) return `Ieri ${time}`;
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' }) + ' ' + time;
};

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user: authUser } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatHasMore, setChatHasMore] = useState(false);
  const [chatCursor, setChatCursor] = useState(null);
  const [chatLoadingMore, setChatLoadingMore] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  // Legacy URLs use ?tab=milestones, but ProjectDetail has no milestones tab — deliveries happen via Contracts.
  const initialTab = (() => {
    const raw = searchParams.get('tab') || 'details';
    return raw === 'milestones' ? 'contracts' : raw;
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [contracts, setContracts] = useState([]);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [modifications, setModifications] = useState([]);
  const [user, setUser] = useState(authUser);
  const [selectedContract, setSelectedContract] = useState(null);
  const [signingMilestone, setSigningMilestone] = useState(null);
  const [selectedAnnex, setSelectedAnnex] = useState(null);
  const [deliverFiles, setDeliverFiles] = useState({});
  const [deliverDescriptions, setDeliverDescriptions] = useState({});
  const [disputeReasons, setDisputeReasons] = useState({});
  const [showDisputeInput, setShowDisputeInput] = useState({});
  const [showRevisionInput, setShowRevisionInput] = useState({});
  const [revisionFeedbacks, setRevisionFeedbacks] = useState({});
  const [revisionBusy, setRevisionBusy] = useState({});
  const [deliverBusy, setDeliverBusy] = useState({});
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addTaskForm, setAddTaskForm] = useState({ title: '', description: '', budget_ron: '', timeline_days: 30, service_type: 'matching', expert_id: '', company_id: '', milestones: [{ title: '', deliverable_description: '', percentage_of_budget: 100 }] });
  const [allUsers, setAllUsers] = useState([]);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposeMsId, setProposeMsId] = useState(null);
  const [proposeForm, setProposeForm] = useState({});
  const [proposeSubmitting, setProposeSubmitting] = useState(false);
  const [escrowAccount, setEscrowAccount] = useState(null);
  const [escrowLoading, setEscrowLoading] = useState(false);
  const [reviewStatus, setReviewStatus] = useState(null); // null | { can_review, reviewable_user, reason }
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pendingApproveSignature, setPendingApproveSignature] = useState(null); // legacy, unused now
  const [deliveryFlow, setDeliveryFlow] = useState(null); // { milestoneId, predContract, finalContract, step }
  const [approvalFlow, setApprovalFlow] = useState(null); // same shape — client-side
  const [pmFinalizeContract, setPmFinalizeContract] = useState(null);
  const [deliverableHistories, setDeliverableHistories] = useState({}); // { [milestoneId]: [...] }
  const [historyExpanded, setHistoryExpanded] = useState({});
  const [adminReleaseForm, setAdminReleaseForm] = useState(null); // { milestoneId, direction, amount, reason }
  const [adminReleaseLoading, setAdminReleaseLoading] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/projects/${projectId}`, { headers });
      setProject({ ...res.data.project, milestones: res.data.milestones, assignments: res.data.assignments || [] });
    } catch { setError('Nu s-a putut încărca proiectul.'); }
    finally { setLoading(false); }
  }, [projectId]);

  const fetchModifications = useCallback(async () => {
    try {
      const res = await axios.get(`/api/projects/${projectId}/modifications`, { headers });
      setModifications(res.data.modifications || []);
    } catch { /* silent */ }
  }, [projectId]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get(`/api/projects/${projectId}/messages?limit=50`, { headers });
      const data = res.data;
      setMessages(data.messages || data || []);
      setChatHasMore(data.has_more || false);
      setChatCursor(data.next_cursor || null);
    } catch { /* silent */ }
  }, [projectId]);

  const loadMoreMessages = async () => {
    if (!chatCursor || chatLoadingMore) return;
    setChatLoadingMore(true);
    try {
      const res = await axios.get(`/api/projects/${projectId}/messages?limit=50&before=${encodeURIComponent(chatCursor)}`, { headers });
      const data = res.data;
      setMessages(prev => [...(data.messages || []), ...prev]);
      setChatHasMore(data.has_more || false);
      setChatCursor(data.next_cursor || null);
    } catch { /* silent */ } finally {
      setChatLoadingMore(false);
    }
  };

  const fetchContracts = useCallback(async () => {
    try {
      const [cRes, wRes] = await Promise.all([
        contractAPI.getProjectContracts(projectId),
        contractAPI.getWorkflowStatus(projectId),
      ]);
      setContracts(cRes.data.contracts || []);
      setWorkflowStatus(wRes.data.workflow);
    } catch { /* silent */ }
  }, [projectId]);

  useEffect(() => {
    if (!authUser) {
      axios.get('/api/auth/me', { headers }).then(r => setUser(r.data.user)).catch(() => {});
    } else {
      setUser(authUser);
    }
  }, [authUser]);

  const fetchEscrow = useCallback(async () => {
    try {
      const res = await axios.get(`/api/escrow/project/${projectId}`, { headers }).catch(() => null);
      setEscrowAccount(res?.data?.escrow || null);
    } catch { /* silent */ }
  }, [projectId]);

  const fetchReviewStatus = useCallback(async () => {
    try {
      const res = await axios.get(`/api/reviews/can-review/${projectId}`, { headers });
      setReviewStatus(res.data);
    } catch { /* silent */ }
  }, [projectId]);

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositMilestone, setDepositMilestone] = useState(null);

  const openDepositModal = (ms) => { setDepositMilestone(ms); setShowDepositModal(true); };

  const handleActivateEscrow = () => {
    if (!depositMilestone) return;
    const amount = parseFloat(depositMilestone.amount_ron) || 0;
    if (!(amount > 0)) { setError('Suma milestone-ului este invalidă.'); return; }
    setShowDepositModal(false);
    navigate(`/escrow/${projectId}/checkout?amount=${amount}&milestone_id=${depositMilestone.id}`);
  };

  useEffect(() => { fetchProject(); fetchModifications(); fetchContracts(); }, [fetchProject, fetchModifications, fetchContracts]);

  useEffect(() => {
    if (activeTab === 'chat') fetchMessages();
    if (activeTab === 'contracts') { fetchContracts(); fetchEscrow(); }
  }, [activeTab]);

  useEffect(() => { fetchEscrow(); }, [fetchEscrow]);

  // Fetch review status after project loads (only matters when completed)
  useEffect(() => {
    if (project?.status === 'completed') fetchReviewStatus();
  }, [project?.status, fetchReviewStatus]);

  // Real-time: join project room, receive messages and milestone updates
  useEffect(() => {
    if (!socket || !projectId) return;
    socket.emit('join_project', projectId);

    const msgHandler = (msg) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const updateHandler = ({ type, milestone }) => {
      if (milestone) {
        setProject(prev => {
          if (!prev) return prev;
          const updatedMilestones = prev.milestones.map(m =>
            m.id === milestone.id ? { ...m, ...milestone } : m
          );
          return { ...prev, milestones: updatedMilestones };
        });
      }
      if (type === 'milestone_approved' || type === 'milestone_disputed') {
        fetchProject();
      }
    };

    socket.on('new_message', msgHandler);
    socket.on('project_update', updateHandler);
    return () => {
      socket.off('new_message', msgHandler);
      socket.off('project_update', updateHandler);
      socket.emit('leave_project', projectId);
    };
  }, [socket, projectId, fetchProject]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-open Apply modal when navigating from Marketplace with ?apply=1
  useEffect(() => {
    if (searchParams.get('apply') === '1' && project && !project.is_owner
      && !project.expert_id && !project.company_id
      && ['expert', 'company'].includes(user?.role)
      && ['open', 'pending_assignment'].includes(project.status)) {
      setShowApplyModal(true);
    }
  }, [searchParams, project, user?.role]);

  const handleApplyToProject = async () => {
    if (applyLoading || !project) return;
    setApplyLoading(true);
    setError('');
    try {
      const res = await axios.post(`/api/projects/${projectId}/apply`, { message: applyMessage.trim() || null }, { headers });
      setSuccess(res.data?.message || 'Aplicația a fost trimisă adminului.');
      setShowApplyModal(false);
      setApplyMessage('');
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la trimiterea aplicației.');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !project) return;
    // Admin can write but isn't a party — pick any party as recipient (everyone sees the message)
    const myId = user?.id;
    const partyIds = [project.client_id, project.expert_id, project.company_id].filter(Boolean);
    const recipientId = partyIds.find(p => String(p) !== String(myId)) || partyIds[0];
    if (!recipientId) { setError('Nu există destinatar.'); return; }
    try {
      await axios.post('/api/messages', { project_id: projectId, content: newMessage, recipient_id: recipientId }, { headers });
      setNewMessage('');
    } catch { setError('Eroare la trimiterea mesajului.'); }
  };

  const handleAcceptContract = async (contractId, signature) => {
    try {
      await contractAPI.acceptContract(contractId, signature ? { signature } : {});
      setSuccess('Ai acceptat contractul!');
      setSelectedContract(null);
      fetchContracts();
    } catch (err) { setError(err.response?.data?.error || 'Eroare acceptare contract.'); }
  };

  const handleGenerateProjectContract = async () => {
    try {
      const res = await contractAPI.createProjectContract({ project_id: projectId });
      setSuccess(res.data?.pdf_warning ? `Contract generat. Atenție: ${res.data.pdf_warning}` : 'Contract de proiect generat!');
      fetchContracts();
    } catch (err) { setError(err.response?.data?.error || 'Eroare la generarea contractului.'); }
  };

  const handleGenerateMilestoneContracts = async () => {
    try {
      await contractAPI.createAllMilestoneContracts({ project_id: projectId });
      setSuccess('Contracte milestone generate!');
      fetchContracts();
    } catch (err) { setError(err.response?.data?.error || 'Eroare la generarea contractelor.'); }
  };

  const handleDeliverMilestone = async (milestoneId) => {
    const file = deliverFiles[milestoneId];
    if (!file) { setError('Selectează un fișier pentru livrare.'); return; }
    setDeliverBusy(b => ({ ...b, [milestoneId]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId);
      formData.append('description', deliverDescriptions[milestoneId] || '');
      await axios.post(`/api/milestones/${milestoneId}/deliverable`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setDeliverFiles(f => { const n = { ...f }; delete n[milestoneId]; return n; });
      setDeliverDescriptions(d => { const n = { ...d }; delete n[milestoneId]; return n; });
      setSuccess('Livrabil trimis! Beneficiarul va revizui documentele.');
      fetchContracts(); fetchProject();
    } catch (err) { setError(err.response?.data?.error || err.response?.data?.message || 'Eroare la livrare.'); }
    finally { setDeliverBusy(b => ({ ...b, [milestoneId]: false })); }
  };

  const handleStartDelivery = async (milestoneId) => {
    const file = deliverFiles[milestoneId];
    if (!file) { setError('Selectează un fișier pentru livrare.'); return; }
    try {
      const res = await axios.post(
        `/api/contracts/milestone/${milestoneId}/prepare-delivery`,
        { project_id: projectId },
        { headers }
      );
      const { predContract, finalContract } = res.data;
      // If pred already fully signed, skip directly to final (or upload)
      const predFullySigned = predContract?.party1_accepted && predContract?.party2_accepted;
      const finalFullySigned = finalContract?.party1_accepted && finalContract?.party2_accepted;
      if (predFullySigned && (!finalContract || finalFullySigned)) {
        await handleDeliverMilestone(milestoneId);
        return;
      }
      // Skip pred if expert already signed party1 (only client side left); start at final if needed
      const startStep = (predContract?.party1_accepted) ? (finalContract && !finalContract.party1_accepted ? 'final' : 'upload') : 'pred';
      if (startStep === 'upload') {
        await handleDeliverMilestone(milestoneId);
        return;
      }
      setDeliveryFlow({ milestoneId, predContract, finalContract, step: startStep });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Eroare la pregătirea livrării.');
    }
  };

  const handleDeliverySign = async (signature) => {
    if (!deliveryFlow) return;
    const { step, predContract, finalContract, milestoneId } = deliveryFlow;
    const target = step === 'pred' ? predContract : finalContract;
    try {
      await contractAPI.acceptContract(target.id, { signature });
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la semnarea contractului.');
      return;
    }
    if (step === 'pred' && finalContract && !finalContract.party1_accepted) {
      setDeliveryFlow(d => ({ ...d, step: 'final' }));
    } else {
      setDeliveryFlow(null);
      await handleDeliverMilestone(milestoneId);
    }
  };

  const handleApproveMilestone = async (milestoneId, signature) => {
    try {
      const res = await axios.put(`/api/milestones/${milestoneId}/approve`, { project_id: projectId, signature }, { headers });
      const m = res.data?.milestone;
      const commissionPct = parseFloat(project?.commission_percent) || 10;
      const gross = parseFloat(m?.amount_ron) || 0;
      const commission = Math.round(gross * commissionPct) / 100;
      const net = Math.round(gross - commission);
      const msg = gross > 0
        ? `Milestone aprobat! ${fmtRON(net)} eliberați prestatorului (comision platformă: ${fmtRON(commission)}).`
        : 'Milestone aprobat! Fondurile au fost eliberate.';
      setSuccess(msg);
      fetchContracts(); fetchProject();
    } catch (err) { setError(err.response?.data?.error || 'Eroare la aprobare.'); }
  };

  const handleStartApproval = async (milestoneId) => {
    try {
      const res = await axios.post(
        `/api/contracts/milestone/${milestoneId}/prepare-delivery`,
        { project_id: projectId },
        { headers }
      );
      const { predContract, finalContract } = res.data;
      // Determine which contract still needs party2 (client) signature
      const predNeedsParty2 = predContract && !predContract.party2_accepted;
      const finalNeedsParty2 = finalContract && !finalContract.party2_accepted;
      if (!predNeedsParty2 && !finalNeedsParty2) {
        // Nothing left to sign — just release funds
        await handleApproveMilestone(milestoneId);
        return;
      }
      const startStep = predNeedsParty2 ? 'pred' : 'final';
      setApprovalFlow({ milestoneId, predContract, finalContract, step: startStep });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Eroare la încărcarea contractelor.');
    }
  };

  const fetchDeliverableHistory = async (milestoneId) => {
    try {
      const res = await axios.get(`/api/milestones/${milestoneId}/history`, { headers });
      setDeliverableHistories(prev => ({ ...prev, [milestoneId]: res.data.history || [] }));
    } catch { /* silent */ }
  };

  const toggleHistory = (milestoneId) => {
    setHistoryExpanded(prev => {
      const next = { ...prev, [milestoneId]: !prev[milestoneId] };
      if (next[milestoneId] && !deliverableHistories[milestoneId]) fetchDeliverableHistory(milestoneId);
      return next;
    });
  };

  const handleAdminRelease = async () => {
    if (!adminReleaseForm) return;
    const { milestoneId, direction, amount, reason } = adminReleaseForm;
    const amt = parseFloat(amount);
    if (!(amt > 0)) { setError('Suma trebuie să fie > 0'); return; }
    setAdminReleaseLoading(true);
    try {
      await axios.post(`/api/admin/milestones/${milestoneId}/release`,
        { direction, amount: amt, reason: reason || null }, { headers });
      setSuccess(`Fonduri eliberate (${amt} RON) către ${direction === 'client' ? 'beneficiar' : 'prestator'}.`);
      setAdminReleaseForm(null);
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la eliberarea fondurilor.');
    } finally {
      setAdminReleaseLoading(false);
    }
  };

  const handleStartPmFinalize = async (taskId) => {
    try {
      const res = await axios.post(`/api/contracts/task/${taskId}/prepare-finalize`, {}, { headers });
      setPmFinalizeContract(res.data.contract);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Eroare la pregătirea finalizării.');
    }
  };

  const handlePmFinalizeSign = async (signature) => {
    if (!pmFinalizeContract) return;
    try {
      await contractAPI.acceptContract(pmFinalizeContract.id, { signature });
      const taskId = pmFinalizeContract.task_id;
      if (taskId) {
        try {
          await axios.post(`/api/tasks/${taskId}/request-finalization`, {}, { headers });
        } catch (reqErr) {
          if (reqErr.response?.status !== 409) {
            console.warn('[pm finalize request]', reqErr.response?.data?.error || reqErr.message);
          }
        }
      }
      setPmFinalizeContract(null);
      setSuccess('Contractul a fost semnat. Adminul va aproba închiderea proiectului.');
      fetchProject();
      fetchContracts();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la semnarea contractului.');
    }
  };

  const handleApprovalSign = async (signature) => {
    if (!approvalFlow) return;
    const { step, predContract, finalContract, milestoneId } = approvalFlow;
    const target = step === 'pred' ? predContract : finalContract;
    try {
      await contractAPI.acceptContract(target.id, { signature });
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la semnarea contractului.');
      return;
    }
    if (step === 'pred' && finalContract && !finalContract.party2_accepted) {
      setApprovalFlow(d => ({ ...d, step: 'final' }));
    } else {
      setApprovalFlow(null);
      await handleApproveMilestone(milestoneId);
    }
  };

  const handleDisputeMilestone = async (milestoneId) => {
    const reason = disputeReasons[milestoneId]?.trim();
    if (!reason) { setError('Descrie motivul disputei.'); return; }
    try {
      await axios.post(`/api/milestones/${milestoneId}/dispute`, { project_id: projectId, reason }, { headers });
      setSuccess('Dispută deschisă. Adminul va arbitra.');
      setShowDisputeInput(s => ({ ...s, [milestoneId]: false }));
      fetchContracts(); fetchProject();
    } catch (err) { setError(err.response?.data?.error || 'Eroare la disputare.'); }
  };

  const handleRequestRevision = async (milestoneId) => {
    const feedback = revisionFeedbacks[milestoneId]?.trim();
    if (!feedback) { setError('Descrie ce trebuie revizuit.'); return; }
    setRevisionBusy(b => ({ ...b, [milestoneId]: true }));
    try {
      await axios.put(`/api/milestones/${milestoneId}/request-revision`, { project_id: projectId, feedback }, { headers });
      setSuccess('Revizuire solicitată. Prestatorul va fi notificat.');
      setShowRevisionInput(s => ({ ...s, [milestoneId]: false }));
      setRevisionFeedbacks(f => { const n = { ...f }; delete n[milestoneId]; return n; });
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la solicitarea revizuirii.');
    } finally {
      setRevisionBusy(b => ({ ...b, [milestoneId]: false }));
    }
  };

  const handleGenerateFinalContract = async () => {
    try {
      const res = await contractAPI.createFinalContract({ project_id: projectId });
      setSuccess(res.data?.pdf_warning ? `Contract final generat. Atenție: ${res.data.pdf_warning}` : 'Contract final generat!');
      fetchContracts();
    } catch (err) { setError(err.response?.data?.error || 'Eroare la generarea contractului final.'); }
  };

  const handleCompleteProject = async () => {
    try {
      await axios.post(`/api/projects/${projectId}/complete`, {}, { headers });
      setSuccess('Proiect finalizat cu succes!');
      fetchProject();
    } catch (err) { setError(err.response?.data?.error || 'Eroare la finalizarea proiectului.'); }
  };

  const handleExpertAcceptAssignment = async () => {
    if (!window.confirm('Accepți să prelucrezi acest proiect? Confirmarea va activa proiectul.')) return;
    try {
      await projectAPI.expertAcceptAssignment(projectId);
      setSuccess('Asignare acceptată! Proiectul e activ.');
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.message || 'Eroare la acceptare.');
    }
  };

  const handleExpertRejectAssignment = async () => {
    const reason = window.prompt('Motivul refuzului (opțional):');
    if (reason === null) return;
    try {
      await projectAPI.expertRejectAssignment(projectId, reason || null);
      setSuccess('Asignare respinsă. Adminul va re-asigna.');
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.message || 'Eroare la respingere.');
    }
  };

  const handleAcceptAdminEdit = async () => {
    if (!window.confirm('Confirmi modificările admin? Proiectul va deveni activ.')) return;
    try {
      await projectAPI.acceptAdminEdit(projectId);
      setSuccess('Modificări acceptate! Proiectul e activ.');
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.message || 'Eroare la confirmare.');
    }
  };

  const handleRejectAdminEdit = async () => {
    const reason = window.prompt('Motivul respingerii (opțional):');
    if (reason === null) return;
    try {
      await projectAPI.rejectAdminEdit(projectId, reason || null);
      setSuccess('Modificările au fost respinse. Adminul va revizui.');
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.message || 'Eroare la respingere.');
    }
  };

  const handleCancelProject = async () => {
    const reason = window.prompt('Motivul anulării (opțional, dar recomandat):');
    if (reason === null) return;
    if (!window.confirm('Sigur vrei să anulezi proiectul? Acțiunea nu poate fi reversată. Vei putea solicita refund pentru suma din escrow.')) return;
    try {
      const res = await projectAPI.cancelProject(projectId, reason || null);
      setSuccess(res.data?.message || 'Proiect anulat.');
      fetchProject();
    } catch (err) { setError(err.response?.data?.message || 'Eroare la anulare.'); }
  };

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundEscrowAmount, setRefundEscrowAmount] = useState(0);
  const [refundLoading, setRefundLoading] = useState(false);

  const openRefundModal = async () => {
    setRefundLoading(false);
    setRefundEscrowAmount(0);
    try {
      const r = await escrowAPI.getEscrowByProject(projectId);
      setRefundEscrowAmount(parseFloat(r.data?.escrow?.held_balance_ron) || 0);
    } catch { setRefundEscrowAmount(0); }
    setShowRefundModal(true);
  };

  const confirmRefund = async () => {
    setRefundLoading(true);
    try {
      const res = await escrowAPI.refundEscrow(projectId);
      setSuccess(`Refund procesat: ${res.data?.refunded_amount || 0} RON returnați în wallet.`);
      setShowRefundModal(false);
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la refund.');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleApproveAllMods = async (mods) => {
    try {
      for (const m of mods) await modificationAPI.approveModification(m.id);
      setSuccess('Modificări aprobate!');
      fetchModifications(); fetchProject();
    } catch (err) { setError(err.response?.data?.error || 'Eroare'); }
  };

  const handleRejectAllMods = async (mods) => {
    try {
      for (const m of mods) await modificationAPI.rejectModification(m.id);
      setSuccess('Modificări respinse!');
      fetchModifications();
    } catch (err) { setError(err.response?.data?.error || 'Eroare'); }
  };

  const handleOpenProposeProject = () => {
    setProposeMsId(null);
    setProposeForm({
      title: project.title || '',
      description: project.description || '',
      budget_ron: project.budget_ron || '',
      timeline_days: project.timeline_days || '',
    });
    setShowProposeModal(true);
  };

  const handleOpenProposeMilestone = (ms) => {
    setProposeMsId(ms.id);
    setProposeForm({
      title: ms.title || '',
      deliverable_description: ms.deliverable_description || '',
      amount_ron: ms.amount_ron || '',
      percentage_of_budget: ms.percentage_of_budget || '',
    });
    setShowProposeModal(true);
  };

  const handleSubmitPropose = async () => {
    setProposeSubmitting(true);
    try {
      if (!proposeMsId) {
        const fields = ['title', 'description', 'budget_ron', 'timeline_days'];
        const original = { title: project.title, description: project.description, budget_ron: project.budget_ron, timeline_days: project.timeline_days };
        let count = 0;
        for (const field of fields) {
          if (String(proposeForm[field]) !== String(original[field] || '')) {
            await modificationAPI.proposeProjectModification({ project_id: projectId, field_name: field, new_value: proposeForm[field] });
            count++;
          }
        }
        if (count === 0) { setError('Nicio modificare detectată.'); return; }
        setSuccess(`${count} modificare${count > 1 ? 'i' : ''} propusă. Cealaltă parte trebuie să accepte.`);
      } else {
        const ms = project.milestones.find(m => m.id === proposeMsId);
        const fields = ['title', 'deliverable_description', 'amount_ron', 'percentage_of_budget'];
        const original = { title: ms.title, deliverable_description: ms.deliverable_description, amount_ron: ms.amount_ron, percentage_of_budget: ms.percentage_of_budget };
        let count = 0;
        for (const field of fields) {
          if (String(proposeForm[field]) !== String(original[field] || '')) {
            await modificationAPI.proposeMilestoneModification({ project_id: projectId, milestone_id: proposeMsId, field_name: field, new_value: proposeForm[field] });
            count++;
          }
        }
        if (count === 0) { setError('Nicio modificare detectată.'); return; }
        setSuccess(`Modificare milestone propusă. Cealaltă parte trebuie să accepte.`);
      }
      setShowProposeModal(false);
      fetchModifications();
    } catch (err) { setError(err.response?.data?.error || 'Eroare la propunere.'); }
    finally { setProposeSubmitting(false); }
  };

  const handleOpenAddTask = async () => {
    setAddTaskForm({ title: '', description: '', budget_ron: project.budget_ron || '', timeline_days: project.timeline_days || 30, service_type: 'matching', expert_id: '', company_id: '', milestones: [{ title: '', deliverable_description: '', percentage_of_budget: 100 }] });
    if (allUsers.length === 0) {
      try {
        const res = await axios.get('/api/users/', { headers });
        setAllUsers(res.data.users || []);
      } catch { /* silent — user list optional for direct */ }
    }
    setShowAddTaskModal(true);
  };

  const handleSubmitAddTask = async () => {
    const validMilestones = addTaskForm.milestones.filter(m => m.title.trim());
    if (!addTaskForm.title || !addTaskForm.description) { setError('Titlul și descrierea sunt obligatorii.'); return; }
    if (validMilestones.length === 0) { setError('Adaugă cel puțin un milestone cu titlu.'); return; }
    if (validMilestones.some(m => !m.percentage_of_budget || parseFloat(m.percentage_of_budget) <= 0)) { setError('Toate milestone-urile trebuie să aibă un procent valid (> 0%).'); return; }
    const totalPct = validMilestones.reduce((s, m) => s + parseFloat(m.percentage_of_budget), 0);
    if (Math.abs(totalPct - 100) > 0.5) { setError(`Suma procentelor trebuie să fie 100%. Acum: ${totalPct}%.`); return; }
    try {
      await axios.post(`/api/tasks/${projectId}/assignments`, {
        ...addTaskForm,
        expert_id: addTaskForm.expert_id || undefined,
        company_id: addTaskForm.company_id || undefined,
        milestones: validMilestones,
      }, { headers });
      setSuccess('Task adăugat cu succes!');
      setShowAddTaskModal(false);
      fetchProject();
    } catch (err) { setError(err.response?.data?.error || 'Eroare la adăugarea task-ului.'); }
  };

  const updateAtf = (idx, field, value) => setAddTaskForm(p => ({ ...p, milestones: p.milestones.map((m, i) => i === idx ? { ...m, [field]: value } : m) }));
  const addAtfMs = () => setAddTaskForm(p => ({ ...p, milestones: [...p.milestones, { title: '', deliverable_description: '', percentage_of_budget: '' }] }));
  const removeAtfMs = (idx) => setAddTaskForm(p => ({ ...p, milestones: p.milestones.filter((_, i) => i !== idx) }));

  if (loading) return <div className="escro-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}><Spinner /></div>;
  if (!project) return (
    <div className="escro-page" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <EmptyState icon="folder" title="Proiect negăsit" description="Proiectul nu a putut fi găsit." />
      <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => navigate(-1)}>← Înapoi</button>
    </div>
  );

  const assignedPartyId = project.expert_id || project.company_id;
  const isAssigned = !!assignedPartyId;
  const isParty1 = String(user?.id || '') === String(assignedPartyId || '');
  // Beneficiar = client_id (sau posted_by_client pe matching) — acceptăm ambele
  const isParty2 = (
    String(user?.id || '') === String(project.client_id || '')
    || String(user?.id || '') === String(project.posted_by_client || '')
  );
  const isAdminUser = user?.role === 'admin';
  const isInvolved = isParty1 || isParty2 || isAdminUser;
  const canChat = isAdminUser || (isAssigned && (isParty1 || isParty2) && project.status !== 'completed');
  const budget = project.budget_ron || project.budget || 0;
  const totalReleased = (project.milestones || []).filter(m => m.status === 'released' || m.status === 'approved').reduce((s, m) => s + (parseFloat(m.amount_ron) || 0), 0);
  const progress = budget > 0 ? Math.round((totalReleased / budget) * 100) : 0;
  const contractSigned = workflowStatus?.projectContract?.status === 'accepted';
  const canPropose = (isParty1 || isParty2) && isAssigned && !contractSigned;

  const pendingMods = modifications.filter(m => m.status === 'pending');
  const groupedMods = pendingMods.reduce((acc, mod) => {
    if (!acc[mod.proposed_by]) acc[mod.proposed_by] = { name: mod.proposed_by_name, mods: [] };
    acc[mod.proposed_by].mods.push(mod);
    return acc;
  }, {});

  const pendingSignatureCount = (() => {
    if (!isParty1 && !isParty2) return 0;
    let n = 0;
    const projectContractDone = workflowStatus?.projectContract?.status === 'accepted';
    if (workflowStatus?.projectContract && !projectContractDone) {
      const mine = isParty1 ? workflowStatus.projectContract.party1_accepted : workflowStatus.projectContract.party2_accepted;
      if (!mine) n++;
    }
    (project?.milestones || []).forEach((ms, idx) => {
      const prevMsDone = idx === 0 || ['approved', 'released'].includes((project?.milestones || [])[idx - 1]?.status);
      if (!projectContractDone || !prevMsDone) return;
      if (['pending', 'in_progress', 'revision_requested'].includes(ms.status) && isParty1) n++;
      if (ms.status === 'delivered' && isParty2) n++;
    });
    return n;
  })();

  const tabs = [
    { id: 'details', label: 'Detalii', icon: 'folder' },
    ...(canChat ? [{ id: 'chat', label: 'Chat', icon: 'message' }] : []),
    // Tab Contracte ascuns pentru PM tasks — acestea folosesc flux dedicat de finalizare (Solicită finalizare → admin).
    ...(!project.is_pm_task && isInvolved ? [{ id: 'contracts', label: 'Contracte', icon: 'file', badge: pendingSignatureCount }] : []),
  ];

  const msStatusColor = { pending: 'var(--fg-3)', in_progress: 'var(--accent)', delivered: 'var(--success)', revision_requested: 'var(--warning)', approved: 'var(--success)', disputed: 'var(--danger)', released: 'var(--violet)' };

  return (
    <div className="escro-page fade-up">
      {/* Back — sub-tasks (project_id linked to a parent PM task) return to the parent task page */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => project.task_id ? navigate(`/project/${project.task_id}`) : navigate(-1)}
        >
          <Icon name="arrow-left" size={12} /> {project.task_id ? 'Înapoi la project management' : 'Înapoi'}
        </button>
      </div>

      {/* Status banner — for the poster while the project is still pre-assignment */}
      {isParty2 && !project.expert_id && !project.company_id && (() => {
        if (project.status === 'pending_admin_approval') {
          return (
            <ActionBanner
              tone="accent"
              eyebrow="Proiect trimis"
              title="Proiectul tău este în verificare la administrator"
              body="Taskul va fi publicat după validare. Te anunțăm imediat ce devine vizibil prestatorilor."
              icon="clock"
            />
          );
        }
        if (['open', 'pending_assignment'].includes(project.status)) {
          return (
            <ActionBanner
              tone="success"
              eyebrow="Proiect publicat"
              title="Taskul tău este în căutarea unui prestator"
              body="L-am publicat în Marketplace. Te notificăm imediat ce un expert sau o companie se asociază cu proiectul tău."
              icon="search"
            />
          );
        }
        return null;
      })()}

      {/* Header */}
      <div className="page-head" style={{ alignItems: 'flex-start', borderBottom: '1px solid var(--border-1)', paddingBottom: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1 }}>
          <div className="h-eyebrow">
            <Icon name="hash" size={11} /> #{project.id} · contractat {fmtDate(project.created_at)}
          </div>
          <h1 className="h-title" style={{ fontSize: 34 }}>{project.title}</h1>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge status={project.status} />
            {(project.client_name || project.company_name) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-2)' }}>
                <Icon name="building" size={13} />
                {project.client_name || project.company_name}
              </span>
            )}
            {(project.expert_name) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-2)' }}>
                <Icon name="user" size={13} />
                {project.expert_name}
              </span>
            )}
            {project.timeline_days && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-2)' }}>
                <Icon name="clock" size={13} />
                {project.timeline_days} zile
              </span>
            )}
          </div>
        </div>
        <div className="page-actions">
          {/* Apply to project — prestator on a marketplace-visible project they don't own */}
          {!project.is_pm_task
            && !project.is_owner
            && !project.expert_id && !project.company_id
            && ['expert', 'company'].includes(user?.role)
            && ['open', 'pending_assignment'].includes(project.status)
            && ['matching', 'direct'].includes(project.service_type) && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowApplyModal(true)}>
              <Icon name="send" size={13} /> Aplică la proiect
            </button>
          )}
          {project.is_pm_task && project.is_creator && (
            <button className="btn btn-primary btn-sm" onClick={handleOpenAddTask}>
              <Icon name="plus" size={13} /> Adaugă task
            </button>
          )}
          {/* PM tasks: cancel only if no assignments AND no contract started yet */}
          {project.is_creator && project.is_pm_task && (project.assignments || []).length === 0
            && !['completed', 'cancelled', 'rejected'].includes(project.status)
            && !workflowStatus?.projectContract && (
            <button
              className="btn btn-sm"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
              onClick={handleCancelProject}
            >
              <Icon name="x" size={13} /> Anulează proiect
            </button>
          )}
          {project.is_creator && project.is_pm_task && (project.assignments || []).length > 0
            && !['completed', 'cancelled', 'rejected'].includes(project.status) && (
            project.pm_finalization_requested_at ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, padding: '6px 12px',
                background: 'var(--accent-bg)', color: 'var(--accent-hi)',
                border: '1px solid var(--accent-border)', borderRadius: 'var(--r-sm)',
              }}>
                <Icon name="clock" size={12} /> Finalizare cerută — așteaptă admin
              </span>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleStartPmFinalize(project.id)}
              >
                <Icon name="check" size={13} /> Solicită finalizare proiect
              </button>
            )
          )}
          {/* Non-PM projects: cancel allowed only before contract signing begins */}
          {project.is_creator && !project.is_pm_task && !['completed', 'cancelled', 'rejected'].includes(project.status)
            && !workflowStatus?.projectContract && (
            <button
              className="btn btn-sm"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
              onClick={handleCancelProject}
            >
              <Icon name="x" size={13} /> Anulează proiect
            </button>
          )}
          {project.is_creator && !project.is_pm_task && ['cancelled', 'rejected', 'disputed'].includes(project.status) && (
            <button className="btn btn-primary btn-sm" onClick={openRefundModal}>
              <Icon name="reload" size={13} /> Solicită refund
            </button>
          )}
        </div>
      </div>

      {/* Expert/Company accept assignment banner */}
      {project.status === 'pending_expert_approval' && (project.is_assigned_expert || project.is_assigned_company) && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'var(--accent-bg)',
          border: '1px solid var(--accent-border)',
          borderRadius: 'var(--r-md)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent-hi)' }}>
              <Icon name="user-plus" size={14} /> Ai fost asignat la acest proiect
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-1)', marginTop: 4 }}>
              Verifică detaliile (buget, milestones, deadline) și acceptă pentru a începe colaborarea, sau refuză dacă nu poți onora.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={handleExpertRejectAssignment}>
              Refuză
            </button>
            <button className="btn btn-success btn-sm" onClick={handleExpertAcceptAssignment}>
              <Icon name="check" size={13} /> Accept asignare
            </button>
          </div>
        </div>
      )}

      {/* Sub-task awaiting client approval — show when PM has any sub-task pending the
          current user's approval (PM owner). Sends user to the specific assignment detail. */}
      {project.is_pm_task && (project.is_owner || project.is_creator)
        && (project.assignments || []).some(a => a.status === 'pending_client_approval') && (() => {
        const pending = (project.assignments || []).filter(a => a.status === 'pending_client_approval');
        return (
          <div style={{
            padding: '1rem 1.25rem',
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning-border)',
            borderRadius: 'var(--r-md)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--warning)' }}>
                <Icon name="flag" size={14} /> {pending.length === 1 ? 'Un task nou așteaptă aprobarea ta' : `${pending.length} task-uri așteaptă aprobarea ta`}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--fg-1)', marginTop: 4 }}>
                Adminul a configurat {pending.length === 1 ? 'un task' : `${pending.length} task-uri`} în proiectul tău. Verifică detaliile și aprobă pentru ca prestatorul să poată începe lucrul.
              </div>
            </div>
            {pending.length === 1 && (
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/project/${project.id}/assignment/${pending[0].id}`)}>
                <Icon name="arrow-right" size={13} /> Vezi taskul
              </button>
            )}
          </div>
        );
      })()}

      {/* Admin edit banner — user must accept/reject admin's proposed changes */}
      {project.status === 'pending_client_approval' && (project.is_owner || project.is_creator) && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'var(--warning-bg)',
          border: '1px solid var(--warning-border)',
          borderRadius: 'var(--r-md)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--warning)' }}>
              <Icon name="alert-triangle" size={14} /> Adminul a propus modificări
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-1)', marginTop: 4 }}>
              Verifică detaliile proiectului (titlu, descriere, buget, milestones) și confirmă pentru a activa proiectul, sau respinge pentru ca adminul să revizuiască.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={handleRejectAdminEdit}>
              Respinge
            </button>
            <button className="btn btn-success btn-sm" onClick={handleAcceptAdminEdit}>
              <Icon name="check" size={13} /> Confirmă modificările
            </button>
          </div>
        </div>
      )}

      {/* Admin banner: PM finalization request pending approval */}
      {isAdminUser && project.is_pm_task && project.pm_finalization_requested_at && !project.pm_finalization_approved_at && project.status !== 'completed' && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          borderRadius: 'var(--r-md)', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent-hi)' }}>
              <Icon name="check" size={14} /> Beneficiarul a solicitat finalizarea proiectului
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-1)', marginTop: 4 }}>
              Verifică toate sub-asignările și confirmă închiderea task-ului PM. Cererea a fost trimisă pe {new Date(project.pm_finalization_requested_at).toLocaleString('ro-RO')}.
            </div>
          </div>
          <button
            className="btn btn-success btn-sm"
            onClick={async () => {
              if (!window.confirm('Confirmi închiderea task-ului PM? Acțiunea e finală.')) return;
              try {
                await axios.post(`/api/tasks/${projectId}/approve-finalization`, {}, { headers });
                setSuccess('Finalizare aprobată. Beneficiarul a fost notificat.');
                fetchProject();
              } catch (e) {
                setError(e.response?.data?.error || 'Eroare la aprobare.');
              }
            }}
          >
            <Icon name="check" size={13} /> Aprobă finalizarea
          </button>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div style={{ padding: '.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16 }} onClick={() => setError('')}>✕</button>
        </div>
      )}
      {success && (
        <div style={{ padding: '.75rem 1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--r-sm)', color: 'var(--success)', fontSize: 13, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {success}
          <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--success)', fontSize: 16 }} onClick={() => setSuccess('')}>✕</button>
        </div>
      )}

      {/* Pending modifications banner */}
      {pendingMods.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--warning-border)', background: 'var(--warning-bg)', marginBottom: '1.5rem' }}>
          <div className="card-head">
            <div className="row" style={{ gap: '.5rem' }}>
              <Icon name="flag" size={14} style={{ color: 'var(--warning)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Modificări propuse</span>
            </div>
          </div>
          <div className="card-body col" style={{ gap: '.75rem' }}>
            {Object.entries(groupedMods).map(([pid, g]) => (
              <div key={pid} style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-sm)', padding: '1rem', border: '1px solid var(--border-1)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: '.75rem' }}>{g.name} a propus {g.mods.length} modificare{g.mods.length > 1 ? 'i' : ''}:</div>
                <div className="col" style={{ gap: '.5rem', marginBottom: '.75rem' }}>
                  {g.mods.map(m => (
                    <div key={m.id} className="row-between" style={{ fontSize: 12.5, padding: '.5rem .75rem', background: 'var(--bg-1)', borderRadius: 'var(--r-sm)' }}>
                      <span style={{ color: 'var(--fg-2)' }}>{m.field_name}</span>
                      <span><span style={{ color: 'var(--danger)', textDecoration: 'line-through', marginRight: 6 }}>{m.old_value || '—'}</span>→ <strong style={{ color: 'var(--success)' }}>{m.new_value}</strong></span>
                    </div>
                  ))}
                </div>
                {String(pid) !== String(user?.id) && (
                  <div className="row" style={{ gap: '.5rem' }}>
                    <button className="btn btn-success btn-sm" onClick={() => handleApproveAllMods(g.mods)}>Acceptă tot</button>
                    <button className="btn btn-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }} onClick={() => handleRejectAllMods(g.mods)}>Respinge tot</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow mini-stepper (non-PM only) */}
      <WorkflowStepper
        project={project}
        workflowStatus={workflowStatus}
        onJump={(id) => {
          if (id === 'contract' || id === 'final') setActiveTab('contracts');
          else setActiveTab('contracts');
        }}
      />

      {/* Tabs */}
      <div className="tabs-v3" style={{ marginBottom: '1.5rem' }}>
        {tabs.map(t => (
          <div key={t.id} className={`tab-v3 ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name={t.icon} size={13} /> {t.label}
            {t.badge > 0 && (
              <span style={{
                minWidth: 17, height: 17, padding: '0 4px',
                background: 'var(--warning)', color: '#fff',
                fontSize: 9, fontWeight: 700, borderRadius: 9,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}>
                {t.badge > 9 ? '9+' : t.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ——— DETAILS ——— */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left: brief + milestones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <div className="card-head">
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--fg-0)' }}>Brief de proiect</div>
                <div className="row" style={{ gap: '.5rem' }}>
                  {canPropose && (
                    <button className="btn btn-ghost btn-sm" onClick={handleOpenProposeProject}>
                      <Icon name="edit" size={12} /> Propune modificare
                    </button>
                  )}
                  <span className="badge no-dot">{contractSigned ? 'Contract semnat' : 'Sigilat'}</span>
                </div>
              </div>
              <div className="card-body">
                <p style={{ fontFamily: 'var(--f-display)', fontSize: 18, lineHeight: 1.5, color: 'var(--fg-0)', letterSpacing: '-0.01em', marginBottom: '1rem' }}>
                  „{project.description || 'Fără descriere.'}"
                </p>
                <div className="grid-3" style={{ marginTop: '1rem' }}>
                  <div>
                    <div className="h-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Serviciu</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-0)' }}>{project.is_pm_task ? 'Project Management' : (project.service_type ? serviceLabel(project.service_type) : '—')}</div>
                  </div>
                  <div>
                    <div className="h-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Timeline</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-0)' }}>{project.timeline_days ? `${project.timeline_days} zile` : '—'}</div>
                  </div>
                  <div>
                    <div className="h-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Buget</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-0)', fontFamily: 'var(--f-mono)' }}>{fmtRON(budget)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* PM Project: show assignments list. Regular project: show milestones */}
            {project.is_pm_task ? (
              <div className="card">
                <div className="card-head">
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--fg-0)' }}>Taskuri</div>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
                    {(project.assignments || []).length} task{(project.assignments || []).length !== 1 ? 'uri' : ''}
                  </span>
                </div>
                {!(project.assignments || []).length ? (
                  <EmptyState icon="kanban" title="Niciun task adăugat" description="Adminul sau beneficiarul va adăuga taskuri în acest proiect." />
                ) : (
                  <div className="card-body col" style={{ gap: '.625rem' }}>
                    {(project.assignments || []).map((a, i) => {
                      const needsPrestator = !a.expert_id && !a.company_id
                        && ['pending_assignment', 'pending_admin_approval', 'open'].includes(a.status);
                      // Sub-task is waiting for THIS user (PM owner) to approve. Highlight it.
                      const needsClientApproval = a.status === 'pending_client_approval'
                        && (project.is_owner || project.is_creator);
                      const highlight = needsClientApproval;
                      return (
                      <div
                        key={a.id}
                        className="card-interactive card"
                        style={{
                          padding: '1rem 1.25rem',
                          cursor: 'pointer',
                          border: `1px solid ${highlight ? 'var(--warning-border)' : 'var(--border-1)'}`,
                          background: highlight ? 'var(--warning-bg)' : undefined,
                          position: 'relative',
                        }}
                        onClick={() => navigate(`/project/${project.id}/assignment/${a.id}`)}
                      >
                        {needsClientApproval && (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '3px 9px', borderRadius: 100,
                            background: 'var(--warning)', color: '#000',
                            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
                            textTransform: 'uppercase', marginBottom: 8,
                          }}>
                            <span className="urgent-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: '#000' }} />
                            Acțiune necesară · Aprobă task-ul
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--fg-3)', background: 'var(--bg-1)', padding: '2px 6px', borderRadius: 4 }}>#{i + 1}</span>
                              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>{a.title}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
                              <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>{serviceLabel(a.service_type)}</span>
                              <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>{fmtRON(a.budget_ron)}</span>
                              {(a.expert_name || a.company_name) ? (
                                <span style={{ fontSize: 11, color: 'var(--fg-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Icon name="user" size={10} /> {a.expert_name || a.company_name}
                                </span>
                              ) : needsPrestator ? (
                                <span style={{ fontSize: 11, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                  <Icon name="user" size={10} /> Fără prestator
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {needsClientApproval && (
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: 11 }}
                                onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.id}/assignment/${a.id}`); }}
                              >
                                <Icon name="check" size={11} /> Aprobă
                              </button>
                            )}
                            {needsPrestator && isAdminUser && !needsClientApproval && (
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: 11 }}
                                onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.id}/assignment/${a.id}`); }}
                              >
                                <Icon name="user-plus" size={11} /> Asignează prestator
                              </button>
                            )}
                            <StatusBadge status={a.status} />
                            <Icon name="chevron-right" size={13} style={{ color: 'var(--fg-3)' }} />
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="card">
                <div className="card-head">
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--fg-0)' }}>Milestones</div>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
                    {(project.milestones || []).filter(m => ['approved','released'].includes(m.status)).length}/{(project.milestones || []).length} complete
                    {totalReleased > 0 && ` · ${fmtRON(totalReleased)} debursat`}
                  </span>
                </div>
                {!project.milestones?.length ? (
                  <EmptyState icon="flag" title="Niciun milestone" description="Nu sunt milestones definite." />
                ) : (
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {project.milestones.map((ms, i) => {
                      const prevMs = project.milestones[i - 1];
                      const prevMsDone = i === 0 || (prevMs && ['approved', 'released'].includes(prevMs.status));
                      return (
                        <MilestoneCardV2
                          key={ms.id}
                          ms={ms}
                          idx={i}
                          isParty1={isParty1}
                          isParty2={isParty2}
                          canPropose={canPropose}
                          contractSigned={contractSigned}
                          prevMsDone={prevMsDone}
                          onEditPropose={() => handleOpenProposeMilestone(ms)}
                          onJumpContracts={() => setActiveTab('contracts')}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {project.is_pm_task ? (
              /* PM project sidebar: budget allocation summary */
              <>
                <div className="card">
                  <div className="card-head">
                    <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--fg-0)' }}>Buget proiect</div>
                  </div>
                  <div className="card-body col" style={{ gap: 10 }}>
                    {(() => {
                      const allAssignments = project.assignments || [];
                      const completedAssignments = allAssignments.filter(a => a.status === 'completed');
                      const activeAssignments = allAssignments.filter(a => a.status !== 'completed');
                      const allocatedBudget = allAssignments.reduce((s, a) => s + (parseFloat(a.budget_ron) || 0), 0);
                      const completedBudget = completedAssignments.reduce((s, a) => s + (parseFloat(a.budget_ron) || 0), 0);
                      const pmProgress = budget > 0 ? Math.round((completedBudget / budget) * 100) : 0;
                      return (<>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: 'var(--fg-3)' }}>Total buget</span>
                          <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 600 }}>{fmtRON(budget)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: 'var(--fg-3)' }}>Alocat pe taskuri</span>
                          <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--accent)' }}>{fmtRON(allocatedBudget)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: 'var(--fg-3)' }}>Cheltuit (finalizat)</span>
                          <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--success)' }}>{fmtRON(completedBudget)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: 'var(--fg-3)' }}>Progres</span>
                          <span style={{ fontFamily: 'var(--f-mono)' }}>{pmProgress}%</span>
                        </div>
                        <div className="bar" style={{ marginTop: 4 }}>
                          <div className="bar-fill" style={{ width: `${pmProgress}%` }} />
                        </div>
                        <div style={{ height: 1, background: 'var(--border-1)', margin: '4px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: 'var(--fg-3)' }}>Taskuri active</span>
                          <span style={{ fontFamily: 'var(--f-mono)' }}>{activeAssignments.length}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: 'var(--fg-3)' }}>Taskuri finalizate</span>
                          <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--success)' }}>{completedAssignments.length} / {allAssignments.length}</span>
                        </div>
                        <div style={{ height: 1, background: 'var(--border-1)', margin: '4px 0' }} />
                        <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                          Escrow-ul se activează per task, la semnarea contractului.
                        </div>
                      </>);
                    })()}
                  </div>
                </div>
                <div className="card">
                  <div className="card-head">
                    <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--fg-0)' }}>Beneficiar</div>
                  </div>
                  <div className="card-body">
                    {project.client_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <Avatar user={{ name: project.client_name, color: 'blue' }} size="md" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-0)' }}>{project.client_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>Client · Project Management</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Regular project sidebar: vault + parties + quick actions */
              <>
                <VaultHeroSegmented
                  project={project}
                  totalReleased={totalReleased}
                  escrowAccount={escrowAccount}
                  isParty2={isParty2}
                  projectId={projectId}
                  navigate={navigate}
                  budget={budget}
                />

                <div className="card">
                  <div className="card-head">
                    <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--fg-0)' }}>Părți</div>
                    <span className="badge badge-green no-dot"><Icon name="check" size={10} /> Verificate</span>
                  </div>
                  <div className="card-body">
                    {(project.client_name || project.company_name) && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '1rem' }}>
                        <Avatar user={{ name: project.client_name || project.company_name, color: 'blue' }} size="md" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: 'var(--fg-0)', fontWeight: 500 }}>{project.client_name || project.company_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>Companie · Beneficiar</div>
                        </div>
                        <TrustMeter level={3} />
                      </div>
                    )}
                    {(project.expert_name || project.company_id) && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                        <Avatar user={{ name: project.expert_name || project.company_name || '—', color: 'cyan' }} size="md" online />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: 'var(--fg-0)', fontWeight: 500 }}>{project.expert_name || project.company_name || 'Fără prestator'}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>{project.expert_expertise || 'Expert · Prestator'}</div>
                        </div>
                        <TrustMeter level={4} />
                      </div>
                    )}
                    {!project.expert_name && !project.expert_id && !project.company_id && (
                      <div style={{ padding: '.75rem', background: 'var(--warning-bg)', borderRadius: 'var(--r-sm)', fontSize: 12.5, color: 'var(--warning)' }}>
                        În căutare de prestator...
                      </div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-head"><div style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--fg-0)' }}>Acțiuni rapide</div></div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button className="btn btn-secondary" style={{ justifyContent: 'space-between', width: '100%' }} onClick={() => setActiveTab('chat')}>
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Icon name="message" size={13} /> Chat echipă
                      </span>
                      <Icon name="chevron-right" size={13} />
                    </button>
                    <button className="btn btn-secondary" style={{ justifyContent: 'space-between', width: '100%' }} onClick={() => setActiveTab('contracts')}>
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Icon name="file" size={13} /> Contracte
                        {pendingSignatureCount > 0 && (
                          <span style={{
                            minWidth: 17, height: 17, padding: '0 4px',
                            background: 'var(--warning)', color: '#fff',
                            fontSize: 9, fontWeight: 700, borderRadius: 9,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                          }}>
                            {pendingSignatureCount > 9 ? '9+' : pendingSignatureCount}
                          </span>
                        )}
                      </span>
                      <Icon name="chevron-right" size={13} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ——— CHAT ——— */}
      {activeTab === 'chat' && (
        <div className="card chat-wrap">
          <div className="card-head">
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--fg-0)' }}>Chat echipă</div>
            <span className="pulse ok" style={{ verticalAlign: '-1px' }} />
          </div>
          <div className="chat-msgs">
            {chatHasMore && (
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <button className="btn btn-ghost btn-sm" onClick={loadMoreMessages} disabled={chatLoadingMore} style={{ fontSize: 11 }}>
                  {chatLoadingMore ? '…' : 'Încarcă mesaje mai vechi'}
                </button>
              </div>
            )}
            {messages.length === 0 ? (
              <EmptyState icon="message" title="Niciun mesaj" description="Începe conversația!" />
            ) : messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id;
              const isAdminMsg = msg.sender_role === 'admin';
              return (
                <div key={i} className={`chat-msg ${isMe ? 'me' : ''}`} style={isAdminMsg ? { '--admin-msg-color': 'var(--violet)' } : undefined}>
                  {!isMe && <Avatar user={{ name: msg.sender_name || '?', color: isAdminMsg ? 'purple' : 'blue' }} size="sm" />}
                  <div>
                    <div className="chat-bubble" style={isAdminMsg ? {
                      background: 'var(--violet-bg, rgba(168,85,247,0.12))',
                      border: '1px solid var(--violet, #a855f7)',
                      color: 'var(--fg-0)',
                    } : undefined}>
                      {isAdminMsg && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--violet, #a855f7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                          ⚡ Mesaj admin
                        </div>
                      )}
                      {msg.content}
                    </div>
                    <div className="chat-meta">{msg.sender_name || 'Utilizator'}{isAdminMsg ? ' · Admin' : ''} · {fmtMsgDate(msg.created_at)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          {['completed', 'cancelled', 'rejected'].includes(project?.status) ? (
            <div style={{
              padding: '0.875rem 1rem',
              background: 'var(--bg-1)', border: '1px solid var(--border-1)',
              borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: '0.625rem',
              fontSize: 12.5, color: 'var(--fg-2)',
            }}>
              <Icon name="lock" size={13} style={{ color: 'var(--fg-3)' }} />
              Conversația e blocată — proiectul este {project.status === 'completed' ? 'finalizat' : project.status === 'cancelled' ? 'anulat' : 'respins'}. Poți vedea mesajele anterioare, dar nu mai poți trimite mesaje noi.
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="chat-input-row">
              <input
                className="input"
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Scrie un mesaj…"
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-secondary" style={{ padding: '0.55rem' }}>
                <Icon name="file" size={14} />
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem' }}>
                <Icon name="send" size={14} />
              </button>
            </form>
          )}
        </div>
      )}

      {/* ——— CONTRACTS ——— */}
      {activeTab === 'contracts' && (
        <div className="col" style={{ gap: '1.5rem' }}>

          {/* ── PASUL 1: Contract de proiect ── */}
          <ContractStep
            stepNum={1}
            title="Contract de proiect"
            description="Ambele părți semnează contractul principal care definește termenii colaborării."
            status={
              !workflowStatus?.projectContract ? 'pending_action' :
              workflowStatus.projectContract.status === 'accepted' ? 'done' : 'in_progress'
            }
          >
            {!workflowStatus?.projectContract && (
              <div>
                <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: '1rem' }}>
                  Contractul principal nu a fost generat. Oricare dintre părți poate iniția procesul.
                </p>
                {(isParty1 || isParty2) && (
                  <button className="btn btn-primary" onClick={handleGenerateProjectContract}>
                    <Icon name="file" size={14} /> Generează contract de proiect
                  </button>
                )}
              </div>
            )}
            {workflowStatus?.projectContract && workflowStatus.projectContract.status !== 'accepted' && (() => {
              const pc = workflowStatus.projectContract;
              const myAccepted = isParty1 ? pc.party1_accepted : pc.party2_accepted;
              const otherAccepted = isParty1 ? pc.party2_accepted : pc.party1_accepted;
              return (
                <div>
                  <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: pc.party1_accepted ? 'var(--success)' : 'var(--border-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {pc.party1_accepted ? <Icon name="check" size={10} style={{ color: '#fff' }} /> : null}
                      </span>
                      <span style={{ color: pc.party1_accepted ? 'var(--success)' : 'var(--fg-3)' }}>
                        Prestator {pc.party1_accepted ? 'a semnat' : 'nu a semnat'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: pc.party2_accepted ? 'var(--success)' : 'var(--border-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {pc.party2_accepted ? <Icon name="check" size={10} style={{ color: '#fff' }} /> : null}
                      </span>
                      <span style={{ color: pc.party2_accepted ? 'var(--success)' : 'var(--fg-3)' }}>
                        Beneficiar {pc.party2_accepted ? 'a semnat' : 'nu a semnat'}
                      </span>
                    </div>
                  </div>
                  {!myAccepted && (
                    <button className="btn btn-success" onClick={() => setSelectedContract(pc)}>
                      <Icon name="check" size={14} /> Semnează contractul
                    </button>
                  )}
                  {myAccepted && !otherAccepted && (
                    <div style={{ fontSize: 13, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon name="clock" size={13} /> Ai semnat — așteptăm semnătura celeilalte părți
                    </div>
                  )}
                </div>
              );
            })()}
            {workflowStatus?.projectContract?.pdf_url && (
              <div style={{ marginBottom: '0.75rem' }}>
                <a href={withAuthToken(workflowStatus.projectContract.pdf_url)} download="contract-proiect.pdf" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="file" size={13} /> Descarcă contract PDF
                </a>
              </div>
            )}
            {workflowStatus?.projectContract?.status === 'accepted' && (
              <div style={{ fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="check" size={13} /> Contractul a fost semnat de ambele părți · Nr. {workflowStatus.projectContract.contract_number}
              </div>
            )}
          </ContractStep>

          {/* ── PASUL 2+: Milestones ── */}
          {(project.milestones || []).map((ms, idx) => {
            const msContract = workflowStatus?.milestoneContracts?.find(c => c.milestone_id === ms.id);
            const projectContractDone = workflowStatus?.projectContract?.status === 'accepted';
            const prevMsDone = idx === 0 || ['approved', 'released'].includes((project.milestones || [])[idx - 1]?.status);
            const isLocked = !projectContractDone || !prevMsDone;

            // A milestone is "funded" if a deposit has actually been processed for it.
            // The Stripe webhook moves the milestone from 'pending' → 'in_progress' on payment
            // success, so any status other than 'pending' means the deposit was recorded.
            const msAmt = parseFloat(ms.amount_ron) || 0;
            const msFunded = ms.status !== 'pending';

            const msStatusLabel = { pending: 'Nesemnat', in_progress: 'În lucru', delivered: 'Livrat — așteptare aprobare', revision_requested: 'Revizuire solicitată', approved: 'Aprobat', released: 'Fonduri eliberate' };
            const msStepStatus = ms.status === 'approved' || ms.status === 'released' ? 'done'
              : ms.status === 'delivered' || ms.status === 'in_progress' || ms.status === 'revision_requested' ? 'in_progress'
              : isLocked ? 'locked' : 'pending_action';

            const myMsAccepted = isParty1 ? ms.party1_approved : ms.party2_approved;
            const otherMsAccepted = isParty1 ? ms.party2_approved : ms.party1_approved;

            return (
              <ContractStep
                key={ms.id}
                stepNum={idx + 2}
                title={`Milestone ${idx + 1}: ${ms.title}`}
                description={`${ms.percentage_of_budget || '—'}% din buget · ${ms.amount_ron ? ms.amount_ron + ' RON' : ''}`}
                status={msStepStatus}
              >
                {/* Escrow block — per milestone, after contract signed */}
                {workflowStatus?.projectContract?.status === 'accepted' && !project.is_project_management && (() => {
                  const msAmount = msAmt;
                  const funded = !!escrowAccount && msFunded;
                  const isPaid = ['approved', 'released'].includes(ms.status);
                  // Show only if previous milestone is done (or this is first) and not locked,
                  // and milestone hasn't already been released to prestator.
                  if (isLocked || isPaid) return null;
                  return (
                    <div style={{
                      marginBottom: '0.875rem', padding: '0.875rem 1rem', borderRadius: 'var(--r-md)',
                      background: funded ? 'var(--success-bg)' : 'var(--warning-bg)',
                      border: `1px solid ${funded ? 'var(--success-border)' : 'var(--warning-border)'}`,
                      display: 'flex', alignItems: 'center', gap: '0.875rem',
                    }}>
                      <Icon name={funded ? 'lock' : 'alert-triangle'} size={16} style={{ color: funded ? 'var(--success)' : 'var(--warning)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 12.5, color: funded ? 'var(--success)' : 'var(--fg-0)' }}>
                          {funded ? `${fmtRON(msAmount)} blocați în escrow` : `Fonduri lipsă · ${fmtRON(msAmount)} necesari`}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2 }}>
                          {funded
                            ? 'Fondurile sunt securizate. Vor fi eliberate la aprobarea acestui milestone.'
                            : 'Beneficiarul trebuie să depună fondurile înainte ca prestatorul să livreze.'}
                        </div>
                        {funded && project.deadline && idx === 0 && (
                          <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--fg-2)', fontFamily: 'var(--f-mono)' }}>
                            Termen limită: {fmtDate(project.deadline)}
                          </div>
                        )}
                      </div>
                      {!funded && isParty2 && (
                        <button className="btn btn-warning btn-sm" onClick={() => openDepositModal(ms)} style={{ flexShrink: 0 }}>
                          Depune {fmtRON(msAmount)}
                        </button>
                      )}
                    </div>
                  );
                })()}

                {msContract?.pdf_url && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <a href={withAuthToken(msContract.pdf_url)} download="contract-milestone.pdf" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="file" size={13} /> Descarcă anexă milestone PDF
                    </a>
                  </div>
                )}
                {isLocked && (
                  <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>
                    <Icon name="lock" size={12} /> {!projectContractDone ? 'Necesită semnarea contractului de proiect.' : 'Necesită finalizarea milestone-ului anterior.'}
                  </div>
                )}
                {!isLocked && (
                  <div className="col" style={{ gap: '0.875rem' }}>
                    {/* Sub-step A: Livrare prestator + semnare contract de predare */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', fontSize: 13 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: ['delivered','approved','released'].includes(ms.status) ? 'var(--success)' : ms.status === 'revision_requested' ? 'var(--warning)' : 'var(--border-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        {['delivered','approved','released'].includes(ms.status) ? <Icon name="check" size={11} style={{ color: '#fff' }} /> : ms.status === 'revision_requested' ? <span style={{ fontSize: 9, color: '#fff' }}>↺</span> : <span style={{ fontSize: 9, color: 'var(--fg-3)' }}>A</span>}
                      </span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 500, color: ['delivered','approved','released'].includes(ms.status) ? 'var(--fg-0)' : ms.status === 'revision_requested' ? 'var(--warning)' : 'var(--fg-2)' }}>
                          {ms.status === 'revision_requested' ? `Revizuire solicitată (${ms.revision_count || 1}/3)` : 'Livrare prestator + contract de predare'}
                        </span>
                        {ms.status === 'revision_requested' && ms.revision_feedback && (
                          <div style={{ marginTop: 6, padding: '0.5rem 0.75rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--fg-1)' }}>
                            <strong style={{ color: 'var(--warning)' }}>Feedback beneficiar:</strong> {ms.revision_feedback}
                          </div>
                        )}
                        {/* Prestator: file input when pending, in_progress or revision_requested */}
                        {(['pending', 'in_progress', 'revision_requested'].includes(ms.status)) && isParty1 && (
                          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {ms.status === 'revision_requested' && (
                              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 2 }}>Încarcă versiunea revizuită:</div>
                            )}
                            {!msFunded && (
                              <div style={{
                                padding: '0.625rem 0.875rem', borderRadius: 'var(--r-sm)',
                                background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
                                fontSize: 12, color: 'var(--fg-1)', display: 'flex', alignItems: 'center', gap: 6,
                              }}>
                                <Icon name="lock" size={12} style={{ color: 'var(--warning)' }} />
                                Așteaptă depunerea fondurilor de către beneficiar pentru acest milestone înainte să livrezi.
                              </div>
                            )}
                            <input
                              type="text"
                              className="input"
                              placeholder="Descriere livrabil (opțional)"
                              value={deliverDescriptions[ms.id] || ''}
                              onChange={e => setDeliverDescriptions(d => ({ ...d, [ms.id]: e.target.value }))}
                              style={{ fontSize: 12, opacity: msFunded ? 1 : 0.5 }}
                              disabled={!msFunded}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <label style={{ cursor: msFunded ? 'pointer' : 'not-allowed', flex: 1, opacity: msFunded ? 1 : 0.5 }}>
                                <div style={{
                                  border: '1.5px dashed var(--border-2)', borderRadius: 'var(--r-sm)',
                                  padding: '0.625rem 1rem', fontSize: 12, color: deliverFiles[ms.id] ? 'var(--fg-0)' : 'var(--fg-3)',
                                  background: deliverFiles[ms.id] ? 'var(--success-bg)' : 'var(--bg-1)',
                                  display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                  <Icon name="upload" size={13} style={{ color: deliverFiles[ms.id] ? 'var(--success)' : 'var(--fg-3)' }} />
                                  {deliverFiles[ms.id] ? deliverFiles[ms.id].name : 'Selectează fișier (PDF, DOC, ZIP…)'}
                                </div>
                                <input
                                  type="file"
                                  style={{ display: 'none' }}
                                  accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.jpg,.jpeg,.png,.mp4"
                                  onChange={e => setDeliverFiles(f => ({ ...f, [ms.id]: e.target.files[0] }))}
                                  disabled={!msFunded}
                                />
                              </label>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={!msFunded || !deliverFiles[ms.id] || deliverBusy[ms.id]}
                                onClick={() => handleStartDelivery(ms.id)}
                                title={!msFunded ? 'Fondurile nu sunt depuse în escrow pentru acest milestone' : undefined}
                              >
                                {deliverBusy[ms.id] ? '…' : ms.status === 'revision_requested' ? '✍️ Relivrează' : '✍️ Livrează'}
                              </button>
                            </div>
                          </div>
                        )}
                        {(['pending', 'in_progress'].includes(ms.status)) && isParty2 && (
                          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--fg-3)' }}>Așteptăm livrarea documentelor de la prestator...</div>
                        )}
                        {ms.status === 'revision_requested' && isParty2 && (
                          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--warning)' }}>Așteptăm versiunea revizuită de la prestator...</div>
                        )}
                        {['delivered','approved','released'].includes(ms.status) && ms.deliverable_file_url && (
                          <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <a
                              href={withAuthToken(ms.deliverable_file_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                            >
                              <Icon name="file" size={12} /> Descarcă livrabil
                            </a>
                            {(() => {
                              const mc = workflowStatus?.milestoneContracts?.find(c => c.milestone_id === ms.id);
                              return mc?.pdf_url ? (
                                <a href={withAuthToken(mc.pdf_url)} download="contract-predare.pdf" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                  <Icon name="file" size={12} /> Contract predare PDF
                                </a>
                              ) : null;
                            })()}
                            {(isAdminUser || isInvolved) && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                                onClick={() => toggleHistory(ms.id)}
                              >
                                <Icon name="list" size={12} /> {historyExpanded[ms.id] ? 'Ascunde istoric' : 'Istoric livrări'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Deliverable upload history (all versions) */}
                        {historyExpanded[ms.id] && (
                          <div style={{ marginTop: 8, padding: '0.625rem 0.875rem', background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-sm)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                              Istoric upload-uri ({(deliverableHistories[ms.id] || []).length} versiuni)
                            </div>
                            {(deliverableHistories[ms.id] || []).length === 0 ? (
                              <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>Nicio versiune înregistrată.</div>
                            ) : (
                              <div className="col" style={{ gap: 4 }}>
                                {(deliverableHistories[ms.id] || []).map(h => (
                                  <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0', borderBottom: '1px dashed var(--border-1)' }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                      <span className="mono" style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg-2)', borderRadius: 3, color: 'var(--fg-3)' }}>v{h.version_number}</span>
                                      <a href={withAuthToken(h.file_url)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-hi)' }}>{h.file_name || 'fișier'}</a>
                                      <span style={{ color: 'var(--fg-3)' }}>· {h.uploaded_by_name || '—'}</span>
                                    </div>
                                    <span style={{ color: 'var(--fg-3)', fontSize: 11 }}>{fmtDate(h.uploaded_at)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Admin release funds — only for admins, when milestone is delivered or disputed */}
                        {isAdminUser && ['delivered','disputed','in_progress','revision_requested'].includes(ms.status) && (
                          <div style={{ marginTop: 8, padding: '0.625rem 0.875rem', background: 'var(--violet-bg, rgba(168,85,247,0.08))', border: '1px solid var(--violet, #a855f7)', borderRadius: 'var(--r-sm)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet, #a855f7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                              ⚡ Decizie admin: eliberare fonduri
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)', fontSize: 12 }}
                                onClick={() => setAdminReleaseForm({ milestoneId: ms.id, direction: 'prestator', amount: ms.amount_ron || '', reason: '' })}
                              >
                                → Eliberează spre prestator
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-border)', fontSize: 12 }}
                                onClick={() => setAdminReleaseForm({ milestoneId: ms.id, direction: 'client', amount: ms.amount_ron || '', reason: '' })}
                              >
                                ← Returnează la beneficiar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sub-step B: Aprobare beneficiar + eliberare fonduri + semnare */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', fontSize: 13 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: ['approved','released'].includes(ms.status) ? 'var(--success)' : 'var(--border-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        {['approved','released'].includes(ms.status) ? <Icon name="check" size={11} style={{ color: '#fff' }} /> : <span style={{ fontSize: 9, color: 'var(--fg-3)' }}>B</span>}
                      </span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 500, color: ['approved','released'].includes(ms.status) ? 'var(--fg-0)' : 'var(--fg-2)' }}>
                          {['approved','released'].includes(ms.status) ? `Aprobat · ${ms.amount_ron} RON eliberați` : 'Confirmare primire + eliberare fonduri'}
                        </span>
                        {['approved','released'].includes(ms.status) && (
                          <div style={{ marginTop: 6 }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: 11 }}
                              onClick={async () => {
                                try {
                                  const r = await axios.get(`/api/milestones/${ms.id}/invoice`, { headers: { Authorization: `Bearer ${token}` } });
                                  if (r.data.invoice_url) {
                                    const blobRes = await axios.get(r.data.invoice_url, {
                                      responseType: 'blob',
                                      headers: { Authorization: `Bearer ${token}` },
                                    });
                                    const url = URL.createObjectURL(new Blob([blobRes.data], { type: 'application/pdf' }));
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `confirmare-plata-${ms.title || ms.id}.pdf`;
                                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                                  }
                                } catch { alert('Nu s-a putut genera confirmarea de plată.'); }
                              }}
                            >
                              <Icon name="file" size={12} /> Descarcă confirmare plată
                            </button>
                          </div>
                        )}
                        {ms.status === 'disputed' && (
                          <div style={{ marginTop: '0.5rem', padding: '0.625rem 0.875rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', fontSize: 12.5, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="flag" size={13} /> Milestone în dispută — workflow-ul este blocat. Adminul va decide cui i se eliberează fondurile.
                          </div>
                        )}
                        {ms.status === 'delivered' && isParty1 && (
                          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>Așteptăm confirmarea beneficiarului...</div>
                        )}
                        {ms.status === 'delivered' && isParty2 && project.status !== 'disputed' && (
                          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleStartApproval(ms.id)}
                              >
                                <Icon name="check" size={12} /> ✍️ Aprobă și eliberează {ms.amount_ron} RON
                              </button>
                              <button
                                className="btn btn-sm"
                                onClick={() => {
                                  setShowRevisionInput(s => ({ ...s, [ms.id]: !s[ms.id] }));
                                  setShowDisputeInput(s => ({ ...s, [ms.id]: false }));
                                }}
                                style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-border)' }}
                              >
                                ↺ Solicită revizuire {ms.revision_count > 0 ? `(${ms.revision_count}/3)` : ''}
                              </button>
                              <button
                                className="btn btn-sm"
                                onClick={() => {
                                  setShowDisputeInput(s => ({ ...s, [ms.id]: !s[ms.id] }));
                                  setShowRevisionInput(s => ({ ...s, [ms.id]: false }));
                                }}
                                style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
                              >
                                <Icon name="flag" size={12} /> Deschide dispută
                              </button>
                            </div>
                            {showRevisionInput[ms.id] && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--r-sm)' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)' }}>
                                  Descrie ce trebuie revizuit ({(ms.revision_count || 0) + 1}/3 revizuiri):
                                </div>
                                <textarea
                                  className="input"
                                  placeholder="Ex: Logo-ul trebuie să fie mai mare, culorile să fie conform brandbook-ului..."
                                  value={revisionFeedbacks[ms.id] || ''}
                                  onChange={e => setRevisionFeedbacks(f => ({ ...f, [ms.id]: e.target.value }))}
                                  style={{ fontSize: 12, minHeight: 70, resize: 'vertical' }}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    className="btn btn-sm"
                                    onClick={() => handleRequestRevision(ms.id)}
                                    disabled={revisionBusy[ms.id]}
                                    style={{ background: 'var(--warning)', color: '#fff', border: 'none' }}
                                  >
                                    {revisionBusy[ms.id] ? '…' : 'Trimite cerere de revizuire'}
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setShowRevisionInput(s => ({ ...s, [ms.id]: false }))}
                                  >
                                    Anulează
                                  </button>
                                </div>
                              </div>
                            )}
                            {showDisputeInput[ms.id] && (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                  type="text"
                                  className="input"
                                  placeholder="Descrie motivul disputei..."
                                  value={disputeReasons[ms.id] || ''}
                                  onChange={e => setDisputeReasons(r => ({ ...r, [ms.id]: e.target.value }))}
                                  style={{ flex: 1, fontSize: 12 }}
                                />
                                <button
                                  className="btn btn-sm"
                                  onClick={() => handleDisputeMilestone(ms.id)}
                                  style={{ background: 'var(--danger)', color: '#fff', border: 'none', flexShrink: 0 }}
                                >
                                  Trimite
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </ContractStep>
            );
          })}

          {/* ── BACKFILL — pentru proiecte finalizate fără documente generate ── */}
          {project.status === 'completed'
            && (workflowStatus?.deliveryContracts || []).length === 0
            && !workflowStatus?.finalContract && (
            <ContractStep
              stepNum={(project.milestones || []).length + 2}
              title="Documente emise"
              description="Contracte de predare-primire și finalizare."
              status="pending_action"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--r-sm)' }}>
                <Icon name="alert-triangle" size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13, color: 'var(--fg-1)' }}>
                  Documentele de predare-primire și finalizare nu au fost generate automat la închiderea acestui proiect.
                </div>
                <button
                  className="btn btn-warning btn-sm"
                  style={{ flexShrink: 0 }}
                  onClick={async () => {
                    try {
                      await axios.post(`/api/contracts/project/${projectId}/backfill`, {}, { headers });
                      await fetchContracts();
                      setSuccess('Documentele au fost generate cu succes!');
                    } catch (e) {
                      setError(e.response?.data?.error || 'Eroare la generarea documentelor.');
                    }
                  }}
                >
                  Generează documentele lipsă
                </button>
              </div>
            </ContractStep>
          )}

          {/* ── DOCUMENTE EMISE — predare-primire + finalizare ── */}
          {((workflowStatus?.deliveryContracts || []).length > 0 || workflowStatus?.finalContract) && (
            <ContractStep
              stepNum={(project.milestones || []).length + 2}
              title="Documente emise"
              description="Contracte de predare-primire generate la fiecare milestone + contractul de finalizare."
              status={workflowStatus?.finalContract?.status === 'accepted' ? 'done' : 'in_progress'}
            >
              <div className="col" style={{ gap: '0.5rem' }}>
                {(workflowStatus?.deliveryContracts || []).map(dc => (
                  <div key={dc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-1)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-1)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-0)' }}>
                        Contract predare-primire — {dc.milestone_title || 'Milestone'}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2 }}>
                        Nr. {dc.contract_number}
                        {dc.party1_accepted && dc.party2_accepted
                          ? <span style={{ color: 'var(--success)', marginLeft: 6 }}>✓ Semnat de ambele părți</span>
                          : dc.party1_accepted
                            ? <span style={{ color: 'var(--warning)', marginLeft: 6 }}>Semnat de prestator</span>
                            : null}
                      </div>
                    </div>
                    {dc.pdf_url ? (
                      <a href={withAuthToken(dc.pdf_url)} download={`predare-primire-${dc.id}.pdf`} className="btn btn-ghost btn-sm" style={{ fontSize: 12, flexShrink: 0 }}>
                        <Icon name="file" size={12} /> Descarcă
                      </a>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--fg-3)', flexShrink: 0 }}>PDF în generare</span>
                    )}
                  </div>
                ))}
                {workflowStatus?.finalContract && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-1)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-1)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-0)' }}>
                        Contract de finalizare proiect
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2 }}>
                        Nr. {workflowStatus.finalContract.contract_number}
                        {workflowStatus.finalContract.status === 'accepted'
                          ? <span style={{ color: 'var(--success)', marginLeft: 6 }}>✓ Finalizat</span>
                          : <span style={{ color: 'var(--warning)', marginLeft: 6 }}>În procesare</span>}
                      </div>
                    </div>
                    {workflowStatus.finalContract.pdf_url ? (
                      <a href={withAuthToken(workflowStatus.finalContract.pdf_url)} download="finalizare-proiect.pdf" className="btn btn-ghost btn-sm" style={{ fontSize: 12, flexShrink: 0 }}>
                        <Icon name="file" size={12} /> Descarcă
                      </a>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--fg-3)', flexShrink: 0 }}>PDF în generare</span>
                    )}
                  </div>
                )}
              </div>
            </ContractStep>
          )}

          {/* ── FINALIZARE AUTOMATĂ ── */}
          {project.status === 'completed' && (
            <ContractStep
              stepNum={(project.milestones || []).length + 3}
              title="Proiect finalizat"
              description="Toate milestone-urile au fost livrate, aprobate și plătite."
              status="done"
            >
              <div className="col" style={{ gap: '0.75rem' }}>
                <div style={{ fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="flag" size={13} /> Proiect finalizat cu succes!
                </div>
                {reviewStatus?.can_review && (
                  <div style={{ padding: '0.875rem 1rem', background: 'var(--accent-bg, #eff6ff)', border: '1px solid var(--accent-border, #bfdbfe)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg-0)' }}>Cum a decurs colaborarea?</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>
                        Lasă o recenzie pentru <strong>{reviewStatus.reviewable_user?.name}</strong> — ajuți comunitatea să ia decizii mai bune.
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowReviewModal(true)}>
                      ★ Lasă recenzie
                    </button>
                  </div>
                )}
                {reviewStatus?.reason === 'already_reviewed' && (
                  <div style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="check" size={12} /> Ai lăsat deja o recenzie pentru acest proiect.
                  </div>
                )}
              </div>
            </ContractStep>
          )}

        </div>
      )}

      {/* Review modal */}
      {showReviewModal && reviewStatus?.reviewable_user && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          reviewableUser={reviewStatus.reviewable_user}
          projectTitle={project?.title}
          projectId={projectId}
          onReviewSubmitted={() => {
            setShowReviewModal(false);
            fetchReviewStatus();
          }}
        />
      )}

      {/* Modals (pass-through — keep original components) */}
      {selectedContract && (
        <ContractModal
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
          onSign={(signature) => handleAcceptContract(selectedContract.id, signature)}
          user={user}
        />
      )}
      {deliveryFlow && (
        <ContractModal
          contract={deliveryFlow.step === 'pred' ? deliveryFlow.predContract : deliveryFlow.finalContract}
          project={project}
          user={user}
          onClose={() => setDeliveryFlow(null)}
          onSign={handleDeliverySign}
        />
      )}
      {approvalFlow && (
        <ContractModal
          contract={approvalFlow.step === 'pred' ? approvalFlow.predContract : approvalFlow.finalContract}
          project={project}
          user={user}
          onClose={() => setApprovalFlow(null)}
          onSign={handleApprovalSign}
        />
      )}
      {pmFinalizeContract && (
        <ContractModal
          contract={pmFinalizeContract}
          project={project}
          user={user}
          onClose={() => setPmFinalizeContract(null)}
          onSign={handlePmFinalizeSign}
        />
      )}
      {adminReleaseForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={e => e.target === e.currentTarget && setAdminReleaseForm(null)}>
          <div className="card" style={{ width: 480, padding: '1.5rem' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg-0)', marginBottom: '0.875rem' }}>
              ⚡ Eliberare fonduri — decizie admin
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: '1rem', lineHeight: 1.5 }}>
              {adminReleaseForm.direction === 'prestator'
                ? 'Banii vor fi eliberați din escrow către prestator (cu comision aplicat).'
                : 'Banii vor fi returnați în wallet-ul beneficiarului.'}
            </div>
            <div className="col" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label className="label">Direcție</label>
                <div className="row" style={{ gap: '.5rem' }}>
                  {[
                    { v: 'prestator', l: '→ Prestator', c: 'var(--success)' },
                    { v: 'client', l: '← Beneficiar', c: 'var(--warning)' },
                  ].map(o => (
                    <button key={o.v} type="button"
                      onClick={() => setAdminReleaseForm(p => ({ ...p, direction: o.v }))}
                      style={{
                        flex: 1, padding: '.625rem', borderRadius: 8, cursor: 'pointer',
                        background: adminReleaseForm.direction === o.v ? `color-mix(in srgb, ${o.c} 18%, transparent)` : 'var(--bg-1)',
                        border: `1.5px solid ${adminReleaseForm.direction === o.v ? o.c : 'var(--border-1)'}`,
                        color: adminReleaseForm.direction === o.v ? o.c : 'var(--fg-2)',
                        fontWeight: 600, fontSize: 13,
                      }}>{o.l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Sumă (RON)</label>
                <input className="input" type="number" min="0" step="0.01"
                  value={adminReleaseForm.amount}
                  onChange={e => setAdminReleaseForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <label className="label">Motiv (opțional)</label>
                <textarea className="input" rows={2} value={adminReleaseForm.reason}
                  onChange={e => setAdminReleaseForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Notă pentru istoric / wallet description" />
              </div>
            </div>
            <div className="row" style={{ gap: '.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setAdminReleaseForm(null)} disabled={adminReleaseLoading}>Anulează</button>
              <button className="btn btn-primary" onClick={handleAdminRelease} disabled={adminReleaseLoading}>
                {adminReleaseLoading ? '…' : 'Confirmă eliberarea'}
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedAnnex && (
        <AnnexModal
          annex={selectedAnnex}
          onClose={() => setSelectedAnnex(null)}
        />
      )}
      {showRefundModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setShowRefundModal(false); }}>
          <div className="card" style={{ width: 420, padding: '1.5rem' }}>
            <div className="card-title" style={{ marginBottom: '.5rem', fontSize: 16 }}>
              <Icon name="reload" size={15} /> Solicită refund escrow
            </div>
            <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: '1rem' }}>
              Vei primi în wallet suma rămasă în escrow pentru proiectul <strong>"{project.title}"</strong>.
            </p>
            <div style={{ padding: '.875rem', background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-sm)', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Sumă de refund</div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 24, fontWeight: 700, color: refundEscrowAmount > 0 ? 'var(--success)' : 'var(--fg-3)' }}>
                {fmtRON(refundEscrowAmount)}
              </div>
              {refundEscrowAmount === 0 && (
                <div style={{ fontSize: 11.5, color: 'var(--warning)', marginTop: 6 }}>
                  ⚠ Nu există fonduri în escrow pentru acest proiect.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowRefundModal(false)} disabled={refundLoading}>
                Anulează
              </button>
              <button className="btn btn-primary" onClick={confirmRefund} disabled={refundLoading || refundEscrowAmount === 0}>
                {refundLoading ? 'Se procesează...' : 'Confirmă refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit funds modal */}
      {showDepositModal && depositMilestone && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(8,12,20,.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 }}
          onClick={e => e.target === e.currentTarget && !escrowLoading && setShowDepositModal(false)}
        >
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: 440, boxShadow: '0 32px 64px rgba(0,0,0,.45)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-1) 100%)' }}>
              <div>
                <div style={{ fontSize: 10, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Depunere fonduri escrow</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-0)' }}>{depositMilestone.title}</div>
              </div>
              <button onClick={() => !escrowLoading && setShowDepositModal(false)} style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--fg-2)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            {/* Body */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Sumă de depus</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--fg-0)', fontFamily: 'var(--f-mono)', letterSpacing: '-0.02em' }}>
                  {fmtRON(depositMilestone.amount_ron)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
                  {depositMilestone.percentage_of_budget}% din bugetul proiectului
                </div>
              </div>
              <div style={{ padding: '0.875rem 1rem', background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: '1.25rem' }}>
                {escrowAccount
                  ? <>Fondurile se adaugă în contul escrow existent și vor fi eliberate prestatorului <strong>numai după ce aprobi livrabilul acestui milestone</strong>.</>
                  : <>Fondurile vor fi blocate în custodie ESCRO și eliberate prestatorului <strong>numai după ce aprobi livrabilul</strong>. Prestatorul va fi notificat imediat și poate începe lucrul.</>
                }
              </div>
              {project.deadline && (
                <div style={{ padding: '0.625rem 1rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
                  <Icon name="clock" size={13} /> Termen limită: <strong>{fmtDate(project.deadline)}</strong>
                </div>
              )}
              <div style={{ display: 'flex', gap: '.625rem' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDepositModal(false)} disabled={escrowLoading}>
                  Anulează
                </button>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleActivateEscrow} disabled={escrowLoading}>
                  {escrowLoading ? 'Se procesează...' : `Depune ${fmtRON(depositMilestone.amount_ron)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Propose modification modal */}
      {/* Apply to project modal */}
      {showApplyModal && project && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 }}
          onClick={e => e.target === e.currentTarget && !applyLoading && setShowApplyModal(false)}>
          <div className="card" style={{ width: 640, padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="row-between" style={{ marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Confirmă aplicarea la proiect</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>Verifică detaliile înainte de a trimite</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => !applyLoading && setShowApplyModal(false)}>✕</button>
            </div>

            <div className="col" style={{ gap: '1rem' }}>
              {/* Project header */}
              <div style={{ padding: '1rem 1.125rem', background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg-0)', marginBottom: 6 }}>{project.title}</div>
                {project.description && (
                  <div style={{ fontSize: 12.5, color: 'var(--fg-1)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                    {project.description}
                  </div>
                )}
              </div>

              {/* Key facts grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '.75rem' }}>
                <div style={{ padding: '.75rem .875rem', background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                    <Icon name="wallet" size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Buget
                  </div>
                  <div style={{ fontSize: 14, fontFamily: 'var(--f-mono)', fontWeight: 700, color: 'var(--fg-0)' }}>
                    {fmtRON(project.budget_ron)} RON
                  </div>
                </div>
                <div style={{ padding: '.75rem .875rem', background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                    <Icon name="clock" size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Termen
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-0)' }}>
                    {project.timeline_days ? `${project.timeline_days} zile` : '—'}
                  </div>
                </div>
                {project.deadline && (
                  <div style={{ padding: '.75rem .875rem', background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)' }}>
                    <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                      <Icon name="calendar" size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Deadline
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>
                      {fmtDate(project.deadline)}
                    </div>
                  </div>
                )}
                {project.service_type && (
                  <div style={{ padding: '.75rem .875rem', background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)' }}>
                    <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                      <Icon name="tag" size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Serviciu
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>
                      {serviceLabel(project.service_type)}
                    </div>
                  </div>
                )}
              </div>

              {/* Client info */}
              {(project.client_name || project.client_company) && (
                <div style={{ padding: '.875rem 1rem', background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
                    <Icon name="user" size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Client
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>
                    {project.client_company || project.client_name}
                  </div>
                  {project.client_industry && (
                    <div style={{ fontSize: 11.5, color: 'var(--fg-2)', marginTop: 2 }}>
                      {project.client_industry}
                    </div>
                  )}
                </div>
              )}

              {/* Milestones list */}
              {project.milestones && project.milestones.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600, marginBottom: '.5rem' }}>
                    <Icon name="flag" size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Etape ({project.milestones.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {project.milestones.map((ms, idx) => (
                      <div key={ms.id || idx} style={{ padding: '.75rem .875rem', background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)' }}>
                        <div className="row-between" style={{ alignItems: 'flex-start', gap: '.75rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>
                              {idx + 1}. {ms.title}
                            </div>
                            {(ms.deliverable_description || ms.description) && (
                              <div style={{ fontSize: 11.5, color: 'var(--fg-2)', marginTop: 4, lineHeight: 1.5 }}>
                                {ms.deliverable_description || ms.description}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--f-mono)', color: 'var(--fg-0)' }}>
                              {fmtRON(ms.amount_ron)} <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>RON</span>
                            </div>
                            {ms.percentage_of_budget != null && (
                              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>
                                {ms.percentage_of_budget}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Process info */}
              <div style={{ padding: '0.875rem 1rem', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--r-md)', fontSize: 12.5, color: 'var(--fg-1)' }}>
                <Icon name="info" size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Aplicația ta va fi trimisă adminului pentru aprobare. Vei fi notificat când e procesată.
              </div>

              {/* Optional message */}
              <div>
                <label className="label">Mesaj pentru admin/client (opțional)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="De ce ești potrivit pentru acest proiect, experiența relevantă, întrebări..."
                  value={applyMessage}
                  onChange={e => setApplyMessage(e.target.value)}
                  maxLength={1000}
                  style={{ resize: 'vertical' }}
                />
                <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4, textAlign: 'right' }}>
                  {applyMessage.length}/1000
                </div>
              </div>

              {/* Actions */}
              <div className="row" style={{ gap: '.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-2)', paddingTop: '1rem' }}>
                <button className="btn btn-ghost" onClick={() => setShowApplyModal(false)} disabled={applyLoading}>
                  Anulează
                </button>
                <button className="btn btn-primary" onClick={handleApplyToProject} disabled={applyLoading}>
                  {applyLoading ? 'Se trimite...' : <><Icon name="check" size={13} /> Confirmă aplicarea</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProposeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setShowProposeModal(false)}>
          <div className="card" style={{ width: 480, padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="row-between" style={{ marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{proposeMsId ? 'Propune modificare milestone' : 'Propune modificare proiect'}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>Cealaltă parte trebuie să accepte modificările.</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowProposeModal(false)}>✕</button>
            </div>
            <div className="col" style={{ gap: '.875rem' }}>
              {!proposeMsId ? (
                <>
                  <div>
                    <label className="label">Titlu proiect</label>
                    <input className="input" value={proposeForm.title || ''} onChange={e => setProposeForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Descriere</label>
                    <textarea className="input" rows={3} value={proposeForm.description || ''} onChange={e => setProposeForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                    <div>
                      <label className="label">Buget (RON)</label>
                      <input className="input" type="number" value={proposeForm.budget_ron || ''} onChange={e => setProposeForm(p => ({ ...p, budget_ron: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Timeline (zile)</label>
                      <input className="input" type="number" value={proposeForm.timeline_days || ''} onChange={e => setProposeForm(p => ({ ...p, timeline_days: e.target.value }))} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="label">Titlu milestone</label>
                    <input className="input" value={proposeForm.title || ''} onChange={e => setProposeForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Descriere livrabil</label>
                    <textarea className="input" rows={2} value={proposeForm.deliverable_description || ''} onChange={e => setProposeForm(p => ({ ...p, deliverable_description: e.target.value }))} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                    <div>
                      <label className="label">Valoare (RON)</label>
                      <input className="input" type="number" value={proposeForm.amount_ron || ''} onChange={e => setProposeForm(p => ({ ...p, amount_ron: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">% din buget</label>
                      <input className="input" type="number" min="1" max="100" value={proposeForm.percentage_of_budget || ''} onChange={e => setProposeForm(p => ({ ...p, percentage_of_budget: e.target.value }))} />
                    </div>
                  </div>
                </>
              )}
              <div style={{ padding: '.5rem .75rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 6, fontSize: 12, color: 'var(--warning)' }}>
                Modificările intră în vigoare doar după ce sunt acceptate de ambele părți.
              </div>
              <div className="row" style={{ gap: '.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowProposeModal(false)}>Anulează</button>
                <button className="btn btn-primary" onClick={handleSubmitPropose} disabled={proposeSubmitting}>
                  <Icon name="send" size={13} /> {proposeSubmitting ? 'Se trimite…' : 'Trimite propunerea'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add task modal — for PM project owner */}
      {showAddTaskModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setShowAddTaskModal(false)}>
          <div className="card" style={{ width: 560, padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="row-between" style={{ marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg-0)' }}>Adaugă task în proiect</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>{project.title}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddTaskModal(false)}>✕</button>
            </div>
            <div className="col" style={{ gap: '1rem' }}>
              <div>
                <label className="label">Titlu task *</label>
                <input className="input" value={addTaskForm.title} placeholder="Ex: Design UI aplicație mobilă"
                  onChange={e => setAddTaskForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Descriere *</label>
                <textarea className="input" rows={3} value={addTaskForm.description} placeholder="Detaliază ce trebuie realizat..."
                  onChange={e => setAddTaskForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                <div>
                  <label className="label">Buget (RON)</label>
                  <input className="input" type="number" value={addTaskForm.budget_ron}
                    onChange={e => setAddTaskForm(p => ({ ...p, budget_ron: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Termen (zile)</label>
                  <input className="input" type="number" value={addTaskForm.timeline_days}
                    onChange={e => setAddTaskForm(p => ({ ...p, timeline_days: parseInt(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="label">Tip task</label>
                <div className="row" style={{ gap: '.75rem' }}>
                  {[{ v: 'matching', l: 'Matching', d: 'Admin asignează prestator' }, { v: 'direct', l: 'Direct', d: 'Specific un prestator' }].map(o => (
                    <div key={o.v} onClick={() => setAddTaskForm(p => ({ ...p, service_type: o.v, expert_id: '', company_id: '' }))}
                      style={{ flex: 1, padding: '.75rem', borderRadius: 8, border: `1.5px solid ${addTaskForm.service_type === o.v ? 'var(--accent)' : 'var(--border-1)'}`, cursor: 'pointer', background: addTaskForm.service_type === o.v ? 'var(--accent-bg)' : 'var(--bg-1)' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg-0)' }}>{o.l}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{o.d}</div>
                    </div>
                  ))}
                </div>
              </div>

              {addTaskForm.service_type === 'direct' && (
                <div>
                  <label className="label">Prestator</label>
                  <select
                    className="input"
                    value={addTaskForm.expert_id || addTaskForm.company_id || ''}
                    onChange={e => {
                      const sel = allUsers.find(u => String(u.id) === e.target.value);
                      setAddTaskForm(p => ({
                        ...p,
                        expert_id: sel?.role === 'expert' ? e.target.value : '',
                        company_id: sel?.role === 'company' ? e.target.value : '',
                      }));
                    }}
                  >
                    <option value="">— Selectează un prestator —</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}{u.company ? ` (${u.company})` : ''} · {u.role === 'company' ? 'Companie' : 'Expert'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Milestones */}
              <div>
                <div className="row-between" style={{ marginBottom: '.625rem' }}>
                  <label className="label" style={{ margin: 0 }}>Milestones * <span style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 400 }}>(suma = 100%)</span></label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addAtfMs}>
                    <Icon name="plus" size={12} /> Adaugă
                  </button>
                </div>
                <div className="col" style={{ gap: '.5rem' }}>
                  {addTaskForm.milestones.map((m, i) => (
                    <div key={i} style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '.75rem' }}>
                      <div className="row-between" style={{ marginBottom: '.5rem' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>MS {i + 1}</span>
                        {addTaskForm.milestones.length > 1 && (
                          <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', padding: '2px 6px' }} onClick={() => removeAtfMs(i)}>✕</button>
                        )}
                      </div>
                      <div className="col" style={{ gap: '.5rem' }}>
                        <input className="input" style={{ fontSize: 13 }} placeholder="Titlu milestone *" value={m.title}
                          onChange={e => updateAtf(i, 'title', e.target.value)} />
                        <input className="input" style={{ fontSize: 13 }} placeholder="Descriere livrabil" value={m.deliverable_description}
                          onChange={e => updateAtf(i, 'deliverable_description', e.target.value)} />
                        <div className="row" style={{ gap: '.5rem', alignItems: 'center' }}>
                          <input className="input" style={{ fontSize: 13, width: 80 }} type="number" min="1" max="100" placeholder="%" value={m.percentage_of_budget}
                            onChange={e => updateAtf(i, 'percentage_of_budget', e.target.value)} />
                          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>% din buget</span>
                          {addTaskForm.budget_ron && m.percentage_of_budget && (
                            <span style={{ fontSize: 12, color: 'var(--success)', fontFamily: 'var(--f-mono)', marginLeft: 'auto' }}>
                              ≈ {Math.round(parseFloat(addTaskForm.budget_ron) * parseFloat(m.percentage_of_budget) / 100).toLocaleString()} RON
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {(() => {
                  const total = addTaskForm.milestones.reduce((s, m) => s + (parseFloat(m.percentage_of_budget) || 0), 0);
                  return total !== 100 && total > 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>Suma curentă: {total}% (trebuie 100%)</div>
                  ) : total === 100 ? (
                    <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 6 }}>✓ 100% alocat</div>
                  ) : null;
                })()}
              </div>

              <div className="row" style={{ gap: '.75rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowAddTaskModal(false)}>Anulează</button>
                <button className="btn btn-primary" onClick={handleSubmitAddTask}>
                  <Icon name="send" size={13} /> Adaugă task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// WorkflowStepper — horizontal mini-stepper above the tabs
// shows: Contract → MS1 → MS2 → ... → Final contract
// ═══════════════════════════════════════════════════════════
function WorkflowStepper({ project, workflowStatus, onJump }) {
  const ms = project.milestones || [];
  if (project.is_pm_task || ms.length === 0) return null;

  const projectContractDone = workflowStatus?.projectContract?.status === 'accepted';
  const allMilestonesDone = ms.every(m => ['approved', 'released'].includes(m.status));

  const steps = [
    {
      id: 'contract',
      label: 'Contract proiect',
      shortLabel: 'C',
      status: projectContractDone ? 'done' : (workflowStatus?.projectContract ? 'active' : 'pending'),
      amount: null,
    },
    ...ms.map((m, i) => {
      let status = 'pending';
      if (['approved', 'released'].includes(m.status)) status = 'done';
      else if (['in_progress', 'delivered', 'revision_requested', 'funded'].includes(m.status)) status = 'active';
      return {
        id: m.id,
        label: `MS${i + 1} · ${m.title}`,
        shortLabel: `MS${i + 1}`,
        status,
        amount: parseFloat(m.amount_ron) || 0,
      };
    }),
    {
      id: 'final',
      label: 'Contract final',
      shortLabel: 'F',
      status: allMilestonesDone && project.status === 'completed' ? 'done' : (allMilestonesDone ? 'active' : 'pending'),
      amount: null,
    },
  ];

  const activeIdx = Math.max(0, steps.findIndex(s => s.status === 'active'));
  const doneCount = steps.filter(s => s.status === 'done').length;

  return (
    <div style={{
      background: 'linear-gradient(180deg, var(--bg-card), var(--bg-1))',
      border: '1px solid var(--border-1)',
      borderRadius: 'var(--r-lg)',
      padding: '.875rem 1rem',
      marginBottom: '1.25rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '.625rem' }}>
        <div className="h-eyebrow" style={{ margin: 0 }}>
          <span className="pulse" style={{ width: 6, height: 6 }} /> Flux proiect · pas {Math.min(activeIdx + 1, steps.length)} din {steps.length}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>
          {doneCount}/{steps.length} pași finalizați
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '.5rem',
        overflowX: 'auto', padding: '0 0 4px',
      }}>
        {steps.map((s, i) => {
          const isActive = s.status === 'active';
          const isDone = s.status === 'done';
          const isPending = s.status === 'pending';
          return (
            <Fragment key={s.id}>
              <button
                onClick={() => onJump?.(s.id)}
                style={{
                  flex: '0 0 auto',
                  display: 'flex', alignItems: 'center', gap: '.5rem',
                  padding: '.5rem .75rem',
                  background: isActive ? 'var(--accent-bg)' : isDone ? 'var(--success-bg)' : 'transparent',
                  border: '1px solid ' + (isActive ? 'var(--accent-border)' : isDone ? 'var(--success-border)' : 'var(--border-1)'),
                  borderRadius: 'var(--r-md)',
                  color: isActive ? 'var(--accent-hi)' : isDone ? 'var(--success)' : 'var(--fg-3)',
                  fontSize: 12.5, fontWeight: 600,
                  opacity: isPending && !isActive ? 0.6 : 1,
                  cursor: 'pointer',
                  transition: 'all 160ms',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--bg-2)',
                  color: (isDone || isActive) ? '#fff' : 'var(--fg-3)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 10, fontWeight: 700,
                  fontFamily: 'var(--f-mono)',
                  boxShadow: isActive ? '0 0 0 4px var(--accent-bg)' : 'none',
                }}>
                  {isDone ? <Icon name="check" size={11} /> : s.shortLabel}
                </span>
                <span>{s.label.length > 28 ? s.label.slice(0, 26) + '…' : s.label}</span>
                {s.amount > 0 && (
                  <span style={{
                    fontFamily: 'var(--f-mono)', fontSize: 10.5,
                    color: isDone ? 'var(--success)' : isActive ? 'var(--accent-hi)' : 'var(--fg-4)',
                  }}>
                    {Math.round(s.amount / 1000)}k
                  </span>
                )}
              </button>
              {i < steps.length - 1 && (
                <span style={{
                  flex: '0 0 auto', width: 16, height: 1,
                  background: isDone ? 'var(--success)' : 'var(--border-2)',
                  opacity: isDone ? 0.7 : 1,
                }} />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VaultHeroSegmented — segmented escrow bar per milestone
// ═══════════════════════════════════════════════════════════
function VaultHeroSegmented({ project, totalReleased, escrowAccount, isParty2, projectId, navigate, budget }) {
  const ms = project.milestones || [];
  const released = ms
    .filter(m => ['approved', 'released'].includes(m.status))
    .reduce((s, m) => s + (parseFloat(m.amount_ron) || 0), 0);
  const held = ms
    .filter(m => !['approved', 'released'].includes(m.status) && ['in_progress', 'delivered', 'funded', 'revision_requested'].includes(m.status))
    .reduce((s, m) => s + (parseFloat(m.amount_ron) || 0), 0);
  const total = budget || 0;
  const pending = Math.max(0, total - released - held);
  const releasedPct = total > 0 ? (released / total) * 100 : 0;
  const heldFromAccount = parseFloat(escrowAccount?.held_balance_ron) || 0;

  const colors = {
    released: { bg: 'linear-gradient(90deg, #10b981, #34d399)', solid: 'var(--success)', label: 'Eliberat' },
    held:     { bg: 'linear-gradient(90deg, var(--accent), var(--accent-hi))', solid: 'var(--accent)', label: 'În escrow' },
    pending:  { bg: 'repeating-linear-gradient(45deg, rgba(255,255,255,.04), rgba(255,255,255,.04) 6px, rgba(255,255,255,.10) 6px, rgba(255,255,255,.10) 12px)', solid: 'var(--border-3)', label: 'Restant' },
  };

  return (
    <div className="vault" style={{ padding: '1.5rem 1.75rem' }}>
      <div className="vault-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div>
            <div className="h-eyebrow" style={{ marginBottom: '.5rem' }}>
              <Icon name="shield" size={11} /> Escrow · buget total
            </div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(40px, 6vw, 64px)', lineHeight: 0.95, letterSpacing: '-0.04em', color: 'var(--fg-0)', fontVariantNumeric: 'tabular-nums' }}>
              <em style={{ fontStyle: 'italic', color: 'var(--accent-hi)', fontWeight: 400 }}>{Math.round(total).toLocaleString('ro-RO')}</em>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 14, color: 'var(--fg-3)', marginLeft: 8, letterSpacing: '.05em' }}>RON</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-2)', marginTop: '.5rem', maxWidth: 420 }}>
              Fondurile sunt blocate în escrow și eliberate per milestone aprobat.
            </div>
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
            padding: '.625rem .875rem', background: 'rgba(0,0,0,.2)',
            border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)',
          }}>
            <div style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              Progres
            </div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 26, lineHeight: 1, color: 'var(--fg-0)', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(releasedPct)}<span style={{ fontSize: 14, color: 'var(--fg-3)', marginLeft: 2 }}>%</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>
              {fmtRON(released)} / {fmtRON(total)}
            </div>
          </div>
        </div>

        {/* Segmented bar */}
        {ms.length > 0 && total > 0 && (
          <div style={{
            display: 'flex', height: 20, borderRadius: 10, overflow: 'hidden',
            background: 'var(--bg-0)', border: '1px solid var(--border-2)',
            boxShadow: '0 1px 0 rgba(255,255,255,.04) inset, 0 6px 18px rgba(0,0,0,.25)',
          }}>
            {ms.map((m, i) => {
              const pct = ((parseFloat(m.amount_ron) || 0) / total) * 100;
              const key = ['approved', 'released'].includes(m.status)
                ? 'released'
                : (['in_progress', 'delivered', 'funded', 'revision_requested'].includes(m.status) ? 'held' : 'pending');
              const c = colors[key];
              return (
                <div
                  key={m.id}
                  title={`MS${i + 1} · ${m.title} · ${fmtRON(m.amount_ron)} · ${c.label}`}
                  style={{
                    width: `${pct}%`,
                    background: c.bg,
                    borderRight: i < ms.length - 1 ? '1px solid rgba(0,0,0,.3)' : 'none',
                    transition: 'filter 160ms',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {[
            { k: 'released', value: released, count: ms.filter(m => ['approved', 'released'].includes(m.status)).length },
            { k: 'held',     value: held,     count: ms.filter(m => !['approved', 'released'].includes(m.status) && ['in_progress', 'delivered', 'funded', 'revision_requested'].includes(m.status)).length },
            { k: 'pending',  value: pending,  count: ms.filter(m => m.status === 'pending').length },
          ].map(({ k, value, count }) => (
            <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: '.625rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, marginTop: 4, background: colors[k].solid, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)', letterSpacing: '.04em' }}>
                  {colors[k].label} · {count}
                </div>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 17, color: 'var(--fg-0)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
                  {Math.round(value).toLocaleString('ro-RO')} <span style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>RON</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Per-milestone funding happens via MilestoneCardV2 below (button "Depune fonduri escrow"
            shows for each milestone in 'pending' state). No full-budget deposit — escrow is funded
            milestone-by-milestone as the project progresses. */}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MilestoneCardV2 — visual milestone card with next-action pill
// Used in Details tab; click handlers route to Contracts tab
// ═══════════════════════════════════════════════════════════
function MilestoneCardV2({ ms, idx, isParty1, isParty2, canPropose, contractSigned, prevMsDone, onEditPropose, onJumpContracts }) {
  const isDone = ['approved', 'released'].includes(ms.status);
  const isActive = ['in_progress', 'delivered', 'revision_requested', 'funded'].includes(ms.status);
  const isDelivered = ms.status === 'delivered';

  // Next action label per role.
  // Funding is gated: project contract must be signed AND prior milestone done — only the next-in-line
  // milestone is fundable, never multiple at once.
  let nextAction = null;
  if (isParty1) {
    if (['funded', 'in_progress'].includes(ms.status)) nextAction = { label: 'Livrează milestone', tone: 'primary', icon: 'upload' };
    else if (ms.status === 'revision_requested') nextAction = { label: 'Trimite revizia', tone: 'warning', icon: 'rotate' };
  } else if (isParty2) {
    if (isDelivered) nextAction = { label: 'Aprobă livrabilul', tone: 'success', icon: 'check' };
    else if (ms.status === 'pending' && contractSigned && prevMsDone) {
      nextAction = { label: 'Depune fonduri escrow', tone: 'primary', icon: 'lock' };
    }
  }

  // Informational hint when funding would otherwise be expected but is gated
  let gateHint = null;
  if (isParty2 && ms.status === 'pending' && !nextAction) {
    if (!contractSigned) gateHint = 'Semnează contractul de proiect înainte de a finanța această etapă.';
    else if (!prevMsDone) gateHint = 'Finalizează etapa anterioară înainte de a finanța această etapă.';
  }

  const progress =
    isDone ? 100 :
    ms.status === 'delivered' ? 80 :
    ms.status === 'revision_requested' ? 60 :
    ms.status === 'in_progress' ? 45 :
    ms.status === 'funded' ? 20 : 0;

  const toneBg = {
    primary: { bg: 'var(--accent-bg)', border: 'var(--accent-border)', dot: 'var(--accent-hi)' },
    success: { bg: 'var(--success-bg)', border: 'var(--success-border)', dot: 'var(--success)' },
    warning: { bg: 'var(--warning-bg)', border: 'var(--warning-border)', dot: 'var(--warning)' },
  };
  const t = nextAction ? toneBg[nextAction.tone] : null;

  return (
    <div className="card" style={{
      borderColor: isActive ? 'var(--accent-border)' : isDone ? 'var(--success-border)' : 'var(--border-1)',
      background: isActive ? 'linear-gradient(180deg, var(--bg-card), rgba(59,130,246,.04))' : 'var(--bg-card)',
      transition: 'border-color 200ms, background 200ms',
      marginBottom: 0,
    }}>
      {isActive && <div style={{ height: 2, background: 'linear-gradient(90deg, var(--accent), var(--accent-hi))', boxShadow: '0 0 12px var(--accent-glow)' }} />}

      <div className="card-body" style={{ padding: '1rem 1.125rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: 2 }}>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--fg-3)', letterSpacing: '.06em' }}>
                MS{String(idx + 1).padStart(2, '0')}
              </span>
              <StatusBadge status={ms.status} />
            </div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 19, lineHeight: 1.2, letterSpacing: '-0.015em', color: 'var(--fg-0)' }}>
              {ms.title}
            </div>
            {ms.deliverable_description && (
              <div style={{ fontSize: 12.5, color: 'var(--fg-2)', marginTop: 4, lineHeight: 1.5 }}>
                {ms.deliverable_description}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 26, lineHeight: 1, color: 'var(--fg-0)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {Math.round(parseFloat(ms.amount_ron) || 0).toLocaleString('ro-RO')}
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)', marginLeft: 4 }}>RON</span>
            </div>
            {ms.percentage_of_budget && (
              <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)', marginTop: 2 }}>
                {ms.percentage_of_budget}% din buget
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: '0.875rem' }}>
          <div style={{
            height: 6, borderRadius: 3, overflow: 'hidden',
            background: 'var(--border-1)', position: 'relative',
          }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: isDone ? 'linear-gradient(90deg, var(--success), #34d399)'
                : ms.status === 'revision_requested' ? 'linear-gradient(90deg, var(--warning), #fbbf24)'
                : 'linear-gradient(90deg, var(--accent), var(--accent-hi))',
              boxShadow: isActive ? '0 0 12px var(--accent-glow)' : 'none',
              transition: 'width 600ms cubic-bezier(.16,1,.3,1)',
            }} />
          </div>
        </div>

        {/* Next-action highlight */}
        {nextAction && (
          <div style={{
            marginTop: '0.875rem', padding: '.625rem .875rem',
            background: t.bg, border: `1px solid ${t.border}`,
            borderRadius: 'var(--r-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span className="pulse" style={{ background: t.dot, width: 6, height: 6 }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-0)' }}>
                Pasul tău: {nextAction.label}
              </span>
            </div>
            <button
              className={`btn btn-sm ${nextAction.tone === 'success' ? 'btn-success' : nextAction.tone === 'warning' ? 'btn-warning' : 'btn-primary'}`}
              onClick={onJumpContracts}
            >
              <Icon name={nextAction.icon} size={12} /> {nextAction.label}
            </button>
          </div>
        )}

        {/* Gate hint — explain why no funding CTA appears yet */}
        {!nextAction && gateHint && (
          <div style={{
            marginTop: '0.875rem', padding: '.625rem .875rem',
            background: 'var(--bg-1)', border: '1px dashed var(--border-2)',
            borderRadius: 'var(--r-md)',
            display: 'flex', alignItems: 'center', gap: '.5rem',
            fontSize: 12, color: 'var(--fg-2)',
          }}>
            <Icon name="info" size={12} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
            <span>{gateHint}</span>
          </div>
        )}

        {/* Footer row: edit / details */}
        {(canPropose && ms.status === 'pending') && (
          <div style={{ marginTop: '.625rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={onEditPropose}>
              <Icon name="edit" size={10} /> Propune modificare
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PartyCard({ name, id, extra, color = 'cyan' }) {
  return (
    <div className="row" style={{ gap: '.75rem', alignItems: 'flex-start' }}>
      <Avatar user={{ name, color }} size="md" />
      <div>
        <Link to={`/profile/${id}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-hi)', textDecoration: 'none' }}>
          {name} →
        </Link>
        {extra && <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>{extra}</div>}
        <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>Date de contact: vizibile în chat</div>
      </div>
    </div>
  );
}

function TrustMeter({ level = 1 }) {
  return (
    <div className="trust">
      <div className="trust-l">L{level}</div>
      <div className="trust-d">
        {[1,2,3,4,5].map(n => (
          <span key={n} className={`trust-pip ${n <= level ? 'on' : ''}`} />
        ))}
      </div>
    </div>
  );
}


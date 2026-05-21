import axios from 'axios';

const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  getCurrentUser: () => apiClient.get('/auth/me'),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => apiClient.post('/auth/reset-password', { token, password }),
  changePassword: (currentPassword, newPassword) => apiClient.put('/auth/change-password', { currentPassword, newPassword }),
};

export const termsAPI = {
  getCurrent: () => apiClient.get('/terms/current'),
  check: () => apiClient.get('/terms/check'),
  accept: () => apiClient.post('/terms/accept'),
  // Admin
  listVersions: () => apiClient.get('/admin/terms'),
  getVersion: (id) => apiClient.get(`/admin/terms/${id}`),
  publishVersion: (data) => apiClient.post('/admin/terms', data),
};

export const projectAPI = {
  createProject: (data) => apiClient.post('/projects', data),
  getProjects: () => apiClient.get('/projects'),
  getProjectDetail: (id) => apiClient.get(`/projects/${id}`),
  cancelProject: (id, reason) => apiClient.post(`/projects/${id}/cancel`, { reason }),
  // Admin edit flow
  adminEditProject: (id, data) => apiClient.post(`/admin/projects/${id}/admin-edit`, data),
  acceptAdminEdit: (id) => apiClient.post(`/projects/${id}/accept-admin-edit`),
  rejectAdminEdit: (id, reason) => apiClient.post(`/projects/${id}/reject-admin-edit`, { reason }),
  // Expert/Company accept/refuse assignment offered by admin
  expertAcceptAssignment: (id) => apiClient.post(`/projects/${id}/expert-accept`),
  expertRejectAssignment: (id, reason) => apiClient.post(`/projects/${id}/expert-reject`, { reason }),
};

export const milestoneAPI = {
  uploadDeliverable: (milestoneId, data) => apiClient.post(`/milestones/${milestoneId}/deliverable`, data),
  approveMilestone: (milestoneId, data) => apiClient.put(`/milestones/${milestoneId}/approve`, data),
  disputeMilestone: (milestoneId, data) => apiClient.post(`/milestones/${milestoneId}/dispute`, data),
  getMyDisputes: () => apiClient.get('/disputes'),
};

export const escrowAPI = {
  createEscrowAccount: (data) => apiClient.post('/escrow', data),
  createPaymentIntent: (data) => apiClient.post('/escrow/payment-intent', data),
  confirmPayment: (data) => apiClient.post('/escrow/confirm-payment', data),
  getEscrowStatus: (id) => apiClient.get(`/escrow/${id}`),
  getEscrowByProject: (projectId) => apiClient.get(`/escrow/project/${projectId}`),
  refundEscrow: (projectId) => apiClient.post(`/escrow/project/${projectId}/refund`),
};

export const messageAPI = {
  sendMessage: (data) => apiClient.post('/messages', data),
  getProjectMessages: (projectId) => apiClient.get(`/projects/${projectId}/messages`),
  markAsRead: (messageId) => apiClient.put(`/messages/${messageId}/read`)
};

export const contractAPI = {
  createProjectContract: (data) => apiClient.post('/contracts/project', data),
  generateContract: (projectId) => apiClient.get(`/contracts/${projectId}/generate`),
  generateProcesVerbal: (projectId) => apiClient.get(`/contracts/${projectId}/proces-verbal`),
  createMilestoneContract: (data) => apiClient.post('/contracts/milestone', data),
  createAllMilestoneContracts: (data) => apiClient.post('/contracts/milestones/all', data),
  createFinalContract: (data) => apiClient.post('/contracts/final', data),
  acceptContract: (contractId, data = {}) => apiClient.put(`/contracts/${contractId}/accept`, data),
  regeneratePdf: (contractId) => apiClient.post(`/contracts/${contractId}/regenerate-pdf`),
  getProjectContracts: (projectId) => apiClient.get(`/projects/${projectId}/contracts`),
  getContract: (contractId) => apiClient.get(`/contracts/${contractId}`),
  getWorkflowStatus: (projectId) => apiClient.get(`/projects/${projectId}/workflow`),
  completeProject: (projectId) => apiClient.post(`/projects/${projectId}/complete`)
};

export const modificationAPI = {
  proposeProjectModification: (data) => apiClient.post('/modifications/project', data),
  proposeMilestoneModification: (data) => apiClient.post('/modifications/milestone', data),
  proposeMilestoneCreate: (data) => apiClient.post('/modifications/milestone/create', data),
  proposeMilestoneDelete: (data) => apiClient.post('/modifications/milestone/delete', data),
  approveModification: (modificationId) => apiClient.put(`/modifications/${modificationId}/approve`),
  rejectModification: (modificationId) => apiClient.put(`/modifications/${modificationId}/reject`),
  getProjectModifications: (projectId) => apiClient.get(`/projects/${projectId}/modifications`)
};

export const adminAPI = {
  // Experts
  verifyExpert: (userId, data) => apiClient.put(`/admin/experts/${userId}/verify`, data),
  getPendingExperts: () => apiClient.get('/admin/experts/pending'),
  getVerifiedExperts: () => apiClient.get('/admin/experts/verified'),
  
  // Users Management
  getAllUsers: () => apiClient.get('/admin/users'),
  getPendingUsers: () => apiClient.get('/admin/users/pending'),
  getVerifiedCompanies: () => apiClient.get('/admin/companies/verified'),
  approveUser: (userId) => apiClient.post(`/admin/users/${userId}/approve`),
  rejectUser: (userId) => apiClient.post(`/admin/users/${userId}/reject`),
  deleteUser: (userId) => apiClient.delete(`/admin/users/${userId}`),
  
  // Projects Management
  getAllProjects: () => apiClient.get('/admin/projects'),
  getPendingApprovalProjects: () => apiClient.get('/admin/projects/pending-approval'),
  approveProject: (projectId) => apiClient.post(`/admin/projects/${projectId}/approve`),
  rejectProject: (projectId) => apiClient.post(`/admin/projects/${projectId}/reject`),
  deleteProject: (projectId) => apiClient.delete(`/admin/projects/${projectId}`),
  assignExpertToProject: (projectId, data) => apiClient.put(`/admin/projects/${projectId}/assign-expert`, data),
  removeExpertFromProject: (projectId) => apiClient.put(`/admin/projects/${projectId}/remove-expert`),

  // Expert Posted Tasks Management
  getPendingExpertPostedTasks: () => apiClient.get('/admin/expert-posted-tasks/pending'),
  approveExpertPostedTask: (projectId) => apiClient.post(`/admin/expert-posted-tasks/${projectId}/approve`),
  rejectExpertPostedTask: (projectId, data) => apiClient.post(`/admin/expert-posted-tasks/${projectId}/reject`, data),
  
  // Client Posted Tasks Management
  getPendingClientPostedTasks: () => apiClient.get('/admin/client-posted-tasks/pending'),
  approveClientPostedTask: (projectId) => apiClient.post(`/admin/client-posted-tasks/${projectId}/approve`),
  rejectClientPostedTask: (projectId, data) => apiClient.post(`/admin/client-posted-tasks/${projectId}/reject`, data),
  assignCompanyToClientPostedTask: (projectId, data) => apiClient.post(`/admin/client-posted-tasks/${projectId}/assign-company`, data),
  assignCompanyToClientTask: (projectId, data) => apiClient.post(`/admin/client-posted-tasks/${projectId}/assign-company`, data),
  
  // Disputes & Dashboard
  resolveAdminDispute: (disputeId, data) => apiClient.put(`/admin/disputes/${disputeId}/resolve`, data),
  getAdminDashboard: () => apiClient.get('/admin/dashboard'),

  // Trust & Referral admin views
  getAllTrustProfiles: () => apiClient.get('/trust-profiles/admin/all'),
  getReferralStats: () => apiClient.get('/referrals/admin/stats'),
  getAllReferralCodes: () => apiClient.get('/referrals/admin/all-codes'),
  getVerificationCalls: () => apiClient.get('/verification-calls'),

  // Financiar, Contracte, Dispute, Activity
  getAdminFinanciar: () => apiClient.get('/admin/financiar'),
  getAdminContracts: () => apiClient.get('/admin/contracts'),
  getAdminDisputes: () => apiClient.get('/admin/disputes'),
  getAdminActivity: (page = 1) => apiClient.get(`/admin/activity?page=${page}&limit=25`),
  getAuditLog: (params = {}) => apiClient.get('/admin/audit-log', { params }),
  // Bulk user actions
  bulkUserAction: (data) => apiClient.post('/admin/users/bulk-action', data),
  // Project change history (admin & parties)
  getProjectHistory: (projectId) => apiClient.get(`/projects/${projectId}/history`),

  // Referral admin
  generateVipCode: (data) => apiClient.post('/referrals/admin/generate-vip-code', data),

  // Payout management
  getAdminPayouts: (status) => apiClient.get(`/admin/payouts${status ? `?status=${status}` : ''}`),
  approveAdminPayout: (id, data) => apiClient.put(`/admin/payouts/${id}/approve`, data),
  rejectAdminPayout: (id, data) => apiClient.put(`/admin/payouts/${id}/reject`, data),
  markPayoutAsPaid: (id, data) => apiClient.put(`/admin/payouts/${id}/mark-paid`, data),
  getAdminFinancialReport: () => apiClient.get('/admin/financiar/report'),
};

export const taskAPI = {
  createTask: (data) => apiClient.post('/tasks', data),
  getTasks: () => apiClient.get('/tasks'),
  getTaskDetail: (taskId) => apiClient.get(`/tasks/${taskId}`),
  updateTask: (taskId, data) => apiClient.put(`/tasks/${taskId}`, data),
  deleteTask: (taskId) => apiClient.delete(`/tasks/${taskId}`),
  createAssignment: (taskId, data) => apiClient.post(`/tasks/${taskId}/assignments`, data),
  assignUserToAssignment: (taskId, assignmentId, data) => apiClient.put(`/tasks/${taskId}/assignments/${assignmentId}/assign`, data),
  getAssignmentDetail: (taskId, assignmentId) => apiClient.get(`/tasks/${taskId}/assignments/${assignmentId}`)
};

export const walletAPI = {
  getBalance: () => apiClient.get('/wallet/balance'),
  getEarnings: (params) => apiClient.get('/wallet/earnings', { params }),
  requestPayout: (amount_ron) => apiClient.post('/wallet/payout', { amount_ron }),
  getPayouts: () => apiClient.get('/wallet/payouts'),
  cancelPayout: (id) => apiClient.delete(`/wallet/payout/${id}`),
};

export const stripeAPI = {
  initiateOnboarding: () => apiClient.post('/stripe/onboarding'),
  getStatus: () => apiClient.get('/stripe/status'),
};

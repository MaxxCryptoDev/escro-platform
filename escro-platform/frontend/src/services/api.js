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
  getCurrentUser: () => apiClient.get('/auth/me')
};

export const projectAPI = {
  createProject: (data) => apiClient.post('/projects', data),
  getProjects: () => apiClient.get('/projects'),
  getProjectDetail: (id) => apiClient.get(`/projects/${id}`)
};

export const milestoneAPI = {
  uploadDeliverable: (milestoneId, data) => apiClient.post(`/milestones/${milestoneId}/deliverable`, data),
  approveMilestone: (milestoneId, data) => apiClient.put(`/milestones/${milestoneId}/approve`, data),
  disputeMilestone: (milestoneId, data) => apiClient.post(`/milestones/${milestoneId}/dispute`, data)
};

export const escrowAPI = {
  createEscrowAccount: (data) => apiClient.post('/escrow', data),
  createPaymentIntent: (data) => apiClient.post('/escrow/payment-intent', data),
  confirmPayment: (data) => apiClient.post('/escrow/confirm-payment', data),
  getEscrowStatus: (id) => apiClient.get(`/escrow/${id}`)
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
  signMilestoneStart: (data) => apiClient.post('/contracts/milestone/sign-start', data),
  deliverMilestone: (data) => apiClient.post('/contracts/milestone/deliver', data),
  approveMilestone: (data) => apiClient.post('/contracts/milestone/approve', data),
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
  
  // Task Requests Management
  getPendingTaskRequests: () => apiClient.get('/admin/task-requests/pending'),
  approveTaskRequest: (requestId) => apiClient.post(`/admin/task-requests/${requestId}/approve`),
  rejectTaskRequest: (requestId) => apiClient.post(`/admin/task-requests/${requestId}/reject`),
  
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
  resolveMilestoneDispute: (disputeId, data) => apiClient.put(`/admin/disputes/${disputeId}/resolve`, data),
  getAdminDashboard: () => apiClient.get('/admin/dashboard'),
  fixMilestones: () => apiClient.post('/admin/fix-milestones')
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

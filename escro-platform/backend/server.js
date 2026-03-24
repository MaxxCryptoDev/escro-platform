import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads', 'deliverables');
const chatUploadsDir = path.join(__dirname, 'uploads', 'chat');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(chatUploadsDir)) {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
}

// Configure multer for deliverable uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'deliverable-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'video/mp4', 'video/webm'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Chat file upload config
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for chat images
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images allowed for chat.'));
    }
  }
});

// IMPORTANT: Load environment variables FIRST, before importing anything that uses them
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('[STARTUP] CWD:', process.cwd());
console.log('[STARTUP] __dirname:', __dirname);
console.log('[STARTUP] .env path:', path.join(__dirname, '.env'));
console.log('[STARTUP] JWT_SECRET:', process.env.JWT_SECRET ? 'SET ✓' : 'NOT SET ✗');
console.log('[STARTUP] DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('[STARTUP] NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

import errorHandler from './middleware/errorHandler.js';
import { protect, adminOnly } from './middleware/auth.js';
import pool from './config/database.js';

// Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import verificationRoutes from './routes/verification.js';
import taskRequestRoutes from './routes/taskRequest.js';
import expertPostedTaskRoutes from './routes/expertPostedTask.js';
import clientPostedTaskRoutes from './routes/clientPostedTask.js';
import trustProfileRoutes from './routes/trustProfile.js';
import referralRoutes from './routes/referral.js';
import reviewRoutes from './routes/review.js';
import notificationRoutes from './routes/notifications.js';

// Controllers
import * as projectController from './controllers/projectController.js';
import * as milestoneController from './controllers/milestoneController.js';
import * as escrowController from './controllers/escrowController.js';
import * as messageController from './controllers/messageController.js';
import * as adminController from './controllers/adminController.js';
import * as contractController from './controllers/contractController.js';
import * as modificationController from './controllers/modificationController.js';
import * as projectManagementController from './controllers/projectManagementController.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));
app.use('/uploads/profiles', express.static('uploads/profiles'));
app.use('/uploads/portfolio', express.static('uploads/portfolio'));
app.use('/uploads/deliverables', express.static('uploads/deliverables'));
app.use('/uploads/chat', express.static('uploads/chat'));
app.use('/uploads/contracts', express.static('uploads/contracts'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/verification-calls', verificationRoutes);
app.use('/api/task-requests', taskRequestRoutes);
app.use('/api/experts/posted-tasks', expertPostedTaskRoutes);
app.use('/api/companies/posted-tasks', clientPostedTaskRoutes);
app.use('/api/trust-profiles', trustProfileRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);

// Projects
app.post('/api/projects', protect, projectController.createProject);
app.put('/api/projects/:projectId/assign', protect, projectController.assignUserToProject);
app.get('/api/projects', protect, projectController.getProjects);
app.get('/api/projects/:id', protect, projectController.getProjectDetail);
app.post('/api/projects/:projectId/milestones', protect, projectController.addMilestones);

// Milestones
app.post('/api/milestones/:milestone_id/deliverable', protect, upload.single('file'), milestoneController.uploadDeliverable);
app.put('/api/milestones/:milestone_id/start', protect, milestoneController.startMilestone);
app.put('/api/milestones/:milestone_id/approve', protect, milestoneController.approveMilestone);
app.post('/api/milestones/:milestone_id/dispute', protect, milestoneController.disputeMilestone);

// Escrow
app.post('/api/escrow', protect, escrowController.createEscrowAccount);
app.post('/api/escrow/payment-intent', protect, escrowController.createPaymentIntent);
app.post('/api/escrow/confirm-payment', protect, escrowController.confirmPayment);
app.get('/api/escrow/:escrow_id', protect, escrowController.getEscrowStatus);

// Messages
app.post('/api/messages', protect, messageController.sendMessage);
app.post('/api/messages/upload', protect, chatUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ success: true, fileUrl });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});
app.get('/api/projects/:project_id/messages', protect, messageController.getProjectMessages);
app.put('/api/messages/:message_id/read', protect, messageController.markAsRead);

// Contracts
app.post('/api/contracts/project', protect, contractController.createProjectContract);
app.post('/api/contracts/milestone', protect, contractController.createMilestoneContract);
app.post('/api/contracts/milestones/all', protect, contractController.createAllMilestoneContracts);
app.post('/api/contracts/final', protect, contractController.createFinalContract);
app.put('/api/contracts/:contract_id/accept', protect, contractController.acceptContract);
app.post('/api/contracts/milestone/sign-start', protect, contractController.signMilestoneStart);
app.post('/api/contracts/milestone/deliver', protect, contractController.deliverMilestone);
app.post('/api/contracts/milestone/approve', protect, contractController.approveMilestone);
app.get('/api/projects/:project_id/contracts', protect, contractController.getProjectContracts);
app.get('/api/contracts/:contract_id', protect, contractController.getContract);
app.get('/api/contracts/:project_id/generate', protect, contractController.generateContract);
app.get('/api/contracts/:project_id/proces-verbal', protect, contractController.generateProcesVerbal);
app.get('/api/projects/:project_id/workflow', protect, contractController.getContractWorkflowStatus);
app.post('/api/projects/:project_id/complete', protect, contractController.completeProject);

// Modifications
app.post('/api/modifications/project', protect, modificationController.proposeProjectModification);
app.post('/api/modifications/milestone', protect, modificationController.proposeMilestoneModification);
app.post('/api/modifications/milestone/create', protect, modificationController.proposeMilestoneCreate);
app.post('/api/modifications/milestone/delete', protect, modificationController.proposeMilestoneDelete);
app.put('/api/modifications/:modification_id/approve', protect, modificationController.approveModification);
app.put('/api/modifications/:modification_id/reject', protect, modificationController.rejectModification);
app.get('/api/projects/:project_id/modifications', protect, modificationController.getProjectModifications);

// Admin
console.log('Loading admin routes...');
app.put('/api/admin/experts/:id/verify', protect, adminOnly, adminController.verifyExpert);
console.log('✓ PUT /api/admin/experts/:id/verify registered');
app.get('/api/admin/experts/pending', protect, adminOnly, adminController.getPendingExperts);
app.get('/api/admin/experts/verified', protect, adminOnly, adminController.getVerifiedExperts);
app.post('/api/admin/projects/:project_id/assign-expert', protect, adminOnly, adminController.assignExpertToProject);
app.put('/api/admin/disputes/:dispute_id/resolve', protect, adminOnly, adminController.resolveMilestoneDispute);
app.get('/api/admin/dashboard', protect, adminOnly, adminController.getAdminDashboard);
app.post('/api/admin/fix-milestones', protect, adminOnly, adminController.fixMilestonesSchema);

// Admin - Users Management
app.get('/api/admin/users', protect, adminOnly, adminController.getAllUsers);
app.get('/api/admin/users/pending', protect, adminOnly, adminController.getPendingUsers);
app.get('/api/admin/companies/verified', protect, adminOnly, adminController.getVerifiedCompanies);
app.post('/api/admin/users/:user_id/approve', protect, adminOnly, adminController.approveUser);
app.post('/api/admin/users/:user_id/reject', protect, adminOnly, adminController.rejectUser);
app.delete('/api/admin/users/:user_id', protect, adminOnly, adminController.deleteUser);

// Admin - Projects Management
app.get('/api/admin/projects', protect, adminOnly, adminController.getAllProjects);
console.log('✓ GET /api/admin/projects registered');
app.get('/api/admin/projects/pending-approval', protect, adminOnly, adminController.getPendingApprovalProjects);
console.log('✓ GET /api/admin/projects/pending-approval registered');
app.post('/api/admin/projects/:project_id/approve', protect, adminOnly, adminController.approveProject);
console.log('✓ POST /api/admin/projects/:project_id/approve registered');
app.post('/api/admin/projects/:project_id/reject', protect, adminOnly, adminController.rejectProject);
console.log('✓ POST /api/admin/projects/:project_id/reject registered');
app.delete('/api/admin/projects/:project_id', protect, adminOnly, adminController.deleteProject);
console.log('✓ DELETE /api/admin/projects/:project_id registered');
app.put('/api/admin/projects/:project_id/assign-expert', protect, adminOnly, adminController.assignExpertToProject);
console.log('✓ PUT /api/admin/projects/:project_id/assign-expert registered');
app.put('/api/admin/projects/:project_id/remove-expert', protect, adminOnly, adminController.removeExpertFromProject);
console.log('✓ PUT /api/admin/projects/:project_id/remove-expert registered');

// Admin - Task Requests Management
app.get('/api/admin/task-requests/pending', protect, adminOnly, adminController.getPendingTaskRequests);
console.log('✓ GET /api/admin/task-requests/pending registered');
app.post('/api/admin/task-requests/:request_id/approve', protect, adminOnly, adminController.approveTaskRequest);
console.log('✓ POST /api/admin/task-requests/:request_id/approve registered');
app.post('/api/admin/task-requests/:request_id/reject', protect, adminOnly, adminController.rejectTaskRequest);
console.log('✓ POST /api/admin/task-requests/:request_id/reject registered');

// Admin - Expert Posted Tasks Management
app.get('/api/admin/expert-posted-tasks/pending', protect, adminOnly, adminController.getPendingExpertPostedTasks);
console.log('✓ GET /api/admin/expert-posted-tasks/pending registered');
app.post('/api/admin/expert-posted-tasks/:project_id/approve', protect, adminOnly, adminController.approveExpertPostedTask);
console.log('✓ POST /api/admin/expert-posted-tasks/:project_id/approve registered');
app.post('/api/admin/expert-posted-tasks/:project_id/reject', protect, adminOnly, adminController.rejectExpertPostedTask);
console.log('✓ POST /api/admin/expert-posted-tasks/:project_id/reject registered');

// Admin - Client Posted Tasks Management
app.get('/api/admin/client-posted-tasks/pending', protect, adminOnly, adminController.getPendingClientPostedTasks);
console.log('✓ GET /api/admin/client-posted-tasks/pending registered');
app.post('/api/admin/client-posted-tasks/:project_id/approve', protect, adminOnly, adminController.approveClientPostedTask);
console.log('✓ POST /api/admin/client-posted-tasks/:project_id/approve registered');
app.post('/api/admin/client-posted-tasks/:project_id/reject', protect, adminOnly, adminController.rejectClientPostedTask);
console.log('✓ POST /api/admin/client-posted-tasks/:project_id/reject registered');
app.post('/api/admin/client-posted-tasks/:project_id/assign-company', protect, adminOnly, adminController.assignCompanyToClientTask);
console.log('✓ POST /api/admin/client-posted-tasks/:project_id/assign-company registered');

// Project Management - Tasks
console.log('Loading Project Management routes...');
app.post('/api/tasks', protect, projectManagementController.createTask);
console.log('✓ POST /api/tasks registered');
app.get('/api/tasks', protect, projectManagementController.getTasks);
console.log('✓ GET /api/tasks registered');
app.get('/api/tasks/:taskId', protect, projectManagementController.getTaskDetail);
console.log('✓ GET /api/tasks/:taskId registered');
app.put('/api/tasks/:taskId', protect, projectManagementController.updateTask);
console.log('✓ PUT /api/tasks/:taskId registered');
app.delete('/api/tasks/:taskId', protect, projectManagementController.deleteTask);
console.log('✓ DELETE /api/tasks/:taskId registered');

// Project Management - Assignments
app.post('/api/tasks/:taskId/assignments', protect, projectManagementController.createAssignment);
console.log('✓ POST /api/tasks/:taskId/assignments registered');
app.put('/api/tasks/:taskId/assignments/:assignmentId/assign', protect, projectManagementController.assignUserToAssignment);
console.log('✓ PUT /api/tasks/:taskId/assignments/:assignmentId/assign registered');
app.get('/api/tasks/:taskId/assignments/:assignmentId', protect, projectManagementController.getAssignmentDetail);
console.log('✓ GET /api/tasks/:taskId/assignments/:assignmentId registered');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'ESCRO Platform Backend Running' });
});

// PDF Presentation endpoint
app.get('/api/docs/trust-system', async (req, res) => {
  try {
    const { generateTrustSystemPresentationBuffer } = await import('./services/pdfGenerator.js');
    const pdfBuffer = await generateTrustSystemPresentationBuffer();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=trust-system-presentation.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

// DEBUG endpoint to find a project by title
app.get('/api/debug/project/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const result = await pool.query(
      `SELECT id, client_id, expert_id, title, status FROM projects WHERE title ILIKE $1 LIMIT 1`,
      [`%${title}%`]
    );
    res.json({ 
      success: true, 
      project: result.rows[0] || null 
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

// DEBUG endpoint - get ALL projects as company
app.get('/api/debug/projects-all', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.client_id, p.expert_id, p.title, p.status, u.name as client_name, u.role as client_role FROM projects p LEFT JOIN users u ON p.client_id = u.id ORDER BY p.created_at DESC`
    );
    res.json({ 
      success: true, 
      total: result.rows.length,
      projects: result.rows
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

// DEBUG endpoint - simulate company getting projects
app.get('/api/debug/company-projects/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Simulate what company sees
    const whereClause = 'WHERE (p.client_id = $1 OR p.status != $2)';
    const params = [userId, 'pending_admin_approval'];
    
    const result = await pool.query(
      `SELECT p.id, p.client_id, p.expert_id, p.title, p.status, u.name as client_name FROM projects p 
       LEFT JOIN users u ON p.client_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC`,
      params
    );
    res.json({ 
      success: true, 
      userId: userId,
      total: result.rows.length,
      projects: result.rows
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`ESCRO Platform Backend running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

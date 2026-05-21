import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Shell from './components/Shell';
import TermsAcceptanceModal from './components/TermsAcceptanceModal';
import VerificationAckModal from './components/VerificationAckModal';

// Public routes — eager (small + needed for first paint)
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';

// Authenticated routes — lazy-loaded (heavy bundles split out)
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Disputes = lazy(() => import('./pages/Disputes'));
const CompanyDashboard = lazy(() => import('./pages/ClientDashboard'));
const ExpertDashboard = lazy(() => import('./pages/ExpertDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const ProfileEdit = lazy(() => import('./pages/ProfileEdit'));
const Settings = lazy(() => import('./pages/Settings'));
const Directory = lazy(() => import('./pages/Directory'));
const CreateProject = lazy(() => import('./pages/CreateProject'));
const CheckoutEscrow = lazy(() => import('./pages/CheckoutEscrow'));
const Terms = lazy(() => import('./pages/Terms'));
const AssignmentDetail = lazy(() => import('./pages/AssignmentDetail'));
const ProjectManagement = lazy(() => import('./pages/ProjectManagement'));
const Referral = lazy(() => import('./pages/Referral'));
const WalletDashboard = lazy(() => import('./pages/WalletDashboard'));
const EarningsHistory = lazy(() => import('./pages/EarningsHistory'));
const PayoutHistory = lazy(() => import('./pages/PayoutHistory'));
const AdminFinanciar = lazy(() => import('./pages/AdminFinanciar'));
const Contracts = lazy(() => import('./pages/Contracts'));
const MyProjects = lazy(() => import('./pages/MyProjects'));
const ChatInbox = lazy(() => import('./pages/ChatInbox'));
const Marketplace = lazy(() => import('./pages/Marketplace'));

import './App.css';

const PageFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
    <div className="spinner" />
  </div>
);

function TaskIdRedirect() {
  const { taskId } = useParams();
  return <Navigate to={`/project/${taskId}`} replace />;
}

function AssignmentTaskRedirect() {
  const { taskId, assignmentId } = useParams();
  return <Navigate to={`/project/${taskId}/assignment/${assignmentId}`} replace />;
}

function ProtectedRoute({ children, requiredRole }) {
  const { user, isAuthenticated, loading } = useAuth();
  const userRole = user?.role || localStorage.getItem('userRole');

  // Wait for auth restoration on refresh; otherwise we redirect to /login before user is fetched
  if (loading) return null;

  if (!isAuthenticated) return <Navigate to="/login" />;

  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowed.includes(userRole)) return <Navigate to="/login" />;
  }

  return children;
}

// Routes that use the Shell (authenticated, with sidebar)
function ShellRoutes() {
  return (
    <Shell>
      <Routes>
        <Route
          path="/company/dashboard"
          element={<ProtectedRoute requiredRole="company"><CompanyDashboard /></ProtectedRoute>}
        />
        <Route
          path="/individual/dashboard"
          element={<ProtectedRoute requiredRole="individual"><CompanyDashboard /></ProtectedRoute>}
        />
        <Route
          path="/expert/dashboard"
          element={<ProtectedRoute requiredRole="expert"><ExpertDashboard /></ProtectedRoute>}
        />
        <Route
          path="/admin/dashboard"
          element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>}
        />
        <Route
          path="/project/:projectId"
          element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>}
        />
        <Route
          path="/company/project/:projectId"
          element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>}
        />
        <Route
          path="/expert/project/:projectId"
          element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>}
        />
        <Route
          path="/directory"
          element={<ProtectedRoute><Directory /></ProtectedRoute>}
        />
        <Route
          path="/profile-edit"
          element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>}
        />
        <Route
          path="/setari"
          element={<ProtectedRoute><Settings /></ProtectedRoute>}
        />
        <Route
          path="/create-project"
          element={<ProtectedRoute><CreateProject /></ProtectedRoute>}
        />
        <Route
          path="/escrow/:projectId/checkout"
          element={<ProtectedRoute><CheckoutEscrow /></ProtectedRoute>}
        />
        {/* /task/:id redirects to /project/:id — PM projects have one canonical URL */}
        <Route
          path="/task/:taskId"
          element={<ProtectedRoute><TaskIdRedirect /></ProtectedRoute>}
        />
        <Route
          path="/task/:taskId/assignment/:assignmentId"
          element={<ProtectedRoute><AssignmentTaskRedirect /></ProtectedRoute>}
        />
        {/* Canonical assignment route under a project */}
        <Route
          path="/project/:projectId/assignment/:assignmentId"
          element={<ProtectedRoute><AssignmentDetail /></ProtectedRoute>}
        />
        <Route
          path="/project-management"
          element={<ProtectedRoute><ProjectManagement /></ProtectedRoute>}
        />
        <Route
          path="/referral"
          element={<ProtectedRoute requiredRole={['expert', 'company']}><Referral /></ProtectedRoute>}
        />
        <Route
          path="/wallet"
          element={<ProtectedRoute requiredRole={['expert', 'company', 'individual']}><WalletDashboard /></ProtectedRoute>}
        />
        <Route
          path="/wallet/earnings"
          element={<ProtectedRoute requiredRole={['expert', 'company']}><EarningsHistory /></ProtectedRoute>}
        />
        <Route
          path="/wallet/payouts"
          element={<ProtectedRoute requiredRole={['expert', 'company']}><PayoutHistory /></ProtectedRoute>}
        />
        <Route
          path="/admin/financiar"
          element={<ProtectedRoute requiredRole="admin"><AdminFinanciar /></ProtectedRoute>}
        />
        <Route
          path="/disputes"
          element={<ProtectedRoute><Disputes /></ProtectedRoute>}
        />
        <Route
          path="/contracts"
          element={<ProtectedRoute><Contracts /></ProtectedRoute>}
        />
        <Route
          path="/profile/:userId"
          element={<ProtectedRoute><PublicProfile /></ProtectedRoute>}
        />
        <Route
          path="/my-projects"
          element={<ProtectedRoute><MyProjects /></ProtectedRoute>}
        />
        <Route
          path="/chat"
          element={<ProtectedRoute><ChatInbox /></ProtectedRoute>}
        />
        <Route
          path="/marketplace"
          element={<ProtectedRoute requiredRole={['expert', 'company']}><Marketplace /></ProtectedRoute>}
        />
      </Routes>
    </Shell>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const role = localStorage.getItem('userRole');

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public routes — no Shell */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />
        {/* Auto-redirect to dashboard */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated
              ? <Navigate to={role === 'admin' ? '/admin/dashboard' : role === 'expert' ? '/expert/dashboard' : role === 'individual' ? '/individual/dashboard' : '/company/dashboard'} />
              : <Navigate to="/login" />
          }
        />

        {/* Shell routes */}
        <Route path="/*" element={<ShellRoutes />} />
      </Routes>
    </Suspense>
  );
}

function TermsGate() {
  const { user, isAuthenticated, clearTermsRequirement } = useAuth();
  if (!isAuthenticated || !user?.requires_terms_acceptance) return null;
  return <TermsAcceptanceModal onAccepted={clearTermsRequirement} />;
}

// Blocks the app until non-admin users acknowledge the phone verification call.
// Shown to every user (any role except admin) the first time they sign in after this feature shipped.
function VerificationAckGate() {
  const { user, isAuthenticated, updateUser } = useAuth();
  if (!isAuthenticated) return null;
  if (user?.role === 'admin') return null;
  if (user?.verification_call_acknowledged_at) return null;
  // Wait for T&C first — chained gates
  if (user?.requires_terms_acceptance) return null;
  return (
    <VerificationAckModal
      onAcknowledged={() => updateUser({ verification_call_acknowledged_at: new Date().toISOString() })}
    />
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <TermsGate />
          <VerificationAckGate />
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

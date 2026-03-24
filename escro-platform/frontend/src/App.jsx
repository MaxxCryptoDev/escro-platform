import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import Login from './pages/Login';
import CompanyDashboard from './pages/ClientDashboard';
import ExpertDashboard from './pages/ExpertDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProjectDetail from './pages/ProjectDetail';
import PublicProfile from './pages/PublicProfile';
import ProfileEdit from './pages/ProfileEdit';
import Directory from './pages/Directory';
import CreateProject from './pages/CreateProject';
import Terms from './pages/Terms';
import TaskDashboard from './pages/TaskDashboard';
import AssignmentDetail from './pages/AssignmentDetail';
import ProjectManagement from './pages/ProjectManagement';
import Referral from './pages/Referral';
import './App.css';

function ProtectedRoute({ children, requiredRole }) {
  const { user, isAuthenticated } = useAuth();
  const userRole = user?.role || localStorage.getItem('userRole');

  console.log('[ProtectedRoute] isAuthenticated:', isAuthenticated, 'userRole:', userRole, 'requiredRole:', requiredRole);

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to login');
    return <Navigate to="/login" />;
  }

  // If no role required, allow any authenticated user
  if (!requiredRole) {
    console.log('[ProtectedRoute] No role required, allowing access');
    return children;
  }

  // Allow multiple roles (array) or single role
  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  if (!allowedRoles.includes(userRole)) {
    console.log('[ProtectedRoute] Role not allowed, redirecting to login');
    return <Navigate to="/login" />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/terms" element={<Terms />} />
      
      <Route
        path="/create-project"
        element={
          <ProtectedRoute>
            <CreateProject />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/company/dashboard"
        element={
          <ProtectedRoute requiredRole="company">
            <CompanyDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/client/project/:projectId"
        element={
          <ProtectedRoute>
            <ProjectDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/project/:projectId"
        element={
          <ProtectedRoute>
            <ProjectDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/company/project/:projectId"
        element={
          <ProtectedRoute>
            <ProjectDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/expert/dashboard"
        element={
          <ProtectedRoute requiredRole="expert">
            <ExpertDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/expert/project/:projectId"
        element={
          <ProtectedRoute>
            <ProjectDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/directory"
        element={
          <ProtectedRoute>
            <Directory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile/:userId"
        element={<PublicProfile />}
      />

      <Route
        path="/profile-edit"
        element={
          <ProtectedRoute>
            <ProfileEdit />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/task/:taskId"
        element={
          <ProtectedRoute>
            <TaskDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/project-management"
        element={
          <ProtectedRoute>
            <ProjectManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/task/:taskId/assignment/:assignmentId"
        element={
          <ProtectedRoute>
            <AssignmentDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/referral"
        element={
          <ProtectedRoute requiredRole={['expert', 'company']}>
            <Referral />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

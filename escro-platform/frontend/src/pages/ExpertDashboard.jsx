import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import VerificationModal from '../components/VerificationModal';
import PostTaskModal from '../components/PostTaskModal';
import axios from 'axios';

const getInitials = (name) => {
  if (!name) return '?';
  const firstName = name.split(' ')[0];
  return firstName[0].toUpperCase();
};

const getFirstName = (name) => {
  if (!name) return '?';
  return name.split(' ')[0];
};

export default function ExpertDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  
  console.log('[DEBUG ExpertDashboard] Current user from context:', user);
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'projects');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Check verification status from user context
  const [userVerificationStatus, setUserVerificationStatus] = useState('pending');
  
  // Update verification status when user changes
  useEffect(() => {
    if (user?.kyc_status) {
      setUserVerificationStatus(user.kyc_status);
    }
  }, [user]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [projects, setProjects] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [myPostedTasks, setMyPostedTasks] = useState([]);
  const [showPostTaskModal, setShowPostTaskModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    company: '',
    profile_image_url: '',
    expertise: '',
    bio: '',
    portfolio_description: '',
    industry: '',
    experience: '',
    role: 'expert'
  });
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioFile, setPortfolioFile] = useState(null);
  const [portfolioPreview, setPortfolioPreview] = useState(null);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDesc, setPortfolioDesc] = useState('');
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [trustProfile, setTrustProfile] = useState(null);
  const isModalOpenRef = useRef(false);
  const isFirstLoadRef = useRef(true);
  const containerRef = useRef(null);

  // Track when modal is open to prevent unnecessary resets
  useEffect(() => {
    isModalOpenRef.current = showVerificationModal;
  }, [showVerificationModal]);

  // Auto-refresh verification status every 60 seconds to catch admin approvals
  useEffect(() => {
    const checkVerification = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/users/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const kyc_status = response.data.user?.kyc_status || 'pending';
        console.log('[DEBUG] KYC Status:', kyc_status);
        setUserVerificationStatus(kyc_status);
        
        // Only show modal if not already verified and modal is not already open
        if (kyc_status !== 'verified' && !isModalOpenRef.current) {
          console.log('[DEBUG] User not verified, checking for existing call...');
          try {
            const callResponse = await axios.get('/api/verification-calls/my-call', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('[DEBUG] Verification call response:', callResponse.data.data);
            if (!callResponse.data.data) {
              console.log('[DEBUG] No verification call found, showing modal');
              setShowVerificationModal(true);
            } else {
              console.log('[DEBUG] Verification call already exists');
            }
          } catch (err) {
            console.error('[DEBUG] Error checking verification calls:', err.message);
            console.log('[DEBUG] Showing modal due to error');
            setShowVerificationModal(true);
          }
        } else if (kyc_status === 'verified') {
          console.log('[DEBUG] User already verified, no modal needed');
        }
      } catch (err) {
        console.error('[DEBUG] Failed to check verification status:', err.message);
      }
    };

    // Check immediately on mount (after a small delay to ensure token is available)
    console.log('[DEBUG] ExpertDashboard mounted, checking verification...');
    setTimeout(() => {
      const token = localStorage.getItem('token');
      if (token) {
        checkVerification();
      }
    }, 500);
    
    // Then check every 60 seconds to give users time to complete forms
    const verificationInterval = setInterval(checkVerification, 60000);
    return () => clearInterval(verificationInterval);
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchMyPostedTasks();
    loadProfileFromBackend();
    fetchPortfolio();
    fetchTrustProfile();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchMyProjects();
    }
  }, [user?.id]);

  // Sync activeTab with URL query params from Header dropdown navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['projects', 'myprojects', 'post-task', 'profile', 'pending-approval'].includes(tab)) {
      setActiveTab(tab);
    } else {
      // If no tab param, default to projects
      setActiveTab('projects');
    }
  }, [searchParams]);

  // Fetch messages when project is selected
  useEffect(() => {
    if (selectedProject && (selectedProject.company_id || selectedProject.expert_id || (selectedProject.client_id && selectedProject.client_id !== selectedProject.company_id))) {
      console.log('[DEBUG ExpertDashboard] Fetching messages for project:', selectedProject.id, 'company_id:', selectedProject.company_id, 'expert_id:', selectedProject.expert_id, 'client_id:', selectedProject.client_id);
      fetchProjectMessages(selectedProject.id);
    }
  }, [selectedProject?.id]);

  const loadProfileFromBackend = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.user) {
        const fullName = response.data.user.name || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        setProfileData(prev => ({
          ...prev,
          firstName: firstName,
          lastName: lastName,
          email: response.data.user.email || '',
          phone: response.data.user.phone || '',
          company: response.data.user.company || '',
          profile_image_url: response.data.user.profile_image_url || '',
          expertise: response.data.user.expertise || '',
          bio: response.data.user.bio || '',
          portfolio_description: response.data.user.portfolio_description || '',
          industry: response.data.user.industry || '',
          experience: response.data.user.experience || '',
          role: response.data.user.role || 'company'
        }));
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/users/portfolio', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPortfolio(response.data.portfolio || []);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    }
  };

  const fetchTrustProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/trust-profiles/my-trust-profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrustProfile(response.data);
    } catch (err) {
      console.error('Failed to load trust profile:', err);
    }
  };

  const handlePortfolioFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPortfolioFile(file);
      setPortfolioPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadPortfolio = async () => {
    if (!portfolioFile) return;
    setUploadingPortfolio(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', portfolioFile);
      formData.append('title', portfolioTitle || 'Untitled');
      formData.append('description', portfolioDesc);
      
      await axios.post('/api/users/portfolio', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setPortfolioFile(null);
      setPortfolioPreview(null);
      setPortfolioTitle('');
      setPortfolioDesc('');
      fetchPortfolio();
      setSuccess('Portfolio item uploaded!');
    } catch (err) {
      console.error('Failed to upload portfolio:', err);
      setError('Failed to upload portfolio item');
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const handleDeletePortfolio = async (itemId) => {
    if (!confirm('Delete this portfolio item?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/users/portfolio/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPortfolio();
      setSuccess('Portfolio item deleted!');
    } catch (err) {
      console.error('Failed to delete portfolio:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      // Only set loading on first load
      if (isFirstLoadRef.current) {
        setLoading(true);
      }
      
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const projectsData = response.data.projects || response.data;
      const projectsArray = Array.isArray(projectsData) ? projectsData : [];
      
      // Debug: show all PM tasks statuses
      const pmTasksDebug = projectsArray.filter(p => p.is_pm_task).map(p => ({ title: p.title, status: p.status, task_id: p.task_id }));
      console.log('[DEBUG] All PM tasks from API:', JSON.stringify(pmTasksDebug, null, 2));
      
      // Filter logic:
      // 1. Keep all regular projects (matching, direct)
      // 2. Keep PM tasks from tasks table (is_pm_task = true) - show both PM and matching
      const assignmentProjects = projectsArray.filter((p, index, self) => {
        // Keep regular projects (not PM from tasks table, but PM standalone projects are OK)
        if (!p.is_pm_task) {
          return true;
        }
        
        // For PM entries from tasks table - ALWAYS keep them (don't remove duplicates)
        // Show both PM task AND matching collaboration
        return true;
      });
      
      console.log('[DEBUG] Projects after filter:', assignmentProjects.length);
      
      // Show only regular projects (PM tasks are pending projects from the projects table)
      setProjects(assignmentProjects);
      setError('');
      
      // Mark first load as done
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to fetch projects');
      console.error(err);
      if (isFirstLoadRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchMyProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const projectsData = response.data.projects || response.data;
      const projectsArray = Array.isArray(projectsData) ? projectsData : [];
      
      console.log('[DEBUG] ExpertDashboard.fetchMyProjects - ALL projects from API:', projectsArray.length);
      console.log('[DEBUG] ExpertDashboard - user.id:', user?.id);
      
      // Filter: show only projects where user is involved
      // Keep ALL projects including PM tasks (don't remove duplicates)
      const userId = user?.id;
      if (!userId) {
        setMyProjects([]);
        return;
      }
      const myProjectsOnly = projectsArray.filter(p => {
        // Check if user is involved
        const isInvolved = 
          String(p.expert_id) === String(userId) ||
          String(p.company_id) === String(userId) ||
          String(p.client_id) === String(userId) ||
          String(p.posted_by_expert) === String(userId);
        
        return isInvolved;
      }).filter((p, index, self) => index === self.findIndex(x => x.id === p.id));
      console.log('[DEBUG] ExpertDashboard.fetchMyProjects - filtered myProjectsOnly:', myProjectsOnly.length, 'userId:', userId);
      
      setMyProjects(myProjectsOnly);
      setError('');
    } catch (err) {
      console.error('Failed to fetch my projects:', err);
      setMyProjects([]);
    }
  };

  const fetchProjectMessages = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/projects/${projectId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const sendProjectMessage = async (projectId, recipientId, content) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/messages', 
        { project_id: projectId, recipient_id: recipientId, content },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      fetchProjectMessages(projectId);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const fetchMyPostedTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/experts/posted-tasks/my-tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('[DEBUG] fetchMyPostedTasks:', response.data.data.length, 'tasks');
      setMyPostedTasks(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch my posted tasks:', err);
      setMyPostedTasks([]);
    }
  };

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleProfileImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('profile_image', file);

      const response = await axios.post('/api/users/profile-image', formData, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.profile_image_url) {
        setProfileData(prev => ({
          ...prev,
          profile_image_url: response.data.profile_image_url
        }));
        setSuccess('✓ Profile picture updated successfully!');
        setProfileImagePreview(null); // Only clear on success
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to upload profile picture: ' + err.message);
      // Keep preview visible on error so user can retry
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const submitData = {
        ...profileData,
        name: `${profileData.firstName} ${profileData.lastName}`.trim()
      };
      delete submitData.firstName;
      delete submitData.lastName;
      delete submitData.role;
      const response = await axios.put('/api/users/profile', submitData, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setSuccess('✓ Profile saved successfully!');
      // Scroll to top
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save profile: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (data) => {
    // VerificationModal already posted the data, we just need to close modal and show success
    try {
      setSuccess('✓ Apel de verificare programat cu succes! Vei primi un apel de la echipa noastră.');
      setShowVerificationModal(false);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Eroare la programarea apelului de verificare');
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      in_progress: 'In Progress',
      delivered: 'Delivered',
      approved: 'Approved',
      disputed: 'Disputed',
      completed: 'Completed'
    };
    return labels[status] || status;
  };

  const getProjectStatusLabel = (status) => {
    const labels = {
      pending_admin_approval: 'Pending Approval',
      pending_approval: 'Pending Approval',
      approved: 'Approved',
      pending_assignment: 'Pending Assignment',
      assigned: 'Assigned',
      in_progress: 'In Progress',
      delivered: 'Delivered',
      completed: 'Completed',
      disputed: 'Disputed',
      open: 'Open'
    };
    return labels[status] || status;
  };

  const getProjectStatusColor = (status) => {
    const colors = {
      pending_admin_approval: '#ffc107',
      pending_approval: '#ffc107',
      approved: '#17a2b8',
      pending_assignment: '#ffc107',
      assigned: '#28a745',
      in_progress: '#17a2b8',
      delivered: '#20c997',
      completed: '#20c997',
      disputed: '#dc3545',
      open: '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  const handleSelectProject = (project) => {
    console.log('Navigating to project:', project.id, 'task_id:', project.task_id, 'is_pm_task:', project.is_pm_task);
    // For PM tasks, navigate to TaskDashboard, otherwise go to project detail
    if (project.is_pm_task && project.task_id) {
      navigate(`/task/${project.task_id}`);
    } else {
      navigate(`/expert/project/${project.id}`);
    }
  };

  const handleMilestoneSelect = (milestone) => {
    setSelectedMilestone(milestone);
  };

  // Remove sidebar - always show full width
  const showSidebar = false;

  if (loading && projects.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading projects...</h2>
      </div>
    );
  }

// Professional Enterprise Design System
const createUnifiedStyles = () => ({
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f8fafc',
    minHeight: 'calc(100vh - 65px)'
  },
  header: {
    marginBottom: '2rem',
    backgroundColor: 'white',
    padding: '1.5rem 2rem',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  headerTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 0.5rem 0',
    letterSpacing: '-0.025em'
  },
  headerSubtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: 0
  },
  tabsContainer: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '2rem',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '0'
  },
  tab: {
    padding: '0.75rem 1.25rem',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9375rem',
    fontWeight: '500',
    color: '#6b7280',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  tabActive: {
    color: '#2563eb',
    borderBottomColor: '#2563eb'
  },
  tabsRow: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '2rem',
    backgroundColor: 'white',
    padding: '0.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  projectsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '1.5rem'
  },
  projectCard: {
    backgroundColor: 'white',
    padding: '0',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    overflow: 'hidden'
  },
  projectCardHeader: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  projectCardBody: {
    padding: '1.25rem 1.5rem'
  },
  projectCardFooter: {
    padding: '1rem 1.5rem',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #f3f4f6',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  projectTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '0.5rem'
  },
  projectMeta: {
    fontSize: '0.9rem',
    color: '#6b7280',
    marginBottom: '0.5rem'
  },
  header: {
    marginBottom: '2.5rem'
  },
  headerTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1a202c',
    margin: '0 0 0.5rem 0',
    letterSpacing: '-0.5px'
  },
  headerSubtitle: {
    fontSize: '1rem',
    color: '#718096',
    margin: 0
  },
  messageBox: {
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    borderLeft: '4px solid',
    fontSize: '0.95rem'
  },
  errorBox: {
    backgroundColor: '#fee',
    borderLeftColor: '#dc3545',
    color: '#721c24'
  },
  successBox: {
    backgroundColor: '#efe',
    borderLeftColor: '#28a745',
    color: '#155724'
  },
  infoBox: {
    backgroundColor: '#fff3cd',
    borderLeftColor: '#ffc107',
    color: '#856404'
  },
  projectsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem'
  },
  projectCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  projectTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '0.75rem'
  },
  projectMeta: {
    fontSize: '0.9rem',
    color: '#718096',
    marginBottom: '0.5rem'
  },
  projectDetail: {
    backgroundColor: '#f7fafc',
    padding: '2rem',
    borderRadius: '12px',
    marginTop: '2rem',
    border: '1px solid #e2e8f0'
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginTop: '1rem'
  },
  detailItem: {
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  detailLabel: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.5rem'
  },
  detailValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1a202c'
  },
  button: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600'
  },
  card: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    transition: 'all 0.3s ease'
  },
  formGroup: {
    marginBottom: '1.25rem'
  },
  label: {
    fontWeight: '600',
    display: 'block',
    marginBottom: '0.5rem',
    color: '#1a202c',
    fontSize: '0.95rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '1rem',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  section: {
    marginBottom: '2rem'
  },
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '1.5rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #e2e8f0'
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  }
  });

  const profileStyles = {
    input: {
      width: '100%',
      padding: '0.625rem 0.875rem',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '0.9375rem',
      outline: 'none',
      transition: 'all 0.2s ease',
      backgroundColor: 'white'
    },
    button: {
      padding: '0.625rem 1rem',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.2s ease'
    },
    saveButton: {
      padding: '0.875rem 1.5rem',
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      width: '100%',
      marginTop: '0.5rem',
      transition: 'all 0.2s ease'
    }
  };

  const styles = createUnifiedStyles();

  return (
    <>
      <Header currentPage="dashboard" />
      <div style={styles.container} ref={containerRef}>
        {/* Pending Verification Banner */}
        {userVerificationStatus !== 'verified' && (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#856404'
          }}>
            ⏳ Contul dumneavoastră este în curs de aprobare de către administrator. După aprobare, veți putea posta taskuri și proiecte.
          </div>
        )}
        
        {error && (
          <div style={{ ...styles.messageBox, ...styles.errorBox, marginBottom: '1.5rem' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

            {selectedProject && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '2rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  maxHeight: 'calc(100vh - 200px)',
                  overflowY: 'auto',
                  position: 'sticky',
                  top: '100px',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#1a202c', fontWeight: '700' }}>Project Details</h3>
                    <button
                      onClick={() => setSelectedProject(null)}
                      style={{
                        backgroundColor: '#f0f0f0',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: '#666',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e0e0e0';
                        e.currentTarget.style.color = '#333';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                        e.currentTarget.style.color = '#666';
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#666', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title</h4>
                    <p style={{ margin: 0, fontWeight: '600', color: '#1a202c', fontSize: '1.1rem', lineHeight: '1.4' }}>{selectedProject.title}</p>
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#666', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</h4>
                    <p style={{ margin: 0, color: '#4a5568', fontSize: '0.95rem', lineHeight: '1.6' }}>
                      {selectedProject.description}
                    </p>
                  </div>

                  <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #f0f4f8' }}>
                    <h4 style={{ margin: '0 0 1.2rem 0', color: '#1a202c', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      💰 Escrow & Milestones
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                      <div style={{ 
                        backgroundColor: 'linear-gradient(135deg, #e7f5ff 0%, #f0f8ff 100%)',
                        padding: '1.2rem',
                        borderRadius: '8px',
                        border: '1px solid #b3d9ff',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ fontSize: '0.8rem', color: '#1971c2', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Total Budget</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0b7285' }}>
                          {selectedProject.budget_ron} RON
                        </div>
                      </div>
                      <div style={{ 
                        backgroundColor: 'linear-gradient(135deg, #fff9e6 0%, #fffbf0 100%)',
                        padding: '1.2rem',
                        borderRadius: '8px',
                        border: '1px solid #ffd666',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ fontSize: '0.8rem', color: '#b8860b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Milestones</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d48806' }}>
                          {selectedProject.milestones?.length || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '0', paddingTop: '0' }}>
                    <h4 style={{ margin: '0 0 1.2rem 0', color: '#1a202c', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📋 Timeline
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                      <div style={{ 
                        backgroundColor: '#f8f9fa',
                        padding: '1.2rem',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Duration</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#495057' }}>
                          {selectedProject.timeline_days} days
                        </div>
                      </div>
                      <div style={{ 
                        backgroundColor: '#f8f9fa',
                        padding: '1.2rem',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Status</div>
                        <div style={{ 
                          fontSize: '0.95rem', 
                          fontWeight: '700', 
                          color: getProjectStatusColor(selectedProject.status),
                          textTransform: 'capitalize',
                          padding: '0.4rem 0.8rem',
                          backgroundColor: getProjectStatusColor(selectedProject.status) + '15',
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}>
                          {getProjectStatusLabel(selectedProject.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/expert/project/${selectedProject.id}`)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      marginTop: '1.5rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0056b3';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#007bff';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => navigate(`/expert/project/${selectedProject.id}`)}
                  >
                    💬 View Full Details & Chat
                  </button>
                </div>
              )}

        {/* Available Projects Tab */}
        {activeTab === 'projects' && (
          <>
            <div style={styles.section}>
              <div style={styles.projectsList}>
                {projects.length === 0 ? (
                  <p style={{ color: '#718096' }}>No projects available at the moment.</p>
                ) : (
                  projects.map(project => (
                    <div 
                      key={project.id}
                      style={{
                        ...styles.projectCard,
                        cursor: 'pointer',
                        backgroundColor: selectedProject?.id === project.id ? '#f0f8ff' : 'white',
                        borderLeft: selectedProject?.id === project.id ? '4px solid #007bff' : '4px solid transparent'
                      }}
                      onClick={() => handleSelectProject(project)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h3 style={{ ...styles.projectTitle, marginBottom: 0 }}>
                          {project.assignment_type === 'task_assignment' ? project.title : (project.task_id ? project.task_title : project.title)}
                        </h3>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          backgroundColor: project.is_pm_task ? '#e7f5ff' : '#d4edda',
                          color: project.is_pm_task ? '#1971c2' : '#155724',
                          border: `1px solid ${project.is_pm_task ? '#90caf9' : '#c3e6cb'}`
                        }}>
                          {project.is_pm_task ? '📋 PM Task' : '🔗 Matching'}
                        </span>
                      </div>
                      <p style={styles.projectMeta}>{project.description?.substring(0, 100)}...</p>
                      <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#888' }}>
                        📅 {project.created_at ? new Date(project.created_at).toLocaleDateString('ro-RO') : ''}
                      </div>
                      {project.is_pm_task && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#555' }}>
{project.assigned_experts && project.assigned_experts.length > 0 ? (
                            <>👨‍💼 Prestatori: <strong>{project.assigned_experts.map(e => getFirstName(e?.name || '?')).join(', ')}</strong></>
                          ) : (
                            <span style={{ color: '#999' }}>👨‍💼 Prestatori: Nu sunt prestatori asignați</span>
                          )}
                        </div>
                      )}
                      {!project.is_pm_task && project.expert_name && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#555' }}>
                          👨‍💼 Prestator: <strong>{getFirstName(project.expert_name)}</strong>
                        </div>
                      )}
                      {project.company_name && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#555' }}>
                          🏢 Prestator: <strong>{getFirstName(project.company_name)}</strong>
                        </div>
                      )}
                      {project.client_name && (
                        <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#555' }}>
                          👤 Beneficiar: <strong>{getFirstName(project.client_name)}</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                        <span style={{ ...styles.projectBudget, color: '#007bff' }}>
                          {project.budget_ron ? `${project.budget_ron} RON` : 'Budget negotiable'}
                        </span>
                        {project.timeline_days && (
                          <span style={{ fontSize: '0.85rem', color: '#888' }}>
                            ⏱️ {project.timeline_days} zile
                          </span>
                        )}
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: getProjectStatusColor(project.status) + '20',
                          color: getProjectStatusColor(project.status)
                        }}>
                          {getProjectStatusLabel(project.status)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* My Projects Tab */}
        {activeTab === 'myprojects' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: showSidebar && selectedProject ? '1fr 450px' : '1fr', gap: '2rem', alignItems: 'flex-start' }}>
              <div style={styles.section}>
                <div style={styles.projectsList}>
                  {myProjects.length === 0 ? (
                    <p style={{ color: '#718096' }}>No projects created yet.</p>
                  ) : (
                    myProjects.map(project => (
                      <div 
                        key={project.id} 
                        style={{
                          ...styles.projectCard,
                          cursor: 'pointer',
                          backgroundColor: selectedProject?.id === project.id ? '#f0f8ff' : 'white',
                          borderLeft: selectedProject?.id === project.id ? '4px solid #007bff' : '4px solid transparent'
                        }}
                        onClick={() => handleSelectProject(project)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <h3 style={{ ...styles.projectTitle, marginBottom: 0 }}>
                            {project.assignment_type === 'task_assignment' ? project.title : (project.task_id ? project.task_title : project.title)}
                          </h3>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            backgroundColor: String(project.client_id) === String(user?.id) ? '#e8f5e9' : '#fff3e0',
                            color: String(project.client_id) === String(user?.id) ? '#2e7d32' : '#e65100',
                            border: `1px solid ${String(project.client_id) === String(user?.id) ? '#c8e6c9' : '#ffe0b2'}`
                          }}>
                            {String(project.client_id) === String(user?.id) ? '👤 Beneficiar' : '💼 Prestator'}
                          </span>
                        </div>
                        <p style={styles.projectMeta}>
                          {(project.assignment_type === 'task_assignment' ? project.description : (project.task_id ? project.task_description : project.description))?.substring(0, 80)}...</p>
                        <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#888' }}>
                          📅 {project.created_at ? new Date(project.created_at).toLocaleDateString('ro-RO') : ''}
                        </div>
                        {project.is_pm_task && project.assigned_experts && project.assigned_experts.length > 0 && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#555' }}>
                            👨‍💼 Prestatori: <strong>{project.assigned_experts.map(e => getFirstName(e.name)).join(', ')}</strong>
                          </div>
                        )}
                        {!project.is_pm_task && project.expert_name && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#555' }}>
                            👨‍💼 Prestator: <strong>{getFirstName(project.expert_name)}</strong>
                          </div>
                        )}
                        {project.company_name && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#555' }}>
                            🏢 Prestator: <strong>{getFirstName(project.company_name)}</strong>
                          </div>
                        )}
                        {project.client_name && (
                          <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#555' }}>
                            👤 Beneficiar: <strong>{getFirstName(project.client_name)}</strong>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                          <span style={{ ...styles.projectBudget, color: '#007bff' }}>
                            {project.task_id ? project.task_budget : project.budget_ron ? `${project.budget_ron} RON` : 'Budget negotiable'}
                          </span>
                          {(project.timeline_days || project.task_timeline) && (
                            <span style={{ fontSize: '0.85rem', color: '#888' }}>
                              ⏱️ {project.task_timeline || project.timeline_days} zile
                            </span>
                          )}
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: getProjectStatusColor(project.status) + '20',
                            color: getProjectStatusColor(project.status)
                          }}>
                            {getProjectStatusLabel(project.status)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedProject && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '2rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  maxHeight: 'calc(100vh - 200px)',
                  overflowY: 'auto',
                  position: 'sticky',
                  top: '100px',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#1a202c', fontWeight: '700' }}>Project Details</h3>
                    <button
                      onClick={() => setSelectedProject(null)}
                      style={{
                        backgroundColor: '#f0f0f0',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: '#666',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e0e0e0';
                        e.currentTarget.style.color = '#333';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                        e.currentTarget.style.color = '#666';
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#666', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title</h4>
                    <p style={{ margin: 0, fontWeight: '600', color: '#1a202c', fontSize: '1.1rem', lineHeight: '1.4' }}>{selectedProject.title}</p>
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#666', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</h4>
                    <p style={{ margin: 0, color: '#4a5568', fontSize: '0.95rem', lineHeight: '1.6' }}>
                      {selectedProject.description}
                    </p>
                  </div>

                  <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #f0f4f8' }}>
                    <h4 style={{ margin: '0 0 1.2rem 0', color: '#1a202c', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      💰 Escrow & Milestones
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                      <div style={{ 
                        backgroundColor: 'linear-gradient(135deg, #e7f5ff 0%, #f0f8ff 100%)',
                        padding: '1.2rem',
                        borderRadius: '8px',
                        border: '1px solid #b3d9ff',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ fontSize: '0.8rem', color: '#1971c2', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Total Budget</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0b7285' }}>
                          {selectedProject.budget_ron} RON
                        </div>
                      </div>
                      <div style={{ 
                        backgroundColor: 'linear-gradient(135deg, #fff9e6 0%, #fffbf0 100%)',
                        padding: '1.2rem',
                        borderRadius: '8px',
                        border: '1px solid #ffd666',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ fontSize: '0.8rem', color: '#b8860b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Milestones</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d48806' }}>
                          {selectedProject.milestones?.length || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '0', paddingTop: '0' }}>
                    <h4 style={{ margin: '0 0 1.2rem 0', color: '#1a202c', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📋 Timeline
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                      <div style={{ 
                        backgroundColor: '#f8f9fa',
                        padding: '1.2rem',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Duration</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#495057' }}>
                          {selectedProject.timeline_days} days
                        </div>
                      </div>
                      <div style={{ 
                        backgroundColor: '#f8f9fa',
                        padding: '1.2rem',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Status</div>
                        <div style={{ 
                          fontSize: '0.95rem', 
                          fontWeight: '700', 
                          color: getProjectStatusColor(selectedProject.status),
                          textTransform: 'capitalize',
                          padding: '0.4rem 0.8rem',
                          backgroundColor: getProjectStatusColor(selectedProject.status) + '15',
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}>
                          {getProjectStatusLabel(selectedProject.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/expert/project/${selectedProject.id}`)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      marginTop: '1.5rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0056b3';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#007bff';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => navigate(`/expert/project/${selectedProject.id}`)}
                  >
                    💬 View Full Details & Chat
                  </button>

                  {selectedProject && (
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #e9ecef' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#1a202c', fontSize: '1rem', fontWeight: '700' }}>💬 Chat cu Compania</h4>
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f7fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#48bb78' }}></span>
                          <span style={{ fontSize: '0.75rem', color: '#718096' }}>Proiect: {selectedProject.title?.slice(0, 30)}...</span>
                        </div>
                        <div style={{ padding: '0.75rem', backgroundColor: '#f7fafc', borderBottom: '1px solid #e2e8f0', flex: 1, overflowY: 'auto', minHeight: '150px', maxHeight: '150px' }}>
                          {messages.length === 0 ? (
                            <p style={{ color: '#718096', fontSize: '0.8rem', textAlign: 'center', margin: '2rem 0' }}>Începe conversația...</p>
                          ) : (
                            messages.map((msg) => {
                              const isMe = String(msg.sender_id) === String(user?.id);
                              return (
                                <div key={msg.id} style={{ marginBottom: '0.4rem', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                    {!isMe && (
                                      <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: msg.sender_role === 'company' ? '#805ad5' : '#3182ce',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '0.55rem',
                                        fontWeight: 'bold',
                                        flexShrink: 0
                                      }}>
                                        {getInitials(msg.sender_name)}
                                      </div>
                                    )}
                                    <div style={{ 
                                      padding: '0.4rem 0.6rem', 
                                      borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px', 
                                      backgroundColor: isMe ? '#3182ce' : '#fff', 
                                      color: isMe ? 'white' : '#2d3748', 
                                      fontSize: '0.75rem',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                      border: isMe ? 'none' : '1px solid #e2e8f0'
                                    }}>
                                      {msg.content}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '0.65rem', color: '#a0aec0', marginTop: '0.15rem', paddingLeft: isMe ? 0 : '1.8rem', paddingRight: isMe ? '1.8rem' : 0 }}>
                                    {new Date(msg.created_at).toLocaleString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                        <div style={{ padding: '0.5rem', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem' }}>
                          <input 
                            type="text" 
                            value={newMessage} 
                            onChange={(e) => setNewMessage(e.target.value)} 
                            placeholder="Scrie un mesaj..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                let recipientId = selectedProject.company_id;
                                if (!recipientId && selectedProject.client_id && selectedProject.client_id !== selectedProject.company_id) {
                                  recipientId = selectedProject.client_id;
                                }
                                if (newMessage.trim() && recipientId) sendProjectMessage(selectedProject.id, recipientId, newMessage);
                                else if (newMessage.trim()) alert('Nu există companie asignată la acest proiect');
                              }
                            }}
                            style={{ 
                              flex: 1, 
                              padding: '0.5rem 0.75rem', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '20px', 
                              fontSize: '0.8rem',
                              outline: 'none'
                            }} 
                          />
                          <button 
                            onClick={() => { 
                              // Expert sends to company, or to client if client is expert
                              let recipientId = selectedProject.company_id;
                              if (!recipientId && selectedProject.client_id && selectedProject.client_id !== selectedProject.company_id) {
                                recipientId = selectedProject.client_id;
                              }
                              if (newMessage.trim() && recipientId) sendProjectMessage(selectedProject.id, recipientId, newMessage); 
                              else if (newMessage.trim()) alert('Nu există companie asignată la acest proiect');
                            }} 
                            disabled={!newMessage.trim()}
                            style={{ 
                              padding: '0.5rem 1rem', 
                              backgroundColor: newMessage.trim() ? '#3182ce' : '#cbd5e0', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '20px', 
                              cursor: newMessage.trim() ? 'pointer' : 'not-allowed', 
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            Trimite
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Post Task Tab */}
        {activeTab === 'post-task' && (
          <>
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <button
                  onClick={() => setShowPostTaskModal(true)}
                  disabled={userVerificationStatus !== 'verified'}
                  title={userVerificationStatus !== 'verified' ? 'Complete verification to post tasks' : 'Post a new task'}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: userVerificationStatus === 'verified' ? '#007bff' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: userVerificationStatus === 'verified' ? 'pointer' : 'not-allowed',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    opacity: userVerificationStatus === 'verified' ? 1 : 0.6
                  }}
                  onMouseEnter={(e) => {
                    if (userVerificationStatus === 'verified') {
                      e.currentTarget.style.backgroundColor = '#0056b3';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (userVerificationStatus === 'verified') {
                      e.currentTarget.style.backgroundColor = '#007bff';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  ➕ New Task
                </button>
              </div>

              {(userVerificationStatus !== 'verified' || user?.kyc_status !== 'verified') && (
                <div style={{ ...styles.messageBox, ...styles.infoBox, marginBottom: '1.5rem' }}>
                  ⏳ <strong>Your account is pending verification.</strong> You can view your posted tasks but cannot post new ones until your verification call is completed.
                </div>
              )}

              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', marginTop: '2rem' }}>📋 Your Posted Tasks</h3>
              <div style={styles.projectsList}>
                {myPostedTasks.length === 0 ? (
                  <p style={{ color: '#718096' }}>No tasks posted yet. Click "New Task" to get started!</p>
                ) : (
                  myPostedTasks.map(task => (
                    <div 
                      key={task.id}
                      style={{
                        ...styles.projectCard,
                        backgroundColor: task.client_posting_status === 'pending' ? '#fffbf0' : 'white'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={styles.projectTitle}>{task.title}</h3>
                          <p style={styles.projectMeta}>{task.description?.substring(0, 100)}...</p>
                        </div>
                        <span style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          backgroundColor: task.client_posting_status === 'pending' ? '#ffc10720' : 
                                           task.client_posting_status === 'approved' ? '#28a74520' : '#dc354520',
                          color: task.client_posting_status === 'pending' ? '#ffc107' : 
                                 task.client_posting_status === 'approved' ? '#28a745' : '#dc3545'
                        }}>
                          {task.client_posting_status === 'pending' ? '⏳ Pending Approval' :
                           task.client_posting_status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                        <div>
                          <span style={styles.projectMeta}>💰 Budget:</span>
                          <strong style={{ color: '#2563eb', display: 'block', fontSize: '1.1rem' }}>{task.budget_ron} RON</strong>
                        </div>
                        <div>
                          <span style={styles.projectMeta}>⏱️ Timeline:</span>
                          <strong style={{ color: '#2563eb', display: 'block', fontSize: '1.1rem' }}>{task.timeline_days} days</strong>
                        </div>
                        <div>
                          <span style={styles.projectMeta}>🎯 Milestones:</span>
                          <strong style={{ color: '#2563eb', display: 'block', fontSize: '1.1rem' }}>{task.milestone_count} milestones</strong>
                        </div>
                        <div>
                          <span style={styles.projectMeta}>📅 Posted:</span>
                          <strong style={{ color: '#2563eb', display: 'block', fontSize: '0.95rem' }}>
                            {new Date(task.created_at).toLocaleDateString()}
                          </strong>
                        </div>
                      </div>

                      {task.client_posting_message && (
                        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f7fafc', borderRadius: '6px', borderLeft: '3px solid #007bff' }}>
                          <p style={{ margin: 0, color: '#4a5568', fontSize: '0.9rem' }}><strong>Your message:</strong> {task.client_posting_message}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: '2.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '2rem'
            }}>
              <div style={{ position: 'relative' }}>
                {profileData.profile_image_url || profileImagePreview ? (
                  <img
                    src={profileImagePreview || profileData.profile_image_url}
                    alt="Profile"
                    style={{
                      width: '140px',
                      height: '140px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '4px solid #2563eb',
                      opacity: profileImagePreview ? 0.8 : 1
                    }}
                  />
                ) : (
                  <div style={{
                    width: '140px',
                    height: '140px',
                    borderRadius: '50%',
                    backgroundColor: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '3rem',
                    border: '4px solid #d1d5db'
                  }}>
                    👤
                  </div>
                )}
                <label style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  📷
                  <input type="file" accept="image/*" onChange={handleProfileImageChange} style={{ display: 'none' }} />
                </label>
              </div>
              
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: '700', color: '#111827' }}>
                  {profileData.firstName} {profileData.lastName}
                </h2>
                <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '1rem' }}>
                  {profileData.company || 'Companie'}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                    borderRadius: '9999px',
                    fontSize: '0.8125rem',
                    fontWeight: '500'
                  }}>
                    {user?.role === 'expert' ? '👨‍💼 Expert' : '🏢 Client'}
                  </span>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: '#d1fae5',
                    color: '#059669',
                    borderRadius: '9999px',
                    fontSize: '0.8125rem',
                    fontWeight: '500'
                  }}>
                    ✓ Verificat
                  </span>
                </div>

                {/* Points System */}
                {trustProfile && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1rem' }}>🏆</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>Sistem de Puncte</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                      <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f59e0b' }}>⭐</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827' }}>{Math.round(trustProfile.trust_score || 0)}</div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase' }}>Incredere</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#3b82f6' }}>🆔</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827' }}>{trustProfile.type2_points || 0}</div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase' }}>Identitate</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981' }}>🎁</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827' }}>{trustProfile.type1_points || 0}</div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase' }}>Recompensa</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showPostTaskModal && (
          <PostTaskModal
            userType="client"
            onClose={() => {
              setShowPostTaskModal(false);
              // Refresh posted tasks after modal closes
              setTimeout(() => {
                fetchMyPostedTasks();
              }, 500);
            }}
            onSubmit={(response) => {
              setSuccess('Task posted successfully! Admin will review it shortly.');
              setTimeout(() => {
                setSuccess('');
              }, 3000);
              fetchMyPostedTasks();
            }}
          />
        )}

        {showVerificationModal && (
          <VerificationModal 
            user={user} 
            onClose={() => {
              setShowVerificationModal(false);
              // Check verification status when modal closes to catch any admin updates
              setTimeout(() => {
                const token = localStorage.getItem('token');
                axios.get('/api/users/profile', {
                  headers: { 'Authorization': `Bearer ${token}` }
                }).then(response => {
                  const kyc_status = response.data.user?.kyc_status;
                  setUserVerificationStatus(kyc_status);
                }).catch(err => console.error('Error checking status on close:', err));
              }, 500);
            }}
            onSubmit={handleVerificationSubmit}
          />
        )}
      </div>
    </>
  );
}

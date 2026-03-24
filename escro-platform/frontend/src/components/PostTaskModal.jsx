import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../styles/TaskRequestModal.css';

/**
 * Generic Modal for posting tasks
 * Can be used by both experts and clients
 * Props:
 *  - userType: 'expert' | 'client'
 *  - onClose: callback when modal closes
 *  - onSubmit: callback with response data
 */
export default function PostTaskModal({ userType = 'expert', onClose, onSubmit }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget_ron: '',
    timeline_days: '',
    message: '',
    milestones: [
      { title: 'Milestone 1', deliverable_description: '', percentage_of_budget: 50 },
      { title: 'Milestone 2', deliverable_description: '', percentage_of_budget: 50 }
    ]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isExpert = userType === 'expert';
  const endpoint = isExpert 
    ? 'http://localhost:5000/api/experts/posted-tasks'
    : 'http://localhost:5000/api/companies/posted-tasks';
  
  const postAsLabel = isExpert ? '👨‍💼 Expert' : '🏢 Company';
  const messageLabel = isExpert 
    ? 'Message to Companies (Optional)'
    : 'Message to Experts (Optional)';
  const messagePlaceholder = isExpert
    ? 'Tell companies why they should work with you on this task. Share your expertise or specific requirements...'
    : 'Tell experts why they should work with you on this task. Share your requirements or specific needs...';

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMilestoneChange = (index, field, value) => {
    const updatedMilestones = [...formData.milestones];
    updatedMilestones[index][field] = value;
    setFormData(prev => ({ ...prev, milestones: updatedMilestones }));
  };

  const addMilestone = () => {
    const newMilestone = {
      title: `Milestone ${formData.milestones.length + 1}`,
      deliverable_description: '',
      percentage_of_budget: 0
    };
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, newMilestone]
    }));
  };

  const removeMilestone = (index) => {
    if (formData.milestones.length <= 1) {
      setError('At least one milestone is required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      // Validation
      if (!formData.title || !formData.description || !formData.budget_ron || !formData.timeline_days) {
        throw new Error('All fields are required');
      }

      if (formData.budget_ron <= 0) {
        throw new Error('Budget must be greater than 0');
      }

      if (formData.timeline_days <= 0) {
        throw new Error('Timeline must be greater than 0');
      }

      // Validate milestones percentage sums to 100
      const totalPercentage = formData.milestones.reduce((sum, m) => sum + parseFloat(m.percentage_of_budget || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error(`Milestone percentages must sum to 100% (currently ${totalPercentage}%)`);
      }

      const response = await axios.post(endpoint, {
        title: formData.title,
        description: formData.description,
        budget_ron: parseFloat(formData.budget_ron),
        timeline_days: parseInt(formData.timeline_days),
        message: formData.message,
        milestones: formData.milestones.map(m => ({
          title: m.title,
          deliverable_description: m.deliverable_description,
          percentage_of_budget: parseFloat(m.percentage_of_budget)
        }))
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (onSubmit) {
        onSubmit(response.data);
      }

      onClose();

    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to post task';
      setError(errorMsg);
      console.error('Error posting task:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="task-request-modal-overlay">
      <div className="task-request-modal" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>📝 Post a New Task</h2>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.3rem' }}>
            Posting as: <strong>{postAsLabel}</strong>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #e0e0e0' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>📋 Task Details</h3>

              <div className="form-group">
                <label htmlFor="title">Task Title *</label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="e.g., Mobile App Development, Social Media Strategy"
                  maxLength="200"
                  className="message-textarea"
                  style={{ minHeight: 'auto', height: '40px' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Describe the task in detail. What needs to be done? What are your expectations?"
                  rows="4"
                  maxLength="1500"
                  className="message-textarea"
                />
                <div className="char-count">{formData.description.length}/1500</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="budget">Budget (RON) *</label>
                  <input
                    id="budget"
                    type="number"
                    value={formData.budget_ron}
                    onChange={(e) => handleFieldChange('budget_ron', e.target.value)}
                    placeholder="0"
                    min="1"
                    step="0.01"
                    className="message-textarea"
                    style={{ minHeight: 'auto', height: '40px' }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="timeline">Timeline (days) *</label>
                  <input
                    id="timeline"
                    type="number"
                    value={formData.timeline_days}
                    onChange={(e) => handleFieldChange('timeline_days', e.target.value)}
                    placeholder="0"
                    min="1"
                    className="message-textarea"
                    style={{ minHeight: 'auto', height: '40px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="message">{messageLabel}</label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleFieldChange('message', e.target.value)}
                  placeholder={messagePlaceholder}
                  rows="3"
                  maxLength="500"
                  className="message-textarea"
                />
                <div className="char-count">{formData.message.length}/500</div>
              </div>
            </div>

            {/* Milestones */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>🎯 Milestones *</h3>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                Percentages must sum to 100%
              </p>

              {formData.milestones.map((milestone, index) => (
                <div 
                  key={index} 
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    backgroundColor: '#fafafa'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>Milestone {index + 1}</h4>
                    {formData.milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(index)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.4rem 0.8rem',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        🗑️ Remove
                      </button>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Title *</label>
                    <input
                      type="text"
                      value={milestone.title}
                      onChange={(e) => handleMilestoneChange(index, 'title', e.target.value)}
                      placeholder="e.g., Design Phase"
                      maxLength="100"
                      className="message-textarea"
                      style={{ minHeight: 'auto', height: '36px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Deliverable Description</label>
                    <textarea
                      value={milestone.deliverable_description}
                      onChange={(e) => handleMilestoneChange(index, 'deliverable_description', e.target.value)}
                      placeholder="What should be delivered at this milestone?"
                      rows="2"
                      maxLength="500"
                      className="message-textarea"
                    />
                  </div>

                  <div className="form-group">
                    <label>Budget Percentage (%) *</label>
                    <input
                      type="number"
                      value={milestone.percentage_of_budget}
                      onChange={(e) => handleMilestoneChange(index, 'percentage_of_budget', e.target.value)}
                      min="0"
                      max="100"
                      step="0.01"
                      className="message-textarea"
                      style={{ minHeight: 'auto', height: '36px' }}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addMilestone}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  width: '100%'
                }}
              >
                ➕ Add Milestone
              </button>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fee',
                border: '1px solid #fcc',
                color: '#721c24',
                padding: '1rem',
                borderRadius: '4px',
                marginBottom: '1rem'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Posting...' : '📤 Post Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

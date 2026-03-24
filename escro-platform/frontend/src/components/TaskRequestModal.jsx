import React, { useState } from 'react';
import axios from 'axios';
import '../styles/TaskRequestModal.css';

export default function TaskRequestModal({ project, onClose, onSubmit }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      const response = await axios.post('http://localhost:5000/api/task-requests', {
        project_id: project.id,
        message: message
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (onSubmit) {
        onSubmit(response.data);
      }

      // Close modal immediately after successful submission
      onClose();

    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to send request';
      setError(errorMsg);
      console.error('Error sending task request:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="task-request-modal-overlay">
      <div className="task-request-modal">
        <div className="modal-header">
          <h2>Request to Participate</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="project-info">
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            <div className="project-meta">
              <span className="budget">💰 {project.budget_ron} RON</span>
              <span className="timeline">📅 {project.timeline_days} days</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="message">Message to Client (Optional)</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell the client why you'd be a good fit for this project. Share your relevant experience, approach, or any questions you have..."
                rows="5"
                className="message-textarea"
              />
              <div className="char-count">{message.length}/500</div>
            </div>
            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </form>

          <div className="info-box">
            <h4>What happens next?</h4>
            <ul>
              <li>The client will see your request in their project dashboard</li>
              <li>They can review your profile and message</li>
              <li>The client will approve or decline your request</li>
              <li>If approved, you'll be assigned to the project</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

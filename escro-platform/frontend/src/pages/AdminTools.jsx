import React, { useState } from 'react';
import './AdminTools.css';

export default function AdminTools() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fixMilestones = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/fix-milestones', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error fixing milestones');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-tools">
      <h2>🛠️ Admin Tools</h2>
      
      <div className="tool-card">
        <h3>Fix Milestones Schema & Data</h3>
        <p>Adds missing columns to milestones table and populates "bla bla" project with test data.</p>
        
        <button 
          onClick={fixMilestones} 
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Processing...' : 'Fix Milestones'}
        </button>

        {error && (
          <div className="error-message">
            ❌ Error: {error}
          </div>
        )}

        {result && (
          <div className="success-message">
            ✅ {result.message}
            <br />
            Project ID: {result.projectId}
            <br />
            Milestones Added: {result.milestonesAdded}
          </div>
        )}
      </div>
    </div>
  );
}

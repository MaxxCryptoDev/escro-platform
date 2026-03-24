import React, { useState } from 'react';
import axios from 'axios';
import '../styles/VerificationModal.css';

export default function VerificationModal({ user, onClose, onSubmit }) {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!scheduledDate || !scheduledTime) {
      setError('Te rugăm să selectezi data și ora');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const response = await axios.post('/api/verification-calls', {
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        notes: notes
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setSuccess('✓ Programare efectuată cu succes!');
      
      if (onSubmit) {
        onSubmit(response.data);
      }
      
      // Close modal after brief delay to show success message
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Eroare la programarea apelului';
      setError(errorMsg);
      console.error('Error scheduling call:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate time options (9 AM to 6 PM, 30 minute intervals)
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const label = `${hour > 12 ? hour - 12 : hour}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
        times.push({ value: timeStr, label });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];
  
  // Get maximum date (30 days from now)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <div className="verification-modal-overlay">
      <div className="verification-modal">
        <div className="modal-header">
          <h2>Verificare Cont</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <p className="warning-message">
            ⚠️ Contul tău trebuie verificat înainte de a putea utiliza platforma. 
            Te rugăm să programezi un apel de verificare de 15 minute cu echipa noastră.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="date">Data preferată</label>
              <input
                type="date"
                id="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={today}
                max={maxDateStr}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="time">Ora preferată</label>
              <select
                id="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              >
                <option value="">-- Selectează ora --</option>
                {timeOptions.map((time) => (
                  <option key={time.value} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Observații (Opțional)</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informații suplimentare despre datele tale de contact..."
                rows="3"
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Anulează
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Se programează...' : 'Programează Apelul'}
              </button>
            </div>
          </form>

          <div className="info-box">
            <h4>Ce trebuie să știi:</h4>
            <ul>
              <li>Un apel scurt de verificare de 15 minute</li>
              <li>Vom verifica identitatea și calificările tale</li>
              <li>Contul tău va fi activat imediat după aprobare</li>
              <li>Vei putea începe să folosești toate funcționalitățile platformei</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import axios from 'axios';

export default function ReviewModal({ isOpen, onClose, reviewableUser, projectTitle, projectId, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Te rog selectează un rating');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/reviews', {
        reviewed_id: reviewableUser.id,
        project_id: projectId,
        rating: rating,
        review_text: reviewText || null
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la trimiterea recenziei');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '450px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', color: '#1f2937' }}>
          ⭐ Lasă o Recenzie
        </h2>
        
        <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.95rem' }}>
          Cum a fost colaborarea cu <strong>{reviewableUser?.name}</strong> la proiectul <strong>"{projectTitle}"</strong>?
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
            Rating
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  color: (hoverRating || rating) >= star ? '#f59e0b' : '#d1d5db',
                  transition: 'transform 0.1s',
                  transform: (hoverRating || rating) >= star ? 'scale(1.1)' : 'scale(1)'
                }}
              >
                ★
              </button>
            ))}
          </div>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
            {rating === 1 && 'Foarte nesatisfăcător'}
            {rating === 2 && 'Nesatisfăcător'}
            {rating === 3 && 'Neutral'}
            {rating === 4 && 'Satisfăcător'}
            {rating === 5 && 'Foarte satisfăcător'}
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
            Comentariu (opțional)
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Spune-ne mai multe despre colaborare..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.95rem',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {error && (
          <div style={{ 
            backgroundColor: '#fee2e2', 
            color: '#dc2626', 
            padding: '0.75rem', 
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Anulează
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: submitting ? '#9ca3af' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Se trimite...' : 'Trimite Recenzie'}
          </button>
        </div>
      </div>
    </div>
  );
}

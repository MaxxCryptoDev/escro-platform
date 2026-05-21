import React, { useState } from 'react';
import axios from 'axios';
import { Avatar } from './ui';

const LABELS = ['', 'Foarte slab', 'Nesatisfăcător', 'Neutru', 'Bun', 'Excelent'];

export default function ReviewModal({ isOpen, onClose, reviewableUser, projectTitle, projectId, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !reviewableUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { setError('Selectează un rating între 1 și 5 stele'); return; }
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/reviews', {
        reviewed_id: reviewableUser.id,
        project_id: projectId,
        rating,
        review_text: reviewText.trim() || null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (onReviewSubmitted) onReviewSubmitted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la trimiterea recenziei');
    } finally {
      setSubmitting(false);
    }
  };

  const active = hover || rating;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 460, width: '100%', padding: '1.75rem', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="row" style={{ gap: '0.75rem', marginBottom: '1.25rem' }}>
          <Avatar user={{ name: reviewableUser.name, color: 'blue' }} size="md" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--fg-0)' }}>
              Lasă o recenzie
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 2 }}>
              {reviewableUser.name} · <span style={{ fontStyle: 'italic' }}>{projectTitle}</span>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto', padding: '0.25rem 0.5rem', fontSize: 16, lineHeight: 1 }}
            onClick={onClose}
          >×</button>
        </div>

        <div style={{ width: '100%', height: 1, background: 'var(--border-1)', marginBottom: '1.25rem' }} />

        <form onSubmit={handleSubmit}>
          {/* Stars */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: '0.5rem' }}>
              Rating *
            </div>
            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 32, lineHeight: 1,
                    color: active >= star ? 'var(--warning)' : 'var(--border-3)',
                    transform: active >= star ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.1s, color 0.1s',
                  }}
                >★</button>
              ))}
              {active > 0 && (
                <span style={{ marginLeft: '0.5rem', fontSize: 13, color: 'var(--warning)', fontWeight: 600 }}>
                  {LABELS[active]}
                </span>
              )}
            </div>
          </div>

          {/* Text */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: '0.5rem' }}>
              Comentariu <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>(opțional)</span>
            </div>
            <textarea
              className="input"
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="Descrie experiența ta cu acest colaborator..."
              maxLength={1000}
              style={{ minHeight: 90, resize: 'vertical', fontSize: 13 }}
            />
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4, textAlign: 'right' }}>
              {reviewText.length}/1000
            </div>
          </div>

          {error && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', padding: '0.625rem 0.875rem', fontSize: 13, marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
              Anulează
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={submitting || rating === 0}
            >
              {submitting ? 'Se trimite…' : 'Trimite recenzia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Icon, Avatar, Spinner } from '../components/ui';
import { fmtDate, avatarColor } from '../utils/format';

export default function ChatInbox() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await axios.get('/api/messages/conversations', { headers });
        if (!cancelled) setConversations(r.data.conversations || []);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Nu am putut încărca conversațiile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const lockedLabel = (status) =>
    status === 'completed' ? 'Finalizat — doar vizualizare'
    : status === 'cancelled' ? 'Anulat — doar vizualizare'
    : status === 'rejected' ? 'Respins — doar vizualizare'
    : null;

  return (
    <div className="escro-page fade-up" style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="page-head" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div className="h-eyebrow"><Icon name="message" size={11} /> Chat</div>
          <h1 className="h-title">Conversațiile mele</h1>
          <p className="h-sub">Toate discuțiile cu persoanele cu care ai colaborat pe proiecte.</p>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Spinner />
        </div>
      )}

      {!loading && error && (
        <div style={{ padding: '1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-md)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {!loading && !error && conversations.length === 0 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Icon name="message" size={32} style={{ color: 'var(--fg-3)', marginBottom: '1rem' }} />
          <div style={{ fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>Nicio conversație încă</div>
          <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>
            Conversațiile apar aici după ce ești asignat pe un proiect cu altcineva.
          </div>
        </div>
      )}

      {!loading && conversations.length > 0 && (
        <div className="col" style={{ gap: '0.5rem' }}>
          {conversations.map(c => {
            const locked = c.locked;
            const lockedMsg = lockedLabel(c.project_status);
            const partnerName = c.counterparty?.name || 'Necunoscut';
            return (
              <div
                key={c.project_id}
                onClick={() => navigate(`/project/${c.project_id}?tab=chat`)}
                className="card"
                style={{
                  padding: '1rem 1.25rem',
                  cursor: 'pointer',
                  borderColor: c.unread_count > 0 ? 'var(--accent)' : 'var(--border-1)',
                  borderWidth: c.unread_count > 0 ? 2 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <Avatar
                  user={{ name: partnerName, color: avatarColor(c.counterparty?.role || 'client') }}
                  size="md"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {partnerName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)', flexShrink: 0 }}>
                      {c.last_message_at ? fmtDate(c.last_message_at) : '—'}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 6 }}>
                    {c.project_title}
                  </div>
                  {c.last_message_content && (
                    <div style={{
                      fontSize: 12.5,
                      color: c.unread_count > 0 ? 'var(--fg-0)' : 'var(--fg-2)',
                      fontWeight: c.unread_count > 0 ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {c.last_sender_is_me ? <span style={{ color: 'var(--fg-3)' }}>Tu: </span> : null}
                      {c.last_message_content}
                    </div>
                  )}
                  {locked && lockedMsg && (
                    <div style={{
                      marginTop: 6, fontSize: 11, color: 'var(--fg-3)',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', background: 'var(--bg-1)', border: '1px solid var(--border-1)',
                      borderRadius: 'var(--r-sm)',
                    }}>
                      <Icon name="lock" size={10} /> {lockedMsg}
                    </div>
                  )}
                </div>
                {c.unread_count > 0 && (
                  <div style={{
                    minWidth: 22, height: 22, padding: '0 7px',
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 11, fontWeight: 700, borderRadius: 11,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {c.unread_count > 99 ? '99+' : c.unread_count}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ProfileEdit — multi-card layout cu sticky nav, portfolio modal complet, sticky save bar,
   toasts și drag-to-reorder portfolio. Notificările sunt explicit excluse (skip per cerere). */

import { useState, useEffect, useRef, useCallback, useContext, createContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Icon, Spinner } from '../components/ui';

const IDENTITY_POINTS = {
  profile_completed: { points: 15, label: 'Profil complet',     icon: 'user',         description: 'Nume, email, telefon, biografie, profesie, industrie, expertiză' },
  profile_photo:     { points: 10, label: 'Fotografie profil',  icon: 'camera',       description: 'Încarcă o fotografie de profil' },
  portfolio_approved:{ points: 15, label: 'Portofoliu',         icon: 'image',        description: 'Min. 3 imagini în portofoliu' },
  email_validated:   { points: 10, label: 'Email validat',      icon: 'mail',         description: 'Email confirmat în sistem' },
  kyc_verified:      { points: 5,  label: 'Verificare KYC',     icon: 'shield-check', description: 'Verificare identitate prin Stripe' },
  payment_method:    { points: 10, label: 'Metodă de plată',    icon: 'wallet',       description: 'Adaugă o metodă de plată' },
  verification_call: { points: 15, label: 'Apel validare',      icon: 'phone',        description: 'Apel intern de validare identitate' },
};

const INDUSTRY_OPTIONS = [
  'IT & Software', 'Marketing', 'Construcții', 'Retail', 'Finanțe', 'Sănătate',
  'Educație', 'Imobiliare', 'Producție', 'Logistică', 'HoReCa',
  'Servicii profesionale', 'Audit', 'Consultanță strategie', 'Media & Conținut digital', 'Altele',
];

const CATEGORIES = [
  'Web Development', 'Mobile Apps', 'UI/UX Design', 'E-commerce',
  'Marketing', 'SEO', 'Content', 'Video', 'Photography', 'Consulting', 'Other',
];

// ───────── Toast ─────────
const ToastCtx = createContext(() => {});

function Toast({ type = 'success', title, message, points, onClose }) {
  const tones = {
    success: { bg: 'var(--success-bg)', bd: 'var(--success-border)', fg: 'var(--success)', icon: 'check-circle' },
    error:   { bg: 'var(--danger-bg)',  bd: 'var(--danger-border)',  fg: 'var(--danger)',  icon: 'x' },
    info:    { bg: 'var(--accent-bg)',  bd: 'var(--accent-border)',  fg: 'var(--accent-hi)', icon: 'info' },
  }[type];
  return (
    <div style={{
      pointerEvents: 'auto',
      minWidth: 280, maxWidth: 380,
      background: 'var(--bg-card)', border: `1px solid ${tones.bd}`,
      borderLeft: `3px solid ${tones.fg}`,
      borderRadius: 'var(--r-md)', padding: '0.75rem 0.875rem',
      display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
      boxShadow: '0 12px 32px rgba(0,0,0,0.32)',
      animation: 'pe-toast-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7, background: tones.bg,
        display: 'grid', placeItems: 'center', color: tones.fg, flexShrink: 0,
      }}>
        <Icon name={tones.icon} size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>{title}</div>
        {message && <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2, lineHeight: 1.4 }}>{message}</div>}
        {points != null && (
          <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--accent-hi)', fontFamily: 'var(--f-mono)' }}>
            <Icon name="sparkle" size={11} /> +{points} puncte identitate
          </div>
        )}
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--fg-3)', cursor: 'pointer', padding: 2, marginTop: -2 }} aria-label="Închide">
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setList(prev => [...prev, { id, ...t }]);
    setTimeout(() => setList(prev => prev.filter(x => x.id !== id)), t.duration || 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{
        position: 'fixed', top: 'calc(var(--topbar-h, 56px) + 12px)', right: 16, zIndex: 2000,
        display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 'calc(100vw - 32px)',
        pointerEvents: 'none',
      }}>
        {list.map(t => <Toast key={t.id} {...t} onClose={() => setList(p => p.filter(x => x.id !== t.id))} />)}
      </div>
    </ToastCtx.Provider>
  );
}

// ───────── Field primitives ─────────
function FieldError({ msg }) {
  return (
    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--danger)' }}>
      <Icon name="info" size={11} /> {msg}
    </div>
  );
}

function PField({ label, required, hint, error, helper, children, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
        <label className="label" style={{ margin: 0 }}>
          {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
        </label>
        {hint && <span style={{ fontSize: 10.5, color: 'var(--fg-4)', fontFamily: 'var(--f-mono)', letterSpacing: '0.04em' }}>{hint}</span>}
      </div>
      {children}
      {error
        ? <FieldError msg={error} />
        : helper && <div style={{ marginTop: 5, fontSize: 11.5, color: 'var(--fg-3)' }}>{helper}</div>}
    </div>
  );
}

function Switch({ checked, onChange, tone = 'accent' }) {
  const onColor = tone === 'amber' ? 'var(--warning)' : 'var(--accent)';
  return (
    <button
      type="button" role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 34, height: 20, borderRadius: 999, border: '1px solid var(--border-2)',
        background: checked ? onColor : 'var(--bg-2)',
        position: 'relative', cursor: 'pointer', transition: 'background 0.18s',
        padding: 0, flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 1, left: checked ? 15 : 1,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.18s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

// ───────── Section card ─────────
function SectionCard({ id, eyebrow, title, description, actions, children }) {
  return (
    <section id={id} className="card fade-up" style={{ scrollMarginTop: 80 }}>
      <header style={{
        padding: '1rem 1.25rem',
        display: 'flex', alignItems: 'center', gap: '1rem',
        borderBottom: '1px solid var(--border-1)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {eyebrow && <div className="h-eyebrow" style={{ margin: 0, marginBottom: 4 }}>{eyebrow}</div>}
          <div style={{ fontFamily: 'var(--f-display)', fontSize: 19, color: 'var(--fg-0)', letterSpacing: '-0.015em', lineHeight: 1.2 }}>
            {title}
          </div>
          {description && <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 3 }}>{description}</div>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
      </header>
      <div style={{ padding: '1.25rem' }}>{children}</div>
    </section>
  );
}

// ───────── Avatar uploader ─────────
function AvatarUploader({ user, onUpload, onRemove }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handle = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  };

  const initials = (user.name || '?').split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
        style={{
          width: 96, height: 96, borderRadius: '50%', position: 'relative', flexShrink: 0,
          cursor: 'pointer', overflow: 'hidden',
          border: `2px solid ${drag ? 'var(--accent)' : 'var(--accent-border)'}`,
          background: 'var(--bg-2)', boxShadow: drag ? '0 0 0 6px var(--accent-bg)' : 'none',
          transition: 'all 0.18s',
        }}
      >
        {user.profile_image_url
          ? <img src={user.profile_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 28, fontFamily: 'var(--f-display)', background: 'linear-gradient(135deg, var(--accent), var(--accent-hi))' }}>
              {initials}
            </div>}
        {(drag || uploading) && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(59,130,246,0.65)',
            display: 'grid', placeItems: 'center', color: '#fff',
          }}>
            {uploading ? <Spinner size={20} /> : <Icon name="upload" size={20} />}
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--accent)', border: '2px solid var(--bg-card)',
          display: 'grid', placeItems: 'center', color: '#fff',
        }}>
          <Icon name="camera" size={13} />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)', marginBottom: 4 }}>
          Fotografie de profil
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--fg-2)', marginBottom: '0.625rem', lineHeight: 1.5 }}>
          Trage o imagine pe avatar sau dă click. JPG, PNG, WEBP — max 10MB. Recomandăm 400×400px.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => ref.current?.click()} disabled={uploading}>
            <Icon name="upload" size={12} /> {uploading ? 'Se încarcă…' : 'Încarcă'}
          </button>
          {user.profile_image_url && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRemove}>
              <Icon name="trash" size={12} /> Elimină
            </button>
          )}
        </div>
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handle(e.target.files[0])} />
      </div>
    </div>
  );
}

// ───────── Identity strip ─────────
function IdentityStrip({ checks, earned, total, completed, totalCount }) {
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-1)',
      borderRadius: 'var(--r-lg)', padding: '1rem 1.25rem',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(600px 200px at 90% 0%, var(--accent-bg) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 auto' }}>
          <div className="h-eyebrow" style={{ margin: 0, marginBottom: 4 }}>
            <Icon name="shield-check" size={11} /> Puncte identitate
          </div>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: 36, color: 'var(--fg-0)', letterSpacing: '-0.025em', lineHeight: 1 }}>
            {earned}<span style={{ color: 'var(--fg-3)', fontSize: 18 }}> / {total}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 4, fontFamily: 'var(--f-mono)', letterSpacing: '0.04em' }}>
            {completed} din {totalCount} secțiuni · {pct}%
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{
            height: 6, background: 'var(--bg-2)', borderRadius: 999,
            overflow: 'hidden', marginBottom: 12,
          }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--accent-hi))',
              transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6 }}>
            {Object.entries(IDENTITY_POINTS).map(([k, c]) => {
              const done = checks[k];
              return (
                <div key={k} title={c.description} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '0.4rem 0.5rem', borderRadius: 'var(--r-sm)',
                  background: done ? 'var(--success-bg)' : 'var(--bg-1)',
                  border: `1px solid ${done ? 'var(--success-border)' : 'var(--border-1)'}`,
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 5,
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                    background: done ? 'var(--success)' : 'transparent',
                    border: done ? 'none' : '1px solid var(--border-2)',
                    color: done ? '#fff' : 'var(--fg-3)',
                  }}>
                    {done ? <Icon name="check" size={11} /> : <Icon name={c.icon} size={10} />}
                  </div>
                  <div style={{ fontSize: 11.5, color: done ? 'var(--fg-1)' : 'var(--fg-2)', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.label}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: done ? 'var(--success)' : 'var(--fg-3)', fontFamily: 'var(--f-mono)', flexShrink: 0 }}>
                    +{c.points}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── Portfolio grid w/ drag-to-reorder ─────────
function PortfolioGrid({ items, onEdit, onDelete, onReorder, onAdd }) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  if (items.length === 0) {
    return (
      <div style={{
        padding: '2.5rem 1rem', textAlign: 'center',
        border: '1.5px dashed var(--border-2)', borderRadius: 'var(--r-md)',
        background: 'var(--bg-1)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, background: 'var(--accent-bg)',
          display: 'grid', placeItems: 'center', margin: '0 auto 0.875rem',
          color: 'var(--accent-hi)',
        }}>
          <Icon name="image" size={26} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)', marginBottom: 4 }}>
          Portofoliul tău e gol
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--fg-3)', maxWidth: 320, margin: '0 auto 1rem', lineHeight: 1.5 }}>
          Adaugă primii 3 itemi ca să primești <strong style={{ color: 'var(--accent-hi)' }}>+15 puncte</strong> de identitate și să apari pe Marketplace.
        </div>
        <button className="btn btn-primary" onClick={onAdd}>
          <Icon name="plus" size={14} /> Adaugă primul item
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.875rem' }}>
        {items.map((it) => (
          <article
            key={it.id}
            draggable
            onDragStart={() => setDragId(it.id)}
            onDragEnd={() => { setDragId(null); setOverId(null); }}
            onDragOver={(e) => { e.preventDefault(); setOverId(it.id); }}
            onDrop={() => {
              if (dragId && dragId !== it.id) onReorder(dragId, it.id);
              setDragId(null); setOverId(null);
            }}
            className="pe-portfolio-card"
            style={{
              background: 'var(--bg-1)',
              border: `1px solid ${it.is_featured ? 'var(--warning-border)' : 'var(--border-1)'}`,
              borderRadius: 'var(--r-md)', overflow: 'hidden', cursor: 'grab',
              opacity: dragId === it.id ? 0.4 : 1,
              transform: overId === it.id && dragId !== it.id ? 'scale(1.02)' : 'none',
              boxShadow: overId === it.id && dragId !== it.id ? '0 0 0 2px var(--accent)' : 'none',
              transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.15s',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ position: 'relative', aspectRatio: '16/10', background: 'var(--bg-2)', overflow: 'hidden' }}>
              {it.file_type === 'video' || it.media_type === 'video' ? (
                <>
                  <video src={it.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.25)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', color: '#fff' }}>
                      <Icon name="play" size={16} />
                    </div>
                  </div>
                </>
              ) : it.file_url ? (
                <img src={it.file_url} alt={it.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--fg-4)' }}>
                  <Icon name="image" size={28} />
                </div>
              )}

              <div className="pe-drag-handle" style={{
                position: 'absolute', top: 8, left: 8,
                width: 26, height: 26, borderRadius: 6,
                background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
                display: 'grid', placeItems: 'center', color: '#fff',
                opacity: 0, transition: 'opacity 0.15s',
              }}>
                <Icon name="drag" size={14} />
              </div>

              {it.is_featured && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'var(--warning)', color: '#1a1200',
                  fontSize: 10, fontWeight: 700, padding: '2px 8px',
                  borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontFamily: 'var(--f-mono)', letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  <Icon name="star" size={9} /> Featured
                </div>
              )}

              {it.category && (
                <div style={{
                  position: 'absolute', bottom: 8, left: 8,
                  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                  color: '#fff', fontSize: 10.5, padding: '3px 8px',
                  borderRadius: 999, fontFamily: 'var(--f-mono)', letterSpacing: '0.02em',
                }}>
                  {it.category}
                </div>
              )}
            </div>

            <div style={{ padding: '0.75rem 0.875rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg-0)', marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                {it.title}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-3)', display: 'flex', gap: 6, alignItems: 'center' }}>
                {it.client_name || <span style={{ fontStyle: 'italic' }}>Client nespecificat</span>}
                {it.project_year && <><span style={{ opacity: 0.4 }}>·</span><span style={{ fontFamily: 'var(--f-mono)' }}>{it.project_year}</span></>}
              </div>

              <div style={{
                display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 10,
                borderTop: '1px solid var(--border-1)', marginLeft: -2, marginRight: -2,
              }}>
                <button onClick={() => onEdit(it)} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  <Icon name="edit" size={11} /> Editează
                </button>
                <button onClick={() => onDelete(it)} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} aria-label="Șterge">
                  <Icon name="trash" size={12} />
                </button>
              </div>
            </div>
          </article>
        ))}

        <button onClick={onAdd} className="pe-add-tile" style={{
          background: 'transparent', border: '1.5px dashed var(--border-2)',
          borderRadius: 'var(--r-md)', minHeight: 220,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'pointer', color: 'var(--fg-3)', transition: 'all 0.15s',
        }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg-2)', display: 'grid', placeItems: 'center' }}>
            <Icon name="plus" size={18} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Adaugă item</div>
        </button>
      </div>
    </div>
  );
}

// ───────── Portfolio modal ─────────
function PortfolioModal({ open, mode = 'create', item = null, onClose, onSubmit }) {
  const inputRef = useRef(null);
  const titleRef = useRef(null);
  const currentYear = new Date().getFullYear();

  const empty = useMemo(() => ({
    file: null, file_url: '', file_type: 'image',
    title: '', description: '',
    client_name: '', project_year: String(currentYear),
    category: '', results: '',
    technologies: [], tech_draft: '',
    is_featured: false,
  }), [currentYear]);

  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && item) {
      setForm({
        file: null,
        file_url: item.file_url || '',
        file_type: item.file_type || item.media_type || 'image',
        title: item.title || '',
        description: item.description || '',
        client_name: item.client_name || '',
        project_year: item.project_year ? String(item.project_year) : String(currentYear),
        category: item.category || '',
        results: item.results || '',
        technologies: typeof item.technologies === 'string'
          ? item.technologies.split(',').map(s => s.trim()).filter(Boolean)
          : (item.technologies || []),
        tech_draft: '',
        is_featured: !!item.is_featured,
      });
    } else {
      setForm(empty);
    }
    setErrors({});
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [open, mode, item, empty, currentYear]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const handleFile = (file) => {
    if (!file) return;
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > 25) { setErrors(e => ({ ...e, file: 'Fișier prea mare (max 25MB)' })); return; }
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) { setErrors(e => ({ ...e, file: 'Doar imagini sau video' })); return; }
    const url = URL.createObjectURL(file);
    setForm(f => ({
      ...f,
      file, file_url: url, file_type: isVideo ? 'video' : 'image',
      title: f.title || file.name.replace(/\.[^/.]+$/, ''),
    }));
    setErrors(e => ({ ...e, file: undefined }));
  };

  const validate = () => {
    const e = {};
    if (mode === 'create' && !form.file) e.file = 'Adaugă un fișier';
    if (!form.title.trim()) e.title = 'Titlul e obligatoriu';
    else if (form.title.length > 80) e.title = 'Maxim 80 caractere';
    if (!form.category) e.category = 'Alege o categorie';
    if (form.project_year) {
      const y = parseInt(form.project_year, 10);
      if (!y || y < 1990 || y > currentYear) e.project_year = `Între 1990 și ${currentYear}`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addTech = () => {
    const t = form.tech_draft.trim().replace(/,$/, '');
    if (!t) return;
    if (form.technologies.includes(t)) { set({ tech_draft: '' }); return; }
    if (form.technologies.length >= 12) return;
    set({ technologies: [...form.technologies, t], tech_draft: '' });
  };
  const removeTech = (t) => set({ technologies: form.technologies.filter(x => x !== t) });

  const submit = async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        technologies: form.technologies.join(', '),
        project_year: form.project_year || null,
      }, mode);
      onClose();
    } catch {
      setErrors({ form: 'Eroare la salvare. Încearcă din nou.' });
    } finally {
      setSubmitting(false);
    }
  };

  const titleLabel = mode === 'edit' ? 'Editează item portofoliu' : 'Adaugă în portofoliu';

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(3, 7, 18, 0.72)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
        animation: 'pe-fade-up 0.18s ease-out both',
      }}
    >
      <div className="pe-modal-lg" style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-2)',
        borderRadius: 'var(--r-lg)', overflow: 'hidden',
        maxWidth: 760, width: '100%',
        maxHeight: 'calc(100vh - 2rem)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px var(--border-1)',
        animation: 'pe-modal-pop 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div className="h-eyebrow" style={{ margin: 0 }}>
              <Icon name="folder" size={11} /> Portofoliu
            </div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, color: 'var(--fg-0)', letterSpacing: '-0.015em', marginTop: 2 }}>
              {titleLabel}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Închide">
            <Icon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <div className="pe-modal-grid" style={{ padding: '1.25rem', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'minmax(0, 280px) minmax(0, 1fr)', gap: '1.25rem' }}>
            <div>
              <label className="label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Fișier <span style={{ color: 'var(--danger)' }}>*</span></span>
                {form.file_url && <button type="button" onClick={() => set({ file: null, file_url: '' })} style={{ background: 'none', border: 'none', color: 'var(--fg-3)', fontSize: 11, cursor: 'pointer' }}>Elimină</button>}
              </label>
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                style={{
                  border: `1.5px dashed ${errors.file ? 'var(--danger-border)' : dragOver ? 'var(--accent)' : 'var(--border-2)'}`,
                  borderRadius: 'var(--r-md)',
                  background: dragOver ? 'var(--accent-bg)' : 'var(--bg-1)',
                  aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', position: 'relative',
                  transition: 'all 0.15s',
                }}
              >
                {form.file_url ? (
                  form.file_type === 'video' ? (
                    <video src={form.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                  ) : (
                    <img src={form.file_url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <Icon name="upload" size={22} style={{ color: 'var(--fg-3)', marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 4 }}>
                      Trage fișierul aici
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                      sau <span style={{ color: 'var(--accent-hi)' }}>caută pe computer</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: '0.625rem', fontFamily: 'var(--f-mono)', letterSpacing: '0.04em' }}>
                      JPG · PNG · GIF · MP4 · WEBM · max 25MB
                    </div>
                  </div>
                )}
                {form.file && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.8))',
                    padding: '1rem 0.625rem 0.5rem',
                    fontSize: 11, color: '#fff', fontFamily: 'var(--f-mono)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {form.file.name} · {(form.file.size / 1024 / 1024).toFixed(1)}MB
                  </div>
                )}
              </div>
              <input ref={inputRef} type="file" accept="image/*,video/*" onChange={(e) => handleFile(e.target.files[0])} style={{ display: 'none' }} />
              {errors.file && <FieldError msg={errors.file} />}

              <div style={{
                marginTop: '1rem', padding: '0.75rem',
                background: form.is_featured ? 'var(--warning-bg)' : 'var(--bg-1)',
                border: `1px solid ${form.is_featured ? 'var(--warning-border)' : 'var(--border-1)'}`,
                borderRadius: 'var(--r-md)',
                display: 'flex', alignItems: 'center', gap: '0.625rem',
              }}>
                <Icon name="star" size={16} style={{ color: form.is_featured ? 'var(--warning)' : 'var(--fg-3)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-0)' }}>Proiect featured</div>
                  <div style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>Afișat primul în profilul public</div>
                </div>
                <Switch checked={form.is_featured} onChange={v => set({ is_featured: v })} tone="amber" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', minWidth: 0 }}>
              <PField label="Titlu proiect" required error={errors.title} hint={`${form.title.length}/80`}>
                <input
                  ref={titleRef}
                  className="input" type="text" value={form.title}
                  onChange={e => set({ title: e.target.value })}
                  placeholder="ex: Redesign platformă bancară"
                  maxLength={80}
                />
              </PField>

              <PField label="Descriere" hint={`${form.description.length} / 400`}>
                <textarea
                  className="input" value={form.description}
                  onChange={e => set({ description: e.target.value.slice(0, 400) })}
                  placeholder="Scopul proiectului, provocările, soluția ta…"
                  style={{ minHeight: 80 }}
                />
              </PField>

              <div className="pe-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <PField label="Client">
                  <input
                    className="input" type="text" value={form.client_name}
                    onChange={e => set({ client_name: e.target.value })}
                    placeholder="Nume client / proiect intern"
                  />
                </PField>
                <PField label="Anul proiectului" error={errors.project_year}>
                  <input
                    className="input" type="number" min={1990} max={currentYear} value={form.project_year}
                    onChange={e => set({ project_year: e.target.value })}
                    placeholder={String(currentYear)}
                  />
                </PField>
              </div>

              <PField label="Categorie" required error={errors.category}>
                <div style={{ position: 'relative' }}>
                  <select
                    className="input" value={form.category}
                    onChange={e => set({ category: e.target.value })}
                    style={{ appearance: 'none', paddingRight: '2rem' }}
                  >
                    <option value="">Alege categoria…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Icon name="chevron-down" size={14} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', pointerEvents: 'none' }} />
                </div>
              </PField>

              <PField label="Tehnologii folosite" hint="Apasă Enter sau virgulă">
                <div style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-2)',
                  borderRadius: 'var(--r-sm)', padding: '0.375rem',
                  display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 38,
                }}>
                  {form.technologies.map(t => (
                    <span key={t} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'var(--accent-bg)', color: 'var(--accent-hi)',
                      border: '1px solid var(--accent-border)',
                      borderRadius: 'var(--r-sm)', padding: '2px 4px 2px 8px', fontSize: 12,
                      fontFamily: 'var(--f-mono)', letterSpacing: '-0.01em',
                    }}>
                      {t}
                      <button type="button" onClick={() => removeTech(t)} style={{
                        background: 'none', border: 'none', color: 'inherit', cursor: 'pointer',
                        padding: 2, display: 'inline-flex', borderRadius: 3,
                      }}><Icon name="x" size={11} /></button>
                    </span>
                  ))}
                  <input
                    type="text" value={form.tech_draft}
                    onChange={e => {
                      const v = e.target.value;
                      if (v.endsWith(',')) { set({ tech_draft: v.slice(0, -1) }); addTech(); }
                      else set({ tech_draft: v });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addTech(); }
                      if (e.key === 'Backspace' && !form.tech_draft && form.technologies.length) {
                        removeTech(form.technologies[form.technologies.length - 1]);
                      }
                    }}
                    onBlur={addTech}
                    placeholder={form.technologies.length ? '' : 'React, Node.js, PostgreSQL…'}
                    style={{
                      flex: 1, minWidth: 100, border: 'none', outline: 'none',
                      background: 'transparent', padding: '4px 6px', fontSize: 13, color: 'var(--fg-0)',
                    }}
                  />
                </div>
              </PField>

              <PField label="Rezultate / KPI" hint="Cifrele care contează">
                <input
                  className="input" type="text" value={form.results}
                  onChange={e => set({ results: e.target.value })}
                  placeholder="ex: +200% conversii, timp încărcare ↓ 2s"
                />
              </PField>
            </div>
          </div>

          <div style={{
            padding: '0.875rem 1.25rem', borderTop: '1px solid var(--border-1)',
            background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', flex: 1 }}>
              <span style={{ color: 'var(--danger)' }}>*</span> Câmpuri obligatorii
              {errors.form && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>· {errors.form}</span>}
            </div>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Anulează</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting && <Spinner size={13} />}
              {mode === 'edit' ? 'Salvează modificările' : 'Adaugă în portofoliu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ───────── Sticky save bar (rendered via Portal so it escapes the page's
// `transform: translateY` from .fade-up; otherwise `position: fixed` would
// anchor to that ancestor instead of the viewport and scroll with content)
function StickySaveBar({ dirty, saving, onSave, onReset }) {
  if (!dirty && !saving) return null;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="pe-save-bar" style={{
      position: 'fixed', bottom: 24, left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
      background: 'var(--bg-card)',
      border: '1px solid var(--border-2)',
      borderRadius: 'var(--r-lg)',
      boxShadow: '0 20px 48px rgba(0,0,0,0.4), 0 0 0 1px var(--border-1)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      maxWidth: 'calc(100vw - 32px)',
      animation: 'pe-savebar-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
    }}>
      <div style={{
        padding: '0.75rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.875rem',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)',
          boxShadow: '0 0 0 0 var(--warning)', animation: 'pe-pulse 2s infinite',
          flexShrink: 0,
        }} />
        <div style={{ minWidth: 0 }} className="pe-save-bar-text">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', whiteSpace: 'nowrap' }}>Modificări nesalvate</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onReset} disabled={saving} style={{ flexShrink: 0 }}>
          Renunță
        </button>
        <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving} style={{ flexShrink: 0 }}>
          {saving ? <><Spinner size={13} /> Se salvează…</> : <><Icon name="check" size={13} /> Salvează</>}
        </button>
      </div>
      <style>{`
        @keyframes pe-savebar-in {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ───────── Confirm dialog ─────────
function ConfirmDialog({ title, message, confirmText, tone = 'accent', onConfirm, onCancel }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onCancel(); if (e.key === 'Enter') onConfirm(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel, onConfirm]);
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }} style={{
      position: 'fixed', inset: 0, background: 'rgba(3, 7, 18, 0.72)',
      backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', zIndex: 1100, padding: '1rem',
      animation: 'pe-fade-up 0.18s ease-out both',
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-lg)',
        padding: '1.25rem', maxWidth: 400, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: '0.875rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: tone === 'danger' ? 'var(--danger-bg)' : 'var(--accent-bg)',
            color: tone === 'danger' ? 'var(--danger)' : 'var(--accent-hi)',
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name={tone === 'danger' ? 'trash' : 'info'} size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-0)', marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>{message}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onCancel}>Anulează</button>
          <button className="btn btn-primary" style={tone === 'danger' ? { background: 'var(--danger)', borderColor: 'var(--danger)' } : undefined} onClick={onConfirm}>
            {confirmText || 'Confirmă'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────── Main page ─────────
function ProfileEditInner() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const toast = useContext(ToastCtx);
  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [profile, setProfile] = useState({
    name: '', email: '', phone: '',
    company: '', cui: '',
    expertise: '', bio: '', industry: '', experience: '',
    profile_image_url: '',
  });
  const [original, setOriginal] = useState(profile);
  const [portfolio, setPortfolio] = useState([]);
  const [trustProfile, setTrustProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeSection, setActiveSection] = useState('identity');

  const role = authUser?.role;
  const isPrestator = role === 'expert' || role === 'company';
  const isBusiness = role === 'expert' || role === 'company';

  const fetchProfile = useCallback(async () => {
    try {
      const r = await axios.get('/api/users/profile', { headers });
      const u = r.data.user || {};
      const next = {
        name: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        company: u.company || '',
        cui: u.cui || '',
        expertise: u.expertise || '',
        bio: u.bio || '',
        industry: u.industry || '',
        experience: u.experience || '',
        profile_image_url: u.profile_image_url || '',
      };
      setProfile(next);
      setOriginal(next);
      setTrustProfile(r.data.trustProfile || null);
    } catch {
      toast({ type: 'error', title: 'Eroare', message: 'Nu am putut încărca profilul.' });
    } finally {
      setLoading(false);
    }
  }, [headers, toast]);

  const fetchPortfolio = useCallback(async () => {
    try {
      const r = await axios.get('/api/users/portfolio', { headers });
      setPortfolio(r.data.portfolio || []);
    } catch { /* silent */ }
  }, [headers]);

  useEffect(() => { fetchProfile(); fetchPortfolio(); }, [fetchProfile, fetchPortfolio]);

  const dirty = JSON.stringify(profile) !== JSON.stringify(original);

  const change = (e) => setProfile(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await axios.put('/api/users/profile', profile, { headers });
      const u = r.data.user || profile;
      const next = { ...profile, ...u };
      setProfile(next);
      setOriginal(next);
      const pointsAwarded = r.data.pointsAwarded || [];
      const total = pointsAwarded.reduce((s, p) => s + (p.points || 0), 0);
      if (total > 0) {
        toast({
          type: 'success', title: 'Profil salvat',
          message: pointsAwarded.map(p => p.description).join(', '),
          points: total,
        });
      } else {
        toast({ type: 'success', title: 'Profil salvat', message: 'Modificările sunt vizibile pe profilul public.' });
      }
      fetchProfile();
    } catch (err) {
      toast({ type: 'error', title: 'Eroare la salvare', message: err.response?.data?.error || 'Reîncearcă.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file) => {
    const formData = new FormData();
    formData.append('profile_image', file);
    try {
      await axios.post('/api/users/profile-image', formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      toast({ type: 'success', title: 'Avatar actualizat' });
      fetchProfile();
    } catch {
      toast({ type: 'error', title: 'Eroare', message: 'Nu am putut încărca imaginea.' });
    }
  };

  const handleAvatarRemove = async () => {
    try {
      await axios.put('/api/users/profile', { ...profile, profile_image_url: '' }, { headers });
      toast({ type: 'info', title: 'Avatar eliminat' });
      fetchProfile();
    } catch {
      toast({ type: 'error', title: 'Eroare' });
    }
  };

  const handlePortfolioSubmit = async (data, mode) => {
    if (mode === 'edit') {
      const { file: _, file_url: __, file_type: ___, tech_draft: ____, ...payload } = data;
      void _; void __; void ___; void ____;
      await axios.put(`/api/users/portfolio/${modal.item.id}`, payload, { headers });
      toast({ type: 'success', title: 'Item actualizat' });
    } else {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('client_name', data.client_name || '');
      formData.append('project_year', data.project_year || '');
      formData.append('category', data.category || '');
      formData.append('results', data.results || '');
      formData.append('technologies', data.technologies || '');
      formData.append('is_featured', String(!!data.is_featured));
      await axios.post('/api/users/portfolio', formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      const wasUnder3 = portfolio.length < 3;
      const nowEnough = portfolio.length + 1 >= 3;
      if (wasUnder3 && nowEnough) {
        toast({ type: 'success', title: 'Portofoliu complet', message: 'Ai atins 3 itemi.', points: 15 });
      } else {
        toast({ type: 'success', title: 'Item adăugat în portofoliu' });
      }
    }
    fetchPortfolio();
  };

  const handleDeletePortfolio = async () => {
    try {
      await axios.delete(`/api/users/portfolio/${confirmDelete.id}`, { headers });
      toast({ type: 'info', title: 'Item șters' });
      setConfirmDelete(null);
      fetchPortfolio();
    } catch {
      toast({ type: 'error', title: 'Eroare la ștergere' });
    }
  };

  const handleReorder = async (fromId, toId) => {
    setPortfolio(p => {
      const arr = [...p];
      const fromIdx = arr.findIndex(x => x.id === fromId);
      const toIdx = arr.findIndex(x => x.id === toId);
      if (fromIdx < 0 || toIdx < 0) return p;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
    // Backend reorder endpoint may not exist; silent fail OK — order stays in-session.
    try {
      const orderedIds = (() => {
        const arr = [...portfolio];
        const fromIdx = arr.findIndex(x => x.id === fromId);
        const toIdx = arr.findIndex(x => x.id === toId);
        if (fromIdx < 0 || toIdx < 0) return arr.map(x => x.id);
        const [moved] = arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, moved);
        return arr.map(x => x.id);
      })();
      await axios.put('/api/users/portfolio/reorder', { order: orderedIds }, { headers }).catch(() => {});
    } catch { /* silent */ }
  };

  // Identity completion
  const checks = {
    profile_photo: !!profile.profile_image_url,
    profile_completed: !!trustProfile?.profile_completed,
    email_validated: !!trustProfile?.email_validated,
    portfolio_approved: portfolio.length >= 3,
    kyc_verified: !!trustProfile?.kyc_verified,
    payment_method: !!trustProfile?.payment_method_added,
    verification_call: !!trustProfile?.has_verification_call,
  };
  const completedCount = Object.values(checks).filter(Boolean).length;
  const totalCount = Object.keys(checks).length;
  const totalPoints = Object.values(IDENTITY_POINTS).reduce((s, v) => s + v.points, 0);
  const earnedPoints = Object.entries(checks).reduce((s, [k, v]) => v ? s + IDENTITY_POINTS[k].points : s, 0);

  // Section nav
  const sections = [
    { id: 'identity', label: 'Identitate', icon: 'user' },
    isBusiness && { id: 'business', label: 'Business', icon: 'building' },
    { id: 'professional', label: 'Profil profesional', icon: 'briefcase' },
    isPrestator && { id: 'portfolio', label: 'Portofoliu', icon: 'image' },
  ].filter(Boolean);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (vis[0]) setActiveSection(vis[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] }
    );
    sections.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, loading]);

  if (loading) {
    return (
      <div className="escro-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="escro-page fade-up" style={{ maxWidth: 1180, paddingBottom: 120 }}>
      <div className="page-head" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div className="page-eyebrow">Cont</div>
          <h1 className="page-title">Profilul meu</h1>
          <p className="page-subtitle">Editează informațiile publice, fotografia și portofoliul. Modificările sunt vizibile imediat pe profilul tău public.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => navigate(`/profile/${authUser?.id}`)}>
            <Icon name="eye" size={13} /> Previzualizare profil public
            <Icon name="arrow-up-right" size={11} />
          </button>
        </div>
      </div>

      <IdentityStrip checks={checks} earned={earnedPoints} total={totalPoints} completed={completedCount} totalCount={totalCount} />

      <div className="pe-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <nav className="pe-nav">
          <div style={{
            position: 'sticky', top: 'calc(var(--topbar-h, 56px) + 16px)',
            display: 'flex', flexDirection: 'column', gap: 2,
            padding: '0.5rem', borderRadius: 'var(--r-md)',
            background: 'var(--bg-card)', border: '1px solid var(--border-1)',
          }}>
            <div className="h-eyebrow" style={{ margin: '6px 8px 10px', fontSize: 10 }}>Secțiuni</div>
            {sections.map(s => (
              <a
                key={s.id} href={`#${s.id}`}
                onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveSection(s.id); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0.5rem 0.625rem', borderRadius: 'var(--r-sm)',
                  fontSize: 13, fontWeight: 500,
                  color: activeSection === s.id ? 'var(--accent-hi)' : 'var(--fg-2)',
                  background: activeSection === s.id ? 'var(--accent-bg)' : 'transparent',
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
              >
                <Icon name={s.icon} size={14} />
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          {/* 1. Identitate */}
          <SectionCard
            id="identity"
            eyebrow={<><Icon name="user" size={11} /> Card 01</>}
            title="Identitate"
            description="Datele tale de contact și fotografia de profil."
          >
            <AvatarUploader user={profile} onUpload={handleAvatarUpload} onRemove={handleAvatarRemove} />
            <div style={{ height: 1, background: 'var(--border-1)', margin: '1.25rem 0' }} />
            <div className="pe-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <PField label="Nume complet" required>
                <input className="input" name="name" value={profile.name} onChange={change} placeholder="Nume Prenume" />
              </PField>
              <PField
                label="Email" required
                helper={trustProfile?.email_validated && <span style={{ color: 'var(--success)' }}>✓ Validat</span>}
              >
                <input className="input" name="email" type="email" value={profile.email} onChange={change} />
              </PField>
              <PField label="Telefon" required helper="Format internațional: +40…">
                <input className="input" name="phone" type="tel" value={profile.phone} onChange={change} placeholder="+40 7XX XXX XXX" />
              </PField>
            </div>
          </SectionCard>

          {/* 2. Business */}
          {isBusiness && (
            <SectionCard
              id="business"
              eyebrow={<><Icon name="building" size={11} /> Card 02</>}
              title="Business"
              description={role === 'company' ? 'Date despre compania ta — apar pe contracte și facturi.' : 'Date despre PFA / SRL sub care facturezi.'}
            >
              <div className="pe-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <PField label={role === 'company' ? 'Denumire companie' : 'Denumire PFA / SRL'} required>
                  <input className="input" name="company" value={profile.company} onChange={change} placeholder="ex: Pixel Studio SRL" />
                </PField>
                <PField label="CUI / CIF" required helper="Folosit pentru facturare automată">
                  <input className="input" name="cui" value={profile.cui} onChange={change} placeholder="RO12345678" />
                </PField>
                <PField label="Industrie principală" required full>
                  <div style={{ position: 'relative' }}>
                    <select className="input" name="industry" value={profile.industry} onChange={change} style={{ appearance: 'none', paddingRight: '2rem' }}>
                      <option value="">Alege industria…</option>
                      {INDUSTRY_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <Icon name="chevron-down" size={14} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', pointerEvents: 'none' }} />
                  </div>
                </PField>
              </div>
            </SectionCard>
          )}

          {/* 3. Profil profesional */}
          <SectionCard
            id="professional"
            eyebrow={<><Icon name="briefcase" size={11} /> Card {isBusiness ? '03' : '02'}</>}
            title="Profil profesional"
            description="Cum te prezinți potențialilor clienți și parteneri."
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <PField label="Expertiză" required helper='Listează competențele-cheie separate prin "·" sau virgulă'>
                <input className="input" name="expertise" value={profile.expertise} onChange={change} placeholder="ex: Design produs · Sisteme de design · Prototipare" />
              </PField>
              <PField label="Ani experiență" required>
                <input className="input" name="experience" value={profile.experience} onChange={change} placeholder="ex: 8 ani" style={{ maxWidth: 200 }} />
              </PField>
              <PField
                label="Biografie" required
                hint={`${(profile.bio || '').length} / 600`}
                helper="Spune cu cine ai lucrat, ce probleme rezolvi, în ce limbi vorbești"
              >
                <textarea
                  className="input" name="bio" value={profile.bio}
                  onChange={e => setProfile(p => ({ ...p, bio: e.target.value.slice(0, 600) }))}
                  style={{ minHeight: 120 }}
                  placeholder="Scrie 3-5 propoziții care explică ce faci și pentru cine."
                />
              </PField>
            </div>
          </SectionCard>

          {/* 4. Portofoliu */}
          {isPrestator && (
            <SectionCard
              id="portfolio"
              eyebrow={<><Icon name="image" size={11} /> Card {isBusiness ? '04' : '03'}</>}
              title={<>Portofoliu <span style={{ color: 'var(--fg-3)', fontFamily: 'var(--f-mono)', fontSize: 14 }}>{portfolio.length}</span></>}
              description="Cele mai bune proiecte ale tale. Trage cardurile pentru a le reordona."
              actions={
                <button className="btn btn-primary btn-sm" onClick={() => setModal({ open: true, mode: 'create', item: null })}>
                  <Icon name="plus" size={12} /> Adaugă item
                </button>
              }
            >
              {portfolio.length > 0 && portfolio.length < 3 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
                  borderRadius: 'var(--r-md)', padding: '0.625rem 0.875rem',
                  marginBottom: '0.875rem',
                }}>
                  <Icon name="sparkle" size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                  <div style={{ fontSize: 12.5, color: 'var(--fg-1)', flex: 1 }}>
                    Mai adaugă <strong>{3 - portfolio.length}</strong> {3 - portfolio.length === 1 ? 'item' : 'itemi'} ca să primești <strong style={{ color: 'var(--warning)' }}>+15 puncte</strong> și să fii listat în Marketplace.
                  </div>
                </div>
              )}
              <PortfolioGrid
                items={portfolio}
                onEdit={(item) => setModal({ open: true, mode: 'edit', item })}
                onDelete={setConfirmDelete}
                onReorder={handleReorder}
                onAdd={() => setModal({ open: true, mode: 'create', item: null })}
              />
            </SectionCard>
          )}
        </div>
      </div>

      <StickySaveBar dirty={dirty} saving={saving} onSave={handleSave} onReset={() => setProfile(original)} />

      <PortfolioModal
        open={modal.open}
        mode={modal.mode}
        item={modal.item}
        onClose={() => setModal({ open: false, mode: 'create', item: null })}
        onSubmit={handlePortfolioSubmit}
      />

      {confirmDelete && (
        <ConfirmDialog
          title="Șterge item din portofoliu?"
          message={`„${confirmDelete.title}" va fi eliminat permanent.`}
          confirmText="Șterge definitiv"
          tone="danger"
          onConfirm={handleDeletePortfolio}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <style>{`
        @keyframes pe-toast-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: none; } }
        @keyframes pe-modal-pop { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes pe-fade-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes pe-pulse {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.6); }
          70% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        .pe-portfolio-card:hover .pe-drag-handle { opacity: 0.9; }
        .pe-add-tile:hover { border-color: var(--accent) !important; color: var(--accent-hi) !important; background: var(--accent-bg) !important; }
        @media (max-width: 900px) {
          .pe-layout { grid-template-columns: 1fr !important; }
          .pe-nav { display: none !important; }
        }
        @media (max-width: 720px) {
          .pe-modal-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .pe-row-2 { grid-template-columns: 1fr !important; }
          .pe-save-bar-text { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function ProfileEdit() {
  return (
    <ToastProvider>
      <ProfileEditInner />
    </ToastProvider>
  );
}

import { useState, useEffect, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/ui';
import axios from 'axios';
import '../styles/CreateProject.css';

const SERVICE_TYPES = [
  { value: 'matching',           label: 'Matching',           icon: 'sparkle',
    description: 'Platforma alege experții potriviți și îi conectează cu tine.',
    tag: 'Recomandare automată' },
  { value: 'direct',             label: 'Direct',             icon: 'user',
    description: 'Contract direct cu un expert pe care îl cunoști deja.',
    tag: 'Cel mai rapid' },
  { value: 'project_management', label: 'Project Management', icon: 'briefcase',
    description: 'Proiect mare, sub-tasks supervizate de un admin Escro.',
    tag: 'Recomandat 50k+' },
];

const ALL_STEPS = [
  { id: 1, label: 'Brief' },
  { id: 2, label: 'Buget & timp' },
  { id: 3, label: 'Etape' },
  { id: 4, label: 'Revizuire' },
];

const BUDGET_PRESETS  = [5000, 10000, 25000, 50000];
const TIMELINE_PRESETS = [14, 30, 60, 90];

const DRAFT_KEY = 'escro:create-project:draft';
const FRESH_FORM = {
  title: '',
  description: '',
  budget_ron: '',
  timeline_days: '',
  service_type: '',
  direct_partner_email: '',
  milestones: [
    { id: 1, title: '', deliverable_description: '', percentage_of_budget: 40 },
    { id: 2, title: '', deliverable_description: '', percentage_of_budget: 60 },
  ],
};

const fmtRON = (n) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));

function validateStep(step, form, isPM) {
  const errors = {};
  if (step === 1) {
    if (!form.service_type) errors.service_type = 'Alege un tip de serviciu pentru a continua.';
    if (!form.title.trim()) errors.title = 'Adaugă un titlu — minim 4 caractere.';
    else if (form.title.trim().length < 4) errors.title = 'Titlul e prea scurt — minim 4 caractere.';
    if (!form.description.trim()) errors.description = 'Adaugă o descriere — minim 20 caractere.';
    else if (form.description.trim().length < 20) errors.description = `Mai trebuie ${20 - form.description.trim().length} caractere.`;
  }
  if (step === 2) {
    const b = parseInt(form.budget_ron, 10);
    if (!form.budget_ron || isNaN(b) || b < 1) errors.budget_ron = 'Introdu un buget — minim 1 RON.';
    else if (b > 10000000) errors.budget_ron = 'Bugetul e prea mare. Contactează-ne pentru proiecte peste 10M RON.';
    const t = parseInt(form.timeline_days, 10);
    if (!form.timeline_days || isNaN(t) || t < 1) errors.timeline_days = 'Termenul în zile e obligatoriu.';
    else if (t > 365) errors.timeline_days = 'Termenul maxim este 365 zile.';
    if (form.service_type === 'direct') {
      if (!form.direct_partner_email) errors.direct_partner_email = 'Emailul expertului e obligatoriu.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.direct_partner_email))
        errors.direct_partner_email = 'Email invalid.';
    }
  }
  if (step === 3 && !isPM) {
    const totalPct = form.milestones.reduce((s, m) => s + (Number(m.percentage_of_budget) || 0), 0);
    if (Math.round(totalPct) !== 100) errors._pct = `Procentele trebuie să totalizeze 100% (acum ${Math.round(totalPct)}%).`;
    form.milestones.forEach((m, i) => {
      if (!m.title.trim()) errors[`ms-title-${i}`] = 'Titlu obligatoriu';
      if (!m.deliverable_description.trim()) errors[`ms-deliv-${i}`] = 'Descriere livrabil obligatorie';
    });
  }
  return errors;
}

function StepIndicator({ steps, current, onJump }) {
  return (
    <div className="steps-v2" role="list">
      {steps.map((s, i) => {
        const isActive = s.id === current;
        const isDone   = current > s.id;
        const clickable = isDone;
        const cls = `step-v2 ${isActive ? 'active' : isDone ? 'done' : ''} ${clickable ? 'clickable' : ''}`;
        return (
          <Fragment key={s.id}>
            <div
              role="listitem"
              className={cls}
              onClick={() => clickable && onJump(s.id)}
              title={clickable ? `Înapoi la „${s.label}”` : s.label}
            >
              <div className="step-v2-circle">
                {isDone ? <Icon name="check" size={13} /> : i + 1}
              </div>
              <div className="step-v2-label">{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className={`step-v2-line ${isDone ? 'done' : isActive ? 'half' : ''}`}>
                <div className="fill" />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function Step1Brief({ form, set, errors, attempted }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="fld">
        <div className="fld-label">
          <span>Tip serviciu</span>
          <span className="opt">Alege unul</span>
        </div>
        <div className="svc-grid">
          {SERVICE_TYPES.map(st => {
            const on = form.service_type === st.value;
            return (
              <div
                key={st.value}
                className={`svc-card ${on ? 'on' : ''}`}
                onClick={() => set('service_type', st.value)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set('service_type', st.value); } }}
              >
                <div className="svc-check"><Icon name="check" size={12} /></div>
                <div className="svc-icon"><Icon name={st.icon} size={18} /></div>
                <div className="svc-name">{st.label}</div>
                <div className="svc-desc">{st.description}</div>
                <div className="svc-meta">
                  <span className="pulse" style={{ width: 6, height: 6 }} />
                  {st.tag}
                </div>
              </div>
            );
          })}
        </div>
        {attempted && errors.service_type && (
          <div className="fld-help err"><Icon name="x" size={12} />{errors.service_type}</div>
        )}
      </div>

      <div className="fld">
        <div className="fld-label">
          <span>Titlu proiect</span>
          <span className={`count ${form.title.length > 80 ? 'warn' : ''}`}>{form.title.length}/100</span>
        </div>
        <input
          className={`input ${attempted && errors.title ? 'has-err' : (form.title.length >= 4 ? 'has-ok' : '')}`}
          type="text"
          maxLength={100}
          placeholder="ex. Audit financiar Q4 2025"
          value={form.title}
          onChange={e => set('title', e.target.value)}
        />
        {attempted && errors.title
          ? <div className="fld-help err"><Icon name="x" size={12} />{errors.title}</div>
          : <div className="fld-help">Apare în marketplace și în propunerile către experți.</div>
        }
      </div>

      <div className="fld">
        <div className="fld-label">
          <span>Descriere</span>
          <span className="count">{form.description.length} caractere</span>
        </div>
        <textarea
          className={`input ${attempted && errors.description ? 'has-err' : (form.description.length >= 20 ? 'has-ok' : '')}`}
          rows={5}
          placeholder="Descrie obiectivele, contextul și cerințele principale. Cu cât e mai clară descrierea, cu atât experții fac propuneri mai bune."
          value={form.description}
          onChange={e => set('description', e.target.value)}
          style={{ resize: 'vertical', minHeight: 120 }}
        />
        {attempted && errors.description
          ? <div className="fld-help err"><Icon name="x" size={12} />{errors.description}</div>
          : <div className="fld-help">Minim 20 de caractere. Inclusiv format de livrare, deadline-uri intermediare, riscuri.</div>
        }
      </div>
    </div>
  );
}

function Step2Budget({ form, set, errors, attempted, isPM }) {
  const budget    = parseInt(form.budget_ron, 10) || 0;
  const commission = Math.round(budget * 0.05);
  const escrow     = budget + commission;
  const formatted  = budget.toLocaleString('ro-RO').replace(/,/g, ' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="fld">
        <div className="fld-label"><span>Buget total</span><span className="opt">RON, întreg</span></div>
        <div className="input-row">
          <input
            className={`input lg ${attempted && errors.budget_ron ? 'has-err' : (budget >= 1 ? 'has-ok' : '')}`}
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={form.budget_ron ? formatted : ''}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '');
              set('budget_ron', digits ? String(parseInt(digits, 10)) : '');
            }}
          />
          <span className="suffix">RON</span>
        </div>

        <div className="chip-row" style={{ marginTop: 4 }}>
          {BUDGET_PRESETS.map(v => (
            <button
              key={v}
              type="button"
              className={`chip-btn ${budget === v ? 'on' : ''}`}
              onClick={() => set('budget_ron', String(v))}
            >
              {fmtRON(v)} RON
            </button>
          ))}
        </div>

        {attempted && errors.budget_ron
          ? <div className="fld-help err"><Icon name="x" size={12} />{errors.budget_ron}</div>
          : <div className="fld-help"><Icon name="lock" size={12} /> Suma totală va fi blocată în escrow la demararea proiectului.</div>
        }

        {budget > 0 && !isPM && (
          <div className="live-preview">
            <span>Total escrow</span>
            <span className="b"><em>{fmtRON(escrow)}</em></span>
            <span className="c">RON</span>
            <span className="sep">·</span>
            <span className="c">buget {fmtRON(budget)} + comision 5% {fmtRON(commission)}</span>
          </div>
        )}
      </div>

      <div className="fld">
        <div className="fld-label"><span>Termen estimat</span><span className="opt">Zile calendaristice</span></div>
        <div className="input-row" style={{ maxWidth: 220 }}>
          <input
            className={`input ${attempted && errors.timeline_days ? 'has-err' : (form.timeline_days ? 'has-ok' : '')}`}
            type="number"
            min="1"
            max="365"
            placeholder="30"
            value={form.timeline_days}
            onChange={e => set('timeline_days', e.target.value.replace(/\D/g, ''))}
          />
          <span className="suffix">ZILE</span>
        </div>
        <div className="chip-row" style={{ marginTop: 4 }}>
          {TIMELINE_PRESETS.map(v => (
            <button key={v} type="button" className={`chip-btn ${parseInt(form.timeline_days, 10) === v ? 'on' : ''}`} onClick={() => set('timeline_days', String(v))}>
              {v === 14 ? '2 săpt' : v === 30 ? '1 lună' : v === 60 ? '2 luni' : '3 luni'}
            </button>
          ))}
        </div>
        {attempted && errors.timeline_days && (
          <div className="fld-help err"><Icon name="x" size={12} />{errors.timeline_days}</div>
        )}
      </div>

      {form.service_type === 'direct' && (
        <div className="fld">
          <div className="fld-label"><span>Email expert</span><span className="opt">Persoana ce primește invitația</span></div>
          <div className="input-row">
            <span className="prefix-icon"><Icon name="mail" size={14} /></span>
            <input
              className={`input with-icon ${attempted && errors.direct_partner_email ? 'has-err' : (form.direct_partner_email && !errors.direct_partner_email ? 'has-ok' : '')}`}
              type="email"
              placeholder="expert@exemplu.ro"
              value={form.direct_partner_email}
              onChange={e => set('direct_partner_email', e.target.value)}
            />
          </div>
          {attempted && errors.direct_partner_email && (
            <div className="fld-help err"><Icon name="x" size={12} />{errors.direct_partner_email}</div>
          )}
        </div>
      )}

      <div style={{
        padding: '.875rem 1rem',
        background: 'var(--bg-1)',
        border: '1px solid var(--border-1)',
        borderRadius: 'var(--r-md)',
        fontSize: 12.5, color: 'var(--fg-2)',
        display: 'flex', gap: '.75rem', alignItems: 'flex-start',
      }}>
        <Icon name="shield-check" size={15} style={{ color: 'var(--accent-hi)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <b style={{ color: 'var(--fg-0)', fontWeight: 600 }}>Cum funcționează escrow:</b>{' '}
          {isPM
            ? 'La PM, comisionul de 5% se aplică doar atunci când depui fonduri pentru fiecare milestone — nu și la creare.'
            : 'Banii sunt blocați la acceptarea proiectului și eliberați automat după aprobarea fiecărui milestone.'}
        </div>
      </div>
    </div>
  );
}

function Step3Milestones({ form, setForm, errors, attempted }) {
  const budget = parseInt(form.budget_ron, 10) || 0;
  const totalPct = form.milestones.reduce((s, m) => s + (Number(m.percentage_of_budget) || 0), 0);
  const rounded = Math.round(totalPct * 100) / 100;
  const tone = rounded === 100 ? 'ok' : rounded > 100 ? 'over' : 'under';
  const fillTone = rounded > 100 ? 'over' : rounded === 100 ? 'ok' : '';
  const fillPct  = Math.min(100, rounded);

  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const setMs = (i, key, val) =>
    setForm(p => ({ ...p, milestones: p.milestones.map((m, idx) => idx === i ? { ...m, [key]: val } : m) }));

  const addMs = () => setForm(p => ({
    ...p,
    milestones: [...p.milestones, { id: Date.now(), title: '', deliverable_description: '', percentage_of_budget: 0 }],
  }));

  const removeMs = (i) => setForm(p => ({
    ...p,
    milestones: p.milestones.length > 1 ? p.milestones.filter((_, idx) => idx !== i) : p.milestones,
  }));

  const reorder = (from, to) => setForm(p => {
    if (from === to) return p;
    const arr = [...p.milestones];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    return { ...p, milestones: arr };
  });

  const distributeEvenly = () => setForm(p => {
    const n = p.milestones.length;
    const base = Math.floor(100 / n);
    const rem = 100 - base * n;
    return { ...p, milestones: p.milestones.map((m, i) => ({ ...m, percentage_of_budget: base + (i < rem ? 1 : 0) })) };
  });

  const autobalance = () => setForm(p => {
    const arr = p.milestones.map(m => ({ ...m, percentage_of_budget: Number(m.percentage_of_budget) || 0 }));
    if (arr.length === 0) return p;
    const sumExceptLast = arr.slice(0, -1).reduce((s, m) => s + m.percentage_of_budget, 0);
    const delta = 100 - sumExceptLast;
    if (delta >= 0 && delta <= 100) {
      arr[arr.length - 1].percentage_of_budget = delta;
    } else {
      const n = arr.length;
      const base = Math.floor(100 / n);
      const rem = 100 - base * n;
      arr.forEach((m, i) => m.percentage_of_budget = base + (i < rem ? 1 : 0));
    }
    return { ...p, milestones: arr };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="pct-meter">
        <div className="row">
          <div>
            <div className="lbl">Alocare buget</div>
            <div className={`val ${tone}`}>
              <em>{rounded}%</em>
              <span style={{ fontSize: 13, color: 'var(--fg-3)', marginLeft: 6 }}>/ 100%</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl">Buget rămas</div>
            <div className={`delta ${tone === 'ok' ? 'ok' : tone === 'over' ? 'err' : 'warn'}`}>
              {fmtRON(budget * (100 - rounded) / 100)} RON
            </div>
          </div>
        </div>
        <div className="track">
          <div className={`fill ${fillTone}`} style={{ width: `${fillPct}%` }} />
          {rounded > 100 && <div className="marker" />}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
            Împarte bugetul de <b style={{ color: 'var(--fg-0)' }}>{fmtRON(budget)} RON</b> pe etape.
          </div>
          <div style={{ display: 'flex', gap: '.375rem' }}>
            <button type="button" className="chip-btn" onClick={distributeEvenly}>
              <Icon name="trend" size={11} style={{ marginRight: 4, verticalAlign: -2 }} />
              Egal
            </button>
            <button type="button" className="chip-btn" onClick={autobalance}>
              <Icon name="target" size={11} style={{ marginRight: 4, verticalAlign: -2 }} />
              Auto-100%
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {form.milestones.map((ms, i) => {
          const amt = budget ? Math.round((Number(ms.percentage_of_budget) || 0) / 100 * budget) : 0;
          const pct = Math.max(0, Math.min(100, Number(ms.percentage_of_budget) || 0));
          const tErr = attempted && errors[`ms-title-${i}`];
          const dErr = attempted && errors[`ms-deliv-${i}`];
          return (
            <div
              key={ms.id}
              className={`ms-card ${dragIdx === i ? 'dragging' : ''} ${overIdx === i && dragIdx !== null && dragIdx !== i ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
              onDragLeave={() => setOverIdx(o => (o === i ? null : o))}
              onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) reorder(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
            >
              <div className="ms-handle" title="Trage pentru a reordona">
                <Icon name="menu" size={14} />
                <span className="grip-num">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="ms-body">
                <div className="ms-top">
                  <input
                    className="ms-input"
                    placeholder={`Etapa ${i + 1} — ex. Cercetare & analiză inițială`}
                    value={ms.title}
                    onChange={e => setMs(i, 'title', e.target.value)}
                    style={tErr ? { borderBottomColor: 'var(--danger)' } : {}}
                  />
                  {form.milestones.length > 1 && (
                    <button type="button" className="ms-del" onClick={() => removeMs(i)} title="Șterge etapa">
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </div>

                <textarea
                  className="ms-deliv"
                  rows={2}
                  placeholder="Descrie livrabilele acestei etape — documente, build-uri, întâlniri…"
                  value={ms.deliverable_description}
                  onChange={e => setMs(i, 'deliverable_description', e.target.value)}
                  style={dErr ? { borderColor: 'var(--danger)' } : {}}
                />

                <div className="ms-pct-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    className="slider"
                    value={pct}
                    onChange={e => setMs(i, 'percentage_of_budget', Number(e.target.value))}
                    style={{ '--pct': `${pct}%` }}
                  />
                  <div className="ms-pct-num">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={pct}
                      onFocus={e => e.target.select()}
                      onChange={e => {
                        const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
                        const n = digits === '' ? 0 : parseInt(digits, 10);
                        setMs(i, 'percentage_of_budget', Math.max(0, Math.min(100, n)));
                      }}
                    />
                    <span className="pct-sym">%</span>
                  </div>
                  <div className="ms-amt">
                    <em>{fmtRON(amt)}</em> <span style={{ color: 'var(--fg-3)' }}>RON</span>
                  </div>
                </div>

                {(tErr || dErr) && (
                  <div className="fld-help err">
                    <Icon name="x" size={12} />
                    {tErr || dErr}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="btn btn-secondary btn-sm" onClick={addMs} style={{ alignSelf: 'flex-start' }}>
        <Icon name="plus" size={13} /> Adaugă etapă
      </button>

      {attempted && errors._pct && (
        <div className="fld-help err"><Icon name="x" size={12} />{errors._pct}</div>
      )}
    </div>
  );
}

function Step4Review({ form, isPM, onJump }) {
  const budget = parseInt(form.budget_ron, 10) || 0;
  const commission = isPM ? 0 : Math.round(budget * 0.05);
  const escrow = budget + commission;
  const svc = SERVICE_TYPES.find(s => s.value === form.service_type);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="review-card">
        <div className="review-head">
          <div className="review-eyebrow">
            <Icon name={svc?.icon || 'folder'} size={11} />
            {svc?.label}
          </div>
          <div className="review-title">{form.title || <em>Proiect fără titlu</em>}</div>
          {form.description && <div className="review-desc">{form.description}</div>}
          <div style={{ marginTop: '.875rem' }}>
            <button type="button" className="chip-btn" onClick={() => onJump(1)}>
              <Icon name="edit" size={10} style={{ marginRight: 4, verticalAlign: -1 }} /> Editează brief
            </button>
          </div>
        </div>

        <div className="review-grid">
          <div className="review-cell">
            <div className="ico"><Icon name="wallet" size={13} /></div>
            <div className="lbl">Buget</div>
            <div className="val"><em>{fmtRON(budget)}</em> <span style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)' }}>RON</span></div>
          </div>
          <div className="review-cell">
            <div className="ico"><Icon name="clock" size={13} /></div>
            <div className="lbl">Termen</div>
            <div className="val">{form.timeline_days || '—'} <span style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)' }}>ZILE</span></div>
          </div>
          <div className="review-cell">
            <div className="ico"><Icon name={svc?.icon || 'folder'} size={13} /></div>
            <div className="lbl">Tip</div>
            <div className="val" style={{ fontSize: 15 }}>{svc?.label || '—'}</div>
          </div>
        </div>

        {form.service_type === 'direct' && form.direct_partner_email && (
          <div style={{ padding: '.875rem 1.75rem', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: '.625rem' }}>
            <div style={{ width: 24, height: 24, borderRadius: 'var(--r-xs)', background: 'var(--bg-2)', border: '1px solid var(--border-2)', display: 'grid', placeItems: 'center', color: 'var(--fg-3)' }}>
              <Icon name="mail" size={12} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>Invitație expert</div>
            <div style={{ fontSize: 13, color: 'var(--fg-0)', fontFamily: 'var(--f-mono)' }}>{form.direct_partner_email}</div>
          </div>
        )}

        {!isPM && form.milestones.length > 0 && (
          <div className="review-ms">
            <div className="review-ms-h">
              <div className="l">{form.milestones.length} etape · livrare în {form.milestones.length} tranșe</div>
              <button type="button" className="chip-btn" onClick={() => onJump(3)}>
                <Icon name="edit" size={10} style={{ marginRight: 4, verticalAlign: -1 }} /> Editează etape
              </button>
            </div>
            {form.milestones.map((ms, i) => (
              <div className="review-ms-row" key={ms.id || i}>
                <div className="num">{String(i + 1).padStart(2, '0')}</div>
                <div className="tt">
                  {ms.title || `Etapa ${i + 1}`}
                  {ms.deliverable_description && <span className="sub">{ms.deliverable_description}</span>}
                </div>
                <div className="pp">{Number(ms.percentage_of_budget) || 0}%</div>
                <div className="am">{fmtRON(budget * (Number(ms.percentage_of_budget) || 0) / 100)} RON</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="escrow-total">
        <div className="h">
          <div className="l">
            <span className="pulse" />
            Buget total proiect
          </div>
          <span className="badge badge-blue no-dot" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
            <Icon name="lock" size={10} style={{ marginRight: 4 }} /> Depunere per milestone
          </span>
        </div>
        <div className="amt">
          <em>{fmtRON(budget)}</em>
          <span className="cur">RON</span>
        </div>
        <div className="breakdown">
          <div>
            <span>Buget proiect</span>
            <span>{fmtRON(budget)} RON</span>
          </div>
          <div>
            <span>Comision tu (beneficiar)</span>
            <span>+5% per milestone</span>
          </div>
          <div>
            <span>Comision prestator (la release)</span>
            <span>5% deducat din suma milestone</span>
          </div>
        </div>
        <div style={{
          marginTop: '0.75rem', padding: '0.625rem 0.875rem',
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--fg-1)', lineHeight: 1.5,
        }}>
          <Icon name="info" size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
          Banii se depun în escrow după ce contractul e semnat de ambele părți, doar pentru milestone-ul curent. Tu plătești <strong>suma milestone + 5%</strong>; suma milestone se eliberează prestatorului (minus 5% comision) la aprobare.
        </div>
      </div>

      <div className="disclaimer">
        <Icon name="shield" size={15} />
        <div>
          <b>Atenție:</b> Vei putea anula proiectul <b style={{ color: 'var(--fg-0)' }}>doar înainte de semnarea contractului</b>.
          După semnare, fondurile sunt eliberate doar prin aprobarea milestone-urilor sau prin procedura de dispută.
        </div>
      </div>
    </div>
  );
}

function SuccessState({ form, projectId, isPM, dashboardPath, onReset, onView }) {
  const svc = SERVICE_TYPES.find(s => s.value === form.service_type);

  const nextSteps = isPM
    ? [
        { t: <>Un <b>admin Escro</b> va analiza proiectul în următoarele <b>24h lucrătoare</b>.</> },
        { t: <>După aprobare, vom împărți proiectul în <b>sub-task-uri</b> și vom asigna experții potriviți.</> },
        { t: <>Vei primi <b>notificare email</b> cu fiecare schimbare de status.</> },
      ]
    : form.service_type === 'direct'
    ? [
        { t: <>Am trimis o invitație la <b style={{ fontFamily: 'var(--f-mono)' }}>{form.direct_partner_email}</b>.</> },
        { t: <>După ce expertul acceptă, vei <b>semna contractul</b> și fondurile vor fi blocate în escrow.</> },
        { t: <>Poți discuta direct cu expertul prin <b>chatul de proiect</b>.</> },
      ]
    : [
        { t: <>Proiectul este vizibil în <b>marketplace</b> pentru experți verificați.</> },
        { t: <>Vei primi <b>aplicații</b> în 24–72h, cu propuneri și prețuri.</> },
        { t: <>Compari, alegi, semnezi — și fondurile se blochează în escrow.</> },
      ];

  return (
    <div className="success-stage">
      <div className="success-mark">
        <Icon name="check" size={36} />
      </div>
      <div className="success-eyebrow">{svc?.label}{projectId ? ` · ${projectId}` : ''}</div>
      <h2 className="success-title">Proiect <em>creat</em>.</h2>
      <p className="success-sub">
        „{form.title}” a fost înregistrat cu succes. Iată ce urmează:
      </p>

      <div className="success-next">
        <div className="hd">Pașii următori</div>
        {nextSteps.map((s, i) => (
          <div className="success-next-row" key={i}>
            <div className="n">{i + 1}</div>
            <div className="t">{s.t}</div>
          </div>
        ))}
      </div>

      <div className="success-cta">
        <button className="btn btn-primary" onClick={onView}>
          <Icon name="arrow-right" size={13} /> Vezi {isPM ? 'taskul' : 'proiectul'}
        </button>
        <button className="btn btn-secondary" onClick={onReset}>
          <Icon name="plus" size={13} /> Creează încă unul
        </button>
      </div>
    </div>
  );
}

export default function CreateProject() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(FRESH_FORM);
  const [attempted, setAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [draftDate, setDraftDate] = useState('');
  const [createdProject, setCreatedProject] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const isPM = form.service_type === 'project_management';
  const dashboardPath = user?.role === 'expert' ? '/expert/dashboard'
    : user?.role === 'individual' ? '/individual/dashboard'
    : '/company/dashboard';

  const stepsToShow = useMemo(() => isPM ? ALL_STEPS.filter(s => s.id !== 3) : ALL_STEPS, [isPM]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.form && (draft.form.title || draft.form.description || draft.form.budget_ron)) {
          setShowDraft(true);
          setDraftDate(draft.savedAt || '');
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (done) return;
    const empty = !form.title && !form.description && !form.budget_ron && !form.service_type;
    if (empty) return;
    const payload = JSON.stringify({ form, step, savedAt: new Date().toISOString() });
    try { localStorage.setItem(DRAFT_KEY, payload); } catch { /* ignore */ }
  }, [form, step, done]);

  const resumeDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.form) {
          setForm(draft.form);
          if (draft.step) setStep(draft.step);
        }
      }
    } catch { /* ignore */ }
    setShowDraft(false);
  };

  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setShowDraft(false);
  };

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const errors = useMemo(() => validateStep(step, form, isPM), [step, form, isPM]);
  const stepValid = Object.keys(errors).length === 0;

  const handleNext = () => {
    if (!stepValid) { setAttempted(true); return; }
    setAttempted(false);
    if (isPM && step === 2) setStep(4);
    else setStep(s => Math.min(4, s + 1));
  };

  const handleBack = () => {
    setAttempted(false);
    if (isPM && step === 4) setStep(2);
    else setStep(s => Math.max(1, s - 1));
  };

  const jumpTo = (target) => {
    if (target < step) {
      setAttempted(false);
      setStep(target);
    }
  };

  const handleSubmit = async () => {
    if (!stepValid) { setAttempted(true); return; }
    setSubmitError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...form,
        budget_ron: parseInt(form.budget_ron, 10) || 0,
        timeline_days: parseInt(form.timeline_days, 10) || 0,
        milestones: isPM ? [] : form.milestones.map(m => ({
          title: m.title,
          deliverable_description: m.deliverable_description,
          percentage_of_budget: Number(m.percentage_of_budget) || 0,
        })),
      };
      const res = await axios.post('/api/projects', payload, { headers: { Authorization: `Bearer ${token}` } });
      setCreatedProject({
        // PM tasks return only task_id; direct/matching projects return project_id.
        // For PM sub-projects task_id is preferred (parent task page); otherwise use project_id.
        id: res.data.task_id || res.data.project_id || res.data.project?.id || res.data.id,
        is_pm: !!res.data.is_project_management,
      });
      setDone(true);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Eroare la crearea proiectului.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm(FRESH_FORM);
    setStep(1);
    setAttempted(false);
    setDone(false);
    setCreatedProject(null);
    setSubmitError('');
  };

  const viewCreated = () => {
    if (createdProject?.id) navigate(`/project/${createdProject.id}`);
    else navigate(dashboardPath);
  };

  const indicatorSteps = stepsToShow.map((s, i) => ({ ...s, id: i + 1 }));
  const indicatorCurrent = isPM
    ? (step === 1 ? 1 : step === 2 ? 2 : step === 4 ? 3 : 1)
    : step;

  if (done) {
    return (
      <div className="escro-page fade-up" style={{ maxWidth: 680, margin: '0 auto' }}>
        <SuccessState
          form={form}
          projectId={createdProject?.id ? `PRJ-${String(createdProject.id).slice(0, 8).toUpperCase()}` : null}
          isPM={createdProject?.is_pm || isPM}
          dashboardPath={dashboardPath}
          onReset={reset}
          onView={viewCreated}
        />
      </div>
    );
  }

  return (
    <div className="escro-page fade-up" style={{ maxWidth: 680, margin: '0 auto' }}>

      {showDraft && (
        <div className="draft-banner">
          <Icon name="file" size={16} />
          <div className="grow">
            Ai un <b>draft salvat</b>{draftDate ? ` din ${new Date(draftDate).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}. Continuă de unde ai rămas?
          </div>
          <button onClick={resumeDraft}>Continuă</button>
          <button className="ghost" onClick={discardDraft}>Renunță</button>
        </div>
      )}

      <div style={{ marginBottom: '1.75rem' }}>
        <div className="h-eyebrow">
          <Icon name="sparkle" size={11} />
          Proiect nou
          <span style={{ color: 'var(--fg-4)' }}>·</span>
          <span style={{ color: 'var(--fg-2)' }}>{SERVICE_TYPES.find(s => s.value === form.service_type)?.label || 'alege tipul'}</span>
        </div>
        <h1 className="h-title">
          {step === 1 && <>Brief & <em>tip serviciu</em>.</>}
          {step === 2 && <>Buget & <em>termene</em>.</>}
          {step === 3 && !isPM && <>Împarte <em>pe etape</em>.</>}
          {(step === 4 || (step === 3 && isPM)) && <>Verifică & <em>lansează</em>.</>}
        </h1>
      </div>

      <StepIndicator steps={indicatorSteps} current={indicatorCurrent} onJump={(id) => {
        const realStep = isPM
          ? (id === 1 ? 1 : id === 2 ? 2 : 4)
          : id;
        jumpTo(realStep);
      }} />

      <div className="wiz-body" key={`step-${step}`}>
        {step === 1 && <Step1Brief form={form} set={set} errors={errors} attempted={attempted} />}
        {step === 2 && <Step2Budget form={form} set={set} errors={errors} attempted={attempted} isPM={isPM} />}
        {step === 3 && !isPM && <Step3Milestones form={form} setForm={setForm} errors={errors} attempted={attempted} />}
        {(step === 4 || (step === 3 && isPM)) && <Step4Review form={form} isPM={isPM} onJump={jumpTo} />}

        {submitError && (
          <div className="fld-help err" style={{ marginTop: '1rem' }}>
            <Icon name="x" size={12} />{submitError}
          </div>
        )}

        <div className={`wiz-nav ${step === 1 ? 'end' : ''}`}>
          {step > 1 ? (
            <button className="btn btn-secondary" type="button" onClick={handleBack} disabled={loading}>
              <Icon name="arrow-left" size={13} /> Înapoi
            </button>
          ) : (
            <button className="btn btn-ghost" type="button" onClick={() => navigate(-1)}>Anulează</button>
          )}

          {(step < 4 && !(isPM && step === 2)) ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleNext}
              disabled={!stepValid && attempted}
              title={!stepValid ? 'Completează câmpurile obligatorii' : ''}
            >
              {step === 1 ? 'Continuă cu bugetul' : 'Adaugă etape'}
              <Icon name="arrow-right" size={13} />
            </button>
          ) : (isPM && step === 2) ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleNext}
              disabled={!stepValid && attempted}
            >
              Revizuire <Icon name="arrow-right" size={13} />
            </button>
          ) : (
            <button className="btn btn-primary" type="button" onClick={handleSubmit} disabled={loading || (!stepValid && attempted)}>
              {loading
                ? <><span style={{
                    width: 13, height: 13, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff',
                    borderRadius: '50%', display: 'inline-block', animation: 'cp-spin .7s linear infinite',
                  }} /> Se creează…</>
                : <>Lansează proiectul <Icon name="sparkle" size={13} /></>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

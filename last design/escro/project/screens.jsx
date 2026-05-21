/* All screens */

// ————— Dashboard —————
function Dashboard({ go }) {
  const [tab, setTab] = React.useState('all');
  const filtered = tab === 'all' ? PROJECTS : tab === 'active' ? PROJECTS.filter(p=>p.status==='active') : tab === 'review' ? PROJECTS.filter(p=>p.status==='review' || p.status==='delivered') : PROJECTS.filter(p=>p.status==='pending');

  return (
    <div className="page fade-up">
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Bună dimineața · Joi, 09 mai</div>
          <h1 className="h-title">Trei proiecte așteaptă <em>decizia ta</em>.</h1>
          <p className="h-sub">96.700 RON sunt blocați în escrow pentru lucrările active. Două livrabile sunt gata de review, iar un nou proiect a fost contractat în ultimele 24h.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary"><I name="paper" size={14} /> Raport săptămânal</button>
          <button className="btn btn-primary" onClick={() => go('create')}><I name="plus" size={14} /> Proiect nou</button>
        </div>
      </div>

      {/* Vault hero */}
      <div className="vault" style={{ marginBottom: '2rem' }}>
        <div className="vault-content" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem', alignItems: 'center' }}>
          <div>
            <div className="h-eyebrow" style={{ marginBottom: '1rem' }}><I name="lock" size={11} /> Escrow vault · În custodie</div>
            <div className="vault-num"><em>96</em>.700<span className="vault-cur">RON</span></div>
            <p className="muted" style={{ marginTop: '1rem', maxWidth: '46ch', fontSize: 13 }}>
              Fonduri blocate în escrow și debursate exclusiv la confirmarea milestone-urilor. Acoperite de polița de garantare BCR.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <div className="label">În escrow</div>
                <div className="mono" style={{ fontSize: 16, color: 'var(--fg-0)' }}>74.500 <span className="muted-2" style={{ fontSize: 11 }}>RON</span></div>
              </div>
              <div className="v-divider" />
              <div>
                <div className="label">Debursat 30z</div>
                <div className="mono" style={{ fontSize: 16, color: 'var(--ok)' }}>+ 22.200 <span className="muted-2" style={{ fontSize: 11 }}>RON</span></div>
              </div>
              <div className="v-divider" />
              <div>
                <div className="label">Disputat</div>
                <div className="mono" style={{ fontSize: 16, color: 'var(--fg-1)' }}>0 <span className="muted-2" style={{ fontSize: 11 }}>RON</span></div>
              </div>
            </div>
          </div>

          <div>
            <div className="label">Distribuție pe stadiu</div>
            <div className="bar-stack" style={{ marginBottom: '0.875rem' }}>
              <div style={{ width: '42%', background: 'var(--acc)' }} />
              <div style={{ width: '28%', background: 'var(--info)' }} />
              <div style={{ width: '18%', background: 'var(--warn)' }} />
              <div style={{ width: '12%', background: 'var(--fg-3)' }} />
            </div>
            <div className="col" style={{ gap: 8, fontSize: 12 }}>
              <div className="row-b"><span className="row" style={{ gap: 6 }}><span style={{ width: 8, height: 8, background: 'var(--acc)', borderRadius: 2 }} /> În progres</span><span className="mono">40.600 RON · 42%</span></div>
              <div className="row-b"><span className="row" style={{ gap: 6 }}><span style={{ width: 8, height: 8, background: 'var(--info)', borderRadius: 2 }} /> Livrat</span><span className="mono">27.000 RON · 28%</span></div>
              <div className="row-b"><span className="row" style={{ gap: 6 }}><span style={{ width: 8, height: 8, background: 'var(--warn)', borderRadius: 2 }} /> În review</span><span className="mono">17.400 RON · 18%</span></div>
              <div className="row-b"><span className="row" style={{ gap: 6 }}><span style={{ width: 8, height: 8, background: 'var(--fg-3)', borderRadius: 2 }} /> Caut expert</span><span className="mono">11.700 RON · 12%</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <Stat label="Proiecte active" value="6" delta="2 noi" deltaDir="up" sublabel="ultimele 7 zile" icon="folder" />
        <Stat label="Livrabile review" value="2" sublabel="acțiune necesară" icon="paper" />
        <Stat label="Trust score" value="94" unit="/100" delta="3" deltaDir="up" sublabel="L5 verificat" icon="shield" />
        <Stat label="Cost mediu / lună" value="38.4" unit="K" delta="6%" deltaDir="down" sublabel="vs trim. trecut" icon="arrow-down" />
      </div>

      {/* Two column: projects + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem' }}>
        <div>
          <div className="section-h">
            <h2 className="s-title">Proiecte <em>recente</em></h2>
            <div className="tabs">
              <div className={`tab ${tab==='all' ? 'active' : ''}`} onClick={() => setTab('all')}>Toate <span className="count">06</span></div>
              <div className={`tab ${tab==='active' ? 'active' : ''}`} onClick={() => setTab('active')}>Active</div>
              <div className={`tab ${tab==='review' ? 'active' : ''}`} onClick={() => setTab('review')}>Review</div>
              <div className={`tab ${tab==='pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>Caut expert</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {filtered.slice(0, 4).map(p => (
              <div key={p.id} className="proj" onClick={() => go('project', { id: p.id })}>
                <div className="proj-h">
                  <div>
                    <div className="proj-id">{p.id}</div>
                    <div className="proj-t">{p.title}</div>
                  </div>
                  <Badge tone={p.tone}>{p.statusLabel}</Badge>
                </div>
                <div className="proj-d">{p.desc}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '0.875rem' }}>
                  {p.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
                <div className="row-b" style={{ marginBottom: '0.75rem' }}>
                  <div className="row" style={{ fontSize: 12, color: 'var(--fg-2)' }}>
                    {p.expert ? (
                      <>
                        <Avatar name={p.expert} color={p.expertColor} size="sm" />
                        <span>{p.expert}</span>
                      </>
                    ) : (
                      <span className="muted-2"><I name="search" size={12} style={{verticalAlign:'-2px'}} /> Caut expert · {p.days} zile</span>
                    )}
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{p.progress}%</div>
                </div>
                <Bar value={p.progress} />
                <div className="proj-foot" style={{ marginTop: '1rem' }}>
                  <div>
                    <div className="proj-amt"><em>{(p.budget/1000).toFixed(1)}</em>k<span className="proj-cur">RON</span></div>
                    <div className="muted-2" style={{ fontSize: 10.5, marginTop: 2, fontFamily: 'var(--f-mono)' }}>{p.milestonesDone}/{p.milestones} milestones</div>
                  </div>
                  {p.new > 0 && <Badge tone="acc" noDot><I name="bell" size={10} /> {p.new} noi</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div>
          <div className="section-h">
            <h2 className="s-title">Activitate <em>live</em></h2>
            <span className="section-meta"><span className="pulse ok" style={{ verticalAlign: '-1px', marginRight: 6 }} />sincronizat</span>
          </div>
          <div className="card">
            <div style={{ padding: '0.5rem 0' }}>
              {ACTIVITY.map((a, i) => (
                <div key={i} className="row" style={{ padding: '0.875rem 1.25rem', borderBottom: i < ACTIVITY.length - 1 ? '1px solid var(--line-1)' : 0, gap: '0.75rem' }}>
                  {a.system ? (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--acc-bg)', color: 'var(--acc-hi)', border: '1px solid var(--acc-line)' }}><I name="lock" size={14} /></div>
                  ) : (
                    <Avatar name={a.who} color={a.color} size="sm" />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--fg-1)', lineHeight: 1.4 }}>
                      <b style={{ fontWeight: 600 }}>{a.who}</b> <span className="muted">{a.action}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{a.target}</div>
                  </div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{a.time}</div>
                </div>
              ))}
            </div>
            <div className="card-f">
              <span className="muted-2" style={{ fontSize: 11.5 }}>Ultimele 24 ore</span>
              <button className="btn btn-ghost btn-sm">Vezi tot <I name="arrow-r" size={12} /></button>
            </div>
          </div>

          {/* Tip card */}
          <div className="card" style={{ marginTop: '1rem', padding: '1.25rem', background: 'linear-gradient(180deg, var(--bg-2), var(--bg-1))' }}>
            <div className="h-eyebrow"><I name="sparkle" size={11} /> Sugestie</div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 19, lineHeight: 1.3, color: 'var(--fg-0)', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
              Pentru <em style={{ color: 'var(--acc-hi)', fontStyle: 'italic' }}>ESC-2403</em> recomandăm 2 experți cu disponibilitate imediată.
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: '0.875rem' }}>Match-ul AI propune Radu I. (98%) sau Elena D. (94%) — ambii cu memoriile redactate în jurisprudență CJUE.</p>
            <button className="btn btn-secondary btn-sm">Vezi propuneri <I name="arrow-r" size={12} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ————— Projects list —————
function Projects({ go }) {
  return (
    <div className="page fade-up">
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Marketplace</div>
          <h1 className="h-title">Proiecte <em>active</em></h1>
          <p className="h-sub">Toate proiectele din ecosistemul Escro — alocate sau în căutare de expert.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm"><I name="hash" size={13} /> Filtrează</button>
          <button className="btn btn-primary" onClick={() => go('create')}><I name="plus" size={14} /> Proiect nou</button>
        </div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 90 }}>ID</th>
              <th>Proiect</th>
              <th>Părți</th>
              <th>Buget</th>
              <th>Progres</th>
              <th>Status</th>
              <th>Update</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {PROJECTS.map(p => (
              <tr key={p.id} onClick={() => go('project', { id: p.id })}>
                <td><span className="mono" style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{p.id}</span></td>
                <td>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 15, color: 'var(--fg-0)', letterSpacing: '-0.01em' }}>{p.title}</div>
                  <div className="muted-2" style={{ fontSize: 11, marginTop: 2 }}>{p.tags.join(' · ')}</div>
                </td>
                <td>
                  <div className="row" style={{ gap: 6 }}>
                    <Avatar name={p.client} color={p.clientColor} size="sm" />
                    {p.expert ? <Avatar name={p.expert} color={p.expertColor} size="sm" /> : <span className="muted-2 mono" style={{ fontSize: 11 }}>—</span>}
                  </div>
                </td>
                <td><span className="mono" style={{ color: 'var(--fg-0)', fontSize: 13.5 }}>{p.budget.toLocaleString('ro')}<span className="muted-2"> RON</span></span></td>
                <td style={{ minWidth: 140 }}>
                  <Bar value={p.progress} />
                  <div className="mono muted-2" style={{ fontSize: 10.5, marginTop: 4 }}>{p.milestonesDone}/{p.milestones} milestone</div>
                </td>
                <td><Badge tone={p.tone}>{p.statusLabel}</Badge></td>
                <td><span className="mono muted-2" style={{ fontSize: 11 }}>{p.updated}</span></td>
                <td><I name="chevron-r" size={14} style={{ color: 'var(--fg-3)' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ————— Project detail —————
function ProjectDetail({ id = 'ESC-2401', go }) {
  const p = PROJECTS.find(x => x.id === id) || PROJECTS[0];
  const [tab, setTab] = React.useState('overview');

  return (
    <div className="page fade-up">
      <div className="row" style={{ marginBottom: '1.25rem', fontSize: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => go('projects')}><I name="arrow-r" size={12} style={{ transform: 'rotate(180deg)' }} /> Înapoi</button>
      </div>

      <div className="page-head" style={{ alignItems: 'flex-start', borderBottom: 0, paddingBottom: 0, marginBottom: '1.25rem' }}>
        <div style={{ flex: 1 }}>
          <div className="h-eyebrow"><I name="hash" size={11} /> {p.id} · contractat 02 apr</div>
          <h1 className="h-title" style={{ fontSize: 36, marginBottom: '0.875rem' }}>{p.title}</h1>
          <div className="row" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <Badge tone={p.tone}>{p.statusLabel}</Badge>
            <span className="row muted" style={{ fontSize: 12, gap: 6 }}><I name="building" size={13} /> {p.client}</span>
            {p.expert && <span className="row muted" style={{ fontSize: 12, gap: 6 }}><I name="user" size={13} /> {p.expert}</span>}
            <span className="row muted" style={{ fontSize: 12, gap: 6 }}><I name="globe" size={13} /> {p.days} zile rămase</span>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm"><I name="paper" size={13} /> Contract</button>
          <button className="btn btn-secondary btn-sm"><I name="doc" size={13} /> Anexă</button>
          <button className="btn btn-primary btn-sm"><I name="check" size={13} /> Aprobă livrabil</button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <div className={`tab ${tab==='overview'?'active':''}`} onClick={() => setTab('overview')}><I name="home" size={13} /> Detalii</div>
        <div className={`tab ${tab==='milestones'?'active':''}`} onClick={() => setTab('milestones')}><I name="flag" size={13} /> Milestones <span className="count">{p.milestones}</span></div>
        <div className={`tab ${tab==='chat'?'active':''}`} onClick={() => setTab('chat')}><I name="send" size={13} /> Chat <span className="count">12</span></div>
        <div className={`tab ${tab==='files'?'active':''}`} onClick={() => setTab('files')}><I name="paper" size={13} /> Fișiere <span className="count">8</span></div>
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
          <div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-h"><div className="card-t">Brief de proiect</div><span className="badge no-dot">Sigilat</span></div>
              <div className="card-b">
                <p style={{ fontFamily: 'var(--f-display)', fontSize: 19, lineHeight: 1.5, color: 'var(--fg-0)', letterSpacing: '-0.01em', marginBottom: '1rem' }}>
                  „Restructurare regim TVA pentru grup de 3 entități legate, audit ultimele 24 luni, propunere reorganizare și asistență la implementare."
                </p>
                <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                  Necesită experiență dovedită în split TVA și raportare consolidată. Echipa internă va furniza acces la sistem ANAF SPV, evidențe fiscale și balanțe lunare. Confidențialitate strictă — NDA semnat înainte de kick-off.
                </p>
                <div className="grid-3" style={{ marginTop: '1.5rem' }}>
                  <div><div className="label">Industrie</div><div style={{ fontSize: 13, color: 'var(--fg-0)' }}>Servicii juridice</div></div>
                  <div><div className="label">Confidențialitate</div><div style={{ fontSize: 13, color: 'var(--fg-0)' }}>NDA · Mutual</div></div>
                  <div><div className="label">Limbă livrare</div><div style={{ fontSize: 13, color: 'var(--fg-0)' }}>RO · EN</div></div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-h">
                <div className="card-t">Milestones</div>
                <span className="section-meta">{p.milestonesDone}/{p.milestones} complete · 12.000 RON debursat</span>
              </div>
              <div className="card-b">
                <div className="tl">
                  {MILESTONES.map(m => (
                    <div key={m.n} className={`tl-row ${m.status}`}>
                      <div className="tl-dot">{m.status === 'done' ? <I name="check" size={11} /> : m.n}</div>
                      <div className="row-b" style={{ alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-0)', marginBottom: 4 }}>{m.title}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{m.deliverable}</div>
                          <div className="row" style={{ gap: 12, marginTop: 8 }}>
                            <span className="mono muted-2" style={{ fontSize: 11 }}>{m.date}</span>
                            {m.status === 'done' && <Badge tone="ok" noDot><I name="check" size={10} /> Aprobat</Badge>}
                            {m.status === 'active' && <Badge tone="acc" noDot><span className="pulse" style={{ width: 6, height: 6 }} /> În progres</Badge>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="mono" style={{ fontSize: 14, color: 'var(--fg-0)' }}>{m.amount.toLocaleString('ro')} <span className="muted-2" style={{ fontSize: 11 }}>RON</span></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            {/* Vault for this project */}
            <div className="vault" style={{ marginBottom: '1.25rem', padding: '1.5rem' }}>
              <div className="vault-content">
                <div className="h-eyebrow" style={{ marginBottom: '0.625rem' }}><I name="lock" size={11} /> În custodie</div>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 56, lineHeight: 0.95, letterSpacing: '-0.04em', color: 'var(--fg-0)', fontVariantNumeric: 'tabular-nums' }}>
                  <em style={{ color: 'var(--acc-hi)', fontStyle: 'italic' }}>12</em>.500
                </div>
                <div className="mono muted-2" style={{ fontSize: 11, marginTop: 4 }}>RON · escrow activ</div>
                <div className="divider" />
                <div className="row-b" style={{ fontSize: 12, marginBottom: 6 }}><span className="muted-2">Total contract</span><span className="mono">24.500 RON</span></div>
                <div className="row-b" style={{ fontSize: 12, marginBottom: 6 }}><span className="muted-2">Debursat</span><span className="mono" style={{ color: 'var(--ok)' }}>12.000 RON</span></div>
                <div className="row-b" style={{ fontSize: 12 }}><span className="muted-2">Următoarea plată</span><span className="mono">22 mai</span></div>
              </div>
            </div>

            {/* Parties */}
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-h"><div className="card-t">Părți</div><span className="badge b-ok no-dot"><I name="check" size={10} /> Verificate</span></div>
              <div className="card-b">
                <div className="row" style={{ marginBottom: '1rem', alignItems: 'flex-start' }}>
                  <Avatar name={p.client} color={p.clientColor} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--fg-0)', fontWeight: 500 }}>{p.client}</div>
                    <div className="muted-2" style={{ fontSize: 11 }}>Companie · CIF RO 24813765</div>
                  </div>
                  <Trust level={5} />
                </div>
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <Avatar name={p.expert} color={p.expertColor} online />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--fg-0)', fontWeight: 500 }}>{p.expert}</div>
                    <div className="muted-2" style={{ fontSize: 11 }}>Expert · Consultant fiscal</div>
                  </div>
                  <Trust level={5} />
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="card">
              <div className="card-h"><div className="card-t">Acțiuni rapide</div></div>
              <div className="card-b col" style={{ gap: 6 }}>
                <button className="btn btn-secondary" style={{ justifyContent: 'space-between', width: '100%' }}><span className="row" style={{ gap: 8 }}><I name="play" size={13} /> Programează call</span><I name="chevron-r" size={13} /></button>
                <button className="btn btn-secondary" style={{ justifyContent: 'space-between', width: '100%' }}><span className="row" style={{ gap: 8 }}><I name="paper" size={13} /> Solicitare anexă</span><I name="chevron-r" size={13} /></button>
                <button className="btn btn-secondary" style={{ justifyContent: 'space-between', width: '100%' }}><span className="row" style={{ gap: 8 }}><I name="scale" size={13} /> Deschide dispută</span><I name="chevron-r" size={13} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'chat' && (
        <div className="card chat-wrap" style={{ height: 600 }}>
          <div className="chat-msgs">
            {MESSAGES.map((m, i) => (
              <div key={i} className={`chat-msg ${m.me ? 'me' : ''}`}>
                {!m.me && <Avatar name={m.from} color={m.color} size="sm" />}
                <div>
                  <div className="chat-bubble">{m.text}</div>
                  <div className="chat-meta">{m.from} · {m.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="chat-input-row">
            <input className="input" placeholder="Scrie un mesaj…" style={{ flex: 1 }} />
            <button className="btn btn-secondary btn-icon"><I name="paper" size={14} /></button>
            <button className="btn btn-primary btn-icon"><I name="send" size={14} /></button>
          </div>
        </div>
      )}

      {tab === 'milestones' && (
        <div className="card">
          <div className="card-b">
            <div className="tl">
              {MILESTONES.map(m => (
                <div key={m.n} className={`tl-row ${m.status}`}>
                  <div className="tl-dot">{m.status === 'done' ? <I name="check" size={11} /> : m.n}</div>
                  <div className="row-b" style={{ alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--fg-0)', marginBottom: 4 }}>Milestone {m.n} · {m.title}</div>
                      <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{m.deliverable}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 18, color: 'var(--fg-0)', fontFamily: 'var(--f-display)', fontVariantNumeric: 'tabular-nums' }}>{m.amount.toLocaleString('ro')}</div>
                      <div className="mono muted-2" style={{ fontSize: 10.5 }}>{m.date}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'files' && (
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Fișier</th><th>Tip</th><th>Mărime</th><th>Încărcat de</th><th>Data</th><th></th></tr></thead>
            <tbody>
              {[
                { n: 'audit-baseline-tva-2024.pdf', t: 'Raport', s: '2.4 MB', who: 'Ioana M.', c: 4, d: '18 apr 2025' },
                { n: 'NDA-mutual-signed.pdf', t: 'Contract', s: '180 KB', who: 'Maria I.', c: 3, d: '02 apr 2025' },
                { n: 'evidente-fiscale-q1.xlsx', t: 'Date', s: '4.1 MB', who: 'Maria I.', c: 3, d: '03 apr 2025' },
                { n: 'recomandari-restructurare-v2.pdf', t: 'Draft', s: '1.1 MB', who: 'Ioana M.', c: 4, d: '06 mai 2025' },
              ].map((f, i) => (
                <tr key={i}>
                  <td><span className="row" style={{ gap: 8 }}><I name="doc" size={14} style={{ color: 'var(--fg-3)' }} /><span style={{ color: 'var(--fg-0)', fontSize: 13 }}>{f.n}</span></span></td>
                  <td><span className="tag">{f.t}</span></td>
                  <td><span className="mono muted-2" style={{ fontSize: 11.5 }}>{f.s}</span></td>
                  <td><span className="row" style={{ gap: 6 }}><Avatar name={f.who} color={f.c} size="sm" /><span style={{ fontSize: 12 }}>{f.who}</span></span></td>
                  <td><span className="mono muted-2" style={{ fontSize: 11.5 }}>{f.d}</span></td>
                  <td><I name="chevron-r" size={13} style={{ color: 'var(--fg-3)' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ————— Directory —————
function Directory({ go }) {
  return (
    <div className="page fade-up">
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Director · 432 experți verificați</div>
          <h1 className="h-title">Experți cu <em>trust verificat</em>.</h1>
          <p className="h-sub">Fiecare expert din director a trecut prin verificare KYC video și are cel puțin un proiect închis cu succes pe Escro.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm"><I name="hash" size={13} /> Filtre</button>
          <button className="btn btn-secondary btn-sm"><I name="sparkle" size={13} /> Match AI</button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="row" style={{ marginBottom: '1.5rem', gap: 6, flexWrap: 'wrap' }}>
        {['Toate (432)','Fiscal (84)','Juridic (97)','Tech (68)','Brand (54)','Cloud (29)','M&A (12)','HR (38)'].map((c, i) => (
          <span key={c} className="tag" style={{ padding: '4px 10px', cursor: 'pointer', background: i === 0 ? 'var(--acc-bg)' : 'var(--bg-2)', color: i === 0 ? 'var(--acc-hi)' : 'var(--fg-1)', borderColor: i === 0 ? 'var(--acc-line)' : 'var(--line-1)' }}>{c}</span>
        ))}
      </div>

      <div className="grid-3">
        {EXPERTS.map(e => (
          <div key={e.id} className="exp" onClick={() => go('expert', { id: e.id })}>
            <div className="row-b">
              <div className="row">
                <Avatar name={e.name} color={e.color} size="lg" online />
                <div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, color: 'var(--fg-0)', letterSpacing: '-0.01em' }}>{e.name}</div>
                  <div className="muted-2" style={{ fontSize: 11.5, fontFamily: 'var(--f-mono)' }}>{e.role.toUpperCase()}</div>
                </div>
              </div>
              <Trust level={e.trust} />
            </div>
            <div className="exp-quote">„{e.quote}"</div>
            <div className="row" style={{ gap: 4, flexWrap: 'wrap', marginBottom: '1rem' }}>
              {e.tags.map(t => <span key={t} className="tag">{t}</span>)}
            </div>
            <div className="row-b" style={{ paddingTop: '1rem', borderTop: '1px solid var(--line-1)' }}>
              <div className="row" style={{ gap: 16, fontSize: 11.5, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>
                <span><b style={{ color: 'var(--fg-0)', fontWeight: 500 }}>{e.projects}</b> proiecte</span>
                <span><I name="star" size={11} style={{ verticalAlign: '-1px', color: 'var(--acc-hi)' }} /> <b style={{ color: 'var(--fg-0)', fontWeight: 500 }}>{e.rating}</b></span>
                <span>{e.city}</span>
              </div>
              <div className="mono" style={{ fontSize: 14, color: 'var(--fg-0)', fontFamily: 'var(--f-display)', letterSpacing: '-0.01em' }}>{e.hourly}<span className="muted-2" style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)' }}>/oră</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ————— Expert profile —————
function ExpertProfile({ id = 1, go }) {
  const e = EXPERTS.find(x => x.id === id) || EXPERTS[0];
  return (
    <div className="page fade-up">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1.25rem' }} onClick={() => go('directory')}><I name="arrow-r" size={12} style={{ transform: 'rotate(180deg)' }} /> Înapoi la director</button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '2rem', alignItems: 'flex-start' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', position: 'sticky', top: '1rem' }}>
          <Avatar name={e.name} color={e.color} size="xl" online />
          <div style={{ fontFamily: 'var(--f-display)', fontSize: 28, color: 'var(--fg-0)', letterSpacing: '-0.02em', marginTop: '1rem' }}>{e.name}</div>
          <div className="muted-2" style={{ fontSize: 12, fontFamily: 'var(--f-mono)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{e.role}</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}><Trust level={e.trust} /></div>
          <div className="grid-3" style={{ gap: '0.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div><div className="label">Proiecte</div><div className="mono" style={{ color: 'var(--fg-0)' }}>{e.projects}</div></div>
            <div><div className="label">Rating</div><div className="mono" style={{ color: 'var(--fg-0)' }}>{e.rating}</div></div>
            <div><div className="label">Tarif/oră</div><div className="mono" style={{ color: 'var(--fg-0)' }}>{e.hourly}</div></div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginBottom: '0.5rem' }}><I name="send" size={13} /> Trimite propunere</button>
          <button className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Vezi disponibilitate</button>
        </div>

        <div>
          <div className="h-eyebrow"><I name="sparkle" size={11} /> Despre</div>
          <p style={{ fontFamily: 'var(--f-display)', fontSize: 26, lineHeight: 1.4, color: 'var(--fg-0)', letterSpacing: '-0.015em', marginBottom: '2rem' }}>
            „{e.quote}"
          </p>

          <div className="section">
            <div className="section-h"><h2 className="s-title">Specializări</h2></div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {e.tags.map(t => <span key={t} className="tag" style={{ padding: '6px 12px', fontSize: 12 }}>{t}</span>)}
            </div>
          </div>

          <div className="section">
            <div className="section-h"><h2 className="s-title">Proiecte <em>recente</em></h2><span className="section-meta">ultimele 12 luni</span></div>
            <div className="card">
              {[
                { t: 'Restructurare TVA grup farmaceutic', c: 'Helia Pharma', d: '2024 · 6 săpt.', a: 18000, score: 5 },
                { t: 'Audit fiscal pre-investiție Series A', c: 'Vector Labs', d: '2024 · 3 săpt.', a: 12000, score: 5 },
                { t: 'Optimizare regim transfer pricing', c: 'Atrium Group', d: '2024 · 4 săpt.', a: 24000, score: 4 },
              ].map((p, i) => (
                <div key={i} className="row-b" style={{ padding: '1rem 1.25rem', borderBottom: i < 2 ? '1px solid var(--line-1)' : 0 }}>
                  <div>
                    <div style={{ fontSize: 14, color: 'var(--fg-0)', fontWeight: 500 }}>{p.t}</div>
                    <div className="muted-2" style={{ fontSize: 11.5, marginTop: 2 }}>{p.c} · {p.d}</div>
                  </div>
                  <div className="row" style={{ gap: 12 }}>
                    <span className="mono" style={{ color: 'var(--fg-1)', fontSize: 13 }}>{p.a.toLocaleString('ro')} <span className="muted-2" style={{ fontSize: 10.5 }}>RON</span></span>
                    <span style={{ color: 'var(--acc-hi)', fontFamily: 'var(--f-mono)', fontSize: 12 }}>{'★'.repeat(p.score)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ————— Create project —————
function CreateProject({ go }) {
  const [step, setStep] = React.useState(0);
  const steps = ['Brief', 'Buget & timeline', 'Milestones', 'Revizuire'];

  return (
    <div className="page fade-up" style={{ maxWidth: 920 }}>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Proiect nou</div>
          <h1 className="h-title">Definește <em>proiectul</em>.</h1>
          <p className="h-sub">Patru pași. Toate fondurile rămân în custodie până la confirmarea fiecărui milestone.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div className="steps">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`step ${step === i ? 'active' : ''} ${step > i ? 'done' : ''}`}>
                <div className="step-num">{step > i ? <I name="check" size={12} /> : i + 1}</div>
                <div className="step-l">{s}</div>
              </div>
              {i < steps.length - 1 && <div className="step-line" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-b" style={{ padding: '2rem' }}>
          {step === 0 && (
            <div className="col" style={{ gap: '1.25rem' }}>
              <div>
                <label className="label">Titlu proiect</label>
                <input className="input" placeholder="ex. Audit fiscal & restructurare TVA" defaultValue="Audit fiscal & restructurare TVA" />
              </div>
              <div>
                <label className="label">Brief detaliat</label>
                <textarea className="input" placeholder="Descrie obiectivul, contextul și constrângerile…" defaultValue="Restructurare regim TVA pentru grup de 3 entități legate, audit ultimele 24 luni. Necesită experiență în split TVA și raportare consolidată." />
              </div>
              <div className="grid-2">
                <div><label className="label">Categorie</label><select className="input"><option>Fiscal & Contabilitate</option><option>Juridic</option><option>Tech & Cloud</option></select></div>
                <div><label className="label">Confidențialitate</label><select className="input"><option>NDA mutual</option><option>NDA unilateral</option><option>Public</option></select></div>
              </div>
              <div>
                <label className="label">Tag-uri</label>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {['Fiscal','TVA','Audit','Consolidare','+'].map(t => <span key={t} className="tag" style={{ padding: '4px 10px', cursor: 'pointer', borderColor: t === '+' ? 'var(--line-2)' : 'var(--acc-line)', background: t === '+' ? 'var(--bg-2)' : 'var(--acc-bg)', color: t === '+' ? 'var(--fg-3)' : 'var(--acc-hi)' }}>{t}</span>)}
                </div>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="col" style={{ gap: '1.25rem' }}>
              <div className="grid-2">
                <div><label className="label">Buget total (RON)</label><input className="input" defaultValue="24500" /></div>
                <div><label className="label">Termen estimat (zile)</label><input className="input" defaultValue="45" /></div>
              </div>
              <div className="vault" style={{ padding: '1.5rem' }}>
                <div className="h-eyebrow"><I name="lock" size={11} /> Estimare escrow</div>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 56, lineHeight: 0.95, letterSpacing: '-0.04em', color: 'var(--fg-0)' }}><em style={{ color: 'var(--acc-hi)', fontStyle: 'italic' }}>24</em>.500 <span className="vault-cur">RON</span></div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: '0.875rem', maxWidth: '50ch' }}>Sumă blocată în escrow la kick-off. Comision Escro 4.5% (1.103 RON) reținut la fiecare debursare. Fără taxe ascunse.</div>
              </div>
              <div className="grid-3">
                <div><label className="label">Plată kick-off</label><input className="input" defaultValue="4000" /></div>
                <div><label className="label">% pe milestones</label><input className="input" defaultValue="80" /></div>
                <div><label className="label">Reținere finală</label><input className="input" defaultValue="2000" /></div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="col" style={{ gap: '0.75rem' }}>
              <div className="muted" style={{ fontSize: 12.5, marginBottom: '0.5rem' }}>Definește pașii intermediari. Fiecare milestone aprobat declanșează plata aferentă din escrow.</div>
              {MILESTONES.map(m => (
                <div key={m.n} className="card" style={{ padding: '1rem 1.25rem' }}>
                  <div className="row" style={{ gap: '1rem' }}>
                    <div className="step-num" style={{ flexShrink: 0 }}>{m.n}</div>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                      <input className="input" defaultValue={m.title} />
                      <input className="input" defaultValue={m.amount} />
                      <input className="input" defaultValue={m.date.replace('În progres · ', '+')} />
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}><I name="plus" size={12} /> Adaugă milestone</button>
            </div>
          )}
          {step === 3 && (
            <div>
              <div className="h-eyebrow">Aproape gata</div>
              <h2 className="s-title" style={{ marginBottom: '1.25rem', fontSize: 28 }}>Verifică <em>contractul</em> înainte de publicare.</h2>
              <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div className="label">Brief</div>
                  <div style={{ fontSize: 14, color: 'var(--fg-0)', marginBottom: '0.75rem' }}>Audit fiscal & restructurare TVA</div>
                  <div className="muted-2" style={{ fontSize: 12 }}>Fiscal · TVA · Audit · NDA mutual</div>
                </div>
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div className="label">Termeni financiari</div>
                  <div className="mono" style={{ fontSize: 22, fontFamily: 'var(--f-display)', color: 'var(--fg-0)' }}>24.500 <span style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)' }}>RON</span></div>
                  <div className="muted-2" style={{ fontSize: 12 }}>4 milestones · 45 zile · comision 4.5%</div>
                </div>
              </div>
              <div className="card" style={{ padding: '1.25rem', background: 'var(--acc-bg)', borderColor: 'var(--acc-line)' }}>
                <div className="row" style={{ gap: '0.75rem', alignItems: 'flex-start' }}>
                  <I name="lock" size={16} style={{ color: 'var(--acc-hi)', marginTop: 2 }} />
                  <div>
                    <div style={{ color: 'var(--acc-hi)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Fonduri vor fi blocate în escrow la publicare</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>După acceptarea de către expert, 24.500 RON sunt transferați într-un cont sigilat și debursați doar pe baza milestone-urilor aprobate de tine.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="card-f">
          <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(s => s - 1)}><I name="arrow-r" size={13} style={{ transform: 'rotate(180deg)' }} /> Înapoi</button>
          {step < 3 ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Continuă <I name="arrow-r" size={13} /></button>
          ) : (
            <button className="btn btn-primary" onClick={() => go('dashboard')}><I name="lock" size={13} /> Publică & blochează escrow</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ————— Vault page —————
function Vault() {
  return (
    <div className="page fade-up">
      <div className="page-head">
        <div>
          <div className="h-eyebrow"><I name="lock" size={11} /> Vault BCR · cont 4297-2941-0029</div>
          <h1 className="h-title">Toate fondurile, <em>la vedere</em>.</h1>
          <p className="h-sub">Istoricul complet al tranzacțiilor escrow, inclusiv blocări, debursări și retururi. Reconciliere zilnică.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm"><I name="paper" size={13} /> Export CSV</button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <Stat label="În custodie" value="96.7" unit="K" sublabel="3 proiecte active" icon="lock" />
        <Stat label="Debursat YTD" value="284" unit="K" delta="12%" deltaDir="up" sublabel="vs. 2024" icon="arrow-up" />
        <Stat label="Comision Escro" value="2.1" unit="K" sublabel="4.5% mediu" icon="sparkle" />
      </div>

      <div className="card">
        <div className="card-h"><div className="card-t">Tranzacții recente</div><span className="section-meta">ultimele 30 zile</span></div>
        <table className="tbl">
          <thead><tr><th>Data</th><th>Tip</th><th>Proiect</th><th>Contraparte</th><th style={{ textAlign: 'right' }}>Sumă</th><th></th></tr></thead>
          <tbody>
            {[
              { d: '08 mai 09:14', t: 'Debursare', tone: 'ok', p: 'ESC-2401 · M2', who: 'Ioana M.', a: '+8.000', sign: 'out' },
              { d: '07 mai 16:42', t: 'Blocare', tone: 'acc', p: 'ESC-2406', who: 'NimbusOps', a: '32.000', sign: 'in' },
              { d: '06 mai 11:08', t: 'Debursare', tone: 'ok', p: 'ESC-2404 · final', who: 'Cristina P.', a: '+1.400', sign: 'out' },
              { d: '03 mai 14:21', t: 'Comision', tone: 'info', p: 'ESC-2401', who: 'Escro', a: '+360', sign: 'fee' },
              { d: '02 mai 09:00', t: 'Blocare', tone: 'acc', p: 'ESC-2405', who: 'Casa Verde', a: '12.000', sign: 'in' },
            ].map((r, i) => (
              <tr key={i}>
                <td><span className="mono muted-2" style={{ fontSize: 11.5 }}>{r.d}</span></td>
                <td><Badge tone={r.tone}>{r.t}</Badge></td>
                <td><span className="mono" style={{ fontSize: 12, color: 'var(--fg-1)' }}>{r.p}</span></td>
                <td>{r.who}</td>
                <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: r.sign === 'out' ? 'var(--ok)' : r.sign === 'in' ? 'var(--fg-0)' : 'var(--info)', fontSize: 14 }}>{r.a} <span className="muted-2" style={{ fontSize: 10.5 }}>RON</span></span></td>
                <td><I name="chevron-r" size={13} style={{ color: 'var(--fg-3)' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ————— Generic / placeholder pages —————
function Tasks() {
  return (
    <div className="page fade-up">
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Kanban</div>
          <h1 className="h-title">Task-uri <em>active</em></h1>
        </div>
      </div>
      <div className="grid-3">
        {[
          { t: 'În așteptare', tone: 'warn', items: ['Recomandări restructurare · ESC-2401', 'DPA template · ESC-2402'] },
          { t: 'În progres', tone: 'acc', items: ['Audit cloud AWS baseline · ESC-2406', 'Manual brand v3 · ESC-2405', 'Memoriu juridic · ESC-2403'] },
          { t: 'Review & livrare', tone: 'ok', items: ['Setup ANAF · ESC-2404'] },
        ].map(col => (
          <div key={col.t} className="card">
            <div className="card-h"><div className="row" style={{ gap: 8 }}><Badge tone={col.tone} noDot>{col.t}</Badge><span className="mono muted-2" style={{ fontSize: 11 }}>{col.items.length}</span></div></div>
            <div className="card-b col" style={{ gap: 8, padding: '0.875rem' }}>
              {col.items.map(it => (
                <div key={it} className="card" style={{ padding: '0.875rem 1rem', cursor: 'pointer', background: 'var(--bg-1)' }}>
                  <div style={{ fontSize: 13, color: 'var(--fg-0)', marginBottom: 6 }}>{it.split(' · ')[0]}</div>
                  <div className="row-b">
                    <span className="mono muted-2" style={{ fontSize: 10.5 }}>{it.split(' · ')[1]}</span>
                    <Avatar name="Ioana M." color={4} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Settings() {
  return (
    <div className="page fade-up" style={{ maxWidth: 920 }}>
      <div className="page-head"><div><div className="h-eyebrow">Cont</div><h1 className="h-title"><em>Setări</em></h1></div></div>
      <div className="card" style={{ padding: '2rem' }}>
        <div className="row" style={{ marginBottom: '2rem' }}>
          <Avatar name="Maria Ionescu" color={3} size="xl" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 24, color: 'var(--fg-0)' }}>Maria Ionescu</div>
            <div className="muted-2" style={{ fontSize: 12, fontFamily: 'var(--f-mono)' }}>maria@notarbucharest.ro · L5 Verificat</div>
          </div>
          <button className="btn btn-secondary btn-sm">Schimbă fotografia</button>
        </div>
        <div className="grid-2" style={{ gap: '1.25rem' }}>
          <div><label className="label">Nume</label><input className="input" defaultValue="Maria" /></div>
          <div><label className="label">Prenume</label><input className="input" defaultValue="Ionescu" /></div>
          <div><label className="label">Email</label><input className="input" defaultValue="maria@notarbucharest.ro" /></div>
          <div><label className="label">Telefon</label><input className="input" defaultValue="+40 722 481 200" /></div>
        </div>
        <div className="divider" />
        <div className="row-b" style={{ padding: '0.5rem 0' }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--fg-0)', fontWeight: 500 }}>Verificare KYC video</div>
            <div className="muted-2" style={{ fontSize: 12 }}>Confirmat 12 mar 2025 · valid 12 luni</div>
          </div>
          <Badge tone="ok"><I name="check" size={10} /> Verificat</Badge>
        </div>
        <div className="row-b" style={{ padding: '0.5rem 0' }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--fg-0)', fontWeight: 500 }}>2FA · Authenticator</div>
            <div className="muted-2" style={{ fontSize: 12 }}>Activat pentru toate operațiunile financiare</div>
          </div>
          <Badge tone="ok"><I name="check" size={10} /> Activ</Badge>
        </div>
      </div>
    </div>
  );
}

function Referral() {
  return (
    <div className="page fade-up" style={{ maxWidth: 760 }}>
      <div className="page-head" style={{ borderBottom: 0, paddingBottom: 0 }}>
        <div><div className="h-eyebrow"><I name="gift" size={11} /> Program referral</div><h1 className="h-title">Recomandă · <em>câștigă</em>.</h1><p className="h-sub">Pentru fiecare partener nou care semnează primul contract pe Escro, primești 250 RON credit + 15 puncte trust.</p></div>
      </div>
      <div className="vault" style={{ padding: '2.5rem', textAlign: 'center', marginTop: '1.5rem' }}>
        <div className="h-eyebrow" style={{ justifyContent: 'center' }}>Codul tău</div>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: 72, letterSpacing: '0.05em', color: 'var(--fg-0)', margin: '1rem 0' }}>MARIA·47K</div>
        <button className="btn btn-primary"><I name="paper" size={13} /> Copiază & partajează</button>
      </div>
      <div className="grid-3" style={{ marginTop: '1.5rem' }}>
        <Stat label="Invitați" value="14" sublabel="ultimii 6 luni" />
        <Stat label="Convertiți" value="9" delta="3" deltaDir="up" />
        <Stat label="Câștigat" value="2.25" unit="K" sublabel="RON · credit" />
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, Projects, ProjectDetail, Directory, ExpertProfile, CreateProject, Vault, Tasks, Settings, Referral });

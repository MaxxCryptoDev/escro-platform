import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import axios from 'axios';

export default function CreateProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget_ron: '',
    timeline_days: '',
    service_type: '',
    direct_partner_email: '',
    milestones: [
      { title: '', deliverable_description: '', percentage_of_budget: 50 },
      { title: '', deliverable_description: '', percentage_of_budget: 50 }
    ]
  });

  const serviceTypes = [
    { value: 'matching', label: '🔗 Matching', description: 'Platforma te ajută să găsești expertul potrivit pentru proiectul tău.', icon: '🔗' },
    { value: 'direct', label: '🎯 Direct', description: 'Contract direct cu expertul ales de tine.', icon: '🎯' },
    { value: 'project_management', label: '📊 Project Management', description: 'Supervizăm proiectul de la început până la finalizare.', icon: '📊' }
  ];

  const handleServiceTypeSelect = (type) => {
    setFormData(prev => ({ ...prev, service_type: type }));
    setStep(2);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'budget_ron' || name === 'timeline_days' ? parseFloat(value) : value
    }));
  };

  const handleMilestoneChange = (index, field, value) => {
    const newMilestones = [...formData.milestones];
    newMilestones[index] = { ...newMilestones[index], [field]: field === 'percentage_of_budget' ? parseFloat(value) : value };
    setFormData(prev => ({ ...prev, milestones: newMilestones }));
  };

  const addMilestone = () => {
    setFormData(prev => ({ ...prev, milestones: [...prev.milestones, { title: '', deliverable_description: '', percentage_of_budget: 0 }] }));
  };

  const removeMilestone = (index) => {
    if (formData.milestones.length > 1) {
      setFormData(prev => ({ ...prev, milestones: prev.milestones.filter((_, i) => i !== index) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.budget_ron || !formData.timeline_days) {
      setError('Completează toate câmpurile obligatorii');
      return;
    }
    if (formData.service_type === 'direct' && !formData.direct_partner_email) {
      setError('Introdu email-ul expertului sau companiei pentru contract direct');
      return;
    }
    if (formData.service_type !== 'project_management') {
      if (formData.milestones.length === 0) { setError('Adaugă cel puțin o etapă'); return; }
      const totalPct = formData.milestones.reduce((sum, m) => sum + (parseFloat(m.percentage_of_budget) || 0), 0);
      if (totalPct !== 100) { setError(`Milestone percentages must add up to 100% (currently ${totalPct}%)`); return; }
      if (formData.milestones.some(m => !m.title || !m.deliverable_description)) { setError('All milestones must have title and description'); return; }
    }
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/projects', formData, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.data.is_project_management && response.data.task_id) {
        setSuccess('✓ Project Management task creat și trimis la aprobare!');
        setTimeout(() => { navigate(user?.role === 'company' ? `/company/dashboard?tab=pm-${response.data.task_id}` : `/expert/dashboard?tab=pm-${response.data.task_id}`); }, 2000);
      } else {
        setSuccess('✓ Project created successfully!');
        setTimeout(() => { navigate(user?.role === 'expert' ? '/expert/dashboard?tab=myprojects' : '/company/dashboard?tab=myprojects'); }, 1500);
      }
    } catch (err) { setError(err.response?.data?.error || err.message || 'Failed to create project'); } 
    finally { setLoading(false); }
  };

  const styles = {
    container: { padding: '2rem', maxWidth: '900px', margin: '0 auto', backgroundColor: '#f0f4f8', minHeight: 'calc(100vh - 65px)' },
    card: { backgroundColor: 'white', borderRadius: '20px', padding: '2.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
    title: { fontSize: '2rem', fontWeight: '700', color: '#1e293b', margin: '0 0 2rem 0', textAlign: 'center' },
    label: { fontWeight: '600', display: 'block', marginBottom: '0.5rem', color: '#374151', fontSize: '0.95rem' },
    input: { width: '100%', padding: '0.875rem 1rem', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', boxSizing: 'border-box', outline: 'none' },
    textarea: { width: '100%', padding: '0.875rem 1rem', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', minHeight: '120px', boxSizing: 'border-box', outline: 'none', resize: 'vertical' },
    button: { padding: '0.875rem 1.75rem', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem', fontWeight: '600' },
    buttonGreen: { backgroundColor: '#10b981' },
    buttonRed: { backgroundColor: '#ef4444' },
    buttonSecondary: { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' },
    messageBox: { padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', borderLeft: '4px solid' },
    errorBox: { backgroundColor: '#fee2e2', borderLeftColor: '#ef4444', color: '#dc2626' },
    successBox: { backgroundColor: '#dcfce7', borderLeftColor: '#10b981', color: '#059669' },
    stepBadge: { padding: '0.75rem 1.5rem', borderRadius: '99px', fontWeight: '600', fontSize: '0.9rem' },
    serviceCard: { padding: '1.75rem', borderRadius: '16px', border: '2px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: 'white' },
    milestoneContainer: { backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' },
  };

  return (
    <>
      <Header />
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>➕ Creare Proiect Nou</h1>
          
          {error && <div style={{ ...styles.messageBox, ...styles.errorBox }}><strong>⚠️ Eroare:</strong> {error}</div>}
          {success && <div style={{ ...styles.messageBox, ...styles.successBox }}><strong>✅ Succes!</strong> {success}</div>}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
            <span style={{ ...styles.stepBadge, background: step >= 1 ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#e2e8f0', color: step >= 1 ? 'white' : '#6b7280' }}>1. Tip Serviciu</span>
            <div style={{ width: '40px', height: '3px', backgroundColor: step >= 2 ? '#6366f1' : '#e2e8f0', borderRadius: '2px', alignSelf: 'center' }} />
            <span style={{ ...styles.stepBadge, background: step >= 2 ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#e2e8f0', color: step >= 2 ? 'white' : '#6b7280' }}>2. Detalii</span>
          </div>

          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem', color: '#1e293b', textAlign: 'center' }}>Ce tip de serviciu ai nevoie?</h2>
              <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '2rem' }}>Alege tipul de serviciu care ți se potrivește</p>
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                {serviceTypes.map(service => (
                  <div key={service.value} style={formData.service_type === service.value ? { ...styles.serviceCard, borderColor: '#6366f1', backgroundColor: '#f5f3ff', boxShadow: '0 4px 20px rgba(99, 102, 241, 0.2)' } : styles.serviceCard} onClick={() => handleServiceTypeSelect(service.value)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: formData.service_type === service.value ? '#6366f1' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>{service.icon}</div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b', fontWeight: '700' }}>{service.label}</h3>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', lineHeight: '1.6' }}>{service.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <button type="button" onClick={() => setStep(1)} style={{ ...styles.button, ...styles.buttonSecondary, marginBottom: '1.5rem', padding: '0.6rem 1rem' }}>← Înapoi</button>
              
              <div style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '2px solid #f1f5f9' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: '700', marginBottom: '1.5rem', color: '#1e293b' }}>📋 Detalii Proiect</h2>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={styles.label}>Titlu Proiect *</label>
                  <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="Ex: Design Website" style={{...styles.input, backgroundColor: '#f8fafc'}} required />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={styles.label}>Descriere *</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Descrie proiectul..." style={{...styles.textarea, backgroundColor: '#f8fafc'}} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={styles.label}>💰 Buget (RON) *</label>
                    <input type="number" name="budget_ron" value={formData.budget_ron} onChange={handleInputChange} placeholder="5000" style={{...styles.input, backgroundColor: '#f8fafc'}} required />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={styles.label}>⏱️ Durată (zile) *</label>
                    <input type="number" name="timeline_days" value={formData.timeline_days} onChange={handleInputChange} placeholder="30" style={{...styles.input, backgroundColor: '#f8fafc'}} required />
                  </div>
                </div>
                {formData.service_type === 'direct' && (
                  <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#fef3c7', borderRadius: '14px', border: '1px solid #fcd34d' }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', color: '#92400e', fontWeight: '700' }}>👤 Contract Direct</h3>
                    <p style={{ margin: '0 0 1rem 0', color: '#92400e', fontSize: '0.9rem' }}>Introdu email-ul expertului</p>
                    <input type="email" name="direct_partner_email" value={formData.direct_partner_email} onChange={handleInputChange} placeholder="expert@exemplu.ro" style={{...styles.input, backgroundColor: 'white'}} required />
                  </div>
                )}
              </div>

              {formData.service_type !== 'project_management' && (
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: '700', marginBottom: '1.5rem', color: '#1e293b' }}>🎯 Etape (Milestones)</h2>
                  {formData.milestones.map((milestone, index) => (
                    <div key={index} style={styles.milestoneContainer}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span style={{ backgroundColor: '#6366f1', color: 'white', padding: '0.3rem 0.75rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.85rem' }}>Etapa {index + 1}</span>
                        {formData.milestones.length > 1 && <button type="button" onClick={() => removeMilestone(index)} style={{ ...styles.button, ...styles.buttonRed, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>🗑️</button>}
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <input type="text" value={milestone.title} onChange={(e) => handleMilestoneChange(index, 'title', e.target.value)} placeholder="Titlu etapă" style={styles.input} required />
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <textarea value={milestone.deliverable_description} onChange={(e) => handleMilestoneChange(index, 'deliverable_description', e.target.value)} placeholder="Descriere livrabil" style={{...styles.textarea, minHeight: '80px'}} required />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="number" value={milestone.percentage_of_budget} onChange={(e) => handleMilestoneChange(index, 'percentage_of_budget', e.target.value)} min="0" max="100" style={{...styles.input, width: '100px'}} />
                        <span style={{ color: '#64748b' }}>% = {Math.round((parseFloat(milestone.percentage_of_budget) || 0) * formData.budget_ron / 100)} RON</span>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addMilestone} style={{ ...styles.button, backgroundColor: '#0ea5e9', marginBottom: '2rem' }}>➕ Adaugă Etapă</button>
                  
                  <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '1.75rem', borderRadius: '16px', color: 'white' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontWeight: '700' }}>📊 Rezumat</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '12px' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Buget</p>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '700' }}>{formData.budget_ron || 0} RON</p>
                      </div>
                      <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '12px' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Durată</p>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '700' }}>{formData.timeline_days || 0} zile</p>
                      </div>
                      <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '12px' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Etape</p>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '700' }}>{formData.milestones.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" onClick={() => navigate(-1)} style={{ ...styles.button, backgroundColor: '#6b7280' }}>❌ Anulează</button>
                <button type="submit" disabled={loading} style={{ ...styles.button, ...styles.buttonGreen, opacity: loading ? 0.6 : 1 }}>{loading ? '⏳ Se creează...' : '✓ Creează Proiect'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

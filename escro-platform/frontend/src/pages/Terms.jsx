import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <Link to="/" style={styles.backLink}>← Înapoi</Link>
        
        <h1 style={styles.title}>TERMENI ȘI CONDIȚII DE UTILIZARE – PLATFORMA ESCRO</h1>
        
        <p style={styles.lastUpdate}>Ultima actualizare: 16 Februarie 2026</p>
        
        <p style={styles.intro}>
          Acești Termeni și Condiții („Termenii") reglementează accesul și utilizarea platformei ESCRO („Platforma").
        </p>
        
        <div style={styles.section}>
          <p>Platforma este operată de:</p>
          <p style={{ marginTop: '1rem' }}>
            <strong>ESCRO SRL</strong><br/>
            cu sediul în [ADRESĂ]<br/>
            înregistrată la Registrul Comerțului sub nr. [NR]<br/>
            CUI [CUI]<br/>
            denumită în continuare „ESCRO".
          </p>
        </div>
        
        <div style={styles.section}>
          <p>Serviciile de arbitraj sunt furnizate independent de:</p>
          <p style={{ marginTop: '0.5rem' }}>
            <strong>TrustHub – Asociație non-profit</strong>, denumită în continuare „TrustHub".
          </p>
        </div>
        
        <div style={styles.section}>
          <p style={styles.acceptance}>
            Prin crearea unui cont, Utilizatorul acceptă integral acești Termeni.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>1. DEFINIȚII</h2>
          <p><strong>Platforma</strong> – sistemul digital operat de ESCRO.</p>
          <p><strong>Utilizator</strong> – orice persoană fizică sau juridică ce creează cont.</p>
          <p><strong>Beneficiar</strong> – Utilizator care solicită și plătește un serviciu.</p>
          <p><strong>Prestator</strong> – Utilizator care furnizează serviciul.</p>
          <p>Un Utilizator poate fi alternativ Beneficiar sau Prestator.</p>
          <p><strong>Tranzacție</strong> – acordul dintre Beneficiar și Prestator facilitat de Platformă.</p>
          <p><strong>Escrow</strong> – mecanismul prin care fondurile sunt păstrate temporar de ESCRO până la finalizarea tranzacției sau soluționarea unei dispute.</p>
          <p><strong>Dispută</strong> – orice neînțelegere privind o Tranzacție.</p>
          <p><strong>Arbitraj TrustHub</strong> – procesul de soluționare a disputelor de către TrustHub.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>2. NATURA PLATFORMEI</h2>
          <p><strong>ESCRO furnizează:</strong></p>
          <ul style={styles.list}>
            <li>servicii escrow;</li>
            <li>servicii de matching;</li>
            <li>servicii de project management;</li>
            <li>facilitarea tranzacțiilor;</li>
            <li>infrastructura tehnică.</li>
          </ul>
          <p><strong>TrustHub furnizează exclusiv servicii de arbitraj independent.</strong></p>
          <p><strong>ESCRO NU este parte în contractul dintre Beneficiar și Prestator.</strong></p>
          <p>Contractul există exclusiv între Utilizatori.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>3. CREAREA CONTULUI</h2>
          <p>Prin crearea contului, Utilizatorul declară că:</p>
          <ul style={styles.list}>
            <li>furnizează informații reale;</li>
            <li>are capacitate legală;</li>
            <li>acceptă acești Termeni;</li>
            <li>acceptă arbitrajul TrustHub;</li>
            <li>acceptă serviciile ESCRO.</li>
          </ul>
          <p><strong>ESCRO poate:</strong></p>
          <ul style={styles.list}>
            <li>verifica identitatea;</li>
            <li>solicita documente;</li>
            <li>suspenda conturi;</li>
            <li>închide conturi.</li>
          </ul>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>4. SERVICIUL ESCROW</h2>
          <p>ESCRO administrează fondurile în numele Utilizatorilor.</p>
          <p><strong>Fondurile sunt:</strong></p>
          <ul style={styles.list}>
            <li>păstrate temporar;</li>
            <li>protejate;</li>
            <li>eliberate conform regulilor Platformei.</li>
          </ul>
          <p><strong>Fondurile pot fi eliberate:</strong></p>
          <ul style={styles.list}>
            <li>a) la confirmarea Beneficiarului;</li>
            <li>b) la expirarea perioadei de contestare;</li>
            <li>c) prin decizia TrustHub.</li>
          </ul>
          <p>ESCRO execută decizia TrustHub.</p>
          <p>ESCRO nu decide rezultatul disputelor.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>5. MATCHING ȘI PROJECT MANAGEMENT</h2>
          <p><strong>ESCRO poate:</strong></p>
          <ul style={styles.list}>
            <li>conecta Utilizatori;</li>
            <li>facilita comunicarea;</li>
            <li>organiza milestone-uri;</li>
            <li>monitoriza progresul.</li>
          </ul>
          <p>ESCRO nu garantează executarea serviciilor.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>6. COMISIOANELE ESCRO</h2>
          <p><strong>ESCRO percepe comisioane pentru:</strong></p>
          <ul style={styles.list}>
            <li>escrow;</li>
            <li>matching;</li>
            <li>administrare;</li>
            <li>project management.</li>
          </ul>
          <p>Comisioanele sunt plătite de Beneficiar.</p>
          <p>ESCRO poate deduce comisioanele din fonduri.</p>
          <p>Comisioanele sunt nerambursabile, cu excepția cazurilor prevăzute de lege.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>7. PROCESAREA PLĂȚILOR</h2>
          <p>Plățile sunt procesate prin furnizori terți autorizați, inclusiv Stripe.</p>
          <p>ESCRO nu stochează date complete ale cardurilor.</p>
          <p>Utilizatorul acceptă termenii procesatorilor de plăți.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>8. ROLUL TRUSTHUB – ARBITRAJ INDEPENDENT</h2>
          <p>TrustHub este o entitate independentă.</p>
          <p><strong>TrustHub furnizează:</strong></p>
          <ul style={styles.list}>
            <li>analiză dispute;</li>
            <li>arbitraj;</li>
            <li>decizii obligatorii.</li>
          </ul>
          <p>TrustHub nu are interes comercial în Tranzacții.</p>
          <p>TrustHub acționează ca terț neutru.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>9. ACCEPTAREA ARBITRAJULUI</h2>
          <p>Prin utilizarea Platformei, Utilizatorul acceptă:</p>
          <ul style={styles.list}>
            <li>arbitrajul TrustHub;</li>
            <li>autoritatea TrustHub;</li>
            <li>caracterul obligatoriu al deciziilor;</li>
            <li>executarea deciziilor de către ESCRO.</li>
          </ul>
          <p>Deciziile TrustHub sunt finale.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>10. PROCESUL DE DISPUTĂ</h2>
          <p>TrustHub poate:</p>
          <ul style={styles.list}>
            <li>solicita dovezi;</li>
            <li>analiza conversații;</li>
            <li>solicita documente;</li>
            <li>evalua livrabile;</li>
            <li>solicita informații suplimentare.</li>
          </ul>
          <p><strong>TrustHub poate decide:</strong></p>
          <ul style={styles.list}>
            <li>eliberarea fondurilor către Prestator;</li>
            <li>returnarea către Beneficiar;</li>
            <li>distribuirea parțială;</li>
            <li>alte soluții echitabile.</li>
          </ul>
          <p>ESCRO execută decizia TrustHub.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>11. CONTRACTUL DINTRE UTILIZATORI</h2>
          <p>Contractul există exclusiv între Beneficiar și Prestator.</p>
          <p>ESCRO nu este parte contractuală.</p>
          <p>TrustHub nu este parte contractuală.</p>
          <p>ESCRO este administrator escrow.</p>
          <p>TrustHub este arbitru.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>12. ACCEPTAREA CONTRACTELOR DIGITALE</h2>
          <p>Utilizatorii acceptă că:</p>
          <ul style={styles.list}>
            <li>acordurile digitale sunt valide juridic;</li>
            <li>acceptarea digitală are valoare contractuală;</li>
            <li>conversațiile pot constitui dovezi.</li>
          </ul>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>13. OBLIGAȚIILE UTILIZATORILOR</h2>
          <p>Utilizatorii sunt responsabili pentru:</p>
          <ul style={styles.list}>
            <li>serviciile oferite;</li>
            <li>respectarea termenelor;</li>
            <li>legalitatea activităților;</li>
            <li>veridicitatea informațiilor.</li>
          </ul>
          <p>Este interzisă utilizarea Platformei pentru activități ilegale.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>14. FRAUDĂ ȘI ABUZ</h2>
          <p>ESCRO poate:</p>
          <ul style={styles.list}>
            <li>suspenda conturi;</li>
            <li>reține fonduri temporar;</li>
            <li>investiga activități suspecte;</li>
            <li>raporta autorităților.</li>
          </ul>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>15. LIMITAREA RĂSPUNDERII ESCRO</h2>
          <p>ESCRO nu este responsabil pentru:</p>
          <ul style={styles.list}>
            <li>pierderi comerciale;</li>
            <li>daune indirecte;</li>
            <li>neexecutarea contractelor;</li>
            <li>comportamentul Utilizatorilor.</li>
          </ul>
          <p>ESCRO este responsabil exclusiv pentru administrarea escrow.</p>
          <p>Răspunderea ESCRO este limitată la comisioanele percepute.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>16. LIMITAREA RĂSPUNDERII TRUSTHUB</h2>
          <p>TrustHub nu este responsabil pentru:</p>
          <ul style={styles.list}>
            <li>pierderi comerciale;</li>
            <li>daune indirecte;</li>
            <li>consecințe ale disputelor.</li>
          </ul>
          <p>TrustHub oferă exclusiv arbitraj.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>17. SUSPENDAREA CONTURILOR</h2>
          <p>ESCRO poate suspenda conturi pentru:</p>
          <ul style={styles.list}>
            <li>fraudă;</li>
            <li>încălcarea Termenilor;</li>
            <li>comportament abuziv;</li>
            <li>risc legal.</li>
          </ul>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>18. CONFIDENȚIALITATE</h2>
          <p>ESCRO procesează date conform GDPR.</p>
          <p>Datele pot fi utilizate pentru:</p>
          <ul style={styles.list}>
            <li>operarea Platformei;</li>
            <li>prevenirea fraudelor;</li>
            <li>obligații legale.</li>
          </ul>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>19. PROPRIETATEA INTELECTUALĂ</h2>
          <p>Platforma este proprietatea ESCRO.</p>
          <p>Utilizatorii nu pot copia sau reproduce sistemul.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>20. FORȚA MAJORĂ</h2>
          <p>ESCRO nu este responsabil pentru evenimente de forță majoră.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>21. MODIFICAREA TERMENILOR</h2>
          <p>ESCRO poate modifica Termenii.</p>
          <p>Utilizatorii vor fi notificați.</p>
          <p>Continuarea utilizării reprezintă acceptarea modificărilor.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>22. LEGEA APLICABILĂ</h2>
          <p>Acești Termeni sunt guvernați de legea română.</p>
          <p>Disputele sunt soluționate prin arbitraj TrustHub.</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.mainTitle}>23. ACCEPTAREA FINALĂ</h2>
          <p>Prin crearea contului, Utilizatorul acceptă:</p>
          <ul style={styles.list}>
            <li>serviciile ESCRO;</li>
            <li>comisioanele ESCRO;</li>
            <li>mecanismul escrow;</li>
            <li>arbitrajul TrustHub;</li>
            <li>caracterul obligatoriu al deciziilor TrustHub;</li>
            <li>acești Termeni integral.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '2rem 1rem',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '2rem',
  },
  backLink: {
    display: 'inline-block',
    marginBottom: '1.5rem',
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '0.95rem',
  },
  title: {
    fontSize: '1.5rem',
    color: '#333',
    marginBottom: '0.5rem',
    lineHeight: '1.3',
  },
  lastUpdate: {
    color: '#666',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
  },
  intro: {
    fontSize: '1rem',
    lineHeight: '1.6',
    color: '#333',
    marginBottom: '2rem',
  },
  section: {
    marginBottom: '1.5rem',
  },
  mainTitle: {
    fontSize: '1.1rem',
    color: '#333',
    marginBottom: '0.75rem',
    borderBottom: '2px solid #007bff',
    paddingBottom: '0.5rem',
  },
  list: {
    marginLeft: '1.5rem',
    lineHeight: '1.8',
    color: '#444',
  },
  acceptance: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    marginTop: '1rem',
  },
};

/* Mock data for the prototype */

const PROJECTS = [
  { id: 'ESC-2401', title: 'Audit fiscal & restructurare TVA', client: 'Notar Bucharest SRL', clientColor: 3, expert: 'Ioana Marinescu', expertColor: 4, budget: 24500, status: 'active', tone: 'acc', statusLabel: 'În progres', progress: 62, milestones: 4, milestonesDone: 2, days: 28, tags: ['Fiscal', 'TVA', 'Audit'], desc: 'Restructurare regim TVA pentru grup de 3 entități legate, audit ultimele 24 luni. Necesită experiență în split TVA și raportare consolidată.', updated: '2 ore', new: 3 },
  { id: 'ESC-2402', title: 'Strategie GDPR pentru SaaS B2B', client: 'Replate Tech', clientColor: 2, expert: 'Radu Iancu', expertColor: 1, budget: 18000, status: 'active', tone: 'acc', statusLabel: 'În progres', progress: 35, milestones: 5, milestonesDone: 1, days: 14, tags: ['GDPR', 'Privacy', 'B2B'], desc: 'Audit complet GDPR + DPA-uri cu sub-procesori, redactare politici interne și training echipă produs.', updated: '5 ore', new: 0 },
  { id: 'ESC-2403', title: 'Memoriu juridic — clauză abuzivă', client: 'Stoica & Asociații', clientColor: 1, expert: null, expertColor: 0, budget: 6800, status: 'pending', tone: 'warn', statusLabel: 'Caut expert', progress: 0, milestones: 2, milestonesDone: 0, days: 7, tags: ['Litigiu', 'Consum'], desc: 'Memoriu pentru contestație clauză contractuală — analiză jurisprudență CJUE și redactare în 7 zile.', updated: 'azi', new: 0 },
  { id: 'ESC-2404', title: 'Setup ANAF & e-Factura', client: 'Lumen Studio', clientColor: 5, expert: 'Cristina Pop', expertColor: 6, budget: 4200, status: 'delivered', tone: 'info', statusLabel: 'Livrat', progress: 100, milestones: 3, milestonesDone: 3, days: 0, tags: ['ANAF', 'Contabilitate'], desc: 'Configurare conturi ANAF SPV, integrare e-Factura cu sistemul intern + sesiune training.', updated: 'ieri', new: 1 },
  { id: 'ESC-2405', title: 'Brand identity refresh', client: 'Casa Verde Bistro', clientColor: 4, expert: 'Andrei Vrabie', expertColor: 5, budget: 12000, status: 'review', tone: 'warn', statusLabel: 'Review', progress: 88, milestones: 4, milestonesDone: 3, days: 3, tags: ['Brand', 'Design'], desc: 'Refresh identitate vizuală + manual de brand + asseturi sociale pentru repoziționare locală.', updated: '1 oră', new: 5 },
  { id: 'ESC-2406', title: 'Audit infrastructură cloud AWS', client: 'NimbusOps', clientColor: 6, expert: 'Mihai Stancu', expertColor: 3, budget: 32000, status: 'active', tone: 'acc', statusLabel: 'În progres', progress: 18, milestones: 6, milestonesDone: 1, days: 42, tags: ['Cloud', 'AWS', 'DevOps'], desc: 'Audit cost & securitate AWS, recomandări reserved instances, hardening IAM și monitorizare CloudTrail.', updated: '3 ore', new: 0 },
];

const EXPERTS = [
  { id: 1, name: 'Ioana Marinescu', color: 4, role: 'Consultant fiscal senior', city: 'București', trust: 5, projects: 47, rating: 4.9, hourly: 320, tags: ['Fiscal', 'TVA', 'Transfer pricing'], quote: 'Am restructurat regimul TVA pentru 3 grupuri de companii — economie medie 18%.' },
  { id: 2, name: 'Radu Iancu', color: 1, role: 'Avocat privacy & tech', city: 'Cluj-Napoca', trust: 5, projects: 31, rating: 4.8, hourly: 280, tags: ['GDPR', 'AI Act', 'Tech law'], quote: 'GDPR pentru produse — nu doar template-uri, ci arhitectură de privacy by design.' },
  { id: 3, name: 'Cristina Pop', color: 6, role: 'Expert contabil', city: 'Timișoara', trust: 4, projects: 124, rating: 5.0, hourly: 180, tags: ['ANAF', 'Salarizare', 'IFRS'], quote: 'O sută de companii migrate pe e-Factura fără un singur respins de ANAF.' },
  { id: 4, name: 'Andrei Vrabie', color: 5, role: 'Brand strategist', city: 'București', trust: 4, projects: 28, rating: 4.7, hourly: 240, tags: ['Brand', 'Strategy', 'Verbal identity'], quote: 'Brand-ul nu e logo. E felul în care decizi cine NU îți este client.' },
  { id: 5, name: 'Mihai Stancu', color: 3, role: 'Cloud architect', city: 'Iași', trust: 5, projects: 19, rating: 4.9, hourly: 380, tags: ['AWS', 'GCP', 'Kubernetes'], quote: 'Reduc costurile cloud cu minim 20% în primele 60 de zile sau lucrăm gratis.' },
  { id: 6, name: 'Elena Dobre', color: 2, role: 'M&A advisor', city: 'București', trust: 5, projects: 12, rating: 5.0, hourly: 460, tags: ['M&A', 'Due diligence', 'Term sheet'], quote: 'Term-sheet curat în 5 zile. Diligence complet în 30. Fără surprize la signing.' },
];

const ACTIVITY = [
  { who: 'Ioana M.', color: 4, action: 'a livrat milestone', target: 'Audit baseline · ESC-2401', time: 'acum 12 min', tone: 'ok' },
  { who: 'Radu I.', color: 1, action: 'a încărcat anexă', target: 'DPA template · ESC-2402', time: 'acum 47 min', tone: 'info' },
  { who: 'Andrei V.', color: 5, action: 'a cerut review', target: 'Manual brand v3 · ESC-2405', time: 'acum 1 oră', tone: 'warn' },
  { who: 'Sistem', color: 0, action: 'a debursat', target: '8.000 RON către Cristina P.', time: 'acum 2 ore', tone: 'acc', system: true },
  { who: 'Mihai S.', color: 3, action: 'a semnat contract', target: 'ESC-2406 · master agreement', time: 'azi 09:14', tone: 'ok' },
];

const MILESTONES = [
  { n: 1, title: 'Kick-off & acces sisteme', amount: 4000, status: 'done', date: '02 Apr', deliverable: 'Audit baseline & plan de execuție' },
  { n: 2, title: 'Audit baseline TVA · ultim 12 luni', amount: 8000, status: 'done', date: '18 Apr', deliverable: 'Raport baseline + listă neconformități' },
  { n: 3, title: 'Recomandări restructurare', amount: 7500, status: 'active', date: 'În progres · 6 zile', deliverable: 'Propunere structură + scenarii fiscale' },
  { n: 4, title: 'Implementare & raport final', amount: 5000, status: 'pending', date: '22 Mai', deliverable: 'Documentație ANAF + raport de închidere' },
];

const MESSAGES = [
  { from: 'Ioana M.', color: 4, me: false, text: 'Bună! Am terminat baseline-ul. Sunt 4 neconformități, 2 majore. Detalii în raportul atașat.', time: '09:42' },
  { from: 'Eu', me: true, text: 'Mulțumesc, Ioana. Cele majore — sunt în termen de regularizare voluntară?', time: '09:48' },
  { from: 'Ioana M.', color: 4, me: false, text: 'Da, ambele. Recomand să mergem pe declarație rectificativă în săptămâna asta. Pregătesc docs.', time: '09:51' },
  { from: 'Eu', me: true, text: 'Sună bine. Hai să programăm un call mâine la 11:00.', time: '09:53' },
  { from: 'Ioana M.', color: 4, me: false, text: 'Confirmat. Trimit invite cu agenda + scenariile A/B.', time: '09:54' },
];

Object.assign(window, { PROJECTS, EXPERTS, ACTIVITY, MILESTONES, MESSAGES });

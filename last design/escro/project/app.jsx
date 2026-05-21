/* App router */

function App() {
  const [route, setRoute] = React.useState('dashboard');
  const [params, setParams] = React.useState({});
  const [role, setRole] = React.useState('company');

  const go = (r, p = {}) => { setRoute(r); setParams(p); window.scrollTo?.(0, 0); };

  const view = (() => {
    switch (route) {
      case 'dashboard': return <Dashboard go={go} />;
      case 'projects':  return <Projects go={go} />;
      case 'mine':      return <Projects go={go} />;
      case 'project':   return <ProjectDetail id={params.id} go={go} />;
      case 'directory': return <Directory go={go} />;
      case 'expert':    return <ExpertProfile id={params.id} go={go} />;
      case 'create':    return <CreateProject go={go} />;
      case 'vault':     return <Vault />;
      case 'tasks':     return <Tasks />;
      case 'settings':  return <Settings />;
      case 'referral':  return <Referral />;
      default:          return <Dashboard go={go} />;
    }
  })();

  return (
    <div className="app">
      <Sidebar route={route} go={go} role={role} setRole={setRole} />
      <main className="main">
        <Topbar route={route} go={go} />
        <div className="scroll" data-screen-label={route}>{view}</div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

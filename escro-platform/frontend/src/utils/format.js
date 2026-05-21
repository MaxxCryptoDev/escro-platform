export const fmt = (n) =>
  new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(n || 0);

export const fmtRON = (n) =>
  new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(Math.round(parseFloat(n) || 0)) + ' RON';

export const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  const months = ['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','noi','dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Date + time format for transaction rows
export const fmtDateTime = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  const months = ['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','noi','dec'];
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} · ${h}:${m}`;
};

// Split a RON amount into integer + decimal parts (for the wallet hero display)
export const fmtRONsplit = (n) => {
  const num = parseFloat(n) || 0;
  const rounded = Math.round(num * 100) / 100;
  const intP = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(Math.floor(rounded));
  const decRaw = Math.round((rounded - Math.floor(rounded)) * 100);
  const decP = String(decRaw).padStart(2, '0');
  return [intP, decP];
};

export const serviceLabel = (s) => ({
  project_management: 'Project Management',
  matching: 'Matching',
  direct: 'Direct',
})[s] || s;

export const statusLabel = (s) => ({
  active: 'În progres', review: 'În revizuire', completed: 'Finalizat',
  dispute: 'În dispută', draft: 'Draft', pending_signature: 'Așteaptă semnătură',
  approved: 'Aprobat', in_progress: 'În progres', submitted: 'Livrat — în review',
  pending: 'În așteptare', disputed: 'În dispută', todo: 'De făcut',
  assigned: 'În progres',
  pending_approval: 'Așteaptă aprobare', pending_client_approval: 'Așteaptă aprobare client',
  pending_expert_approval: 'Așteaptă acceptul prestatorului', rejected: 'Respins', open: 'Deschis',
  closed: 'Închis', verified: 'Verificat', unverified: 'Neverificat',
})[s] || s;

export const statusBadge = (s) => ({
  active: 'badge-blue', review: 'badge-amber', completed: 'badge-green',
  dispute: 'badge-red', draft: 'badge-grey', pending_signature: 'badge-violet',
  approved: 'badge-green', in_progress: 'badge-blue', submitted: 'badge-amber',
  pending: 'badge-grey', disputed: 'badge-red', todo: 'badge-grey',
  assigned: 'badge-blue',
  pending_approval: 'badge-amber', pending_client_approval: 'badge-amber',
  pending_expert_approval: 'badge-violet', rejected: 'badge-red', open: 'badge-blue',
  closed: 'badge-grey', verified: 'badge-green', unverified: 'badge-grey',
})[s] || 'badge-grey';

export const getInitials = (name) =>
  name?.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase() || '?';

export const avatarColor = (role) => ({
  company: 'violet', expert: 'cyan', admin: 'amber',
})[role] || 'slate';

// Append a SHORT-LIVED download token as query param for protected /uploads/* URLs.
// Backed by a 5-min audience='upload' JWT minted via GET /api/auth/download-token
// (separate from the long-lived session JWT — leaking this one has limited impact).
// Token is cached in sessionStorage and auto-refreshed when stale.
const DOWNLOAD_TOKEN_KEY = 'escro_download_token';
const DOWNLOAD_TOKEN_EXP_KEY = 'escro_download_token_exp';

async function fetchFreshDownloadToken() {
  const session = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (!session) return null;
  try {
    const r = await fetch('/api/auth/download-token', {
      headers: { Authorization: `Bearer ${session}` },
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.token) return null;
    sessionStorage.setItem(DOWNLOAD_TOKEN_KEY, data.token);
    sessionStorage.setItem(DOWNLOAD_TOKEN_EXP_KEY, String(Date.now() + (data.expires_in_seconds || 300) * 1000));
    return data.token;
  } catch {
    return null;
  }
}

function getCachedDownloadToken() {
  if (typeof sessionStorage === 'undefined') return null;
  const tok = sessionStorage.getItem(DOWNLOAD_TOKEN_KEY);
  const exp = parseInt(sessionStorage.getItem(DOWNLOAD_TOKEN_EXP_KEY) || '0', 10);
  // Refresh in background if near expiry; return current token
  if (!tok || Date.now() > exp - 60 * 1000) {
    fetchFreshDownloadToken();
  }
  // If token expired, return null (caller's link will 401 → user can manually re-trigger)
  return Date.now() > exp ? null : tok;
}

// Async variant: wait for fresh token if cache missing. Use in onClick handlers
// that download files programmatically (window.open after await).
export async function downloadWithAuth(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('data:')) return url;
  const path = normalizeUploadUrl(url);
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  let token = getCachedDownloadToken();
  if (!token) token = await fetchFreshDownloadToken();
  if (!token) return path;
  return path + (path.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
}

function normalizeUploadUrl(url) {
  if (!url || typeof url !== 'string') return url;
  // Strip localhost origin so token middleware can authenticate the request
  try {
    const u = new URL(url);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return u.pathname + u.search;
  } catch { /* not a valid URL, return as-is */ }
  return url;
}

export const withAuthToken = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('data:')) return url;
  const path = normalizeUploadUrl(url);
  if (path.startsWith('http://') || path.startsWith('https://')) return path; // external, can't auth
  const token = getCachedDownloadToken();
  if (!token) return path;
  return path + (path.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
};

// Public hook: prefetch a fresh download token on app mount so first PDF link works
export const prefetchDownloadToken = () => fetchFreshDownloadToken();

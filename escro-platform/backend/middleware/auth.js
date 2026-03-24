import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  let token;
  
  console.log(`[AUTH] ${req.method} ${req.path}`);

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    console.log(`[AUTH] No token found for ${req.path}`);
    return res.status(401).json({ message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log(`[AUTH] Token verified for user:`, decoded.id, `role:`, decoded.role);
    next();
  } catch (err) {
    console.log(`[AUTH] Token verification failed for ${req.path}:`, err.message);
    return res.status(401).json({ message: 'Not authorized to access this route' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export const expertOnly = (req, res, next) => {
  if (req.user.role !== 'expert') {
    return res.status(403).json({ message: 'Expert access required' });
  }
  next();
};

export const clientOnly = (req, res, next) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ message: 'Client access required' });
  }
  next();
};

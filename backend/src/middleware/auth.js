const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'No token provided!' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized! Token expired or invalid.' });
    }
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  });
};

// RBAC Middleware generator
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ 
        message: `Forbidden: Access restricted to [${roles.join(', ')}]` 
      });
    }
    next();
  };
};

const isSuperAdmin = (req, res, next) => {
  if (req.userRole === 'Super Admin' || req.userRole === 'IT Team') {
    next();
  } else {
    res.status(403).json({ message: 'Require Admin Access!' });
  }
};

const isITAdmin = (req, res, next) => {
  if (req.userRole === 'IT Team') {
    next();
  } else {
    res.status(403).json({ message: 'Require IT Team Admin Access!' });
  }
};

module.exports = { verifyToken, authorize, isSuperAdmin, isITAdmin };

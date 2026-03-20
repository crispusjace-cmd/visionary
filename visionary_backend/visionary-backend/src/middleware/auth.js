const jwt = require('jsonwebtoken');

// Verify JWT on every protected route
function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token — please log in.' });
  }

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token invalid or expired — please log in again.' });
  }
}

// Role guard — pass one or more allowed roles
// Usage:  router.get('/admin-only', auth, allow('admin'), handler)
function allow(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. This route requires: ${roles.join(' or ')}.`
      });
    }
    next();
  };
}

module.exports = { auth, allow };


const jwt = require('jsonwebtoken');
const secret = 'efywefgywefew'; // This should be the same secret used in your login

module.exports = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json('No token provided');

  jwt.verify(token, secret, {}, (err, info) => {
    if (err) return res.status(401).json('Invalid token');
    req.user = info;
    next();
  });
};
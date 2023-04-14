const jwt = require("jsonwebtoken");

const isAuth = (req, res, next) => {
  const token = req.headers?.authorization?.split(" ")[1] || req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ error: "No token found" });
  }

  try {
    const decoded = jwt.verify(token, "secret");
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error(err);
    return res.status(403).json({ error: "Invalid token" });
  }
};

module.exports = isAuth;

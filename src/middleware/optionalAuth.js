import jwt from "jsonwebtoken";

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Guest customer
    if (!authHeader) {
      req.userId = null;
      return next();
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication header.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    // Logged-in customer
    req.userId = decoded.id;

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
    });
  }
};

export default optionalAuth;
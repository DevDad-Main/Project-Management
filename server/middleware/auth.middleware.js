import { getAuth } from "@clerk/express";

const authenticateUser = (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export default authenticateUser;


import express from "express";

import {
  loginUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getUserCart,
  saveUserCart,
} from "../controllers/userController.js";

import authMiddleware from "../middleware/auth.js";

const userRouter = express.Router();

// Public
userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);

// Protected profile
userRouter.get("/profile", authMiddleware, getUserProfile);
userRouter.put("/profile", authMiddleware, updateUserProfile);

// Protected addresses
userRouter.get("/addresses", authMiddleware, getAddresses);
userRouter.post("/addresses", authMiddleware, addAddress);
userRouter.put("/addresses/:addressId", authMiddleware, updateAddress);
userRouter.delete("/addresses/:addressId", authMiddleware, deleteAddress);

// Protected cart
userRouter.get("/cart", authMiddleware, getUserCart);
userRouter.put("/cart", authMiddleware, saveUserCart);

export default userRouter;


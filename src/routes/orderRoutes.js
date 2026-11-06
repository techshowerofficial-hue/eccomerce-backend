import express from "express";

import {
  placeOrder,
  getMyOrders,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
} from "../controllers/orderController.js";

import authMiddleware from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";

const router = express.Router();

// Customer routes

// Guest + Logged-in customers
router.post("/place", optionalAuth, placeOrder);

// Only logged-in customers
router.get("/my-orders", authMiddleware, getMyOrders);

// Admin routes
router.get("/admin/list", getAllOrders);
router.get("/admin/:id", getOrderDetails);
router.patch("/admin/:id/status", updateOrderStatus);

export default router;
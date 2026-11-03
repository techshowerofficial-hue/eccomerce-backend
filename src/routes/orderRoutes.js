import express from "express";

import {
  placeOrder,
  getMyOrders,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
} from "../controllers/orderController.js";

import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Customer: place order (login required)
router.post("/place", authMiddleware, placeOrder);

// Customer: get logged-in user's orders
router.get("/my-orders", authMiddleware, getMyOrders);

// Admin: order management
router.get("/admin/list", getAllOrders);
router.get("/admin/:id", getOrderDetails);
router.patch("/admin/:id/status", updateOrderStatus);

export default router;


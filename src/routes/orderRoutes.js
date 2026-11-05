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

// Customer routes
router.post("/place", authMiddleware, placeOrder);
router.get("/my-orders", authMiddleware, getMyOrders);

// IMPORTANT: Protect these three routes with admin authorization middleware.
// authMiddleware alone only authenticates; it does not prove the user is an admin.
router.get("/admin/list", getAllOrders);
router.get("/admin/:id", getOrderDetails);
router.patch("/admin/:id/status", updateOrderStatus);

export default router;

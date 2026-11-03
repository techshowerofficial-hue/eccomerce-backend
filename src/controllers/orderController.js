import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/productModels.js";
import userModel from "../models/userModel.js";
const DELIVERY_CHARGE = 45;

const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone);

const isValidPincode = (pincode) => /^\d{6}$/.test(pincode);

// ==========================================
// PLACE ORDER - CUSTOMER
// ==========================================
export const placeOrder = async (req, res) => {
  try {
    const { customer, address, items, notes = "" } = req.body;

    // Validate customer details
    if (
      !customer ||
      !customer.firstName ||
      !customer.lastName ||
      !customer.phone
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer details are required.",
      });
    }

    const firstName = String(customer.firstName).trim();
    const lastName = String(customer.lastName).trim();
    const phone = String(customer.phone).trim();
    const email = String(customer.email || "").trim().toLowerCase();

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required.",
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid mobile number.",
      });
    }

    if (email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address.",
        });
      }
    }

    // Validate delivery address
    const requiredAddressFields = [
      "house",
      "street",
      "city",
      "district",
      "state",
      "pincode",
    ];

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required.",
      });
    }

    for (const field of requiredAddressFields) {
      if (!String(address[field] || "").trim()) {
        return res.status(400).json({
          success: false,
          message: `${field} is required in the delivery address.`,
        });
      }
    }

    const normalizedAddress = {
      house: String(address.house).trim(),
      street: String(address.street).trim(),
      city: String(address.city).trim(),
      district: String(address.district).trim(),
      state: String(address.state).trim(),
      pincode: String(address.pincode).trim(),
    };

    if (!isValidPincode(normalizedAddress.pincode)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 6-digit PIN code.",
      });
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your order must contain at least one product.",
      });
    }

    // Validate product IDs and quantities
    const quantityByProductId = new Map();

    for (const item of items) {
      if (
        !item.productId ||
        !mongoose.Types.ObjectId.isValid(item.productId)
      ) {
        return res.status(400).json({
          success: false,
          message: "An invalid product ID was provided.",
        });
      }

      const quantity = Number(item.quantity);

      if (
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Product quantity must be between 1 and 100.",
        });
      }

      const productId = String(item.productId);

      quantityByProductId.set(
        productId,
        (quantityByProductId.get(productId) || 0) + quantity
      );
    }

    // Combine duplicate product IDs
    const productIds = [...quantityByProductId.keys()];

    const products = await Product.find({
      _id: { $in: productIds },
    });

    const productMap = new Map(
      products.map((product) => [
        String(product._id),
        product,
      ])
    );

    // Calculate subtotal using database prices
    const orderItems = [];
    let subtotal = 0;

    for (const [productId, quantity] of quantityByProductId) {
      const product = productMap.get(productId);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: "One or more products no longer exist.",
        });
      }

      if (product.isAvailable === false) {
        return res.status(400).json({
          success: false,
          message: `${product.name} is currently unavailable.`,
        });
      }

      const price = Number(product.price);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for ${product.name}.`,
        });
      }

      if (
        product.stock !== undefined &&
        product.stock !== null &&
        Number(product.stock) < quantity
      ) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}.`,
        });
      }

      const lineTotal = price * quantity;

      subtotal += lineTotal;

      orderItems.push({
        productId: product._id,
        name: product.name,
        price,
        quantity,
        lineTotal,
      });
    }

    const deliveryCharge = DELIVERY_CHARGE;
    const totalAmount = subtotal + deliveryCharge;

    // Generate order ID
    const orderId = `NILE-${Date.now()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    // Save order
    const order = await Order.create({
      orderId,

      // User ID is set by authMiddleware.
      // Guest orders can have userId = null if guest checkout is enabled.
      userId: req.userId || null,

      customer: {
        firstName,
        lastName,
        phone,
        email,
      },

      address: normalizedAddress,
      items: orderItems,
      subtotal,
      deliveryCharge,
      totalAmount,
      notes: String(notes || "").trim(),

      status: "Pending",
      paymentStatus: "Pending",
      paymentMethod: "UNDECIDED",
    });
// Save delivery address to the logged-in customer's account
if (req.userId) {
  const user = await userModel.findById(req.userId);

  if (user) {
    const fullName = `${firstName} ${lastName}`.trim();

    // Check whether the same address already exists
    const existingAddress = user.addresses.find((savedAddress) => {
      return (
        String(savedAddress.phone) === phone &&
        String(savedAddress.pincode) === normalizedAddress.pincode &&
        String(savedAddress.houseNo).trim().toLowerCase() ===
          normalizedAddress.house.trim().toLowerCase() &&
        String(savedAddress.area).trim().toLowerCase() ===
          normalizedAddress.street.trim().toLowerCase()
      );
    });

    if (!existingAddress) {
      const makeDefault = user.addresses.length === 0;

      if (makeDefault) {
        user.addresses.forEach((savedAddress) => {
          savedAddress.isDefault = false;
        });
      }

      user.addresses.push({
        fullName,
        phone,
        pincode: normalizedAddress.pincode,
        houseNo: normalizedAddress.house,
        area: normalizedAddress.street,
        landmark: "",
        city: normalizedAddress.city,
        district: normalizedAddress.district,
        state: normalizedAddress.state,
        addressType: "Home",
        isDefault: makeDefault,
      });

      await user.save();

      console.log("Customer delivery address saved successfully.");
    } else {
      console.log("Customer address already exists.");
    }
  }
}
    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      order: {
        _id: order._id,
        orderId: order.orderId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        subtotal: order.subtotal,
        deliveryCharge: order.deliveryCharge,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error("Place order controller error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to place order. Please try again.",
    });
  }
};

// ==========================================
// GET MY ORDERS - LOGGED-IN CUSTOMER
// ==========================================
export const getMyOrders = async (req, res) => {
  try {
    console.log("My Orders API called");
    console.log("User ID:", req.userId);

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const orders = await Order.find({
      userId: req.userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log("Orders found:", orders.length);

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get My Orders Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL ORDERS - ADMIN
// ==========================================
export const getAllOrders = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (status && status !== "All") {
      filter.status = status;
    }

    if (paymentStatus && paymentStatus !== "All") {
      filter.paymentStatus = paymentStatus;
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();

      filter.$or = [
        { orderId: { $regex: searchTerm, $options: "i" } },
        {
          "customer.firstName": {
            $regex: searchTerm,
            $options: "i",
          },
        },
        {
          "customer.lastName": {
            $regex: searchTerm,
            $options: "i",
          },
        },
        {
          "customer.phone": {
            $regex: searchTerm,
            $options: "i",
          },
        },
        {
          "customer.email": {
            $regex: searchTerm,
            $options: "i",
          },
        },
      ];
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .lean(),

      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      orders,
      pagination: {
        currentPage,
        totalPages: Math.ceil(totalOrders / pageSize),
        totalOrders,
        limit: pageSize,
      },
    });
  } catch (error) {
    console.error("Get all orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch orders.",
    });
  }
};

// ==========================================
// GET SINGLE ORDER - ADMIN
// ==========================================
export const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const isMongoId = mongoose.Types.ObjectId.isValid(id);

    const order = await Order.findOne(
      isMongoId
        ? { $or: [{ _id: id }, { orderId: id }] }
        : { orderId: id }
    ).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order details error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch order details.",
    });
  }
};

// ==========================================
// UPDATE ORDER STATUS - ADMIN
// ==========================================
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    const allowedPaymentStatuses = [
      "Pending",
      "Paid",
      "Failed",
      "Refunded",
    ];

    const update = {};

    if (status !== undefined) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order status.",
        });
      }

      update.status = status;
    }

    if (paymentStatus !== undefined) {
      if (!allowedPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status.",
        });
      }

      update.paymentStatus = paymentStatus;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide an order status or payment status.",
      });
    }

    const isMongoId = mongoose.Types.ObjectId.isValid(id);

    const order = await Order.findOneAndUpdate(
      isMongoId
        ? { $or: [{ _id: id }, { orderId: id }] }
        : { orderId: id },
      { $set: update },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order updated successfully.",
      order,
    });
  } catch (error) {
    console.error("Update order error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update order.",
    });
  }
};


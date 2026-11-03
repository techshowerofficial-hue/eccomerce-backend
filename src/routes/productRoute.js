import express from "express";

import {
  addProduct,
  productList,
  updateProduct,
  removeProduct,
} from "../controllers/productController.js";

import { upload } from "../middleware/multerMiddleware.js";

const productRouter = express.Router();

// Public APIs
productRouter.get("/list", productList);

// Admin APIs
productRouter.post("/add", upload.array("images", 5), addProduct);
productRouter.put("/update/:id", upload.single("image"), updateProduct);
productRouter.post("/remove", removeProduct);

export default productRouter;
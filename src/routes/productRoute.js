import express from "express";
import { addProduct, productList, updateProduct, removeProduct } from "../controllers/productController.js";
import { upload } from "../middleware/multerMiddleware.js";

const productRouter = express.Router();

// Public
productRouter.get("/list", productList);

// Admin endpoints: attach your admin authorization middleware here before deployment.
productRouter.post("/add", upload.array("images", 5), addProduct);
productRouter.put("/update/:id", upload.array("images", 5), updateProduct);
productRouter.post("/remove", removeProduct);

export default productRouter;

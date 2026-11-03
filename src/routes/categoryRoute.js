import express from "express";

import {
  addCategory,
  categoryList,
  updateCategory,
  removeCategory,
} from "../controllers/categoryController.js";

const categoryRouter = express.Router();

// Get all categories
categoryRouter.get("/list", categoryList);

// Add category
categoryRouter.post("/add", addCategory);

// Update category
categoryRouter.put("/update/:id", updateCategory);

// Delete category
categoryRouter.delete("/remove/:id", removeCategory);

export default categoryRouter;
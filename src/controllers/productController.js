
import productModel from "../models/productModels.js";
import fs from "fs/promises";
import path from "path";

const uploadDir = path.resolve("uploads");

// Helper: Remove uploaded files
const removeFiles = async (filenames = []) => {
  await Promise.all(
    filenames
      .filter(Boolean)
      .map((filename) =>
        fs.unlink(path.join(uploadDir, path.basename(filename))).catch(
          (error) => {
            if (error.code !== "ENOENT") {
              console.error("Image deletion error:", error.message);
            }
          }
        )
      )
  );
};

// Helper: Get all image filenames from a product
const getProductImages = (product) => {
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images;
  }

  // Backward compatibility with older products
  if (product.image) {
    return [product.image];
  }

  return [];
};

// Helper: Calculate discount percentage
const calculateDiscount = (marketPrice, sellingPrice) => {
  const mrp = Number(marketPrice);
  const price = Number(sellingPrice);

  if (
    !Number.isFinite(mrp) ||
    !Number.isFinite(price) ||
    mrp <= 0 ||
    price >= mrp
  ) {
    return 0;
  }

  return Math.round(((mrp - price) / mrp) * 100);
};

// Helper: Format product response
const formatProduct = (product) => {
  const item =
    typeof product.toObject === "function"
      ? product.toObject()
      : { ...product };

  item.images = getProductImages(item);

  // Discount is calculated on the server for API responses
  item.discountPercentage = calculateDiscount(
    item.marketPrice,
    item.price
  );

  return item;
};

// Add Product
const addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      descripation,
      price,
      marketPrice,
      category,
      stock,
    } = req.body;

    const productDescription = description || descripation;

    if (
      !name?.trim() ||
      !productDescription?.trim() ||
      price === undefined ||
      price === "" ||
      !category?.trim()
    ) {
      await removeFiles((req.files || []).map((file) => file.filename));

      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one product image.",
      });
    }

    const parsedPrice = Number(price);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      await removeFiles(req.files.map((file) => file.filename));

      return res.status(400).json({
        success: false,
        message: "Please enter a valid selling price.",
      });
    }

    // Market price is optional for backward compatibility
    let parsedMarketPrice = null;

    if (marketPrice !== undefined && marketPrice !== "") {
      parsedMarketPrice = Number(marketPrice);

      if (
        !Number.isFinite(parsedMarketPrice) ||
        parsedMarketPrice <= 0
      ) {
        await removeFiles(req.files.map((file) => file.filename));

        return res.status(400).json({
          success: false,
          message: "Market price must be greater than zero.",
        });
      }

      if (parsedMarketPrice < parsedPrice) {
        await removeFiles(req.files.map((file) => file.filename));

        return res.status(400).json({
          success: false,
          message: "Market price cannot be less than selling price.",
        });
      }
    }

    const parsedStock =
      stock === undefined || stock === "" ? 0 : Number(stock);

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      await removeFiles(req.files.map((file) => file.filename));

      return res.status(400).json({
        success: false,
        message: "Stock must be a non-negative whole number.",
      });
    }

    const imageNames = req.files.map((file) => file.filename);

    const product = new productModel({
      name: name.trim(),
      description: productDescription.trim(),
      price: parsedPrice,
      marketPrice: parsedMarketPrice,
      category: category.trim(),
      images: imageNames,
      stock: parsedStock,
      isAvailable: parsedStock > 0,
    });

    await product.save();

    return res.status(201).json({
      success: true,
      message: "Product added successfully!",
      data: formatProduct(product),
    });
  } catch (error) {
    console.error("Add product error:", error);

    await removeFiles((req.files || []).map((file) => file.filename));

    return res.status(500).json({
      success: false,
      message: "Failed to add product.",
      error: error.message,
    });
  }
};

// List Products
const productList = async (req, res) => {
  try {
    const products = await productModel.find({}).sort({ createdAt: -1 });

    const formattedProducts = products.map(formatProduct);

    return res.status(200).json({
      success: true,
      data: formattedProducts,
    });
  } catch (error) {
    console.error("Product list error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products.",
    });
  }
};

// Update Product
const updateProduct = async (req, res) => {
  let uploadedFiles = (req.files || []).map((file) => file.filename);

  try {
    const { id } = req.params;

    const {
      name,
      description,
      descripation,
      price,
      marketPrice,
      category,
      stock,
    } = req.body;

    const product = await productModel.findById(id);

    if (!product) {
      await removeFiles(uploadedFiles);

      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        await removeFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: "Product name cannot be empty.",
        });
      }

      product.name = name.trim();
    }

    if (description !== undefined || descripation !== undefined) {
      const updatedDescription = description ?? descripation;

      if (!updatedDescription?.trim()) {
        await removeFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: "Product description cannot be empty.",
        });
      }

      product.description = updatedDescription.trim();
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);

      if (price === "" || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
        await removeFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: "Please enter a valid selling price.",
        });
      }

      product.price = parsedPrice;
    }

    if (marketPrice !== undefined) {
      if (marketPrice === "") {
        product.marketPrice = null;
      } else {
        const parsedMarketPrice = Number(marketPrice);

        if (
          !Number.isFinite(parsedMarketPrice) ||
          parsedMarketPrice <= 0
        ) {
          await removeFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: "Market price must be greater than zero.",
          });
        }

        product.marketPrice = parsedMarketPrice;
      }
    }

    // Validate the final prices together, including unchanged values
    const finalSellingPrice = Number(product.price);
    const finalMarketPrice =
      product.marketPrice == null ? null : Number(product.marketPrice);

    if (
      finalMarketPrice !== null &&
      finalMarketPrice < finalSellingPrice
    ) {
      await removeFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "Market price cannot be less than selling price.",
      });
    }

    if (category !== undefined) {
      if (!category.trim()) {
        await removeFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: "Category cannot be empty.",
        });
      }

      product.category = category.trim();
    }

    if (stock !== undefined) {
      const parsedStock = Number(stock);

      if (
        stock === "" ||
        !Number.isInteger(parsedStock) ||
        parsedStock < 0
      ) {
        await removeFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: "Stock must be a non-negative whole number.",
        });
      }

      product.stock = parsedStock;
      product.isAvailable = parsedStock > 0;
    }

    // Replace images only when new images are uploaded
    if (uploadedFiles.length > 0) {
      const oldImages = getProductImages(product);

      product.images = uploadedFiles;

      await product.save();

      uploadedFiles = [];

      await removeFiles(oldImages);

      return res.status(200).json({
        success: true,
        message: "Product updated successfully!",
        data: formatProduct(product),
      });
    }

    // Migrate legacy single image field when saving an old product
    if (!product.images || product.images.length === 0) {
      product.images = getProductImages(product);
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully!",
      data: formatProduct(product),
    });
  } catch (error) {
    console.error("Update product error:", error);

    await removeFiles(uploadedFiles);

    return res.status(500).json({
      success: false,
      message: "Failed to update product.",
      error: error.message,
    });
  }
};

// Remove Product
const removeProduct = async (req, res) => {
  try {
    const { id } = req.body;

    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    await productModel.findByIdAndDelete(id);

    const imageNames = getProductImages(product);

    await removeFiles(imageNames);

    return res.status(200).json({
      success: true,
      message: "Product removed successfully!",
    });
  } catch (error) {
    console.error("Remove product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove product.",
    });
  }
};

export {
  addProduct,
  productList,
  updateProduct,
  removeProduct,
};


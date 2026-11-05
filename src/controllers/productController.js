import productModel from "../models/productModels.js";
import cloudinary from "../config/cloudinary.js";

// Upload one image to Cloudinary using its buffer
const uploadToCloudinary = (file) => {
return new Promise((resolve, reject) => {
const stream = cloudinary.uploader.upload_stream(
{
folder: "zivnel/products",
resource_type: "image",
},
(error, result) => {
if (error) {
return reject(error);
}


    resolve({
      url: result.secure_url,
      publicId: result.public_id,
    });
  }
);

stream.end(file.buffer);


});
};

// Upload multiple images
const uploadImages = async (files = []) => {
const uploadedImages = [];

try {
for (const file of files) {
const result = await uploadToCloudinary(file);
uploadedImages.push(result);
}


return uploadedImages;


} catch (error) {
// Delete successfully uploaded images if another upload fails
await deleteCloudinaryImages(
uploadedImages.map((image) => image.url)
);


throw error;


}
};

// Extract Cloudinary public ID from URL
const getPublicIdFromUrl = (imageUrl) => {
if (!imageUrl || !imageUrl.includes("res.cloudinary.com")) {
return null;
}

try {
const pathname = new URL(imageUrl).pathname;
const uploadIndex = pathname.indexOf("/upload/");


if (uploadIndex === -1) return null;

let publicId = pathname.substring(uploadIndex + 8);

// Remove version number
publicId = publicId.replace(/^v\d+\//, "");

// Remove image extension
publicId = publicId.replace(/\.[^/.]+$/, "");

return publicId || null;


} catch {
return null;
}
};

// Delete images from Cloudinary
const deleteCloudinaryImages = async (images = []) => {
await Promise.all(
images.map(async (image) => {
const publicId = getPublicIdFromUrl(image);


  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
  } catch (error) {
    console.error(
      "Cloudinary image deletion error:",
      error.message
    );
  }
})


);
};

// Get product images with backward compatibility
const getProductImages = (product) => {
if (Array.isArray(product.images) && product.images.length > 0) {
return product.images;
}

if (product.image) {
return [product.image];
}

return [];
};

// Calculate discount
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

// Format product response
const formatProduct = (product) => {
const item =
typeof product.toObject === "function"
? product.toObject()
: { ...product };

item.images = getProductImages(item);

item.discountPercentage = calculateDiscount(
item.marketPrice,
item.price
);

return item;
};

// ADD PRODUCT
const addProduct = async (req, res) => {
let uploadedImages = [];

try {
const {
name,
description,
descripation,
price,
marketPrice,
parentCategory,
category,
stock,
} = req.body;


const productDescription = description || descripation;

if (
  !name?.trim() ||
  !productDescription?.trim() ||
  price === undefined ||
  price === "" ||
  !parentCategory?.trim() ||
  !category?.trim()
) {
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
  return res.status(400).json({
    success: false,
    message: "Please enter a valid selling price.",
  });
}

let parsedMarketPrice = null;

if (marketPrice !== undefined && marketPrice !== "") {
  parsedMarketPrice = Number(marketPrice);

  if (
    !Number.isFinite(parsedMarketPrice) ||
    parsedMarketPrice <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Market price must be greater than zero.",
    });
  }

  if (parsedMarketPrice < parsedPrice) {
    return res.status(400).json({
      success: false,
      message: "Market price cannot be less than selling price.",
    });
  }
}

const parsedStock =
  stock === undefined || stock === "" ? 0 : Number(stock);

if (!Number.isInteger(parsedStock) || parsedStock < 0) {
  return res.status(400).json({
    success: false,
    message: "Stock must be a non-negative whole number.",
  });
}

// Upload images to Cloudinary
uploadedImages = await uploadImages(req.files);

const product = new productModel({
  name: name.trim(),
  description: productDescription.trim(),
  price: parsedPrice,
  marketPrice: parsedMarketPrice,
  parentCategory: parentCategory.trim(),
  category: category.trim(),
  images: uploadedImages.map((image) => image.url),
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


// Clean up uploaded images if product creation fails
await deleteCloudinaryImages(
  uploadedImages.map((image) => image.url)
);

return res.status(500).json({
  success: false,
  message: "Failed to add product.",
  error: error.message,
});


}
};

// LIST PRODUCTS
const productList = async (req, res) => {
try {
const products = await productModel
.find({})
.sort({ createdAt: -1 });


return res.status(200).json({
  success: true,
  data: products.map(formatProduct),
});


} catch (error) {
console.error("Product list error:", error);


return res.status(500).json({
  success: false,
  message: "Failed to fetch products.",
});


}
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
let uploadedImages = [];

try {
const { id } = req.params;


const {
  name,
  description,
  descripation,
  price,
  marketPrice,
  parentCategory,
  category,
  stock,
} = req.body;

const product = await productModel.findById(id);

if (!product) {
  return res.status(404).json({
    success: false,
    message: "Product not found.",
  });
}

if (name !== undefined) {
  if (!name.trim()) {
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
    return res.status(400).json({
      success: false,
      message: "Product description cannot be empty.",
    });
  }

  product.description = updatedDescription.trim();
}

if (price !== undefined) {
  const parsedPrice = Number(price);

  if (
    price === "" ||
    !Number.isFinite(parsedPrice) ||
    parsedPrice < 0
  ) {
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
      return res.status(400).json({
        success: false,
        message: "Market price must be greater than zero.",
      });
    }

    product.marketPrice = parsedMarketPrice;
  }
}

const finalSellingPrice = Number(product.price);
const finalMarketPrice =
  product.marketPrice == null
    ? null
    : Number(product.marketPrice);

if (
  finalMarketPrice !== null &&
  finalMarketPrice < finalSellingPrice
) {
  return res.status(400).json({
    success: false,
    message: "Market price cannot be less than selling price.",
  });
}

if (parentCategory !== undefined) {
  if (!parentCategory.trim()) {
    return res.status(400).json({
      success: false,
      message: "Parent category cannot be empty.",
    });
  }

  product.parentCategory = parentCategory.trim();
}

if (category !== undefined) {
  if (!category.trim()) {
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
    return res.status(400).json({
      success: false,
      message: "Stock must be a non-negative whole number.",
    });
  }

  product.stock = parsedStock;
  product.isAvailable = parsedStock > 0;
}

// Upload new images only if supplied
if (req.files && req.files.length > 0) {
  uploadedImages = await uploadImages(req.files);

  const oldImages = getProductImages(product);

  product.images = uploadedImages.map((image) => image.url);

  await product.save();

  // Delete old Cloudinary images after successful save
  await deleteCloudinaryImages(oldImages);

  return res.status(200).json({
    success: true,
    message: "Product updated successfully!",
    data: formatProduct(product),
  });
}

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


// Delete newly uploaded images if update fails
await deleteCloudinaryImages(
  uploadedImages.map((image) => image.url)
);

return res.status(500).json({
  success: false,
  message: "Failed to update product.",
  error: error.message,
});


}
};

// REMOVE PRODUCT
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

// Delete Cloudinary images
await deleteCloudinaryImages(getProductImages(product));

return res.status(200).json({
  success: true,
  message: "Product removed successfully!",
});


} catch (error) {
console.error("Remove product error:", error);


return res.status(500).json({
  success: false,
  message: "Failed to remove product.",
  error: error.message,
});


}
};

export {
addProduct,
productList,
updateProduct,
removeProduct,
};

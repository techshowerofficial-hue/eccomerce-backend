
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Customer ke liye actual selling price
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Original / Market Price (MRP)
    marketPrice: {
      type: Number,
      default: null,
      min: 0,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    images: {
      type: [String],
      required: true,
      validate: {
        validator: function (images) {
          return Array.isArray(images) && images.length > 0;
        },
        message: "At least one product image is required.",
      },
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Discount percentage calculate karne ke liye virtual field
productSchema.virtual("discountPercentage").get(function () {
  const marketPrice = Number(this.marketPrice);
  const sellingPrice = Number(this.price);

  if (
    !Number.isFinite(marketPrice) ||
    marketPrice <= 0 ||
    sellingPrice < 0 ||
    marketPrice <= sellingPrice
  ) {
    return 0;
  }

  return Math.round(
    ((marketPrice - sellingPrice) / marketPrice) * 100
  );
});

// Virtual fields ko JSON response mein include karna
productSchema.set("toJSON", {
  virtuals: true,
});

productSchema.set("toObject", {
  virtuals: true,
});

const productModel =
  mongoose.models.product ||
  mongoose.model("product", productSchema);

export default productModel;


import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    marketPrice: { type: Number, default: null, min: 0 },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      required: true,
    },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (images) => Array.isArray(images) && images.length > 0,
        message: "At least one product image is required.",
      },
    },
    stock: { type: Number, default: 0, min: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.virtual("discountPercentage").get(function () {
  const mrp = Number(this.marketPrice);
  const sellingPrice = Number(this.price);
  if (!Number.isFinite(mrp) || mrp <= 0 || sellingPrice < 0 || mrp <= sellingPrice) return 0;
  return Math.round(((mrp - sellingPrice) / mrp) * 100);
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

const productModel = mongoose.models.product || mongoose.model("product", productSchema);
export default productModel;

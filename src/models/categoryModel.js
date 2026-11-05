import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
{
name: {
type: String,
required: true,
trim: true,
unique: true,
},


image: {
  type: String,
  default: "",
},

// null = Parent Category
// ObjectId = Child Category ka Parent ID
parentCategory: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "category",
  default: null,
},

isActive: {
  type: Boolean,
  default: true,
},


},
{
timestamps: true,
}
);

const categoryModel =
mongoose.models.category ||
mongoose.model("category", categorySchema);

export default categoryModel;

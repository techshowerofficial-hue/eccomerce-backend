import mongoose from "mongoose";

export const connectDB = async () => {
try {
const mongoURI = process.env.MONGO_URI;


if (!mongoURI) {
  throw new Error("MONGO_URI is missing in .env file");
}

await mongoose.connect(mongoURI);

console.log("DB connected successfully");


} catch (error) {
console.error("Database connection failed:", error.message);
throw error;
}
};

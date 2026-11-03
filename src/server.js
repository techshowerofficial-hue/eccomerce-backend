import express from "express"
import cors from "cors"
import { connectDB } from "./config/db.js";
import userRouter from "./routes/userRoute.js";
import 'dotenv/config'
import productRouter from "./routes/productRoute.js";
import categoryRouter from "./routes/categoryRoute.js";
import orderRoutes from "./routes/orderRoutes.js";
import { log } from "console";
//app config

const app = express();
const port = process.env.PORT || 4000;

//middleware

app.use(express.json())
app.use(cors())

// db connection

connectDB();

//api endpoint

app.use("/api/user", userRouter);
app.use("/api/products", productRouter);
app.use("/images", express.static('uploads'))
app.use("/api/categories", categoryRouter);
app.use("/api/orders", orderRoutes);
app.get("/", (req, res) => {
    res.send("Api Working...")
})
app.get("/healthz", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Nile Ecommerce Backend is running",
  });
});
app.get("/", (req, res) => {
    res.send("Hii 👋 Welcome to Nile Ecommerce!");
});
app.listen(port, () => {
    console.log(`Server start on http://localhost:${port}`);

})


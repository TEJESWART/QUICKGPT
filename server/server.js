import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./configs/db.js";
import userRouter from "./routes/userRoutes.js";
import chatRouter from "./routes/chatRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import creditRouter from "./routes/creditRoutes.js";
import { stripeWebhooks } from "./controllers/webhooks.js";

const app = express();

// ✅ Connect DB
await connectDB();

// ✅ Stripe Webhooks (must use raw body)
app.post("/api/stripe", express.raw({ type: "application/json" }), stripeWebhooks);

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Routes
app.get("/", (req, res) => res.send("Server is Live!"));
app.use("/api/user", userRouter);
app.use("/api/chat", chatRouter);
app.use("/api/message", messageRouter);
app.use("/api/credit", creditRouter);

// ❌ Remove app.listen()
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ✅ Export app for Vercel
export default app;

// ⚠️ Stripe requires raw body → disable default bodyParser
export const config = {
  api: {
    bodyParser: false,
  },
};

import express from "express";
import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/messages.route.js";
import cors from "cors";
import { ENV } from "./lib/env.js";


import { connectDB } from "./lib/db.js";
import { env } from "process";
dotenv.config();

const app = express();
const __dirname = path.resolve();

const PORT = process.env.PORT || 3000;

app.use(express.json()); //middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true }));//middleware to parse URL-encoded bodies
app.use(cookieParser()); //middleware to parse cookies


app.use(
  cors({
    origin: ENV.CLIENT_URL,
    credentials: true,
  })
);


app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

//make ready deployment
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Initialize server with database connection
const initializeServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log("Server is running on port " + PORT);
    });
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
};

initializeServer();

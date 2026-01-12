import express from "express";
import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/messages.route.js";
import friendRoutes from "./routes/friend.route.js";
import userRoutes from "./routes/user.route.js";
import cors from "cors";
import { ENV } from "./lib/env.js";
import { app, server } from "./lib/socket.js";
import callRoutes from "./routes/call.route.js";
import { connectDB } from "./lib/db.js";

dotenv.config();


const __dirname = path.resolve();

const PORT = ENV.PORT || 3000;

app.use(express.json({ limit: "10mb" })); //middleware to parse JSON bodies
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser()); //middleware to parse cookies


app.use(
  cors({
    origin: ENV.CLIENT_URL,
    credentials: true,
  })
);


app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/users", userRoutes);

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
    server.listen(PORT, () => {
      console.log("Server is running on port " + PORT);
    });
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
};

initializeServer();

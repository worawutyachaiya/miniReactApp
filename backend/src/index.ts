import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";

dotenv.config();
const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: ['http://localhost:8081', 'http://192.168.1.107:8081', 'exp://192.168.1.107:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  console.log("Health check endpoint accessed");
  res.json({ 
    message: "Expense Tracker API is running...",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.get("/", (req, res) => {
  console.log("Health check endpoint accessed");
  res.json({ 
    message: "Expense Tracker API is running...",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(`Error occurred at ${new Date().toISOString()}:`, err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Something went wrong!',
    timestamp: new Date().toISOString(),
    path: req.url
  });
});

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://192.168.1.107:${PORT}`);
});

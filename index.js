import { Prisma, PrismaClient } from "@prisma/client";
import axios from "axios";
import express from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

const requiredEnvVars = ['DATABASE_URL', 'USER_SERVICE_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const USER_URL = process.env.USER_SERVICE_URL;

app.use(helmet());
app.use(bodyParser.json({ limit: '10kb' }));


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: "Too many requests, please try again later."
    }
});

app.use(limiter);

const validateOrderInput = (req, res, next) => {
  const { user_id, order_details } = req.body;

  if (!user_id || typeof user_id !== 'number') {
    return res.status(400).json({ error: "user_id must be a number" });
  }

  if (!order_details || typeof order_details !== 'string') {
    return res.status(400).json({ error: "order_details must be a JSON string" });
  }

  try {
    const parsedDetails = JSON.parse(order_details);
    if (!parsedDetails.items || !Array.isArray(parsedDetails.items)) {
      return res.status(400).json({ error: "order_details must contain items array" });
    }
    if (typeof parsedDetails.totalAmount !== 'number') {
      return res.status(400).json({ error: "totalAmount must be a number" });
    }
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON in order_details" });
  }

  next();
};

app.post("/order", validateOrderInput, async (req, res) => {
  const { user_id, order_details } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: user_id }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newOrder = await prisma.orders.create({
      data: {
        user_id,
        order_details,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.info(`Created order ${newOrder.order_id} for user ${user_id}`);
    }

    try {
      await axios.post(USER_URL, {
        user_id,
        message: "Your order has been placed successfully!",
      });

      return res.status(201).json({ 
        order_id: newOrder.order_id,
        message: "Order placed and user notified"
      });
    } catch (notifyError) {
      console.error('Notification service error:', {
        error_name: notifyError.name,
        error_message: notifyError.message,
        stack: process.env.NODE_ENV === 'development' ? notifyError.stack : undefined
      });

      return res.status(201).json({ 
        order_id: newOrder.order_id,
        message: "Order created but notification failed"
      });
    }
  } catch (error) {
    console.error('Error processing order:', {
      error_name: error.name,
      error_message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(400).json({ 
        error: "Database operation failed",
        code: error.code
      });
    }

    return res.status(500).json({ 
      error: "Internal server error",
      request_id: req.id
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
import { Prisma, PrismaClient } from "@prisma/client";
import axios from "axios";
import express from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

const requestLogger = (req, res, next) => {
  req.requestTime = new Date().toISOString();
  req.requestId = Math.random().toString(36).substring(7);
  
  // Log incoming request
  console.log({
    timestamp: req.requestTime,
    request_id: req.requestId,
    type: 'REQUEST',
    endpoint: req.path,
    method: req.method,
    payload: req.body
  });
  
  next();
};

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

app.use(requestLogger);

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
  const { requestId, requestTime } = req;

  try {
    // Log user check
    console.log({
      timestamp: new Date().toISOString(),
      request_id: requestId,
      type: 'PROCESS',
      step: 'Checking user existence',
      user_id
    });

    const user = await prisma.user.findUnique({
      where: { id: user_id }
    });

    if (!user) {
      const response = { error: "User not found" };
      console.log({
        timestamp: new Date().toISOString(),
        request_id: requestId,
        type: 'RESPONSE',
        status: 404,
        body: response
      });
      return res.status(404).json(response);
    }

    // Log order creation
    console.log({
      timestamp: new Date().toISOString(),
      request_id: requestId,
      type: 'PROCESS',
      step: 'Creating order',
      user_id
    });

    const newOrder = await prisma.orders.create({
      data: {
        user_id,
        order_details,
      },
    });

    try {
      // Log notification attempt
      console.log({
        timestamp: new Date().toISOString(),
        request_id: requestId,
        type: 'PROCESS',
        step: 'Sending notification',
        order_id: newOrder.order_id
      });

      await axios.post(USER_URL, {
        user_id,
        message: "Your order has been placed successfully!",
      });

      const response = { 
        order_id: newOrder.order_id,
        message: "Order placed and user notified"
      };

      // Log successful response
      console.log({
        timestamp: new Date().toISOString(),
        request_id: requestId,
        type: 'RESPONSE',
        status: 201,
        body: response
      });

      return res.status(201).json(response);
    } catch (notifyError) {
      // Log notification error
      console.error({
        timestamp: new Date().toISOString(),
        request_id: requestId,
        type: 'ERROR',
        step: 'Notification failed',
        error: {
          name: notifyError.name,
          message: notifyError.message
        }
      });

      const response = { 
        order_id: newOrder.order_id,
        message: "Order created but notification failed"
      };

      console.log({
        timestamp: new Date().toISOString(),
        request_id: requestId,
        type: 'RESPONSE',
        status: 201,
        body: response
      });

      return res.status(201).json(response);
    }
  } catch (error) {
    // Log processing error
    console.error({
      timestamp: new Date().toISOString(),
      request_id: requestId,
      type: 'ERROR',
      step: 'Order processing',
      error: {
        name: error.name,
        message: error.message
      }
    });

    const response = error instanceof Prisma.PrismaClientKnownRequestError 
      ? { error: "Database operation failed", code: error.code }
      : { error: "Internal server error" };

    console.log({
      timestamp: new Date().toISOString(),
      request_id: requestId,
      type: 'RESPONSE',
      status: error instanceof Prisma.PrismaClientKnownRequestError ? 400 : 500,
      body: response
    });

    return res.status(error instanceof Prisma.PrismaClientKnownRequestError ? 400 : 500)
      .json(response);
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
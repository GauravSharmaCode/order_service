// Order Service
// Responsible for creating orders.
// Notifies the User Service when an order is placed.

// Tables:
// 1. Orders Table
// Column Name	Data Type	Description
// order_id	INT (PK)	Unique identifier for each order
// user_id	INT	ID of the user who placed the order
// order_details	VARCHAR	Details of the order
// created_at	TIMESTAMP	Timestamp when the order was created

// API Endpoints:
// Order Service:
// Create Order
// Endpoint: POST /order
// Request Body:
// Response:
// 201 Created: Order placed and user notified.
// 500 Internal Server Error: If notification fails
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function createAndFetchOrder() {
  try {
    // Creating a new order
    const newOrder = await prisma.order.create({
      data: {
        userId: 1, // Change this based on an existing user ID
        product: "Laptop",
        amount: 999.99,
      },
    });

    console.log("New Order Created:", newOrder);

    // Fetching all orders
    const orders = await prisma.order.findMany();
    console.log("All Orders:", orders);
  } catch (error) {
    console.error("Error creating/fetching order:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createAndFetchOrder();

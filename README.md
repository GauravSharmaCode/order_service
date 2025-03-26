# Order Service

A microservice for handling order management and user notifications with PostgreSQL and Express.js.

## Features
- Order creation and management
- Automatic user notifications
- Rate limiting (100 requests/15min)
- Security headers with Helmet
- Request size limiting (10kb)
- PostgreSQL with Prisma ORM
- Comprehensive input validation
- Environment-based logging

## Prerequisites
- Node.js (v20 or higher)
- PostgreSQL
- npm

## Installation

1. Clone and setup:
```bash
git clone https://github.com/GauravSharmaCode/order_service.git
cd order_service
npm install
```

2. Environment Configuration:
Create `.env` file:
```properties
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/your_database"
USER_SERVICE_URL="http://localhost:4000/notify"
PORT=3000
```

3. Database Setup:
```bash
npx prisma generate
npx prisma migrate dev
```

## API Endpoints

### Create Order
```http
POST /order
Content-Type: application/json

{
    "user_id": 1,
    "order_details": "{
        \"items\": [
            { \"productId\": 1, \"quantity\": 2 },
            { \"productId\": 2, \"quantity\": 1 }
        ],
        \"totalAmount\": 99.99,
        \"shippingAddress\": \"123 Test Street, Test City\"
    }"
}
```

**Success Response (201 Created)**
```json
{
    "order_id": 1,
    "message": "Order placed and user notified"
}
```

**Error Responses**
- `400`: Invalid input
- `404`: User not found
- `429`: Rate limit exceeded
- `500`: Server error

## Database Schema

```prisma
model User {
    id        Int      @id @default(autoincrement())
    name      String
    email     String   @unique
    password  String
    createdAt DateTime @default(now())
    orders    orders[]
}

model orders {
    order_id      Int      @id @default(autoincrement())
    user_id       Int
    order_details String
}
```

## Testing
```bash
node test.js
```

## Running the Service

**Development**
```bash
npm run dev
```

**Production**
```bash
set NODE_ENV=production
npm start
```

## Security Features
- Request rate limiting (100 requests/15min)
- Payload size limits (10kb)
- Helmet security headers
- Input validation
- Environment-based error details
- Graceful shutdown handling

## Dependencies
- express: Web framework
- @prisma/client: Database ORM
- axios: HTTP client
- dotenv: Environment configuration
- helmet: Security headers
- express-rate-limit: Request limiting
- body-parser: Request parsing

## Author
Gaurav Sharma
- GitHub: [@GauravSharmaCode](https://github.com/GauravSharmaCode)
- Email: shrma.gurv@gmail.com

## License
ISC

## Additional Resources
- [Prisma Documentation](https://pris.ly/d/prisma-schema)
- [Express.js Documentation](https://expressjs.com/)
- [Helmet Documentation](https://helmetjs.github.io/)
````

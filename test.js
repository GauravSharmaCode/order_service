import axios from 'axios';
import 'dotenv/config';


const TEST_URL = process.env.TEST_URL || "http://localhost:3000/order";

async function testOrderEndpoint() {
    console.log('\n Starting order service tests...\n');

    const testOrder = {
        user_id: 1,
        order_details: JSON.stringify({
            items: [
                { productId: 1, quantity: 2 },
                { productId: 2, quantity: 1 }
            ],
            totalAmount: 99.99,
            shippingAddress: "123 Test Street, Test City"
        })
    };

    try {
        // Test creating a new order
        const response = await axios.post(TEST_URL, testOrder, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Test 1: Check if response is successful
        console.log('Test 1: Response Status');
        console.log('Expected: 201');
        console.log('Received:', response.status);
        console.log('Result:', response.status === 201 ? 'PASS' : 'FAIL');

        // Test 2: Check response data structure
        console.log('\nTest 2: Response Data Structure');
        console.log('Expected: orderId exists');
        console.log('Received:', response.data);

    } catch (error) {
        if (error.response) {
            console.error('\nTest failed with status:', error.response.status);
            console.error('Error data:', error.response.data);
        } else if (error.request) {
            console.error('\nNo response received. Is the server running?');
        } else {
            console.error('\nError:', error.message);
        }
    }
}

// Run the test
testOrderEndpoint();
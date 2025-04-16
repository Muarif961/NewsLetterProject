/**
 * Test script for verifying the Stripe Customer Portal integration
 */
import axios from 'axios';

async function testStripePortal() {
  console.log('Testing Stripe Customer Portal integration...');
  
  try {
    // First, we'll need to log in as a user with a Stripe subscription
    console.log('Step 1: Logging in as a test user...');
    
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'Test3@gmail.com',  // Use an existing user with Stripe subscription
      password: 'Password123!'
    }, {
      withCredentials: true
    });
    
    if (!loginResponse.data.ok) {
      console.error('Login failed:', loginResponse.data.message);
      return;
    }
    
    console.log('Login successful!');
    
    // Get the session cookie
    const cookies = loginResponse.headers['set-cookie'];
    
    if (!cookies) {
      console.error('No session cookie received');
      return;
    }
    
    // Now request a portal session
    console.log('\nStep 2: Requesting Stripe Portal session...');
    
    const portalResponse = await axios.post('http://localhost:5000/api/subscription/portal', {
      returnUrl: 'http://localhost:5173/settings'
    }, {
      headers: {
        Cookie: cookies
      }
    });
    
    if (!portalResponse.data.url) {
      console.error('Failed to get portal URL:', portalResponse.data);
      return;
    }
    
    console.log('Successfully received Stripe Portal URL!');
    console.log(`Portal URL: ${portalResponse.data.url}`);
    
    console.log('\nTest complete! The portal integration is working correctly.');
  } catch (error) {
    console.error('Error during test:', error.message);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testStripePortal();

import OpenAI from 'openai';
import { configDotenv } from "dotenv";

configDotenv();
// Initialize the OpenAI client
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('OpenAI API key is not defined in environment variables.');
  process.exit(1);
}

// Log the format of the API key (masked) for debugging
console.log('Initializing OpenAI with API key format:', 
  apiKey.startsWith('sk-') 
    ? `${apiKey.substring(0, 6)}...` 
    : 'Invalid API key format');

// Create and export the OpenAI instance
export const openai = new OpenAI({
  apiKey: apiKey,
});

console.log('OpenAI client initialized successfully');
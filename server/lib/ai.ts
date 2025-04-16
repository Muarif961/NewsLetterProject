import OpenAI from "openai";
import { load } from "cheerio";
import NewsAPI from "newsapi";
import { 
  validateCredits, 
  reserveCredits, 
  finalizeCredits, 
  calculateTokenCost, 
  CREDIT_COSTS
} from "./subscription-tracker";

import { configDotenv } from "dotenv";

configDotenv();

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const newsapi = new NewsAPI(process.env.NEWS_API_KEY);

/**
 * Enhanced AI Text Generation with Credit Tracking
 */
export async function generateAIText(
  userId: number,
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  } = {}
) {
  // Set default options
  const model = options.model || "gpt-4o";
  const maxTokens = options.maxTokens || 1000;
  const temperature = options.temperature || 0.7;
  const systemPrompt = options.systemPrompt || 
    "You are a helpful AI assistant that provides clear, concise, and accurate information.";
  
  try {
    // Roughly estimate token count for credit reservation
    // This is a rough estimate since we don't know exactly how many tokens will be used
    const estimatedPromptTokens = Math.ceil(prompt.length / 4); // ~4 chars per token as a rough estimate
    const estimatedSystemTokens = Math.ceil(systemPrompt.length / 4);
    const estimatedMaxOutputTokens = maxTokens;
    const estimatedTotalTokens = estimatedPromptTokens + estimatedSystemTokens + estimatedMaxOutputTokens;
    
    // Convert tokens to credit cost (1 credit per 1000 tokens)
    const estimatedQuantity = calculateTokenCost(estimatedTotalTokens);
    
    // First, check if user has enough credits
    const creditCheck = await validateCredits(userId, 'TEXT_GENERATION', estimatedQuantity);
    
    if (!creditCheck.hasEnoughCredits) {
      throw new Error(`Insufficient credits. Required: ${creditCheck.creditCost}, Available: ${creditCheck.creditsRemaining}`);
    }
    
    // Reserve credits before the operation
    const reservation = await reserveCredits(
      userId, 
      'TEXT_GENERATION', 
      estimatedQuantity,
      estimatedTotalTokens
    );
    
    try {
      // Make the OpenAI API call
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: temperature,
        max_tokens: maxTokens
      });
      
      // Extract the actual token usage for accurate crediting
      const actualPromptTokens = response.usage?.prompt_tokens || estimatedPromptTokens;
      const actualCompletionTokens = response.usage?.completion_tokens || estimatedMaxOutputTokens;
      const actualTotalTokens = response.usage?.total_tokens || estimatedTotalTokens;
      
      // Calculate actual cost based on real usage
      const actualQuantity = calculateTokenCost(actualTotalTokens);
      
      // Finalize the credit transaction with actual usage
      await finalizeCredits(
        userId,
        reservation.transactionId,
        true, // Success
        {
          tokenCount: actualTotalTokens,
          detail: `Used ${actualQuantity} credit(s) for text generation (${actualTotalTokens} tokens, ${actualPromptTokens} prompt + ${actualCompletionTokens} completion)`
        }
      );
      
      return {
        success: true,
        text: response.choices[0]?.message?.content || "",
        usage: {
          promptTokens: actualPromptTokens,
          completionTokens: actualCompletionTokens,
          totalTokens: actualTotalTokens,
          creditCost: actualQuantity
        }
      };
    } catch (error) {
      // If the API call fails, roll back the credit reservation
      await finalizeCredits(
        userId,
        reservation.transactionId,
        false, // Failure
        {
          detail: `Failed text generation operation: ${(error as Error).message}`
        }
      );
      
      throw error;
    }
  } catch (error) {
    console.error("Error generating AI text:", error);
    throw error;
  }
}

/**
 * Enhanced Image Generation with Credit Tracking
 */
export async function generateAIImage(
  userId: number,
  prompt: string,
  options: {
    size?: "1024x1024" | "1792x1024" | "1024x1792";
    quality?: "standard" | "hd";
    style?: "natural" | "vivid";
  } = {}
) {
  // Set default options
  const size = options.size || "1024x1024";
  const quality = options.quality || "standard";
  const style = options.style || "natural";
  
  try {
    // Each image costs 5 credits according to the specified rules
    const creditCost = CREDIT_COSTS.IMAGE_GENERATION;
    
    // First, check if user has enough credits
    const creditCheck = await validateCredits(userId, 'IMAGE_GENERATION');
    
    if (!creditCheck.hasEnoughCredits) {
      throw new Error(`Insufficient credits. Required: ${creditCheck.creditCost}, Available: ${creditCheck.creditsRemaining}`);
    }
    
    // Reserve credits before the operation
    const reservation = await reserveCredits(
      userId, 
      'IMAGE_GENERATION'
    );
    
    try {
      // Make the OpenAI API call
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: size,
        quality: quality,
        style: style
      });
      
      // Finalize the credit transaction
      await finalizeCredits(
        userId,
        reservation.transactionId,
        true, // Success
        {
          detail: `Used ${creditCost} credit(s) for image generation (${size}, ${quality} quality)`
        }
      );
      
      return {
        success: true,
        imageUrl: response.data[0].url,
        revisedPrompt: response.data[0].revised_prompt,
        creditCost
      };
    } catch (error) {
      // If the API call fails, roll back the credit reservation
      await finalizeCredits(
        userId,
        reservation.transactionId,
        false, // Failure
        {
          detail: `Failed image generation operation: ${(error as Error).message}`
        }
      );
      
      throw error;
    }
  } catch (error) {
    console.error("Error generating AI image:", error);
    throw error;
  }
}

/**
 * Enhanced Image Variation with Credit Tracking
 */
export async function createImageVariation(
  userId: number,
  imageBuffer: Buffer,
  options: {
    n?: number;
    size?: "1024x1024";
  } = {}
) {
  // Set default options
  const n = options.n || 1;
  const size = options.size || "1024x1024";
  
  try {
    // Image variations cost 3 credits per image
    const creditCost = CREDIT_COSTS.IMAGE_VARIATION * n;
    
    // First, check if user has enough credits
    const creditCheck = await validateCredits(userId, 'IMAGE_VARIATION', n);
    
    if (!creditCheck.hasEnoughCredits) {
      throw new Error(`Insufficient credits. Required: ${creditCheck.creditCost}, Available: ${creditCheck.creditsRemaining}`);
    }
    
    // Reserve credits before the operation
    const reservation = await reserveCredits(
      userId, 
      'IMAGE_VARIATION',
      n
    );
    
    try {
      // Make the OpenAI API call
      const response = await openai.images.createVariation({
        image: imageBuffer,
        n: n,
        size: size
      });
      
      // Finalize the credit transaction
      await finalizeCredits(
        userId,
        reservation.transactionId,
        true, // Success
        {
          detail: `Used ${creditCost} credit(s) for generating ${n} image variation(s)`
        }
      );
      
      return {
        success: true,
        images: response.data.map(img => img.url),
        creditCost
      };
    } catch (error) {
      // If the API call fails, roll back the credit reservation
      await finalizeCredits(
        userId,
        reservation.transactionId,
        false, // Failure
        {
          detail: `Failed image variation operation: ${(error as Error).message}`
        }
      );
      
      throw error;
    }
  } catch (error) {
    console.error("Error creating image variation:", error);
    throw error;
  }
}

/**
 * Enhanced Image Edit with Credit Tracking
 */
export async function editImage(
  userId: number,
  imageBuffer: Buffer,
  maskBuffer: Buffer,
  prompt: string,
  options: {
    n?: number;
    size?: "1024x1024";
  } = {}
) {
  // Set default options
  const n = options.n || 1;
  const size = options.size || "1024x1024";
  
  try {
    // Image editing costs 4 credits per image
    const creditCost = CREDIT_COSTS.IMAGE_EDIT * n;
    
    // First, check if user has enough credits
    const creditCheck = await validateCredits(userId, 'IMAGE_EDIT', n);
    
    if (!creditCheck.hasEnoughCredits) {
      throw new Error(`Insufficient credits. Required: ${creditCheck.creditCost}, Available: ${creditCheck.creditsRemaining}`);
    }
    
    // Reserve credits before the operation
    const reservation = await reserveCredits(
      userId, 
      'IMAGE_EDIT',
      n
    );
    
    try {
      // Make the OpenAI API call
      const response = await openai.images.edit({
        image: imageBuffer,
        mask: maskBuffer,
        prompt: prompt,
        n: n,
        size: size
      });
      
      // Finalize the credit transaction
      await finalizeCredits(
        userId,
        reservation.transactionId,
        true, // Success
        {
          detail: `Used ${creditCost} credit(s) for editing ${n} image(s)`
        }
      );
      
      return {
        success: true,
        images: response.data.map(img => img.url),
        creditCost
      };
    } catch (error) {
      // If the API call fails, roll back the credit reservation
      await finalizeCredits(
        userId,
        reservation.transactionId,
        false, // Failure
        {
          detail: `Failed image edit operation: ${(error as Error).message}`
        }
      );
      
      throw error;
    }
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
}

/**
 * Enhanced Text Enhancement with Credit Tracking
 */
export async function enhanceText(
  userId: number,
  originalText: string,
  instructions: string
) {
  try {
    // Estimate token count for credit reservation
    const estimatedPromptTokens = Math.ceil((originalText.length + instructions.length) / 4);
    const estimatedMaxOutputTokens = Math.ceil(originalText.length / 4) * 1.5; // Assume 1.5x original length
    const estimatedTotalTokens = estimatedPromptTokens + estimatedMaxOutputTokens;
    
    // Convert tokens to credit cost
    const estimatedQuantity = calculateTokenCost(estimatedTotalTokens);
    
    // First, check if user has enough credits
    const creditCheck = await validateCredits(userId, 'TEXT_ENHANCEMENT', estimatedQuantity);
    
    if (!creditCheck.hasEnoughCredits) {
      throw new Error(`Insufficient credits. Required: ${creditCheck.creditCost}, Available: ${creditCheck.creditsRemaining}`);
    }
    
    // Reserve credits before the operation
    const reservation = await reserveCredits(
      userId, 
      'TEXT_ENHANCEMENT', 
      estimatedQuantity,
      estimatedTotalTokens
    );
    
    try {
      // Make the OpenAI API call
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert content enhancer. Your job is to modify text according to specific instructions.
Follow the user's instructions carefully and return ONLY the enhanced text with no additional explanations, comments, or formatting.
Keep the same general meaning but improve according to the instructions provided.`
          },
          {
            role: "user",
            content: `Original text: "${originalText}"
            
Instructions: ${instructions}

Please enhance the text according to these instructions. Return only the enhanced text.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // Extract the actual token usage for accurate crediting
      const actualPromptTokens = response.usage?.prompt_tokens || estimatedPromptTokens;
      const actualCompletionTokens = response.usage?.completion_tokens || estimatedMaxOutputTokens;
      const actualTotalTokens = response.usage?.total_tokens || estimatedTotalTokens;
      
      // Calculate actual cost based on real usage
      const actualQuantity = calculateTokenCost(actualTotalTokens);
      
      // Finalize the credit transaction with actual usage
      await finalizeCredits(
        userId,
        reservation.transactionId,
        true, // Success
        {
          tokenCount: actualTotalTokens,
          detail: `Used ${actualQuantity} credit(s) for text enhancement (${actualTotalTokens} tokens)`
        }
      );
      
      return {
        success: true,
        enhancedText: response.choices[0]?.message?.content?.trim() || "",
        usage: {
          promptTokens: actualPromptTokens,
          completionTokens: actualCompletionTokens,
          totalTokens: actualTotalTokens,
          creditCost: actualQuantity
        }
      };
    } catch (error) {
      // If the API call fails, roll back the credit reservation
      await finalizeCredits(
        userId,
        reservation.transactionId,
        false, // Failure
        {
          detail: `Failed text enhancement operation: ${(error as Error).message}`
        }
      );
      
      throw error;
    }
  } catch (error) {
    console.error("Error enhancing text:", error);
    throw error;
  }
}
import OpenAI from "openai";
import { load } from "cheerio";
import { ChatOpenAI } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { loadSummarizationChain } from "langchain/chains";

import { configDotenv } from "dotenv";

configDotenv();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 30000,
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const model = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 30000,
});

interface NewsArticle {
  url: string;
  title: string;
  description: string;
  content: string;
  publishedAt: string;
  source: string;
  urlToImage?: string;
  category: string;
  selected?: boolean;
}

interface CuratedContent {
  title: string;
  content: string;
  sections?: {
    title: string;
    content: string;
  }[];
  sourceUrl?: string;
  style?: string;
  images?: {
    headerImage?: string;
    bodyImages?: string[];
  };
}

async function generateImages(prompt: string, count: number = 1): Promise<string[]> {
  try {
    console.log(`Generating ${count} images with prompt:`, prompt);
    const urls: string[] = [];

    for (let i = 0; i < count; i++) {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: `Generate a professional, high-quality image for a newsletter that ${prompt}. The image should be clear, engaging, and suitable for business communication.`,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url",
      });

      if (response.data[0]?.url) {
        console.log(`Generated image URL ${i + 1}:`, response.data[0].url);
        urls.push(response.data[0].url);
      }
    }

    return urls;
  } catch (error) {
    console.error("Error generating images:", error);
    return [];
  }
}

export async function generateAINewsletter(
  categories: string[],
  userId?: string,
  includeImages: boolean = true
): Promise<CuratedContent> {
  try {
    console.log("Starting AI newsletter generation with images:", includeImages);
    const newsArticles = await getNewsContent(categories);
    console.log(`Processing ${newsArticles.length} articles for AI generation`);

    const systemMessage = `You are an expert newsletter curator with deep expertise in ${categories.join(", ")}. 
Create an engaging and informative newsletter with the following structure:

{
  "title": "Newsletter title",
  "content": "Brief introduction",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content"
    }
  ],
  "headerImagePrompt": "Detailed description for header image",
  "bodyImagePrompt": "Detailed description for body image"
}

Guidelines:
1. Make headlines informative yet engaging
2. Focus on the most impactful stories
3. Create clear, value-driven descriptions
4. Include specific details and numbers
5. Maintain professional tone
6. Create smooth transitions
7. Prioritize recent developments
8. Add a compelling summary

${includeImages ? 'For image prompts, be very specific and descriptive to ensure high-quality, relevant images are generated.' : ''}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: JSON.stringify({
            categories,
            articles: newsArticles,
            userId,
            includeImages
          }),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    let content = JSON.parse(completion.choices[0].message.content);
    console.log("Generated content structure:", content);

    // Generate images if enabled
    if (includeImages) {
      console.log("Generating images for newsletter with prompts:", {
        header: content.headerImagePrompt,
        body: content.bodyImagePrompt
      });

      const [headerImages, bodyImages] = await Promise.all([
        generateImages(content.headerImagePrompt, 1),
        generateImages(content.bodyImagePrompt, 1)
      ]);

      // Add images to content structure
      content = {
        ...content,
        images: {
          headerImage: headerImages[0],
          bodyImages: bodyImages
        }
      };

      // Insert image blocks into sections
      if (headerImages[0]) {
        content.sections = [
          {
            title: "Header Image",
            content: headerImages[0],
            type: "image"
          },
          ...(content.sections || [])
        ];
      }

      if (bodyImages[0]) {
        // Insert body image after the first section
        content.sections = content.sections ? [...content.sections.slice(0,1), {
          title: "Body Image",
          content: bodyImages[0],
          type: "image"
        }, ...content.sections.slice(1)] : [{
          title: "Body Image",
          content: bodyImages[0],
          type: "image"
        }];
      }

      console.log("Final content with images:", content);
    }

    return content;
  } catch (error) {
    console.error("Failed to generate AI newsletter:", error);
    throw new Error(
      `Failed to generate newsletter: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Cache news content to avoid hitting rate limits
const cache = new Map<string, { data: NewsArticle[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getNewsContent(
  categories: string[],
): Promise<NewsArticle[]> {
  try {
    console.log(
      `Fetching news content for Event Registry categories:`,
      categories,
    );

    const cacheKey = categories.sort().join(",");
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("Returning cached news content");
      return cached.data;
    }

    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    // Format date to YYYY-MM-DD as required by Event Registry
    const dateFormat = (date: Date) => date.toISOString().split("T")[0];

    const allArticles: NewsArticle[] = [];

    for (const category of categories) {
      console.log(`Fetching articles for category URI: ${category}`);
      try {
        const baseUrl = "https://eventregistry.org/api/v1/article/getArticles";
        const params = new URLSearchParams({
          apiKey: process.env.EVENT_REGISTRY_API_KEY || "",
          categoryUri: category,
          articlesPage: "1",
          articlesCount: "10",
          articlesSortBy: "rel",
          articlesSortByAsc: "false",
          dataType: "news",
          lang: "eng",
          resultType: "articles",
          includeArticleTitle: "true",
          includeArticleBody: "true",
          includeArticleBasicInfo: "true",
          includeArticleConcepts: "true",
          includeArticleCategories: "true",
          dateStart: dateFormat(oneDayAgo),
          keywordSearchMode: "simple",
        });

        const response = await fetch(`${baseUrl}?${params.toString()}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `Error response from Event Registry for ${category}:`,
            errorText,
          );
          throw new Error(`Failed to fetch articles: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Event Registry response for ${category}:`, {
          totalResults: data.articles?.totalResults,
          count: data.articles?.results?.length,
        });

        if (!data.articles?.results) {
          console.error(
            `Invalid response format for category ${category}:`,
            data,
          );
          continue;
        }

        const articles = data.articles.results
          .filter((article: any) => {
            const isValid =
              article.url &&
              article.title &&
              article.body &&
              !article.title.includes("[Removed]") &&
              article.body.length > 50;

            if (!isValid) {
              console.log(`Filtered out invalid article:`, {
                title: article.title,
                hasUrl: !!article.url,
                hasBody: !!article.body,
                bodyLength: article.body?.length,
              });
            }

            return isValid;
          })
          .map((article: any) => ({
            url: article.url,
            title: article.title,
            description: article.body.substring(0, 200) + "...",
            content: article.body,
            publishedAt: article.dateTime,
            source: article.source?.title || "Unknown Source",
            urlToImage: article.image,
            category: article.categories?.[0]?.label || category,
            selected: false,
          }));

        console.log(
          `Successfully processed ${articles.length} valid articles for ${category}`,
        );
        allArticles.push(...articles);
      } catch (error) {
        console.error(
          `Error fetching articles for category ${category}:`,
          error,
        );
      }
    }

    if (allArticles.length === 0) {
      throw new Error("No articles found for any category");
    }

    // Remove duplicates and sort by date
    const uniqueArticles = Array.from(
      new Map(allArticles.map((article) => [article.url, article])).values(),
    ).sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

    // Cache the full articles
    cache.set(cacheKey, { data: uniqueArticles, timestamp: Date.now() });

    return uniqueArticles;
  } catch (error) {
    console.error("Failed to fetch news content:", error);
    throw new Error(
      `Failed to fetch news content: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Add function to get full article content for selected articles
export async function getSelectedArticles(
  articles: NewsArticle[],
  selectedUrls: string[],
): Promise<NewsArticle[]> {
  return articles.filter((article) => selectedUrls.includes(article.url));
}


export async function summarizeArticle(article: NewsArticle): Promise<string> {
  try {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await textSplitter.createDocuments([article.content]);
    const chain = loadSummarizationChain(model, {
      type: "map_reduce",
      verbose: true,
    });

    const summary = await chain.call({
      input_documents: chunks,
    });

    return summary.text;
  } catch (error) {
    console.error("Failed to summarize article:", error);
    throw new Error(
      `Failed to summarize article: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function getDomains(categories: string[]): Promise<string> {
  try {
    const allDomains = new Set<string>();

    for (const category of categories) {
      const response = await newsapi.v2.sources({
        category: category.toLowerCase(),
        language: "en",
      });

      response.sources.forEach((source) => {
        const domain = tld.getDomain(source.url);
        if (domain) {
          allDomains.add(domain);
        }
      });
    }

    return Array.from(allDomains).join(",");
  } catch (error) {
    console.error("Failed to fetch domains:", error);
    throw error;
  }
}

// Add this function after the existing functions
export async function formatNewsletterContent(
  content: any,
  style: string,
): Promise<any> {
  try {
    const stylePrompts = {
      professional: `Transform this newsletter content into a formal, business-oriented style that uses industry-standard terminology, maintains a professional tone, focuses on data and insights, includes relevant statistics and expert opinions, and keeps content concise and actionable. Format the response as a JSON object matching the input structure.`,

      casual: `Transform this newsletter content into a casual, engaging style that uses friendly, approachable language, includes relatable examples, adds personality to technical concepts, makes complex topics accessible, and encourages reader interaction. Format the response as a JSON object matching the input structure.`,

      story: `Transform this newsletter content into a narrative style that creates compelling storylines from the news, uses vivid descriptions and metaphors, builds emotional connections, maintains suspense and interest, and concludes with meaningful takeaways. Format the response as a JSON object matching the input structure.`,
    };

    const systemMessage = `You are a content formatting expert. Your task is to transform the provided newsletter content according to the specified style while maintaining the exact same JSON structure. 

Return a JSON object with the following structure:
{
  "title": "string",
  "content": "string",
  "sections": [
    {
      "title": "string",
      "content": "string"
    }
  ],
  "sourceUrl": "string",
  "style": "string"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: `Style guide: ${stylePrompts[style as keyof typeof stylePrompts]}\n\nContent to format in JSON: ${JSON.stringify(content)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const formattedContent = JSON.parse(completion.choices[0].message.content);

    // Validate the structure matches our expected format
    if (
      !formattedContent.title ||
      !formattedContent.content ||
      !Array.isArray(formattedContent.sections)
    ) {
      throw new Error("Formatted content does not match expected structure");
    }

    return formattedContent;
  } catch (error) {
    console.error("Failed to format newsletter content:", error);
    throw new Error(
      `Failed to format newsletter: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
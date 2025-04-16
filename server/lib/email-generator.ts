import OpenAI from "openai";
import { configDotenv } from "dotenv";

configDotenv();

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ContentBlock {
  type: string;
  content: string;
  imageUrl?: string;
}

// Comprehensive UTF-8 icon map that works across all email clients
export const EMAIL_ICONS = {
  // Essential icons - using universal UTF-8 symbols
  'lucide-mail': '📧',
  'lucide-user': '👤',
  'lucide-users': '👥',
  'lucide-bell': '🔔',
  'lucide-settings': '⚙️',
  'lucide-check': '✓',
  'lucide-x': '❌',
  'lucide-plus': '➕',
  'lucide-minus': '➖',
  'lucide-star': '⭐',
  'lucide-heart': '❤️',
  'lucide-info': 'ℹ️',
  'lucide-alert': '⚠️',
  'lucide-warning': '⚠️',
  'lucide-search': '🔍',
  'lucide-link': '🔗',
  'lucide-calendar': '📅',
  'lucide-clock': '🕐',
  'lucide-edit': '✎',
  'lucide-trash': '🗑️',
  'lucide-file': '📄',
  'lucide-folder': '📁',
  'lucide-image': '🖼️',
  'lucide-download': '⬇️',
  'lucide-upload': '⬆️',
  'lucide-refresh': '🔄',
  'lucide-external-link': '↗️',
  'lucide-home': '🏠',
  'lucide-phone': '📞',
  'lucide-send': '📤',
  'lucide-message': '💬',

  // Navigation icons
  'lucide-chevron-down': '▼',
  'lucide-chevron-up': '▲',
  'lucide-chevron-right': '▶',
  'lucide-chevron-left': '◀',
  'lucide-arrow-right': '➡️',
  'lucide-arrow-left': '⬅️',
  'lucide-arrow-up': '⬆️',
  'lucide-arrow-down': '⬇️',

  // Media controls
  'lucide-play': '▶️',
  'lucide-pause': '⏸️',
  'lucide-stop': '⏹️',
  'lucide-skip-forward': '⏭️',
  'lucide-skip-back': '⏮️',

  // Social
  'lucide-github': '🐙',
  'lucide-twitter': '🐦',
  'lucide-facebook': 'ⓕ',
  'lucide-linkedin': 'ⓛ',
};

/**
 * Enhanced icon processing with better error handling and logging
 */
export function processEmailIcons(content: string): string {
  if (!content) return '';

  console.log('Processing icons in content:', content.substring(0, 100) + '...');

  // Process SVG-based social icons first
  content = content.replace(/<div class="icons-container"[^>]*>([\s\S]*?)<\/div>/g, (match, iconsContent) => {
    // Keep the table-based icon container structure intact
    if (iconsContent.includes('role="presentation"')) {
      return match;
    }
    return match;
  });

  // Process regular icons second
  content = content.replace(/<i[^>]*class="([^"]*)"[^>]*><\/i>/g, (match, classes) => {
    try {
      // Extract the Lucide icon name from classes
      const iconClass = classes.split(' ').find(cls => cls.startsWith('lucide-'));
      if (!iconClass) {
        console.warn('No Lucide icon class found in:', classes);
        return match;
      }

      const icon = EMAIL_ICONS[iconClass];
      if (!icon) {
        console.warn(`No mapping found for icon: ${iconClass}`);
        return match;
      }

      // Return a table-based, email-client compatible icon wrapper
      return `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="display: inline-table; vertical-align: middle;">
          <tr>
            <td style="
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              font-size: 16px;
              line-height: 1;
              text-align: center;
              vertical-align: middle;
              mso-line-height-rule: exactly;
              mso-text-raise: 4px;
              padding: 0 2px;
            ">${icon}</td>
          </tr>
        </table>
      `.replace(/\s+/g, ' ').trim();

    } catch (error) {
      console.error('Error processing icon:', error, 'Classes:', classes);
      return match;
    }
  });

  return content;
}

function processContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = content.split("\n");
  let currentList: string[] = [];
  let isInList = false;

  const finishList = () => {
    if (currentList.length > 0) {
      blocks.push({
        type: "bullet-list",
        content: `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
            <tr>
              <td align="center">
                <table width="540" cellpadding="0" cellspacing="0" border="0" role="presentation">
                  <tr>
                    <td style="padding: 16px 0;">
                      <ul style="
                        list-style: none;
                        padding: 0;
                        margin: 0;
                        text-align: left;
                      ">
                        ${currentList.map(item => `
                          <li style="
                            position: relative;
                            padding-left: 1.5em;
                            margin-bottom: 0.75em;
                            line-height: 1.6;
                            color: #4b5563;
                            font-size: 16px;
                          ">
                            <span style="
                              position: absolute;
                              left: 0;
                              top: 0;
                              font-size: 16px;
                            ">•</span>
                            ${item.trim()}
                          </li>
                        `).join('')}
                      </ul>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>`
      });
      currentList = [];
      isInList = false;
    }
  };

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      finishList();
      return;
    }

    if (trimmedLine.match(/^[-*]\s/)) {
      isInList = true;
      currentList.push(trimmedLine.substring(2).replace(/\*+/g, ""));
    } else {
      finishList();

      let block: ContentBlock | null = null;
      if (trimmedLine.startsWith("# ")) {
        block = {
          type: "h1",
          content: `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding: 0 0 24px;">
                  <h1 style="font-size: 32px; font-weight: 700; color: #111827; margin: 0; line-height: 1.2;">${trimmedLine.substring(2).replace(/\*+/g, "")}</h1>
                </td>
              </tr>
            </table>`,
        };
      } else if (trimmedLine.startsWith("## ")) {
        block = {
          type: "h2",
          content: `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding: 32px 0 16px;">
                  <h2 style="font-size: 28px; font-weight: 600; color: #1f2937; margin: 0; line-height: 1.3;">${trimmedLine.substring(3).replace(/\*+/g, "")}</h2>
                </td>
              </tr>
            </table>`,
        };
      } else if (trimmedLine.startsWith("### ")) {
        block = {
          type: "h3",
          content: `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding: 24px 0 16px;">
                  <h3 style="font-size: 24px; font-weight: 600; color: #374151; margin: 0; line-height: 1.4;">${trimmedLine.substring(4).replace(/\*+/g, "")}</h3>
                </td>
              </tr>
            </table>`,
        };
      } else if (trimmedLine.startsWith(">")) {
        block = {
          type: "quote",
          content: `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding: 24px 0;">
                  <table width="540" cellpadding="0" cellspacing="0" border="0" role="presentation">
                    <tr>
                      <td style="
                        padding: 16px 24px;
                        border-left: 4px solid #e5e7eb;
                        background-color: #f9fafb;
                        color: #6b7280;
                        font-style: italic;
                        border-radius: 4px;
                        text-align: left;
                      ">
                        ${trimmedLine.substring(1).trim().replace(/\*+/g, "")}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>`,
        };
      } else {
        block = {
          type: "text",
          content: `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding: 8px 0;">
                  <table width="540" cellpadding="0" cellspacing="0" border="0" role="presentation">
                    <tr>
                      <td style="color: #4b5563; line-height: 1.6; text-align: left;">
                        ${processEmailIcons(trimmedLine.replace(/\*+/g, ""))}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>`,
        };
      }

      if (block) {
        blocks.push(block);
      }
    }
  });

  finishList();
  return blocks;
}

async function generateImages(prompt: string, count: number = 1): Promise<string[]> {
  try {
    console.log(`Generating ${count} images with prompt:`, prompt);
    const urls: string[] = [];

    for (let i = 0; i < count; i++) {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: `Generate a professional, cinematic-style image in 2.35:1 aspect ratio for a newsletter that ${prompt}. The image should be clear, engaging, and suitable for business communication, with dramatic composition and lighting.`,
        n: 1,
        size: "1792x1024", // Cinematic aspect ratio (close to 2.35:1)
        quality: "hd",
        style: "vivid",
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

export async function generateEmailContent(
  prompt: string,
  includeImages: boolean = true
): Promise<{ subject: string; blocks: ContentBlock[] }> {
  try {
    console.log("Starting email generation with images:", includeImages);

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert email content generator. Create email content with the following structure:

1. Start with "Subject: " followed by the subject line
2. Then the main content using markdown-style formatting:
- # for main headlines (H1)
- ## for subheadings (H2)
- ### for smaller headings (H3)
- - or * for bullet points
- > for quotes

${includeImages ? `After the main content, provide two image prompts:
[Header Image]: A descriptive prompt for a header image that captures the main theme
[Body Image]: A descriptive prompt for a body image that illustrates a key point` : ''}`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
    });

    const content = completion.choices[0].message.content || "";
    console.log("Processing email content for formatting...");

    // Extract subject and content sections
    const lines = content.split("\n");
    let subject = "";
    let emailContent = "";
    let headerImagePrompt = "";
    let bodyImagePrompt = "";

    let currentSection = "content";
    for (const line of lines) {
      if (line.startsWith("Subject:")) {
        subject = line.substring("Subject:".length).trim();
      } else if (line.startsWith("[Header Image]:")) {
        currentSection = "header_image";
        headerImagePrompt = line.substring("[Header Image]:".length).trim();
      } else if (line.startsWith("[Body Image]:")) {
        currentSection = "body_image";
        bodyImagePrompt = line.substring("[Body Image]:".length).trim();
      } else if (currentSection === "content" && line.trim()) {
        emailContent += line + "\n";
      }
    }

    // Process content into blocks with proper icon handling
    const blocks: ContentBlock[] = [];

    // Handle images if enabled
    if (includeImages && headerImagePrompt) {
      console.log("Generating header image...");
      const headerUrls = await generateImages(headerImagePrompt);
      if (headerUrls[0]) {
        blocks.push({
          type: "image",
          content: `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding: 0 0 32px;">
                  <img 
                    src="${headerUrls[0]}" 
                    alt="Header image"
                    width="540"
                    style="width: 100%; max-width: 540px; height: auto; display: block; margin: 0 auto; border-radius: 8px;"
                  />
                </td>
              </tr>
            </table>`,
        });
      }
    }

    // Process main content blocks
    const contentBlocks = processContent(emailContent);
    contentBlocks.forEach((block, index) => {
      blocks.push(block);

      // Insert body image after the first or second heading
      if (includeImages && bodyImagePrompt && block.type.startsWith('h') && index === 1) {
        generateImages(bodyImagePrompt).then(bodyUrls => {
          if (bodyUrls[0]) {
            blocks.push({
              type: "image",
              content: `
                <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                  <tr>
                    <td align="center" style="padding: 32px 0;">
                      <img 
                        src="${bodyUrls[0]}" 
                        alt="Article image"
                        width="540"
                        style="width: 100%; max-width: 540px; height: auto; display: block; margin: 0 auto; border-radius: 8px;"
                      />
                    </td>
                  </tr>
                </table>`,
            });
          }
        });
      }
    });

    return { subject, blocks };
  } catch (error) {
    console.error("Error generating email content:", error);
    throw new Error(`Failed to generate email content: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
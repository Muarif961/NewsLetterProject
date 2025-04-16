import {
  SESClient,
  SendEmailCommand,
  VerifyEmailIdentityCommand,
  GetIdentityVerificationAttributesCommand,
} from "@aws-sdk/client-ses";
import { db } from "../db/index";
import { verified_emails,subscribers } from "../db/schema";
import { eq } from "drizzle-orm";
import crypto from 'crypto';

const sesClient = new SESClient({
  region: "ap-southeast-2", // Sydney region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

interface SesError {
  name: string;
  message: string;
  Code?: string;
}

function getDetailedErrorMessage(error: any): string {
  if (!error) return "Unknown error occurred";

  const sesError = error as SesError;

  const errorMessages: Record<string, string> = {
    MessageRejected:
      "Email rejected. Please check your sender address is verified.",
    MailFromDomainNotVerified:
      "Your domain is not verified for sending emails.",
    EmailIdentityNotVerified: "Email address is not verified for sending.",
    Daily24HourQuotaExceeded:
      "Daily sending quota exceeded. Please try again tomorrow.",
    MaxSendingRateExceeded:
      "Too many emails sent too quickly. Please try again later.",
    ValidationError: "Invalid email configuration. Please check your settings.",
  };

  if (sesError.Code && errorMessages[sesError.Code]) {
    return errorMessages[sesError.Code];
  }

  return error.message || "An unknown error occurred while sending the email";
}

function processEmailButtons(htmlContent: string): string {
  // First pattern - standard button-block with a in div
  let processed = htmlContent.replace(
    /<div\s+class="button-block">\s*<a[^>]*style="[^"]*background-color:\s*([^;!]+)[^"]*;\s*color:\s*([^;!]+)[^"]*;"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/div>/gi,
    (match, bgColor, textColor, href, buttonText) => {
      // Clean up the colors and text
      bgColor = bgColor.trim();
      textColor = textColor.trim();
      buttonText = buttonText.trim();

      // Calculate VML arcsize (10% for subtle rounded corners)
      const arcsize = "10";

      return `
        <!-- Enhanced table-based button for better compatibility -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="min-width: 100%; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          <tr>
            <td valign="top" align="center" style="padding: 16px 8px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                href="${href}"
                style="height:44px;v-text-anchor:middle;width:220px;"
                arcsize="${arcsize}%"
                strokecolor="${bgColor}"
                fillcolor="${bgColor}">
              <w:anchorlock/>
              <center style="color:${textColor};font-family:Arial,sans-serif;font-size:16px;font-weight:600;">
                ${buttonText}
              </center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" 
                class="button-table" 
                style="border-collapse: separate !important; margin: 0 auto;">
                <tr>
                  <td align="center" style="
                    background-color: ${bgColor};
                    border-radius: 4px;
                    padding: 12px 24px;
                    mso-padding-alt: 0;
                    mso-line-height-rule: exactly;
                  " bgcolor="${bgColor}">
                    <a href="${href}" target="_blank" style="
                      color: ${textColor};
                      display: inline-block;
                      font-family: Arial, sans-serif;
                      font-size: 16px;
                      font-weight: 600;
                      line-height: 1.2;
                      margin: 0;
                      text-decoration: none;
                      text-transform: none;
                      padding: 0;
                      mso-padding-alt: 0;
                      mso-text-raise: 0;
                      -webkit-text-size-adjust: none;
                    ">${buttonText}</a>
                  </td>
                </tr>
              </table>
              <!--<![endif]-->
            </td>
          </tr>
        </table>
      `.trim();
    }
  );
  
  // Second pattern - buttons with data-button attribute
  processed = processed.replace(
    /<(div|a)[^>]*data-button="true"[^>]*style="[^"]*background-color:\s*([^;!]+)[^"]*;\s*color:\s*([^;!]+)[^"]*;"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/(div|a)>/gi,
    (match, tagType, bgColor, textColor, href, buttonText) => {
      // Clean up the colors and text
      bgColor = bgColor.trim();
      textColor = textColor.trim();
      buttonText = buttonText.trim();

      // Calculate VML arcsize (10% for subtle rounded corners)
      const arcsize = "10";

      return `
        <!-- Enhanced table-based button for better compatibility -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="min-width: 100%; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          <tr>
            <td valign="top" align="center" style="padding: 16px 8px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                href="${href}"
                style="height:44px;v-text-anchor:middle;width:220px;"
                arcsize="${arcsize}%"
                strokecolor="${bgColor}"
                fillcolor="${bgColor}">
              <w:anchorlock/>
              <center style="color:${textColor};font-family:Arial,sans-serif;font-size:16px;font-weight:600;">
                ${buttonText}
              </center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" 
                class="button-table" 
                style="border-collapse: separate !important; margin: 0 auto;">
                <tr>
                  <td align="center" style="
                    background-color: ${bgColor};
                    border-radius: 4px;
                    padding: 12px 24px;
                    mso-padding-alt: 0;
                    mso-line-height-rule: exactly;
                  " bgcolor="${bgColor}">
                    <a href="${href}" target="_blank" style="
                      color: ${textColor};
                      display: inline-block;
                      font-family: Arial, sans-serif;
                      font-size: 16px;
                      font-weight: 600;
                      line-height: 1.2;
                      margin: 0;
                      text-decoration: none;
                      text-transform: none;
                      padding: 0;
                      mso-padding-alt: 0;
                      mso-text-raise: 0;
                      -webkit-text-size-adjust: none;
                    ">${buttonText}</a>
                  </td>
                </tr>
              </table>
              <!--<![endif]-->
            </td>
          </tr>
        </table>
      `.trim();
    }
  );
  
  return processed;
}

/**
 * Determines if content already has HTML document structure
 */
function hasHtmlStructure(htmlContent: string): boolean {
  return (
    htmlContent.includes('<!DOCTYPE') || 
    !!htmlContent.match(/<html[^>]*>/i) || 
    htmlContent.includes('<head>') ||
    // Check for our specific email container structure
    (htmlContent.includes('<div style="background-color: #f7f7f9;') && 
     htmlContent.includes('Delivered with ❤️ by Newsletterly'))
  );
}

/**
 * Wraps email content in a professional HTML email template.
 * Detects and prevents double-wrapping by checking if the content already has HTML structure.
 */
function wrapEmailContent(htmlContent: string, subject: string, unsubscribeToken?: string): string {
  // Check if the content already has HTML structure
  if (hasHtmlStructure(htmlContent)) {
    console.log('Content already has HTML structure, returning as is to avoid double-wrapping');
    return htmlContent;
  }

  const baseUrl = `https://3d030f67-658e-46ea-b894-789f1060c0e1-00-rfnzxambwv0e.sisko.replit.dev`;
  const unsubscribeLink = unsubscribeToken 
    ? `<p style="margin-top: 10px; font-size: 12px; color: #666666; text-align: center;">
        To unsubscribe from these emails, <a href="${baseUrl}/unsubscribe?token=${unsubscribeToken}" style="color: #666666; text-decoration: underline;">click here</a>
      </p>`
    : '';

  // First, clean out any nested HTML document structure
  let cleanedContent = htmlContent
    // Remove any DOCTYPE declarations
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    // Remove any HTML tags
    .replace(/<html[^>]*>|<\/html>/gi, '')
    // Remove any HEAD elements and their content
    .replace(/<head>[\s\S]*?<\/head>/gi, '')
    // Remove any BODY tags
    .replace(/<body[^>]*>|<\/body>/gi, '')
    // Clean up any broken or invalid HTML structure
    .replace(/<\/div>\s*<\/div>\s*<\/div>\s*(?!<div)/g, '</div></div>')
    .replace(/<\/div>\s*<\/div>\s*(?!<div)/g, '</div>')
    // Remove unmatched closing tags
    .replace(/<\/div>(?![\s\S]*?<div)/g, '')
    .replace(/<\/td>(?![\s\S]*?<td)/g, '')
    .replace(/<\/tr>(?![\s\S]*?<tr)/g, '')
    // Fix duplicate style attributes
    .replace(/style="([^"]*)"\s+style="([^"]*)"/g, (match, style1, style2) => {
      return `style="${style1.trim()}; ${style2.trim()}"`;
    });

  // Process content for email client compatibility
  let processedContent = cleanedContent
    // First enhance any long text content by adding text wrapping styles
    .replace(/(WATCH:|Will the new Boston Celtics owner|Kelly was handed a rare start by)[^\n<>]{100,}/gi, (match) => {
      return `<span style="word-break: break-word; overflow-wrap: break-word; max-width: 100%; display: inline-block;">${match}</span>`;
    });
    
  // Process dividers using our enhanced function
  processedContent = processDividers(processedContent);
  
  // Process buttons
  processedContent = processEmailButtons(processedContent);
  
  // Process bullet lists to ensure proper alignment
  processedContent = processedContent
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match: string, listContent: string): string => {
      // Replace individual list items with properly styled ones
      const processedListContent = listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, 
        '<li style="margin-bottom: 8px; list-style-position: inside; margin-left: 0; padding-left: 0; text-align: left;">$1</li>'
      );
      
      return `<ul style="padding-left: 20px; margin-left: 0; text-align: left;">${processedListContent}</ul>`;
    });
  
  // Process numbered lists similarly
  processedContent = processedContent
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match: string, listContent: string): string => {
      // Replace individual list items with properly styled ones
      const processedListContent = listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, 
        '<li style="margin-bottom: 8px; list-style-position: inside; margin-left: 0; padding-left: 0; text-align: left;">$1</li>'
      );
      
      return `<ol style="padding-left: 20px; margin-left: 0; text-align: left;">${processedListContent}</ol>`;
    });
  
  // Final cleanup: remove any dangling elements/tags
  processedContent = processedContent
    .replace(/<\/div>\s*<\/div>\s*<\/div>/g, '</div></div>')
    .replace(/<\/div>\s*<\/div>\s*<\/tr>(?![\s\S]*?<tr)/g, '</div></tr>')
    .replace(/<\/td>\s*<\/td>\s*<\/tr>/g, '</td></tr>')
    .replace(/<div([^>]*)><\/div>/g, '')
    .replace(/<p([^>]*)>\s*<\/p>/g, '')
    .replace(/style="([^"]*)"\s+style="([^"]*)"/g, (match, style1, style2) => {
      return `style="${style1.trim()}; ${style2.trim()}"`;
    });

  return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
      <!-- Improved meta tags for better rendering -->
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <!--[if !mso]><!-->
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <!--<![endif]-->
      <title>${subject}</title>
      
      <!-- MSO specific styling for Outlook -->
      <!--[if mso]>
      <style type="text/css">
        table {border-collapse:collapse;border-spacing:0;margin:0;}
        div, td {padding:0;}
        div {margin:0 !important;}
        v\\:roundrect {behavior:url(#default#VML);}
      </style>
      <xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG/>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
      <![endif]-->
      
      <!-- Enhanced styles with better typography and spacing -->
      <style type="text/css">
        /* Base styles with improved typography */
        body { 
          margin: 0; 
          padding: 0; 
          min-width: 100%; 
          width: 100% !important; 
          height: 100% !important; 
          font-family: 'Helvetica Neue', Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        body, table, td, div, p, a { 
          text-size-adjust: 100%; 
          -ms-text-size-adjust: 100%; 
          -webkit-text-size-adjust: 100%; 
          line-height: 1.5; 
        }
        table, td { 
          mso-table-lspace: 0pt; 
          mso-table-rspace: 0pt; 
          border-collapse: collapse !important; 
          border-spacing: 0; 
        }
        img { 
          border: 0; 
          line-height: 100%; 
          outline: none; 
          text-decoration: none; 
          -ms-interpolation-mode: bicubic;
          max-width: 100%;
          height: auto;
        }
        #outlook a { padding: 0; }
        .ReadMsgBody { width: 100%; } 
        .ExternalClass { width: 100%; }
        .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { 
          line-height: 100%; 
        }
        
        /* Improved spacing and layout */
        h1, h2, h3, h4 {
          margin-top: 20px;
          margin-bottom: 10px;
          line-height: 1.2;
        }
        p {
          margin-top: 0;
          margin-bottom: 16px;
          line-height: 1.6;
        }
        
        /* Table and column styles for better Outlook compatibility */
        table {
          border-collapse: collapse;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        table[role="presentation"] {
          table-layout: fixed;
          width: 100%;
        }
        /* Base styles for columns - these are only used in modern clients as we now use tables */
        .stack-column {
          display: table-cell;
          width: 50%;
          vertical-align: top;
        }
        /* Table cell styles for column layouts */
        table td[width="50%"] {
          width: 50%;
        }
        
        /* Button styles */
        .button-table { 
          margin: 20px auto !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }
        .button-container { 
          border-radius: 4px !important;
          mso-line-height-rule: exactly;
        }
        .button-container a {
          display: inline-block !important;
          font-family: 'Helvetica Neue', Arial, sans-serif !important;
          font-size: 16px !important;
          font-weight: 600 !important;
          line-height: 1.2 !important;
          padding: 12px 24px !important;
          text-align: center !important;
          text-decoration: none !important;
          -webkit-text-size-adjust: none !important;
          border-radius: 4px !important;
          mso-line-height-rule: exactly;
          mso-padding-alt: 0;
          mso-text-raise: 0;
        }
        
        /* Responsive adjustments */
        @media screen and (max-width: 700px) {
          /* Container adjustments */
          .responsive-table {
            width: 100% !important;
            max-width: 100% !important;
          }
          .mobile-padding {
            padding: 15px !important;
          }
          .mobile-font {
            font-size: 16px !important;
          }
          /* Improved column stacking for mobile */
          .stack-column {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            direction: ltr !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          /* For two-column email layouts */
          table[role="presentation"] td[width="280"],
          table[role="presentation"] td[style*="width: 280px"] {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin-bottom: 20px !important;
          }
          /* For multi-column tables */
          table[width="100%"] td[width="50%"] {
            display: block !important;
            width: 100% !important;
            padding: 0 !important;
            margin-bottom: 20px !important;
          }
          /* Table targeting for column layout */
          table td[width="50%"],
          table td[style*="width: 50%"] {
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          /* Image constraints */
          img {
            width: auto !important;
            max-width: 100% !important;
            height: auto !important;
          }
          /* Text alignment adjustments */
          .mobile-center {
            text-align: center !important;
          }
          .mobile-left {
            text-align: left !important;
          }
          .mobile-hidden {
            display: none !important;
          }
          .mobile-full-width {
            width: 100% !important;
            max-width: 100% !important;
          }
          .mobile-margin-bottom {
            margin-bottom: 25px !important;
          }
          .mobile-no-padding {
            padding: 0 !important;
          }
          /* Order adjustment for columns */
          .mobile-first {
            display: table-header-group !important;
          }
          .mobile-second {
            display: table-footer-group !important;
          }
          /* Typography adjustments */
          h1 {
            font-size: 22px !important;
          }
          h2 {
            font-size: 18px !important;
          }
          h3 {
            font-size: 16px !important;
          }
        }
      </style>
    </head>
    
    <body style="margin: 0; padding: 0; width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
      <!-- Outer background wrapper -->
      <div style="background-color: #f5f5f5; margin: 0; padding: 0; width: 100%;">
      
        <!-- Main email container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="width: 100%; margin: 0 auto; background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 20px 0;">
            
              <!-- Content card - fixed width container with strict constraints -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="600" style="width: 600px; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); table-layout: fixed;" class="responsive-table">
                
                <!-- Main content - constrained to prevent overflow -->
                <tr>
                  <td style="background-color: #ffffff; border-radius: 8px 8px 0 0; padding: 30px 30px 20px; width: 540px; max-width: 540px;" class="mobile-padding">
                    <!-- Content wrapper -->
                    <div style="max-width: 540px; width: 100%; overflow: hidden;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; table-layout: fixed; max-width: 540px; margin: 0 auto;">
                        <tr>
                          <td style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; text-align: center; word-break: break-word; word-wrap: break-word; overflow-wrap: break-word; width: 100%; max-width: 540px; display: block;" class="mobile-font">
                            ${processedContent}
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer with unsubscribe -->
                <tr>
                  <td style="background-color: #ffffff; border-radius: 0 0 8px 8px; padding: 20px 30px; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #666666; text-align: center;">
                      Delivered with ❤️ by Newsletterly
                    </p>
                    ${unsubscribeLink}
                  </td>
                </tr>
                
              </table>
              
            </td>
          </tr>
        </table>
        
      </div>
    </body>
    </html>
  `;
}

// Process divider blocks - multiple patterns for different structures
function processDividers(htmlContent: string): string {
  return htmlContent
    // Pattern 1: Standard divider-block class
    .replace(
      /<div[^>]*class="[^"]*divider-block[^"]*"[^>]*>(?:[\s\S]*?<\/div>)?/gi,
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; max-width:540px; margin:20px auto;"><tr><td style="height:1px; line-height:1px; font-size:1px; padding:0; border-top:1px solid #E5E7EB;"></td></tr></table>'
    )
    // Pattern 2: Divider with style attribute containing margin or width
    .replace(
      /<div[^>]*style="[^"]*(?:margin|width)[^"]*"[^>]*class="[^"]*divider[^"]*"[^>]*>(?:[\s\S]*?<\/div>)?/gi,
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; max-width:540px; margin:20px auto;"><tr><td style="height:1px; line-height:1px; font-size:1px; padding:0; border-top:1px solid #E5E7EB;"></td></tr></table>'
    )
    // Pattern 3: Divider with data-divider attribute
    .replace(
      /<div[^>]*data-divider="true"[^>]*>(?:[\s\S]*?<\/div>)?/gi,
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; max-width:540px; margin:20px auto;"><tr><td style="height:1px; line-height:1px; font-size:1px; padding:0; border-top:1px solid #E5E7EB;"></td></tr></table>'
    )
    // Pattern 4: Any HR tag
    .replace(
      /<hr[^>]*>/gi,
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; max-width:540px; margin:20px auto;"><tr><td style="height:1px; line-height:1px; font-size:1px; padding:0; border-top:1px solid #E5E7EB;"></td></tr></table>'
    )
    // Pattern 5: Divider with inline styles
    .replace(
      /<div[^>]*style="[^"]*border(?:-top)?:\s*(?:1px|thin)\s+solid[^"]*"[^>]*>(?:[\s\S]*?<\/div>)?/gi,
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; max-width:540px; margin:20px auto;"><tr><td style="height:1px; line-height:1px; font-size:1px; padding:0; border-top:1px solid #E5E7EB;"></td></tr></table>'
    );
}

export async function verifyEmailIdentity(
  userId: number,
  emailAddress: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    const [existingVerification] = await db
      .select()
      .from(verified_emails)
      .where(eq(verified_emails.email, emailAddress))
      .limit(1);

    if (existingVerification && existingVerification.userId !== userId) {
      return {
        success: false,
        message: "This email is already registered by another user",
      };
    }

    await sesClient.send(
      new VerifyEmailIdentityCommand({
        EmailAddress: emailAddress,
      }),
    );

    if (existingVerification) {
      await db
        .update(verified_emails)
        .set({
          verificationStatus: "pending",
          verificationToken: emailAddress,
          updatedAt: new Date(),
        })
        .where(eq(verified_emails.id, existingVerification.id));
    } else {
      await db.insert(verified_emails).values({
        userId,
        email: emailAddress,
        verificationToken: emailAddress,
        verificationStatus: "pending",
        isDomain: false,
      });
    }

    return {
      success: true,
      message:
        "Verification email sent. Please check your inbox and click the verification link.",
    };
  } catch (error) {
    console.error("Email verification failed:", error);
    return {
      success: false,
      message: getDetailedErrorMessage(error),
    };
  }
}

export async function checkVerificationStatus(
  userId: number,
  emailAddress: string,
): Promise<{ success: boolean; status: string; message?: string }> {
  try {
    const response = await sesClient.send(
      new GetIdentityVerificationAttributesCommand({
        Identities: [emailAddress],
      }),
    );

    const status =
      response.VerificationAttributes?.[emailAddress]?.VerificationStatus;

    if (status === "Success") {
      await db
        .update(verified_emails)
        .set({
          verificationStatus: "verified",
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(verified_emails.email, emailAddress));

      return {
        success: true,
        status: "verified",
        message: "Email successfully verified",
      };
    }

    return {
      success: true,
      status: status?.toLowerCase() || "pending",
      message: `Verification ${status?.toLowerCase() || "pending"}`,
    };
  } catch (error) {
    console.error("Failed to check verification status:", error);
    return {
      success: false,
      status: "error",
      message: getDetailedErrorMessage(error),
    };
  }
}

export async function sendEmail(
  userId: number,
  recipients: string[],
  subject: string,
  htmlContent: string,
  fromEmail?: string,
) {
  try {
    const [verifiedEmail] = await db
      .select()
      .from(verified_emails)
      .where(eq(verified_emails.userId, userId))
      .limit(1);

    if (!verifiedEmail || verifiedEmail.verificationStatus !== "verified") {
      throw new Error(
        "No verified email address found. Please verify an email address in the settings first.",
      );
    }

    const senderEmail = fromEmail || verifiedEmail.email;

    const command = new SendEmailCommand({
      Source: senderEmail,
      Destination: {
        BccAddresses: recipients,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: (() => {
              // Process buttons and dividers first
              let processedContent = processEmailButtons(htmlContent);
              
              // Process divider blocks - multiple patterns for different structures
              processedContent = processedContent
                // Pattern 1: Standard divider-block class
                .replace(
                  /<div\s+class="divider-block"[^>]*>(?:[\s\S]*?<\/div>)?/gi,
                  '<p style="border-top:1px solid #666666;font-size:1px;margin:20px auto;width:100%;"></p>'
                )
                // Pattern 2: Divider with style attribute first
                .replace(
                  /<div[^>]*?\sstyle="[^"]*?width:\s*100%;\s*margin:\s*20px\s+0[^"]*?"[^>]*\s*class="divider-block"[^>]*>(?:[\s\S]*?<\/div>)?/gi,
                  '<p style="border-top:1px solid #666666;font-size:1px;margin:20px auto;width:100%;"></p>'
                )
                // Pattern 3: Divider with data-divider attribute
                .replace(
                  /<div[^>]*?\sdata-divider="true"[^>]*>(?:[\s\S]*?<\/div>)?/gi,
                  '<p style="border-top:1px solid #666666;font-size:1px;margin:20px auto;width:100%;"></p>'
                )
                // Pattern 4: Any HR tag (last resort, might catch non-divider HRs)
                .replace(
                  /<hr[^>]*>/gi,
                  '<p style="border-top:1px solid #666666;font-size:1px;margin:20px auto;width:100%;"></p>'
                );
              
              // Only wrap the content if it doesn't already have HTML structure
              if (hasHtmlStructure(processedContent)) {
                console.log('Content already has HTML structure after content processing');
                return processedContent;
              } else {
                return wrapEmailContent(processedContent, subject);
              }
            })(),
            Charset: "UTF-8",
          },
        },
      },
    });

    const response = await sesClient.send(command);

    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error: any) {
    console.error("Failed to send email:", error);
    throw new Error(getDetailedErrorMessage(error));
  }
}

export async function sendTestEmail(userId: number, recipientEmail: string) {
  try {
    const [verifiedEmail] = await db
      .select()
      .from(verified_emails)
      .where(eq(verified_emails.userId, userId))
      .limit(1);

    if (!verifiedEmail || verifiedEmail.verificationStatus !== "verified") {
      throw new Error("Please verify your email address first");
    }

    const info = await sendEmail(
      userId,
      [recipientEmail],
      "AWS SES Test Email",
      `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
          <tr>
            <td align="center">
              <h1 style="font-size: 24px; font-weight: 600; color: #111827; margin-bottom: 24px;">Test Email</h1>
              <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">This is a test email to verify your AWS SES configuration.</p>
              <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">If you received this email, your email sending is working correctly!</p>
            </td>
          </tr>
        </table>
      `,
      verifiedEmail.email,
    );

    return {
      success: true,
      info,
    };
  } catch (error: any) {
    console.error("Failed to send test email:", error);
    throw new Error(getDetailedErrorMessage(error));
  }
}

export async function sendNewsletter(
  userId: number,
  recipients: string[],
  subject: string,
  htmlContent: string,
  isTest: boolean = false,
  testEmail?: string,
) {
  // Enable debugging for column layout processing
  const DEBUG_COLUMN_LAYOUTS = true;
  // Generate unsubscribe tokens for each recipient if not a test
  const recipientTokens = !isTest ? await Promise.all(
    recipients.map(async (email) => {
      const token = crypto.randomBytes(32).toString('hex');
      await db.update(subscribers)
        .set({ unsubscribeToken: token })
        .where(eq(subscribers.email, email))
        .returning();
      return { email, token };
    })
  ) : [];
  try {
    const finalRecipients = isTest && testEmail ? [testEmail] : recipients;

    // Generate individualized emails for each recipient with their unsubscribe token
    const emailPromises = finalRecipients.map(async (email) => {
      // First, find and process any two-column layouts
      let processedHtmlContent = htmlContent;
      
      // Process dividers first using our enhanced divider processing
      processedHtmlContent = processDividers(processedHtmlContent);
      
      // Look for column layout pattern in the content
      const columnRegex = /<div[^>]*class="?column"?[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="?column"?[^>]*>([\s\S]*?)<\/div>/gi;
      
      // Also find column layouts that might be using flex layout divs
      const flexColumnRegex = /<div[^>]*style="[^"]*flex:\s*1[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*style="[^"]*flex:\s*1[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
      
      // Look for width-based column layouts (common in email previews)
      const widthColumnRegex = /<div[^>]*style="[^"]*width:\s*(?:49|50|48)%[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*style="[^"]*width:\s*(?:49|50|48)%[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
      
      // Look for explicit column-container divs with column children
      const columnContainerRegex = /<div[^>]*class="?(?:column-container|columns)[^>]*>([\s\S]*?)<\/div>/gi;
      
      // Look for any two adjacent divs inside a container div (last resort pattern)
      const adjacentDivsRegex = /<div[^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
      
      function processColumnMatch(match: string, leftContent: string, rightContent: string): string {
        // First, clean up any incomplete div tags that might cause layout issues
        leftContent = leftContent
          .replace(/<\/div>\s*$/, '')
          .replace(/^\s*<div[^>]*>/, '')
          // Remove any remaining unclosed/unopened tags
          .replace(/<\/td>\s*(?!<td)/g, '')
          .replace(/<\/tr>\s*(?!<tr)/g, '')
          .replace(/<\/table>\s*(?!<table)/g, '');
        
        rightContent = rightContent
          .replace(/<\/div>\s*$/, '')
          .replace(/^\s*<div[^>]*>/, '')
          // Remove any remaining unclosed/unopened tags
          .replace(/<\/td>\s*(?!<td)/g, '')
          .replace(/<\/tr>\s*(?!<tr)/g, '')
          .replace(/<\/table>\s*(?!<table)/g, '');
        
        // Create a proper table-based two-column layout with simplified structure for better email compatibility
        return `
          <!-- Two-column layout using table-based approach for Outlook compatibility -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="540" style="width: 540px; max-width: 100%; table-layout: fixed; border-spacing: 0; border-collapse: collapse; margin: 12px auto;">
            <tr>
              <!-- Left column -->
              <td valign="top" align="center" width="270" style="width: 270px; max-width: 50%; padding-right: 5px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0; text-align: center; word-break: break-word;">
                      ${leftContent}
                    </td>
                  </tr>
                </table>
              </td>
              <!-- Right column -->
              <td valign="top" align="center" width="270" style="width: 270px; max-width: 50%; padding-left: 5px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0; text-align: center; word-break: break-word;">
                      ${rightContent}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <!-- Clear any floating elements that might cause content to overflow -->
          <div style="clear: both; width: 100%; height: 1px; line-height: 1px;"></div>
        `;
      }
      
      // Process any column layout patterns
      let columnMatch;
      let columnLayoutsProcessed = 0;
      
      // Pattern 1: Column class pattern
      while ((columnMatch = columnRegex.exec(processedHtmlContent)) !== null) {
        // Extract the content of each column
        const leftContent = columnMatch[1];
        const rightContent = columnMatch[2];
        
        // Create a table-based replacement
        const replacement = processColumnMatch(columnMatch[0], leftContent, rightContent);
        
        // Replace the original columns with the new table-based structure
        processedHtmlContent = processedHtmlContent.replace(columnMatch[0], replacement);
        
        columnLayoutsProcessed++;
        if (DEBUG_COLUMN_LAYOUTS) {
          console.log(`[Email Layout] Found and processed column class layout #${columnLayoutsProcessed}`);
        }
      }
      
      // Process any flex-based column layouts
      let flexMatch;
      // Pattern 2: Flex-based layout
      while ((flexMatch = flexColumnRegex.exec(processedHtmlContent)) !== null) {
        // Extract the content of each column
        const leftContent = flexMatch[1];
        const rightContent = flexMatch[2];
        
        // Create a table-based replacement
        const replacement = processColumnMatch(flexMatch[0], leftContent, rightContent);
        
        // Replace the original columns with the new table-based structure
        processedHtmlContent = processedHtmlContent.replace(flexMatch[0], replacement);
        
        columnLayoutsProcessed++;
        if (DEBUG_COLUMN_LAYOUTS) {
          console.log(`[Email Layout] Found and processed flex-based layout #${columnLayoutsProcessed}`);
        }
      }
      
      // Process width-based column layouts
      let widthMatch;
      // Pattern 3: Width-based layout
      while ((widthMatch = widthColumnRegex.exec(processedHtmlContent)) !== null) {
        // Extract the content of each column
        const leftContent = widthMatch[1];
        const rightContent = widthMatch[2];
        
        // Create a table-based replacement
        const replacement = processColumnMatch(widthMatch[0], leftContent, rightContent);
        
        // Replace the original columns with the new table-based structure
        processedHtmlContent = processedHtmlContent.replace(widthMatch[0], replacement);
        
        columnLayoutsProcessed++;
        if (DEBUG_COLUMN_LAYOUTS) {
          console.log(`[Email Layout] Found and processed width-based layout #${columnLayoutsProcessed}`);
        }
      }
      
      // Process adjacent divs as a last resort (might catch some non-column layouts, so use this last)
      let adjacentMatch;
      // Pattern 4: Adjacent divs (last resort)
      while ((adjacentMatch = adjacentDivsRegex.exec(processedHtmlContent)) !== null) {
        // Extract the content of each column
        const leftContent = adjacentMatch[1];
        const rightContent = adjacentMatch[2];
        
        // Only proceed if both columns have substantial content (avoids transforming non-column layouts)
        if (leftContent.trim().length > 20 && rightContent.trim().length > 20) {
          // Create a table-based replacement
          const replacement = processColumnMatch(adjacentMatch[0], leftContent, rightContent);
          
          // Replace the original columns with the new table-based structure
          processedHtmlContent = processedHtmlContent.replace(adjacentMatch[0], replacement);
          
          columnLayoutsProcessed++;
          if (DEBUG_COLUMN_LAYOUTS) {
            console.log(`[Email Layout] Found and processed adjacent divs layout #${columnLayoutsProcessed}`);
          }
        }
      }
      
      // Process column containers
      // Pattern 5: Column container divs
      let containerMatches = 0;
      processedHtmlContent = processedHtmlContent.replace(columnContainerRegex, (match: string, containerContent: string): string => {
        // Look for child divs that represent columns
        const columnDivs = containerContent.match(/<div[^>]*>([\s\S]*?)<\/div>/gi);
        
        if (columnDivs && columnDivs.length >= 2) {
          // Extract content from first two divs
          const div1Match = /<div[^>]*>([\s\S]*?)<\/div>/i.exec(columnDivs[0]);
          const div2Match = /<div[^>]*>([\s\S]*?)<\/div>/i.exec(columnDivs[1]);
          
          if (div1Match && div2Match) {
            containerMatches++;
            columnLayoutsProcessed++;
            if (DEBUG_COLUMN_LAYOUTS) {
              console.log(`[Email Layout] Found and processed column container layout #${columnLayoutsProcessed}`);
            }
            return processColumnMatch(match, div1Match[1], div2Match[1]);
          }
        }
        
        // If we can't extract proper columns, return the original content
        return match;
      });
      
      // Log the total number of column layouts processed
      if (DEBUG_COLUMN_LAYOUTS) {
        console.log(`[Email Layout] Total column layouts processed: ${columnLayoutsProcessed}`);
        if (columnLayoutsProcessed === 0) {
          console.log(`[Email Layout] WARNING: No column layouts were detected/processed. This might explain layout issues.`);
          // Log a small excerpt of the HTML to help with debugging
          console.log(`[Email Layout] HTML content excerpt (first 200 chars): ${htmlContent.substring(0, 200)}...`);
        }
      }
      
      // Clean up any broken or improperly closed HTML tags that might be causing issues
      processedHtmlContent = processedHtmlContent
        // Remove closing div tags that don't have an opening tag
        .replace(/<\/div>(?![\s\S]*?<div)/g, '')
        // Fix problems with malformed tables - remove unmatched TD and TR tags
        .replace(/<\/td>(?![\s\S]*?<td)/g, '')
        .replace(/<\/tr>(?![\s\S]*?<tr)/g, '')
        // Remove any unclosed div tags that might be causing layout issues
        .replace(/<div[^>]*>[^<]*(?=<div)/g, match => match + '</div>');
      
      // Process bullet lists to ensure proper alignment
      processedHtmlContent = processedHtmlContent
        .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match: string, listContent: string): string => {
          // Replace individual list items with properly styled ones
          const processedListContent = listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, 
            '<li style="margin-bottom: 8px; list-style-position: inside; margin-left: 0; padding-left: 0; text-align: left;">$1</li>'
          );
          
          return `<ul style="padding-left: 20px; margin-left: 0; text-align: left;">${processedListContent}</ul>`;
        });
      
      // Process numbered lists similarly
      processedHtmlContent = processedHtmlContent
        .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match: string, listContent: string): string => {
          // Replace individual list items with properly styled ones
          const processedListContent = listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, 
            '<li style="margin-bottom: 8px; list-style-position: inside; margin-left: 0; padding-left: 0; text-align: left;">$1</li>'
          );
          
          return `<ol style="padding-left: 20px; margin-left: 0; text-align: left;">${processedListContent}</ol>`;
        });
        
      // Process divider blocks before wrapping - multiple patterns for different structures
      processedHtmlContent = processedHtmlContent
        // Pattern 1: Standard divider-block class
        .replace(
          /<div\s+class="divider-block"[^>]*>(?:[\s\S]*?<\/div>)?/gi,
          '<p style="border-top:1px solid #666666;font-size:1px;margin:20px auto;width:100%;"></p>'
        )
        // Pattern 2: Divider with style attribute first
        .replace(
          /<div[^>]*?\sstyle="[^"]*?width:\s*100%;\s*margin:\s*20px\s+0[^"]*?"[^>]*\s*class="divider-block"[^>]*>(?:[\s\S]*?<\/div>)?/gi,
          '<p style="border-top:1px solid #666666;font-size:1px;margin:20px auto;width:100%;"></p>'
        )
        // Pattern 3: Divider with data-divider attribute
        .replace(
          /<div[^>]*?\sdata-divider="true"[^>]*>(?:[\s\S]*?<\/div>)?/gi,
          '<p style="border-top:1px solid #666666;font-size:1px;margin:20px auto;width:100%;"></p>'
        )
        // Pattern 4: Any HR tag (last resort, might catch non-divider HRs)
        .replace(
          /<hr[^>]*>/gi,
          '<p style="border-top:1px solid #666666;font-size:1px;margin:20px auto;width:100%;"></p>'
        );
      
      // Final cleanup: remove any dangling elements/tags
      processedHtmlContent = processedHtmlContent
        .replace(/<\/div>\s*<\/div>\s*<\/div>/g, '</div></div>')
        .replace(/<\/div>\s*<\/div>\s*<\/tr>(?![\s\S]*?<tr)/g, '</div></tr>')
        .replace(/<\/td>\s*<\/td>\s*<\/tr>/g, '</td></tr>')
        .replace(/<div([^>]*)><\/div>/g, '')
        .replace(/<p([^>]*)>\s*<\/p>/g, '')
        .replace(/style="([^"]*)"\s+style="([^"]*)"/g, (match, style1, style2) => {
          return `style="${style1.trim()}; ${style2.trim()}"`;
        });

      const recipientToken = recipientTokens.find(rt => rt.email === email)?.token;
      
      // Important: We need to ensure all content (including column layout) is wrapped in a single container
      // to prevent content from breaking outside white background area
      
      // First, create completely self-contained content with stricter content containment
      const selfContainedHtmlContent = `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width: 100%; max-width: 540px; table-layout: fixed; border-collapse: collapse; margin: 0 auto;">
          <tr>
            <td style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; word-break: break-word; overflow-wrap: break-word; max-width: 540px; width: 100%;">
              <!-- Ensure everything is contained in a fixed-width cell to prevent overflow -->
              <div style="width: 100%; max-width: 540px; overflow: hidden; word-wrap: break-word; word-break: break-word;">
                ${processedHtmlContent}
              </div>
            </td>
          </tr>
        </table>
      `;
      
      // Now wrap the self-contained content with the email template
      const emailContentWithUnsubscribe = recipientToken 
        ? wrapEmailContent(selfContainedHtmlContent, subject, recipientToken)
        : wrapEmailContent(selfContainedHtmlContent, subject);
        
      return await sendEmail(
        userId,
        [email], // Send individually to include unique unsubscribe link
        isTest ? `[TEST] ${subject}` : subject,
        emailContentWithUnsubscribe,
      );
    });

    const results = await Promise.all(emailPromises);
    return results[0]; // Return the first result for backward compatibility
  } catch (error: any) {
    console.error("Failed to send newsletter:", error);
    throw new Error(getDetailedErrorMessage(error));
  }
}

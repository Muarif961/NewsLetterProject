import { Template } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Laptop,
  Smartphone,
  Tablet,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Helper function to extract alignment from content
function extractAlignment(content: string): string | null {
  // Check for data-alignment attribute
  const dataAlignMatch = content.match(/data-alignment=["']([a-z]+)["']/i);
  if (dataAlignMatch && dataAlignMatch[1]) {
    return dataAlignMatch[1];
  }
  
  // Check for style with text-align property
  const styleAlignMatch = content.match(/style=["'].*?text-align\s*:\s*([a-z]+).*?["']/i);
  if (styleAlignMatch && styleAlignMatch[1]) {
    return styleAlignMatch[1];
  }
  
  // Check for align attribute
  const alignMatch = content.match(/align=["']([a-z]+)["']/i);
  if (alignMatch && alignMatch[1]) {
    return alignMatch[1];
  }
  
  return null;
}

interface NewsletterPreviewProps {
  template: Template | null;
  content: any;
  previewDevice?: "desktop" | "tablet" | "mobile";
  onDeviceChange?: (device: "desktop" | "tablet" | "mobile") => void;
}

export function NewsletterPreview({
  template,
  content,
  previewDevice = "desktop",
  onDeviceChange,
}: NewsletterPreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get preview width based on device
  const getPreviewWidth = () => {
    switch (previewDevice) {
      case "mobile":
        return "375px";
      case "tablet":
        return "768px";
      default:
        return "700px"; // Updated to match new email container width
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // If no template is provided but we have content, display the content directly
  if (!template) {
    // We still need to prepare HTML for the case when no template is used
    const fontFamily = content?.fontFamily || "system-ui, sans-serif";
    const fontColor = content?.fontColor || "rgba(0, 0, 0, 1)";
    const backgroundColor = content?.backgroundColor || "rgba(255, 255, 255, 1)";
    const accentColor = content?.accentColor || "rgba(0, 0, 0, 1)";

    // Handle the content - support both string and object formats
    const contentToDisplay = typeof content === 'string' 
      ? content 
      : (content?.content || content?.blocks?.map((block: any) => block.content).join('\n') || '');
    
    // Create a simple container for the content
    const directContentHtml = `
      <style>
        .newsletter-content {
          font-family: ${fontFamily};
          color: ${fontColor};
          background-color: ${backgroundColor};
          max-width: ${getPreviewWidth()};
          margin: 0 auto;
          padding: 20px;
          box-sizing: border-box;
          transform: scale(${zoom / 100});
          transform-origin: top center;
          transition: all 0.3s ease;
        }
        .newsletter-content h1 {
          font-size: 2.5rem !important;
          font-weight: 700 !important;
          line-height: 1.2 !important;
          margin: 1.5rem auto !important;
          color: ${accentColor} !important;
          text-align: center !important;
        }
        .newsletter-content h2 {
          font-size: 2rem !important;
          font-weight: 600 !important;
          line-height: 1.3 !important;
          margin: 1.25rem auto !important;
          color: ${accentColor} !important;
          text-align: center !important;
        }
        .newsletter-content h3 {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          line-height: 1.4 !important;
          margin: 1rem auto !important;
          color: ${accentColor} !important;
          text-align: center !important;
        }
        .newsletter-content p {
          margin: 10px 0;
          line-height: 1.6;
          text-align: center;
        }
        .newsletter-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 10px auto;
        }
        .newsletter-content ul,
        .newsletter-content ol {
          display: block;
          margin: 10px auto;
          padding-left: 20px;
          max-width: 100%;
          text-align: left;
        }
        .newsletter-content .newsletter-divider {
          width: 100%;
          padding: 1.5rem 0;
          margin: 0 auto;
        }
        .newsletter-content .newsletter-divider hr {
          width: 100%;
          height: 1px;
          border: none;
          background-color: rgba(0, 0, 0, 0.2);
          margin: 0;
        }
      </style>
      <div class="newsletter-content">
        ${contentToDisplay}
      </div>
    `;

    return (
      <div className="space-y-4">
        {/* Preview Controls */}
        <div className="flex items-center justify-between bg-black/5 rounded-lg p-4 shadow-sm">
          {/* Device Controls */}
          <div className="flex items-center gap-2">
            <div className="bg-background rounded-md p-1 shadow-sm">
              <Button
                variant={previewDevice === "desktop" ? "default" : "ghost"}
                size="sm"
                onClick={() => onDeviceChange?.("desktop")}
                className={cn(
                  "gap-2 transition-all duration-300 ease-in-out hover:bg-primary/10",
                  previewDevice === "desktop" &&
                    "bg-primary text-primary-foreground shadow-md",
                )}
              >
                <Laptop className="h-4 w-4" />
                Desktop
              </Button>
              <Button
                variant={previewDevice === "tablet" ? "default" : "ghost"}
                size="sm"
                onClick={() => onDeviceChange?.("tablet")}
                className={cn(
                  "gap-2 transition-all duration-300 ease-in-out hover:bg-primary/10",
                  previewDevice === "tablet" &&
                    "bg-primary text-primary-foreground shadow-md",
                )}
              >
                <Tablet className="h-4 w-4" />
                Tablet
              </Button>
              <Button
                variant={previewDevice === "mobile" ? "default" : "ghost"}
                size="sm"
                onClick={() => onDeviceChange?.("mobile")}
                className={cn(
                  "gap-2 transition-all duration-300 ease-in-out hover:bg-primary/10",
                  previewDevice === "mobile" &&
                    "bg-primary text-primary-foreground shadow-md",
                )}
              >
                <Smartphone className="h-4 w-4" />
                Mobile
              </Button>
            </div>
          </div>

          {/* Additional Controls */}
          <div className="flex items-center gap-4">
            <div className="bg-background rounded-md p-1 shadow-sm flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                disabled={zoom <= 50}
                className="hover:bg-primary/10"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-16 text-center">
                {zoom}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.min(150, zoom + 10))}
                disabled={zoom >= 150}
                className="hover:bg-primary/10"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            <div className="bg-background rounded-md p-1 shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className={cn(
                  "transition-all duration-300 ease-in-out hover:bg-primary/10",
                  isRefreshing && "animate-spin",
                )}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Container */}
        <Card
          className={cn(
            "h-[600px] overflow-auto shadow-lg transition-all duration-300 ease-in-out",
            previewDevice === "mobile" && "max-w-[375px] mx-auto",
            previewDevice === "tablet" && "max-w-[768px] mx-auto",
            previewDevice === "desktop" && "max-w-[700px] mx-auto",
          )}
        >
          <div
            className={cn(
              "min-h-full transition-all duration-300",
              isRefreshing && "opacity-50",
            )}
            dangerouslySetInnerHTML={{ __html: directContentHtml }}
          />
        </Card>
      </div>
    );
  }
  
  // If no template and no content, show the "Select a Template" message
  if (!template) {
    return (
      <Card className="flex h-[600px] items-center justify-center p-4 text-muted-foreground">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Select a Template</h3>
          <p className="text-sm">
            Choose a template to preview your newsletter
          </p>
        </div>
      </Card>
    );
  }

  // Apply custom styles
  const fontFamily = content.fontFamily || "system-ui, sans-serif";
  const fontColor = content.fontColor || "rgba(0, 0, 0, 1)";
  const backgroundColor = content.backgroundColor || "rgba(255, 255, 255, 1)";
  const accentColor = content.accentColor || "rgba(0, 0, 0, 1)";

  // Replace template variables with content and apply custom styles
  let html = template.html
    // Add support for dividers in the template
    .replace(/<hr[^>]*>/gi, `<div class="newsletter-divider"><hr /></div>`)
    .replace(/<div[^>]*class="[^"]*divider[^"]*"[^>]*>.*?<\/div>/gi, `<div class="newsletter-divider"><hr /></div>`)
    .replace(/<td[^>]*>/g, '<td align="center" style="text-align: center;">')
    .replace(/<p[^>]*>/g, '<p style="margin: 1em 0; text-align: center;">')
    // Handle button-block divs with existing text-align styles
    .replace(
      /<div\s+class="button-block"([^>]*)style="([^"]*?)text-align\s*:\s*(left|right|center)([^"]*?)"([^>]*)>/gi,
      (match, p1, p2, alignment, p4, p5) => {
        if (alignment === "left") {
          return `<div class="button-block"${p1}style="${p2}text-align: left !important; display: flex !important; justify-content: flex-start !important; width: 100% !important;${p4}" data-alignment="left"${p5}>`;
        } else if (alignment === "right") {
          return `<div class="button-block"${p1}style="${p2}text-align: right !important; display: flex !important; justify-content: flex-end !important; width: 100% !important;${p4}" data-alignment="right"${p5}>`;
        } else {
          return `<div class="button-block"${p1}style="${p2}text-align: center !important; display: flex !important; justify-content: center !important; width: 100% !important;${p4}" data-alignment="center"${p5}>`;
        }
      }
    )
    // Handle button-block divs with align attribute
    .replace(
      /<div\s+class="button-block"([^>]*)align="(left|right|center)"([^>]*)>/gi,
      (match, p1, alignment, p3) => {
        if (alignment === "left") {
          return `<div class="button-block"${p1}style="text-align: left !important; display: flex !important; justify-content: flex-start !important; width: 100% !important;" data-alignment="left"${p3}>`;
        } else if (alignment === "right") {
          return `<div class="button-block"${p1}style="text-align: right !important; display: flex !important; justify-content: flex-end !important; width: 100% !important;" data-alignment="right"${p3}>`;
        } else {
          return `<div class="button-block"${p1}style="text-align: center !important; display: flex !important; justify-content: center !important; width: 100% !important;" data-alignment="center"${p3}>`;
        }
      }
    )
    // Handle button-block divs with data-alignment
    .replace(
      /<div\s+class="button-block"([^>]*)data-alignment="(left|right|center)"([^>]*)>/gi,
      (match, p1, alignment, p3) => {
        if (alignment === "left") {
          return `<div class="button-block"${p1}style="text-align: left !important; display: flex !important; justify-content: flex-start !important; width: 100% !important;" data-alignment="left"${p3}>`;
        } else if (alignment === "right") {
          return `<div class="button-block"${p1}style="text-align: right !important; display: flex !important; justify-content: flex-end !important; width: 100% !important;" data-alignment="right"${p3}>`;
        } else {
          return `<div class="button-block"${p1}style="text-align: center !important; display: flex !important; justify-content: center !important; width: 100% !important;" data-alignment="center"${p3}>`;
        }
      }
    )
    // Add data-alignment attribute to button blocks that have no alignment yet
    .replace(
      /<div\s+class="button-block"(?![^>]*data-alignment)(?![^>]*align=)(?![^>]*text-align)([^>]*)>/gi,
      '<div class="button-block" style="text-align: center !important; display: flex !important; justify-content: center !important; width: 100% !important;" data-alignment="center"$1>'
    );

  // Replace content variables
  html = html.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    if (key === "content") {
      // Convert blocks to HTML
      if (Array.isArray(content.blocks)) {
        return content.blocks
          .map((block: any) => {
            console.log('Processing block:', block.type, block); // Add debugging
            switch (block.type) {
              case "image":
                return `<div style="text-align: center;">${block.content}</div>`;
              case "bullet-list":
                // Check if block.content contains alignment info
                const bulletListAlign = extractAlignment(block.content) || "left";
                return `<div style="margin: 1em auto; width: 100%;" data-alignment="${bulletListAlign}">
                  <ul style="
                    list-style-type: disc;
                    padding-left: 1.5em;
                    text-align: ${bulletListAlign};
                    margin: 1em auto;
                    width: ${bulletListAlign === 'center' ? 'max-content' : '100%'};
                    max-width: 100%;
                    display: block;
                    text-align-last: ${bulletListAlign};
                  " data-alignment="${bulletListAlign}">${block.content}</ul>
                </div>`;
              case "number-list":
                // Check if block.content contains alignment info
                const numberListAlign = extractAlignment(block.content) || "left";
                return `<div style="margin: 1em auto; width: 100%;" data-alignment="${numberListAlign}">
                  <ol style="
                    list-style-type: decimal;
                    padding-left: 1.5em;
                    text-align: ${numberListAlign};
                    margin: 1em auto;
                    width: ${numberListAlign === 'center' ? 'max-content' : '100%'};
                    max-width: 100%;
                    display: block;
                    text-align-last: ${numberListAlign};
                  " data-alignment="${numberListAlign}">${block.content}</ol>
                </div>`;
              case "quote":
                return `<div style="text-align: center;">${block.content}</div>`;
              case "divider":
              case "hr":
                return `<div class="newsletter-divider">
                  <hr />
                </div>`;
              case "button":
                // Preserve button alignment attributes
                const buttonContent = block.content;
                let alignment = "center"; // Default alignment
                
                // Extract alignment from the block itself if it exists
                if (block.alignment) {
                  alignment = block.alignment;
                }
                // Otherwise try to detect it from the button content
                else if (buttonContent.includes('style="text-align: left') || 
                         buttonContent.includes('data-alignment="left"') ||
                         buttonContent.includes('align="left"')) {
                  alignment = "left";
                } else if (buttonContent.includes('style="text-align: right') || 
                           buttonContent.includes('data-alignment="right"') ||
                           buttonContent.includes('align="right"')) {
                  alignment = "right";
                }
                
                // Apply specific styles and attributes for each alignment
                if (alignment === "left") {
                  return `<div class="button-block" style="display: flex !important; justify-content: flex-start !important; text-align: left !important; width: 100% !important;" data-alignment="left">${buttonContent}</div>`;
                } else if (alignment === "right") {
                  return `<div class="button-block" style="display: flex !important; justify-content: flex-end !important; text-align: right !important; width: 100% !important;" data-alignment="right">${buttonContent}</div>`;
                } else {
                  // Center alignment
                  return `<div class="button-block" style="display: flex !important; justify-content: center !important; text-align: center !important; width: 100% !important;" data-alignment="center">${buttonContent}</div>`;
                }
              case "h1":
                return `<h1 style="
                  font-size: 2.5rem;
                  font-weight: 700;
                  line-height: 1.2;
                  margin: 1.5rem auto;
                  color: ${accentColor};
                  text-align: center;
                ">${block.content}</h1>`;
              case "h2":
                return `<h2 style="
                  font-size: 2rem;
                  font-weight: 600;
                  line-height: 1.3;
                  margin: 1.25rem auto;
                  color: ${accentColor};
                  text-align: center;
                ">${block.content}</h2>`;
              case "h3":
                return `<h3 style="
                  font-size: 1.5rem;
                  font-weight: 600;
                  line-height: 1.4;
                  margin: 1rem auto;
                  color: ${accentColor};
                  text-align: center;
                ">${block.content}</h3>`;
              case "text":
                return `<div style="text-align: center;">${block.content}</div>`;
              default:
                return block.content || "";
            }
          })
          .join("\n");
      }
      return content.content || "";
    }
    if (key === "title") {
      return content.title || "";
    }
    return content[key] || "";
  });

  // Inject custom styles
  const styledHtml = `
    <style>
      .newsletter-content {
        font-family: ${fontFamily};
        color: ${fontColor};
        background-color: ${backgroundColor};
        max-width: ${getPreviewWidth()};
        margin: 0 auto;
        padding: 20px;
        box-sizing: border-box;
        transform: scale(${zoom / 100});
        transform-origin: top center;
        transition: all 0.3s ease;
      }
      .newsletter-content table {
        width: 100%;
        max-width: 700px;
        margin: 0 auto;
        border-collapse: collapse;
      }
      .newsletter-content td {
        text-align: center;
        padding: 10px;
      }
      .newsletter-content img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 10px auto;
      }
      .newsletter-content h1, 
      .newsletter-content h2, 
      .newsletter-content h3 {
        color: ${accentColor};
        margin: 20px 0;
        line-height: 1.2;
        text-align: center;
      }
      .newsletter-content p {
        margin: 10px 0;
        line-height: 1.6;
        text-align: center;
      }
      .newsletter-content ul,
      .newsletter-content ol {
        text-align: left;
        display: block;
        margin: 10px auto;
        padding-left: 20px;
        width: max-content;
        max-width: 100%;
      }
      .newsletter-content li {
        margin-bottom: 5px;
        line-height: 1.6;
      }
      .newsletter-content blockquote {
        margin: 20px auto;
        padding: 15px;
        border-left: 4px solid ${accentColor};
        background: #f8f8f8;
        text-align: center;
        max-width: 80%;
      }
      .newsletter-content .newsletter-divider {
        width: 100%;
        padding: 1.5rem 0;
        margin: 0 auto;
      }
      .newsletter-content .newsletter-divider hr {
        width: 100%;
        height: 1px;
        border: none;
        background-color: rgba(0, 0, 0, 0.2);
        margin: 0;
      }
      .story-section {
        text-align: center;
        margin: 30px auto;
        max-width: 700px;
      }
      .story-content {
        text-align: center;
        margin: 15px auto;
      }
      .story-meta {
        text-align: center;
        margin-top: 15px;
        color: #666;
        font-size: 0.9em;
      }
      .story-meta span {
        margin: 0 8px;
      }
      /* Button alignment styles */
      .newsletter-content .button-block {
        display: flex;
        width: 100%;
        justify-content: center;
        margin: 10px auto;
      }
      .newsletter-content .button-block[data-alignment="left"],
      .newsletter-content .button-block[style*="text-align: left"] {
        justify-content: flex-start !important;
      }
      .newsletter-content .button-block[data-alignment="right"],
      .newsletter-content .button-block[style*="text-align: right"] {
        justify-content: flex-end !important;
      }
      .newsletter-content .button-block[data-alignment="center"],
      .newsletter-content .button-block[style*="text-align: center"] {
        justify-content: center !important;
      }
      .newsletter-content .button-block a {
        display: inline-flex !important;
        text-decoration: none !important;
      }
      .newsletter-content h1 {
        font-size: 2.5rem !important;
        font-weight: 700 !important;
        line-height: 1.2 !important;
        margin: 1.5rem auto !important;
        color: ${accentColor} !important;
        text-align: center !important;
      }
      .newsletter-content h2 {
        font-size: 2rem !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;
        margin: 1.25rem auto !important;
        color: ${accentColor} !important;
        text-align: center !important;
      }
      .newsletter-content h3 {
        font-size: 1.5rem !important;
        font-weight: 600 !important;
        line-height: 1.4 !important;
        margin: 1rem auto !important;
        color: ${accentColor} !important;
        text-align: center !important;
      }
      .newsletter-content p {
        margin: 10px 0;
        line-height: 1.6;
        text-align: center;
      }
    </style>
    <div class="newsletter-content">
      ${html}
    </div>
  `;

  return (
    <div className="space-y-4">
      {/* Preview Controls */}
      <div className="flex items-center justify-between bg-black/5 rounded-lg p-4 shadow-sm">
        {/* Device Controls */}
        <div className="flex items-center gap-2">
          <div className="bg-background rounded-md p-1 shadow-sm">
            <Button
              variant={previewDevice === "desktop" ? "default" : "ghost"}
              size="sm"
              onClick={() => onDeviceChange?.("desktop")}
              className={cn(
                "gap-2 transition-all duration-300 ease-in-out hover:bg-primary/10",
                previewDevice === "desktop" &&
                  "bg-primary text-primary-foreground shadow-md",
              )}
            >
              <Laptop className="h-4 w-4" />
              Desktop
            </Button>
            <Button
              variant={previewDevice === "tablet" ? "default" : "ghost"}
              size="sm"
              onClick={() => onDeviceChange?.("tablet")}
              className={cn(
                "gap-2 transition-all duration-300 ease-in-out hover:bg-primary/10",
                previewDevice === "tablet" &&
                  "bg-primary text-primary-foreground shadow-md",
              )}
            >
              <Tablet className="h-4 w-4" />
              Tablet
            </Button>
            <Button
              variant={previewDevice === "mobile" ? "default" : "ghost"}
              size="sm"
              onClick={() => onDeviceChange?.("mobile")}
              className={cn(
                "gap-2 transition-all duration-300 ease-in-out hover:bg-primary/10",
                previewDevice === "mobile" &&
                  "bg-primary text-primary-foreground shadow-md",
              )}
            >
              <Smartphone className="h-4 w-4" />
              Mobile
            </Button>
          </div>
        </div>

        {/* Additional Controls */}
        <div className="flex items-center gap-4">
          <div className="bg-background rounded-md p-1 shadow-sm flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              disabled={zoom <= 50}
              className="hover:bg-primary/10"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-16 text-center">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.min(150, zoom + 10))}
              disabled={zoom >= 150}
              className="hover:bg-primary/10"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <div className="bg-background rounded-md p-1 shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className={cn(
                "transition-all duration-300 ease-in-out hover:bg-primary/10",
                isRefreshing && "animate-spin",
              )}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Container */}
      <Card
        className={cn(
          "h-[600px] overflow-auto shadow-lg transition-all duration-300 ease-in-out",
          previewDevice === "mobile" && "max-w-[375px] mx-auto",
          previewDevice === "tablet" && "max-w-[768px] mx-auto",
            previewDevice === "desktop" && "max-w-[700px] mx-auto",
        )}
      >
        <div
          className={cn(
            "min-h-full transition-all duration-300",
            isRefreshing && "opacity-50",
          )}
          dangerouslySetInnerHTML={{ __html: styledHtml }}
        />
      </Card>
    </div>
  );
}

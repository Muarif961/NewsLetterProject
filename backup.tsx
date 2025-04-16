import { Template } from "db/schema";
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
  if (!template && content && content.content) {
    // We still need to prepare HTML for the case when no template is used
    const fontFamily = content.fontFamily || "system-ui, sans-serif";
    const fontColor = content.fontColor || "rgba(0, 0, 0, 1)";
    const backgroundColor = content.backgroundColor || "rgba(255, 255, 255, 1)";
    const accentColor = content.accentColor || "rgba(0, 0, 0, 1)";
    
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
        .newsletter-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 10px auto;
        }
        .newsletter-content ul,
        .newsletter-content ol {
          text-align: left;
          display: inline-block;
          margin: 10px auto;
          padding-left: 20px;
        }
      </style>
      <div class="newsletter-content">
        ${content.content}
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
    .replace(/<td[^>]*>/g, '<td align="center" style="text-align: center;">')
    .replace(/<p[^>]*>/g, '<p style="margin: 1em 0; text-align: center;">');

  // Replace content variables
  html = html.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    if (key === "content") {
      // Convert blocks to HTML
      if (Array.isArray(content.blocks)) {
        return content.blocks
          .map((block: any) => {
            switch (block.type) {
              case "image":
                return `<div style="text-align: center;">${block.content}</div>`;
              case "bullet-list":
                return `<div style="text-align: center; display: inline-block; margin: 1em auto;">${block.content}</div>`;
              case "number-list":
                return `<div style="text-align: center; display: inline-block; margin: 1em auto;"><ol style="
                list-style-type: decimal;
                padding-left: 1.5em;
                text-align: left;
                margin: 1em 0;
              ">${block.content}</ol></div>`;
              case "quote":
                return `<div style="text-align: center;">${block.content}</div>`;
              case "h1":
              case "h2":
              case "h3":
              case "text":
                return `<div style="text-align: center;">${block.content}</div>`;
              default:
                return "";
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
        display: inline-block;
        margin: 10px auto;
        padding-left: 20px;
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
          previewDevice === "desktop" previewDevice === "desktop" && "max-w-[600px] mx-auto",previewDevice === "desktop" && "max-w-[600px] mx-auto", "max-w-[700px] mx-auto",
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

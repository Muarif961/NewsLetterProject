import React, { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Loader2, Send, Sparkles, Minus, Maximize2 } from "lucide-react";
import Draggable from "react-draggable";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";

interface ChatPromptProps {
  onContentGenerated: (
    content: Array<{ type: string; content: string }>,
    subject?: string,
  ) => void;
}

export function ChatPrompt({ onContentGenerated }: ChatPromptProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [includeImages, setIncludeImages] = useState(true);
  const draggableRef = useRef(null); // Ref for the Draggable component

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      console.log("Submitting prompt with includeImages:", includeImages);
      const response = await fetch("/api/generate/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt,
          includeImages 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      const data = await response.json();
      console.log("Generated email content:", data);

      // Format blocks with explicit image handling
      const formattedBlocks = data.blocks.map(
        (block: { type: string; content: string; imageUrl?: string }) => {
          if (block.type === "image" && block.imageUrl) {
            return {
              type: "image",
              content: `<div class="my-6">
                <img 
                  src="${block.imageUrl}" 
                  alt="Generated image" 
                  class="w-full max-h-[400px] object-cover rounded-lg shadow-lg" 
                  style="aspect-ratio: 2.35/1; object-fit: cover;"
                />
              </div>`,
            };
          }

          const cleanContent = block.content.replace(/\*\*/g, "").trim();

          switch (block.type) {
            case "h1":
              return {
                type: "h1",
                content: `<h1 class="text-4xl font-bold mb-6">${cleanContent}</h1>`,
              };
            case "h2":
              return {
                type: "h2",
                content: `<h2 class="text-3xl font-bold mb-4">${cleanContent}</h2>`,
              };
            case "h3":
              return {
                type: "h3",
                content: `<h3 class="text-2xl font-bold mb-3">${cleanContent}</h3>`,
              };
            case "list":
              return {
                type: "bullet-list",
                content: `<ul class="list-disc list-inside mb-4 space-y-2">${cleanContent.split('\n').map(item => `<li>${item.trim()}</li>`).join('')}</ul>`,
              };
            case "quote":
              return {
                type: "text",
                content: `<blockquote class="border-l-4 pl-4 italic my-4 text-gray-600">${cleanContent}</blockquote>`,
              };
            default:
              return {
                type: "text",
                content: `<p class="mb-4 leading-relaxed">${cleanContent}</p>`,
              };
          }
        },
      );

      // Extract subject from title or first h1 block
      let subject = data.title || "";
      if (!subject) {
        const h1Block = data.blocks.find((block: any) => block.type === "h1");
        if (h1Block) {
          subject = h1Block.content.replace(/\*\*/g, "").trim();
        }
      }

      onContentGenerated(formattedBlocks, subject);
      setPrompt("");
    } catch (error) {
      console.error("Error generating content:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Draggable nodeRef={draggableRef} handle=".drag-handle" defaultPosition={{ x: 0, y: 0 }}>
      <div
        ref={draggableRef}
        className={`fixed left-1/3 transform -translate-x-1/3 ${isMinimized ? "w-auto" : "w-[800px] h-[250px]"} transition-all duration-300 ease-in-out`}
        style={{ bottom: "20px", zIndex: 1000 }}
      >
        <div className="bg-background border border-primary/30 shadow-lg rounded-lg h-full">
          <div className="drag-handle flex items-center justify-between px-4 py-2 border-b border-border cursor-move">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg transition-colors hover:bg-primary/15 group">
                  <Sparkles className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
                </div>
                <h3 className="font-semibold text-lg text-primary">
                  AI Email Generator
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={includeImages}
                  onCheckedChange={setIncludeImages}
                  id="image-toggle"
                />
                <Label htmlFor="image-toggle" className="text-sm text-muted-foreground">Include Images</Label>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(!isMinimized)}
              className="ml-2"
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {!isMinimized && (
            <div className="p-4 h-[calc(100%-44px)] flex flex-col">
              <div className="flex-1 flex flex-col gap-3">
                <Textarea
                  placeholder="Describe the email you want to create... (e.g., 'Write a welcome email for new subscribers')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="flex-1 resize-none bg-background/50 border-muted focus:border-primary/50 transition-colors focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !prompt.trim()}
                  className="w-full px-4 h-10 transition-all hover:shadow-md hover:scale-105 active:scale-95"
                  size="default"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
                <div className="text-xs text-muted-foreground flex items-center gap-1 opacity-75">
                  Press {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} +
                  Enter to generate
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Draggable>
  );
}
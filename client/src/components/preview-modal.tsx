import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Send, Loader2 } from "lucide-react";
import { Separator } from "./ui/separator";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onUseContent: (content: string) => void;
  sourceType?: "PDF" | "YouTube";
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function PreviewModal({
  isOpen,
  onClose,
  title,
  content,
  onUseContent,
  sourceType = "PDF",
}: PreviewModalProps) {
  const [feedback, setFeedback] = useState("");
  const [displayContent, setDisplayContent] = useState(content);
  const [isSending, setIsSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Update display content when prop content changes
  useEffect(() => {
    setDisplayContent(content);
  }, [content]);

  const handleSendFeedback = async () => {
    if (!feedback.trim()) return;

    const userMessage = feedback;
    setFeedback("");

    // Add user message to chat
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);
    setIsSending(true);

    try {
      // Call the API to process the message
      const response = await fetch(`/api/upload/refine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentContent: displayContent,
          userMessage,
          sourceType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process feedback");
      }

      const data = await response.json();

      // Add assistant response to chat
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message || "Content updated successfully.",
        },
      ]);

      // Update the content if provided
      if (data.updatedContent) {
        setDisplayContent(data.updatedContent);
      }
    } catch (error) {
      console.error("Error processing feedback", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error processing your request. Please try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const formatContentWithBlocks = (content: string) => {
    if (!content) return "";

    // Split content by newlines and format appropriately
    const lines = content.split("\n");

    return (
      <div className="prose max-w-none dark:prose-invert">
        {lines.map((line, index) => {
          // Try to identify headers and bullet points
          if (line.startsWith("# ")) {
            return (
              <h1 key={index} className="text-2xl font-bold mt-4">
                {line.substring(2)}
              </h1>
            );
          } else if (line.startsWith("## ")) {
            return (
              <h2 key={index} className="text-xl font-bold mt-3">
                {line.substring(3)}
              </h2>
            );
          } else if (line.startsWith("### ")) {
            return (
              <h3 key={index} className="text-lg font-bold mt-2">
                {line.substring(4)}
              </h3>
            );
          } else if (line.match(/^[•*-]\s/)) {
            return (
              <li key={index} className="ml-4">
                {line.substring(2)}
              </li>
            );
          } else if (line.trim().length === 0) {
            return <br key={index} />;
          } else {
            return (
              <p key={index} className="my-2">
                {line}
              </p>
            );
          }
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[60vh]">
          {/* Content Preview Panel */}
          <div className="flex-1 overflow-y-auto p-4 bg-muted/20 rounded-md">
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">
              Preview
            </h3>
            <div 
              className="prose max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: displayContent }}
            />
          </div>

          {/* Chat Panel */}
          <div className="flex flex-col h-full border rounded-md">
            <div className="p-3 border-b">
              <h3 className="text-sm font-medium">Chat with AI</h3>
              <p className="text-xs text-muted-foreground">
                Refine the content with your feedback
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <p>Ask the AI to refine or restructure this content</p>
                  <p className="mt-2 text-xs">Examples:</p>
                  <ul className="text-xs list-disc list-inside mt-1">
                    <li>"Make it more concise"</li>
                    <li>"Add more bullet points"</li>
                    <li>"Add a section about [topic]"</li>
                    <li>"Structure it better for a newsletter"</li>
                  </ul>
                </div>
              ) : (
                chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type your feedback or suggestions..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendFeedback();
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleSendFeedback}
                  disabled={isSending || !feedback.trim()}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onUseContent(displayContent)}>
            Use Content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

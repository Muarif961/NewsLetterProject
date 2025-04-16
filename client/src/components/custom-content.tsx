import React, { useState } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Loader2, Youtube, FileText, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { PreviewModal } from "./preview-modal";

export function CustomContent({
  onContentGenerated,
}: {
  onContentGenerated: (content: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [previewData, setPreviewData] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    source: string;
    sourceType?: "YouTube" | "PDF";
  }>({
    isOpen: false,
    title: "",
    content: "",
    source: "",
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleUrlSubmit = async () => {
    if (!url) return;

    const validYoutubeUrl =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(?:watch\?v=|shorts\/|v\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S+)?$/;
    if (!validYoutubeUrl.test(url)) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description:
          "Please enter a valid YouTube video URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)",
      });
      return;
    }
    setLoading(true);
    try {
      // First validate credits
      const creditResponse = await fetch("/api/credits/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "generate_newsletter" }),
      });

      if (!creditResponse.ok) {
        const error = await creditResponse.json();
        throw new Error(error.message || "Insufficient credits");
      }
      // Then generate the content
      const response = await fetch("/api/upload/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process URL");
      }

      const data = await response.json();
      const summaryContent = data.summary.topStories[0].description;
      const summaryTitle =
        data.summary.topStories[0].title || "YouTube Summary";

      setSummary(summaryContent);
      // Open the preview modal instead of directly using the content
      setPreviewData({
        isOpen: true,
        title: summaryTitle,
        content: summaryContent,
        source: "YouTube",
        sourceType: "YouTube",
      });

      toast({
        title: "Success",
        description: "Content generated successfully",
      });

      // Deduct credits after successful generation
      await fetch("/api/credits/deduct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate_newsletter",
          description: "Generated newsletter content",
        }),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process URL",
      });
    } finally {
      setLoading(false);
    }
  };

  //Pdf Content Generation
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("pdf")) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload a PDF file",
      });
      return;
    }

    setFile(file);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // First validate credits
      const creditResponse = await fetch("/api/credits/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "generate_newsletter" }),
      });

      if (!creditResponse.ok) {
        const error = await creditResponse.json();
        throw new Error(error.message || "Insufficient credits");
      }
      // Then generate the content
      const response = await fetch("/api/upload/pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload PDF");
      }

      const data = await response.json();
      if (data.summary?.topStories?.[0]?.description) {
        const summaryContent = data.summary.topStories[0].description;
        const summaryTitle = data.summary.topStories[0].title || file.name;

        setSummary(summaryContent);
        // Open the preview modal
        setPreviewData({
          isOpen: true,
          title: summaryTitle,
          content: summaryContent,
          source: "PDF",
          sourceType: "PDF",
        });

        toast({
          title: "Success",
          description: "PDF processed successfully",
        });
      } else {
        throw new Error("Invalid response format from server");
      }

      // Deduct credits after successful generation
      await fetch("/api/credits/deduct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate_newsletter",
          description: "Generated newsletter content",
        }),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to process PDF",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUseModalContent = (content: string) => {
    // Format content with proper HTML structure to ensure it's correctly parsed
    const formattedContent = formatContentForEditor(content);

    // Create content object for direct navigation
    const contentObj = {
      title: previewData.title || "Custom Content",
      content: formattedContent,
      subject: `${previewData.source || "Custom"} Content`,
    };

    // Generate URL parameters and navigate to editor
    const queryParams = new URLSearchParams();
    queryParams.set("content", encodeURIComponent(JSON.stringify(contentObj)));
    setLocation(`/editor/content?${queryParams.toString()}`);

    // Close the modal after content is handled
    setPreviewData({ ...previewData, isOpen: false });
  };

  // Helper function to properly format content for the editor
  const formatContentForEditor = (content: string): string => {
    if (!content) return "";

    // Split content by newlines and convert to proper HTML blocks
    const lines = content.split("\n");
    let formattedHtml = "";

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        // Skip empty lines
        return;
      }

      // Format based on content structure
      if (trimmedLine.startsWith("# ")) {
        formattedHtml += `<h1>${trimmedLine.substring(2)}</h1>`;
      } else if (trimmedLine.startsWith("## ")) {
        formattedHtml += `<h2>${trimmedLine.substring(3)}</h2>`;
      } else if (trimmedLine.startsWith("### ")) {
        formattedHtml += `<h3>${trimmedLine.substring(4)}</h3>`;
      } else if (trimmedLine.match(/^[•*-]\s/)) {
        formattedHtml += `<li>${trimmedLine.substring(2)}</li>`;
      } else {
        formattedHtml += `<p>${trimmedLine}</p>`;
      }
    });

    // If content contains bullet points, wrap them in a ul tag properly
    if (formattedHtml.includes("<li>")) {
      // First ensure no <li> elements are directly adjacent without proper list structure
      let listContent = formattedHtml;

      // Replace consecutive list items with properly formatted ones
      listContent = listContent.replace(/<\/li><li>/g, "</li><li>");

      // Find all sequences of list items and wrap them in <ul> tags
      // This handles the case where multiple list items appear together
      let inList = false;
      let result = "";
      let currentList = "";

      // Split by HTML tags and process
      const parts = listContent.split(/(<\/?[^>]+>)/);

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (part === "<li>") {
          if (!inList) {
            inList = true;
            currentList = "<ul><li>";
          } else {
            currentList += "<li>";
          }
        } else if (part === "</li>") {
          currentList += "</li>";

          // Check if the next tag is not a list item
          if (i + 2 >= parts.length || parts[i + 2] !== "<li>") {
            inList = false;
            currentList += "</ul>";
            result += currentList;
            currentList = "";
          }
        } else if (inList) {
          currentList += part;
        } else {
          result += part;
        }
      }

      formattedHtml = result || listContent;
    }

    return formattedHtml;
  };

  const closePreviewModal = () => {
    setPreviewData({ ...previewData, isOpen: false });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto mb-8">
      <h2 className="text-2xl font-bold">Add Custom Content</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Youtube className="h-5 w-5" />
            <h3>YouTube Video</h3>
          </div>
          <div className="space-y-2">
            <Input
              placeholder="Enter YouTube URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button
              onClick={handleUrlSubmit}
              disabled={loading || !url}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                "Generate Summary"
              )}
            </Button>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5" />
            <h3>Upload PDF</h3>
          </div>
          <div className="space-y-2">
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground">Supported: PDF only</p>
          </div>
        </Card>
      </div>

      {/* Preview Modal for generated content */}
      <PreviewModal
        isOpen={previewData.isOpen}
        onClose={closePreviewModal}
        title={`${previewData.source} Summary: ${previewData.title}`}
        content={previewData.content}
        onUseContent={handleUseModalContent}
        sourceType={previewData.sourceType}
      />
    </div>
  );
}

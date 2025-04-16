import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AITextEditorProps {
  selectedText: string;
  onApplyChanges: (newText: string) => void;
  onClose: () => void;
}

export function AITextEditor({ selectedText, onApplyChanges, onClose }: AITextEditorProps) {
  const [prompt, setPrompt] = useState("");
  const [enhancedText, setEnhancedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const { toast } = useToast();

  // Create a separate root element for the portal on mount
  useEffect(() => {
    let element = document.getElementById('ai-editor-portal');
    if (!element) {
      element = document.createElement('div');
      element.id = 'ai-editor-portal';
      element.style.position = 'fixed';
      element.style.top = '0';
      element.style.left = '0';
      element.style.width = '100vw';
      element.style.height = '100vh';
      element.style.zIndex = '99999';
      element.style.pointerEvents = 'none';
      document.body.appendChild(element);
    }

    setPortalRoot(element);

    return () => {
      // Only remove if component unmounts and no other instances are using it
      if (document.getElementById('ai-editor-portal') === element) {
        document.body.removeChild(element);
      }
    };
  }, []);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const enhanceText = async () => {
    try {
      // Check if user is logged in first
      const userResponse = await fetch('/api/user', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!userResponse.ok) {
        toast({
          title: "Authentication required",
          description: "Please log in to use this feature",
          variant: "destructive",
        });
        return;
      }

      const userData = await userResponse.json();
      if (!userData?.id) {
        toast({
          title: "Authentication required", 
          description: "Please log in to use this feature",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
      toast({
        title: "Authentication error",
        description: "Failed to verify authentication status",
        variant: "destructive",
      });
      return;
    }

    if (!prompt) {
      toast({
        title: "Input needed",
        description: "Please enter instructions for the AI",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Sending text enhancement request with:', {
        originalText: selectedText.substring(0, 20) + '...',
        promptLength: prompt.length
      });

      // Get user data first
      const userResponse = await fetch('/api/user', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      const userData = await userResponse.json();

      const response = await axios.post('/api/text-enhancement', {
        originalText: selectedText,
        instructions: prompt,
        userId: userData?.id // Explicitly send user ID
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-User-ID': userData?.id?.toString() // Also send in headers as backup
        }
      });

      console.log('Enhancement response received:', response.status);

      if (response.data && response.data.enhancedText) {
        setEnhancedText(response.data.enhancedText);
      } else {
        console.error('Invalid response format:', response.data);
        setError("Received an invalid response format from the server");

        toast({
          title: "Invalid response",
          description: "The server returned an unexpected format",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error enhancing text:", err);
      const errorMessage = err.response?.data?.details || err.message || "Unknown error";
      setError(`Failed to enhance text: ${errorMessage}`);

      toast({
        title: "Enhancement failed",
        description: `Error: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (enhancedText) {
      onApplyChanges(enhancedText);
    }
  };

  // If the portal root is not ready, return null
  if (!portalRoot) return null;

  // Use ReactDOM.createPortal to render the dialog in a different part of the DOM
  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center" 
      style={{ 
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        pointerEvents: 'auto' // Enable pointer events for the modal container
      }}
      onClick={(e) => {
        // Close when clicking the overlay (outside the card)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card 
        className="w-full max-w-md mx-auto shadow-lg" 
        style={{ 
          position: 'relative',
          zIndex: 100000,
          pointerEvents: 'auto' // Make sure the card itself can be interacted with
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Text Enhancement
          </CardTitle>
          <CardDescription>
            Tell me how you want to enhance your selected text
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Selected Text:</p>
            <div className="p-3 bg-muted rounded-md text-sm max-h-32 overflow-auto">
              {selectedText || "No text selected"}
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Instructions:</p>
            <Textarea
              placeholder="For example: 'Make it more formal' or 'Rewrite as bullet points'"
              className="w-full"
              rows={3}
              value={prompt}
              onChange={handlePromptChange}
            />
          </div>

          {enhancedText && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Enhanced Result:</p>
              <div className="p-3 bg-muted rounded-md text-sm max-h-32 overflow-auto">
                {enhancedText}
              </div>
            </div>
          )}

          {error && (
            <div className="text-destructive text-sm">{error}</div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>

          {!enhancedText ? (
            <Button onClick={enhanceText} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enhancing...
                </>
              ) : (
                "Enhance with AI"
              )}
            </Button>
          ) : (
            <Button onClick={handleApply}>
              Apply Changes
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>,
    portalRoot
  );
}

export default AITextEditor;
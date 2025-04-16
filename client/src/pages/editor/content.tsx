import { useUser } from "../../hooks/use-user";
import { Switch } from "@/components/ui/switch";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Eye,
  EyeOff,
  Cloud,
  Check,
  ArrowLeft,
  Send,
  MessageSquare,
} from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { ColorPicker } from "../../components/content-curator";
import React, { useState, useCallback, useEffect } from "react";
import { DashboardLayout } from "../../components/dashboard-layout";
import { NewsletterPreview } from "../../components/newsletter-preview";
import { NewsletterPreviewModal } from "../../components/newsletter-preview-modal";
import { TemplateDialog } from "../../components/template-dialog";
import debounce from "lodash/debounce";
import DOMPurify from "dompurify";
import { useToast } from "@/hooks/use-toast";
import { ChatModal } from "../../components/modals/chat-modal";
import useSWR from "swr";

interface StylePreset {
  name: string;
  styles: {
    backgroundColor: string;
    textColor: string;
    spacing: number;
    borderWidth: number;
    borderStyle: string;
    borderColor: string;
    borderRadius: number;
    fontFamily: string;
    fontSize: string;
  };
}

const stylePresets: StylePreset[] = [
  {
    name: "Clean",
    styles: {
      backgroundColor: "rgba(255, 255, 255, 1)",
      textColor: "#000000",
      spacing: 16,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "rgba(229, 231, 235, 1)",
      borderRadius: 8,
      fontFamily: "Arial",
      fontSize: "16px",
    },
  },
];

const fontFamilies = [
  { value: "Arial", label: "Arial" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Georgia", label: "Georgia" },
  { value: "Helvetica", label: "Helvetica" },
];

const fontSizes = [
  "12px",
  "14px",
  "16px",
  "18px",
  "20px",
  "24px",
  "28px",
  "32px",
];

interface Template {
  html: string;
  name: string;
  blocks?: any[];
  styles?: StylePreset["styles"];
  id?: string;
}

// Define a blank template to use as default
const BLANK_TEMPLATE: Template = {
  id: "blank",
  name: "Blank Template",
  html: "<p>Start writing your newsletter content here...</p>",
  blocks: [
    {
      id: `block-blank-${Date.now()}`,
      type: "text",
      content: "<p>Start writing your newsletter content here...</p>"
    }
  ]
};

const newsletterTemplates: Template[] = [
  // Add your template data here
  {
    id: "template1",
    name: "Template 1",
    html: "<h1>Hello, World!</h1><p>This is a test template.</p>",
  },
  {
    id: "template2",
    name: "Template 2",
    html: "<h2>Another Template</h2><p>This is another test template.</p>",
  },
];

const determineNodeType = (node: Element) => {
  const tagName = node.tagName.toLowerCase();
  if (tagName.match(/^h[1-6]$/)) return tagName;
  if (tagName === "ul") return "bullet-list";
  if (tagName === "ol") return "number-list";
  if (tagName === "img" || node.querySelector("img")) return "image";
  if (node.classList.contains("icons-container")) return "icon";
  return "text";
};

const ContentEditor = () => {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [styles, setStyles] = useState<StylePreset["styles"]>(
    stylePresets[0].styles,
  );
  const [previewDevice, setPreviewDevice] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("style");
  const { toast } = useToast();
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [sending, setSending] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);
  const [showSaveAsNew, setShowSaveAsNew] = useState(false);
  const [blocks, setBlocks] = useState([]); // Added state for blocks
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>();
  const { data: groups = [] } =
    useSWR<{ id: number; name: string }[]>("/api/groups");

  useEffect(() => {
    const loadContent = () => {
      try {
        setLoading(true);
        const params = new URLSearchParams(search);
        const templateDataParam = params.get("templateData");
        const contentParam = params.get("content");
        const newTemplateParam = params.get("newTemplate");

        // Handle new template creation
        if (newTemplateParam === "true") {
          // Initialize with a blank template
          setContent("<p>Start creating your custom template...</p>");
          setBlocks([
            {
              id: `block-${Date.now()}-0-${Math.random().toString(36).substring(2, 9)}`,
              type: "text",
              content: "<p>Start creating your custom template...</p>",
            },
          ]);
          setLoading(false);
          return;
        }

        // Handle content if available from URL params
        if (contentParam) {
          try {
            const parsedContent = JSON.parse(decodeURIComponent(contentParam));
            if (parsedContent) {
              if (parsedContent.content) {
                // Parse the HTML content into blocks
                const parser = new DOMParser();
                const doc = parser.parseFromString(
                  parsedContent.content,
                  "text/html",
                );

                // Convert HTML elements to blocks
                const newBlocks = Array.from(doc.body.children).map(
                  (node, index) => {
                    const element = node as Element;
                    return {
                      id: `block-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
                      type: determineNodeType(element),
                      content: element.outerHTML,
                    };
                  },
                );

                // Set blocks and content
                setBlocks(newBlocks);
                setContent(parsedContent.content);

                // Update blocks in RichTextEditor
                const event = new CustomEvent("blocks-update", {
                  detail: newBlocks,
                });
                document.dispatchEvent(event);

                setSubject(parsedContent.subject || parsedContent.title || "");
              }
              // If it's the AI-generated format
              else if (Array.isArray(parsedContent.topStories)) {
                const formattedContent = `
                  <h1>Summary</h1>
                  ${parsedContent.executiveSummary}

                  <h1>Main Topics</h1>
                  ${parsedContent.topStories
                    .map(
                      (story) => `
                    <div class="story-section">
                      <h2>${story.title}</h2>
                      <div class="story-content">
                        ${story.description}
                        <p class="read-more">
                          <a href="${story.readMoreUrl}" target="_blank" rel="noopener noreferrer">Read more</a>
                        </p>
                      </div>
                      <div class="story-meta">
                        <span>Source: ${story.source}</span>
                        <span>Published: ${new Date(story.publishedAt).toLocaleDateString()}</span>
                        <span>Category: ${story.category}</span>
                      </div>
                    </div>
                  `,
                    )
                    .join("\n\n")}
                `;

                setContent(formattedContent);
                if (parsedContent.subject) {
                  setSubject(parsedContent.subject);
                } else if (
                  parsedContent.topStories &&
                  parsedContent.topStories[0]?.title
                ) {
                  setSubject(parsedContent.topStories[0].title);
                }
              }
            }
          } catch (err) {
            console.error("Failed to parse content param:", err);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to load content. Please try again.",
            });
          }
        }

        // Handle template data if present
        if (templateDataParam) {
          try {
            const decodedData = decodeURIComponent(atob(templateDataParam));
            console.log("Decoded template data:", decodedData); // Debug log
            const templateData = JSON.parse(decodedData);
            console.log("Parsed template data:", templateData); // Debug log

            setSelectedTemplate(templateData);

            // Initialize blocks from template data
            if (templateData.blocks?.length > 0) {
              console.log("Template blocks:", templateData.blocks);
              const newBlocks = templateData.blocks.map((block) => ({
                ...block,
                id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              }));
              setBlocks(newBlocks);

              // Pass both blocks and content to maintain consistency
              const combinedContent = newBlocks
                .map((b) => b.content)
                .join("\n");
              if (
                templateData.html &&
                templateData.html.includes("{{content}}")
              ) {
                const contentWithTemplate = templateData.html.replace(
                  /\{\{content\}\}/g,
                  combinedContent,
                );
                setContent(contentWithTemplate);
              } else {
                setContent(combinedContent);
              }

              // Update blocks in RichTextEditor
              const event = new CustomEvent("blocks-update", {
                detail: newBlocks,
              });
              document.dispatchEvent(event);
            } else if (templateData.html) {
              console.log("Template HTML:", templateData.html);
              const parser = new DOMParser();
              const doc = parser.parseFromString(
                templateData.html,
                "text/html",
              );
              const newBlocks = Array.from(doc.body.children).map(
                (node, index) => ({
                  id: `block-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
                  type: determineNodeType(node as Element),
                  content: node.outerHTML,
                }),
              );
              setBlocks(newBlocks);
              setContent(templateData.html);
            }

            if (templateData.styles) {
              setStyles(templateData.styles);
            }
            setLoading(false);
          } catch (err) {
            console.error("Failed to parse template data:", err);
            setError("Failed to load template");
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to load template. Please try again.",
            });
          }
        }

        // Try to load draft from localStorage if no content param
        const savedDraft = localStorage.getItem("newsletter_draft");
        if (!contentParam && !templateDataParam && savedDraft) {
          try {
            const draft = JSON.parse(savedDraft);
            setContent(draft.content || "");
            setSubject(draft.subject || "");
            setStyles(draft.styles || stylePresets[0].styles);
            setLastSaved(draft.lastSaved ? new Date(draft.lastSaved) : null);
          } catch (err) {
            console.warn("Failed to load draft:", err);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading content:", error);
        setError("Failed to load content. Please try again.");
        setLoading(false);
      }
    };

    loadContent();
  }, [search]);

  const saveDraft = useCallback(
    debounce(() => {
      setIsSaving(true);
      const draft = {
        subject,
        content,
        styles,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem("newsletter_draft", JSON.stringify(draft));
      setLastSaved(new Date());
      setIsSaving(false);

      toast({
        title: "Draft Saved",
        description: "Your newsletter draft has been saved",
        duration: 2000,
      });
    }, 1000),
    [subject, content, styles, toast],
  );

  useEffect(() => {
    if (subject || content) {
      saveDraft();
    }
  }, [subject, content, styles, saveDraft]);

  const handleSendNewsletter = async () => {
    if (!subject || !content) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Please provide both subject and content for the newsletter",
      });
      return;
    }

    setSending(true);
    try {
      // Preserve HTML formatting while ensuring safety
      const sanitizedContent = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [
          "h1",
          "h2",
          "h3",
          "p",
          "br",
          "ul",
          "ol",
          "li",
          "strong",
          "em",
          "u",
          "img",
          "a",
          "div",
          "span",
        ],
        ALLOWED_ATTR: ["class", "style", "href", "src", "alt", "target"],
        KEEP_CONTENT: true,
      });

      // Replace newlines with <br> tags only in <p> tags
      const formattedContent = sanitizedContent.replace(
        /(<p[^>]*>.*?)[\n\r]+(.*?<\/p>)/g,
        "$1<br>$2",
      );

      const response = await fetch("/api/newsletters/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          content: formattedContent,
          test: testMode,
          testEmail: testMode ? testEmail : undefined,
          scheduleType,
          scheduledAt:
            scheduleType === "later"
              ? new Date(scheduleDate).toISOString()
              : undefined,
          selectedGroupId, // Added selectedGroupId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send newsletter");
      }

      toast({
        title: "Success",
        description: data.message,
      });

      setSendDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send newsletter",
      });
    } finally {
      setSending(false);
    }
  };

  const handleStyleChange = (key: string, value: any) => {
    setStyles((prevStyles) => ({
      ...prevStyles,
      [key]: value,
    }));
  };

  const handleSaveTemplate = async (saveAsNew = false) => {
    try {
      if (!content || content.trim() === "") {
        toast({
          variant: "destructive",
          title: "Invalid Content",
          description: "Template content cannot be empty",
        });
        return;
      }

      // Use the current blocks from state if available, otherwise parse from content
      let templateBlocks;
      
      if (blocks && blocks.length > 0) {
        // Use existing blocks from state which maintains edits
        console.log("Using existing blocks from state:", blocks.length);
        templateBlocks = [...blocks]; // Clone to avoid reference issues
      } else {
        // Parse the HTML content into blocks
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "text/html");

        // Create blocks from the content
        templateBlocks = Array.from(doc.body.children).map((node, index) => ({
          id: `block-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          type: determineNodeType(node as Element),
          content: node.outerHTML,
        }));
      }

      // If no blocks were created or available, create a fallback block
      if (templateBlocks.length === 0) {
        console.log("Creating fallback block from entire content");
        templateBlocks = [
          {
            id: `block-${Date.now()}-fallback-${Math.random().toString(36).substr(2, 9)}`,
            type: "html",
            content: content,
          },
        ];
      }

      // Generate a template ID
      // If we're updating an existing template, use its ID
      // Otherwise, create a new ID
      // Ensure we use existing ID when updating
      const isActuallyUpdating = isUpdatingTemplate && !saveAsNew;
      const templateId = isActuallyUpdating && selectedTemplate?.id 
        ? selectedTemplate.id 
        : Date.now().toString();

      console.log(
        "Template operation:", 
        isActuallyUpdating ? "UPDATING existing template" : "Creating NEW template",
        "Template ID:", templateId,
        "isUpdatingTemplate flag:", isUpdatingTemplate,
        "saveAsNew flag:", saveAsNew
      );

      // Debug the original selected template to understand what we're updating
      if (isActuallyUpdating && selectedTemplate) {
        console.log("UPDATING EXISTING TEMPLATE WITH ID:", selectedTemplate.id, 
          "Original template properties:", Object.keys(selectedTemplate));
      }

      const templateData = {
        id: templateId,
        name: templateName || `Template ${new Date().toLocaleString()}`,
        description: templateDescription || "Custom template",
        preview: "/templates/blank-template.png",
        html: content,
        blocks: templateBlocks,
        structure: {
          blocks: templateBlocks,
          version: "1.0",
        },
        isUpdate: isActuallyUpdating // Explicitly set isUpdate flag
      };

      // Debug the template data
      console.log(
        "Template data being saved:",
        JSON.stringify(templateData, null, 2),
      );
      console.log("Content type:", typeof content);
      console.log(
        "Blocks structure:",
        `Array with ${templateBlocks.length} items`,
      );

      // If somehow we still have no blocks, show error
      if (templateBlocks.length === 0) {
        toast({
          variant: "destructive",
          title: "Invalid Blocks",
          description: "Template blocks must be a non-empty array",
        });
        return;
      }

      // Explicitly set isUpdate flag based on actual operation
      const isUpdate = isActuallyUpdating;
      
      console.log("📤 Sending to server with isUpdate flag:", isUpdate);
      
      // For existing templates, make sure we preserve the exact original ID format
      let finalTemplateData = { ...templateData };
      
      if (isUpdate && selectedTemplate?.id) {
        console.log("Using original template ID format:", selectedTemplate.id);
        finalTemplateData.id = selectedTemplate.id;
      }
      
      console.log("Final request data:", JSON.stringify(finalTemplateData, null, 2));
      
      const response = await fetch("/api/templates/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...finalTemplateData,
          isUpdate: isUpdate, // Use our explicit flag
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server response:", response.status, errorData);
        throw new Error(errorData.message || "Failed to save template");
      }

      const savedTemplateResponse = await response.json();

      toast({
        title: "Success",
        description: `Template ${isUpdate ? "updated" : "saved"} successfully`,
      });

      // Always use the updated template data for consistency
      setSelectedTemplate(templateData);
      localStorage.setItem("activeTemplateId", templateData.id);
      
      // Update our editing state
      setIsEditingTemplate(true);
      
      // Update our working copy in localStorage
      localStorage.setItem("working_template", JSON.stringify(templateData));

      // Close the dialog and reset fields
      setSaveTemplateDialogOpen(false);
      setTemplateName("");
      setTemplateDescription("");
      setShowSaveAsNew(false);
      
      // Only keep isUpdatingTemplate flag when we're actually updating
      if (isUpdate) {
        setIsUpdatingTemplate(true);
      } else {
        setIsUpdatingTemplate(false);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save template",
      });
    }
  };

  // Handle block changes, including deletions
  const handleBlocksChange = (newBlocks: any[]) => {
    // Update blocks state
    setBlocks(newBlocks);
    
    // Generate HTML content from blocks
    const newContent = newBlocks.map((block) => block.content).join("");
    setContent(newContent);
    
    // Mark template as modified
    setIsTemplateModified(true);
    
    // Update working template in localStorage
    if (selectedTemplate) {
      const updatedTemplate = {
        ...selectedTemplate,
        blocks: newBlocks,
        html: newContent,
        isModified: true
      };
      
      // Save to localStorage to prevent reloading original content
      localStorage.setItem("working_template", JSON.stringify(updatedTemplate));
      
      // Update selected template with new data
      setSelectedTemplate(updatedTemplate);
    }
  };
  
  const updateContent = (newBlocks: any[]) => {
    handleBlocksChange(newBlocks);
  };

  // Add a new state to track when template is being edited
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  // Add a state to track if we're using a modified version of the template
  const [isTemplateModified, setIsTemplateModified] = useState(false);

  const handleUseTemplate = (template: any) => {
    console.log("handleUseTemplate called with:", template);

    if (!template) {
      console.error("Received empty template");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid template data",
      });
      return;
    }

    // Create a deep copy of the template to prevent mutation of the original
    const templateCopy = JSON.parse(JSON.stringify(template));
    
    // Set the selected template (use the deep copy)
    setSelectedTemplate(templateCopy);
    localStorage.setItem("activeTemplateId", templateCopy.id);
    
    // Mark that we are now editing this template
    setIsEditingTemplate(true);
    // Reset the modification state
    setIsTemplateModified(false);

    // Validate template HTML
    if (!templateCopy.html || typeof templateCopy.html !== "string") {
      console.error(
        "Template missing HTML content or invalid HTML type:",
        templateCopy.html,
      );
      toast({
        variant: "destructive",
        title: "Error",
        description: "Template has invalid HTML content",
      });

      // Set default content
      setContent("<p>Start editing your template...</p>");
      setBlocks([
        {
          id: `block-${Date.now()}-0-${Math.random().toString(36).substring(2, 9)}`,
          type: "text",
          content: "<p>Start editing your template...</p>",
        },
      ]);
      setIsTemplateModified(true);
      return;
    }

    // Update content state with template HTML
    console.log(
      "Setting content from template HTML:",
      templateCopy.html.substring(0, 100) + "...",
    );
    setContent(templateCopy.html);

    // Process blocks with unique IDs to prevent update collisions
    let finalBlocks;
    
    // If the template has blocks, use them but ensure unique IDs
    if (templateCopy.blocks && Array.isArray(templateCopy.blocks)) {
      console.log("Setting blocks from template:", templateCopy.blocks.length);
      
      // Generate new unique IDs for each block to ensure clean editing
      finalBlocks = templateCopy.blocks.map(block => ({
        ...block,
        id: `block-edit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      }));
      
      setBlocks(finalBlocks);
    } else {
      console.warn("Template missing blocks array, will need to parse HTML");
      // Parse HTML into blocks if no blocks are provided
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(templateCopy.html, "text/html");

        finalBlocks = Array.from(doc.body.children).map((node, index) => {
          const element = node as Element;
          return {
            id: `block-edit-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
            type: determineNodeType(element),
            content: element.outerHTML,
          };
        });

        console.log("Created blocks from HTML:", finalBlocks.length);
        setBlocks(finalBlocks);
      } catch (error) {
        console.error("Error parsing template HTML:", error);
        finalBlocks = [];
      }
    }

    // Update blocks in RichTextEditor component only if we have blocks
    if (finalBlocks && finalBlocks.length > 0) {
      const event = new CustomEvent("blocks-update", {
        detail: finalBlocks,
      });
      document.dispatchEvent(event);
    }

    // Enable the "Update Template" option by default
    setIsUpdatingTemplate(true);
    
    // Save this working copy to localStorage to prevent reloading the original
    localStorage.setItem("working_template", JSON.stringify({
      ...templateCopy,
      blocks: finalBlocks,
    }));
  };

  useEffect(() => {
    const initializeTemplate = async () => {
      setLoading(true);
      
      // Check if user just logged in (fresh session)
      const isNewSession = localStorage.getItem("editor_session_active") !== "true";
      
      // If it's a new session, we'll use a blank template by default
      // This ensures that after logout, user will always see blank template
      if (isNewSession) {
        console.log("New editor session detected - using blank template");
        // Mark that we now have an active session
        localStorage.setItem("editor_session_active", "true");
        // Use blank template as default
        handleUseTemplate(BLANK_TEMPLATE);
        setLoading(false);
        return;
      }
      
      // For existing sessions, check if we have a working template in localStorage
      const workingTemplateJSON = localStorage.getItem("working_template");
      
      if (workingTemplateJSON && isEditingTemplate) {
        // If we're already editing a template and have a working copy, use that
        try {
          const workingTemplate = JSON.parse(workingTemplateJSON);
          console.log("Resuming with working template copy:", workingTemplate.name);
          setSelectedTemplate(workingTemplate);
          setContent(workingTemplate.html || "");
          
          if (workingTemplate.blocks && Array.isArray(workingTemplate.blocks)) {
            setBlocks(workingTemplate.blocks);
          }
          
          setLoading(false);
          return; // Don't proceed to fetch from server
        } catch (error) {
          console.error("Error parsing working template:", error);
          // If there's an error, fall back to loading from server
        }
      }
      
      // Check for specific content in URL params (this would be from generator features)
      const params = new URLSearchParams(window.location.search);
      const hasContentParam = params.has("content") || params.has("templateData");
      
      // Don't load saved template if we have content params - those should take precedence
      if (hasContentParam) {
        setLoading(false);
        return;
      }
      
      // If no working template or not in editing mode, try to load from server
      const templateId = localStorage.getItem("activeTemplateId");

      if (templateId) {
        try {
          const response = await fetch(`/api/templates/${templateId}`, {
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error("Failed to fetch template");
          }

          const data = await response.json();
          if (data.success && data.template) {
            handleUseTemplate(data.template);
          }
        } catch (error) {
          console.error("Error loading template:", error);
          // Use blank template as fallback if server template fails
          handleUseTemplate(BLANK_TEMPLATE);
        } finally {
          setLoading(false);
        }
      } else {
        // If no template ID is saved, use blank template
        handleUseTemplate(BLANK_TEMPLATE);
        setLoading(false);
      }
    };

    initializeTemplate();
  }, [isEditingTemplate, search]);

  if (!user) {
    setLocation("/");
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <Card className="p-6">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p>Loading editor...</p>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        {loading ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <Card className="p-6">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p>Loading editor...</p>
              </div>
            </Card>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b sticky top-0 bg-background z-10">
              <div className="container py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Input
                      placeholder="Newsletter Subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-[400px]"
                    />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {isSaving ? (
                        <Cloud className="h-4 w-4 animate-pulse" />
                      ) : lastSaved ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : null}
                      {lastSaved && (
                        <span>Last saved {lastSaved.toLocaleTimeString()}</span>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {wordCount} words
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { if (previewMode) { setPreviewMode(false); } else { setPreviewModalOpen(true); } }}
                      className="gap-2"
                    >
                      {previewMode ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Exit Preview
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          Preview
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/editor")}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Selector */}
            <div className="container py-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Newsletter Template</h2>
                <div className="flex items-center gap-2">
                  {selectedTemplate ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        console.log("🔄 Update Template button clicked");
                        console.log("📋 Current template data:", selectedTemplate);
                        setIsUpdatingTemplate(true);
                        setTemplateName(selectedTemplate.name);
                        setTemplateDescription(
                          selectedTemplate.description || "",
                        );
                        setSaveTemplateDialogOpen(true);
                      }}
                      className="gap-2"
                    >
                      Update Template
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsUpdatingTemplate(false);
                      setTemplateName("");
                      setTemplateDescription("");
                      setSaveTemplateDialogOpen(true);
                    }}
                    className="gap-2"
                  >
                    Save as Template
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setTemplateDialogOpen(true)}
                    className="gap-2"
                  >
                    Change Template
                  </Button>
                  <TemplateDialog
                    open={templateDialogOpen}
                    onOpenChange={setTemplateDialogOpen}
                    onSelect={(template) => {
                      if (template) {
                        handleUseTemplate(template);
                      }
                      setTemplateDialogOpen(false);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="container py-6 pb-48">
              <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                {/* Editor or Preview */}
                <div className="space-y-4">
                  <div className={!previewMode ? "hidden" : ""}>
                    <div className="relative bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
                      <div className="flex items-center justify-between p-4 border-b">
                        <div>
                          <h2 className="text-xl font-semibold">Preview</h2>
                          <p className="text-sm text-muted-foreground">
                            Subject: {subject}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewDevice("mobile")}
                            className={
                              previewDevice === "mobile" ? "bg-accent" : ""
                            }
                          >
                            Mobile
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewDevice("tablet")}
                            className={
                              previewDevice === "tablet" ? "bg-accent" : ""
                            }
                          >
                            Tablet
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewDevice("desktop")}
                            className={
                              previewDevice === "desktop" ? "bg-accent" : ""
                            }
                          >
                            Desktop
                          </Button>
                        </div>
                      </div>
                      <div
                        className={`p-6 overflow-auto transition-all ${
                          previewDevice === "mobile"
                            ? "max-w-[375px]"
                            : previewDevice === "tablet"
                              ? "max-w-[768px]"
                              : "max-w-full"
                        } mx-auto`}
                        style={{
                          backgroundColor: styles.backgroundColor,
                          color: styles.textColor,
                          fontFamily: styles.fontFamily,
                          fontSize: styles.fontSize,
                        }}
                      >
                        <div
                          className="preview-content"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(
                              selectedTemplate
                                ? selectedTemplate.html.replace(
                                    /\{\{content\}\}/g,
                                    content,
                                  )
                                : content,
                              {
                                ADD_ATTR: ["style", "data-alignment"],
                                ADD_TAGS: ["div", "span"],
                              },
                            ).replace(
                              /<(p|h[1-6]|div|span|ul|ol|li)[^>]*style="([^"]*?text-align\s*:\s*(center|right|left|justify)[^"]*?)"([^>]*)>/gi,
                              (match, tag, style, alignment, rest) => {
                                const enhancedStyle = style.replace(
                                  /(text-align\s*:\s*(left|right|center|justify))/gi,
                                  "$1 !important",
                                );
                                return `<${tag} style="${enhancedStyle}" data-alignment="${alignment}"${rest}>`;
                              },
                            ),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className={previewMode ? "hidden" : ""}>
                    <div className="relative">
                      <div className="border rounded-lg overflow-hidden">
                        <RichTextEditor
                          content={content}
                          onChange={setContent}
                          onWordCountChange={setWordCount}
                          styles={styles}
                          template={selectedTemplate || null}
                          subject={subject}
                          isPreview={previewMode}
                          editableAreas={["content", "social-links", "logo"]}
                          onBlocksChange={handleBlocksChange} // Pass our custom handler instead of setBlocks
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Style Controls */}
                <div className="space-y-6">
                  <Card className="p-4">
                    <div className="space-y-6">
                      <div className="flex gap-2 border-b border-gray-800 pb-2">
                        <Button
                          variant={
                            activeTab === "style" ? "secondary" : "ghost"
                          }
                          size="sm"
                          onClick={() => setActiveTab("style")}
                          className="flex-1"
                        >
                          Style
                        </Button>
                        <Button
                          variant={activeTab === "send" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setActiveTab("send")}
                          className="flex-1"
                        >
                          Send
                        </Button>
                      </div>

                      {activeTab === "style" && (
                        <div className="space-y-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>FontFamily</Label>
                              <Select
                                value={styles.fontFamily}
                                onValueChange={(value) =>
                                  handleStyleChange("fontFamily", value)
                                }
                              >
                                <SelectTrigger className=" border-gray-800">
                                  <SelectValue placeholder="Select font family" />
                                </SelectTrigger>
                                <SelectContent>
                                  {fontFamilies.map((font) => (
                                    <SelectItem
                                      key={font.value}
                                      value={font.value}
                                    >
                                      {font.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="">Font Size</Label>
                              <Select
                                value={styles.fontSize}
                                onValueChange={(value) =>
                                  handleStyleChange("fontSize", value)
                                }
                              >
                                <SelectTrigger className=" border-gray-800">
                                  <SelectValue placeholder="Select font size" />
                                </SelectTrigger>
                                <SelectContent>
                                  {fontSizes.map((size) => (
                                    <SelectItem key={size} value={size}>
                                      {size}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                              <ColorPicker
                                label="Background Color"
                                value={styles.backgroundColor}
                                onChange={(color) =>
                                  handleStyleChange("backgroundColor", color)
                                }
                              />
                            </div>
                          </div>
                      )}

                      {activeTab === "send" && (
                        <div className="space-y-4">
                          <Button
                            onClick={() => setSendDialogOpen(true)}
                            className="w-full flex items-center gap-2"
                            disabled={sending}
                            data-onboarding-target="send"
                          >
                            <Send className="h-4 w-4" />
                            Send Newsletter
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Button
                    onClick={() => setChatModalOpen(true)}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    AI News Assistant
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">Beta</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Send Dialog */}
          </>
        )}
                <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Newsletter</DialogTitle>
              <DialogDescription>
                Choose your sending options
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Step 1: Choose between test or real sending */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Sending Mode</div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="test-mode"
                      checked={testMode}
                      onCheckedChange={setTestMode}
                    />
                    <Label htmlFor="test-mode" className="text-sm">
                      {testMode ? "Test Mode" : "Production Mode"}
                    </Label>
                  </div>
                </div>

                {testMode ? (
                  <div className="space-y-2">
                    <Label htmlFor="test-email">Test Email Address</Label>
                    <Input
                      id="test-email"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="Enter test email address"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      The newsletter will only be sent to this email address for testing
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="subscriber-group">Recipient Selection</Label>
                    <Select
                      onValueChange={(value) => setSelectedGroupId(value)}
                      value={selectedGroupId || "all"}
                      id="subscriber-group"
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select recipients" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subscribers</SelectItem>
                        {groups?.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {selectedGroupId && selectedGroupId !== "all"
                        ? "Only subscribers in the selected group will receive this newsletter"
                        : "All active subscribers will receive this newsletter"}
                    </p>
                  </div>
                )}
              </div>

              {/* Step 2: Choose when to send */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="font-medium mb-2">Schedule</div>
                <div className="space-y-2">
                  <Select
                    onValueChange={(value) =>
                      setScheduleType(value as "now" | "later")
                    }
                    defaultValue={scheduleType}
                    value={scheduleType}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select when to send" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Send Immediately</SelectItem>
                      <SelectItem value="later">Schedule for Later</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {scheduleType === "later" && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="schedule-date">Schedule Date & Time</Label>
                      <Input
                        id="schedule-date"
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSendDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendNewsletter}
                disabled={
                  sending ||
                  (testMode && !testEmail) ||
                  (scheduleType === "later" && !scheduleDate)
                }
                className="gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {scheduleType === "later" ? "Scheduling..." : "Sending..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {testMode 
                      ? "Send Test" 
                      : scheduleType === "later"
                        ? "Schedule Newsletter"
                        : "Send Newsletter"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={saveTemplateDialogOpen}
          onOpenChange={setSaveTemplateDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isUpdatingTemplate ? "Update Template" : "Save as Template"}
              </DialogTitle>
              <DialogDescription>
                {isUpdatingTemplate
                  ? "Update your existing template with the current design"
                  : "Save your current newsletter design as a reusable template"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Enter template name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Input
                  id="template-description"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Enter template description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSaveTemplateDialogOpen(false)}
              >
                Cancel
              </Button>
              {isUpdatingTemplate && (
                <Button
                  onClick={() => handleSaveTemplate(true)}
                  disabled={!templateName}
                >
                  Save as New Template
                </Button>
              )}
              <Button
                onClick={() => handleSaveTemplate(false)}
                disabled={!templateName}
              >
                {isUpdatingTemplate ? "Update Template" : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <ChatModal
          open={chatModalOpen}
          onOpenChange={setChatModalOpen}
          onNewsSelect={(stories) => {
            // Update content with selected stories
            if (stories && stories.length > 0) {
              const newContent = stories
                .map(
                  (story) => `
                <h2>${story.title}</h2>
                <p>${story.description}</p>
                <div class="story-meta">
                  <span>Source: ${story.source}</span>
                  <span>Published: ${new Date(story.publishedAt).toLocaleDateString()}</span>
                  <span>Category: ${story.category}</span>
                </div>
              `,
                )
                .join("\n\n");

              setContent((content) => content + "\n\n" + newContent);
            }
          }}
        />
      </div>
        {/* Newsletter Preview Modal */}
        <NewsletterPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title="Newsletter Preview"
          template={selectedTemplate}
          content={{
            blocks: blocks,
            content: content,
            fontFamily: styles.fontFamily,
            fontColor: styles.textColor,
            backgroundColor: styles.backgroundColor,
            accentColor: "#000000",
          }}
        />
    </DashboardLayout>
  );
};

export default ContentEditor;

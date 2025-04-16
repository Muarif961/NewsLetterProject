import { useState, useEffect, useRef, useCallback } from "react";
import "@/styles/rich-text-editor.css";
import { Button } from "@/components/ui/button";
import { AITextEditor } from "@/components/ai-text-editor";

// Helper function to find nearest element by tag name
const findNearestElement = (node: Node | null, tagName: string): HTMLElement | null => {
  if (!node) return null;
  
  // If node is an element and matches the tag name, return it
  if (node.nodeType === Node.ELEMENT_NODE && 
      (node as Element).tagName.toUpperCase() === tagName.toUpperCase()) {
    return node as HTMLElement;
  }
  
  // Check if parent is the element we're looking for
  if (node.parentElement && 
      node.parentElement.tagName.toUpperCase() === tagName.toUpperCase()) {
    return node.parentElement;
  }
  
  // Otherwise, recurse up the tree
  return findNearestElement(node.parentElement, tagName);
};
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  List,
  Link2,
  Image,
  Underline,
  Quote,
  Code,
  Strikethrough,
  Undo,
  Redo,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  GripVertical,
  Layout,
  Grid3X3,
  ImagePlus,
  Type,
  Palette,
  Divide,
  Table,
  ListOrdered,
  Copy,
  ExternalLink,
  BookOpen,
  Plus,
  Link,
  Command,
  Trash2,
  Indent,
  Outdent,
  CaseSensitive,
  ChevronUp,
  ChevronDown,
  Edit,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { DragSourceMonitor } from "react-dnd";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link as RouterLink } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChatPrompt } from "./chat-prompt";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageGenerationModal } from "./modals/image-generation-modal";
import ImageEditModal from "./modals/image-edit-modal";
import { ButtonCustomizationModal } from "./modals/button-customization-modal";

interface IconSelection {
  name: string;
  url: string;
  path?: string;
  displayIcon?: string;
  iconUrl?: string;
}

interface BlockProps {
  id: string;
  type: string;
  content: string;
  index: number;
  moveBlock: (dragIndex: number, hoverIndex: number) => void;
  onContentChange: (id: string, content: string) => void;
  isPreview?: boolean;
  onSelect: (element: HTMLDivElement) => void;
  onDelete: (id: string) => void;
  blocks: Array<{ id: string; type: string; content: string }>;
  setBlocks: React.Dispatch<
    React.SetStateAction<Array<{ id: string; type: string; content: string }>>
  >;
  updateContent: (
    blocks: Array<{ id: string; type: string; content: string }>,
  ) => void;
  expandedBlocks: Set<string>;
  toggleBlockExpand: (id: string) => void;
}

import React from "react";

interface FloatingToolbarProps {
  selection: Selection | null;
  onStyleChange: (property: string, value: string) => void;
  editorRef?: React.RefObject<HTMLDivElement>;
}

const FloatingToolbar = ({
  selection,
  onStyleChange,
  editorRef,
}: FloatingToolbarProps) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showAIEditor, setShowAIEditor] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectionSnapshot, setSelectionSnapshot] = useState<{
    range: Range | null;
    text: string;
  }>({ range: null, text: "" });

  useEffect(() => {
    if (selection && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Get editor's bounding rectangle to calculate relative position
      const editorRect = editorRef?.current?.getBoundingClientRect() || { top: 0, left: 0 };

      if (toolbarRef.current) {
        const toolbarHeight = toolbarRef.current.offsetHeight || 40; // Default height if not measurable
        
        setPosition({
          top: rect.top - editorRect.top - toolbarHeight - 8, // 8px gap
          left: rect.left - editorRect.left + rect.width / 2,
        });
      }
      
      // Store the selected text
      const text = range.toString();
      setSelectedText(text);
      
      // Create a snapshot of the current selection
      const rangeClone = range.cloneRange();
      setSelectionSnapshot({ range: rangeClone, text });
    }
  }, [selection, editorRef]);

  const handleAIEnhance = (e: React.MouseEvent) => {
    // Prevent the default behavior which might cause selection to be lost
    e.preventDefault();
    e.stopPropagation();
    
    // Store current selection text before opening AI editor
    if (selection && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const text = range.toString();
      setSelectedText(text);
      setSelectionSnapshot({ range: range.cloneRange(), text });
    }
    
    setShowAIEditor(true);
  };

  const applyAIChanges = (newText: string) => {
    try {
      // Use the selection snapshot if the current selection is lost
      if ((!selection || selection.isCollapsed) && selectionSnapshot.range) {
        // Create a new selection using the stored range
        const newSelection = window.getSelection();
        if (newSelection) {
          newSelection.removeAllRanges();
          newSelection.addRange(selectionSnapshot.range);
          
          // Delete the content in the range
          selectionSnapshot.range.deleteContents();
          
          // Insert the new text
          const textNode = document.createTextNode(newText);
          selectionSnapshot.range.insertNode(textNode);
          
          // Apply style change to trigger update
          onStyleChange("aiEnhanced", "true");
          
          // Reset the selection snapshot
          setSelectionSnapshot({ range: null, text: "" });
        }
      } else if (selection && !selection.isCollapsed) {
        // Use current selection if it's still valid
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Insert the new content
        const textNode = document.createTextNode(newText);
        range.insertNode(textNode);
        
        // Update range and selection
        range.setStartAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Apply style change event to trigger content update
        onStyleChange("aiEnhanced", "true");
      }
    } catch (error) {
      console.error("Error applying AI changes:", error);
      // Fallback method - find closest editable element and update its content
      if (editorRef && editorRef.current) {
        const editableDiv = editorRef.current.querySelector('[contenteditable="true"]');
        if (editableDiv && selectionSnapshot.text) {
          const oldContent = editableDiv.innerHTML;
          const newContent = oldContent.replace(
            selectionSnapshot.text,
            newText
          );
          editableDiv.innerHTML = newContent;
          
          // Trigger content update
          onStyleChange("content", "updated");
        }
      }
    }
    
    // Close the AI editor
    setShowAIEditor(false);
  };

  if ((!selection || selection.isCollapsed) && !showAIEditor) {
    return null;
  }

  // Improved color picker (replace with a true color picker library for better UX)
  const colorOptions = [
    { label: "Black", value: "#000000" },
    { label: "Red", value: "#FF0000" },
    { label: "Blue", value: "#0000FF" },
    { label: "Green", value: "#008000" },
    { label: "Yellow", value: "#FFFF00" },
    { label: "Cyan", value: "#00FFFF" },
    { label: "Magenta", value: "#FF00FF" },
    { label: "Orange", value: "#FFA500" },
    { label: "Purple", value: "#800080" },
    { label: "Pink", value: "#FFC0CB" },
    { label: "Brown", value: "#A52A2A" },
    { label: "Gray", value: "#808080" },
  ];


  const textStyles = [
    { label: "Normal Text", value: "p" },
    { label: "Heading 1", value: "h1" },
    { label: "Heading 2", value: "h2" },
    { label: "Heading 3", value: "h3" },
    { label: "Bullet List", value: "bullet-list" },
    { label: "Number List", value: "number-list" },
  ];

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[1000] bg-background border rounded-lg shadow-lg p-2 flex items-center gap-1 transform -translate-x-1/2"
      style={{
        top: `${position.top - 20}px`, // Position closer to the text (reduced spacing)
        left: `${position.left}px`,
        pointerEvents: 'auto',  // Ensure clicks are captured
      }}
      onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onStyleChange("fontWeight", "bold")}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onStyleChange("fontStyle", "italic")}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onStyleChange("textDecoration", "underline")}
      >
        <Underline className="h-4 w-4" />
      </Button>

      {/* Text alignment buttons */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onStyleChange("textAlign", "left")}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onStyleChange("textAlign", "center")}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onStyleChange("textAlign", "right")}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onStyleChange("textAlign", "justify")}
        title="Justify"
      >
        <AlignJustify className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto p-2">
          <div className="grid grid-cols-4 gap-1">
            {[
              { label: "Black", value: "#000000" },
              { label: "Gray", value: "#6B7280" },
              { label: "Silver", value: "#9CA3AF" },
              { label: "White", value: "#FFFFFF" },
              { label: "Red", value: "#EF4444" },
              { label: "Orange", value: "#F97316" },
              { label: "Amber", value: "#F59E0B" },
              { label: "Yellow", value: "#EAB308" },
              { label: "Lime", value: "#84CC16" },
              { label: "Green", value: "#22C55E" },
              { label: "Emerald", value: "#10B981" },
              { label: "Teal", value: "#14B8A6" },
              { label: "Cyan", value: "#06B6D4" },
              { label: "Sky", value: "#0EA5E9" },
              { label: "Blue", value: "#3B82F6" },
              { label: "Indigo", value: "#6366F1" },
              { label: "Violet", value: "#8B5CF6" },
              { label: "Purple", value: "#A855F7" },
              { label: "Fuchsia", value: "#D946EF" },
              { label: "Pink", value: "#EC4899" },
              { label: "Rose", value: "#F43F5E" },
              { label: "Brown", value: "#92400E" },
              { label: "Navy", value: "#1E3A8A" },
              { label: "Dark Green", value: "#166534" }
            ].map((color) => (
              <button
                key={color.value}
                type="button"
                title={color.label}
                className="w-6 h-6 rounded cursor-pointer border border-gray-200 flex items-center justify-center hover:scale-110 transition-transform"
                style={{ backgroundColor: color.value }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log(`Applying color: ${color.value}`);
                  onStyleChange("color", color.value);
                }}
              >
                {color.value === "#FFFFFF" && (
                  <span className="text-gray-400 text-[8px]">WHITE</span>
                )}
              </button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* AI enhancement button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAIEnhance}
        title="Enhance with AI"
        className="ml-1 bg-primary/10 hover:bg-primary/20"
      >
        <Sparkles className="h-4 w-4 text-primary" />
      </Button>

      {/* AI Editor Dialog */}
      {showAIEditor && (
        <AITextEditor
          selectedText={selectedText}
          onApplyChanges={applyAIChanges}
          onClose={() => setShowAIEditor(false)}
        />
      )}
    </div>
  );
};

// Component for handling blocks inside a column
const ColumnContentBlock = ({
  content,
  columnIndex,
  blockId,
  onContentChange,
  isPreview
}: {
  content: string;
  columnIndex: number;
  blockId: string;
  onContentChange: (blockId: string, newContent: string, columnIndex: number) => void;
  isPreview?: boolean;
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  
  const handleBlur = () => {
    if (contentRef.current && contentRef.current.innerHTML !== content) {
      onContentChange(blockId, contentRef.current.innerHTML, columnIndex);
    }
  };
  
  if (isPreview) {
    return (
      <div 
        dangerouslySetInnerHTML={{ __html: content }} 
        className="column-content mb-2"
      />
    );
  }
  
  return (
    <div
      ref={contentRef}
      contentEditable={!isPreview}
      onBlur={handleBlur}
      dangerouslySetInnerHTML={{ __html: content }}
      suppressContentEditableWarning={true}
      className="column-content p-2 mb-2 border border-dashed border-gray-300 rounded"
      style={{ minHeight: "40px" }}
    />
  );
};

const DraggableBlock = ({
  id,
  type,
  content,
  index,
  moveBlock,
  onContentChange,
  isPreview,
  onSelect,
  onDelete,
  blocks,
  setBlocks,
  updateContent,
  expandedBlocks,
  toggleBlockExpand,
}: BlockProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [initialContent, setInitialContent] = useState(content);
  const [showInlineMenu, setShowInlineMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [currentSelection, setCurrentSelection] = useState<Selection | null>(
    null,
  );
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const lastMoveRef = useRef<number>(Date.now());

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: "BLOCK",
    item: () => ({ id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "BLOCK",
    hover: (item: { id: string; index: number }, monitor) => {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return;

      // Get rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Get mouse position
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Add a buffer zone of 15% to prevent rapid toggling when near the middle
      const buffer = (hoverBoundingRect.bottom - hoverBoundingRect.top) * 0.15;

      // Only perform the move when the mouse has crossed a significant threshold
      // When dragging downwards, only move when cursor is well below middle
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY - buffer) {
        return;
      }

      // When dragging upwards, only move when cursor is well above middle
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY + buffer) {
        return;
      }

      // Time to actually perform the action - use requestAnimationFrame
      // for smoother visual updates with throttling for performance
      const now = Date.now();
      if (now - lastMoveRef.current > 50) { 
        lastMoveRef.current = now;
        requestAnimationFrame(() => {
          moveBlock(dragIndex, hoverIndex);
          item.index = hoverIndex; // Immediately update index for smooth movement
        });
      }
    },
  });

  // Connect drag to handle only
  useEffect(() => {
    if (dragHandleRef.current) {
      drag(dragHandleRef.current);
    }
  }, [drag]);

  // Connect drop and preview to main container
  const connectRef = (el: HTMLDivElement | null) => {
    dragPreview(drop(el));
    ref.current = el;
  };

  const handleBlur = () => {
    if (contentRef.current && contentRef.current.innerHTML !== initialContent) {
      onContentChange(id, contentRef.current.innerHTML);
      setInitialContent(contentRef.current.innerHTML);
    }
  };

  const handleSelect = () => {
    if (contentRef.current) {
      onSelect(contentRef.current);
    }
  };

  const getBlockStyle = () => {
    switch (type) {
      case "h1":
        return "text-4xl font-bold";
      case "h2":
        return "text-3xl font-bold";
      case "h3":
        return "text-2xl font-bold";
      case "bullet-list":
        return "list-disc list-inside";
      case "number-list":
        return "list-decimal list-inside";
      case "icon":
        return "flex justify-center items-center";
      case "image":
        return "max-w-full";
      case "button":
        return "flex justify-center";
      case "ai-image":
        return "max-w-full";
      case "columns":
        return "w-full flex";
      default:
        return "";
    }
  };

  const handleInlineAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setShowInlineMenu(true);
  };

  const handleInlineBlockAdd = (blockType: (typeof blockTypes)[number]) => {
    if (blockType.type === "image") {
      setImageDialogOpen(true);
      setShowInlineMenu(false);
      return;
    }

    if (blockType.type === "icon") {
      setIconDialogOpen(true);
      setShowInlineMenu(false);
      return;
    }

    if (blockType.type === "ai-image") {
      setAiImageDialogOpen(true);
      setShowInlineMenu(false);
      return;
    }

    const newBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: blockType.type,
      content: blockType.defaultContent
        ? blockType.defaultContent.replace(
            />/,
            ' style="text-align: center !important;">',
          )
        : "",
    };

    const currentIndex = blocks.findIndex((block) => block.id === id);
    if (currentIndex === -1) return;

    const newBlocks = [...blocks];
    newBlocks.splice(currentIndex + 1, 0, newBlock);
    setBlocks(newBlocks);
    updateContent(newBlocks);
    setShowInlineMenu(false);
  };

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (
      selection &&
      !selection.isCollapsed &&
      contentRef.current?.contains(selection.anchorNode)
    ) {
      setCurrentSelection(selection);
    } else {
      setCurrentSelection(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseUp]);

  const handleStyleChange = (property: string, value: string) => {
    if (!contentRef.current) {
      console.log("No content ref found");
      return;
    }

    const element = contentRef.current;
    const selection = window.getSelection();
    console.log("Selection:", selection?.toString());

    if (property === "blockType") {
      console.log("Applying blockType:", value);
      
      // Enable styleWithCSS for better HTML formatting
      document.execCommand("styleWithCSS", false, "true");
      
      // Handle block type conversion
      if (selection && selection.rangeCount > 0) {
        try {
          // Get the current selection range
          const range = selection.getRangeAt(0);
          const selectedText = selection.toString();
          console.log("Selected text for block styling:", selectedText);
          
          // Use standard approach first - commands that correspond to the style
          if (value === "h1") {
            document.execCommand('formatBlock', false, 'h1');
            console.log("Applied H1 via formatBlock");
          } 
          else if (value === "h2") {
            document.execCommand('formatBlock', false, 'h2');
            console.log("Applied H2 via formatBlock");
          }
          else if (value === "h3") {
            document.execCommand('formatBlock', false, 'h3');
            console.log("Applied H3 via formatBlock");
          }
          else if (value === "p") {
            document.execCommand('formatBlock', false, 'p');
            console.log("Applied paragraph via formatBlock");
          }
          else if (value === "bullet-list") {
            document.execCommand('insertUnorderedList', false);
            // After creating list, find the list element and ensure it has proper alignment
            setTimeout(() => {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const listEl = findNearestElement(range.commonAncestorContainer, "UL");
                if (listEl) {
                  // Add data-alignment attribute to help with preservation in preview
                  listEl.setAttribute("data-alignment", "left");
                  listEl.style.setProperty("text-align", "left", "important");
                }
              }
            }, 0);
            console.log("Applied bullet list via insertUnorderedList");
          }
          else if (value === "number-list") {
            document.execCommand('insertOrderedList', false);
            // After creating list, find the list element and ensure it has proper alignment
            setTimeout(() => {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const listEl = findNearestElement(range.commonAncestorContainer, "OL");
                if (listEl) {
                  // Add data-alignment attribute to help with preservation in preview
                  listEl.setAttribute("data-alignment", "left");
                  listEl.style.setProperty("text-align", "left", "important");
                }
              }
            }, 0);
            console.log("Applied numbered list via insertOrderedList");
          }
          else {
            // If the standard command doesn't work, try the HTML insertion fallback
            console.log("Using HTML insertion fallback for block type:", value);
            
            // Create correct HTML based on the selected block type
            let newHtml = '';
            
            switch (value) {
              case "h1":
                newHtml = `<h1 class="text-4xl font-bold">${selectedText}</h1>`;
                break;
              case "h2":
                newHtml = `<h2 class="text-3xl font-bold">${selectedText}</h2>`;
                break;
              case "h3":
                newHtml = `<h3 class="text-2xl font-bold">${selectedText}</h3>`;
                break;
              case "bullet-list":
                newHtml = `<ul class="list-disc list-inside"><li>${selectedText}</li></ul>`;
                break;
              case "number-list":
                newHtml = `<ol class="list-decimal list-inside"><li>${selectedText}</li></ol>`;
                break;
              default:
                newHtml = `<p>${selectedText}</p>`;
                break;
            }
            
            // Try direct approach - delete the selected content and insert the new HTML
            if (!selection.isCollapsed && selectedText.length > 0) {
              // Delete the current selection
              document.execCommand('delete');
              
              // Insert the new HTML
              document.execCommand('insertHTML', false, newHtml);
              console.log("Block type applied via insertHTML");
            } else {
              // If no text is selected or the approach fails, try wrapping the existing element
              console.log("No selection, applying to whole element");
              
              // Create wrapper element with correct HTML structure
              const tagName = value === "bullet-list" ? "ul" : 
                            value === "number-list" ? "ol" : value;
              
              const className = value === "h1" ? "text-4xl font-bold" :
                              value === "h2" ? "text-3xl font-bold" :
                              value === "h3" ? "text-2xl font-bold" :
                              value === "bullet-list" ? "list-disc list-inside" :
                              value === "number-list" ? "list-decimal list-inside" : "";
              
              // For lists, we need to wrap content in list items
              if (value === "bullet-list" || value === "number-list") {
                // Split content by newlines and create list items
                const lines = element.textContent?.split('\n') || [element.textContent || ''];
                const listItems = lines.map(line => `<li>${line}</li>`).join('');
                element.innerHTML = `<${tagName} class="${className}">${listItems}</${tagName}>`;
              } else {
                // For headings or paragraphs, just wrap the content
                element.innerHTML = `<${tagName} class="${className}">${element.innerHTML}</${tagName}>`;
              }
            }
          }
        } catch (error) {
          console.error("Error applying block type:", error);
          
          // Last resort fallback - apply to the whole element directly
          const tagName = value === "bullet-list" ? "ul" : 
                         value === "number-list" ? "ol" : value;
          
          const className = value === "h1" ? "text-4xl font-bold" :
                          value === "h2" ? "text-3xl font-bold" :
                          value === "h3" ? "text-2xl font-bold" :
                          value === "bullet-list" ? "list-disc list-inside" :
                          value === "number-list" ? "list-decimal list-inside" : "";
          
          element.innerHTML = `<${tagName} class="${className}">${element.innerHTML}</${tagName}>`;
        }
        
        handleBlur();
        return;
      }
    } else if (
      (property === "color" || property === "backgroundColor") &&
      selection &&
      selection.rangeCount > 0
    ) {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();
      console.log("Applying color to text:", selectedText);
      
      try {
        // Approach suitable for contentEditable with direct HTML insertion
        if (!selection.isCollapsed && selectedText.length > 0) {
          // Direct HTML replacement approach
          const styleAttr = property === "color" 
            ? `style="color:${value}"` 
            : `style="background-color:${value}"`;
          
          // Create HTML for a styled span containing the selected text
          const styledHtml = `<span ${styleAttr}>${selectedText}</span>`;
          
          // Delete the current selection and insert our styled HTML
          document.execCommand("delete", false);
          document.execCommand("insertHTML", false, styledHtml);
          
          console.log(`Applied ${property} via direct HTML insertion`);
        } else {
          console.log("No selection, applying to whole element");
          // No selection, apply to the whole element
          element.style[property] = value;
        }
        
        handleBlur();
      } catch (error) {
        console.error("Error applying color:", error);
        
        // Fallback approach
        try {
          if (!selection.isCollapsed && selectedText.length > 0) {
            // Create a temporary span
            const tempSpan = document.createElement("span");
            
            // Set the appropriate style
            if (property === "color") {
              tempSpan.style.color = value;
            } else {
              tempSpan.style.backgroundColor = value;
            }
            
            // Insert at current selection
            const extractedContent = range.extractContents();
            tempSpan.appendChild(extractedContent);
            range.insertNode(tempSpan);
          } else {
            // Apply to whole element as last resort
            element.style[property] = value;
          }
        } catch (innerError) {
          console.error("Fallback error:", innerError);
          // Emergency fallback - apply to the whole element
          element.style[property] = value;
        }
        
        handleBlur();
      }
    } else if (["fontWeight", "fontStyle", "textDecoration"].includes(property) && selection && selection.rangeCount > 0) {
      // Handle inline formatting for selected text
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();
      
      // Enable styleWithCSS for better HTML formatting
      document.execCommand("styleWithCSS", false, "true");
      
      // Only apply to selected text if there is a selection
      if (!selection.isCollapsed && selectedText.length > 0) {
        try {
          // Use standard document.execCommand for formatting - simpler and more reliable
          switch (property) {
            case "fontWeight":
              document.execCommand("bold", false);
              break;
            case "fontStyle":
              document.execCommand("italic", false);
              break;
            case "textDecoration":
              document.execCommand("underline", false);
              break;
          }
          
          console.log(`Applied ${property} via execCommand`);
        } catch (error) {
          console.error(`Error applying ${property}:`, error);
          
          // Fallback - try direct HTML approach
          try {
            let styleAttr = '';
            
            switch (property) {
              case "fontWeight":
                styleAttr = 'style="font-weight:bold"';
                break;
              case "fontStyle":
                styleAttr = 'style="font-style:italic"';
                break;
              case "textDecoration":
                styleAttr = 'style="text-decoration:underline"';
                break;
            }
            
            // Create HTML for a styled span containing the selected text
            const styledHtml = `<span ${styleAttr}>${selectedText}</span>`;
            
            // Delete the current selection and insert our styled HTML
            document.execCommand("delete", false);
            document.execCommand("insertHTML", false, styledHtml);
            
          } catch (innerError) {
            console.error("Fallback error:", innerError);
            // Last resort fallback - apply to the whole element
            applyElementStyle(element, property, value);
          }
        }
      } else {
        // If no selection, toggle the style on the whole element
        applyElementStyle(element, property, value);
      }
      
      handleBlur();
    } else {
      // Handle other formatting cases
      switch (property) {
        case "textAlign":
          // Handle text alignment for selected text or the whole element
          try {
            // Enable styleWithCSS for better HTML formatting
            document.execCommand("styleWithCSS", false, "true");
            
            // Determine alignment command based on value
            let alignCommand = 'justifyLeft'; // default
            switch (value) {
              case "center":
                alignCommand = 'justifyCenter';
                break;
              case "right":
                alignCommand = 'justifyRight';
                break;
              case "justify":
                alignCommand = 'justifyFull';
                break;
              case "left":
              default:
                alignCommand = 'justifyLeft';
                break;
            }
            
            if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
              // If we have a selection, apply to the selected text
              
              // First, ensure text is wrapped in proper paragraph elements
              // Find the containing paragraph or other block element
              const range = selection.getRangeAt(0);
              const parentElement = range.commonAncestorContainer.nodeType === 1 
                ? range.commonAncestorContainer as HTMLElement
                : range.commonAncestorContainer.parentElement as HTMLElement;
                
              // If selection is not within a block element, wrap it in a paragraph
              if (parentElement && parentElement.nodeName.toLowerCase() === 'div' && 
                  !parentElement.getAttribute('data-block-type')) {
                document.execCommand('formatBlock', false, 'p');
                console.log("Wrapped selected text in paragraph element");
              }
              
              // Now apply the alignment
              document.execCommand(alignCommand, false);
              console.log(`Applied text alignment: ${value} using ${alignCommand}`);
              
              // Mark the containing block element with data-alignment attribute
              const blockElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'li', 'blockquote'];
              let currentNode: HTMLElement | null = range.commonAncestorContainer as HTMLElement;
              
              // Navigate up to find a block-level element
              while (currentNode && (!currentNode.nodeName || 
                     blockElements.indexOf(currentNode.nodeName.toLowerCase()) === -1)) {
                currentNode = currentNode.parentElement;
              }
              
              // If found, set the alignment attribute
              if (currentNode) {
                currentNode.style.setProperty("text-align", value, "important");
                currentNode.setAttribute("data-alignment", value);
              }
            } else {
              // If no selection, apply to the entire element
              
              // First check if we're dealing with plain text inside a content editable div
              // If so, wrap it in a paragraph first
              if (element.childNodes.length === 1 && element.firstChild?.nodeType === 3) {
                // It's a text node directly under the editable div, wrap it
                document.execCommand('formatBlock', false, 'p');
                console.log("Wrapped text node in paragraph element");
              }
              
              // Apply alignment to the entire element and all paragraph elements inside
              document.execCommand(alignCommand, false);
              
              // Also set styles directly to ensure it works
              element.style.setProperty("text-align", value, "important");
              element.setAttribute("data-alignment", value);
              
              // Find all paragraphs and apply alignment to them too
              const paragraphs = element.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div:not([data-block-type]), li, blockquote');
              paragraphs.forEach(p => {
                (p as HTMLElement).style.setProperty("text-align", value, "important");
                (p as HTMLElement).setAttribute("data-alignment", value);
              });
            }
          } catch (error) {
            console.error("Error applying text alignment:", error);
            
            // Final fallback: Apply alignment directly to the element
            element.style.setProperty("text-align", value, "important");
            element.setAttribute("data-alignment", value);
          }
          break;
        case "indent":
          const currentIndent = parseInt(element.style.marginLeft || "0");
          element.style.marginLeft = `${
            value === "increase"
              ? currentIndent + 20
              : Math.max(0, currentIndent - 20)
          }px`;
          break;
        case "fontSize":
          element.style[property] = value;
          break;
        case "textTransform":
          element.style.textTransform =
            element.style.textTransform === "uppercase" ? "none" : "uppercase";
          break;
        default:
          // Apply other styles directly to the element
          element.style.setProperty(property, value);
      }
    }

    handleBlur();
  };
  
  // Helper function to apply styles to whole element
  const applyElementStyle = (element: HTMLElement, property: string, value: string) => {
    switch (property) {
      case "fontWeight":
        element.style.fontWeight = element.style.fontWeight === "bold" ? "normal" : "bold";
        break;
      case "fontStyle":
        element.style.fontStyle = element.style.fontStyle === "italic" ? "normal" : "italic";
        break;
      case "textDecoration":
        element.style.textDecoration = element.style.textDecoration === "underline" ? "none" : "underline";
        break;
      default:
        element.style.setProperty(property, value);
    }
  };

  const inlineMenu = showInlineMenu && (
    <DropdownMenu open={showInlineMenu} onOpenChange={setShowInlineMenu}>
      <DropdownMenuContent
        className="w-56"
        style={{
          position: "absolute",
          left: `${menuPosition.x}px`,
          top: `${menuPosition.y}px`,
        }}
      >
        {blockTypes.map((blockType) => (
          <DropdownMenuItem
            key={blockType.type}
            onSelect={(e) => {
              e.preventDefault();
              handleInlineBlockAdd(blockType);
            }}
            className="flex items-center gap-2"
          >
            <blockType.icon className="h-4 w-4" />
            <div>
              <div>{blockType.label}</div>
              <p className="text-xs text-muted-foreground">
                {blockType.description}
              </p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isPreview) {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: content }}
        className={`mb-4 ${getBlockStyle()}`}
      />
    );
  }

  // Special handling for columns block
  if (type === "columns") {
    // Parse the columns content from the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    const columnDivs = tempDiv.querySelectorAll(".column");
    
    const handleColumnContentChange = (blockId: string, newContent: string, columnIndex: number) => {
      // Update the content of a specific column
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = content;
      const columns = tempDiv.querySelectorAll(".column");
      
      if (columns[columnIndex]) {
        columns[columnIndex].innerHTML = newContent;
        onContentChange(blockId, tempDiv.innerHTML);
      }
    };
    
    const handleAddBlockToColumn = (columnIndex: number, blockType: string) => {
      // Find the block type definition
      const blockTypeDef = blockTypes.find(bt => bt.type === blockType);
      if (!blockTypeDef) return;
      
      // Don't allow adding columns inside columns
      if (blockType === "columns") return;
      
      // Special handling for blocks with dialogs (image, icon, ai-image, button)
      if (blockType === "image") {
        // Store the column index in a data attribute on the document body for later retrieval
        document.body.setAttribute('data-column-target-index', columnIndex.toString());
        document.body.setAttribute('data-column-block-id', id);
        setImageDialogOpen(true);
        return;
      }
      
      if (blockType === "icon") {
        document.body.setAttribute('data-column-target-index', columnIndex.toString());
        document.body.setAttribute('data-column-block-id', id);
        setIconDialogOpen(true);
        return;
      }
      
      if (blockType === "ai-image") {
        document.body.setAttribute('data-column-target-index', columnIndex.toString());
        document.body.setAttribute('data-column-block-id', id);
        setAiImageDialogOpen(true);
        return;
      }
      
      if (blockType === "button") {
        document.body.setAttribute('data-column-target-index', columnIndex.toString());
        document.body.setAttribute('data-column-block-id', id);
        setButtonDialogOpen(true);
        return;
      }
      
      // For regular block types, create the default content
      let defaultContent = blockTypeDef.defaultContent || "";
      
      // Update the column's content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = content;
      const columns = tempDiv.querySelectorAll(".column");
      
      if (columns[columnIndex]) {
        // Add the new block to the column's content
        const columnContent = columns[columnIndex].innerHTML;
        columns[columnIndex].innerHTML = columnContent + defaultContent;
        onContentChange(id, tempDiv.innerHTML);
      }
    };
    
    return (
      <div
        ref={connectRef}
        data-block-id={id}
        data-block-type={type}
        className={`relative group flex flex-col gap-1 ${
          isDragging ? "opacity-50 bg-accent/50" : ""
        } ${
          !isPreview
            ? "py-2 px-3 border border-transparent hover:border-accent rounded-lg transition-colors"
            : ""
        }`}
      >
        {/* Invisible drag handle areas */}
        <div
          ref={dragHandleRef}
          className="absolute inset-0"
          style={{
            touchAction: "none",
            pointerEvents: "none",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-4 cursor-move" style={{ pointerEvents: "auto" }} />
          <div className="absolute bottom-0 left-0 right-0 h-4 cursor-move" style={{ pointerEvents: "auto" }} />
          <div className="absolute top-4 bottom-4 left-0 w-4 cursor-move" style={{ pointerEvents: "auto" }} />
          <div className="absolute top-4 bottom-4 right-0 w-4 cursor-move" style={{ pointerEvents: "auto" }} />
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium">Columns</span>
          </div>
          
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                  <GripVertical className="h-4 w-4 cursor-move text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onDelete(id)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const blockType = blockTypes.find((bt) => bt.type === type);
                    if (!blockType) return;

                    const newBlock = {
                      id: `block-${Date.now()}`,
                      type: type,
                      content: blockType.defaultContent || content,
                    };

                    const currentIndex = blocks.findIndex(
                      (block) => block.id === id,
                    );
                    const newBlocks = [...blocks];
                    newBlocks.splice(currentIndex + 1, 0, newBlock);
                    setBlocks(newBlocks);
                    updateContent(newBlocks);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="flex gap-4">
          {Array.from(columnDivs).map((column, colIndex) => (
            <div key={colIndex} className="flex-1 border border-dashed border-gray-300 rounded p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Column {colIndex + 1}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {blockTypes
                      .filter(blockType => blockType.type !== "columns") // Exclude nested columns
                      .map((blockType) => (
                        <DropdownMenuItem
                          key={blockType.type}
                          onClick={() => handleAddBlockToColumn(colIndex, blockType.type)}
                          className="flex items-center gap-2"
                        >
                          <blockType.icon className="h-4 w-4" />
                          <div>
                            <div>{blockType.label}</div>
                            <p className="text-xs text-muted-foreground">
                              {blockType.description}
                            </p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <ColumnContentBlock
                content={column.innerHTML}
                columnIndex={colIndex}
                blockId={id}
                onContentChange={handleColumnContentChange}
                isPreview={isPreview}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Standard block rendering
  return (
    <div
      ref={connectRef}
      data-block-id={id}
      data-block-type={type}
      style={{ position: "relative" }}
      className={`relative group flex flex-col gap-1 ${
        isDragging ? "opacity-50 bg-accent/50" : ""
      } ${
        !isPreview
          ? "py-2 px-3 border border-transparent hover:border-accent rounded-lg transition-colors"
          : ""
      }`}
    >
      {/* Invisible drag handle areas */}
      <div
        ref={dragHandleRef}
        className="absolute inset-0"
        style={{
          touchAction: "none",
          pointerEvents: "none", // This makes the entire overlay non-interactive by default
        }}
      >
        {/* Drag areas without hover effect */}
        <div
          className="absolute top-0 left-0 right-0 h-4 cursor-move"
          style={{ pointerEvents: "auto" }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-4 cursor-move"
          style={{ pointerEvents: "auto" }}
        />
        <div
          className="absolute top-4 bottom-4 left-0 w-4 cursor-move"
          style={{ pointerEvents: "auto" }}
        />
        <div
          className="absolute top-4 bottom-4 right-0 w-4 cursor-move"
          style={{ pointerEvents: "auto" }}
        />
      </div>

      <div className="flex items-center gap-2">
        {inlineMenu}
        {!isPreview && (
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[220px]">
                {blockTypes.map((blockType) => (
                  <DropdownMenuItem
                    key={blockType.type}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      const currentIndex = blocks.findIndex(
                        (block) => block.id === id,
                      );
                      if (currentIndex === -1) return;

                      if (blockType.type === "image") {
                        setImageDialogOpen(true);
                        return;
                      }

                      if (blockType.type === "icon") {
                        setIconDialogOpen(true);
                        return;
                      }

                      const newBlock = {
                        id: `block-${Date.now()}-${Math.random()
                          .toString(36)
                          .substr(2, 9)}`,
                        type: blockType.type,
                        content: blockType.defaultContent || "",
                      };

                      const newBlocks = [...blocks];
                      newBlocks.splice(currentIndex + 1, 0, newBlock);
                      setBlocks(newBlocks);
                      updateContent(newBlocks);
                    }}
                    className="flex items-center gap-2"
                  >
                    <blockType.icon className="h-4 w-4" />
                    <div>
                      <div>{blockType.label}</div>
                      <p className="text-xs text-muted-foreground">
                        {blockType.description}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                  <GripVertical className="h-4 w-4 cursor-move text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onDelete(id)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
                {type === "image" && (
                  <DropdownMenuItem
                    onClick={() => {
                      // Find the image element in this block
                      const tempDiv = document.createElement('div');
                      tempDiv.innerHTML = content;
                      const imgElement = tempDiv.querySelector('img');
                      
                      if (imgElement) {
                        // Extract current scale if it exists
                        let currentScale = 100;
                        if (imgElement.style.width) {
                          const widthMatch = imgElement.style.width.match(/(\d+)%/);
                          if (widthMatch && widthMatch[1]) {
                            currentScale = parseInt(widthMatch[1], 10);
                          }
                        }
                        
                        // Dispatch edit image event
                        const editEvent = new CustomEvent("editImage", {
                          detail: {
                            url: imgElement.src,
                            scale: currentScale,
                            blockId: id,
                            isWithinColumn: type === 'columns',
                            originalContent: content
                          }
                        });
                        
                        document.dispatchEvent(editEvent);
                      }
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Image
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    const blockType = blockTypes.find((bt) => bt.type === type);
                    if (!blockType) return;

                    const newBlock = {
                      id: `block-${Date.now()}`,
                      type: type,
                      content: blockType.defaultContent || content,
                    };

                    const currentIndex = blocks.findIndex(
                      (block) => block.id === id,
                    );
                    const newBlocks = [...blocks];
                    newBlocks.splice(currentIndex + 1, 0, newBlock);
                    setBlocks(newBlocks);
                    updateContent(newBlocks);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <div
          ref={contentRef}
          className={`flex-grow ${getBlockStyle()}`}
          contentEditable={
            !isPreview &&
            type !== "image" &&
            type !== "icon" &&
            type !== "ai-image"
          }
          onBlur={handleBlur}
          onMouseUp={handleSelect}
          dangerouslySetInnerHTML={{ __html: content }}
          suppressContentEditableWarning={true}
          style={{ cursor: "text" }}
        />
      </div>
      <FloatingToolbar
        selection={currentSelection}
        onStyleChange={handleStyleChange}
        editorRef={ref}
      />
    </div>
  );
};

const IconsContainer = ({ icons }: { icons: IconSelection[] }) => {
  const iconElements = icons
    .map((iconData) => {
      const matchingIcon = socialIcons.find((si) => si.name === iconData.name);
      if (!matchingIcon) return null;

      return `
      <td align="center" width="62" style="width: 62px; min-width: 62px; padding: 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 0;">
              <a href="${iconData.url || "#"}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block;">
                <img src="${matchingIcon.iconUrl}"
                     alt="${matchingIcon.name}"
                     width="22"
                     height="22"
                     style="display: block; border: 0; width: 22px; height: 22px;"
                />
              </a>
            </td>
          </tr>
        </table>
      </td>
      <td width="20" style="width: 20px; min-width: 20px;">&nbsp;</td>
    `;
    })
    .filter(Boolean)
    .join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
              <td width="20" style="width: 20px; min-width: 20px;">&nbsp;</td>
              ${iconElements}
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `
    .replace(/\s+/g, " ")
    .trim();
};

const socialIcons = [
  {
    name: "Facebook",
    displayIcon: "Facebook",
    iconUrl: "/src/assets/icons/icons8-facebook-24.png",
  },
  {
    name: "Twitter",
    displayIcon: "Twitter",
    iconUrl: "/src/assets/icons/icons8-twitter-24.png",
  },
  {
    name: "LinkedIn",
    displayIcon: "LinkedIn",
    iconUrl: "/src/assets/icons/icons8-linkedin-24.png",
  },
  {
    name: "Instagram",
    displayIcon: "Instagram",
    iconUrl: "/src/assets/icons/icons8-instagram-24.png",
  },
  {
    name: "YouTube",
    displayIcon: "YouTube",
    iconUrl: "/src/assets/icons/icons8-youtube-24.png",
  },
  {
    name: "WhatsApp",
    displayIcon: "WhatsApp",
    iconUrl: "/src/assets/icons/icons8-whatsapp-24.png",
  },
  {
    name: "TikTok",
    displayIcon: "TikTok",
    iconUrl: "/src/assets/icons/icons8-tiktok-24.png",
  },
  {
    name: "Telegram",
    displayIcon: "Telegram",
    iconUrl: "/src/assets/icons/icons8-telegram-app-24.png",
  },
  {
    name: "Pinterest",
    displayIcon: "Pinterest",
    iconUrl: "/src/assets/icons/icons8-pinterest-24.png",
  },
  {
    name: "Reddit",
    displayIcon: "Reddit",
    iconUrl: "/src/assets/icons/icons8-reddit-24.png",
  },
  {
    name: "Medium",
    displayIcon: "Medium",
    iconUrl: "/src/assets/icons/icons8-medium-24.png",
  },
  {
    name: "Behance",
    displayIcon: "Behance",
    iconUrl: "/src/assets/icons/icons8-behance-24.png",
  },
  {
    name: "Snapchat",
    displayIcon: "Snapchat",
    iconUrl: "/src/assets/icons/icons8-snapchat-24.png",
  },
];

interface IconDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (icons: IconSelection[]) => void;
  initialIcons?: IconSelection[];
}

const IconDialog = ({
  isOpen,
  onClose,
  onConfirm,
  initialIcons = [],
}: IconDialogProps) => {
  const [selectedIcons, setSelectedIcons] = useState<IconSelection[]>(
    initialIcons.length > 0
      ? initialIcons
      : [
          {
            name: socialIcons[0].name,
            url: "",
            displayIcon: socialIcons[0].displayIcon,
            iconUrl: socialIcons[0].iconUrl,
          },
        ],
  );

  const handleConfirm = () => {
    const icons = selectedIcons.map((icon) => ({
      ...icon,
      path: socialIcons.find((si) => si.name === icon.name)?.path || "",
    }));
    onConfirm(icons);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Social Icons</DialogTitle>
          <DialogDescription>
            Configure social media icons and their links.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {selectedIcons.map((icon, index) => (
            <div key={index} className="grid grid-cols-2 items-center gap-4">
              <Select
                value={icon.name}
                onValueChange={(value) => {
                  const newIcons = [...selectedIcons];
                  const socialIcon = socialIcons.find(
                    (si) => si.name === value,
                  );
                  newIcons[index] = {
                    ...newIcons[index],
                    name: value,
                    displayIcon: socialIcon?.displayIcon || "",
                    iconUrl: socialIcon?.iconUrl || "",
                  };
                  setSelectedIcons(newIcons);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select icon" />
                </SelectTrigger>
                <SelectContent>
                  {socialIcons.map((si) => (
                    <SelectItem key={si.name} value={si.name}>
                      {si.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="URL"
                value={icon.url}
                onChange={(e) => {
                  const newIcons = [...selectedIcons];
                  newIcons[index] = { ...newIcons[index], url: e.target.value };
                  setSelectedIcons(newIcons);
                }}
              />
            </div>
          ))}
        </div>
        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedIcons([
                ...selectedIcons,
                {
                  name: socialIcons[0].name,
                  url: "",
                  displayIcon: socialIcons[0].displayIcon,
                  iconUrl: socialIcons[0].iconUrl,
                },
              ]);
            }}
          >
            Add Icon
          </Button>
          <Button onClick={handleConfirm}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

let setImageDialogOpen: (open: boolean) => void;
let setIconDialogOpen: (open: boolean) => void;
let setAiImageDialogOpen: (open: boolean) => void;
let setButtonDialogOpen: (open: boolean) => void;

const blockTypes = [
  {
    type: "columns",
    label: "Columns",
    icon: Layout,
    description: "Multi-column layout",
    defaultContent: '<div class="columns-block" contenteditable="false" data-columns="true" style="width:100%; display:flex;"><div class="column" style="flex:1; padding:10px;"></div><div class="column" style="flex:1; padding:10px;"></div></div>',
  },
  {
    type: "divider",
    label: "Divider",
    icon: Divide,
    description: "Horizontal divider line",
    defaultContent: '<div class="divider-block" contenteditable="false" data-divider="true" style="width:100%; margin:20px 0; display:block;"><p style="border-top:1px solid #666666;font-size:1px;margin:20px auto;width:100%;"></p></div>',
  },
  {
    type: "text",
    label: "Text",
    icon: Type,
    description: "Adding text and paragraph",
    defaultContent:
      '<p style="text-align: center !important;">New paragraph</p>',
  },
  {
    type: "h1",
    label: "Heading 1",
    icon: Heading1,
    description: "Big section heading",
    defaultContent:
      '<h1 class="text-4xl font-bold" style="text-align: center!important;">New Heading 1</h1>',
  },
  {
    type: "h2",
    label: "Heading 2",
    icon: Heading2,
    description: "Medium section heading",
    defaultContent:
      '<h2 class="text-3xl font-bold" style="text-align: center !important;">New Heading 2</h2>',
  },
  {
    type: "h3",
    label: "Heading 3",
    icon: Heading3,
    description: "Small section heading",
    defaultContent:
      '<h3 class="text-2xl font-bold" style="text-align: center !important;">New Heading 3</h3>',
  },
  {
    type: "bullet-list",
    label: "Bulleted List",
    icon: List,
    description: "Create a simple bulleted list",
    defaultContent:
      '<ul class="list-disc list-inside" style="text-align: center !important;"><li>New bullet item</li></ul>',
  },
  {
    type: "number-list",
    label: "Numbered List",
    icon: ListOrdered,
    description: "Create a list with numbering",
    defaultContent:
      '<ol class="list-decimal list-inside" style="text-align: center !important;"><li>New numbered item</li></ol>',
  },

  {
    type: "image",
    label: "Image",
    icon: Image,
    description: "Add and resize images",
    defaultContent: '<div class="image-block" contenteditable="false"></div>',
    onClick: () => {
      if (typeof setImageDialogOpen === "function") {
        setImageDialogOpen(true);
      }
    },
  },
  {
    type: "ai-image",
    label: "Generate Image",
    icon: ImagePlus,
    description: "Generate images using AI",
    defaultContent: '<div class="image-block" contenteditable="false"></div>',
    onClick: () => {
      if (typeof setAiImageDialogOpen === "function") {
        setAiImageDialogOpen(true);
      }
    },
  },
  {
    type: "icon",
    label: "Social Icons",
    icon: Link,
    description: "Add social media icons",
    defaultContent:
      '<div class="icons-container" contenteditable="false"></div>',
    onClick: () => {
      if (typeof setIconDialogOpen === "function") {
        setIconDialogOpen(true);
      }
    },
  },
  {
    type: "button",
    label: "Button",
    icon: BookOpen,
    description: "Add a buttonwith a link",
    defaultContent: '<div class="button-block" contenteditable="false"></div>',
    onClick: () => {
      if (typeof setButtonDialogOpen === "function") {
        setButtonDialogOpen(true);
      }
    },
  },
];

interface EditorProps {
  content: string | Array<{ id: string; type: string; content: string }>;
  onChange: (content: string) => void;
  onWordCountChange?: (count: number) => void;
  isPreview?: boolean;
  onSelectBlock?: (blockId: string) => void;
  onUpdateBlocks?: (
    blocks: Array<{ id: string; type: string; content: string }>,
  ) => void;
  onBlocksChange?: (
    blocks: Array<{ id: string; type: string; content: string }>,
  ) => void;
  styles?: any;
  template?: any;
  subject?: string;
  isPremium?: boolean;
  editableAreas?: string[];
}

export function RichTextEditor(props: EditorProps) {
  const {
    content, 
    onChange,
    onWordCountChange,
    styles,
    template,
    subject,
    isPreview,
    isPremium = false,
    onBlocksChange
  } = props;
  const [blocks, setBlocks] = useState<
    Array<{ id: string; type: string; content: string }>
  >([]);
  const [imageDialogOpen, _setImageDialogOpen] = useState(false);
  const [iconDialogOpen, _setIconDialogOpen] = useState(false);
  const [aiImageDialogOpen, _setAiImageDialogOpen] = useState(false);
  const [imageEditDialogOpen, setImageEditDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [selectedImageScale, setSelectedImageScale] = useState(100);
  const [selectedImageId, setSelectedImageId] = useState("");
  const [selectedElement, setSelectedElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [selectedIcons, setSelectedIcons] = useState<IconSelection[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isTemplateUpdatable, setIsTemplateUpdatable] = useState(false);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [buttonDialogOpen, _setButtonDialogOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const lastMoveRef = useRef<number>(Date.now());
  const moveBlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleBlockExpand = (blockId: string) => {
    setExpandedBlocks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    setImageDialogOpen = _setImageDialogOpen;
    setIconDialogOpen = _setIconDialogOpen;
    setAiImageDialogOpen = _setAiImageDialogOpen;
    setButtonDialogOpen = _setButtonDialogOpen;
  }, [
    _setImageDialogOpen,
    _setIconDialogOpen,
    _setAiImageDialogOpen,
    _setButtonDialogOpen,
  ]);

  useEffect(() => {
    // Modified blocks-update handler to prevent overwriting edited content
    const handleBlocksUpdate = (event: CustomEvent) => {
      // Don't reset blocks if we're already editing (have existing blocks)
      if (blocks.length > 0) {
        console.log("Blocks update event received but current blocks exist - preserving existing state");
        return;
      }
      
      // Only update blocks on initial load or when explicitly needed
      console.log("Initializing blocks from template");
      setBlocks(event.detail);
      updateContent(event.detail);
    };

    const handleEditIcon = (event: CustomEvent) => {
      setSelectedIcons([{ name: event.detail.name, url: event.detail.url }]);
      setIconDialogOpen(true);
    };

    const handleEditImage = (event: CustomEvent) => {
      const { url, scale, blockId, isWithinColumn, originalContent } = event.detail;
      setSelectedImageUrl(url);
      setSelectedImageScale(scale || 100);
      setSelectedImageId(blockId);
      
      // Store the original clicked image URL to track it accurately
      document.body.setAttribute('data-clicked-image-url', url);
      
      // Store additional metadata in the DOM for later use if needed
      if (isWithinColumn && originalContent) {
        document.body.setAttribute('data-editing-column-content', originalContent);
        document.body.setAttribute('data-editing-column-block', 'true');
        console.log('Editing column image with URL:', url);
      } else {
        document.body.removeAttribute('data-editing-column-content');
        document.body.removeAttribute('data-editing-column-block');
      }
      
      setImageEditDialogOpen(true);
    };

    const handleAddIcon = () => {
      setSelectedIcons([]);
      setIconDialogOpen(true);
    };

    document.addEventListener(
      "blocks-update",
      handleBlocksUpdate as EventListener,
    );
    document.addEventListener("editIcon", handleEditIcon as EventListener);
    document.addEventListener("editImage", handleEditImage as EventListener);
    document.addEventListener("addIcon", handleAddIcon as EventListener);

    return () => {
      document.removeEventListener(
        "blocks-update", // Fixed event name to match addEventListener
        handleBlocksUpdate as EventListener,
      );
      document.removeEventListener("editIcon", handleEditIcon as EventListener);
      document.removeEventListener("editImage", handleEditImage as EventListener);
      document.removeEventListener("addIcon", handleAddIcon as EventListener);
    };
  }, [blocks]); // Add blocks as dependency to ensure event handling reacts to block state changes

  useEffect(() => {
    // Don't reprocess content if we already have blocks (editing in progress)
    if (blocks.length > 0) {
      console.log("Skipping content processing - existing blocks preserved");
      return;
    }
    
    try {
      if (!content && !template) {
        setBlocks([]);
        return;
      }

      let contentToProcess = content;

      if (template) {
        contentToProcess =
          template?.html?.replace(/\{\{content\}\}/g, content) || content;
      }

      if (
        typeof contentToProcess === "object" &&
        Array.isArray(contentToProcess)
      ) {
        console.log("Setting blocks from array content");
        setBlocks(
          contentToProcess.map((block) => ({
            ...block,
            id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          })),
        );
        return;
      }

      console.log("Parsing HTML content into blocks");
      const parser = new DOMParser();
      const doc = parser.parseFromString(contentToProcess, "text/html");
      const blocks = [];
      let blockId = 0;

      const createBlock = (type: string, content: string) => ({
        id: `block-${blockId++}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        content: content.trim(),
      });

      const processNode = (node: Node) => {
        if (!node) return;

        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          if (text) {
            blocks.push(createBlock("text", `<p>${text}</p>`));
          }
          return;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          const tagName = element.tagName.toLowerCase();

          // Handle HR elements as divider blocks
          if (tagName === "hr" || element.classList.contains("divider-block")) {
            blocks.push(createBlock("divider", '<div class="divider-block" contenteditable="false" data-divider="true" style="width:100%; margin:20px 0; display:block;"><p style="border-top:1px solid #666666;font-size:1px;margin:20px auto;width:100%;"></p></div>'));
            return;
          }
          
          // Handle column layout blocks
          if (element.classList.contains("columns-block") || element.hasAttribute("data-columns")) {
            blocks.push(createBlock("columns", element.outerHTML));
            return;
          }

          // Skip empty elements except for images, icons, columns, and dividers
          if (
            !element.textContent?.trim() &&
            !element.querySelector("img") &&
            !element.classList.contains("icons-container") &&
            !element.classList.contains("divider-block") &&
            !element.classList.contains("columns-block") &&
            !element.hasAttribute("data-columns")
          ) {
            return;
          }

          let type = "text";

          if (tagName === "h1") type = "h1";
          else if (tagName === "h2") type = "h2";
          else if (tagName === "h3") type = "h3";
          else if (tagName === "ul") type = "bullet-list";
          else if (tagName === "ol") type = "number-list";
          else if (element.classList.contains("button-block")) type = "button";
          else if (element.classList.contains("image-block")) type = "image";
          else if (element.classList.contains("icons-container")) type = "icon";
          else if (element.classList.contains("columns-block") || element.hasAttribute("data-columns")) type = "columns";

          blocks.push(createBlock(type, element.outerHTML));
        }
      };

      Array.from(doc.body.childNodes).forEach(processNode);

      setBlocks(blocks);
    } catch (error) {
      console.error("Error processing content:", error);
      setParseError(
        error instanceof Error ? error.message : "Error processing content",
      );
      setBlocks([
        {
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "text",
          content:
            '<p style="text-align: center !important;">New paragraph</p>',
        },
      ]);
    }
  }, [content, template]);

  const determineNodeType = (node: Element) => {
    const tagName = node.tagName.toLowerCase();
    if (tagName.match(/^h[1-6]$/)) return tagName;
    if (tagName === "ul") return "bullet-list";
    if (tagName === "ol") return "number-list";
    if (tagName === "hr" || node.classList.contains("divider-block")) return "divider";
    if (node.classList.contains("icons-container")) return "icon";
    if (tagName === "img" || node.querySelector("img")) return "image";
    if (node.classList.contains("button-block")) return "button";
    if (node.classList.contains("columns-block") || node.hasAttribute("data-columns")) return "columns";
    return "text";
  };

  const moveBlock = (dragIndex: number, hoverIndex: number) => {
    // Throttle the updates to prevent excessive re-renders which can cause jank
    if (Date.now() - lastMoveRef.current < 30) return; // Reduced throttle time for more responsive feel
    lastMoveRef.current = Date.now();

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(dragIndex, 1);
    newBlocks.splice(hoverIndex, 0, draggedBlock);

    // Use optimistic update approach for smoother feel
    setBlocks(newBlocks);

    // Apply a subtle transition to blocks for smoother visual movement
    document.querySelectorAll('[data-block-id]').forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.transition = 'transform 0.15s ease-out, opacity 0.1s ease-out';
      }
    });

    // Debounce the actual content update to reduce processing
    if (moveBlockTimeoutRef.current) {
      clearTimeout(moveBlockTimeoutRef.current);
    }
    moveBlockTimeoutRef.current = setTimeout(() => {
      // Reset heights after moving to prevent editor enlargement
      document.querySelectorAll('[data-block-id]').forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.height = 'auto';
          el.style.transition = ''; // Remove transition after movement completes
        }
      });
      updateContent(newBlocks);
    }, 150); // Slightly longer timeout to ensure transitions complete
  };

  const updateContent = (
    newBlocks: Array<{ id: string; type: string; content: string }>,
  ) => {
    const combinedContent = newBlocks
      .map((block) => {
        if (block.type === "image" || block.type === "ai-image") {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = block.content;
          const imgTags = tempDiv.querySelectorAll("img");
          imgTags.forEach((img) => {
            const src = img.getAttribute("src");
            if (src && !src.startsWith("http") && !src.startsWith("data:")) {
              const absoluteUrl = new URL(src, window.location.origin).href;
              img.setAttribute("src", absoluteUrl);
            }
          });
          return tempDiv.innerHTML;
        }

        if (block.type === "icon") {
          return block.content;
        }

        if (block.type === "divider") {
          return block.content;
        }
        
        if (block.type === "columns") {
          // For columns, return the content directly since it's already properly formatted
          return block.content;
        }

        switch (block.type) {
          case "h1":
            return `<h1 class="text-4xl font-bold">${block.content}</h1>`;
          case "h2":
            return `<h2 class="text-3xl font-bold">${block.content}</h2>`;
          case "h3":
            return `<h3 class="text-2xl font-bold">${block.content}</h3>`;
          case "bullet-list":
            return block.content.startsWith("<ul")
              ? block.content
              : `<ul class="list-disc list-inside">${block.content}</ul>`;
          case "number-list":
            return block.content.startsWith("<ol")
              ? block.content
              : `<ol class="list-decimal list-inside">${block.content}</ol>`;
          case "button":
            return `<div class="button-block">${block.content}</div>`;
          default:
            return block.content.startsWith("<p")
              ? block.content
              : `<p>${block.content}</p>`;
        }
      })
      .join("\n\n");

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = combinedContent;
    const imgTags = tempDiv.querySelectorAll("img");
    imgTags.forEach((img) => {
      const src = img.getAttribute("src");
      if (src && !src.startsWith("http") && !src.startsWith("data:")) {
        const absoluteUrl = new URL(src, window.location.origin).href;
        img.setAttribute("src", absoluteUrl);
      }
    });

    onChange(tempDiv.innerHTML);

    if (onWordCountChange) {
      const text = combinedContent.replace(/<[^>]*>/g, " ");
      const wordCount = text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
      onWordCountChange(wordCount);
    }
  };

  const handleBlockContentChange = (blockId: string, newContent: string) => {
    const newBlocks = blocks.map((block) =>
      block.id === blockId ? { ...block, content: newContent } : block,
    );
    setBlocks(newBlocks);
    updateContent(newBlocks);
  };

  const handleFormat = (command: string) => {
    if (selectedElement) {
      document.execCommand(command, false);
    }
  };

  const handleAddBlock = (type: string) => {
    const blockType = blockTypes.find((bt) => bt.type === type);
    if (!blockType) return;

    if (blockType.onClick) {
      blockType.onClick();
      return;
    }

    const newBlock = {
      id: `block-${Date.now()}`,
      type,
      content: blockType.defaultContent || "",
    };

    const currentIndex = selectedElement
      ? blocks.findIndex(
          (block) =>
            block.id ===
            selectedElement
              .closest("[data-block-id]")
              ?.getAttribute("data-block-id"),
        )
      : -1;

    const newBlocks = [...blocks];
    if (currentIndex >= 0) {
      newBlocks.splice(currentIndex + 1, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }

    setBlocks(newBlocks);
    updateContent(newBlocks);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error("No URL received from server");
      }

      const imageUrl = data.url.startsWith("http")
        ? data.url
        : `${window.location.origin}${data.url.startsWith("/") ? data.url : `/${data.url}`}`;

      console.log("Using absolute image URL:", imageUrl);

      // Don't include edit button if in preview mode
      const editButtonHtml = isPreview ? '' : `
        <button class="edit-image-button" 
              onclick="event.preventDefault(); event.stopPropagation(); 
                const blockId = this.closest('[data-block-id]')?.getAttribute('data-block-id');
                const blockType = this.closest('[data-block-id]')?.getAttribute('data-block-type');
                const img = this.closest('.image-block').querySelector('img');
                if(blockId && img) {
                  const scale = img.style.width ? parseInt(img.style.width) : 100;
                  const column = this.closest('.column');
                  const isWithinColumn = !!column;
                  
                  const content = isWithinColumn && blockType === 'columns' ? 
                    this.closest('[data-block-id]').outerHTML : '';
                    
                  const editEvent = new CustomEvent('editImage', { 
                    detail: { 
                      url: img.src, 
                      scale: scale, 
                      blockId: blockId,
                      isWithinColumn: isWithinColumn,
                      originalContent: content
                    }
                  });
                  document.dispatchEvent(editEvent);
                }">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      `;

      const newBlock = {
        id: `block-${Date.now()}`,
        type: "image",
        content: `
          <div class="image-block" contenteditable="false" draggable="true" data-block-type="image" style="text-align: center; position: relative;">
            <img src="${imageUrl}" alt="Uploaded image" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
            ${editButtonHtml}
          </div>
        `,
      };

      // Check if we're adding this image to a column
      const columnTargetIndex = document.body.getAttribute('data-column-target-index');
      const columnBlockId = document.body.getAttribute('data-column-block-id');
      
      if (columnTargetIndex !== null && columnBlockId !== null) {
        // Find the column block
        const columnBlock = blocks.find(block => block.id === columnBlockId);
        if (columnBlock && columnBlock.type === "columns") {
          // Parse the column block content
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = columnBlock.content;
          const columns = tempDiv.querySelectorAll(".column");
          
          const targetColumnIndex = parseInt(columnTargetIndex);
          if (columns[targetColumnIndex]) {
            // Add the image to the column
            const columnContent = columns[targetColumnIndex].innerHTML;
            columns[targetColumnIndex].innerHTML = columnContent + newBlock.content;
            
            // Update the column block with the new content
            const newBlocks = blocks.map(block => 
              block.id === columnBlockId ? { ...block, content: tempDiv.innerHTML } : block
            );
            setBlocks(newBlocks);
            updateContent(newBlocks);
            
            // Clear the data attributes
            document.body.removeAttribute('data-column-target-index');
            document.body.removeAttribute('data-column-block-id');
            
            setImageDialogOpen(false);
            toast({
              title: "Success",
              description: "Image added to column successfully",
            });
            return;
          }
        }
      }
      
      // Normal flow (not adding to a column)
      const updatedBlocks = [...blocks];
      const currentIndex = selectedElement
        ? blocks.findIndex(
            (block) =>
              block.id ===
              selectedElement
                .closest("[data-block-id]")
                ?.getAttribute("data-block-id"),
          )
        : blocks.length - 1;

      updatedBlocks.splice(currentIndex + 1, 0, newBlock);
      setBlocks(updatedBlocks);
      updateContent(updatedBlocks);
      setImageDialogOpen(false);
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to upload image: ${error.message}`,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImageUrl = () => {
    if (!imageUrl) return;

    const absoluteImageUrl = imageUrl.startsWith("http")
      ? imageUrl
      : `${window.location.origin}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;

    console.log("Using image URL:", absoluteImageUrl);
    
    // Don't include edit button if in preview mode
    const editButtonHtml = isPreview ? '' : `
      <button class="edit-image-button" 
            onclick="event.preventDefault(); event.stopPropagation(); 
              const blockId = this.closest('[data-block-id]')?.getAttribute('data-block-id');
              const blockType = this.closest('[data-block-id]')?.getAttribute('data-block-type');
              const img = this.closest('.image-block').querySelector('img');
              if(blockId && img) {
                const scale = img.style.width ? parseInt(img.style.width) : 100;
                const column = this.closest('.column');
                const isWithinColumn = !!column;
                
                const content = isWithinColumn && blockType === 'columns' ? 
                  this.closest('[data-block-id]').outerHTML : '';
                  
                const editEvent = new CustomEvent('editImage', { 
                  detail: { 
                    url: img.src, 
                    scale: scale, 
                    blockId: blockId,
                    isWithinColumn: isWithinColumn,
                    originalContent: content
                  }
                });
                document.dispatchEvent(editEvent);
              }">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
    `;

    const newBlock = {
      id: `block-${Date.now()}`,
      type: "image",
      content: `
        <div class="image-block" contenteditable="false" draggable="true" data-block-type="image" style="text-align: center; position: relative;">
          <img
            src="${absoluteImageUrl}"
            alt="Image from URL"
            class="max-w-full h-auto block mx-auto my-4 rounded-lg shadow-md"
            draggable="false"
          />
          ${editButtonHtml}
        </div>
      `,
    };

    const currentIndex = selectedElement
      ? blocks.findIndex(
          (block) =>
            block.id ===
            selectedElement
              .closest("[data-block-id]")
              ?.getAttribute("data-block-id"),
        )
      : blocks.length - 1;

    const updatedBlocks = [...blocks];
    updatedBlocks.splice(currentIndex + 1, 0, newBlock);
    setBlocks(updatedBlocks);
    updateContent(updatedBlocks);
    setImageUrl("");
    setImageDialogOpen(false);
  };

  const toggleIconSelection = (iconName: string) => {
    setSelectedIcons((prev) => {
      const isSelected = prev.some((icon) => icon.name === iconName);
      if (isSelected) {
        return prev.filter((icon) => icon.name !== iconName);
      } else {
        const socialIcon = socialIcons.find((si) => si.name === iconName);
        return [
          ...prev,
          {
            name: iconName,
            url: "",
            path: socialIcon?.path || "",
            displayIcon: socialIcon?.displayIcon || "",
            iconUrl: socialIcon?.iconUrl || "",
          },
        ];
      }
    });
  };

  const handleIconAdd = (icons: IconSelection[]) => {
    if (!icons || icons.length === 0) return;

    const iconContent = IconsContainer({ icons });
    const newBlockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newBlock = {
      id: newBlockId,
      type: "icon",
      content: iconContent,
    };

    // Check if we're adding this icon to a column
    const columnTargetIndex = document.body.getAttribute('data-column-target-index');
    const columnBlockId = document.body.getAttribute('data-column-block-id');
    
    if (columnTargetIndex !== null && columnBlockId !== null) {
      // Find the column block
      const columnBlock = blocks.find(block => block.id === columnBlockId);
      if (columnBlock && columnBlock.type === "columns") {
        // Parse the column block content
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = columnBlock.content;
        const columns = tempDiv.querySelectorAll(".column");
        
        const targetColumnIndex = parseInt(columnTargetIndex);
        if (columns[targetColumnIndex]) {
          // Add the icons to the column
          const columnContent = columns[targetColumnIndex].innerHTML;
          columns[targetColumnIndex].innerHTML = columnContent + newBlock.content;
          
          // Update the column block with the new content
          const newBlocks = blocks.map(block => 
            block.id === columnBlockId ? { ...block, content: tempDiv.innerHTML } : block
          );
          setBlocks(newBlocks);
          updateContent(newBlocks);
          
          // Clear the data attributes
          document.body.removeAttribute('data-column-target-index');
          document.body.removeAttribute('data-column-block-id');
          
          setIconDialogOpen(false);
          setSelectedIcons([]);
          return;
        }
      }
    }

    // Normal flow (not adding to a column)
    const currentElement = selectedElement?.closest("[data-block-id]");
    const currentIndex = currentElement
      ? blocks.findIndex(
          (block) => block.id === currentElement.getAttribute("data-block-id"),
        )
      : blocks.length - 1;

    const newBlocks = [...blocks];
    newBlocks.splice(currentIndex + 1, 0, newBlock);
    setBlocks(newBlocks);
    updateContent(newBlocks);

    setIconDialogOpen(false);
    setSelectedIcons([]);
  };

  const handleIconUrlChange = (iconName: string, url: string) => {
    setSelectedIcons((prev) =>
      prev.map((icon) => (icon.name === iconName ? { ...icon, url } : icon)),
    );
  };
  
  const handleImageScaleUpdate = (config: { url: string; scale: number }) => {
    if (!selectedImageId) return;
    
    // Check if the image being edited is within a column
    const isEditingColumnImage = document.body.hasAttribute('data-editing-column-block');
    const columnContent = document.body.getAttribute('data-editing-column-content');
    const originalClickedImageUrl = document.body.getAttribute('data-clicked-image-url');
    
    if (isEditingColumnImage && columnContent) {
      console.log("Editing image within a column", {
        selectedImageId,
        originalClickedImageUrl
      });
      
      // Find the column block by ID
      const block = blocks.find(block => block.id === selectedImageId);
      if (!block || block.type !== 'columns') {
        console.error("Block not found or not a columns block", { blockId: selectedImageId, blockType: block?.type });
        return;
      }
      
      // Parse the column content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = block.content;
      
      // Find all image-block containers in the columns
      const imageBlocks = tempDiv.querySelectorAll('.image-block');
      console.log(`Found ${imageBlocks.length} image blocks`);
      
      // Find the image container that matches our clicked image
      let targetImageBlock = null;
      let targetImage = null;
      
      // Check through all image blocks to find the right one
      for (const imgBlock of imageBlocks) {
        const img = imgBlock.querySelector('img');
        if (!img) continue;
        
        // Check if this is the image we clicked on
        const imgUrl = img.getAttribute('src') || '';
        const isUrlMatch = imgUrl === originalClickedImageUrl || 
                         imgUrl.endsWith((originalClickedImageUrl || '').split('/').pop() || '');
                         
        if (isUrlMatch) {
          console.log("Found matching image by URL", { imgUrl, originalClickedImageUrl });
          targetImageBlock = imgBlock;
          targetImage = img;
          break;
        }
      }
      
      if (!targetImage) {
        console.error("Target image not found in column content");
        return;
      }
      
      console.log("Target image found, updating scale", { scale: config.scale });
      
      // Update the image URL if changed
      if (config.url !== targetImage.src) {
        targetImage.src = config.url;
      }
      
      // Update the image scale
      targetImage.style.width = `${config.scale}%`;
      targetImage.style.maxWidth = `${config.scale}%`;
      
      // Update the block content with the modified HTML
      const newContent = tempDiv.innerHTML;
      
      // Update the block in the state using the existing handler
      handleBlockContentChange(selectedImageId, newContent);
      
      // Clear the attributes
      document.body.removeAttribute('data-editing-column-block');
      document.body.removeAttribute('data-editing-column-content');
      document.body.removeAttribute('data-clicked-image-url');
      
      // Close the dialog
      setImageEditDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Image size updated successfully",
      });
      return;
    }
    
    // Normal flow (not editing an image in column)
    const block = blocks.find(block => block.id === selectedImageId);
    if (!block) return;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = block.content;
    
    const imgElement = tempDiv.querySelector('img');
    if (!imgElement) return;
    
    // Update the image URL if changed
    if (config.url !== imgElement.src) {
      imgElement.src = config.url;
    }
    
    // Update the image scale
    imgElement.style.width = `${config.scale}%`;
    imgElement.style.maxWidth = `${config.scale}%`;
    
    // Update the block content with the modified HTML
    const newContent = tempDiv.innerHTML;
    
    // Update the block in the state using the existing handler
    // This will trigger the state update and content regeneration
    handleBlockContentChange(selectedImageId, newContent);
    
    // Close the dialog
    setImageEditDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Image size updated successfully",
    });
  };

  const deleteBlock = (blockId: string) => {
    const newBlocks = blocks.filter((block) => block.id !== blockId);
    setBlocks(newBlocks);
    
    // Update content with the modified blocks
    updateContent(newBlocks);
    
    // If we have an onBlocksChange handler, call it to notify parent components
    if (props.onBlocksChange) {
      props.onBlocksChange(newBlocks);
    }
  };

  const getBlockStyle = (type: string) => {
    switch (type) {
      case "h1":
        return "text-4xl font-bold";
      case "h2":
        return "text-3xl font-bold";
      case "h3":
        return "text-2xl font-bold";
      case "bullet-list":
        return "list-disc list-inside";
      case "number-list":
        return "list-decimal list-inside";
      case "icon":
        return "flex justify-center items-center";
      case "image":
        return "max-w-full";
      case "button":
        return "flex justify-center";
      case "ai-image":
        return "max-w-full";
      case "divider":
        return "divider-container";
      default:
        return "";
    }
  };

  const BrandingFooter = () => null;

  const blockProps = {
    expandedBlocks,
    toggleBlockExpand,
  };

  const handleImageGenerated = (imageUrl: string) => {
    // Don't include edit button if in preview mode
    const editButtonHtml = isPreview ? '' : `
      <button class="edit-image-button" 
            onclick="event.preventDefault(); event.stopPropagation(); 
              const blockId = this.closest('[data-block-id]')?.getAttribute('data-block-id');
              const blockType = this.closest('[data-block-id]')?.getAttribute('data-block-type');
              const img = this.closest('.image-block').querySelector('img');
              if(blockId && img) {
                const scale = img.style.width ? parseInt(img.style.width) : 100;
                const column = this.closest('.column');
                const isWithinColumn = !!column;
                
                const content = isWithinColumn && blockType === 'columns' ? 
                  this.closest('[data-block-id]').outerHTML : '';
                  
                const editEvent = new CustomEvent('editImage', { 
                  detail: { 
                    url: img.src, 
                    scale: scale, 
                    blockId: blockId,
                    isWithinColumn: isWithinColumn,
                    originalContent: content
                  }
                });
                document.dispatchEvent(editEvent);
              }">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
    `;
    
    const imageHtml = `
      <div class="image-block" contenteditable="false" draggable="true" data-block-type="image" style="text-align: center; position: relative;">
        <img src="${imageUrl}" alt="AI Generated" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
        ${editButtonHtml}
      </div>
    `;
    
    const newBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "image",
      content: imageHtml,
    };
    
    // Check if we're adding this AI-generated image to a column
    const columnTargetIndex = document.body.getAttribute('data-column-target-index');
    const columnBlockId = document.body.getAttribute('data-column-block-id');
    
    if (columnTargetIndex !== null && columnBlockId !== null) {
      // Find the column block
      const columnBlock = blocks.find(block => block.id === columnBlockId);
      if (columnBlock && columnBlock.type === "columns") {
        // Parse the column block content
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = columnBlock.content;
        const columns = tempDiv.querySelectorAll(".column");
        
        const targetColumnIndex = parseInt(columnTargetIndex);
        if (columns[targetColumnIndex]) {
          // Add the image to the column
          const columnContent = columns[targetColumnIndex].innerHTML;
          columns[targetColumnIndex].innerHTML = columnContent + newBlock.content;
          
          // Update the column block with the new content
          const newBlocks = blocks.map(block => 
            block.id === columnBlockId ? { ...block, content: tempDiv.innerHTML } : block
          );
          setBlocks(newBlocks);
          updateContent(newBlocks);
          
          // Clear the data attributes
          document.body.removeAttribute('data-column-target-index');
          document.body.removeAttribute('data-column-block-id');
          
          setAiImageDialogOpen(false);
          return;
        }
      }
    }
    
    // Normal flow (not adding to a column)
    setBlocks((prevBlocks) => [...prevBlocks, newBlock]);
    updateContent([...blocks, newBlock]);
    setAiImageDialogOpen(false);
  };

  const handleAddButton = (buttonConfig: {
    text: string;
    link: string;
    style: string;
    customClass: string;
  }) => {
    // Get the current selected element to check its alignment
    const selectedBlockElement = selectedElement?.closest("[data-block-id]");
    let alignmentAttribute = '';
    let alignmentStyle = '';

    if (selectedBlockElement) {
      // Check for alignment in the selected element
      const dataAlignment = selectedBlockElement.getAttribute("data-alignment");
      const styleAttribute = selectedBlockElement.getAttribute("style");
      let textAlign = '';

      if (styleAttribute) {
        const alignMatch = styleAttribute.match(/text-align:\s*(left|right|center|justify)/i);
        if (alignMatch) {
          textAlign = alignMatch[1];
        }
      }

      // Set alignment based on what we found
      if (dataAlignment) {
        alignmentAttribute = `data-alignment="${dataAlignment}"`;
        alignmentStyle = `style="text-align: ${dataAlignment};"`;
      } else if (textAlign) {
        alignmentAttribute = `data-alignment="${textAlign}"`;
        alignmentStyle = `style="text-align: ${textAlign};"`;
      }
    }

    const newBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "button",
      content: `
        <div class="button-block" ${alignmentAttribute} ${alignmentStyle} contenteditable="false">
          <div class="button-container">
            <a
              href="${buttonConfig.link}"
              target="_blank"
              rel="noopener noreferrer"
              class="${buttonConfig.customClass}"
              style="${buttonConfig.style}"
            >
              ${buttonConfig.text}
            </a>
          </div>
        </div>
      `.trim(),
    };

    // Check if we're adding this button to a column
    const columnTargetIndex = document.body.getAttribute('data-column-target-index');
    const columnBlockId = document.body.getAttribute('data-column-block-id');
    
    if (columnTargetIndex !== null && columnBlockId !== null) {
      // Find the column block
      const columnBlock = blocks.find(block => block.id === columnBlockId);
      if (columnBlock && columnBlock.type === "columns") {
        // Parse the column block content
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = columnBlock.content;
        const columns = tempDiv.querySelectorAll(".column");
        
        const targetColumnIndex = parseInt(columnTargetIndex);
        if (columns[targetColumnIndex]) {
          // Add the button to the column
          const columnContent = columns[targetColumnIndex].innerHTML;
          columns[targetColumnIndex].innerHTML = columnContent + newBlock.content;
          
          // Update the column block with the new content
          const newBlocks = blocks.map(block => 
            block.id === columnBlockId ? { ...block, content: tempDiv.innerHTML } : block
          );
          setBlocks(newBlocks);
          updateContent(newBlocks);
          
          // Clear the data attributes
          document.body.removeAttribute('data-column-target-index');
          document.body.removeAttribute('data-column-block-id');
          
          setButtonDialogOpen(false);
          return;
        }
      }
    }

    // Normal flow (not adding to a column)
    const currentIndex = blocks.findIndex(
      (block) =>
        block.id ===
        selectedElement
          ?.closest("[data-block-id]")
          ?.getAttribute("data-block-id"),
    );
    const newBlocks = [...blocks];

    if (currentIndex !== -1) {
      newBlocks.splice(currentIndex + 1, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }

    setBlocks(newBlocks);
    updateContent(newBlocks);
    setButtonDialogOpen(false);
  };

  if (isPreview) {
    let combinedContent = template?.html
      ? template.html.replace(/\{\{content\}\}/g, content)
      : content;
    combinedContent = combinedContent
      .replace(/src=["'](\.\/)?assets\//g, 'src="/public/assets/')
      .replace(/src=["']\/assets\//g, 'src="/public/assets/')
      .replace(
        /background-image:\s*url\(['"]?(\.\/)?assets\//g,
        "background-image: url('/public/assets/",
      )
      .replace(
        /background-image:\s*url\(['"]?\/assets\//g,
        "background-image: url('/public/assets/",
      )
      .replace(/url\(['"]?(\.\/)?assets\//g, "url('/public/assets/")
      .replace(/url\(['"]?\/assets\//g, "url('/public/assets/");

    combinedContent = combinedContent.replace(
      /<(p|h[1-6]|div|span)[^>]*style="([^"]*?text-align\s*:\s*(left|right|center|justify)[^"]*?)"([^>]*)>/gi,
      (match, tag, style, alignment, rest) => {
        const enhancedStyle = style.replace(
          /(text-align\s*:\s*(left|right|center|justify))/gi,
          "$1 !important",
        );
        return `<${tag} style="${enhancedStyle}" data-alignment="${alignment}"${rest}>`;
      },
    );

    combinedContent = `
      <div class="newsletter-preview">
        ${combinedContent}
      </div>
    `;

    return (
      <div
        className="min-h-[500px] p-4 preview-container"
        style={{
          backgroundColor: styles?.backgroundColor || "white",
          color: styles?.textColor || "black",
          fontFamily: styles?.fontFamily || "inherit",
          fontSize: styles?.fontSize || "inherit",
        }}
      >
        <div
          className="space-y-4"
          dangerouslySetInnerHTML={{
            __html: combinedContent,
          }}
        />
        <BrandingFooter />
      </div>
    );
  }

  const handleBlockAdd = (blockType: (typeof blockTypes)[number]) => {
    if (blockType.type === "image") {
      setImageDialogOpen(true);
      return;
    }

    if (blockType.type === "icon") {
      setIconDialogOpen(true);
      return;
    }

    if (blockType.type === "ai-image") {
      setAiImageDialogOpen(true);
      return;
    }

    const newBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: blockType.type,
      content: blockType.defaultContent || "",
    };

    setBlocks((currentBlocks) => [...currentBlocks, newBlock]);
    updateContent([...blocks, newBlock]);
  };

  const handleTopBlockAdd = (blockType: (typeof blockTypes)[number]) => {
    if (blockType.onClick) {
      blockType.onClick();
      return;
    }

    if (blockType.type === "image") {
      setImageDialogOpen(true);
      return;
    }

    if (blockType.type === "icon") {
      setIconDialogOpen(true);
      return;
    }

    if (blockType.type === "ai-image") {
      setAiImageDialogOpen(true);
      return;
    }

    if (blockType.type === "button") {
      setButtonDialogOpen(true);
      return;
    }

    const newBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: blockType.type,
      content: blockType.defaultContent || "",
    };

    const updatedBlocks = [...blocks, newBlock];
    setBlocks(updatedBlocks);
    updateContent(updatedBlocks);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="border rounded-lg bg-background rich-text-editor"
        ref={editorRef}
      >
        <div className="p-2 border-b flex flex-col gap-4 bg-white text-black editor-header">
          <div className="flex items-center gap-2 justify-start w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Block
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {blockTypes.map((blockType) => (
                  <DropdownMenuItem
                    key={blockType.type}
                    onClick={() => handleTopBlockAdd(blockType)}
                    className="flex items-center gap-2"
                  >
                    <blockType.icon className="h-4 w-4" />
                    <div>
                      <div>{blockType.label}</div>
                      <p className="text-xs text-muted-foreground">
                        {blockType.description}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Formatting buttons removed as requested */}
          </div>
        </div>

        <div
          className="min-h-[500px] p-4 space-y-2 pb-48 editor-content"
          style={{
            backgroundColor: styles?.backgroundColor || "white",
            color: styles?.textColor || "black",
            fontFamily: styles?.fontFamily || "inherit",
            fontSize: styles?.fontSize || "inherit",
          }}
        >
          {blocks.map((block, index) => (
            <DraggableBlock
              key={block.id}
              id={block.id}
              type={block.type}
              content={block.content}
              index={index}
              moveBlock={moveBlock}
              onContentChange={handleBlockContentChange}
              isPreview={isPreview}
              onSelect={setSelectedElement}
              onDelete={deleteBlock}
              blocks={blocks}
              setBlocks={setBlocks}
              updateContent={updateContent}
              expandedBlocks={expandedBlocks}
              toggleBlockExpand={toggleBlockExpand}
            />
          ))}
          <BrandingFooter />
        </div>

        {!isPreview && (
          <div className="fixed bottom-0 left-0 right-0 z-50">
            <ChatPrompt
              onContentGenerated={(generatedBlocks) => {
                const newBlocks = generatedBlocks.map((block) => ({
                  id: `block-${Date.now()}-${Math.random()
                    .toString(36)
                    .substr(2, 9)}`,
                  type: block.type,
                  content: block.content,
                }));

                const updatedBlocks = [...blocks, ...newBlocks];
                setBlocks(updatedBlocks);
                updateContent(updatedBlocks);

                setTimeout(() => {
                  const lastBlock = document.querySelector(
                    `[data-block-id="${newBlocks[newBlocks.length - 1].id}"]`,
                  );
                  lastBlock?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
            />
          </div>
        )}

        <ButtonCustomizationModal
          open={buttonDialogOpen}
          onOpenChange={setButtonDialogOpen}
          onAddButton={handleAddButton}
        />
        <Dialog
          open={imageDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setImageUrl("");
            }
            setImageDialogOpen(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Image</DialogTitle>
              <DialogDescription>
                {" "}
                Add an image file or enter an image URL
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Upload Image File</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading && (
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                )}
              </div>
              <div className="border-t my-4" />
              <div className="spacey-2">
                <Label>Or Enter Image URL</Label>{" "}
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    disabled={uploading}
                  />
                  <Button
                    onClick={handleImageUrl}
                    disabled={!imageUrl || uploading}
                    className="shrink-0"
                  >
                    Add Image
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <IconDialog
          isOpen={iconDialogOpen}
          onClose={() => setIconDialogOpen(false)}
          onConfirm={handleIconAdd}
          initialIcons={selectedIcons}
        />
        <ImageGenerationModal
          open={aiImageDialogOpen}
          onOpenChange={setAiImageDialogOpen}
          onImageGenerated={handleImageGenerated}
        />
        <ImageEditModal
          isOpen={imageEditDialogOpen}
          onClose={() => setImageEditDialogOpen(false)}
          imageUrl={selectedImageUrl}
          onSave={handleImageScaleUpdate}
          currentScale={selectedImageScale}
        />
      </div>
    </DndProvider>
  );
}

interface Template {
  id: string;
  name: string;
  description: string;
  html: string;
  preview: string;
  isCustom: boolean;
}

function generateRandomId() {
  return Math.random().toString(36).substr(2, 9);
}

function getParentBlockElement(node: Node): HTMLElement | null {
  let current = node;
  while (current && current !== document.body) {
    if (current instanceof HTMLElement && current.closest("[data-block-id]")) {
      return current.closest("[data-block-id]") as HTMLElement;
    }
    current = current.parentNode;
  }
  return null;
}

const handleInlineBlockAdd = (blockType: (typeof blockTypes)[number]) => {
  if (blockType.type === "image") {
    setImageDialogOpen(true);
    setShowInlineMenu(false);
    return;
  }

  if (blockType.type === "icon") {
    setIconDialogOpen(true);
    setShowInlineMenu(false);
    return;
  }

  if (blockType.type === "ai-image") {
    setAiImageDialogOpen(true);
    setShowInlineMenu(false);
    return;
  }

  const newBlockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const newBlock = {
    id: newBlockId,
    type: blockType.type,
    content: blockType.defaultContent
      ? blockType.defaultContent.replace(
          />/,
          ' style="text-align: center !important;">',
        )
      : "",
  };

  const currentIndex = blocks.findIndex((block) => block.id === id);
  if (currentIndex === -1) return;

  const newBlocks = [...blocks];
  newBlocks.splice(currentIndex + 1, 0, newBlock);
  setBlocks(newBlocks);
  updateContent(newBlocks);
  setShowInlineMenu(false);
};
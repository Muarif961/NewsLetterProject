import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  Palette,
  Plus,
  Trash2,
  ImagePlus,
  EyeOff,
  Eye,
  Sparkles,
  Globe,
} from "lucide-react";
import { RichTextEditor } from "./rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface ContentCuratorProps {
  value: any;
  onChange: (content: any) => void;
}

interface Section {
  id: string;
  title: string;
  content: string;
  type?: string;
  imageUrl?: string;
  style?: string;
}

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColor, setTempColor] = useState(value);
  const [opacity, setOpacity] = useState(100);

  const handleColorChange = (color: string) => {
    setTempColor(color);
    const rgba = hexToRgba(color, opacity / 100);
    onChange(rgba);
  };

  const handleOpacityChange = (value: number[]) => {
    setOpacity(value[0]);
    const rgba = hexToRgba(tempColor, value[0] / 100);
    onChange(rgba);
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div className="flex items-center gap-2">
      <Label className="min-w-24">{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[4rem] h-[2.5rem] p-1",
              isOpen && "ring-2 ring-ring ring-offset-2",
            )}
            style={{ background: value }}
          >
            <Palette
              className={cn(
                "h-4 w-4 transition-colors",
                isLightColor(value) ? "text-black" : "text-white",
              )}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-4 p-2">
            <Input
              type="color"
              value={tempColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="h-32 w-full"
            />
            <div className="space-y-2">
              <Label>Opacity</Label>
              <Slider
                defaultValue={[opacity]}
                max={100}
                step={1}
                onValueChange={handleOpacityChange}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function isLightColor(color: string) {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return true;
  const [r, g, b] = [
    parseInt(match[1]),
    parseInt(match[2]),
    parseInt(match[3]),
  ];
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}

export function ContentCurator({ value, onChange }: ContentCuratorProps) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [includeImages, setIncludeImages] = useState(true);
  const { toast } = useToast();

  const topics = [
    "Technology",
    "Business",
    "Science",
    "Health",
    "Entertainment",
    "Sports",
    "Politics",
    "Environment",
  ];

  const fetchNewsContent = async () => {
    if (selectedTopics.length === 0) {
      toast({
        variant: "destructive",
        title: "Selection Required",
        description: "Please select at least one topic category",
      });
      return;
    }

    setLoading(true);
    try {
      console.log("Generating content with images:", includeImages);
      const response = await fetch("/api/news/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: selectedTopics,
          includeImages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      const generatedContent = await response.json();
      console.log("Generated content:", generatedContent);

      // Transform the content to match our section structure
      const sections: Section[] = [];

      // Add header image if available
      if (generatedContent.images?.headerImage) {
        sections.push({
          id: `header-image-${Date.now()}`,
          title: "Header Image",
          content: "",
          type: "image",
          imageUrl: generatedContent.images.headerImage,
          style: "w-full h-64 object-cover rounded-lg mb-6"
        });
      }

      // Add content sections
      if (Array.isArray(generatedContent.sections)) {
        generatedContent.sections.forEach((section: any, index: number) => {
          // Insert body image after first content section
          if (index === 1 && generatedContent.images?.bodyImages?.[0]) {
            sections.push({
              id: `body-image-${Date.now()}`,
              title: "Content Image",
              content: "",
              type: "image",
              imageUrl: generatedContent.images.bodyImages[0],
              style: "w-full h-48 object-cover rounded-lg my-6"
            });
          }

          sections.push({
            id: `section-${Date.now()}-${index}`,
            title: section.title,
            content: section.content,
            type: section.type || "text",
            style: section.style
          });
        });
      }

      onChange({
        ...value,
        title: generatedContent.title,
        sections: sections,
      });

      toast({
        title: "Content Generated",
        description: "Newsletter content has been generated successfully",
      });
    } catch (error) {
      console.error("Failed to generate content:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate newsletter content. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const sectors = [
    "Technology",
    "Business",
    "Finance",
    "Healthcare",
    "Education",
    "Media",
    "Entertainment",
    "Sports",
    "Politics",
    "Environment",
    "Science",
    "Arts & Culture",
  ];

  const fonts = [
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Times New Roman", value: "Times New Roman, serif" },
    { label: "Helvetica", value: "Helvetica, sans-serif" },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Verdana", value: "Verdana, sans-serif" },
  ];

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({ ...value, headerImage: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    }
  };

  const addSection = () => {
    const sections = value.sections || [];
    const newSection: Section = {
      id: Date.now().toString(),
      content: "",
      title: `Section ${sections.length + 1}`,
      description: "",
      source: "",
      publishedAt: "",
      readMoreUrl: "",
      category: ""
    };
    onChange({ ...value, sections: [...sections, newSection] });
  };

  const updateSection = (id: string, updatedSection: Partial<Section>) => {
    const sections = value.sections || [];
    const updatedSections = sections.map((section: Section) =>
      section.id === id ? { ...section, ...updatedSection } : section,
    );
    onChange({ ...value, sections: updatedSections });
  };

  const removeSection = (id: string) => {
    const sections = value.sections || [];
    onChange({
      ...value,
      sections: sections.filter((s: Section) => s.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Content Customization</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={includeImages}
              onCheckedChange={setIncludeImages}
              id="image-toggle"
            />
            <Label htmlFor="image-toggle">Include AI-generated images</Label>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-4 w-4" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Show Preview
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Select Topics</Label>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <Button
                  key={topic}
                  variant={selectedTopics.includes(topic) ? "default" : "outline"}
                  onClick={() => {
                    setSelectedTopics((prev) =>
                      prev.includes(topic)
                        ? prev.filter((t) => t !== topic)
                        : [...prev, topic]
                    );
                  }}
                  className="gap-2"
                >
                  <Globe className="h-4 w-4" />
                  {topic}
                </Button>
              ))}
            </div>
            <Button
              onClick={fetchNewsContent}
              disabled={loading || selectedTopics.length === 0}
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Content
                </>
              )}
            </Button>
          </div>

          {value.sections && value.sections.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Generated Content</h3>
              {value.sections.map((section: Section) => (
                <Card key={section.id} className="p-4 space-y-4">
                  {section.type === "image" ? (
                    <div className="relative">
                      <img
                        src={section.imageUrl}
                        alt={section.title}
                        className={section.style}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="text-lg font-semibold">{section.title}</h4>
                      <div className={`text-sm ${section.style || ''}`}>
                        {section.content}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <Label>Header Image</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                dragOver ? "border-primary" : "border-border"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
              <div className="flex flex-col items-center gap-2">
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop an image here, or click to select
                </p>
              </div>
            </div>
            {value.headerImage && (
              <div className="mt-2 relative rounded-lg overflow-hidden">
                <img
                  src={value.headerImage}
                  alt="Header"
                  className="w-full h-40 object-cover"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => onChange({ ...value, headerImage: null })}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Sector</Label>
            <Select
              value={value.sector || ""}
              onValueChange={(sector) => onChange({ ...value, sector })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a sector" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((sector) => (
                  <SelectItem key={sector} value={sector.toLowerCase()}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Newsletter Title</Label>
            <Input
              placeholder="Title"
              value={value.title || ""}
              onChange={(e) => onChange({ ...value, title: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <Label className="text-base">Style</Label>
            <div className="grid gap-4">
              <div>
                <Label className="text-sm">Font Family</Label>
                <Select
                  value={value.fontFamily || fonts[0].value}
                  onValueChange={(fontFamily) =>
                    onChange({ ...value, fontFamily })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select font" />
                  </SelectTrigger>
                  <SelectContent>
                    {fonts.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ColorPicker
                  label="Font Color"
                  value={value.fontColor || "rgba(0, 0, 0, 1)"}
                  onChange={(color) => onChange({ ...value, fontColor: color })}
                />
                <ColorPicker
                  label="Background Color"
                  value={value.backgroundColor || "rgba(255, 255, 255, 1)"}
                  onChange={(color) =>
                    onChange({ ...value, backgroundColor: color })
                  }
                />
              </div>
            </div>
          </div>

          {value.executiveSummary && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Executive Summary</h3>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {value.executiveSummary}
                </p>
              </Card>
            </div>
          )}


        </div>
      </Card>
    </div>
  );
}
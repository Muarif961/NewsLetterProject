
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Template } from "db/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: Template) => void;
}

export function TemplateDialog({
  open,
  onOpenChange,
  onSelect,
}: TemplateDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/templates', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Error fetching templates: ${response.statusText}`);
      }

      const data = await response.json();
      // Handle both formats - array or {templates: array}
      setTemplates(Array.isArray(data) ? data : (data.templates || []));
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to load templates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>
            Select a template to use for your email campaign
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-4">{error}</div>
        ) : templates.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">No templates found</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Blank Template Option */}
          <Card
            key="blank-template"
            className="overflow-hidden transition-all hover:shadow-lg cursor-pointer border-2 border-primary"
            onClick={() => onSelect({
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
            })}
          >
            <div className="aspect-[4/3] border-b bg-muted">
              <div className="h-full w-full overflow-hidden p-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl mb-2">✨</div>
                  <div className="prose prose-sm">
                    <p>Start with a blank canvas</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold">Blank Template</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                Start fresh with an empty template
              </p>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect({
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
                    });
                  }}
                >
                  <Eye className="h-4 w-4" />
                  Use Blank Template
                </Button>
              </div>
            </div>
          </Card>
          
          {/* Regular Templates */}
          {templates.map((template) => (
            <Card
              key={template.id}
              className="overflow-hidden transition-all hover:shadow-lg cursor-pointer"
              onClick={() => onSelect(template)}
            >
              <div className="aspect-[4/3] border-b bg-muted">
                <div className="h-full w-full overflow-hidden p-4">
                  <div
                    className="prose prose-sm max-h-full overflow-hidden"
                    dangerouslySetInnerHTML={{
                      __html: template.html?.replace(/\{\{.*?\}\}/g, "") || "",
                    }}
                  />
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{template.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(template);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    Use Template
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

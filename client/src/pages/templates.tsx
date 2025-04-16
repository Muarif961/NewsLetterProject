import { useEffect, useState } from "react";
import { Eye, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "../components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { NewsletterPreview } from "../components/newsletter-preview";

interface Template {
  id: string;
  name: string;
  description: string;
  html: string;
  preview: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useUser();


  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (!user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Templates response:", data);

      // If data is an array, use it directly
      if (Array.isArray(data)) {
        setTemplates(data);
      } 
      // If data has templates property, use that
      else if (data.templates) {
        setTemplates(data.templates);
      }
      // Otherwise show error
      else {
        throw new Error("Invalid template data received");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUseTemplate = async (template: Template) => {
    try {
      // First fetch the complete template data
      const response = await fetch(`/api/templates/${template.id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch template data');
      }
      
      const templateData = await response.json();
      
      // Store template data in localStorage
      localStorage.setItem('selectedTemplate', JSON.stringify(templateData.template));
      localStorage.setItem('activeTemplateId', template.id);
      
      // Navigate directly to editor
      setLocation('/editor/content');
    } catch (error) {
      console.error("Error using template:", error);
      toast({
        title: "Error",
        description: "Failed to use template. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Templates</h1>
            <p className="text-muted-foreground">
              Choose from our professionally designed templates
            </p>
          </div>
          <Button 
            className="gap-2"
            onClick={() => {
              const searchParams = new URLSearchParams();
              searchParams.set('newTemplate', 'true');
              window.location.href = `/editor/content?${searchParams.toString()}`;
            }}
          >
            <PlusCircle className="h-4 w-4" />
            Create Custom Template
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="overflow-hidden transition-all hover:shadow-lg"
            >
              <div className="aspect-[4/3] border-b bg-muted">
                <div className="h-full w-full overflow-hidden p-4">
                  <div
                    className="prose prose-sm max-h-full overflow-hidden"
                    dangerouslySetInnerHTML={{
                      __html: template.html.replace(/\{\{.*?\}\}/g, ""),
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
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2 mr-2"
                    onClick={() => handleUseTemplate(template)}
                  >
                    Use Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-500 border-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTemplateToDelete(template);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Sure you want to delete this template? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="text-red-500 border-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={async () => {
                if (!templateToDelete) return;

                try {
                  const response = await fetch(`/api/templates/${templateToDelete.id}`, {
                    method: "DELETE",
                    credentials: 'include'
                  });

                  const data = await response.json();

                  if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Failed to delete template');
                  }

                  // Remove template from local state
                  const newTemplates = templates.filter(
                    (t) => t.id !== templateToDelete.id,
                  );
                  setTemplates(newTemplates);
                  setDeleteDialogOpen(false);

                  // Force refetch templates to ensure sync with server
                  fetchTemplates();
                } catch (error) {
                  console.error("Error deleting template:", error);
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to delete template",
                  });
                }
              }}
            >
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!previewTemplate}
        onOpenChange={() => setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <NewsletterPreview
            template={previewTemplate}
            content={{
              title: "Preview Title",
              sections: [
                {
                  id: "1",
                  title: "Example Section",
                  content: "<p>This is an example section content.</p>",
                },
              ],
            }}
            previewDevice={"desktop"}
            onDeviceChange={() => {}}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

import { useUser } from "../hooks/use-user";
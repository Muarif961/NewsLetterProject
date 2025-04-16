import { Card } from "@/components/ui/card";
import { Template } from "db/schema";
import useSWR from "swr";

interface TemplateSelectorProps {
  value: number;
  onChange: (template: Template) => void;
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  const templates = [
    {
      id: 1,
      name: "Christmas Special",
      description: "Festive template perfect for holiday newsletters",
      preview: "/templates/christmas-preview.png"
    },
    {
      id: 2,
      name: "Modern Business",
      description: "Clean and professional design for business communications",
      preview: "/templates/modern-preview.png"
    },
    {
      id: 3,
      name: "Minimalist",
      description: "Simple and elegant design focusing on content",
      preview: "/templates/minimal-preview.png"
    }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Select Template</h2>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer overflow-hidden transition-all hover:scale-105 ${
              template.id === value ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => onChange(template)}
          >
            <div className="aspect-[4/3] relative">
              <img 
                src={template.preview} 
                alt={template.name}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="p-4">
              <h3 className="font-medium mb-1">{template.name}</h3>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

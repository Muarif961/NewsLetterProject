import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Template } from "db/schema";
import { NewsletterPreview } from "@/components/newsletter-preview";
import { cn } from "@/lib/utils";

interface NewsletterPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  template: Template | null;
  content: any;
}

export function NewsletterPreviewModal({
  isOpen,
  onClose,
  title,
  template,
  content,
}: NewsletterPreviewModalProps) {
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </DialogHeader>
        
        <div className={cn(
          "py-4",
          "newsletter-preview-container",
          "relative"
        )}>
          <NewsletterPreview 
            template={template}
            content={content}
            previewDevice={previewDevice}
            onDeviceChange={setPreviewDevice}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

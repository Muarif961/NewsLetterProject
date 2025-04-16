import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  currentScale: number;
  onSave: (config: { url: string; scale: number }) => void;
}

const ImageEditModal: React.FC<ImageEditModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  currentScale = 100,
  onSave,
}) => {
  const [scale, setScale] = useState(currentScale);
  const [url, setUrl] = useState(imageUrl);

  useEffect(() => {
    if (isOpen) {
      setScale(currentScale);
      setUrl(imageUrl);
    }
  }, [isOpen, currentScale, imageUrl]);

  const handleCancel = () => {
    onClose();
  };

  const handleSave = () => {
    onSave({ url, scale });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
          <DialogDescription>
            Adjust the size and URL of your image
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image-url">Image URL</Label>
            <Input
              id="image-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="image-scale">Image Size</Label>
              <span className="text-sm text-muted-foreground">{scale}%</span>
            </div>
            <Slider
              id="image-scale"
              min={10}
              max={150}
              step={5}
              value={[scale]}
              onValueChange={(value) => setScale(value[0])}
            />
          </div>

          <div className="border rounded-md p-2 bg-muted/50">
            <div className="flex justify-between mb-2">
              <div className="text-sm text-muted-foreground">Preview:</div>
              <div className="text-xs text-muted-foreground">Scroll to view overflow</div>
            </div>
            <div className="relative">
              <div 
                className="bg-white rounded-md p-2 overflow-auto" 
                style={{ 
                  maxHeight: '250px', 
                  maxWidth: '100%',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d4d4d8 transparent'
                }}
              >
                <div className="flex justify-center items-center" style={{ minHeight: '200px' }}>
                  <img
                    src={url}
                    alt="Preview"
                    style={{
                      width: `${scale}%`,
                      maxHeight: '200px',
                      objectFit: 'contain',
                      transition: 'width 0.3s ease'
                    }}
                    className="mx-auto"
                  />
                </div>
              </div>
              {scale > 100 && (
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {scale}%
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageEditModal;
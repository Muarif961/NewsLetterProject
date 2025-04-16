import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ButtonCustomizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddButton: (buttonConfig: {
    text: string;
    link: string;
    style: string;
    customClass: string;
  }) => void;
}

const buttonSizes = [
  { name: "Small", class: "h-8 px-3 py-1 text-sm" },
  { name: "Medium", class: "h-9 px-4 py-2 text-base" },
  { name: "Large", class: "h-10 px-6 py-3 text-lg" },
];

export function ButtonCustomizationModal({
  open,
  onOpenChange,
  onAddButton,
}: ButtonCustomizationModalProps) {
  const [buttonText, setButtonText] = useState("Click me");
  const [buttonLink, setButtonLink] = useState("");
  const [selectedSize, setSelectedSize] = useState(buttonSizes[1].class); // Medium by default
  const [backgroundColor, setBackgroundColor] = useState("#6054D6");
  const [textColor, setTextColor] = useState("#FFFFFF");

  const handleAdd = () => {
    const baseClasses = "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
    const secondaryStyle = "bg-secondary text-secondary-foreground hover:bg-secondary/90";
    const roundedClass = "rounded-md";
    const classString = `${baseClasses} ${secondaryStyle} ${selectedSize} ${roundedClass}`;
    const styleString = `background-color: ${backgroundColor} !important; color: ${textColor} !important;`;

    onAddButton({
      text: buttonText,
      link: buttonLink,
      style: styleString,
      customClass: classString,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Customize Button</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Basic Settings Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="button-text" className="text-right font-medium">
                Text
              </Label>
              <Input
                id="button-text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                className="col-span-3"
                placeholder="Enter button text"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="button-link" className="text-right font-medium">
                Link
              </Label>
              <Input
                id="button-link"
                value={buttonLink}
                onChange={(e) => setButtonLink(e.target.value)}
                placeholder="https://"
                className="col-span-3"
              />
            </div>
          </div>

          {/* Size Settings Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="button-size" className="text-right font-medium">
                Size
              </Label>
              <Select
                value={selectedSize}
                onValueChange={setSelectedSize}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a size" />
                </SelectTrigger>
                <SelectContent>
                  {buttonSizes.map((size) => (
                    <SelectItem key={size.name} value={size.class}>
                      {size.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Color Settings Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Colors</Label>
              <div className="col-span-3 flex gap-8">
                <div className="space-y-2">
                  <Label htmlFor="bg-color" className="block text-sm">Background</Label>
                  <div 
                    className="h-10 w-10 rounded cursor-pointer ring-1 ring-border"
                    style={{ backgroundColor: backgroundColor }}
                    onClick={() => document.getElementById('bg-color')?.click()}
                  />
                  <input 
                    type="color" 
                    id="bg-color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="sr-only"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="text-color" className="block text-sm">Text</Label>
                  <div 
                    className="h-10 w-10 rounded cursor-pointer ring-1 ring-border"
                    style={{ backgroundColor: textColor }}
                    onClick={() => document.getElementById('text-color')?.click()}
                  />
                  <input 
                    type="color" 
                    id="text-color" 
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="sr-only"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-4 pt-4">
            <Label className="block text-center text-lg font-medium">Preview</Label>
            <div className="flex justify-center p-8 bg-accent/10 rounded-lg">
              <Button
                className={`${selectedSize} rounded-md`}
                style={{
                  backgroundColor: backgroundColor,
                  color: textColor,
                }}
              >
                {buttonText || "Click me"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleAdd} className="w-full">Add Button</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
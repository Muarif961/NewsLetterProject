import { useState, useRef, useEffect } from "react";
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Loader2, ImagePlus, RefreshCw, CropIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageGenerated: (imageUrl: string) => void;
}

const aspectRatios = [
  { label: "Landscape (16:9)", value: "landscape", size: "1792x1024" },
  { label: "Square (1:1)", value: "square", size: "1024x1024" },
  { label: "Portrait (9:16)", value: "portrait", size: "1024x1792" },
];

// This is to help debug scaling issues
function logImageDetails(image: HTMLImageElement) {
  console.log("Image details:", {
    src: image.src,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    displayWidth: image.width,
    displayHeight: image.height,
    offsetWidth: image.offsetWidth,
    offsetHeight: image.offsetHeight,
    clientWidth: image.clientWidth,
    clientHeight: image.clientHeight,
  });
}

export function ImageGenerationModal({
  open,
  onOpenChange,
  onImageGenerated,
}: ImageGenerationModalProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(aspectRatios[0].value);
  const [isCropping, setIsCropping] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string>("");
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 80,
    height: 80,
    x: 10,
    y: 10,
  });
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  
  // Apply crop to canvas whenever completed crop changes
  useEffect(() => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      previewCanvasRef.current
    ) {
      const image = imgRef.current;
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        console.error("No 2d context");
        return;
      }
      
      // Set proper canvas size
      canvas.width = completedCrop.width;
      canvas.height = completedCrop.height;
      
      // Set canvas drawing parameters
      ctx.imageSmoothingQuality = "high";
      
      // Get scaling factors
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      
      // Scale crop coordinates
      const sourceX = completedCrop.x * scaleX;
      const sourceY = completedCrop.y * scaleY;
      const sourceWidth = completedCrop.width * scaleX;
      const sourceHeight = completedCrop.height * scaleY;
      
      // Log details for debugging
      console.log("Crop details:", {
        crop: completedCrop,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        scaleX,
        scaleY,
      });
      
      // Draw the image at the correct position and size
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      );
    }
  }, [completedCrop]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Please enter a description for the image you want to generate",
      });
      return;
    }

    setLoading(true);
    setImageLoading(true);
    setLoadingProgress("Generating image...");

    try {
      const selectedRatio = aspectRatios.find(
        (ratio) => ratio.value === aspectRatio,
      );

      setLoadingProgress("Sending request to API...");
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          size: selectedRatio?.size || "1792x1024",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || errorData.error || "Failed to generate image",
        );
      }

      setLoadingProgress("Processing generated image...");

      const data = await response.json();

      if (!data.success || !data.url) {
        throw new Error("Invalid response from server");
      }

      setGeneratedImage(data.url);
      setIsCropping(false);
      setCompletedCrop(null);
      setImageLoading(false);
      setLoadingProgress("");

      toast({
        title: "Success",
        description: "Image generated successfully!",
      });
    } catch (error: any) {
      console.error("Image generation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to generate image. Please try again.",
      });
      setImageLoading(false);
      setLoadingProgress("");
    } finally {
      setLoading(false);
    }
  };

  const handleStartCrop = () => {
    setIsCropping(true);
    // Reset the crop to a sensible default
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const newCrop = {
        unit: "px",
        width: width * 0.8,
        height: height * 0.8,
        x: width * 0.1,
        y: height * 0.1
      } as Crop;
      
      setCrop(newCrop);
    }
  };

  const handleCropComplete = async () => {
    if (!imgRef.current) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Image reference not found.",
      });
      return;
    }

    if (!completedCrop || !completedCrop.width || !completedCrop.height) {
      toast({
        variant: "destructive",
        title: "Invalid Selection",
        description: "Please select a valid crop area first.",
      });
      return;
    }

    try {
      if (!previewCanvasRef.current) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Canvas reference not found.",
        });
        return;
      }
      
      // Get data URL from canvas
      const dataUrl = previewCanvasRef.current.toDataURL('image/png');
      
      // Update the displayed image
      setGeneratedImage(dataUrl);
      setIsCropping(false);
      setCompletedCrop(null);

      toast({
        title: "Success",
        description: "Image cropped successfully!",
      });
    } catch (error) {
      console.error("Error applying crop:", error);
      setIsCropping(false);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to apply crop. Please try again.",
      });
    }
  };

  const handleAddImage = () => {
    if (generatedImage) {
      onImageGenerated(generatedImage);
      onOpenChange(false);
      setPrompt("");
      setGeneratedImage(null);
      setIsCropping(false);
      setCompletedCrop(null);
      setCrop({
        unit: "%",
        width: 80,
        height: 80,
        x: 10,
        y: 10,
      });
    }
  };

  // Handle when an image is loaded
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imgRef.current = img;
    
    // Log image details for debugging 
    logImageDetails(img);
    
    setImageLoading(false);
    
    // Set a default crop when image loads
    const { width, height } = img;
    const newCrop = {
      unit: "px",
      width: width * 0.8,
      height: height * 0.8,
      x: width * 0.1,
      y: height * 0.1
    } as Crop;
    
    setCrop(newCrop);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[825px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Image with AI</DialogTitle>
          <DialogDescription>
            Describe the image you want to create and select your preferred
            aspect ratio.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  {aspectRatios.map((ratio) => (
                    <SelectItem key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Image Description</Label>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    id="prompt"
                    placeholder="Describe the image you want to generate..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {loadingProgress || "Generating..."}
                    </>
                  ) : (
                    <>
                      <ImagePlus className="mr-2 h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {generatedImage && (
            <div className="space-y-2">
              <div
                className={`relative w-full overflow-hidden border rounded-lg ${
                  aspectRatio === "landscape"
                    ? "aspect-video"
                    : aspectRatio === "portrait"
                      ? "aspect-[9/16] max-h-[60vh]"
                      : "aspect-square"
                }`}
              >
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {loadingProgress}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Hidden canvas for crop preview */}
                <canvas
                  ref={previewCanvasRef}
                  style={{
                    display: "none",
                    width: completedCrop?.width || 0,
                    height: completedCrop?.height || 0,
                  }}
                />
                
                {isCropping ? (
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={undefined}
                  >
                    <img
                      src={generatedImage}
                      alt="Generated"
                      className="w-full h-full object-contain"
                      crossOrigin="anonymous"
                      onLoad={onImageLoad}
                    />
                  </ReactCrop>
                ) : (
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                    onLoad={onImageLoad}
                    ref={imgRef}
                  />
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedImage(null);
                    setImageLoading(false);
                    setLoadingProgress("");
                    setCompletedCrop(null);
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate Another
                </Button>
                {isCropping ? (
                  <Button onClick={handleCropComplete}>Apply Crop</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleStartCrop}>
                      <CropIcon className="mr-2 h-4 w-4" />
                      Crop Image
                    </Button>
                    <Button onClick={handleAddImage}>Add to Editor</Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface OnboardingTooltipProps {
  open: boolean;
  target: string;
  title: string;
  description: string;
  placement?: "top" | "right" | "bottom" | "left";
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  nextButtonText?: string;
  previousButtonText?: string;
  isFirst?: boolean;
  isLast?: boolean;
  highlightTarget?: boolean;
}

export function OnboardingTooltip({
  open,
  target,
  title,
  description,
  placement = "bottom",
  onClose,
  onNext,
  onPrevious,
  nextButtonText = "Next",
  previousButtonText = "Previous",
  isFirst = false,
  isLast = false,
  highlightTarget = false,
}: OnboardingTooltipProps) {
  const [mounted, setMounted] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Find the target element
  useEffect(() => {
    const element = document.querySelector(target) as HTMLElement;
    if (element) {
      setTargetElement(element);
      
      // Add a highlight class if needed
      if (highlightTarget && open) {
        element.classList.add("onboarding-highlight");
      }
      
      return () => {
        // Clean up highlight when component unmounts
        if (highlightTarget) {
          element.classList.remove("onboarding-highlight");
        }
      };
    }
  }, [target, open, highlightTarget]);

  // Position the tooltip based on the target element
  useEffect(() => {
    if (!targetElement || !tooltipRef.current || !open) return;

    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    let top = 0;
    let left = 0;
    
    // Special case for the profile icon in the top right (verify-email step)
    if (target === "[data-onboarding-target='profile-icon']") {
      // Position tooltip to the left of the profile icon in the top right
      top = targetRect.bottom + 12; // Position slightly below the icon
      left = targetRect.left - tooltipRect.width + targetRect.width; // Align the right edge with the icon
    } else {
      // Default positioning based on placement
      switch (placement) {
        case "top":
          top = targetRect.top - tooltipRect.height - 10;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case "right":
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.right + 10;
          break;
        case "left":
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.left - tooltipRect.width - 10;
          break;
        case "bottom":
        default:
          top = targetRect.bottom + 10;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
      }
    }
    
    // Make sure tooltip doesn't go off-screen
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    
    if (top < 10) top = 10;
    if (top + tooltipRect.height > window.innerHeight - 10) {
      top = window.innerHeight - tooltipRect.height - 10;
    }
    
    setPosition({ top, left });
    
    // Reposition on window resize
    const handleResize = () => {
      if (targetElement && tooltipRef.current) {
        const newTargetRect = targetElement.getBoundingClientRect();
        const newTooltipRect = tooltipRef.current.getBoundingClientRect();
        
        let newTop = 0;
        let newLeft = 0;
        
        // Keep special positioning for profile icon tooltip during resize as well
        if (target === "[data-onboarding-target='profile-icon']") {
          // Position tooltip to the left of the profile icon in the top right
          newTop = newTargetRect.bottom + 12; // Position slightly below the icon
          newLeft = newTargetRect.left - newTooltipRect.width + newTargetRect.width; // Align the right edge with the icon
        } else {
          // Default positioning based on placement
          switch (placement) {
            case "top":
              newTop = newTargetRect.top - newTooltipRect.height - 10;
              newLeft = newTargetRect.left + (newTargetRect.width - newTooltipRect.width) / 2;
              break;
            case "right":
              newTop = newTargetRect.top + (newTargetRect.height - newTooltipRect.height) / 2;
              newLeft = newTargetRect.right + 10;
              break;
            case "left":
              newTop = newTargetRect.top + (newTargetRect.height - newTooltipRect.height) / 2;
              newLeft = newTargetRect.left - newTooltipRect.width - 10;
              break;
            case "bottom":
            default:
              newTop = newTargetRect.bottom + 10;
              newLeft = newTargetRect.left + (newTargetRect.width - newTooltipRect.width) / 2;
              break;
          }
        }
        
        if (newLeft < 10) newLeft = 10;
        if (newLeft + newTooltipRect.width > window.innerWidth - 10) {
          newLeft = window.innerWidth - newTooltipRect.width - 10;
        }
        
        if (newTop < 10) newTop = 10;
        if (newTop + newTooltipRect.height > window.innerHeight - 10) {
          newTop = window.innerHeight - newTooltipRect.height - 10;
        }
        
        setPosition({ top: newTop, left: newLeft });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [targetElement, placement, open, target]);

  // Only show component after first render to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {open && targetElement && (
        <div
          ref={tooltipRef}
          className="fixed z-50 animate-in fade-in-50 zoom-in-95"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`
          }}
        >
          <Card className="shadow-lg p-4 max-w-xs w-72 bg-popover border-primary/20">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold">{title}</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
            <div className="flex justify-between items-center">
              {!isFirst && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrevious}
                >
                  {previousButtonText}
                </Button>
              )}
              {isFirst && <div />}
              <Button
                size="sm"
                onClick={isLast ? onClose : onNext}
              >
                {isLast ? "Finish" : nextButtonText}
              </Button>
            </div>
            <div 
              className={`absolute w-3 h-3 rotate-45 bg-popover border-primary/20 ${
                target === "[data-onboarding-target='profile-icon']" ? 
                  'top-[-6px] right-4 border-l border-t' : // Special arrow for profile icon
                placement === 'top' ? 
                  'bottom-[-6px] left-1/2 transform -translate-x-1/2 border-r border-b' :
                placement === 'bottom' ? 
                  'top-[-6px] left-1/2 transform -translate-x-1/2 border-l border-t' :
                placement === 'left' ? 
                  'right-[-6px] top-1/2 transform -translate-y-1/2 border-r border-t' :
                  'left-[-6px] top-1/2 transform -translate-y-1/2 border-l border-b'
              }`}
            />
          </Card>
        </div>
      )}
    </>
  );
}
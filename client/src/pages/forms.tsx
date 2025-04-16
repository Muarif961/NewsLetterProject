import { useUser } from "../hooks/use-user";
import useSWR from "swr";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "../components/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from "../components/content-curator";
import { Code, Copy, Check, ChevronDown, ChevronUp, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Sidebar } from "../components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FormStyles {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderRadius: number;
  fontFamily: string;
  fontSize: string;
  buttonBackgroundColor: string;
  buttonTextColor: string;
  titleColor: string;
  descriptionColor: string;
  formMaxWidth: number;
  formPadding: number;
  formBackgroundOpacity: number;
  formShadow: 'none' | 'small' | 'medium' | 'large';
  backgroundImage: string;
  heroTitle: string;
  heroSubtitle: string;
  heroAlignment: 'left' | 'center' | 'right';
  heroTextColor: string;
  formPosition: 'left' | 'center' | 'right';
}

type DisplayMode = 'embedded' | 'popup' | 'fullscreen';

export default function Forms() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [displayMode, setDisplayMode] = useState<DisplayMode>('embedded');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isPopup, setIsPopup] = useState(false);
  const [popupTrigger, setPopupTrigger] = useState<'button' | 'time' | 'scroll'>('button');
  const [popupDelay, setPopupDelay] = useState(5);
  const [popupScrollPercent, setPopupScrollPercent] = useState(50);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: groups = [] } = useSWR('/api/groups');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [formContent, setFormContent] = useState({
    title: "Subscribe to our Newsletter",
    description: "Stay updated with our latest content",
    buttonText: "Subscribe",
    emailLabel: "Email Address",
    emailPlaceholder: "your@email.com",
    nameLabel: "Name",
    namePlaceholder: "John Doe",
    showNameField: true,
    successMessage: "Thanks for subscribing!",
    errorMessage: "Something went wrong. Please try again.",
    heroTitle: "Join Our Newsletter",
    heroSubtitle: "Get the latest updates delivered to your inbox",
  });

  const [formStyles, setFormStyles] = useState<FormStyles>({
    backgroundColor: "#ffffff",
    textColor: "#000000",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    fontFamily: "Arial",
    fontSize: "16px",
    buttonBackgroundColor: "#6366f1",
    buttonTextColor: "#ffffff",
    titleColor: "#000000",
    descriptionColor: "#64748b",
    formMaxWidth: 400,
    formPadding: 24,
    formBackgroundOpacity: 100,
    formShadow: 'medium',
    backgroundImage: "",
    heroTitle: "Join Our Newsletter",
    heroSubtitle: "Get the latest updates delivered to your inbox",
    heroAlignment: 'center',
    heroTextColor: "#ffffff",
    formPosition: 'right'
  });

  const getBackgroundWithOpacity = (hexColor: string) => {
    if (!hexColor || !hexColor.startsWith('#') || hexColor.length !== 7) {
      console.warn('Invalid hex color format:', hexColor);
      return hexColor;
    }

    try {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);

      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        console.warn('Invalid hex color values:', hexColor);
        return hexColor;
      }

      return isPopup
        ? `rgba(${r}, ${g}, ${b}, ${formStyles.formBackgroundOpacity / 100})`
        : hexColor;
    } catch (e) {
      console.error('Error parsing color:', e);
      return hexColor;
    }
  };

  const getShadowStyle = (shadowSize: string) => {
    if (!isPopup) return 'none';

    switch (shadowSize) {
      case 'small': return '0 2px 4px rgba(0,0,0,0.1)';
      case 'medium': return '0 4px 6px rgba(0,0,0,0.1)';
      case 'large': return '0 10px 15px rgba(0,0,0,0.1)';
      default: return 'none';
    }
  };

  const generateFormUrl = () => {
    return `${window.location.origin}/subscribe/${user?.id}${displayMode === 'fullscreen' ? '?mode=fullscreen' : ''}`;
  };

  const embedCode = `<div id="newsletter-widget-container"></div>
<script src="${window.location.origin}/api/widget"></script>
<script>
  window.NewsletterWidget.init({
    userId: '${user?.id}',
    containerId: 'newsletter-widget-container',
    displayMode: '${displayMode}',
    isPopup: ${isPopup},
    popupTrigger: '${popupTrigger}',
    popupDelay: ${popupDelay},
    popupScrollPercent: ${popupScrollPercent},
    content: ${JSON.stringify(formContent)},
    styles: ${JSON.stringify(formStyles)}
  });
</script>`;

  const buttonCode = `<a href="${generateFormUrl()}" 
  data-newsletter-popup="true" 
  data-popup-trigger="${popupTrigger}"
  data-popup-delay="${popupDelay}"
  data-popup-scroll="${popupScrollPercent}">Subscribe to Newsletter</a>`;

  const copyToClipboard = async (code: string, type: 'embed' | 'button' | 'url') => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: `${type === 'embed' ? 'Form' : type === 'button' ? 'Button' : 'URL'} code copied to clipboard`,
      });
    } catch (err) {
      console.error("Failed to copy:", err);
      toast({
        title: "Error",
        description: "Failed to copy code to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleStyleChange = (key: keyof FormStyles, value: any) => {
    setFormStyles((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (!user) {
    setLocation("/");
    return null;
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Configuration Panel */}
        <div className="w-[40%] border-r bg-background overflow-y-auto p-6">
          <div className="sticky top-0 z-10 bg-background pb-4 mb-4 border-b">
            <h1 className="text-2xl font-bold mb-2">Form Editor</h1>
            <div className="flex gap-2">
              <Button className="w-full" onClick={() => console.log("Save")}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="display">
              <AccordionTrigger className="text-lg font-semibold">
                Display Options
              </AccordionTrigger>
              <AccordionContent className="space-y-4 p-4">
                <Card className="p-4">
                  <h3 className="font-medium mb-4">Display Type</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Button
                      variant={displayMode === 'embedded' ? 'default' : 'outline'}
                      onClick={() => {
                        setDisplayMode('embedded');
                        setIsPopup(false);
                      }}
                      className="w-full"
                    >
                      Embedded
                    </Button>
                    <Button
                      variant={displayMode === 'popup' ? 'default' : 'outline'}
                      onClick={() => {
                        setDisplayMode('popup');
                        setIsPopup(true);
                      }}
                      className="w-full"
                    >
                      Popup
                    </Button>
                    <Button
                      variant={displayMode === 'fullscreen' ? 'default' : 'outline'}
                      onClick={() => {
                        setDisplayMode('fullscreen');
                        setIsPopup(false);
                      }}
                      className="w-full"
                    >
                      Full Screen
                    </Button>
                  </div>
                  {displayMode === 'popup' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Direct Link URL</Label>
                        <div className="flex gap-2">
                          <Input
                            readOnly
                            value={generateFormUrl()}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            onClick={() => copyToClipboard(generateFormUrl(), 'url')}
                          >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <Label>Popup Trigger</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-popover text-foreground"
                        value={popupTrigger}
                        onChange={(e) => setPopupTrigger(e.target.value as 'button' | 'time' | 'scroll')}
                      >
                        <option value="button">Button Click</option>
                        <option value="time">Time Delay</option>
                        <option value="scroll">Page Scroll</option>
                      </select>

                      {popupTrigger === 'time' && (
                        <div className="space-y-2">
                          <Label>Show After (seconds)</Label>
                          <Slider
                            value={[popupDelay]}
                            onValueChange={([value]) => setPopupDelay(value)}
                            max={30}
                            step={1}
                          />
                          <span className="text-sm text-muted-foreground">{popupDelay} seconds</span>
                        </div>
                      )}

                      {popupTrigger === 'scroll' && (
                        <div className="space-y-2">
                          <Label>Show After Scroll (%)</Label>
                          <Slider
                            value={[popupScrollPercent]}
                            onValueChange={([value]) => setPopupScrollPercent(value)}
                            max={100}
                            step={5}
                          />
                          <span className="text-sm text-muted-foreground">{popupScrollPercent}% of page</span>
                        </div>
                      )}
                    </div>
                  )}
                  {displayMode === 'fullscreen' && (
                    <>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Hero Title</Label>
                            <Input
                              value={formContent.heroTitle}
                              onChange={(e) =>
                                setFormContent((prev) => ({
                                  ...prev,
                                  heroTitle: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Hero Subtitle</Label>
                            <Input
                              value={formContent.heroSubtitle}
                              onChange={(e) =>
                                setFormContent((prev) => ({
                                  ...prev,
                                  heroSubtitle: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Hero Text Color</Label>
                          <ColorPicker
                            value={formStyles.heroTextColor}
                            onChange={(color) =>
                              handleStyleChange("heroTextColor", color)
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Hero Text Alignment</Label>
                          <select
                            className="w-full p-2 border rounded-md bg-popover text-foreground"
                            value={formStyles.heroAlignment}
                            onChange={(e) =>
                              handleStyleChange(
                                "heroAlignment",
                                e.target.value as 'left' | 'center' | 'right'
                              )
                            }
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label>Form Position</Label>
                          <select
                            className="w-full p-2 border rounded-md bg-popover text-foreground"
                            value={formStyles.formPosition}
                            onChange={(e) =>
                              handleStyleChange(
                                "formPosition",
                                e.target.value as 'left' | 'center' | 'right'
                              )
                            }
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label>Background Image URL</Label>
                          <Input
                            value={formStyles.backgroundImage}
                            onChange={(e) =>
                              handleStyleChange("backgroundImage", e.target.value)
                            }
                            placeholder="https://example.com/background.jpg"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="content">
              <AccordionTrigger className="text-lg font-semibold">
                Form Content
              </AccordionTrigger>
              <AccordionContent className="space-y-4 p-4">
                <Card className="p-4">
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label>Form Title</Label>
                        <Input
                          value={formContent.title}
                          onChange={(e) =>
                            setFormContent((prev) => ({ ...prev, title: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={formContent.description}
                          onChange={(e) =>
                            setFormContent((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Button Text</Label>
                        <Input
                          value={formContent.buttonText}
                          onChange={(e) =>
                            setFormContent((prev) => ({
                              ...prev,
                              buttonText: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Success Message</Label>
                        <Input
                          value={formContent.successMessage}
                          onChange={(e) =>
                            setFormContent((prev) => ({
                              ...prev,
                              successMessage: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Error Message</Label>
                        <Input
                          value={formContent.errorMessage}
                          onChange={(e) =>
                            setFormContent((prev) => ({
                              ...prev,
                              errorMessage: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Add Subscribers to Group</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-popover text-foreground"
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                      >
                        <option value="">No Group</option>
                        {groups?.map((group) => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Name Field</Label>
                      <Switch
                        checked={formContent.showNameField}
                        onCheckedChange={(checked) =>
                          setFormContent((prev) => ({
                            ...prev,
                            showNameField: checked,
                          }))
                        }
                      />
                    </div>

                    {formContent.showNameField && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                        <div className="space-y-2">
                          <Label>Name Field Label</Label>
                          <Input
                            value={formContent.nameLabel}
                            onChange={(e) =>
                              setFormContent((prev) => ({
                                ...prev,
                                nameLabel: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Name Field Placeholder</Label>
                          <Input
                            value={formContent.namePlaceholder}
                            onChange={(e) =>
                              setFormContent((prev) => ({
                                ...prev,
                                namePlaceholder: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email Field Label</Label>
                        <Input
                          value={formContent.emailLabel}
                          onChange={(e) =>
                            setFormContent((prev) => ({
                              ...prev,
                              emailLabel: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Field Placeholder</Label>
                        <Input
                          value={formContent.emailPlaceholder}
                          onChange={(e) =>
                            setFormContent((prev) => ({
                              ...prev,
                              emailPlaceholder: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="styling">
              <AccordionTrigger className="text-lg font-semibold">
                Form Styling
              </AccordionTrigger>
              <AccordionContent className="space-y-4 p-4">
                <Card className="p-4">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Background</Label>
                        <ColorPicker
                          value={formStyles.backgroundColor}
                          onChange={(color) =>
                            handleStyleChange("backgroundColor", color)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Text Color</Label>
                        <ColorPicker
                          value={formStyles.textColor}
                          onChange={(color) =>
                            handleStyleChange("textColor", color)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Title Color</Label>
                        <ColorPicker
                          value={formStyles.titleColor}
                          onChange={(color) =>
                            handleStyleChange("titleColor", color)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Description Color</Label>
                        <ColorPicker
                          value={formStyles.descriptionColor}
                          onChange={(color) =>
                            handleStyleChange("descriptionColor", color)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Border Color</Label>
                        <ColorPicker
                          value={formStyles.borderColor}
                          onChange={(color) =>
                            handleStyleChange("borderColor", color)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Button Background</Label>
                        <ColorPicker
                          value={formStyles.buttonBackgroundColor}
                          onChange={(color) =>
                            handleStyleChange("buttonBackgroundColor", color)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Button Text</Label>
                        <ColorPicker
                          value={formStyles.buttonTextColor}
                          onChange={(color) =>
                            handleStyleChange("buttonTextColor", color)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Border Radius</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[formStyles.borderRadius]}
                        onValueChange={([value]) =>
                          handleStyleChange("borderRadius", value)
                        }
                        max={20}
                        step={1}
                      />
                      <span className="text-sm w-12 text-right">
                        {formStyles.borderRadius}px
                      </span>
                    </div>
                  </div>
                  {isPopup && (
                    <>
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Popup Form Layout</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm">Max Width (px)</Label>
                            <div className="flex items-center gap-4">
                              <Slider
                                value={[formStyles.formMaxWidth]}
                                onValueChange={([value]) =>
                                  handleStyleChange("formMaxWidth", value)
                                }
                                min={300}
                                max={800}
                                step={10}
                              />
                              <span className="text-sm w-12 text-right">
                                {formStyles.formMaxWidth}px
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Padding (px)</Label>
                            <div className="flex items-center gap-4">
                              <Slider
                                value={[formStyles.formPadding]}
                                onValueChange={([value]) =>
                                  handleStyleChange("formPadding", value)
                                }
                                min={16}
                                max={48}
                                step={4}
                              />
                              <span className="text-sm w-12 text-right">
                                {formStyles.formPadding}px
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Visual Effects</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm">Background Opacity (%)</Label>
                            <div className="flex items-center gap-4">
                              <Slider
                                value={[formStyles.formBackgroundOpacity]}
                                onValueChange={([value]) =>
                                  handleStyleChange("formBackgroundOpacity", value)
                                }
                                min={0}
                                max={100}
                                step={5}
                              />
                              <span className="text-sm w-12 text-right">
                                {formStyles.formBackgroundOpacity}%
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Shadow</Label>
                            <select
                              className="w-full p-2 border rounded-md bg-popover text-foreground"
                              value={formStyles.formShadow}
                              onChange={(e) =>
                                handleStyleChange("formShadow", e.target.value)
                              }
                            >
                              <option value="none">None</option>
                              <option value="small">Small</option>
                              <option value="medium">Medium</option>
                              <option value="large">Large</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Preview Panel */}
        <div className="w-[60%] bg-gray-50 overflow-y-auto p-6">
          <div className="sticky top-0 z-10 bg-gray-50 pb-4 mb-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Preview</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => copyToClipboard(embedCode, 'embed')}>
                  <Code className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center min-h-[600px] bg-gray-100 rounded-lg p-4">
            {/* Form Preview */}
            <div
              className="w-full max-w-md mx-auto"
              style={{
                maxWidth: `${formStyles.formMaxWidth}px`,
              }}
            >
              {displayMode === 'fullscreen' ? (
                <div className="relative min-h-[600px] border rounded-lg overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: formStyles.backgroundImage ? `url(${formStyles.backgroundImage})` : 'none',
                      backgroundColor: formStyles.backgroundColor,
                    }}
                  >
                    <div className="absolute inset-0 bg-black bg-opacity-50"></div>
                    <div className="relative h-full flex items-center">
                      <div
                        className={`w-full px-4 ${
                          formStyles.heroAlignment === 'center'
                            ? 'text-center'
                            : formStyles.heroAlignment === 'right'
                            ? 'text-right'
                            : 'text-left'
                        }`}
                      >
                        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                          <div>
                            <h2
                              className="text-4xl font-bold mb-4"
                              style={{ color: formStyles.heroTextColor }}
                            >
                              {formContent.heroTitle}
                            </h2>
                            <p
                              className="text-xl"
                              style={{ color: formStyles.heroTextColor }}
                            >
                              {formContent.heroSubtitle}
                            </p>
                          </div>
                          <div
                            className={`${
                              formStyles.formPosition === 'center'
                                ? 'mx-auto'
                                : formStyles.formPosition === 'right'
                                ? 'ml-auto'
                                : ''
                            }`}
                            style={{
                              maxWidth: `${formStyles.formMaxWidth}px`,
                              width: '100%',
                            }}
                          >
                            <div
                              className="bg-white rounded-lg p-6"
                              style={{
                                boxShadow: getShadowStyle(formStyles.formShadow),
                              }}
                            >
                              <form className="space-y-4">
                                <div className="space-y-2">
                                  <Label style={{ color: formStyles.textColor }}>
                                    {formContent.emailLabel}
                                  </Label>
                                  <Input
                                    type="email"
                                    placeholder={formContent.emailPlaceholder}
                                    style={{
                                      borderColor: formStyles.borderColor,
                                      borderRadius: `${formStyles.borderRadius}px`,
                                      color: formStyles.textColor,
                                    }}
                                  />
                                </div>
                                {formContent.showNameField && (
                                  <div className="space-y-2">
                                    <Label style={{ color: formStyles.textColor }}>
                                      {formContent.nameLabel}
                                    </Label>
                                    <Input
                                      type="text"
                                      placeholder={formContent.namePlaceholder}
                                      style={{
                                        borderColor: formStyles.borderColor,
                                        borderRadius: `${formStyles.borderRadius}px`,
                                        color: formStyles.textColor,
                                      }}
                                    />
                                  </div>
                                )}
                                <Button
                                  className="w-full"
                                  style={{
                                    backgroundColor: formStyles.buttonBackgroundColor,
                                    color: formStyles.buttonTextColor,
                                    borderRadius: `${formStyles.borderRadius}px`,
                                  }}
                                >
                                  {formContent.buttonText}
                                </Button>
                              </form>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-lg border"
                  style={{
                    background: getBackgroundWithOpacity(formStyles.backgroundColor),
                    padding: `${formStyles.formPadding}px`,
                    borderRadius: `${formStyles.borderRadius}px`,
                    boxShadow: getShadowStyle(formStyles.formShadow)
                  }}
                >
                  <div className="max-w-md mx-auto">
                    <div className="text-center mb-4">
                      <h3
                        style={{
                          color: formStyles.titleColor,
                          fontSize: "1.25rem",
                          fontWeight: 600,
                          marginBottom: "0.5rem",
                        }}
                      >
                        {formContent.title}
                      </h3>
                      <p
                        style={{
                          color: formStyles.descriptionColor,
                          fontSize: "0.875rem",
                        }}
                      >
                        {formContent.description}
                      </p>
                    </div>
                    <form className="space-y-4">
                      <div className="space-y-2">
                        <Label style={{ color: formStyles.textColor }}>
                          {formContent.emailLabel}
                        </Label>
                        <Input
                          type="email"
                          placeholder={formContent.emailPlaceholder}
                          style={{
                            borderColor: formStyles.borderColor,
                            borderRadius: `${formStyles.borderRadius}px`,
                            color: formStyles.textColor,
                            background: getBackgroundWithOpacity(formStyles.backgroundColor),
                          }}
                        />
                      </div>
                      {formContent.showNameField && (
                        <div className="space-y-2">
                          <Label style={{ color: formStyles.textColor }}>
                            {formContent.nameLabel}
                          </Label>
                          <Input
                            type="text"
                            placeholder={formContent.namePlaceholder}
                            style={{
                              borderColor: formStyles.borderColor,
                              borderRadius: `${formStyles.borderRadius}px`,
                              color: formStyles.textColor,
                              background: getBackgroundWithOpacity(formStyles.backgroundColor),
                            }}
                          />
                        </div>
                      )}
                      <Button
                        className="w-full"
                        style={{
                          backgroundColor: formStyles.buttonBackgroundColor,
                          color: formStyles.buttonTextColor,
                          borderRadius: `${formStyles.borderRadius}px`,
                        }}
                      >
                        {formContent.buttonText}
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
import { useEffect } from "react";
import { useUser } from "../hooks/use-user";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "../components/dashboard-layout";
import { useState, useCallback } from "react";
import { CustomContent } from "../components/custom-content";
import { ChatModal } from "../components/modals/chat-modal";
import {
  Globe,
  MessageSquare,
  Filter,
  Calendar,
  Newspaper,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NewsStory {
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  readMoreUrl: string;
  category: string;
}

interface SearchFilters {
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  location: string;
  sourceTypes: string[];
}

const sourceTypes = [
  { id: "mainstream", label: "Mainstream Media" },
  { id: "blogs", label: "Blogs" },
  { id: "press", label: "Press Releases" },
];

const locations = [
  "Global",
  "United States",
  "United Kingdom",
  "European Union",
  "Asia Pacific",
  "Middle East",
  "Africa",
  "Latin America",
];

export default function Editor() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: {
      startDate: null,
      endDate: null,
    },
    location: "Global",
    sourceTypes: ["mainstream"],
  });

  const handleNewsSelect = useCallback(
    (stories: NewsStory[]) => {
      if (!stories || stories.length === 0) return;

      // Format the content by separating each story into distinct blocks
      const content = stories
        .map((story) => {
          // Create an array of content blocks
          const storyBlocks = [
            // Title as H2
            `<h2>${story.title}</h2>`,

            // Description as paragraph
            `<p>${story.description}</p>`,

            // Metadata as styled div
            `<div class="story-meta" style="margin-top: 1rem; font-size: 0.9em; color: #666;">
          <p>Source: <a href="${story.readMoreUrl}" target="_blank">${story.source}</a></p>
          <p>Date: ${new Date(story.publishedAt).toLocaleDateString()}</p>
          <p>Category: ${story.category}</p>
        </div>`,

            // Separator
            `<hr style="margin: 2rem 0; border: none; border-top: 1px solid #eee;" />`,
          ];

          // Join the blocks with newlines to ensure proper block separation
          return storyBlocks.join("\n\n");
        })
        .join("\n\n");

      // Create the content object
      const contentObj = {
        title: "Latest News Roundup",
        content: content,
        subject: "Latest News Update",
      };

      // Navigate to the editor with the content
      const queryParams = new URLSearchParams();
      queryParams.set(
        "content",
        encodeURIComponent(JSON.stringify(contentObj)),
      );
      setLocation(`/editor/content?${queryParams.toString()}`);
    },
    [setLocation],
  );

  if (!user) {
    setLocation("/");
    return null;
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      const newCategories = prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId];

      if (newCategories.length > 0) {
        setNewsModalOpen(true);
      }

      return newCategories;
    });
  };

  // Handle content from CustomContent component
  const handleCustomContent = useCallback(
    (content: string) => {
      // Create the content object similar to handleNewsSelect
      const contentObj = {
        title: "Custom Content",
        content: content,
        subject: "Custom Content",
      };

      // Navigate to the editor with the content
      const queryParams = new URLSearchParams();
      queryParams.set(
        "content",
        encodeURIComponent(JSON.stringify(contentObj)),
      );
      setLocation(`/editor/content?${queryParams.toString()}`);
    },
    [setLocation],
  );

  return (
    <DashboardLayout>
      <div className="flex min-h-screen">
        <main className="flex-1 px-6 py-8">
          <div className="max-w-[1200px] mx-auto space-y-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">Newsletter Editor</h1>
              <p className="text-muted-foreground text-lg">
                Create and customize your newsletter content
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Custom Content Section */}
              <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-semibold">Custom Content</h2>
                  <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">Beta</span>
                </div>
                <p className="text-muted-foreground mb-6">
                  Write or paste your own content for personalized newsletters
                </p>
                <CustomContent onContentGenerated={handleCustomContent} />
              </Card>

              {/* News Generation Section */}
              <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-semibold">Latest News</h2>
                  <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">Beta</span>
                </div>
                <p className="text-muted-foreground mb-6">
                  Get curated news content from your selected categories
                </p>
                <div className="space-y-6">
                  {/* Search Filters */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Search Filters</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="gap-2"
                      >
                        <Filter className="h-4 w-4" />
                        {showFilters ? "Hide Filters" : "Show Filters"}
                      </Button>
                    </div>

                    {showFilters && (
                      <Card className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Date Range
                          </Label>
                          <div className="flex gap-4">
                            <DatePicker
                              value={filters.dateRange.startDate}
                              onChange={(date) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  dateRange: {
                                    ...prev.dateRange,
                                    startDate: date,
                                  },
                                }))
                              }
                              placeholder="Start date"
                            />
                            <DatePicker
                              value={filters.dateRange.endDate}
                              onChange={(date) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  dateRange: {
                                    ...prev.dateRange,
                                    endDate: date,
                                  },
                                }))
                              }
                              placeholder="End date"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Location
                          </Label>
                          <Select
                            value={filters.location}
                            onValueChange={(value) =>
                              setFilters((prev) => ({
                                ...prev,
                                location: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map((location) => (
                                <SelectItem key={location} value={location}>
                                  {location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Newspaper className="h-4 w-4" />
                            Source Types
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {sourceTypes.map((type) => (
                              <Button
                                key={type.id}
                                variant={
                                  filters.sourceTypes.includes(type.id)
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    sourceTypes: prev.sourceTypes.includes(
                                      type.id,
                                    )
                                      ? prev.sourceTypes.filter(
                                          (t) => t !== type.id,
                                        )
                                      : [...prev.sourceTypes, type.id],
                                  }));
                                }}
                              >
                                {type.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Category Selection */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {categories.map((category) => (
                      <Button
                        key={category.id}
                        variant={
                          selectedCategories.includes(category.id)
                            ? "default"
                            : "outline"
                        }
                        onClick={() => toggleCategory(category.id)}
                        className={`h-auto py-4 flex flex-col items-center gap-2 transition-all ${
                          selectedCategories.includes(category.id)
                            ? "border-primary bg-primary/10 hover:bg-primary/20"
                            : "hover:border-primary/50"
                        }`}
                      >
                        <span className="text-2xl">{category.icon}</span>
                        <span className="font-medium">{category.title}</span>
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={() => setChatModalOpen(true)}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Ask AI Assistant
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Chat Modal for AI Assistant */}
      {chatModalOpen && (
        <ChatModal
          open={chatModalOpen}
          onOpenChange={setChatModalOpen}
          onNewsSelect={handleNewsSelect}
          initialFilters={filters}
        />
      )}

      {/* News Selection Modal for Latest News */}
      {newsModalOpen && selectedCategories.length > 0 && (
        <ChatModal
          open={newsModalOpen}
          onOpenChange={setNewsModalOpen}
          onNewsSelect={handleNewsSelect}
          categories={selectedCategories}
          mode="latest"
          initialFilters={filters}
        />
      )}
    </DashboardLayout>
  );
}

const categories = [
  {
    id: "technology",
    title: "Technology",
    description: "Latest in tech, AI, and digital transformation",
    icon: "💻",
  },
  {
    id: "business",
    title: "Business",
    description: "Business news, market trends, and industry insights",
    icon: "📈",
  },
  {
    id: "science",
    title: "Science",
    description: "Scientific discoveries and research breakthroughs",
    icon: "🔬",
  },
  {
    id: "health",
    title: "Health",
    description: "Healthcare innovations and wellness trends",
    icon: "🏥",
  },
  {
    id: "environment",
    title: "Environment",
    description: "Climate change and sustainability news",
    icon: "🌍",
  },
];

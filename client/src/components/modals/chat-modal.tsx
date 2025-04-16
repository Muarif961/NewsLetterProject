import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Loader2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "../ui/checkbox";
import { Separator } from "../ui/separator";

const MotionError = motion.div;
const MotionResults = motion.div;

interface NewsStory {
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  readMoreUrl: string;
  category: string;
  location?: string;
  sourceType?: string;
}

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewsSelect: (stories: NewsStory[]) => void;
  categories?: string[];
  mode?: "ai" | "latest";
  initialFilters?: SearchFilters;
}

interface SearchFilters {
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  location: string;
  sourceTypes: string[];
}

export function ChatModal({
  open,
  onOpenChange,
  onNewsSelect,
  categories = [],
  mode = "ai",
  initialFilters,
}: ChatModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState<NewsStory[] | null>(null);
  const [selectedStories, setSelectedStories] = useState<Set<number>>(
    new Set(),
  );
  const [filters] = useState<SearchFilters>(
    initialFilters || {
      dateRange: {
        startDate: null,
        endDate: null,
      },
      location: "Global",
      sourceTypes: ["mainstream"],
    },
  );

  useEffect(() => {
    if (open && mode === "latest" && categories.length > 0) {
      handleSubmit(new Event("submit") as any);
    }
  }, [open, mode, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && mode === "ai") return;

    setLoading(true);
    setError(null);
    setSelectedStories(new Set());

    try {
      const endpoint = mode === "ai" ? "/api/news/chat" : "/api/news/preview";
      const body =
        mode === "ai"
          ? { query }
          : {
              categories,
              dateRange:
                filters.dateRange.startDate && filters.dateRange.endDate
                  ? {
                      startDate: filters.dateRange.startDate
                        .toISOString()
                        .split("T")[0],
                      endDate: filters.dateRange.endDate
                        .toISOString()
                        .split("T")[0],
                    }
                  : undefined,
              location:
                filters.location !== "Global" ? filters.location : undefined,
              sourceTypes: filters.sourceTypes,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "Failed to fetch news");
      }

      const data = await response.json();

      if (data.message) {
        setError(data.message);
        setStories([]);
        return;
      }

      const formattedStories =
        mode === "ai"
          ? data.articles.map((article: any) => ({
              title: article.title || "Untitled",
              description: article.content || article.description || "",
              source: article.source || "AI Generated",
              publishedAt: article.publishedAt || new Date().toISOString(),
              readMoreUrl: article.sourceUrl || "#",
              category: article.category || "General",
              location: article.location,
              sourceType: article.sourceType,
            }))
          : data.map((article: any) => ({
              title: article.title || "Untitled",
              description: article.description || article.content || "",
              source: article.source || "Unknown Source",
              publishedAt: article.publishedAt || new Date().toISOString(),
              readMoreUrl: article.url || article.readMoreUrl || "#",
              category: article.category || "General",
              location: article.location,
              sourceType: article.sourceType,
            }));

      if (formattedStories.length === 0) {
        setError("No stories found. Try modifying your search terms or broadening the topic.");
        setStories([]);
      } else {
        setStories(formattedStories);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch news");
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStorySelection = (index: number) => {
    setSelectedStories((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
      return newSelection;
    });
  };

  const handleUseNews = () => {
    if (!stories) return;

    if (selectedStories.size === 0) {
      setError("Please select at least one story");
      return;
    }

    const selectedNewsStories = Array.from(selectedStories).map(
      (index) => stories[index],
    );

    onNewsSelect(selectedNewsStories);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "ai" ? "AI News Assistant" : "Latest News"}
          </DialogTitle>
          <DialogDescription>
            {mode === "ai" 
              ? "Ask for specific news topics. For example: 'Find fintech news about AI investments' or 'Show me recent developments in renewable energy'"
              : "Browse the latest news from selected categories"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-6">
          {mode === "ai" && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder="Ask for specific news, e.g: 'Find fintech news about AI investments'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !query.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          )}
          
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {error && (
                <MotionError
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-red-500 text-sm mb-4"
                >
                  {error}
                </MotionError>
              )}

              {loading && (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}

              {stories && (
                <MotionResults
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Found Stories</h2>
                    <Badge variant="secondary">{stories.length} results</Badge>
                  </div>

                  <div className="space-y-6">
                    {stories.map((story, index) => (
                      <Card
                        key={index}
                        className="p-4 relative hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={selectedStories.has(index)}
                            onCheckedChange={() => handleStorySelection(index)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="text-lg font-semibold leading-tight">
                                {story.title}
                              </h3>
                              <div className="flex gap-2">
                                {story.location && (
                                  <Badge variant="outline" className="shrink-0">
                                    {story.location}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="shrink-0">
                                  {story.category}
                                </Badge>
                              </div>
                            </div>

                            <Separator />

                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {story.description}
                            </p>

                            <div className="flex items-center justify-between text-sm pt-2">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <span>{story.source}</span>
                                <span>•</span>
                                <span>
                                  {new Date(
                                    story.publishedAt,
                                  ).toLocaleDateString()}
                                </span>
                                {story.sourceType && (
                                  <>
                                    <span>•</span>
                                    <span>{story.sourceType}</span>
                                  </>
                                )}
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto"
                                onClick={() =>
                                  window.open(story.readMoreUrl, "_blank")
                                }
                              >
                                Read full article
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="sticky bottom-0 bg-background pt-4">
                    <Button
                      onClick={handleUseNews}
                      className="w-full"
                      disabled={selectedStories.size === 0}
                    >
                      Use selected stories ({selectedStories.size})
                    </Button>
                  </div>
                </MotionResults>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

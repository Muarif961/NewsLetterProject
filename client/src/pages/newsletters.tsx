import { useUser } from "../hooks/use-user";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DashboardLayout } from "../components/dashboard-layout";
import {
  PlusCircle,
  Clock,
  Send,
  Archive,
  Search,
  Trash2,
  Edit2,
  ArrowUpDown,
  Loader2,
} from "lucide-react";
import useSWR from "swr";
import { Newsletter } from "db/schema";
import { format } from "date-fns";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar } from "../components/ui/sidebar";

const ITEMS_PER_PAGE = 10;

export default function Newsletters() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const {
    data: newsletters,
    mutate,
    isLoading,
    error,
  } = useSWR<Newsletter[]>("/api/newsletters", {
    onError: (err) => {
      console.error("Failed to fetch newsletters:", err);
    },
    revalidateOnFocus: true,
    refreshInterval: 30000, // Refresh every 30 seconds
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"date" | "title">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  if (!user) {
    setLocation("/");
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "text-yellow-500 bg-yellow-500/10";
      case "scheduled":
        return "text-blue-500 bg-blue-500/10";
      case "sent":
        return "text-green-500 bg-green-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return Clock;
      case "scheduled":
        return Clock;
      case "sent":
        return Send;
      default:
        return Archive;
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/newsletters/${id}`, {
        method: "DELETE",
      });
      mutate();
    } catch (error) {
      console.error("Failed to delete newsletter:", error);
    }
  };

  const toggleSort = (type: "date" | "title") => {
    if (sortBy === type) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(type);
      setSortOrder("desc");
    }
  };

  const filteredNewsletters = newsletters
    ?.filter((newsletter) => {
      const matchesSearch = newsletter.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || newsletter.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return sortOrder === "asc"
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return sortOrder === "asc"
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
    });

  const totalPages = Math.ceil(
    (filteredNewsletters?.length || 0) / ITEMS_PER_PAGE,
  );
  const paginatedNewsletters = filteredNewsletters?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <DashboardLayout>
      <Sidebar/>
      <div className="space-y-8 w-full max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Newsletters</h1>
            <p className="text-muted-foreground">
              Manage and track your newsletters
            </p>
          </div>
          <Button onClick={() => setLocation("/editor")} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Newsletter
          </Button>
        </div>

        {/* Filters and Sort */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search newsletters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => toggleSort("date")}
            className={sortBy === "date" ? "bg-primary/10" : ""}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => toggleSort("title")}
            className={sortBy === "title" ? "bg-primary/10" : ""}
          >
            <span className="font-bold">A</span>
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-6 border-destructive">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-destructive">
                Error Loading Newsletters
              </h3>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Failed to load newsletters. Please try again."}
              </p>
              <Button
                variant="outline"
                onClick={() => mutate()}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-6 w-1/4" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                    <Skeleton className="h-9 w-[100px]" />
                  </div>
                  <div className="flex gap-2 items-center">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Newsletter Cards */}
        {!isLoading && (
          <div className="grid gap-4 max-w-[1200px]">
            {paginatedNewsletters?.map((newsletter) => {
              const StatusIcon = getStatusIcon(newsletter.status);
              return (
                <Card
                  key={newsletter.id}
                  className="group flex items-center justify-between p-6 transition-all hover:shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold">
                        {newsletter.title}
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                          newsletter.status,
                        )}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {newsletter.status.charAt(0).toUpperCase() +
                          newsletter.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created {format(new Date(newsletter.createdAt), "PPP")}
                    </p>
                    {newsletter.scheduledAt && (
                      <p className="text-sm text-muted-foreground">
                        Scheduled for{" "}
                        {format(new Date(newsletter.scheduledAt), "PPP 'at' p")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(newsletter.status === "failed" ||
                      newsletter.status === "scheduled") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          try {
                            const newsletterData = {
                              title: newsletter.title,
                              content: newsletter.content,
                              id: newsletter.id
                            };
                            // console.log("Newsletter data being passed:", newsletterData);
                            
                            const queryParams = new URLSearchParams();
                            const encodedData = encodeURIComponent(JSON.stringify(newsletterData));
                            queryParams.set('content', encodedData);
                            
                            // console.log("Encoded query params:", queryParams.toString());
                            const targetUrl = `/editor/content?${queryParams.toString()}`;
                            // console.log("Redirecting to:", targetUrl);
                            
                            setLocation(targetUrl);
                          } catch (error) {
                            console.error("Error preparing newsletter data:", error);
                            alert("Error opening editor. Please try again.");
                          }
                        }}
                        className="gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                    )}
                    {newsletter.status === "draft" ||
                      (newsletter.status == "failed" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the newsletter.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(newsletter.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ))}
                  </div>
                </Card>
              );
            })}

            {/* Empty State */}
            {(!filteredNewsletters || filteredNewsletters.length === 0) && (
              <Card className="flex flex-col items-center justify-center p-12 text-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Archive className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  No newsletters found
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first newsletter to get started"}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Button
                    onClick={() => setLocation("/editor")}
                    className="mt-6 gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Create Newsletter
                  </Button>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              {[...Array(totalPages)].map((_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
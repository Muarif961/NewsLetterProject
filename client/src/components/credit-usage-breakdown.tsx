import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart, LineChartProps } from "@tremor/react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import useFetch from "@/hooks/use-fetch";

// Define colors for different operation types
const categoryColors: Record<string, string> = {
  text_generation: "#3498db",
  text_enhancement: "#2980b9",
  image_generation: "#e74c3c",
  image_variation: "#c0392b",
  image_edit: "#9b59b6",
  purchase: "#2ecc71",
  refund: "#27ae60",
  subscription_renewal: "#f1c40f",
};

// Function to format category labels
const formatCategoryLabel = (category: string) => {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function CreditUsageBreakdown() {
  const api = useFetch();

  // Fetch credit usage analytics
  const { data, isLoading, error } = useQuery({
    queryKey: ["credit-analytics"],
    queryFn: async () => {
      const response = await api.get("/api/credits/analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch credit analytics");
      }
      return response.json();
    },
  });

  // Format usage by category data for chart
  const categoryData = React.useMemo(() => {
    if (!data || !data.usageByCategory) return [];

    return data.usageByCategory
      .filter((cat: any) => cat.totalUsed > 0)
      .map((category: any) => ({
        name: formatCategoryLabel(category.action),
        "Credits Used": category.totalUsed,
        Operations: category.count,
        color: categoryColors[category.action] || "#7f8c8d",
      }))
      .sort((a: any, b: any) => b["Credits Used"] - a["Credits Used"]);
  }, [data]);

  // Format usage over time data for chart
  const timeSeriesData = React.useMemo(() => {
    if (!data || !data.usageOverTime) return [];

    return data.usageOverTime.map((day: any) => ({
      date: format(new Date(day.date), "MMM d"),
      "Credits Used": day.totalUsed,
    }));
  }, [data]);

  // Skip rendering if loading or error
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Usage Analytics</CardTitle>
          <CardDescription>
            Analyze your credit usage patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Usage Analytics</CardTitle>
          <CardDescription>
            Analyze your credit usage patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          Could not load analytics data. Please try again later.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit Usage Analytics</CardTitle>
        <CardDescription>
          Analyze your credit usage patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Display total credits used */}
          <div className="text-center">
            <div className="text-3xl font-bold">
              {data.totalUsed.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Credits Used
            </div>
          </div>

          {/* Usage by category */}
          {categoryData.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-medium">Usage by Category</h3>
              <BarChart
                data={categoryData}
                index="name"
                categories={["Credits Used"]}
                colors={["indigo"]}
                showLegend={false}
                valueFormatter={(value) =>
                  typeof value === "number" ? `${value.toLocaleString()} credits` : ""
                }
                yAxisWidth={48}
                className="h-[250px]"
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              No category data available yet
            </div>
          )}

          {/* Usage over time */}
          {timeSeriesData.length > 1 ? (
            <div>
              <h3 className="mb-3 text-sm font-medium">Daily Usage (Last 30 days)</h3>
              <LineChart
                data={timeSeriesData}
                index="date"
                categories={["Credits Used"]}
                colors={["primary"]}
                showLegend={false}
                valueFormatter={(value) =>
                  typeof value === "number" ? `${value.toLocaleString()} credits` : ""
                }
                yAxisWidth={48}
                className="h-[250px]"
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              Not enough historical data available yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default CreditUsageBreakdown;
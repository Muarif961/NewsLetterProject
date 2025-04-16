import { useEffect } from "react";
import { useUser } from "../hooks/use-user";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { socket } from "@/lib/socket";
import { Card } from "@/components/ui/card";
import useSWR from "swr";
import { Newsletter } from "db/schema";
import { Sidebar } from "../components/ui/sidebar";
import {
  PlusCircle,
  Users,
  FileText,
  Layout,
  TrendingUp,
  Mail,
  Eye,
  MousePointer,
} from "lucide-react";
import { DashboardLayout } from "../components/dashboard-layout";
import { NotificationBell } from "../components/notifications/NotificationBell";
import { ThemeToggle } from "../components/theme-toggle";
import { formatDistanceToNow } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const getGrowthData = (subscribers: any[]) => {
  const months = new Map();
  const currentDate = new Date();

  // Get data for the last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - i,
      1,
    );
    const monthKey = date.toLocaleString("default", { month: "short" });
    months.set(monthKey, 0);
  }

  // Count subscribers by month
  subscribers.forEach((subscriber) => {
    const date = new Date(subscriber.createdAt);
    const monthKey = date.toLocaleString("default", { month: "short" });
    if (months.has(monthKey)) {
      months.set(monthKey, months.get(monthKey) + 1);
    }
  });

  return Array.from(months.entries()).map(([month, subscribers]) => ({
    month,
    subscribers,
  }));
};

const getRecentActivity = (newsletters: any[], subscribers: any[]) => {
  const activities = [
    ...newsletters.map((newsletter) => ({
      type: "newsletter",
      message:
        "Newsletter " + (newsletter.status === "sent" ? "sent" : "created"),
      detail: newsletter.title,
      time: formatDistanceToNow(new Date(newsletter.createdAt), {
        addSuffix: true,
      }),
      date: new Date(newsletter.createdAt),
    })),
    ...subscribers.map((subscriber) => ({
      type: "subscriber",
      message: "New subscriber joined",
      detail: subscriber.email,
      time: formatDistanceToNow(new Date(subscriber.createdAt), {
        addSuffix: true,
      }),
      date: new Date(subscriber.createdAt),
    })),
  ];

  // Sort by date descending and take latest 4
  return activities
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 4);
};

export default function Dashboard() {
  const { user, logout } = useUser();
  const [, setLocation] = useLocation();
  const { data: newsletters = [], mutate: mutateNewsletters } =
    useSWR<Newsletter[]>("/api/newsletters");
  const { data: subscribers = [], mutate: mutateSubscribers } =
    useSWR("/api/subscribers");
  const { data: templates = [], mutate: mutateTemplates } =
    useSWR("/api/templates");

  useEffect(() => {
    if (!user?.id) return;

    let isComponentMounted = true;
    let pingInterval: NodeJS.Timeout;

    const connectSocket = () => {
      if (!socket.connected && isComponentMounted) {
        socket.connect();
        
        pingInterval = setInterval(() => {
          if (socket.connected) {
            socket.emit('pong');
          }
        }, 30000);
      }
    };

    connectSocket();

    socket.on('connect_error', (error) => {
      console.warn('Socket connection error:', error);
      if (isComponentMounted) {
        setTimeout(connectSocket, 2000);
      }
    });

    return () => {
      isComponentMounted = false;
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      socket.removeAllListeners();
      socket.disconnect();
    };

    socket.on("connect", () => {
      console.log("Socket connected");
    });

    const handleNewsletterCreated = () => mutateNewsletters();
    const handleNewsletterUpdated = () => mutateNewsletters();
    const handleSubscriberCreated = () => mutateSubscribers();
    const handleTemplateCreated = () => mutateTemplates();
    const handleActivityUpdate = () => {
      mutateNewsletters();
      mutateSubscribers();
      mutateTemplates();
    };

    socket.on("newsletter:created", handleNewsletterCreated);
    socket.on("newsletter:updated", handleNewsletterUpdated);
    socket.on("subscriber:created", handleSubscriberCreated);
    socket.on("template:created", handleTemplateCreated);
    socket.on("activity:update", handleActivityUpdate);

    return () => {
      socket.off("newsletter:created", handleNewsletterCreated);
      socket.off("newsletter:updated", handleNewsletterUpdated);
      socket.off("subscriber:created", handleSubscriberCreated);
      socket.off("template:created", handleTemplateCreated);
      socket.off("activity:update", handleActivityUpdate);
      socket.disconnect();
    };
  }, [mutateNewsletters, mutateSubscribers, mutateTemplates]);

  if (!user) {
    setLocation("/");
    return null;
  }

  const getMonthlyStats = () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const currentNewsletters = newsletters.length;
    const lastMonthNewsletters = newsletters.filter(
      (n) => new Date(n.createdAt) < lastMonth,
    ).length;

    const currentSubscribers = subscribers.length;
    const lastMonthSubscribers = subscribers.filter(
      (s) => new Date(s.createdAt) < lastMonth,
    ).length;

    const currentTemplates = templates.length;
    const lastMonthTemplates = templates.filter(
      (t) => new Date(t.createdAt) < lastMonth,
    ).length;

    return {
      newsletters: {
        current: currentNewsletters,
        change: currentNewsletters - lastMonthNewsletters,
      },
      subscribers: {
        current: currentSubscribers,
        change: currentSubscribers - lastMonthSubscribers,
      },
      templates: {
        current: currentTemplates,
        change: currentTemplates - lastMonthTemplates,
      },
    };
  };

  const stats = getMonthlyStats();

  const statsCards = [
    {
      title: "Total Newsletters",
      value: stats.newsletters.current.toString(),
      change: `${stats.newsletters.change >= 0 ? "+" : ""}${stats.newsletters.change} from last month`,
      icon: FileText,
    },
    {
      title: "Subscribers",
      value: stats.subscribers.current.toString(),
      change: `${stats.subscribers.change >= 0 ? "+" : ""}${stats.subscribers.change} from last month`,
      icon: Users,
    },
    {
      title: "Templates",
      value: stats.templates.current.toString(),
      change: `${stats.templates.change >= 0 ? "+" : ""}${stats.templates.change} from last month`,
      icon: Layout,
    },
    {
      title: "Avg. Open Rate",
      value: "N/A",
      change: "Coming soon",
      icon: Eye,
    },
  ];

  return (
    <DashboardLayout>
      <Sidebar />
      <div className="space-y-8 px-8">
        {/* Trial Welcome Message - Shown only to users on trial */}
        {user?.subscription?.metadata?.trialEndsAt && (
          <div className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-semibold mb-2">
              Welcome to your free trial!
            </h2>
            <p className="text-muted-foreground mb-4">
              You're all set with your 14-day free trial. Explore all premium
              features and start creating amazing newsletters.
            </p>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setLocation("/editor")}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <PlusCircle className="h-4 w-4" />
                Create Your First Newsletter
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/subscribers")}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Import Subscribers
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end mb-6">
          <Button onClick={() => setLocation("/editor")} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Newsletter
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <h3 className="text-2xl font-bold">{stat.value}</h3>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-7">
          {/* Subscriber Growth Chart */}
          <Card className="col-span-5 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold">Subscriber Growth</h3>
              <p className="text-sm text-muted-foreground">
                Monthly subscriber growth over time
              </p>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getGrowthData(subscribers)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="subscribers"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="col-span-2 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <p className="text-sm text-muted-foreground">
                Latest updates and events
              </p>
            </div>
            <div className="space-y-6">
              {getRecentActivity(newsletters, subscribers).map(
                (activity, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      {activity.type === "subscriber" && (
                        <Users className="h-4 w-4 text-primary" />
                      )}
                      {activity.type === "newsletter" && (
                        <Mail className="h-4 w-4 text-primary" />
                      )}
                      {activity.type === "template" && (
                        <Layout className="h-4 w-4 text-primary" />
                      )}
                      {activity.type === "engagement" && (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.detail}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </Card>
        </div>

        {/* Recent Newsletters Table */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Recent Newsletters</h3>
            <p className="text-sm text-muted-foreground">
              Performance metrics for recently sent newsletters
            </p>
          </div>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">Newsletter</th>
                  <th className="px-6 py-3">Sent Date</th>
                  <th className="px-6 py-3">Open Rate</th>
                  <th className="px-6 py-3">Clicks</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {newsletters.slice(0, 5).map((newsletter, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 font-medium">
                      {newsletter.title}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(newsletter.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">N/A</td>
                    <td className="px-6 py-4">N/A</td>
                    <td className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/editor/${newsletter.id}`)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
                {newsletters.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-center text-muted-foreground"
                    >
                      No newsletters yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

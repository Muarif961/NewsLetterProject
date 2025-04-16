import { useUser } from "../hooks/use-user";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "../components/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PlusCircle,
  Upload,
  Mail,
  X,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import { useToast } from "@/hooks/use-toast";
import type { Subscriber } from "db/schema";
import { format } from "date-fns";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sidebar } from "../components/ui/sidebar";
import { CSVImport } from "../components/subscribers/csv-import";
import { SubscriberGroups } from "../components/subscribers/subscriber-groups";

const subscriberFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
});

type SubscriberFormValues = z.infer<typeof subscriberFormSchema>;

export default function Subscribers() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSubscribers, setSelectedSubscribers] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const {
    data: subscribers,
    error,
    mutate,
  } = useSWR<Subscriber[]>("/api/subscribers", {
    revalidateOnFocus: false,
  });

  const form = useForm<SubscriberFormValues>({
    resolver: zodResolver(subscriberFormSchema),
    defaultValues: {
      email: "",
      name: "",
    },
  });

  const columns: ColumnDef<Subscriber>[] = [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          {row.original.email}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            row.original.active
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500"
          }`}
        >
          {row.original.active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => format(new Date(row.original.createdAt), "PP"),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => removeSubscriber(row.original.id)}
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const addSubscriber = async (values: SubscriberFormValues) => {
    try {
      const response = await fetch("/api/subscribers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      await mutate();
      setShowAddDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Subscriber added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeSubscriber = async (id: number) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/subscribers/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove subscriber");
      }

      toast({
        title: "Success",
        description: "Subscriber removed successfully",
      });

      await mutate();
    } catch (error: any) {
      console.error("Error removing subscriber:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove subscriber",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <Sidebar />
      <div className="p-4 space-y-8 w-full overflow-x-hidden">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Subscribers</h1>
            <p className="text-muted-foreground">
              Manage your newsletter subscribers
            </p>
          </div>
        </div>

        <Tabs defaultValue="list" className="space-y-4 w-full">
          <TabsList>
            <TabsTrigger value="list">Subscriber List</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <div className="flex items-center justify-end gap-2 mb-4">
              {selectedSubscribers.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedSubscribers.length})
                </Button>
              )}
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Add Subscriber
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-2xl overflow-y-auto max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>Add Subscriber</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={form.handleSubmit(addSubscriber)} className="space-y-4">
                    <Tabs defaultValue="single">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="single">
                          Single Subscriber
                        </TabsTrigger>
                        <TabsTrigger value="csv">CSV Import</TabsTrigger>
                      </TabsList>
                      <TabsContent value="single" className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="subscriber@example.com"
                            {...form.register("email")}
                          />
                          {form.formState.errors.email && (
                            <p className="text-sm text-destructive">
                              {form.formState.errors.email.message}
                            </p>
                          )}
                          <Label htmlFor="name">Name (Optional)</Label>
                          <Input
                            id="name"
                            type="text"
                            placeholder="John Doe"
                            {...form.register("name")}
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit">Add Subscriber</Button>
                        </DialogFooter>
                      </TabsContent>
                      <TabsContent value="csv" className="space-y-4">
                        <CSVImport onComplete={() => {
                          setShowAddDialog(false);
                          mutate();
                        }} />
                      </TabsContent>
                    </Tabs>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
              <DataTable
                columns={columns}
                data={subscribers || []}
                searchColumn="email"
              />
          </TabsContent>

          <TabsContent value="groups">
            <SubscriberGroups />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
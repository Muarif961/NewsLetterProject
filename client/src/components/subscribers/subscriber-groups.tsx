import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Users, PlusCircle, Trash2, UserPlus } from "lucide-react";
import useSWR from "swr";
import { format } from "date-fns";

interface Subscriber {
  id: number;
  email: string;
  name: string | null;
  active: boolean;
  createdAt: string;
}

interface SubscriberGroup {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export function SubscriberGroups() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SubscriberGroup | null>(null);
  const { toast } = useToast();

  const {
    data: groups = [],
    error,
    mutate: mutateGroups,
  } = useSWR<SubscriberGroup[]>("/api/groups");

  const {
    data: subscribers = [],
    mutate: mutateSubscribers,
  } = useSWR<Subscriber[]>("/api/subscribers");

  const {
    data: groupMembers = [],
    mutate: mutateMembers,
  } = useSWR<Subscriber[]>(
    selectedGroup ? `/api/groups/${selectedGroup.id}/members` : null
  );

  const [formData, setFormData] = useState({
    name: "",
  });

  const columns: ColumnDef<SubscriberGroup>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          {row.original.name}
        </div>
      ),
    },
    {
      accessorKey: "memberCount",
      header: "Members",
      cell: ({ row }) => {
        const count = groupMembers?.length || 0;
        return (
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => {
              setSelectedGroup(row.original);
              setShowMembersDialog(true);
            }}
          >
            <Users className="h-4 w-4" />
            {count} members
          </Button>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
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
              onClick={() => {
                setSelectedGroup(row.original);
                setShowMembersDialog(true);
              }}
            >
              Manage Members
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedGroup(row.original);
                setFormData({
                  name: row.original.name,
                });
                setShowAddDialog(true);
              }}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setSelectedGroup(row.original);
                setShowDeleteDialog(true);
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const subscriberColumns: ColumnDef<Subscriber>[] = [
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const isInGroup = groupMembers?.some(
          (member) => member.id === row.original.id
        );
        return (
          <Button
            variant={isInGroup ? "destructive" : "secondary"}
            size="sm"
            onClick={() => handleMembershipToggle(row.original)}
          >
            {isInGroup ? "Remove" : "Add"}
          </Button>
        );
      },
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = selectedGroup
        ? `/api/groups/${selectedGroup.id}`
        : "/api/groups";
      const method = selectedGroup ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save group");
      }

      await mutateGroups();
      setShowAddDialog(false);
      setFormData({ name: "" });
      setSelectedGroup(null);

      toast({
        title: "Success",
        description: `Group ${selectedGroup ? "updated" : "created"} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete group");
      }

      await mutateGroups();
      setShowDeleteDialog(false);
      setSelectedGroup(null);

      toast({
        title: "Success",
        description: "Group deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMembershipToggle = async (subscriber: Subscriber) => {
    if (!selectedGroup) return;

    const isInGroup = groupMembers?.some((member) => member.id === subscriber.id);
    const endpoint = `/api/groups/${selectedGroup.id}/members`;
    const method = isInGroup ? "DELETE" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriberIds: [subscriber.id],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isInGroup ? "remove from" : "add to"} group`);
      }

      await mutateMembers();

      toast({
        title: "Success",
        description: `Subscriber ${isInGroup ? "removed from" : "added to"} group successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Subscriber Groups</h2>
          <p className="text-muted-foreground">
            Organize your subscribers into groups for targeted content
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedGroup ? "Edit Group" : "Create Group"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter group name"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit">
                  {selectedGroup ? "Update Group" : "Create Group"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete the group "{selectedGroup?.name}"? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="w-full max-w-3xl overflow-y-auto max-h-[90vh] p-6">
          <DialogHeader>
            <DialogTitle>Manage Group Members - {selectedGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <DataTable
              columns={subscriberColumns}
              data={subscribers}
              searchColumn="email"
            />
          </div>
        </DialogContent>
      </Dialog>

      <DataTable columns={columns} data={groups} searchColumn="name" />
    </div>
  );
}
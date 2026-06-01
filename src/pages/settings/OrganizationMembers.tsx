import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Search, MoreHorizontal, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Member {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "owner" | "admin" | "member";
}

interface Invitation {
  id: string;
  email: string;
  role: "admin" | "member";
  sentAt: string;
  status: "pending" | "revoked";
}

export default function OrganizationMembers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const [members] = useState<Member[]>([
    { id: "1", name: "João Silva", email: "joao@eppartners.com", role: "owner" },
    { id: "2", name: "Maria Santos", email: "maria@eppartners.com", role: "admin" },
    { id: "3", name: "Pedro Costa", email: "pedro@eppartners.com", role: "member" },
  ]);

  const [invitations] = useState<Invitation[]>([
    { id: "1", email: "novo@empresa.com", role: "member", sentAt: "2024-01-15", status: "pending" },
  ]);

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingInvitations = invitations.filter((inv) => inv.status === "pending");
  const revokedInvitations = invitations.filter((inv) => inv.status === "revoked");

  const handleInvite = () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail("");
    setInviteRole("member");
    setIsInviteDialogOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* Team Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Team</h2>
            <p className="text-sm text-muted-foreground">
              Manage and invite your colleagues.
            </p>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invite member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite member</DialogTitle>
                <DialogDescription>
                  Enter the email address and role of the person you want to invite.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite}>Invite</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{member.name}</p>
                    {member.role === "owner" && (
                      <Badge variant="default" className="text-xs">
                        Owner
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize">
                  {member.role}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Change role</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Remove from team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Invitations Section */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Invitations</h2>
          <p className="text-sm text-muted-foreground">
            Manage invitations of users who haven't accepted yet.
          </p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              Pending ({pendingInvitations.length})
            </TabsTrigger>
            <TabsTrigger value="revoked">
              Revoked ({revokedInvitations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingInvitations.length > 0 ? (
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-sm font-medium">{invitation.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Sent on {new Date(invitation.sentAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {invitation.role}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        Revoke
                      </Button>
                      <Button variant="outline" size="sm">
                        Resend
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No pending invitation found.
              </div>
            )}
          </TabsContent>

          <TabsContent value="revoked">
            {revokedInvitations.length > 0 ? (
              <div className="space-y-2">
                {revokedInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border opacity-60"
                  >
                    <div>
                      <p className="text-sm font-medium">{invitation.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Sent on {new Date(invitation.sentAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {invitation.role}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No revoked invitation found.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

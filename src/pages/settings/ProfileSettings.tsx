import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Upload, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfileSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    firstName: user?.user_metadata?.first_name || "",
    lastName: user?.user_metadata?.last_name || "",
    email: user?.email || "",
    phone: "",
  });

  const handleSave = () => {
    toast.success("Profile updated successfully");
  };

  const getInitials = () => {
    const first = profile.firstName?.[0] || "";
    const last = profile.lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Avatar */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Profile photo</h2>
          <p className="text-sm text-muted-foreground">
            Upload a photo to personalize your profile.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="space-x-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            <Button variant="ghost" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* Personal Information */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Personal information</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                placeholder="Doe"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Contact support to change your email address.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+55 11 99999-9999"
            />
          </div>
        </div>

        <Button onClick={handleSave} className="mt-4">
          Save changes
        </Button>
      </section>
    </div>
  );
}

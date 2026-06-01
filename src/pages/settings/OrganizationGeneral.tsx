import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, Trash2, Plus, Copy, AlertTriangle } from "lucide-react";
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

interface BusinessHour {
  day: string;
  enabled: boolean;
  periods: { start: string; end: string }[];
}

export default function OrganizationGeneral() {
  const [slug, setSlug] = useState("ep-partners");
  const [details, setDetails] = useState({
    name: "EP Partners",
    address: "",
    phone: "",
    email: "",
    website: "",
  });
  const [socials, setSocials] = useState({
    linkedin: "",
    instagram: "",
    youtube: "",
  });
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([
    { day: "Mon", enabled: true, periods: [{ start: "08:00", end: "18:00" }] },
    { day: "Tue", enabled: true, periods: [{ start: "08:00", end: "18:00" }] },
    { day: "Wed", enabled: true, periods: [{ start: "08:00", end: "18:00" }] },
    { day: "Thu", enabled: true, periods: [{ start: "08:00", end: "18:00" }] },
    { day: "Fri", enabled: true, periods: [{ start: "08:00", end: "18:00" }] },
    { day: "Sat", enabled: false, periods: [{ start: "09:00", end: "13:00" }] },
    { day: "Sun", enabled: false, periods: [] },
  ]);

  const handleSave = (section: string) => {
    toast.success(`${section} saved successfully`);
  };

  const toggleDay = (index: number) => {
    setBusinessHours(hours =>
      hours.map((hour, i) =>
        i === index ? { ...hour, enabled: !hour.enabled } : hour
      )
    );
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Logo */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Logo</h2>
          <p className="text-sm text-muted-foreground">
            Upload your organization's logo (png, jpeg up to 5MB).
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-lg bg-muted border-2 border-dashed border-border flex items-center justify-center">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-x-2">
            <Button variant="outline" size="sm">
              Upload
            </Button>
            <Button variant="ghost" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* URL Slug */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">URL</h2>
          <p className="text-sm text-muted-foreground">
            Your organization's unique URL identifier.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="your-organization"
          />
          <p className="text-xs text-muted-foreground">
            Preview: https://gentia.tech/careers/{slug}
          </p>

        </div>

        <Button onClick={() => handleSave("URL")} className="mt-4">
          Save
        </Button>
      </section>

      <Separator />

      {/* Details */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Details</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={details.name}
              onChange={(e) => setDetails({ ...details, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={details.address}
              onChange={(e) => setDetails({ ...details, address: e.target.value })}
              placeholder="123 Main St, City, Country"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={details.phone}
                onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                placeholder="+55 11 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={details.email}
                onChange={(e) => setDetails({ ...details, email: e.target.value })}
                placeholder="contact@company.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={details.website}
              onChange={(e) => setDetails({ ...details, website: e.target.value })}
              placeholder="https://company.com"
            />
          </div>
        </div>

        <Button onClick={() => handleSave("Details")} className="mt-4">
          Save
        </Button>
      </section>

      <Separator />

      {/* Business Hours */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Business hours</h2>
        </div>

        <div className="space-y-2">
          {businessHours.map((hour, index) => (
            <div key={hour.day} className="flex items-center gap-4">
              <Checkbox
                id={`day-${hour.day}`}
                checked={hour.enabled}
                onCheckedChange={() => toggleDay(index)}
              />
              <Label htmlFor={`day-${hour.day}`} className="w-12 text-sm">
                {hour.day}
              </Label>
              {hour.enabled && hour.periods.length > 0 ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={hour.periods[0].start}
                    className="w-32"
                    onChange={() => {}}
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="time"
                    value={hour.periods[0].end}
                    className="w-32"
                    onChange={() => {}}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Closed</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Social Media */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Social media</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={socials.linkedin}
              onChange={(e) => setSocials({ ...socials, linkedin: e.target.value })}
              placeholder="https://linkedin.com/company/..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={socials.instagram}
              onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
              placeholder="https://instagram.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube">YouTube</Label>
            <Input
              id="youtube"
              value={socials.youtube}
              onChange={(e) => setSocials({ ...socials, youtube: e.target.value })}
              placeholder="https://youtube.com/..."
            />
          </div>
        </div>

        <Button onClick={() => handleSave("Social media")} className="mt-4">
          Save
        </Button>
      </section>

      <Separator />

      {/* Danger Zone */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
        </div>

        <Card className="border-destructive/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  Deleting your organization is irreversible. All the data will be permanently removed from our servers.
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-4">
                  Delete organization
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your organization and remove all associated data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

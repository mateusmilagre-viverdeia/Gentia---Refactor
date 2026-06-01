import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function NotificationSettings() {
  const [transactionalPrefs, setTransactionalPrefs] = useState<NotificationPreference[]>([
    { id: "candidates", label: "Candidates", description: "Someone on your team added or changed a lead.", enabled: true },
    { id: "inbox", label: "Inbox", description: "Message is assigned to me or I got mentioned.", enabled: true },
    { id: "weekly_summary", label: "Weekly summary", description: "Summary of all relevant activities in the past week.", enabled: false },
    { id: "security", label: "Security emails", description: "Changes that do not require an email confirmation.", enabled: true },
  ]);

  const [marketingPrefs, setMarketingPrefs] = useState<NotificationPreference[]>([
    { id: "newsletter", label: "Newsletter", description: "Receive emails filled with industry expertise.", enabled: false },
    { id: "product_updates", label: "Product updates", description: "Receive emails with all new features and updates.", enabled: true },
  ]);

  const handleToggle = (
    prefs: NotificationPreference[],
    setPrefs: React.Dispatch<React.SetStateAction<NotificationPreference[]>>,
    id: string
  ) => {
    setPrefs(prefs.map(pref => 
      pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
    ));
  };

  const handleSave = (section: string) => {
    toast.success(`${section} preferences saved successfully`);
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Transactional Emails */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Transactional emails</h2>
          <p className="text-sm text-muted-foreground">
            Receive emails about team and account activities.
          </p>
        </div>
        
        <div className="space-y-4">
          {transactionalPrefs.map((pref) => (
            <div key={pref.id} className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor={pref.id} className="text-sm font-medium">
                  {pref.label}
                </Label>
                <p className="text-sm text-muted-foreground">{pref.description}</p>
              </div>
              <Switch
                id={pref.id}
                checked={pref.enabled}
                onCheckedChange={() => handleToggle(transactionalPrefs, setTransactionalPrefs, pref.id)}
              />
            </div>
          ))}
        </div>
        
        <Button 
          onClick={() => handleSave("Transactional")} 
          className="mt-4"
        >
          Save
        </Button>
      </section>

      <Separator />

      {/* Marketing Emails */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Marketing emails</h2>
          <p className="text-sm text-muted-foreground">
            Receive emails about new products, features, and more.
          </p>
        </div>
        
        <div className="space-y-4">
          {marketingPrefs.map((pref) => (
            <div key={pref.id} className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor={pref.id} className="text-sm font-medium">
                  {pref.label}
                </Label>
                <p className="text-sm text-muted-foreground">{pref.description}</p>
              </div>
              <Switch
                id={pref.id}
                checked={pref.enabled}
                onCheckedChange={() => handleToggle(marketingPrefs, setMarketingPrefs, pref.id)}
              />
            </div>
          ))}
        </div>
        
        <Button 
          onClick={() => handleSave("Marketing")} 
          className="mt-4"
        >
          Save
        </Button>
      </section>
    </div>
  );
}

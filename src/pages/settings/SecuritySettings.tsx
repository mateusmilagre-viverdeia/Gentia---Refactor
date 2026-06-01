import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Chrome, Building2, Smartphone, Monitor, Laptop } from "lucide-react";

interface ConnectedAccount {
  id: string;
  provider: string;
  icon: React.ComponentType<{ className?: string }>;
  connected: boolean;
}

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

export default function SecuritySettings() {
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([
    { id: "google", provider: "Google", icon: Chrome, connected: true },
    { id: "microsoft", provider: "Microsoft", icon: Building2, connected: false },
  ]);

  const [mfaEnabled, setMfaEnabled] = useState(false);

  const [sessions] = useState<Session[]>([
    { id: "1", device: "Chrome on macOS", location: "São Paulo, Brazil", lastActive: "Now", current: true, icon: Laptop },
    { id: "2", device: "Safari on iPhone", location: "São Paulo, Brazil", lastActive: "2 hours ago", current: false, icon: Smartphone },
    { id: "3", device: "Firefox on Windows", location: "Rio de Janeiro, Brazil", lastActive: "1 day ago", current: false, icon: Monitor },
  ]);

  const handleAccountAction = (accountId: string) => {
    setConnectedAccounts(accounts =>
      accounts.map(acc =>
        acc.id === accountId ? { ...acc, connected: !acc.connected } : acc
      )
    );
    toast.success("Account settings updated");
  };

  const handleEnableMFA = () => {
    setMfaEnabled(true);
    toast.success("MFA enabled successfully");
  };

  const handleSignOut = (sessionId: string) => {
    toast.success("Session signed out successfully");
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Connected Accounts */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Connected accounts</h2>
          <p className="text-sm text-muted-foreground">
            Sign up faster to your account by linking it to Google or Microsoft.
          </p>
        </div>

        <div className="space-y-3">
          {connectedAccounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <account.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{account.provider}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.connected ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={account.connected ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleAccountAction(account.id)}
                >
                  {account.connected ? "Disconnect" : "Connect"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Regardless of connected accounts, you will always have a password login as well.
        </p>
      </section>

      <Separator />

      {/* Multi-factor Authentication */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Multi-factor authentication</h2>
          <p className="text-sm text-muted-foreground">
            Add an extra layer of security to your login by requiring an additional factor.
          </p>
        </div>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Authenticator app</p>
                <p className="text-xs text-muted-foreground">
                  {mfaEnabled ? "Enabled" : "Not enabled"}
                </p>
              </div>
            </div>
            <Button
              variant={mfaEnabled ? "outline" : "default"}
              size="sm"
              onClick={handleEnableMFA}
              disabled={mfaEnabled}
            >
              {mfaEnabled ? "Disable" : "Enable"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Manage Sessions */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Manage sessions</h2>
          <p className="text-sm text-muted-foreground">
            Sign out your active sessions on other browsers and devices.
          </p>
        </div>

        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <session.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{session.device}</p>
                      {session.current && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.location} · {session.lastActive}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSignOut(session.id)}
                  >
                    Sign out
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

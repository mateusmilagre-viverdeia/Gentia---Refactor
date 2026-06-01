import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useEPRole } from "@/hooks/useEPRole";
import { useConsultantAssignments } from "@/hooks/useConsultantAssignments";
import { supabase } from "@/integrations/supabase/client";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Building2, Search, Users, ChevronDown } from "lucide-react";

interface ClientOrganization {
  id: string;
  name: string;
  sector: string | null;
  consultantName: string | null;
}

export function EPOrganizationSwitcher() {
  const navigate = useNavigate();
  const { isEPTeam, isSuperAdmin, isHeadCS, isEPConsultant, loading: roleLoading } = useEPRole();
  const {
    setEPOrganization,
    setConsultantProject,
    isEPOverride,
    isConsultantMode,
    epOverrideOrg,
    currentOrganization,
  } = useOrganization();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<ClientOrganization[]>([]);
  const [loading, setLoading] = useState(false);

  // Only show for EP team members who can view all clients
  const canViewAllClients = isSuperAdmin || isHeadCS;
  const canViewAssignedClients = isEPConsultant;

  const { assignments, isLoading: consultantLoading } = useConsultantAssignments();

  const assignedClients = useMemo<ClientOrganization[]>(() => {
    return (assignments || [])
      .filter((a) => a.account)
      .map((a) => ({
        id: a.account!.id,
        name: a.account!.name,
        sector: null,
        consultantName: null,
      }));
  }, [assignments]);

  useEffect(() => {
    if (!open || !canViewAllClients) return;

    async function loadClients() {
      setLoading(true);
      try {
        // Fetch all companies with their assigned consultants
        const { data: companies, error } = await supabase
          .from("companies")
          .select(`
            id,
            name,
            sector,
            consultant_assignments (
              consultant:consultant_id (
                name
              )
            )
          `)
          .order("name");

        if (error) throw error;

        const clientList: ClientOrganization[] = (companies || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          sector: c.sector,
          consultantName: c.consultant_assignments?.[0]?.consultant?.name || null,
        }));

        setClients(clientList);
      } catch (error) {
        console.error("Error loading clients:", error);
      } finally {
        setLoading(false);
      }
    }

    loadClients();
  }, [open, canViewAllClients]);

  const showSwitcher = isEPTeam && (canViewAllClients || canViewAssignedClients);
  if (roleLoading || !showSwitcher) {
    return null;
  }

  const isOverrideActive = isEPOverride || isConsultantMode;
  const activeOverrideOrg = isEPOverride
    ? epOverrideOrg
    : isConsultantMode
      ? currentOrganization
      : null;

  const effectiveClients = canViewAllClients ? clients : assignedClients;
  const effectiveLoading = canViewAllClients ? loading : consultantLoading;

  const filteredClients = effectiveClients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectClient = async (clientId: string) => {
    if (canViewAllClients) {
      await setEPOrganization(clientId);
    } else {
      await setConsultantProject(clientId);
    }
    setOpen(false);
    setSearch("");
    navigate("/");
  };

  if (isCollapsed) {
    return (
      <div className="px-2 py-2 border-b border-border">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={isOverrideActive ? "default" : "outline"}
              size="icon"
              className={`w-full h-10 ${isOverrideActive ? "bg-violet-600 hover:bg-violet-700" : ""}`}
            >
              <Users className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start" side="right">
            <ClientList
              search={search}
              setSearch={setSearch}
              loading={effectiveLoading}
              clients={filteredClients}
              onSelect={handleSelectClient}
              currentOrgId={activeOverrideOrg?.id}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-b border-border">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isOverrideActive ? "default" : "outline"}
            className={`w-full justify-between h-auto py-2 ${
              isOverrideActive ? "bg-violet-600 hover:bg-violet-700 text-white" : ""
            }`}
          >
            <div className="flex items-center gap-2 text-left">
              <Users className="h-4 w-4 shrink-0" />
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium opacity-70">
                  {isOverrideActive ? "Modo Consultoria" : "Acessar Cliente"}
                </span>
                {isOverrideActive && activeOverrideOrg && (
                  <span className="text-sm font-semibold truncate max-w-[140px]">
                    {activeOverrideOrg.name}
                  </span>
                )}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <ClientList
            search={search}
            setSearch={setSearch}
            loading={effectiveLoading}
            clients={filteredClients}
            onSelect={handleSelectClient}
            currentOrgId={activeOverrideOrg?.id}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface ClientListProps {
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  clients: ClientOrganization[];
  onSelect: (id: string) => void;
  currentOrgId?: string;
}

function ClientList({
  search,
  setSearch,
  loading,
  clients,
  onSelect,
  currentOrgId,
}: ClientListProps) {
  return (
    <div className="flex flex-col">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <ScrollArea className="h-[300px]">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : clients.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhuma empresa encontrada
          </div>
        ) : (
          <div className="p-2">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => onSelect(client.id)}
                className={`w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors ${
                  currentOrgId === client.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {client.sector && <span>{client.sector}</span>}
                      {client.consultantName && (
                        <>
                          {client.sector && <span>•</span>}
                          <span>Consultor: {client.consultantName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

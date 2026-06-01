import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bold, Italic, Underline, List, ListOrdered, Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Job {
  id: string;
  title: string;
  status: "draft" | "active" | "paused" | "closed";
  description: string;
  department: string;
  location: string;
  employmentType: string;
  budgetMin?: number;
  budgetMax?: number;
  agentId?: string;
  agentName?: string;
}

interface JobConfigurationTabProps {
  job: Job;
}

const mockAgents = [
  { id: "agent-1", name: "Cultura EP", description: "Agente de cultura organizacional" },
  { id: "agent-2", name: "Tech Recruiter", description: "Especializado em vagas técnicas" },
  { id: "agent-3", name: "Sales Hunter", description: "Focado em vendas e comercial" },
];

const departments = [
  "Vendas",
  "Marketing",
  "Engenharia",
  "Design",
  "RH",
  "Financeiro",
  "Operações",
  "Produto",
];

const locations = [
  "Remoto",
  "São Paulo, SP",
  "Rio de Janeiro, RJ",
  "Belo Horizonte, MG",
  "Curitiba, PR",
  "Porto Alegre, RS",
];

const employmentTypes = [
  "Integral",
  "Meio Período",
  "Contrato",
  "Estágio",
  "Freelancer",
];

const budgetRanges = [
  { value: "0-3000", label: "R$ 0 - R$ 3.000" },
  { value: "3000-6000", label: "R$ 3.000 - R$ 6.000" },
  { value: "6000-10000", label: "R$ 6.000 - R$ 10.000" },
  { value: "10000-15000", label: "R$ 10.000 - R$ 15.000" },
  { value: "15000-25000", label: "R$ 15.000 - R$ 25.000" },
  { value: "25000+", label: "R$ 25.000+" },
];

export function JobConfigurationTab({ job }: JobConfigurationTabProps) {
  const [title, setTitle] = useState(job.title);
  const [status, setStatus] = useState(job.status);
  const [description, setDescription] = useState(job.description);
  const [selectedAgent, setSelectedAgent] = useState(job.agentId || "");
  const [department, setDepartment] = useState(job.department);
  const [location, setLocation] = useState(job.location);
  const [employmentType, setEmploymentType] = useState(job.employmentType);
  const [budgetRange, setBudgetRange] = useState("");
  const [agentOpen, setAgentOpen] = useState(false);

  const selectedAgentData = mockAgents.find(a => a.id === selectedAgent);

  return (
    <div className="space-y-8">
      {/* General Details */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Detalhes Gerais</h3>
          <p className="text-sm text-muted-foreground">
            Comece com o básico que define esta posição
          </p>
        </div>

        <div className="space-y-4">
          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título da vaga *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Desenvolvedor Frontend Sênior"
            />
            <p className="text-xs text-muted-foreground">
              Use um título claro que os candidatos reconheçam facilmente
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="closed">Fechado</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Controle se esta vaga está visível para candidatos
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Underline className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <List className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva a vaga, responsabilidades e requisitos..."
                className="border-0 rounded-none min-h-[150px] focus-visible:ring-0"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Conte aos candidatos o que torna esta função empolgante e o que eles farão
            </p>
          </div>
        </div>
      </section>

      {/* Agent */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Agente</h3>
          <p className="text-sm text-muted-foreground">
            Escolha um agente para ajudar a triagem de candidatos e responder perguntas
          </p>
        </div>

        <div className="space-y-2">
          <Label>Agente</Label>
          <Popover open={agentOpen} onOpenChange={setAgentOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={agentOpen}
                className="w-full justify-between"
              >
                {selectedAgentData ? selectedAgentData.name : "Selecionar agente..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder="Buscar agentes..." />
                <CommandList>
                  <CommandEmpty>Nenhum agente encontrado.</CommandEmpty>
                  <CommandGroup>
                    {mockAgents.map((agent) => (
                      <CommandItem
                        key={agent.id}
                        value={agent.id}
                        onSelect={() => {
                          setSelectedAgent(agent.id);
                          setAgentOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedAgent === agent.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">{agent.description}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem className="text-primary">
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Novo Agente
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            Selecione o agente responsável por esta vaga
          </p>
        </div>
      </section>

      {/* Location & Department */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Localização e Departamento</h3>
          <p className="text-sm text-muted-foreground">
            Ajude candidatos a entender onde trabalharão e qual time vão integrar
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Department */}
          <div className="space-y-2">
            <Label>Departamento</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o departamento" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selecione o departamento ao qual esta posição pertence
            </p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Localização</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a localização" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Escolha a localização de trabalho ou selecione opção remota
            </p>
          </div>
        </div>
      </section>

      {/* Compensation & Type */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Remuneração e Tipo</h3>
          <p className="text-sm text-muted-foreground">
            Defina o tipo de emprego e faixa de orçamento para esta posição
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Employment Type */}
          <div className="space-y-2">
            <Label>Tipo de contrato</Label>
            <Select value={employmentType} onValueChange={setEmploymentType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {employmentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Especifique o tipo de emprego (integral, meio período, contrato, etc.)
            </p>
          </div>

          {/* Budget Range */}
          <div className="space-y-2">
            <Label>Faixa salarial</Label>
            <Select value={budgetRange} onValueChange={setBudgetRange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a faixa" />
              </SelectTrigger>
              <SelectContent>
                {budgetRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Defina o salário ou faixa de orçamento para esta posição
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

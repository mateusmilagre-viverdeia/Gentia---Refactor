import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEvent } from "@/contexts/EventContext";
import { EventFormat } from "@/types/event.types";
import { Monitor, Users, Layers } from "lucide-react";
import logoGentia from "@/assets/logo-gentia.png";

const formatOptions: { format: EventFormat; title: string; description: string; icon: React.ReactNode }[] = [
  {
    format: 'presencial',
    title: 'Presencial',
    description: 'Evento realizado em local físico com todos os participantes reunidos',
    icon: <Users className="h-8 w-8" />
  },
  {
    format: 'online',
    title: 'Online',
    description: 'Evento realizado de forma 100% virtual através de plataformas digitais',
    icon: <Monitor className="h-8 w-8" />
  },
  {
    format: 'hibrido',
    title: 'Híbrido',
    description: 'Combinação de presencial e online para alcançar todos os colaboradores',
    icon: <Layers className="h-8 w-8" />
  }
];

export function EventFormatSelector() {
  const { setEventFormat } = useEvent();

  const handleSelect = async (format: EventFormat) => {
    await setEventFormat(format);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex justify-center">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto" />
      </div>

      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">🤖</span>
            <CardTitle>Olá! Vamos planejar seu Evento de Cultura!</CardTitle>
          </div>
          <CardDescription className="text-base">
            Primeiro, me diga: o evento será presencial, online ou híbrido?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formatOptions.map((option) => (
              <Button
                key={option.format}
                variant="outline"
                className="h-auto flex flex-col items-center gap-3 p-6 hover:bg-muted/50 transition-colors whitespace-normal overflow-hidden"
                onClick={() => handleSelect(option.format)}
              >
                {option.icon}
                <span className="font-semibold text-lg">{option.title}</span>
                <span className="text-sm text-muted-foreground text-center break-words">
                  {option.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

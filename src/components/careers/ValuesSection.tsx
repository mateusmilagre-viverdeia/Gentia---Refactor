import { useState } from "react";
import { CultureValue } from "@/hooks/useCultureCodeValues";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { ChevronRight, Check, X, Sparkles } from "lucide-react";

interface ValuesSectionProps {
  values: CultureValue[];
  primaryColor?: string;
  className?: string;
}

export function ValuesSection({ values, primaryColor = "#000000", className = "" }: ValuesSectionProps) {
  const [selectedValue, setSelectedValue] = useState<CultureValue | null>(null);

  if (values.length === 0) return null;

  return (
    <section className={`py-12 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="h-5 w-5" style={{ color: primaryColor }} />
            <h2 className="text-2xl font-bold">Nossos Valores</h2>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Os princípios que guiam nossas decisões e comportamentos
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {values.map((value) => (
            <Card 
              key={value.id}
              className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20"
              onClick={() => setSelectedValue(value)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 
                      className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors"
                      style={{ color: primaryColor }}
                    >
                      {value.title}
                    </h3>
                    {value.mantra && (
                      <p className="text-sm text-muted-foreground italic line-clamp-2">
                        "{value.mantra}"
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
                
                {value.dos.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Como vivemos:</p>
                    <p className="text-sm line-clamp-2">
                      {value.dos.slice(0, 2).join(" • ")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Value Detail Modal */}
      <Dialog open={!!selectedValue} onOpenChange={() => setSelectedValue(null)}>
        <DialogContent className="max-w-lg">
          {selectedValue && (
            <>
              <DialogHeader>
                <DialogTitle 
                  className="text-2xl"
                  style={{ color: primaryColor }}
                >
                  {selectedValue.title}
                </DialogTitle>
                {selectedValue.mantra && (
                  <DialogDescription className="text-base italic">
                    "{selectedValue.mantra}"
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {selectedValue.dos.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 dark:text-green-400 flex items-center gap-2 mb-3">
                      <Check className="h-4 w-4" />
                      Como Vivemos
                    </h4>
                    <ul className="space-y-2">
                      {selectedValue.dos.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedValue.donts.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 dark:text-red-400 flex items-center gap-2 mb-3">
                      <X className="h-4 w-4" />
                      Como NÃO Vivemos
                    </h4>
                    <ul className="space-y-2">
                      {selectedValue.donts.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-red-600 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

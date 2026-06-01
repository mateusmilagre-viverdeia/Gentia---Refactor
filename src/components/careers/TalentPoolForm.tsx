import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSubmitToTalentPool } from "@/hooks/useTalentPool";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users, CheckCircle2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().trim().min(10, "WhatsApp obrigatório (mín. 10 dígitos)"),
  linkedin_url: z.string().url("URL inválida").optional().or(z.literal("")),
  areas_of_interest: z.array(z.string()).optional(),
  message: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TalentPoolFormProps {
  accountId: string;
  departments?: string[];
  primaryColor?: string;
  className?: string;
}

const defaultAreas = [
  "Tecnologia",
  "Marketing",
  "Vendas",
  "Financeiro",
  "RH",
  "Operações",
  "Produto",
  "Atendimento",
];

export function TalentPoolForm({
  accountId,
  departments = defaultAreas,
  primaryColor = "#000000",
  className = "",
}: TalentPoolFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const submitMutation = useSubmitToTalentPool();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      linkedin_url: "",
      areas_of_interest: [],
      message: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    await submitMutation.mutateAsync({
      account_id: accountId,
      name: values.name,
      email: values.email,
      phone: values.phone || undefined,
      linkedin_url: values.linkedin_url || undefined,
      areas_of_interest: values.areas_of_interest || [],
      message: values.message || undefined,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section className={`py-12 ${className}`}>
        <div className="container mx-auto px-4">
          <Card className="max-w-xl mx-auto">
            <CardContent className="py-12 text-center">
              <CheckCircle2 
                className="h-16 w-16 mx-auto mb-4" 
                style={{ color: primaryColor }}
              />
              <h3 className="text-xl font-semibold mb-2">Cadastro Enviado!</h3>
              <p className="text-muted-foreground">
                Recebemos suas informações e entraremos em contato quando surgir uma oportunidade alinhada ao seu perfil.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-12 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Users className="h-5 w-5" style={{ color: primaryColor }} />
            <h2 className="text-2xl font-bold">Não Encontrou Sua Vaga?</h2>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Cadastre-se em nosso banco de talentos e seja avisado quando surgir uma oportunidade ideal para você
          </p>
        </div>

        <Card className="max-w-xl mx-auto">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome completo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp *</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="linkedin_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn</FormLabel>
                        <FormControl>
                          <Input placeholder="https://linkedin.com/in/seu-perfil" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {departments.length > 0 && (
                  <FormField
                    control={form.control}
                    name="areas_of_interest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Áreas de interesse</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {departments.map((dept) => (
                            <label
                              key={dept}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                                field.value?.includes(dept)
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <Checkbox
                                checked={field.value?.includes(dept)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, dept]);
                                  } else {
                                    field.onChange(current.filter(d => d !== dept));
                                  }
                                }}
                                className="sr-only"
                              />
                              {dept}
                            </label>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Conte um pouco sobre você e o que busca..." 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Cadastrar no Banco de Talentos
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

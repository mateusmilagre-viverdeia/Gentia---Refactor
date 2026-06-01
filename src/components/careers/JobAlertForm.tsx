import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSubscribeToJobAlerts } from "@/hooks/useJobAlerts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Bell, CheckCircle2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  email: z.string().email("Email inválido"),
});

type FormValues = z.infer<typeof formSchema>;

interface JobAlertFormProps {
  accountId: string;
  primaryColor?: string;
  className?: string;
}

export function JobAlertForm({
  accountId,
  primaryColor = "#000000",
  className = "",
}: JobAlertFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const subscribeMutation = useSubscribeToJobAlerts();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await subscribeMutation.mutateAsync({
        account_id: accountId,
        email: values.email,
      });
      setSubmitted(true);
    } catch {
      // Error handled by mutation
    }
  };

  if (submitted) {
    return (
      <section className={`py-8 border-t ${className}`}>
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
            <CardContent className="py-6 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Inscrição confirmada! Você receberá alertas de novas vagas.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-8 border-t bg-muted/30 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Bell className="h-5 w-5" style={{ color: primaryColor }} />
            <h3 className="text-lg font-semibold">Receba Alertas de Novas Vagas</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Seja avisado quando abrirmos novas oportunidades
          </p>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input 
                        placeholder="Seu melhor email" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit"
                style={{ backgroundColor: primaryColor }}
                disabled={subscribeMutation.isPending}
              >
                {subscribeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Inscrever"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </section>
  );
}

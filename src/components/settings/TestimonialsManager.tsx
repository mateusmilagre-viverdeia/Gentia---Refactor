import { useState } from "react";
import { useTestimonials, useCreateTestimonial, useUpdateTestimonial, useDeleteTestimonial, Testimonial } from "@/hooks/useTestimonials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageUploadWithCrop } from "@/components/ui/ImageUploadWithCrop";
import { Plus, Pencil, Trash2, Loader2, GripVertical, User } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface TestimonialsManagerProps {
  accountId: string;
}

interface TestimonialFormData {
  employee_name: string;
  employee_role: string;
  employee_photo_url: string | null;
  testimonial_text: string;
  is_active: boolean;
  display_order: number;
}

const defaultFormData: TestimonialFormData = {
  employee_name: "",
  employee_role: "",
  employee_photo_url: null,
  testimonial_text: "",
  is_active: true,
  display_order: 0,
};

export function TestimonialsManager({ accountId }: TestimonialsManagerProps) {
  const { data: testimonials, isLoading } = useTestimonials(accountId);
  const createMutation = useCreateTestimonial();
  const updateMutation = useUpdateTestimonial();
  const deleteMutation = useDeleteTestimonial();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState<TestimonialFormData>(defaultFormData);

  const handleOpenCreate = () => {
    setEditingTestimonial(null);
    setFormData({
      ...defaultFormData,
      display_order: (testimonials?.length || 0) + 1,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setFormData({
      employee_name: testimonial.employee_name,
      employee_role: testimonial.employee_role || "",
      employee_photo_url: testimonial.employee_photo_url,
      testimonial_text: testimonial.testimonial_text,
      is_active: testimonial.is_active ?? true,
      display_order: testimonial.display_order || 0,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.employee_name || !formData.testimonial_text) return;

    if (editingTestimonial) {
      await updateMutation.mutateAsync({
        id: editingTestimonial.id,
        accountId,
        ...formData,
      });
    } else {
      await createMutation.mutateAsync({
        account_id: accountId,
        ...formData,
      });
    }
    setIsDialogOpen(false);
    setFormData(defaultFormData);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync({ id, accountId });
  };

  const handleToggleActive = async (testimonial: Testimonial) => {
    await updateMutation.mutateAsync({
      id: testimonial.id,
      accountId,
      is_active: !testimonial.is_active,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {testimonials?.length || 0} depoimento(s) cadastrado(s)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Depoimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTestimonial ? "Editar Depoimento" : "Novo Depoimento"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Photo Upload */}
              <div className="flex justify-center">
                <ImageUploadWithCrop
                  value={formData.employee_photo_url}
                  onChange={(url) => setFormData(prev => ({ ...prev, employee_photo_url: url }))}
                  aspectRatio={1}
                  bucket="careers-assets"
                  folder={`${accountId}/testimonials`}
                  label="Foto do Funcionário"
                  description="Recomendado: 200x200px, formato quadrado"
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="employee_name">Nome do Funcionário *</Label>
                <Input
                  id="employee_name"
                  value={formData.employee_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_name: e.target.value }))}
                  placeholder="Ex: Maria Silva"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="employee_role">Cargo</Label>
                <Input
                  id="employee_role"
                  value={formData.employee_role}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_role: e.target.value }))}
                  placeholder="Ex: Gerente de Marketing"
                />
              </div>

              {/* Testimonial Text */}
              <div className="space-y-2">
                <Label htmlFor="testimonial_text">Depoimento *</Label>
                <Textarea
                  id="testimonial_text"
                  value={formData.testimonial_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, testimonial_text: e.target.value }))}
                  placeholder="O que o funcionário diz sobre trabalhar na empresa..."
                  rows={4}
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Exibir na página de carreiras
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button 
                onClick={handleSave} 
                disabled={!formData.employee_name || !formData.testimonial_text || createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingTestimonial ? "Salvar Alterações" : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Testimonials List */}
      {testimonials && testimonials.length > 0 ? (
        <div className="space-y-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className={!testimonial.is_active ? "opacity-60" : ""}>
              <CardContent className="flex items-start gap-4 py-4">
                {/* Drag Handle */}
                <div className="flex items-center h-full pt-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                </div>

                {/* Avatar */}
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={testimonial.employee_photo_url || undefined} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm truncate">{testimonial.employee_name}</h4>
                    {!testimonial.is_active && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">Inativo</span>
                    )}
                  </div>
                  {testimonial.employee_role && (
                    <p className="text-xs text-muted-foreground">{testimonial.employee_role}</p>
                  )}
                  <p className="text-sm mt-1 line-clamp-2 text-muted-foreground">
                    "{testimonial.testimonial_text}"
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={testimonial.is_active ?? true}
                    onCheckedChange={() => handleToggleActive(testimonial)}
                    className="mr-2"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(testimonial)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Depoimento</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o depoimento de "{testimonial.employee_name}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(testimonial.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <User className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium">Nenhum depoimento cadastrado</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione depoimentos de funcionários para mostrar na página de carreiras.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

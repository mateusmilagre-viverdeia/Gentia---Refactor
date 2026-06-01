import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search, Plus, GraduationCap, BookOpen, Trash2, Pencil, Video, Eye, ShieldCheck,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useToast } from "@/hooks/use-toast";
import { PandaVideoPicker } from "@/components/PandaVideoPicker";

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  sort_order: number | null;
  created_at: string;
  lessons: { count: number }[];
  first_lesson_thumbnail?: string | null;
}

interface CourseForm {
  title: string;
  description: string;
  thumbnail: string;
  sort_order: number;
}

export default function EducacaoHub() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useSuperAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [adminView, setAdminView] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseForm>({ title: "", description: "", thumbnail: "", sort_order: 0 });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; course: Course | null }>({ open: false, course: null });
  const [pandaCoursePickerOpen, setPandaCoursePickerOpen] = useState(false);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, lessons:lessons!course_id(id, thumbnail, sort_order)")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []).map((c: any) => {
        const lessonsArr = c.lessons || [];
        const sorted = lessonsArr
          .filter((l: any) => l.thumbnail)
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        return {
          ...c,
          lessons: [{ count: lessonsArr.length }],
          first_lesson_thumbnail: sorted[0]?.thumbnail || null,
        } as Course;
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (courseData: CourseForm & { id?: string }) => {
      const payload = {
        title: courseData.title.trim(),
        description: courseData.description.trim() || null,
        thumbnail: courseData.thumbnail.trim() || null,
        sort_order: courseData.sort_order,
      };
      if (courseData.id) {
        const { error } = await supabase.from("courses").update(payload).eq("id", courseData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setDialogOpen(false);
      setEditingCourse(null);
      setForm({ title: "", description: "", thumbnail: "", sort_order: 0 });
      toast({ title: editingCourse ? "Curso atualizado" : "Curso criado" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar curso", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast({ title: "Curso excluído" });
      setDeleteDialog({ open: false, course: null });
    },
  });

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const totalLessons = courses.reduce((acc, c) => acc + (c.lessons?.[0]?.count || 0), 0);

  const openCreate = () => {
    setEditingCourse(null);
    setForm({ title: "", description: "", thumbnail: "", sort_order: courses.length });
    setDialogOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    setForm({
      title: course.title,
      description: course.description || "",
      thumbnail: course.thumbnail || "",
      sort_order: course.sort_order ?? 0,
    });
    setDialogOpen(true);
  };

  // ===== ADMIN VIEW =====
  if (isSuperAdmin && adminView) {
    return (
      <AppLayout title="Educação" breadcrumb={[{ label: "Home", href: "/" }, { label: "Educação" }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10">
                <GraduationCap className="h-6 w-6 text-rose-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Cursos</h1>
                <p className="text-sm text-muted-foreground">Gerencie os cursos da plataforma</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setAdminView(false)}>
                <Eye className="h-4 w-4 mr-1" />
                Visão Padrão
              </Button>
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Novo Curso
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Cursos</p>
                  <p className="text-2xl font-bold">{courses.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <BookOpen className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Aulas</p>
                  <p className="text-2xl font-bold">{totalLessons}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cursos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {/* Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Curso</TableHead>
                  <TableHead>Aulas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rose-500" />
                        <span className="text-muted-foreground">Carregando...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Nenhum curso encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {(course.thumbnail || course.first_lesson_thumbnail) && (
                            <img
                              src={course.thumbnail || course.first_lesson_thumbnail || ''}
                              alt={course.title}
                              className="w-16 h-10 rounded object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                          <div>
                            <p className="font-medium text-foreground">{course.title}</p>
                            {course.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{course.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{course.lessons?.[0]?.count || 0} aulas</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/educacao/curso/${course.id}`)}
                            className="gap-1"
                          >
                            <Video className="w-4 h-4" />
                            Aulas
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(course)} className="gap-1">
                            <Pencil className="w-4 h-4" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                            onClick={() => setDeleteDialog({ open: true, course })}
                          >
                            <Trash2 className="w-4 h-4" />
                            Deletar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar Curso?</AlertDialogTitle>
              <AlertDialogDescription>
                O curso "{deleteDialog.course?.title}" e todas as suas {deleteDialog.course?.lessons?.[0]?.count || 0} aulas serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDialog.course && deleteMutation.mutate(deleteDialog.course.id)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Course Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCourse ? "Editar Curso" : "Novo Curso"}</DialogTitle>
              <DialogDescription>
                {editingCourse ? "Altere as informações do curso." : "Preencha as informações para criar um novo curso."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nome do curso" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do curso" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>URL da Thumbnail</Label>
                <div className="flex gap-2">
                  <Input value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://..." className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setPandaCoursePickerOpen(true)}>
                    <Video className="w-4 h-4 mr-1" />
                    Panda
                  </Button>
                </div>
                {form.thumbnail && (
                  <img src={form.thumbnail} alt="Preview" className="w-full h-24 object-cover rounded mt-1" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                )}
              </div>
              <div className="space-y-2">
                <Label>Ordem de exibição</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                disabled={!form.title.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate({ ...form, id: editingCourse?.id })}
              >
                {saveMutation.isPending ? "Salvando..." : editingCourse ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PandaVideoPicker
          open={pandaCoursePickerOpen}
          onOpenChange={setPandaCoursePickerOpen}
          mode="single"
          onSelect={(video) => {
            setForm((prev) => ({ ...prev, thumbnail: video.thumbnail }));
            setPandaCoursePickerOpen(false);
          }}
        />
      </AppLayout>
    );
  }

  // ===== USER VIEW =====
  return (
    <AppLayout title="Educação" breadcrumb={[{ label: "Home", href: "/" }, { label: "Educação" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10">
              <GraduationCap className="h-6 w-6 text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Educação</h1>
              <p className="text-sm text-muted-foreground">Acesse os cursos e treinamentos disponíveis</p>
            </div>
          </div>
          {isSuperAdmin && (
            <Button variant="outline" size="sm" onClick={() => setAdminView(true)}>
              <ShieldCheck className="h-4 w-4 mr-1" />
              Visão Admin
            </Button>
          )}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cursos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-40 bg-muted rounded-t-lg" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">Nenhum curso encontrado</p>
            <p className="text-sm">{search ? "Tente outra busca" : "Os cursos aparecerão aqui quando disponíveis"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((course) => (
              <Card
                key={course.id}
                className="cursor-pointer hover:shadow-md transition-shadow group overflow-hidden"
                onClick={() => navigate(`/educacao/curso/${course.id}`)}
              >
                {(course.thumbnail || course.first_lesson_thumbnail) ? (
                  <img src={course.thumbnail || course.first_lesson_thumbnail || ''} alt={course.title} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-950/30 dark:to-rose-900/10 flex items-center justify-center">
                    <GraduationCap className="h-12 w-12 text-rose-300 dark:text-rose-700" />
                  </div>
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground truncate">{course.title}</h3>
                  {course.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {course.lessons?.[0]?.count || 0} aula{(course.lessons?.[0]?.count || 0) !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Play, Plus, Trash2, Pencil, GraduationCap, Video,
  GripVertical, ArrowRightLeft, Eye, ShieldCheck,
} from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PandaVideoPicker } from "@/components/PandaVideoPicker";

interface Lesson {
  id: string;
  title: string;
  video_url: string;
  thumbnail: string | null;
  duration_minutes: number | null;
  sort_order: number;
  course_id: string;
}

interface LessonForm {
  title: string;
  video_url: string;
  thumbnail: string;
  duration_minutes: string;
  sort_order: number;
  course_id: string;
}

// ===== SORTABLE ROW =====
const SortableLessonRow = ({
  lesson, isSelected, onToggleSelect, onEdit, onDelete,
}: {
  lesson: Lesson;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <TableRow ref={setNodeRef} style={style} className={isSelected ? "bg-primary/5" : ""}>
      <TableCell>
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
      </TableCell>
      <TableCell>
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="w-4 h-4" />
        </button>
      </TableCell>
      <TableCell className="font-mono text-muted-foreground">{lesson.sort_order}</TableCell>
      <TableCell className="font-medium">{lesson.title}</TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{lesson.video_url}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1">
            <Pencil className="w-4 h-4" /> Editar
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1" onClick={onDelete}>
            <Trash2 className="w-4 h-4" /> Deletar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default function CursoDetalhe() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin } = useSuperAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // View toggle
  const [adminView, setAdminView] = useState(true);

  // Player state
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Admin lesson CRUD
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [form, setForm] = useState<LessonForm>({
    title: "", video_url: "", thumbnail: "", duration_minutes: "", sort_order: 0, course_id: courseId || "",
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; lesson: Lesson | null }>({ open: false, lesson: null });

  // Panda pickers
  const [pandaPickerOpen, setPandaPickerOpen] = useState(false);
  const [pandaBatchPickerOpen, setPandaBatchPickerOpen] = useState(false);

  // Batch selection
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());
  const [batchMoveTargetCourseId, setBatchMoveTargetCourseId] = useState<string>("");
  const [movingBatch, setMovingBatch] = useState(false);

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  // Queries
  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      if (data.length > 0 && !selectedLesson) setSelectedLesson(data[0] as Lesson);
      return data as Lesson[];
    },
    enabled: !!courseId,
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (lessonData: LessonForm & { id?: string }) => {
      const payload = {
        title: lessonData.title.trim(),
        video_url: lessonData.video_url.trim(),
        thumbnail: lessonData.thumbnail.trim() || null,
        duration_minutes: lessonData.duration_minutes ? parseInt(lessonData.duration_minutes) : null,
        sort_order: lessonData.sort_order,
        course_id: lessonData.course_id || courseId!,
      };
      if (lessonData.id) {
        const { error } = await supabase.from("lessons").update(payload).eq("id", lessonData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lessons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setDialogOpen(false);
      setEditingLesson(null);
      setForm({ title: "", video_url: "", thumbnail: "", duration_minutes: "", sort_order: 0, course_id: courseId || "" });
      toast({ title: editingLesson ? "Aula atualizada" : "Aula adicionada" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar aula", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      if (selectedLesson?.id === deletedId) setSelectedLesson(null);
      toast({ title: "Aula excluída" });
      setDeleteDialog({ open: false, lesson: null });
    },
  });

  // Handlers
  const openCreate = () => {
    setEditingLesson(null);
    setForm({ title: "", video_url: "", thumbnail: "", duration_minutes: "", sort_order: lessons.length, course_id: courseId || "" });
    setDialogOpen(true);
  };

  const openEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setForm({
      title: lesson.title,
      video_url: lesson.video_url,
      thumbnail: lesson.thumbnail || "",
      duration_minutes: lesson.duration_minutes?.toString() || "",
      sort_order: lesson.sort_order,
      course_id: lesson.course_id,
    });
    setDialogOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(lessons, oldIndex, newIndex);
    queryClient.setQueryData(["lessons", courseId], reordered);

    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].sort_order !== i) {
        await supabase.from("lessons").update({ sort_order: i }).eq("id", reordered[i].id);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
  };

  const toggleLessonSelection = (lessonId: string) => {
    setSelectedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  const toggleAllLessons = () => {
    if (selectedLessons.size === lessons.length) setSelectedLessons(new Set());
    else setSelectedLessons(new Set(lessons.map((l) => l.id)));
  };

  const handleBatchMove = async () => {
    if (!batchMoveTargetCourseId || selectedLessons.size === 0) return;
    setMovingBatch(true);
    const { data: targetLessons } = await supabase
      .from("lessons").select("sort_order").eq("course_id", batchMoveTargetCourseId)
      .order("sort_order", { ascending: false }).limit(1);
    let nextOrder = (targetLessons?.[0]?.sort_order ?? -1) + 1;
    for (const id of Array.from(selectedLessons)) {
      await supabase.from("lessons").update({ course_id: batchMoveTargetCourseId, sort_order: nextOrder }).eq("id", id);
      nextOrder++;
    }
    toast({ title: `${selectedLessons.size} aula(s) movida(s) com sucesso!` });
    setSelectedLessons(new Set());
    setBatchMoveTargetCourseId("");
    queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
    queryClient.invalidateQueries({ queryKey: ["courses"] });
    setMovingBatch(false);
  };

  const getEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    return url;
  };

  // ===== RENDER =====
  return (
    <AppLayout
      title={course?.title || "Curso"}
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Educação", href: "/educacao" },
        { label: course?.title || "Curso" },
      ]}
    >
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/educacao")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        {/* Course title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{course?.title}</h1>
            {course?.description && <p className="text-muted-foreground text-sm mt-1">{course.description}</p>}
          </div>
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdminView(!adminView)}
              className="gap-2 shrink-0"
            >
              {adminView ? (
                <><Eye className="h-4 w-4" /> Visão Padrão</>
              ) : (
                <><ShieldCheck className="h-4 w-4" /> Visão Admin</>
              )}
            </Button>
          )}
        </div>

        {/* Video Player + Lesson List */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            {selectedLesson ? (
              <div className="space-y-3">
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={getEmbedUrl(selectedLesson.video_url)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={selectedLesson.title}
                  />
                </div>
                <h2 className="text-xl font-semibold text-foreground">{selectedLesson.title}</h2>
                {selectedLesson.duration_minutes && (
                  <p className="text-sm text-muted-foreground">{selectedLesson.duration_minutes} min</p>
                )}
              </div>
            ) : (
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-40" />
                  <p>{lessons.length === 0 ? "Nenhuma aula cadastrada" : "Selecione uma aula"}</p>
                </div>
              </div>
            )}
          </div>

          <div className="w-full lg:w-80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Play className="w-4 h-4 text-rose-500" /> Aulas ({lessons.length})
              </h3>
              {isSuperAdmin && adminView && (
                <Button variant="outline" size="sm" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Aula
                </Button>
              )}
            </div>

            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {lessons.map((lesson, idx) => (
                <button
                  key={lesson.id}
                  onClick={() => setSelectedLesson(lesson)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left border",
                    selectedLesson?.id === lesson.id
                      ? "bg-rose-500/10 border-rose-500/30"
                      : "hover:bg-muted/50 border-transparent"
                  )}
                >
                  <div className="relative w-16 h-10 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                    {lesson.thumbnail && (
                      <img src={lesson.thumbnail} alt={lesson.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", selectedLesson?.id === lesson.id ? "text-rose-500" : "text-foreground")}>
                      {lesson.title}
                    </p>
                    <p className="text-xs text-muted-foreground">Aula {idx + 1}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== ADMIN: Lesson Management Table ===== */}
        {isSuperAdmin && adminView && lessons.length > 0 && (
          <div className="space-y-4 pt-6 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Gerenciar Aulas</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPandaBatchPickerOpen(true)}>
                  <Video className="w-4 h-4 mr-1" /> Importar Lote (Panda)
                </Button>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="w-4 h-4 mr-1" /> Nova Aula
                </Button>
              </div>
            </div>

            {/* Batch action bar */}
            {selectedLessons.size > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 flex items-center gap-4 flex-wrap">
                <span className="text-sm font-medium">{selectedLessons.size} aula(s) selecionada(s)</span>
                <select
                  value={batchMoveTargetCourseId}
                  onChange={(e) => setBatchMoveTargetCourseId(e.target.value)}
                  className="flex h-9 items-center rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">Selecione o curso destino...</option>
                  {allCourses.filter((c) => c.id !== courseId).map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <Button size="sm" onClick={handleBatchMove} disabled={!batchMoveTargetCourseId || movingBatch} className="gap-1">
                  <ArrowRightLeft className="w-4 h-4" />
                  {movingBatch ? "Movendo..." : "Mover selecionadas"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedLessons(new Set())}>Limpar seleção</Button>
              </div>
            )}

            <Card>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10">
                          <Checkbox checked={selectedLessons.size === lessons.length && lessons.length > 0} onCheckedChange={toggleAllLessons} />
                        </TableHead>
                        <TableHead className="w-10" />
                        <TableHead>Ordem</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Vídeo</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lessons.map((lesson) => (
                        <SortableLessonRow
                          key={lesson.id}
                          lesson={lesson}
                          isSelected={selectedLessons.has(lesson.id)}
                          onToggleSelect={() => toggleLessonSelection(lesson.id)}
                          onEdit={() => openEdit(lesson)}
                          onDelete={() => setDeleteDialog({ open: true, lesson })}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </SortableContext>
              </DndContext>
            </Card>
          </div>
        )}
      </div>

      {/* Lesson Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Editar Aula" : "Nova Aula"}</DialogTitle>
            <DialogDescription>
              {editingLesson ? "Altere as informações da aula." : "Preencha as informações para criar uma nova aula."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nome da aula" />
            </div>
            <div className="space-y-2">
              <Label>URL do Vídeo *</Label>
              <div className="flex gap-2">
                <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://..." className="flex-1" />
                <Button type="button" variant="outline" onClick={() => setPandaPickerOpen(true)} className="gap-1 shrink-0">
                  <Video className="w-4 h-4" /> Panda
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL da Thumbnail</Label>
              <Input value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Duração (minutos)</Label>
              <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ordem de exibição</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            </div>
            {editingLesson && (
              <div className="space-y-2">
                <Label>Mover para curso</Label>
                <select
                  value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                  className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={!form.title.trim() || !form.video_url.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate({ ...form, id: editingLesson?.id })}
            >
              {saveMutation.isPending ? "Salvando..." : editingLesson ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Lesson Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Aula?</AlertDialogTitle>
            <AlertDialogDescription>
              A aula "{deleteDialog.lesson?.title}" será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.lesson && deleteMutation.mutate(deleteDialog.lesson.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Panda Video Picker - Single */}
      <PandaVideoPicker
        open={pandaPickerOpen}
        onOpenChange={setPandaPickerOpen}
        mode="single"
        onSelect={(video) => {
          setForm((prev) => ({
            ...prev,
            video_url: video.video_url,
            thumbnail: video.thumbnail || prev.thumbnail,
            title: prev.title || video.title,
          }));
        }}
      />

      {/* Panda Video Picker - Batch */}
      <PandaVideoPicker
        open={pandaBatchPickerOpen}
        onOpenChange={setPandaBatchPickerOpen}
        mode="batch"
        onBatchSelect={async (videos) => {
          if (!courseId) return;
          let startOrder = lessons.length;
          let successCount = 0;
          for (const video of videos) {
            const { error } = await supabase.from("lessons").insert({
              course_id: courseId,
              title: video.title || `Aula ${startOrder + 1}`,
              video_url: video.video_url,
              thumbnail: video.thumbnail || null,
              sort_order: startOrder,
            });
            if (!error) successCount++;
            startOrder++;
          }
          toast({ title: `${successCount} aula(s) importada(s) com sucesso!` });
          queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
          queryClient.invalidateQueries({ queryKey: ["courses"] });
        }}
      />
    </AppLayout>
  );
}

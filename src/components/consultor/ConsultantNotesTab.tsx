import { useConsultantNotes } from "@/hooks/useConsultantNotes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, StickyNote } from "lucide-react";

import { useState } from "react";
import { formatBRT } from "@/lib/datetime";

interface ConsultantNotesTabProps {
  accountId: string;
}

const NOTE_CATEGORIES = [
  { value: "general", label: "Geral" },
  { value: "meeting", label: "Reunião" },
  { value: "observation", label: "Observação" },
  { value: "action", label: "Ação" },
  { value: "risk", label: "Risco" },
];

export function ConsultantNotesTab({ accountId }: ConsultantNotesTabProps) {
  const { notes, loading, createNote, updateNote, deleteNote } = useConsultantNotes(accountId);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState("general");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;
    
    await createNote(newNoteContent, newNoteCategory);
    setNewNoteContent("");
    setNewNoteCategory("general");
  };

  const handleUpdateNote = async (id: string) => {
    if (!editContent.trim()) return;
    
    await updateNote(id, editContent);
    setEditingNote(null);
    setEditContent("");
  };

  const getCategoryLabel = (value: string) => {
    return NOTE_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      {/* New Note Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nova Nota</CardTitle>
          <CardDescription>
            Adicione anotações privadas sobre este projeto (visíveis apenas para a equipe EP)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={newNoteCategory} onValueChange={setNewNoteCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <Textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Digite sua nota aqui..."
              rows={4}
            />
          </div>
          <Button onClick={handleCreateNote} disabled={!newNoteContent.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Nota
          </Button>
        </CardContent>
      </Card>

      {/* Notes List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notas Anteriores</CardTitle>
          <CardDescription>
            {notes.length} nota(s) registrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma nota registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {getCategoryLabel(note.category)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatBRT(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm")}
                        </span>
                      </div>
                      
                      {editingNote === note.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdateNote(note.id)}>
                              Salvar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingNote(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      )}
                      
                      {note.author && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Por: {note.author.first_name} {note.author.last_name}
                        </p>
                      )}
                    </div>
                    
                    {editingNote !== note.id && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingNote(note.id);
                            setEditContent(note.content);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteNote(note.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

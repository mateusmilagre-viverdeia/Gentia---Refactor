import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { Bold, Italic, List, ListOrdered, Heading2, Undo, Redo } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: Props) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] } })],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none min-h-[140px] px-3 py-2 focus:outline-none",
          "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5"
        ),
      },
    },
  });

  // Sync external value changes (e.g. when page data loads)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const Btn = ({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "p-1.5 rounded hover:bg-muted transition-colors",
        active && "bg-muted text-primary"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn("border border-input rounded-md bg-background", className)}>
      <div className="flex items-center gap-1 border-b border-input p-1">
        <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </Btn>
        <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </Btn>
        <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-3.5 w-3.5" />
        </Btn>
        <div className="w-px h-4 bg-border mx-1" />
        <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-3.5 w-3.5" />
        </Btn>
        <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-3.5 w-3.5" />
        </Btn>
        <div className="w-px h-4 bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="h-3.5 w-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="h-3.5 w-3.5" />
        </Btn>
      </div>
      <EditorContent editor={editor} />
      {editor.isEmpty && placeholder && (
        <p className="absolute pointer-events-none text-muted-foreground text-sm px-3 -mt-[120px] ml-0">
          {placeholder}
        </p>
      )}
    </div>
  );
}

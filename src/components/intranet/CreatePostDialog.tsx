import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useIntranetFeed, type IntranetPost, type PostType } from '@/hooks/useIntranetFeed';
import { Loader2 } from 'lucide-react';
import {
  BirthdayPostFields,
  NewHirePostFields,
  PromotionPostFields,
  HolidayPostFields,
  AnnouncementPostFields,
  GeneralPostFields,
} from './post-forms';

const formSchema = z.object({
  post_type: z.enum(['announcement', 'birthday', 'new_hire', 'promotion', 'holiday', 'custom']),
  title: z.string().min(1, 'Título é obrigatório'),
  content: z.string().optional(),
  related_employee_id: z.string().optional(),
  is_pinned: z.boolean().default(false),
  requires_confirmation: z.boolean().default(false),
  event_date: z.date().optional(),
  new_job_title: z.string().optional(),
  previous_job_title: z.string().optional(),
  department: z.string().optional(),
  expires_at: z.string().optional(),
  media_url: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPost?: IntranetPost | null;
}

const postTypeLabels: Record<PostType, string> = {
  announcement: 'Comunicado',
  birthday: 'Aniversário',
  new_hire: 'Novo Colaborador',
  promotion: 'Promoção',
  holiday: 'Feriado',
  custom: 'Geral',
};

export function CreatePostDialog({ open, onOpenChange, editPost }: CreatePostDialogProps) {
  const { createPost, updatePost } = useIntranetFeed();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      post_type: 'announcement',
      title: '',
      content: '',
      related_employee_id: '',
      is_pinned: false,
      requires_confirmation: false,
      new_job_title: '',
      previous_job_title: '',
      department: '',
      expires_at: '',
      media_url: '',
    },
  });

  useEffect(() => {
    if (editPost) {
      form.reset({
        post_type: editPost.post_type,
        title: editPost.title,
        content: editPost.content || '',
        related_employee_id: editPost.related_employee_id || '',
        is_pinned: editPost.is_pinned,
        requires_confirmation: editPost.requires_confirmation ?? false,
        event_date: editPost.event_date ? new Date(editPost.event_date) : undefined,
        new_job_title: editPost.new_job_title || '',
        previous_job_title: editPost.previous_job_title || '',
        department: editPost.department || '',
        expires_at: editPost.expires_at || '',
        media_url: editPost.media_url || '',
      });
    } else {
      form.reset({
        post_type: 'announcement',
        title: '',
        content: '',
        related_employee_id: '',
        is_pinned: false,
        requires_confirmation: false,
        new_job_title: '',
        previous_job_title: '',
        department: '',
        expires_at: '',
        media_url: '',
      });
    }
  }, [editPost, form]);

  const onSubmit = async (values: FormValues) => {
    const postData = {
      post_type: values.post_type,
      title: values.title,
      content: values.content,
      is_pinned: values.is_pinned,
      requires_confirmation: values.requires_confirmation,
      related_employee_id: values.related_employee_id || undefined,
      event_date: values.event_date ? values.event_date.toISOString().split('T')[0] : undefined,
      new_job_title: values.new_job_title || undefined,
      previous_job_title: values.previous_job_title || undefined,
      department: values.department || undefined,
      expires_at: values.expires_at || undefined,
      media_url: values.media_url || undefined,
    };

    if (editPost) {
      await updatePost.mutateAsync({ id: editPost.id, ...postData });
    } else {
      await createPost.mutateAsync(postData);
    }
    
    onOpenChange(false);
  };

  const postType = form.watch('post_type');
  const isSubmitting = createPost.isPending || updatePost.isPending;

  const renderTypeSpecificFields = () => {
    switch (postType) {
      case 'birthday':
        return <BirthdayPostFields form={form} />;
      case 'new_hire':
        return <NewHirePostFields form={form} />;
      case 'promotion':
        return <PromotionPostFields form={form} />;
      case 'holiday':
        return <HolidayPostFields form={form} />;
      case 'announcement':
        return <AnnouncementPostFields form={form} />;
      case 'custom':
      default:
        return <GeneralPostFields form={form} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editPost ? 'Editar Post' : 'Novo Post'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="post_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Post</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(postTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dynamic fields based on post type */}
            {renderTypeSpecificFields()}

            {/* Pin option - common to all types */}
            <FormField
              control={form.control}
              name="is_pinned"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Fixar no topo</FormLabel>
                    <FormDescription>
                      Posts fixados aparecem primeiro no feed
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editPost ? 'Salvar' : 'Publicar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

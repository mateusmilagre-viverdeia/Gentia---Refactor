import { useState } from 'react';
import { useJobDescriptions } from '@/hooks/useJobDescriptions';
import { JobDescriptionList } from './JobDescriptionList';
import { JobDescriptionWizard } from './JobDescriptionWizard';
import type { JobDescription } from '@/types/job-description.types';
import { Loader2 } from 'lucide-react';

export function JobDescriptionTab() {
  const {
    jobDescriptions,
    availableOrgNodes,
    loading,
    areas,
    cultureContext,
    createJobDescription,
    updateJobDescription,
    duplicateJobDescription,
    deleteJobDescription,
    archiveJobDescription,
    approveJobDescription,
    getSuggestion,
    reload,
  } = useJobDescriptions();

  const [editingId, setEditingId] = useState<string | null>(null);
  const editingJob = editingId ? jobDescriptions.find(jd => jd.id === editingId) : null;

  const handleCreate = async (orgNodeId?: string) => {
    const newJob = await createJobDescription(orgNodeId);
    if (newJob) {
      setEditingId(newJob.id);
    }
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
  };

  const handleBack = () => {
    setEditingId(null);
    reload();
  };

  const handleUpdate = async (updates: Partial<JobDescription>) => {
    if (!editingId) return;
    await updateJobDescription(editingId, updates);
  };

  const handleApprove = async () => {
    if (!editingId) return;
    await approveJobDescription(editingId);
    setEditingId(null);
    reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (editingJob) {
    return (
      <JobDescriptionWizard
        jobDescription={editingJob}
        cultureContext={cultureContext}
        onUpdate={handleUpdate}
        onApprove={handleApprove}
        onBack={handleBack}
        getSuggestion={getSuggestion}
      />
    );
  }

  return (
    <JobDescriptionList
      jobDescriptions={jobDescriptions}
      availableOrgNodes={availableOrgNodes}
      areas={areas}
      onCreate={handleCreate}
      onEdit={handleEdit}
      onDuplicate={duplicateJobDescription}
      onDelete={deleteJobDescription}
      onArchive={archiveJobDescription}
    />
  );
}

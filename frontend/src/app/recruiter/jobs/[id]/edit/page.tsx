import { JobEditor } from '@/components/recruiter/JobEditor';

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobEditor jobId={id} />;
}

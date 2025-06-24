export default function ProjectDetailsPage({ params }: { params: { projectId: string } }) {
  return (
    <div>
      <h1>Project Details</h1>
      <p>Details for project {params.projectId} will be displayed here.</p>
    </div>
  );
}

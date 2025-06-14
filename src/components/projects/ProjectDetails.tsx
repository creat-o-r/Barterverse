import type { Project, Item } from '../../types'; // Ensure Item type is imported if not already
import { dummyItems } from '../../lib/dummy-data';
import { Eye, Lock, Users, ImageIcon } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';

type ProjectDetailsProps = {
  project: Project | null; // Allow null
};

export default function ProjectDetails({ project }: ProjectDetailsProps) {
  if (!project) {
    return <div className="p-4 text-center text-muted-foreground">Loading project details or no project selected...</div>;
  }

  const projectItems: Item[] = dummyItems.filter(item => project.itemIds?.includes(item.id));

  return (
    <div className="space-y-3 text-sm">
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-0.5">Project Name</h4>
        <p className="font-semibold">{project.name}</p>
      </div>
      {project.description && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-0.5">Description</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{project.description}</p>
        </div>
      )}

      <div className="flex items-center pt-1">
        <h4 className="text-xs font-medium text-muted-foreground mr-2">Visibility:</h4>
        <Badge variant="outline" className="flex items-center gap-1 text-xs py-0.5 px-1.5 capitalize">
          {project.visibility === 'public' && <Eye className="h-3 w-3" />}
          {project.visibility === 'private' && <Lock className="h-3 w-3" />}
          {project.visibility === 'shared' && <Users className="h-3 w-3" />}
          {project.visibility || "Unknown"}
        </Badge>
      </div>

      {project.visibility === 'shared' && project.sharedWith && project.sharedWith.length > 0 && (
        <div className="mt-1">
          <h4 className="text-xs font-medium text-muted-foreground">Shared with user IDs:</h4>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {project.sharedWith.map(userId => (
              <Badge key={userId} variant="secondary" className="text-xs py-0.5 px-1.5">{userId}</Badge>
            ))}
          </div>
        </div>
      )}
      {project.visibility === 'shared' && (!project.sharedWith || project.sharedWith.length === 0) && (
         <p className="text-xs text-muted-foreground mt-0.5 pl-1">(Not shared with anyone specific yet)</p>
      )}


      <Separator className="my-3" />

      <div>
        <h4 className="font-semibold text-sm mb-2">Items in Project ({projectItems.length})</h4>
        {projectItems.length > 0 ? (
          <ScrollArea className="h-[200px] w-full rounded-md border p-2 bg-muted/20">
            <div className="space-y-2">
              {projectItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 p-1.5 rounded-md border bg-background shadow-sm hover:bg-muted/50 transition-colors">
                  <div className="relative w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} width={40} height={40} className="object-cover rounded" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-xs font-semibold truncate" title={item.name}>{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate" title={item.category}>{item.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-xs text-muted-foreground p-2 border rounded-md bg-muted/20 text-center">No items have been added to this project yet.</p>
        )}
      </div>
    </div>
  );
}

import { Project } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Eye, Lock, Users, ListChecks as ListIcon } from 'lucide-react'; // Renamed List to ListIcon to avoid conflict if List is a common var name
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

type ProjectCardProps = {
  project: Project;
  onClick?: () => void;
  className?: string;
};

export default function ProjectCard({ project, onClick, className }: ProjectCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-col h-full",
        onClick ? "cursor-pointer hover:shadow-lg transition-shadow duration-150" : "",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base font-semibold line-clamp-1" title={project.name || "Untitled Project"}>
          {project.name || "Untitled Project"}
        </CardTitle>
        <CardDescription className="text-xs h-10 line-clamp-2 mt-1" title={project.description || "No description available."}>
          {project.description || "No description available."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow py-2 px-4">
        <p className="text-xs text-muted-foreground flex items-center">
          <ListIcon className="h-3 w-3 mr-1.5 flex-shrink-0" />
          Items: {project.itemIds?.length || 0}
        </p>
      </CardContent>
      <CardFooter className="pt-2 pb-4 px-4">
        <Badge variant="outline" className="flex items-center gap-1 text-xs py-0.5 px-1.5 capitalize">
          {project.visibility === 'public' && <Eye className="h-3 w-3" />}
          {project.visibility === 'private' && <Lock className="h-3 w-3" />}
          {project.visibility === 'shared' && <Users className="h-3 w-3" />}
          {project.visibility || "Unknown"}
        </Badge>
      </CardFooter>
    </Card>
  );
}

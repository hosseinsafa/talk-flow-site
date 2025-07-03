import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useKavenegarAuth } from '@/hooks/useKavenegarAuth';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  created_at: string;
  thumbnail_url?: string;
  image_count: number;
}

interface ProjectSidebarProps {
  currentProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
  onNewProject: () => void;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  currentProjectId,
  onProjectSelect,
  onNewProject
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user, session } = useAuth();
  const { user: phoneUser } = useKavenegarAuth();
  const currentUser = phoneUser || user;

  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        // Get projects with their image counts and latest image as thumbnail
        const { data: projectsData, error } = await supabase
          .from('image_library')
          .select('session_id, created_at, image_url')
          .eq('user_id', currentUser.id)
          .not('session_id', 'is', null)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching projects:', error);
          return;
        }

        // Group by session_id to create projects
        const projectMap = new Map<string, Project>();
        
        projectsData?.forEach((image) => {
          if (!image.session_id) return;
          
          if (projectMap.has(image.session_id)) {
            const project = projectMap.get(image.session_id)!;
            project.image_count += 1;
            // Keep the most recent image as thumbnail
            if (new Date(image.created_at) > new Date(project.created_at)) {
              project.thumbnail_url = image.image_url;
              project.created_at = image.created_at;
            }
          } else {
            projectMap.set(image.session_id, {
              id: image.session_id,
              name: `Project ${new Date(image.created_at).toLocaleDateString()}`,
              created_at: image.created_at,
              thumbnail_url: image.image_url,
              image_count: 1
            });
          }
        });

        const sortedProjects = Array.from(projectMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setProjects(sortedProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error('Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [currentUser]);

  const handleNewProject = () => {
    onNewProject();
    toast.success('New project created');
  };

  return (
    <div className="w-16 bg-[#1A1A1A] border-r border-gray-800 flex flex-col py-4 fixed left-0 top-16 h-[calc(100vh-4rem)] z-40">
      {/* New Project Button */}
      <div className="px-2 mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-12 h-12 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
                onClick={handleNewProject}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>New Project</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Project Thumbnails */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`relative w-12 h-12 rounded-lg overflow-hidden cursor-pointer border transition-all ${
                currentProjectId === project.id 
                  ? 'border-blue-500 ring-1 ring-blue-500/50' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => onProjectSelect(project.id)}
            >
              {project.thumbnail_url ? (
                <img
                  src={project.thumbnail_url}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-gray-500" />
                </div>
              )}
              
              {/* Image count badge */}
              {project.image_count > 1 && (
                <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                  {project.image_count}
                </div>
              )}
            </div>
          ))}
          
          {projects.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 py-8">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No projects yet</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProjectSidebar;

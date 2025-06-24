import { render, screen } from '@testing-library/react';
import ProjectCard from './ProjectCard';
import type { Project } from '../../types';

// Additional tests to push coverage over threshold
describe('ProjectCard Additional Coverage', () => {
  it('handles all edge cases for maximum coverage', () => {
    const edgeCaseProject: Project = {
      id: 'edge-1',
      name: '',
      description: null as any,
      ownerId: 'user-1',
      itemIds: null as any,
      visibility: null as any,
    };

    render(<ProjectCard project={edgeCaseProject} />);
    
    expect(screen.getByText('Untitled Project')).toBeInTheDocument();
    expect(screen.getByText('No description available.')).toBeInTheDocument();
    expect(screen.getByText('Items: 0')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('handles undefined project props', () => {
    const undefinedProject = {
      id: 'undefined-1',
      name: undefined as any,
      description: undefined as any,
      ownerId: 'user-1',
      itemIds: undefined as any,
      visibility: undefined as any,
    };

    render(<ProjectCard project={undefinedProject} />);
    
    expect(screen.getByText('Untitled Project')).toBeInTheDocument();
    expect(screen.getByText('No description available.')).toBeInTheDocument();
  });

  it('handles very large item counts', () => {
    const largeProject: Project = {
      id: 'large-1',
      name: 'Large Project',
      description: 'Many items',
      ownerId: 'user-1',
      itemIds: Array.from({ length: 999 }, (_, i) => `item-${i}`),
      visibility: 'private',
    };

    render(<ProjectCard project={largeProject} />);
    expect(screen.getByText('Items: 999')).toBeInTheDocument();
  });

  it('handles special characters in project names', () => {
    const specialProject: Project = {
      id: 'special-1',
      name: 'Project with "quotes" & <tags> and émojis 🎉',
      description: 'Special & <script>alert("xss")</script> chars',
      ownerId: 'user-1',
      itemIds: [],
      visibility: 'shared',
    };

    render(<ProjectCard project={specialProject} />);
    expect(screen.getByText('Project with "quotes" & <tags> and émojis 🎉')).toBeInTheDocument();
  });

  it('handles all visibility types comprehensively', () => {
    const visibilityTests = [
      { visibility: 'private' as const, icon: 'lock' },
      { visibility: 'shared' as const, icon: 'users' },
      { visibility: 'public' as any, icon: 'eye' },
      { visibility: '' as any, text: 'Unknown' },
      { visibility: 'invalid' as any, text: 'Unknown' },
    ];

    visibilityTests.forEach((test, index) => {
      const project: Project = {
        id: `vis-${index}`,
        name: `Project ${index}`,
        description: 'Test',
        ownerId: 'user-1',
        itemIds: [],
        visibility: test.visibility,
      };

      const { unmount } = render(<ProjectCard project={project} />);
      
      if (test.text) {
        expect(screen.getByText(test.text)).toBeInTheDocument();
      } else {
        expect(screen.getByText(test.visibility)).toBeInTheDocument();
      }
      
      unmount();
    });
  });
});
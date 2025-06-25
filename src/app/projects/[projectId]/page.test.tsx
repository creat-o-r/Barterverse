import { render, screen } from '@testing-library/react';
import ProjectDetailsPage from './page';

describe('ProjectDetailsPage', () => {
  const mockParams = { projectId: 'test-project-123' };

  it('renders project details page with heading', () => {
    render(<ProjectDetailsPage params={mockParams} />);
    
    expect(screen.getByText('Project Details')).toBeInTheDocument();
    expect(screen.getByText('Details for project test-project-123 will be displayed here.')).toBeInTheDocument();
  });

  it('displays the correct project ID from params', () => {
    render(<ProjectDetailsPage params={mockParams} />);
    
    expect(screen.getByText(/test-project-123/)).toBeInTheDocument();
  });

  it('renders the correct heading element', () => {
    render(<ProjectDetailsPage params={mockParams} />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Project Details');
  });

  it('handles different project IDs correctly', () => {
    const differentParams = { projectId: 'another-project-456' };
    render(<ProjectDetailsPage params={differentParams} />);
    
    expect(screen.getByText('Details for project another-project-456 will be displayed here.')).toBeInTheDocument();
  });

  it('has proper structure with div container', () => {
    const { container } = render(<ProjectDetailsPage params={mockParams} />);
    
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild?.nodeName).toBe('DIV');
  });
});
import { render, screen } from '@testing-library/react';
import ProjectsPage from './page';

describe('ProjectsPage', () => {
  it('renders projects page with heading', () => {
    render(<ProjectsPage />);
    
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('List of projects will be displayed here.')).toBeInTheDocument();
  });

  it('renders the correct heading element', () => {
    render(<ProjectsPage />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Projects');
  });

  it('has proper structure with div container', () => {
    const { container } = render(<ProjectsPage />);
    
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild?.nodeName).toBe('DIV');
  });
});
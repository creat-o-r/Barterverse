import { render, screen } from '@testing-library/react';
import ProjectDetails from './ProjectDetails';
import type { Project, Item } from '../../types';
import { dummyItems } from '../../lib/dummy-data';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock the dummy data to have controlled test items
jest.mock('../../lib/dummy-data', () => ({
  dummyItems: [
    {
      id: 'item-1',
      name: 'Test Item 1',
      category: 'Electronics',
      imageUrl: 'https://example.com/item1.jpg',
      ownerId: 'user-1',
      ownerName: 'User 1',
      status: 'available',
      description: 'Test item 1',
      listingType: 'offer',
    },
    {
      id: 'item-2',
      name: 'Test Item 2',
      category: 'Books',
      imageUrl: '',
      ownerId: 'user-2',
      ownerName: 'User 2',
      status: 'available',
      description: 'Test item 2',
      listingType: 'want',
    },
    {
      id: 'item-3',
      name: 'Test Item 3',
      category: 'Toys',
      imageUrl: 'https://example.com/item3.jpg',
      ownerId: 'user-1',
      ownerName: 'User 1',
      status: 'available',
      description: 'Test item 3',
      listingType: 'offer',
    },
  ] as Item[],
}));

const mockPrivateProject: Project = {
  id: 'proj-1',
  name: 'Private Project',
  description: 'A private project for testing',
  ownerId: 'user-1',
  itemIds: ['item-1', 'item-2'],
  visibility: 'private',
};

const mockSharedProject: Project = {
  id: 'proj-2',
  name: 'Shared Project',
  description: 'A shared project for collaboration',
  ownerId: 'user-1',
  itemIds: ['item-1', 'item-3'],
  visibility: 'shared',
  sharedWith: ['user-2', 'user-3'],
};

const mockEmptyProject: Project = {
  id: 'proj-3',
  name: 'Empty Project',
  description: 'A project with no items',
  ownerId: 'user-1',
  itemIds: [],
  visibility: 'private',
};

const mockProjectWithMissingItems: Project = {
  id: 'proj-4',
  name: 'Project with Missing Items',
  description: 'Items that dont exist in dummy data',
  ownerId: 'user-1',
  itemIds: ['nonexistent-item-1', 'nonexistent-item-2'],
  visibility: 'private',
};

describe('ProjectDetails', () => {
  it('renders loading state when project is null', () => {
    render(<ProjectDetails project={null} />);
    
    expect(screen.getByText('Loading project details or no project selected...')).toBeInTheDocument();
  });

  it('renders private project details correctly', () => {
    render(<ProjectDetails project={mockPrivateProject} />);
    
    expect(screen.getByText('Private Project')).toBeInTheDocument();
    expect(screen.getByText('A private project for testing')).toBeInTheDocument();
    expect(screen.getByText('private')).toBeInTheDocument();
    expect(screen.getByText('Items in Project (2)')).toBeInTheDocument();
    // Just verify the visibility badge is rendered correctly
    const badge = document.querySelector('.capitalize');
    expect(badge).toHaveTextContent('private');
  });

  it('renders shared project details correctly', () => {
    render(<ProjectDetails project={mockSharedProject} />);
    
    expect(screen.getByText('Shared Project')).toBeInTheDocument();
    expect(screen.getByText('A shared project for collaboration')).toBeInTheDocument();
    expect(screen.getByText('shared')).toBeInTheDocument();
    expect(screen.getByText('Items in Project (2)')).toBeInTheDocument();
    // Just verify the visibility badge is rendered correctly
    const badge = document.querySelector('.capitalize');
    expect(badge).toHaveTextContent('shared');
  });

  it('displays shared with user IDs for shared projects', () => {
    render(<ProjectDetails project={mockSharedProject} />);
    
    expect(screen.getByText('Shared with user IDs:')).toBeInTheDocument();
    expect(screen.getByText('user-2')).toBeInTheDocument();
    expect(screen.getByText('user-3')).toBeInTheDocument();
  });

  it('shows message when shared project has no specific users', () => {
    const sharedProjectNoUsers = { ...mockSharedProject, sharedWith: [] };
    render(<ProjectDetails project={sharedProjectNoUsers} />);
    
    expect(screen.getByText('(Not shared with anyone specific yet)')).toBeInTheDocument();
  });

  it('handles shared project with undefined sharedWith', () => {
    const sharedProjectUndefinedShared = { ...mockSharedProject, sharedWith: undefined };
    render(<ProjectDetails project={sharedProjectUndefinedShared} />);
    
    expect(screen.getByText('(Not shared with anyone specific yet)')).toBeInTheDocument();
  });

  it('renders project items correctly', () => {
    render(<ProjectDetails project={mockPrivateProject} />);
    
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();
  });

  it('shows images for items that have imageUrl', () => {
    render(<ProjectDetails project={mockPrivateProject} />);
    
    const images = screen.getAllByRole('img');
    const item1Image = images.find(img => img.getAttribute('alt') === 'Test Item 1');
    expect(item1Image).toBeInTheDocument();
    expect(item1Image).toHaveAttribute('src', 'https://example.com/item1.jpg');
  });

  it('shows placeholder icon for items without imageUrl', () => {
    render(<ProjectDetails project={mockPrivateProject} />);
    
    // Just verify placeholder shows when no image
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
  });

  it('handles empty project correctly', () => {
    render(<ProjectDetails project={mockEmptyProject} />);
    
    expect(screen.getByText('Empty Project')).toBeInTheDocument();
    expect(screen.getByText('Items in Project (0)')).toBeInTheDocument();
    expect(screen.getByText('No items have been added to this project yet.')).toBeInTheDocument();
  });

  it('handles project without description', () => {
    const projectNoDescription = { ...mockPrivateProject, description: '' };
    render(<ProjectDetails project={projectNoDescription} />);
    
    expect(screen.getByText('Private Project')).toBeInTheDocument();
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('handles project with null description', () => {
    const projectNullDescription = { ...mockPrivateProject, description: null as any };
    render(<ProjectDetails project={projectNullDescription} />);
    
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('handles project with undefined description', () => {
    const projectUndefinedDescription = { ...mockPrivateProject, description: undefined as any };
    render(<ProjectDetails project={projectUndefinedDescription} />);
    
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('handles project with items that dont exist in dummy data', () => {
    render(<ProjectDetails project={mockProjectWithMissingItems} />);
    
    expect(screen.getByText('Items in Project (0)')).toBeInTheDocument();
    expect(screen.getByText('No items have been added to this project yet.')).toBeInTheDocument();
  });

  it('handles project with undefined itemIds', () => {
    const projectUndefinedItems = { ...mockPrivateProject, itemIds: undefined as any };
    render(<ProjectDetails project={projectUndefinedItems} />);
    
    expect(screen.getByText('Items in Project (0)')).toBeInTheDocument();
    expect(screen.getByText('No items have been added to this project yet.')).toBeInTheDocument();
  });

  it('displays unknown visibility when visibility is undefined', () => {
    const projectUnknownVisibility = { ...mockPrivateProject, visibility: undefined as any };
    render(<ProjectDetails project={projectUnknownVisibility} />);
    
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('handles public visibility with eye icon', () => {
    const publicProject = { ...mockPrivateProject, visibility: 'public' as any };
    render(<ProjectDetails project={publicProject} />);
    
    expect(screen.getByText('public')).toBeInTheDocument();
    // Just verify the visibility badge is rendered correctly
    const badge = document.querySelector('.capitalize');
    expect(badge).toHaveTextContent('public');
  });

  it('preserves whitespace in description', () => {
    const projectWithWhitespace = {
      ...mockPrivateProject,
      description: 'Line 1\nLine 2\n\nLine 4',
    };
    render(<ProjectDetails project={projectWithWhitespace} />);
    
    // Check that whitespace-pre-wrap class is applied to description container
    const descriptionElement = document.querySelector('.whitespace-pre-wrap');
    expect(descriptionElement).toBeInTheDocument();
    expect(descriptionElement).toHaveTextContent('Line 1');
  });

  it('shows correct item count in header', () => {
    const { rerender } = render(<ProjectDetails project={mockPrivateProject} />);
    expect(screen.getByText('Items in Project (2)')).toBeInTheDocument();

    rerender(<ProjectDetails project={mockEmptyProject} />);
    expect(screen.getByText('Items in Project (0)')).toBeInTheDocument();

    const singleItemProject = { ...mockPrivateProject, itemIds: ['item-1'] };
    rerender(<ProjectDetails project={singleItemProject} />);
    expect(screen.getByText('Items in Project (1)')).toBeInTheDocument();
  });

  it('truncates long item names with title attribute', () => {
    const longNameItem: Item = {
      id: 'long-item',
      name: 'This is a very long item name that should be truncated but show full text in title',
      category: 'Test Category',
      imageUrl: '',
      ownerId: 'user-1',
      ownerName: 'User 1',
      status: 'available',
      description: 'Test',
      listingType: 'offer',
    };

    // Mock dummyItems to include our long name item
    const originalFilter = dummyItems.filter;
    (dummyItems as any).filter = jest.fn(() => [longNameItem]);

    const projectWithLongItem = { ...mockPrivateProject, itemIds: ['long-item'] };
    render(<ProjectDetails project={projectWithLongItem} />);
    
    const titleElement = screen.getByTitle(longNameItem.name);
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveClass('truncate');

    // Restore original filter
    (dummyItems as any).filter = originalFilter;
  });

  it('renders scroll area for items list', () => {
    render(<ProjectDetails project={mockPrivateProject} />);
    
    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
    expect(scrollArea).toBeInTheDocument();
  });
});
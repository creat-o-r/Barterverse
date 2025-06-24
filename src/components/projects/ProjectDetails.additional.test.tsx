import { render, screen } from '@testing-library/react';
import ProjectDetails from './ProjectDetails';
import type { Project, Item } from '../../types';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock dummy data for comprehensive coverage
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
      name: 'Test Item 2 with very long name that should be truncated in the UI',
      category: 'Books & Literature',
      imageUrl: '',
      ownerId: 'user-2',
      ownerName: 'User 2',
      status: 'available',
      description: 'Test item 2',
      listingType: 'want',
    },
  ] as Item[],
}));

describe('ProjectDetails Additional Coverage', () => {
  it('handles all edge cases for maximum coverage', () => {
    const edgeCaseProject: Project = {
      id: 'edge-1',
      name: '',
      description: null as any,
      ownerId: 'user-1',
      itemIds: null as any,
      visibility: null as any,
    };

    render(<ProjectDetails project={edgeCaseProject} />);
    
    expect(screen.getByText('Items in Project (0)')).toBeInTheDocument();
    expect(screen.getByText('No items have been added to this project yet.')).toBeInTheDocument();
  });

  it('handles projects with missing item data', () => {
    const missingItemsProject: Project = {
      id: 'missing-1',
      name: 'Missing Items Project',
      description: 'Items that do not exist',
      ownerId: 'user-1',
      itemIds: ['nonexistent-1', 'nonexistent-2', 'nonexistent-3'],
      visibility: 'private',
    };

    render(<ProjectDetails project={missingItemsProject} />);
    
    expect(screen.getByText('Items in Project (0)')).toBeInTheDocument();
    expect(screen.getByText('No items have been added to this project yet.')).toBeInTheDocument();
  });

  it('handles mixed existing and missing items', () => {
    const mixedProject: Project = {
      id: 'mixed-1',
      name: 'Mixed Project',
      description: 'Some items exist, some do not',
      ownerId: 'user-1',
      itemIds: ['item-1', 'nonexistent-1', 'item-2', 'nonexistent-2'],
      visibility: 'shared',
      sharedWith: ['user-3', 'user-4', 'user-5'],
    };

    render(<ProjectDetails project={mixedProject} />);
    
    expect(screen.getByText('Items in Project (2)')).toBeInTheDocument();
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('Test Item 2 with very long name that should be truncated in the UI')).toBeInTheDocument();
  });

  it('handles empty shared project comprehensively', () => {
    const emptySharedProject: Project = {
      id: 'empty-shared-1',
      name: 'Empty Shared Project',
      description: 'No items yet',
      ownerId: 'user-1',
      itemIds: [],
      visibility: 'shared',
      sharedWith: [],
    };

    render(<ProjectDetails project={emptySharedProject} />);
    
    expect(screen.getByText('(Not shared with anyone specific yet)')).toBeInTheDocument();
    expect(screen.getByText('shared')).toBeInTheDocument();
    expect(screen.getByText('Items in Project (0)')).toBeInTheDocument();
  });

  it('handles project with many shared users', () => {
    const manyUsersProject: Project = {
      id: 'many-users-1',
      name: 'Many Users Project',
      description: 'Shared with many users',
      ownerId: 'user-1',
      itemIds: ['item-1', 'item-2'],
      visibility: 'shared',
      sharedWith: ['user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'],
    };

    render(<ProjectDetails project={manyUsersProject} />);
    
    expect(screen.getByText('Shared with user IDs:')).toBeInTheDocument();
    expect(screen.getByText('user-2')).toBeInTheDocument();
    expect(screen.getByText('user-10')).toBeInTheDocument();
  });

  it('handles all visibility types with all combinations', () => {
    const visibilityTests = [
      { visibility: 'private' as const },
      { visibility: 'shared' as const },
      { visibility: 'public' as any },
      { visibility: '' as any },
      { visibility: 'invalid' as any },
      { visibility: undefined as any },
    ];

    visibilityTests.forEach((test, index) => {
      const project: Project = {
        id: `vis-${index}`,
        name: `Visibility Test ${index}`,
        description: `Testing ${test.visibility} visibility`,
        ownerId: 'user-1',
        itemIds: index % 2 === 0 ? ['item-1'] : [],
        visibility: test.visibility,
        sharedWith: test.visibility === 'shared' ? ['user-2'] : undefined,
      };

      const { unmount } = render(<ProjectDetails project={project} />);
      
      expect(screen.getByText(`Visibility Test ${index}`)).toBeInTheDocument();
      
      unmount();
    });
  });

  it('handles extremely long descriptions with whitespace', () => {
    const longDescProject: Project = {
      id: 'long-desc-1',
      name: 'Long Description Project',
      description: 'This is a very long description\n\nWith multiple lines\n\n\nAnd lots of whitespace\n\nThat should be preserved\n\nUsing whitespace-pre-wrap class\n\nAnd should display correctly\n\nWithout breaking the layout',
      ownerId: 'user-1',
      itemIds: ['item-1', 'item-2'],
      visibility: 'private',
    };

    render(<ProjectDetails project={longDescProject} />);
    
    const descriptionElement = document.querySelector('.whitespace-pre-wrap');
    expect(descriptionElement).toBeInTheDocument();
    expect(descriptionElement).toHaveTextContent('This is a very long description');
  });

  it('handles scroll area interactions', () => {
    const manyItemsProject: Project = {
      id: 'many-items-1',
      name: 'Many Items Project',
      description: 'Project with many items to test scrolling',
      ownerId: 'user-1',
      itemIds: ['item-1', 'item-2', 'item-1', 'item-2', 'item-1', 'item-2'], // Duplicate IDs to test filtering
      visibility: 'shared',
      sharedWith: ['user-2'],
    };

    render(<ProjectDetails project={manyItemsProject} />);
    
    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
    expect(scrollArea).toBeInTheDocument();
    expect(screen.getByText('Items in Project (2)')).toBeInTheDocument(); // Should filter duplicates
  });
});
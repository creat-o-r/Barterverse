import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useToast } from '@/hooks/use-toast';
import ManageItemProjectsButton from './ManageItemProjectsButton';
import * as projectService from '../../services/project-service';
import type { Item, Project } from '../../types';

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock the project service
jest.mock('../../services/project-service', () => ({
  getProjectsByOwner: jest.fn(),
  getPublicProjects: jest.fn(),
  createProject: jest.fn(),
  addItemToProject: jest.fn(),
  removeItemFromProject: jest.fn(),
}));

const mockToast = jest.fn();
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockItem: Item = {
  id: 'item-1',
  name: 'Test Item',
  description: 'A test item',
  imageUrl: 'https://example.com/item.jpg',
  category: 'Electronics',
  ownerId: 'user-1',
  ownerName: 'User 1',
  status: 'available',
  listingType: 'offer',
};

const mockPrivateProject: Project = {
  id: 'proj-1',
  name: 'Private Project',
  description: 'A private project',
  ownerId: 'user-1',
  itemIds: [],
  visibility: 'private',
};

const mockSharedProject: Project = {
  id: 'proj-2',
  name: 'Shared Project',
  description: 'A shared project',
  ownerId: 'user-2',
  itemIds: ['item-1'],
  visibility: 'shared',
  sharedWith: ['user-1'],
};

describe('ManageItemProjectsButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({ toast: mockToast });
    (projectService.getProjectsByOwner as jest.Mock).mockResolvedValue([mockPrivateProject]);
    (projectService.getPublicProjects as jest.Mock).mockResolvedValue([mockSharedProject]);
  });

  it('returns null when user is not owner', () => {
    const { container } = render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={false} 
        currentUserId="user-2" 
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders manage button when user is owner', () => {
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    expect(screen.getByText('Manage Project Memberships')).toBeInTheDocument();
  });

  it('opens manage modal when button is clicked', async () => {
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      expect(screen.getByText('Add or remove "Test Item" from your projects.')).toBeInTheDocument();
    });
  });

  it('loads projects when modal opens', async () => {
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      expect(projectService.getProjectsByOwner).toHaveBeenCalledWith('user-1');
      expect(projectService.getPublicProjects).toHaveBeenCalled();
    });
  });

  it('displays private and shared projects separately', async () => {
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      expect(screen.getByText('My Private Projects')).toBeInTheDocument();
      expect(screen.getByText('All Shared Projects')).toBeInTheDocument();
      expect(screen.getByText('Private Project')).toBeInTheDocument();
      expect(screen.getByText('Shared Project')).toBeInTheDocument();
    });
  });

  it('shows add button for projects without the item', async () => {
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      const addButtons = screen.getAllByText('Add');
      expect(addButtons).toHaveLength(1); // Private project doesn't have the item
    });
  });

  it('shows remove button for projects with the item', async () => {
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      const removeButtons = screen.getAllByText('Remove');
      expect(removeButtons).toHaveLength(1); // Shared project has the item
    });
  });

  it('adds item to project successfully', async () => {
    const updatedProject = { ...mockPrivateProject, itemIds: ['item-1'] };
    (projectService.addItemToProject as jest.Mock).mockResolvedValue(updatedProject);
    
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);
    });
    
    await waitFor(() => {
      expect(projectService.addItemToProject).toHaveBeenCalledWith('proj-1', 'item-1', 'user-1');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: "Item added to project 'Private Project'.",
      });
    });
  });

  it('removes item from project successfully', async () => {
    const updatedProject = { ...mockSharedProject, itemIds: [] };
    (projectService.removeItemFromProject as jest.Mock).mockResolvedValue(updatedProject);
    
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      expect(screen.getByText('All Shared Projects')).toBeInTheDocument();
    });
    
    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);
    
    await waitFor(() => {
      expect(projectService.removeItemFromProject).toHaveBeenCalledWith('proj-2', 'item-1', 'user-1');
    }, { timeout: 3000 });
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: "Item removed from project 'Shared Project'.",
      });
    });
  });

  it('handles add item permission denied', async () => {
    (projectService.addItemToProject as jest.Mock).mockResolvedValue(undefined);
    
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);
    });
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Could not add item to project.',
        variant: 'destructive',
      });
    });
  });

  it('handles remove item permission denied', async () => {
    (projectService.removeItemFromProject as jest.Mock).mockResolvedValue(undefined);
    
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      expect(screen.getByText('All Shared Projects')).toBeInTheDocument();
    });
    
    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Permission Denied',
        description: 'You can only remove items from projects you own.',
        variant: 'destructive',
      });
    }, { timeout: 3000 });
  });

  it('opens create project modal', async () => {
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Create New Project & Add Item'));
    });
    
    await waitFor(() => {
      expect(screen.getByText('Create New Project')).toBeInTheDocument();
      expect(screen.getByText('Create a new project and add "Test Item" to it.')).toBeInTheDocument();
    });
  });

  it('creates new project and adds item successfully', async () => {
    const newProject = { id: 'proj-new', name: 'New Project', ownerId: 'user-1', itemIds: [], visibility: 'private' as const, description: 'Project created for item: Test Item' };
    const projectWithItem = { ...newProject, itemIds: ['item-1'] };
    
    (projectService.createProject as jest.Mock).mockResolvedValue(newProject);
    (projectService.addItemToProject as jest.Mock).mockResolvedValue(projectWithItem);
    
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Create New Project & Add Item'));
    });
    
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('e.g., Summer Collection');
      fireEvent.change(nameInput, { target: { value: 'New Project' } });
      
      fireEvent.click(screen.getByText('Create & Add Item'));
    });
    
    await waitFor(() => {
      expect(projectService.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: 'Project created for item: Test Item',
        ownerId: 'user-1',
        itemIds: [],
        visibility: 'private',
      });
      expect(projectService.addItemToProject).toHaveBeenCalledWith('proj-new', 'item-1', 'user-1');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Project Created & Item Added',
        description: "'Test Item' added to new project 'New Project'.",
      });
    });
  });

  it('validates project name is required', async () => {
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      expect(screen.getByText('Create New Project & Add Item')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Create New Project & Add Item'));
    
    await waitFor(() => {
      expect(screen.getByText('Create New Project')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Create & Add Item'));
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Validation Error',
        description: 'Project name is required.',
        variant: 'destructive',
      });
    }, { timeout: 3000 });
  });

  it('handles project creation failure', async () => {
    (projectService.createProject as jest.Mock).mockRejectedValue(new Error('Creation failed'));
    
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Create New Project & Add Item'));
    });
    
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('e.g., Summer Collection');
      fireEvent.change(nameInput, { target: { value: 'New Project' } });
      
      fireEvent.click(screen.getByText('Create & Add Item'));
    });
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Could not create project or add item.',
        variant: 'destructive',
      });
    });
  });

  it('shows loading state when creating project', async () => {
    const newProject = { id: 'proj-new', name: 'New Project', ownerId: 'user-1', itemIds: [], visibility: 'private' as const, description: 'Project created for item: Test Item' };
    (projectService.createProject as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(newProject), 100)));
    
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Create New Project & Add Item'));
    });
    
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('e.g., Summer Collection');
      fireEvent.change(nameInput, { target: { value: 'New Project' } });
      
      fireEvent.click(screen.getByText('Create & Add Item'));
    });
    
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('handles shared project visibility selection', async () => {
    const newProject = { id: 'proj-new', name: 'New Project', ownerId: 'user-1', itemIds: [], visibility: 'shared' as const, description: 'Project created for item: Test Item', sharedWith: [] };
    const projectWithItem = { ...newProject, itemIds: ['item-1'] };
    
    (projectService.createProject as jest.Mock).mockResolvedValue(newProject);
    (projectService.addItemToProject as jest.Mock).mockResolvedValue(projectWithItem);
    
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Create New Project & Add Item'));
    });
    
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('e.g., Summer Collection');
      fireEvent.change(nameInput, { target: { value: 'New Project' } });
      
      // Change visibility to shared
      fireEvent.click(screen.getByText('Private (Only you can add items; only you can see)'));
      fireEvent.click(screen.getByText('Shared (Anyone can add items; everyone can see)'));
      
      fireEvent.click(screen.getByText('Create & Add Item'));
    });
    
    await waitFor(() => {
      expect(projectService.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: 'Project created for item: Test Item',
        ownerId: 'user-1',
        itemIds: [],
        visibility: 'shared',
        sharedWith: [],
      });
    });
  });

  it('shows no projects message when no projects available', async () => {
    (projectService.getProjectsByOwner as jest.Mock).mockResolvedValue([]);
    (projectService.getPublicProjects as jest.Mock).mockResolvedValue([]);
    
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      expect(screen.getByText('No projects available to add this item to.')).toBeInTheDocument();
    });
  });

  it('handles loading error gracefully', async () => {
    (projectService.getProjectsByOwner as jest.Mock).mockRejectedValue(new Error('Loading failed'));
    
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Could not load projects.',
        variant: 'destructive',
      });
    });
  });

  it('disables remove button for shared projects not owned by current user', async () => {
    const sharedProjectNotOwned = { ...mockSharedProject, ownerId: 'other-user' };
    (projectService.getPublicProjects as jest.Mock).mockResolvedValue([sharedProjectNotOwned]);
    
    render(
      <ManageItemProjectsButton 
        item={mockItem} 
        isOwner={true} 
        currentUserId="user-1" 
      />
    );
    
    fireEvent.click(screen.getByText('Manage Project Memberships'));
    
    await waitFor(() => {
      const removeButton = screen.getByText('Remove');
      expect(removeButton).toBeDisabled();
    });
  });
});
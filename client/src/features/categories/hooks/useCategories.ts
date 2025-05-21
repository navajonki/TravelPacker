/**
 * Custom hook to fetch and manage categories for a packing list
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CategoryWithItems, ApiError } from '@shared/types';
import { InsertCategory } from '@shared/schema';
import { CategoryApi } from '@/api/apiClient';
import { invalidateCategories, invalidateAllPackingListData } from '@/services/queryInvalidation';
import { createLogger } from '@/services/logging';

const logger = createLogger('categories');

interface UseCategoriesProps {
  packingListId: number;
}

interface UseCategoriesResult {
  categories: CategoryWithItems[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  createCategory: (data: InsertCategory) => Promise<void>;
  updateCategory: (id: number, data: Partial<InsertCategory>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
}

export default function useCategories({ packingListId }: UseCategoriesProps): UseCategoriesResult {
  const queryClient = useQueryClient();
  
  // Query to fetch all categories for a packing list
  const {
    data: categories = [],
    isLoading,
    isError,
    error
  } = useQuery<CategoryWithItems[], ApiError>({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
    queryFn: () => CategoryApi.getAllForPackingList(packingListId),
    enabled: !!packingListId,
  });
  
  // Mutation to create a new category
  const createMutation = useMutation({
    mutationFn: (data: InsertCategory) => {
      logger.debug('Creating category', { packingListId, name: data.name });
      return CategoryApi.create(data);
    },
    onSuccess: () => {
      logger.info('Category created successfully', { packingListId });
      invalidateCategories(queryClient, packingListId);
    },
    onError: (error: ApiError) => {
      logger.error('Failed to create category', error, { packingListId });
    }
  });
  
  // Mutation to update an existing category
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertCategory> }) => {
      logger.debug('Updating category', { categoryId: id, updates: data });
      return CategoryApi.update(id, data);
    },
    onSuccess: () => {
      logger.info('Category updated successfully');
      invalidateCategories(queryClient, packingListId);
    },
    onError: (error: ApiError) => {
      logger.error('Failed to update category', error);
    }
  });
  
  // Mutation to delete a category
  const deleteMutation = useMutation({
    mutationFn: (categoryId: number) => {
      logger.debug('Deleting category', { categoryId });
      return CategoryApi.delete(categoryId);
    },
    onSuccess: () => {
      logger.info('Category deleted successfully');
      // Invalidate all data since items might have been affected
      invalidateAllPackingListData(queryClient, packingListId);
    },
    onError: (error: ApiError) => {
      logger.error('Failed to delete category', error);
    }
  });

  // Wrapped mutation handlers with nicer API
  const createCategory = async (data: InsertCategory): Promise<void> => {
    await createMutation.mutateAsync(data);
  };
  
  const updateCategory = async (id: number, data: Partial<InsertCategory>): Promise<void> => {
    await updateMutation.mutateAsync({ id, data });
  };
  
  const deleteCategory = async (id: number): Promise<void> => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    categories,
    isLoading,
    isError,
    error: error || null,
    createCategory,
    updateCategory,
    deleteCategory
  };
}
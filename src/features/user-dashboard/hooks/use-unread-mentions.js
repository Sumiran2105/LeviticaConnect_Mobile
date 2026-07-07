import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/client";

/**
 * Hook to fetch unread mentions count
 * Automatically refetches when user navigates to activity page
 */
export function useUnreadMentions() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["unreadMentions"],
    queryFn: async () => {
      try {
        const response = await apiClient.get( );
        
        // Handle different response formats
        if (response.data?.count !== undefined) {
          return response.data.count;
        }
        
        if (response.data?.unreadCount !== undefined) {
          return response.data.unreadCount;
        }
        
        if (Array.isArray(response.data)) {
          return response.data.length;
        }
        
        if (response.data?.data) {
          return Array.isArray(response.data.data) 
            ? response.data.data.length 
            : response.data.data.count || 0;
        }
        
        return 0;
      } catch (err) {
        console.error('Failed to fetch unread mentions:', err);
        return 0;
      }
    },
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: false, // Disabled auto-refetch
    refetchOnWindowFocus: false, // Disabled refetch on focus
  });

  return {
    unreadCount: data || 0,
    isLoading,
    error,
    refetch,
  };
}

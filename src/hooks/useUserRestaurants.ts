import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Restaurant {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  created_at: string;
}

export function useUserRestaurants() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["user-restaurants", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_restaurants")
        .select("restaurant_id, restaurants(id, code, name, address, city, created_at)")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data ?? []).map((r: any) => r.restaurants as Restaurant);
    },
    enabled: !!user,
  });

  return {
    restaurants: query.data ?? [],
    loading: query.isLoading,
    refetch: query.refetch,
  };
}

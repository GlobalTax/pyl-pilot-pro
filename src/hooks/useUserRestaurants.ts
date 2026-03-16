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
  const { user, profile, isAdmin } = useAuth();
  const isNrro = profile?.user_type === "nrro";
  const canSeeAll = isNrro || isAdmin;

  const query = useQuery({
    queryKey: ["user-restaurants", user?.id, profile?.user_type, isAdmin],
    queryFn: async () => {
      if (!user) return [];

      if (canSeeAll) {
        // Admins and NRRO users can see all restaurants
        const { data, error } = await supabase
          .from("restaurants")
          .select("id, code, name, address, city, created_at")
          .order("code");
        if (error) throw error;
        return (data ?? []) as Restaurant[];
      }

      // Franquiciados only see assigned restaurants
      const { data, error } = await supabase
        .from("user_restaurants")
        .select("restaurant_id, restaurants(id, code, name, address, city, created_at)")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data ?? []).map((r: any) => r.restaurants as Restaurant);
    },
    enabled: !!user && !!profile,
  });

  return {
    restaurants: query.data ?? [],
    loading: query.isLoading,
    isNrro,
    refetch: query.refetch,
  };
}

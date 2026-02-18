import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRestaurants } from "@/hooks/useUserRestaurants";
import { generatePYL, type PYLData } from "@/lib/pyl";

export interface PylFile {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  local_code: string;
  year: string;
  month: string;
  filename: string;
  content: string;
  lines_json: number[];
  source: string;
  created_at: string;
}

export interface PylFileWithProfile extends PylFile {
  profiles?: { full_name: string; email: string; company: string } | null;
}

export function usePylHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pyl-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pyl_files")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PylFile[];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pyl_files").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pyl-history"] }),
  });

  return {
    pylFiles: query.data ?? [],
    loading: query.isLoading,
    refetch: query.refetch,
    deletePyl: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,
  };
}

export function useAdminPylHistory() {
  const query = useQuery({
    queryKey: ["pyl-history-admin"],
    queryFn: async () => {
      const { data: pylData, error } = await supabase
        .from("pyl_files")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((pylData ?? []).map((p) => p.user_id))];
      let profileMap: Record<string, { full_name: string; email: string; company: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, company")
          .in("id", userIds);
        if (profiles) {
          for (const p of profiles) {
            profileMap[p.id] = { full_name: p.full_name, email: p.email, company: p.company };
          }
        }
      }

      return (pylData ?? []).map((p) => ({
        ...p,
        lines_json: p.lines_json as unknown as number[],
        profiles: profileMap[p.user_id] ?? null,
      })) as PylFileWithProfile[];
    },
  });

  return {
    pylFiles: query.data ?? [],
    loading: query.isLoading,
    refetch: query.refetch,
  };
}

export async function checkExistingPyl(localCode: string, year: string, month: string): Promise<PylFile | null> {
  const { data } = await supabase
    .from("pyl_files")
    .select("*")
    .eq("local_code", localCode)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  return data as PylFile | null;
}

export async function savePylToDb(params: {
  userId: string;
  localCode: string;
  year: string;
  month: string;
  lines: number[];
  source: string;
  restaurants: { id: string; code: string }[];
  existingId?: string;
}): Promise<void> {
  const { userId, localCode, year, month, lines, source, restaurants, existingId } = params;
  const yy = year.slice(-2);
  const filename = `${yy}${month}${localCode}.pyl`;
  const content = generatePYL({ year, month, localCode, lines });
  const restaurant = restaurants.find((r) => r.code === localCode);

  const record = {
    user_id: userId,
    restaurant_id: restaurant?.id ?? null,
    local_code: localCode,
    year,
    month,
    filename,
    content,
    lines_json: lines,
    source,
  };

  if (existingId) {
    const { error } = await supabase.from("pyl_files").update(record).eq("id", existingId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("pyl_files").insert(record);
    if (error) throw error;
  }
}

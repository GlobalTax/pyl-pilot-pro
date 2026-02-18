import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import type { Profile } from "@/contexts/AuthContext";

type Filter = "all" | "pending" | "approved" | "rejected";

const Admin = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) {
      toast.error("Error al cargar usuarios");
      console.error(error);
    } else {
      setProfiles((data ?? []) as Profile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const filteredProfiles = useMemo(() => {
    if (filter === "all") return profiles;
    return profiles.filter((p) => p.status === filter);
  }, [profiles, filter]);

  const updateStatus = async (profileId: string, newStatus: "approved" | "rejected") => {
    setUpdating(profileId);
    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", profileId);
    if (error) {
      toast.error("Error al actualizar estado");
      console.error(error);
    } else {
      toast.success(`Usuario ${newStatus === "approved" ? "aprobado" : "rechazado"}`);
      setProfiles((prev) => prev.map((p) => p.id === profileId ? { ...p, status: newStatus } : p));
    }
    setUpdating(null);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success hover:bg-success/90 text-success-foreground gap-1"><CheckCircle2 size={12} /> Aprobado</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle size={12} /> Rechazado</Badge>;
      default:
        return <Badge className="bg-warning hover:bg-warning/90 text-warning-foreground gap-1"><Clock size={12} /> Pendiente</Badge>;
    }
  };

  const counts = useMemo(() => ({
    all: profiles.length,
    pending: profiles.filter((p) => p.status === "pending").length,
    approved: profiles.filter((p) => p.status === "approved").length,
    rejected: profiles.filter((p) => p.status === "rejected").length,
  }), [profiles]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2.5">
          <Shield className="text-primary" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-medium text-foreground">Panel de Administración</h1>
          <p className="text-sm text-muted-foreground">Gestión de usuarios y aprobaciones</p>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="w-full">
        <TabsList>
          <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pendientes ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Aprobados ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rechazados ({counts.rejected})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : filteredProfiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No hay usuarios en esta categoría</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                      <TableCell>{p.email}</TableCell>
                      <TableCell>{p.company || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(p.created_at).toLocaleDateString("es-ES")}
                      </TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell className="text-right">
                        {p.id !== user?.id && (
                          <div className="flex items-center justify-end gap-2">
                            {p.status !== "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-success border-success/30 hover:bg-success/10 gap-1"
                                onClick={() => updateStatus(p.id, "approved")}
                                disabled={updating === p.id}
                              >
                                {updating === p.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                Aprobar
                              </Button>
                            )}
                            {p.status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                                onClick={() => updateStatus(p.id, "rejected")}
                                disabled={updating === p.id}
                              >
                                {updating === p.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                Rechazar
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;

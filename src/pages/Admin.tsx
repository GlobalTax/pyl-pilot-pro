import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, CheckCircle2, XCircle, Clock, Loader2, Store, Plus, Users, Trash2 } from "lucide-react";
import type { Profile } from "@/contexts/AuthContext";

type Filter = "all" | "pending" | "approved" | "rejected";

interface Restaurant {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  created_at: string;
}

interface UserRestaurantAssignment {
  user_id: string;
  restaurant_id: string;
  profiles: { full_name: string; email: string } | null;
}

const Admin = () => {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState("usuarios");

  // --- Users state ---
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [userRestaurantMap, setUserRestaurantMap] = useState<Record<string, Restaurant[]>>({});

  // --- Restaurants state ---
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restLoading, setRestLoading] = useState(true);
  const [restCounts, setRestCounts] = useState<Record<string, number>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageTarget, setManageTarget] = useState<Restaurant | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<UserRestaurantAssignment[]>([]);
  const [saving, setSaving] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [assignUserId, setAssignUserId] = useState("");

  // --- Create user state ---
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserCompany, setNewUserCompany] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Error al cargar usuarios"); console.error(error); }
    else setProfiles((data ?? []) as Profile[]);
    setLoading(false);
  };

  const fetchUserRestaurants = async () => {
    const { data } = await supabase.from("user_restaurants").select("user_id, restaurant_id, restaurants(code, name)");
    if (data) {
      const map: Record<string, Restaurant[]> = {};
      for (const row of data as any[]) {
        if (!map[row.user_id]) map[row.user_id] = [];
        if (row.restaurants) map[row.user_id].push(row.restaurants);
      }
      setUserRestaurantMap(map);
    }
  };

  const fetchRestaurants = async () => {
    setRestLoading(true);
    const { data, error } = await supabase.from("restaurants").select("*").order("code");
    if (error) { toast.error("Error al cargar restaurantes"); }
    else setRestaurants((data ?? []) as Restaurant[]);

    // Count assignments
    const { data: assignments } = await supabase.from("user_restaurants").select("restaurant_id");
    if (assignments) {
      const counts: Record<string, number> = {};
      for (const a of assignments) {
        counts[a.restaurant_id] = (counts[a.restaurant_id] || 0) + 1;
      }
      setRestCounts(counts);
    }
    setRestLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
    fetchUserRestaurants();
    fetchRestaurants();
  }, []);

  const filteredProfiles = useMemo(() => {
    if (filter === "all") return profiles;
    return profiles.filter((p) => p.status === filter);
  }, [profiles, filter]);

  const updateStatus = async (profileId: string, newStatus: "approved" | "rejected") => {
    setUpdating(profileId);
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", profileId);
    if (error) { toast.error("Error al actualizar estado"); }
    else {
      toast.success(`Usuario ${newStatus === "approved" ? "aprobado" : "rechazado"}`);
      setProfiles((prev) => prev.map((p) => p.id === profileId ? { ...p, status: newStatus } : p));
    }
    setUpdating(null);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-success hover:bg-success/90 text-success-foreground gap-1"><CheckCircle2 size={12} /> Aprobado</Badge>;
      case "rejected": return <Badge variant="destructive" className="gap-1"><XCircle size={12} /> Rechazado</Badge>;
      default: return <Badge className="bg-warning hover:bg-warning/90 text-warning-foreground gap-1"><Clock size={12} /> Pendiente</Badge>;
    }
  };

  const counts = useMemo(() => ({
    all: profiles.length,
    pending: profiles.filter((p) => p.status === "pending").length,
    approved: profiles.filter((p) => p.status === "approved").length,
    rejected: profiles.filter((p) => p.status === "rejected").length,
  }), [profiles]);

  // --- Restaurant admin handlers ---
  const handleCreateRestaurant = async () => {
    if (!newCode.trim() || !newName.trim()) { toast.error("Código y nombre obligatorios"); return; }
    setSaving(true);
    const { error } = await supabase.from("restaurants").insert({
      code: newCode.trim(), name: newName.trim(),
      address: newAddress.trim() || null, city: newCity.trim() || null
    });
    if (error) {
      toast.error(error.code === "23505" ? "Ya existe un restaurante con ese código" : error.message);
    } else {
      toast.success("Restaurante creado");
      setCreateOpen(false);
      setNewCode(""); setNewName(""); setNewAddress(""); setNewCity("");
      fetchRestaurants();
    }
    setSaving(false);
  };

  const openManage = async (r: Restaurant) => {
    setManageTarget(r);
    setManageOpen(true);
    setAssignUserId("");
    const { data } = await supabase
      .from("user_restaurants")
      .select("user_id, restaurant_id, profiles(full_name, email)")
      .eq("restaurant_id", r.id);
    setAssignedUsers((data ?? []) as any[]);
  };

  const handleAssignUser = async () => {
    if (!assignUserId || !manageTarget) return;
    setSaving(true);
    const { error } = await supabase.from("user_restaurants").insert({ user_id: assignUserId, restaurant_id: manageTarget.id });
    if (error) {
      toast.error(error.code === "23505" ? "Usuario ya asignado" : error.message);
    } else {
      toast.success("Usuario asignado");
      setAssignUserId("");
      openManage(manageTarget);
      fetchRestaurants();
    }
    setSaving(false);
  };

  const handleUnassignUser = async (userId: string) => {
    if (!manageTarget) return;
    const { error } = await supabase.from("user_restaurants").delete().eq("user_id", userId).eq("restaurant_id", manageTarget.id);
    if (error) { toast.error("Error al desasignar"); }
    else {
      toast.success("Usuario desasignado");
      openManage(manageTarget);
      fetchRestaurants();
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error("Email y contraseña son obligatorios");
      return;
    }
    setCreatingUser(true);
    const { data, error } = await supabase.functions.invoke("create-user", {
      body: {
        email: newUserEmail.trim(),
        password: newUserPassword,
        full_name: newUserName.trim(),
        company: newUserCompany.trim(),
      },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Error al crear usuario");
    } else {
      toast.success("Usuario creado y aprobado");
      setCreateUserOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      setNewUserCompany("");
      fetchProfiles();
      fetchUserRestaurants();
    }
    setCreatingUser(false);
  };

  const approvedProfiles = useMemo(() => profiles.filter((p) => p.status === "approved"), [profiles]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2.5">
          <Shield className="text-primary" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-medium text-foreground">Panel de Administración</h1>
          <p className="text-sm text-muted-foreground">Gestión de usuarios y restaurantes</p>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList>
          <TabsTrigger value="usuarios" className="gap-2"><Users size={16} /> Usuarios</TabsTrigger>
          <TabsTrigger value="restaurantes" className="gap-2"><Store size={16} /> Restaurantes</TabsTrigger>
        </TabsList>

        {/* ====== USUARIOS TAB ====== */}
        <TabsContent value="usuarios" className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList>
                <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
                <TabsTrigger value="pending">Pendientes ({counts.pending})</TabsTrigger>
                <TabsTrigger value="approved">Aprobados ({counts.approved})</TabsTrigger>
                <TabsTrigger value="rejected">Rechazados ({counts.rejected})</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => setCreateUserOpen(true)} className="gap-2">
              <Plus size={16} /> Crear usuario
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-lg">Usuarios</CardTitle></CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
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
                        <TableHead>Restaurantes</TableHead>
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
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(userRestaurantMap[p.id] || []).map((r: any) => (
                                <Badge key={r.code} variant="outline" className="text-xs">{r.code}</Badge>
                              ))}
                              {!(userRestaurantMap[p.id]?.length) && <span className="text-muted-foreground text-xs">—</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString("es-ES")}</TableCell>
                          <TableCell>{statusBadge(p.status)}</TableCell>
                          <TableCell className="text-right">
                            {p.id !== user?.id && (
                              <div className="flex items-center justify-end gap-2">
                                {p.status !== "approved" && (
                                  <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10 gap-1" onClick={() => updateStatus(p.id, "approved")} disabled={updating === p.id}>
                                    {updating === p.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Aprobar
                                  </Button>
                                )}
                                {p.status !== "rejected" && (
                                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1" onClick={() => updateStatus(p.id, "rejected")} disabled={updating === p.id}>
                                    {updating === p.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Rechazar
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
        </TabsContent>

        {/* ====== RESTAURANTES TAB ====== */}
        <TabsContent value="restaurantes" className="mt-6 space-y-4">
          <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus size={16} /> Crear restaurante</Button>

          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-lg">Todos los restaurantes</CardTitle></CardHeader>
            <CardContent className="p-0">
              {restLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
              ) : restaurants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No hay restaurantes</p>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Ciudad</TableHead>
                        <TableHead>Usuarios</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {restaurants.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono font-medium">{r.code}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell className="text-muted-foreground">{r.city || "—"}</TableCell>
                          <TableCell><Badge variant="secondary">{restCounts[r.id] || 0}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => openManage(r)}>
                              <Users size={14} /> Gestionar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Restaurant Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Crear restaurante</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Código *</Label><Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="289" /></div>
            <div className="space-y-2"><Label>Nombre *</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Diagonal Mar" /></div>
            <div className="space-y-2"><Label>Dirección</Label><Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} /></div>
            <div className="space-y-2"><Label>Ciudad</Label><Input value={newCity} onChange={(e) => setNewCity(e.target.value)} /></div>
            <Button onClick={handleCreateRestaurant} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Crear
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Users Dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Gestionar usuarios — {manageTarget?.code} {manageTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Usuarios asignados</p>
              {assignedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ninguno</p>
              ) : (
                <div className="space-y-2">
                  {assignedUsers.map((a) => (
                    <div key={a.user_id} className="flex items-center justify-between rounded-md border p-2">
                      <div>
                        <p className="text-sm font-medium">{a.profiles?.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{a.profiles?.email}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleUnassignUser(a.user_id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Asignar usuario</p>
              <div className="flex gap-2">
                <Select value={assignUserId} onValueChange={setAssignUserId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar usuario" /></SelectTrigger>
                  <SelectContent>
                    {approvedProfiles
                      .filter((p) => !assignedUsers.some((a) => a.user_id === p.id))
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAssignUser} disabled={!assignUserId || saving} className="gap-1">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Asignar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Crear usuario</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre</Label><Input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nombre completo" /></div>
            <div className="space-y-2"><Label>Empresa</Label><Input value={newUserCompany} onChange={(e) => setNewUserCompany(e.target.value)} placeholder="Empresa" /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="email@ejemplo.com" /></div>
            <div className="space-y-2"><Label>Contraseña *</Label><Input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
            <Button onClick={handleCreateUser} disabled={creatingUser} className="w-full gap-2">
              {creatingUser ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Crear usuario
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;

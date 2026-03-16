import { useState } from "react";
import { Store, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRestaurants, type Restaurant } from "@/hooks/useUserRestaurants";

const Restaurants = () => {
  const { user } = useAuth();
  const { restaurants, loading, isNrro, canSeeAll, refetch } = useUserRestaurants();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<Restaurant | null>(null);

  // Add form
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [site, setSite] = useState("");

  // Edit form
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editSite, setEditSite] = useState("");

  const resetAdd = () => { setCode(""); setName(""); setAddress(""); setCity(""); setSite(""); };

  const handleAdd = async () => {
    if (!code.trim() || !name.trim()) { toast.error("Código y nombre son obligatorios"); return; }
    if (!user) return;
    setSaving(true);
    try {
      // Check if restaurant with this code exists
      const { data: existing } = await supabase
        .from("restaurants")
        .select("id")
        .eq("code", code.trim())
        .maybeSingle();

      let restaurantId: string;

      if (existing) {
        restaurantId = existing.id;
      } else {
        const { data: created, error } = await supabase
          .from("restaurants")
          .insert({ code: code.trim(), name: name.trim(), address: address.trim() || null, city: city.trim() || null, site: site.trim() || null })
          .select("id")
          .single();
        if (error) throw error;
        restaurantId = created.id;
      }

      // NRRO users don't need assignment in user_restaurants
      if (!canSeeAll) {
        const { error: assignError } = await supabase
          .from("user_restaurants")
          .insert({ user_id: user.id, restaurant_id: restaurantId });

        if (assignError) {
          if (assignError.code === "23505") {
            toast.error("Ya tienes este restaurante asignado");
          } else {
            throw assignError;
          }
          return;
        }
      }

      toast.success("Restaurante añadido");
      resetAdd();
      setAddOpen(false);
      refetch();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !editCode.trim() || !editName.trim()) { toast.error("Código y nombre son obligatorios"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({ code: editCode.trim(), name: editName.trim(), address: editAddress.trim() || null, city: editCity.trim() || null, site: editSite.trim() || null })
        .eq("id", editTarget.id);
      if (error) throw error;
      toast.success("Restaurante actualizado");
      setEditOpen(false);
      refetch();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (restaurant: Restaurant) => {
    if (!user) return;
    const { error } = await supabase
      .from("user_restaurants")
      .delete()
      .eq("user_id", user.id)
      .eq("restaurant_id", restaurant.id);
    if (error) {
      toast.error("Error al desasociar");
    } else {
      toast.success(`${restaurant.code} — ${restaurant.name} desasociado`);
      refetch();
    }
  };

  const openEdit = (r: Restaurant) => {
    setEditTarget(r);
    setEditCode(r.code);
    setEditName(r.name);
    setEditAddress(r.address ?? "");
    setEditCity(r.city ?? "");
    setEditSite(r.site ?? "");
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-secondary/10 p-2.5">
          <Store className="text-secondary" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-medium text-foreground">{canSeeAll ? "Todos los Restaurantes" : "Mis Restaurantes"}</h1>
          <p className="text-sm text-muted-foreground">{canSeeAll ? "Vista completa de todos los locales" : "Gestiona tus locales asignados"}</p>
        </div>
      </div>

      <Button onClick={() => { resetAdd(); setAddOpen(true); }} className="gap-2">
        <Plus size={16} /> Añadir restaurante
      </Button>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{canSeeAll ? "Restaurantes" : "Restaurantes asignados"} ({restaurants.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : restaurants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No tienes restaurantes asignados. Añade uno para empezar.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Código</TableHead>
                     <TableHead>Nombre</TableHead>
                     <TableHead>Site</TableHead>
                     <TableHead>Dirección</TableHead>
                     <TableHead>Ciudad</TableHead>
                     <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restaurants.map((r) => (
                    <TableRow key={r.id}>
                       <TableCell className="font-mono font-medium">{r.code}</TableCell>
                       <TableCell>{r.name}</TableCell>
                       <TableCell className="text-muted-foreground">{r.site ? <a href={r.site} target="_blank" rel="noopener noreferrer" className="text-primary underline">{r.site}</a> : "—"}</TableCell>
                       <TableCell className="text-muted-foreground">{r.address || "—"}</TableCell>
                       <TableCell className="text-muted-foreground">{r.city || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                            <Pencil size={14} />
                          </Button>
                          {!canSeeAll && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemove(r)}>
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir restaurante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="289" />
            </div>
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Diagonal Mar" />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Av. Diagonal 3" />
            </div>
             <div className="space-y-2">
               <Label>Ciudad</Label>
               <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Barcelona" />
             </div>
             <div className="space-y-2">
               <Label>Site</Label>
               <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://..." />
             </div>
            <Button onClick={handleAdd} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Añadir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar restaurante ({editTarget?.code})</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
            </div>
             <div className="space-y-2">
               <Label>Ciudad</Label>
               <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} />
             </div>
             <div className="space-y-2">
               <Label>Site</Label>
               <Input value={editSite} onChange={(e) => setEditSite(e.target.value)} placeholder="https://..." />
             </div>
            <Button onClick={handleEdit} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Restaurants;

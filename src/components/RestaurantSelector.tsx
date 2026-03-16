import { useState } from "react";
import { useUserRestaurants } from "@/hooks/useUserRestaurants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Store } from "lucide-react";

interface RestaurantSelectorProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export function RestaurantSelector({ value, onChange, className }: RestaurantSelectorProps) {
  const { restaurants, loading, canSeeAll } = useUserRestaurants();
  const [manual, setManual] = useState(false);

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Código Local</Label>
        <Input disabled placeholder="Cargando..." className={className} />
      </div>
    );
  }

  // NRRO users always see the full select — no manual mode needed
  if (canSeeAll) {
    return (
      <div className="space-y-2">
        <Label>Código Local</Label>
        <Select value={value} onValueChange={(v) => onChange(v)}>
          <SelectTrigger className={`${!value ? "border-destructive" : ""} ${className ?? ""}`}>
            <SelectValue placeholder="Seleccionar restaurante" />
          </SelectTrigger>
          <SelectContent>
            {restaurants.map((r) => (
              <SelectItem key={r.id} value={r.code}>
                {r.code} — {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Todos los restaurantes disponibles</p>
      </div>
    );
  }

  if (restaurants.length === 0 && !manual) {
    return (
      <div className="space-y-2">
        <Label>Código Local</Label>
        <div className="rounded-md border border-border p-3 text-sm text-muted-foreground space-y-2">
          <p>
            No tienes restaurantes asignados.{" "}
            <Link to="/restaurants" className="text-primary underline underline-offset-2 inline-flex items-center gap-1">
              <Store size={14} /> Añade uno en "Mis Restaurantes"
            </Link>
          </p>
          <button
            type="button"
            onClick={() => setManual(true)}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Escribir código manualmente
          </button>
        </div>
      </div>
    );
  }

  if (manual) {
    return (
      <div className="space-y-2">
        <Label>Código Local</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="289"
          className={`${!value ? "border-destructive" : ""} ${className ?? ""}`}
        />
        {restaurants.length > 0 && (
          <button
            type="button"
            onClick={() => setManual(false)}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Seleccionar de mis restaurantes
          </button>
        )}
        <p className="text-xs text-muted-foreground">
          ¿No aparece tu local?{" "}
          <Link to="/restaurants" className="text-primary underline underline-offset-2">
            Añádelo en Mis Restaurantes
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Código Local</Label>
      <Select value={value} onValueChange={(v) => onChange(v)}>
        <SelectTrigger className={`${!value ? "border-destructive" : ""} ${className ?? ""}`}>
          <SelectValue placeholder="Seleccionar restaurante" />
        </SelectTrigger>
        <SelectContent>
          {restaurants.map((r) => (
            <SelectItem key={r.id} value={r.code}>
              {r.code} — {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        onClick={() => setManual(true)}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
      >
        ¿No aparece tu local? Escríbelo manualmente
      </button>
    </div>
  );
}

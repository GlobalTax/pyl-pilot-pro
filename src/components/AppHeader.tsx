export function AppHeader() {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 border-b bg-card">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight text-primary">PYL Manager</h1>
        <span className="hidden sm:inline text-xs font-semibold tracking-widest text-muted-foreground uppercase">NRRO</span>
      </div>
    </header>
  );
}

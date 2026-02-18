export function AppHeader() {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 border-b bg-background">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-medium tracking-tight text-foreground">PYL Manager</h1>
        <span className="hidden sm:inline text-[10px] font-medium tracking-widest text-muted-foreground uppercase">NRRO</span>
      </div>
    </header>
  );
}

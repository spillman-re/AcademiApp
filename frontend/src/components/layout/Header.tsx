import { User } from "lucide-react";

function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-slate-50 px-6 shadow-md shadow-slate-900/5">
      {/* Título de la vista / Panel */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-800">
            Panel de Administración
          </h2>
          <p className="text-xs text-slate-500">
            Academia & Sala de Belleza Silvia
          </p>
        </div>
      </div>

      {/* Controles de la derecha */}
      <div className="flex items-center gap-4">
        {/* Perfil de usuario */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-900 text-white shadow-sm ring-2 ring-blue-500/20">
            <User className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold text-slate-800">Silvia</p>
            <p className="text-[10px] text-slate-400">Administradora</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
import { NavLink } from "react-router-dom";
import { LayoutDashboard, GraduationCap, UsersRound, BookOpen } from "lucide-react";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cursos", label: "Cursos", icon: GraduationCap },
  { to: "/profesores", label: "Profesores", icon: UsersRound },
  { to: "/estudiantes", label: "Estudiantes", icon: BookOpen },
];

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-blue-950/40 bg-blue-950 shadow-2xl shadow-blue-950/50 z-20">
      
      {/* Sección del Logo y Marca */}
      <div className="flex items-center gap-3.5 px-6 py-7 border-b border-blue-900/40">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 p-0.5 shadow-md ring-1 ring-white/15">
          <img
            src="images/logo.png"
            alt="Logo Academia Silvia"
            className="h-full w-full object-cover rounded-[10px]"
          />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-white">
            Academia Silvia
          </h1>
          <p className="text-[10px] font-medium uppercase tracking-wider text-blue-300">
            Belleza & Estilo
          </p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-1.5 px-3 py-6">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-blue-200/80 hover:bg-blue-900/60 hover:text-white",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={[
                    "h-5 w-5 shrink-0 transition-colors duration-200",
                    isActive ? "text-white" : "text-blue-400 group-hover:text-blue-200",
                  ].join(" ")}
                  strokeWidth={1.75}
                />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-blue-900/40 px-6 py-4">
        <p className="text-[11px] font-medium text-blue-400/80">
          © {new Date().getFullYear()} Academia Silvia
        </p>
        <p className="text-[10px] text-blue-400/50">Admin Panel</p>
      </div>
    </aside>
  );
}

export default Sidebar;
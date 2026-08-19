import { NavLink } from "react-router-dom";
import { LayoutDashboard, GraduationCap, Sparkles } from "lucide-react";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cursos", label: "Cursos", icon: GraduationCap },
];

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-blue-100 bg-gradient-to-b from-blue-50/60 via-white to-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-7">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-800 to-blue-600 text-white shadow-sm shadow-blue-200">
          <Sparkles className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="font-serif text-lg font-semibold tracking-tight text-blue-950">
            Academia
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-amber-400">
            Belleza & Estilo
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                isActive
                  ? "bg-blue-800 text-white shadow-md shadow-blue-200"
                  : "text-blue-900/70 hover:bg-blue-50 hover:text-blue-900",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={[
                    "h-[18px] w-[18px] transition-colors",
                    isActive ? "text-amber-200" : "text-blue-400 group-hover:text-blue-600",
                  ].join(" ")}
                  strokeWidth={1.75}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer sutil */}
      <div className="border-t border-blue-100 px-6 py-5">
        <p className="text-[11px] text-blue-300">© {new Date().getFullYear()} Academia</p>
      </div>
    </aside>
  );
}

export default Sidebar;
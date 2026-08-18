import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r bg-white">
      <div className="p-6">
        <h1 className="text-xl font-bold">
          Academia
        </h1>
      </div>

      <nav className="px-4">
        <NavLink
          to="/dashboard"
          className="block rounded-lg px-4 py-3 hover:bg-gray-100"
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/cursos"
          className="block rounded-lg px-4 py-3 hover:bg-gray-100"
        >
          Cursos
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;
import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "../components/layout/MainLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import CursosPage from "../pages/cursos/CursosPage";
import ProfesoresPage from "../pages/profesores/ProfesoresPage";
import EstudiantesPage from "../pages/estudiantes/EstudiantesPage";

function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/cursos" element={<CursosPage />} />

        <Route path="/profesores" element={<ProfesoresPage />} />

        <Route path="/estudiantes" element={<EstudiantesPage />} />
      </Route>
    </Routes>
  );
}

export default AppRouter;
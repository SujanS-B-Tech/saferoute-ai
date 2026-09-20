import { BrowserRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import { Login, Register } from "./pages/Auth";
import Contacts from "./pages/Contacts";
import Dashboard from "./pages/Dashboard";
import DataSources from "./pages/DataSources";
import Facilities from "./pages/Facilities";
import Landing from "./pages/Landing";
import Profile from "./pages/Profile";
import Journeys from "./pages/Journeys";
import Navigation from "./pages/Navigation";
import Emergency from "./pages/Emergency";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="facilities" element={<Facilities />} />
            <Route path="data" element={<DataSources />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="profile" element={<Profile />} />
            <Route path="journeys" element={<Journeys />} />
            <Route path="navigation/:id" element={<Navigation />} />
            <Route path="emergency" element={<Emergency />} />
            <Route path="reports" element={<Reports />} />
            <Route path="admin" element={<Admin />} />
          </Route>
        </Route>
        <Route path="*" element={<div className="p-10 text-center"><p className="text-lg font-semibold">Page not found</p><a className="text-brand-700 underline" href="/">Go home</a></div>} />
      </Routes>
    </BrowserRouter>
  );
}

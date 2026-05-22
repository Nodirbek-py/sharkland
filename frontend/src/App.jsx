import { useState, useEffect } from "react";
import Login from "./components/Login";
import ReceptionistDashboard from "./components/ReceptionistDashboard";
import WaiterDashboard from "./components/WaiterDashboard";
import VendorDashboard from "./components/VendorDashboard";
import SuperAdminDashboard from "./components/SuperAdminDashboard";

export default function App() {
  const [user, setUser] = useState(null);

  // Sahifa yangilanganda login o'chib ketmasligi uchun LocalStorage'ni tekshirish
  useEffect(() => {
    const savedUser = localStorage.getItem("aquapark_user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem("aquapark_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("aquapark_user");
  };

  // Agar foydalanuvchi login qilmagan bo'lsa, faqat login sahifasini ko'rsatish
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Foydalanuvchining roliga qarab tegishli dashboardni dinamik render qilish
  switch (user.role) {
    case "superadmin":
      return <SuperAdminDashboard user={user} onLogout={handleLogout} />;
    case "receptionist":
      return <ReceptionistDashboard user={user} onLogout={handleLogout} />;
    case "waiter":
      return <WaiterDashboard user={user} onLogout={handleLogout} />;
    case "vendor":
      return <VendorDashboard user={user} onLogout={handleLogout} />;
    default:
      return (
        <div className="p-8 text-center">
          <p className="text-red-600 font-bold">Noma'lum rol aniqlandi!</p>
          <button
            onClick={handleLogout}
            className="mt-4 bg-slate-800 text-white p-2 rounded"
          >
            Chiqish
          </button>
        </div>
      );
  }
}

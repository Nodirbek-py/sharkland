import { useState, useEffect } from "react";
import Login from "./components/Login";
import ReceptionistDashboard from "./components/ReceptionistDashboard";
import WaiterDashboard from "./components/WaiterDashboard";
import VendorDashboard from "./components/VendorDashboard";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import StorekeeperDashboard from "./components/StoreKeeper";
import PublicMenu from "./components/PublicMenu";
import AlertModal from "./components/AlertModal";

export default function App() {
  const [user, setUser] = useState(null);
  const [globalAlert, setGlobalAlert] = useState({ isOpen: false, message: "", type: "info" });

  useEffect(() => {
    window.alert = (message) => {
      const msg = String(message).toLowerCase();
      const isError = msg.includes("xatolik") || msg.includes("topilmadi") || msg.includes("emas") || msg.includes("yo'q");
      const isSuccess = msg.includes("muvaffaqiyatli") || msg.includes("yangilandi") || msg.includes("to'ldirildi");
      
      let type = "info";
      if (isError) type = "error";
      else if (isSuccess) type = "success";
      else if (msg.includes("iltimos")) type = "warning";

      setGlobalAlert({ isOpen: true, message: String(message), type });
    };
  }, []);

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

  const renderContent = () => {
    if (window.location.pathname === '/menu') {
      return <PublicMenu />;
    }

    if (!user) {
      return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    switch (user.role) {
      case "manager":
      case "supervisor":
        return <SuperAdminDashboard user={user} onLogout={handleLogout} />;
      case "receptionist":
        return <ReceptionistDashboard user={user} onLogout={handleLogout} />;
      case "waiter":
        return <WaiterDashboard user={user} onLogout={handleLogout} />;
      case "barman":
        return <VendorDashboard user={user} onLogout={handleLogout} />;
      case "storekeeper":
        return <StorekeeperDashboard user={user} onLogout={handleLogout} />;
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
  };

  return (
    <>
      {renderContent()}
      <AlertModal 
        isOpen={globalAlert.isOpen} 
        message={globalAlert.message}
        type={globalAlert.type}
        title={globalAlert.type === 'error' ? 'Xatolik' : globalAlert.type === 'success' ? 'Muvaffaqiyatli' : 'Ogohlantirish'}
        onClose={() => setGlobalAlert(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}

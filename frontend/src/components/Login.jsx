import { useState } from "react";
import axios from "axios";
import { Lock, User } from "lucide-react";

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/auth/login", {
        username,
        password,
      });
      if (res.data.success) onLoginSuccess(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Kirishda xatolik yuz berdi");
    }
  };

  const handleSeed = async () => {
    try {
      const res = await axios.post("/api/auth/seed");
      alert(res.data.message);
    } catch (err) {
      alert("Xatolik yuz berdi yoki foydalanuvchilar allaqachon mavjud.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-800">
            Sharkland Smart POS
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Tizimga kirish uchun hisob ma'lumotlarini kiriting
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Foydalanuvchi nomi
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Masalan: recept"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Parol
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition duration-150"
          >
            Tizimga kirish
          </button>
          <button
            type="button"
            onClick={handleSeed}
            className="w-full mt-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 rounded-xl text-xs transition"
          >
            ⚙️ Test foydalanuvchilarini yaratish (Seed)
          </button>
        </form>
      </div>
    </div>
  );
}

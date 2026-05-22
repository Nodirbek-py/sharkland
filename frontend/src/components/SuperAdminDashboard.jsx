import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Shield,
  TrendingUp,
  DollarSign,
  Activity,
  UserPlus,
  Calendar,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function SuperAdminDashboard({ user, onLogout }) {
  const [txs, setTxs] = useState([]);
  const [analytics, setAnalytics] = useState({
    summary: { dailyIncome: 0, weeklyIncome: 0, monthlyIncome: 0 },
    chartData: [],
  });

  // Yangi foydalanuvchi uchun shtatlar
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("waiter");
  const [msg, setMsg] = useState({ text: "", isError: false });

  const fetchAllData = () => {
    // Tranzaksiyalar tarixi
    axios
      .get("http://localhost:5000/api/admin/transactions")
      .then((res) => setTxs(res.data))
      .catch((err) => console.error(err));

    // Davriy tahlillar va grafik ma'lumotlari
    axios
      .get("http://localhost:5000/api/admin/analytics")
      .then((res) => setAnalytics(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Yangi foydalanuvchi qo'shish funksiyasi
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMsg({ text: "", isError: false });
    try {
      const res = await axios.post("http://localhost:5000/api/admin/users", {
        username,
        password,
        role,
      });
      setMsg({ text: res.data.message, isError: false });
      setUsername("");
      setPassword("");
    } catch (err) {
      setMsg({
        text: err.response?.data?.message || "Xatolik yuz berdi",
        isError: true,
      });
    }
  };

  const totalIn = txs
    .filter((t) => t.type === "topup")
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* SHAXSIY HEADER */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Shield className="text-red-500 w-6 h-6" /> SuperAdmin Dashboard
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300 font-medium">
            Tizim boshqaruvchisi: {user.username}
          </span>
          <button
            onClick={onLogout}
            className="text-sm font-bold bg-red-600 px-4 py-2 rounded-xl hover:bg-red-700 transition shadow-sm"
          >
            Chiqish
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* SECTION 1: DAVRIY DAROMADLAR VIDJETI */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> Savdo va Daromadlar Tahlili (Kafeda
            Sotilgan)
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-emerald-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  Kunlik Sof Savdo
                </p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">
                  {analytics.summary.dailyIncome.toLocaleString()} UZS
                </h3>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                <DollarSign />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-blue-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  Haftalik Sof Savdo
                </p>
                <h3 className="text-2xl font-black text-blue-600 mt-1">
                  {analytics.summary.weeklyIncome.toLocaleString()} UZS
                </h3>
              </div>
              <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                <TrendingUp />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-violet-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  Oylik Sof Savdo
                </p>
                <h3 className="text-2xl font-black text-violet-600 mt-1">
                  {analytics.summary.monthlyIncome.toLocaleString()} UZS
                </h3>
              </div>
              <div className="bg-violet-50 p-3 rounded-2xl text-violet-600">
                <Activity />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: GRAFIK VA FOYDALANUVCHI QO'SHISH FORMASI */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* RECHARTS GRAFIKI */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <BarChart3 className="text-blue-500 w-5 h-5" /> Haftalik Daromad
                Tendensiyasi
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Oxirgi 7 kundagi umumiy sotuv hajmi grafigi
              </p>
            </div>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analytics.chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorIncome"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="kun"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v / 1000}k`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${value.toLocaleString()} so'm`,
                      "Daromad",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="daromad"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* YANGI XODIM QO'SHISH PANEL */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-1">
                <UserPlus className="text-amber-500 w-5 h-5" /> Yangi Xodim
                Qo'shish
              </h3>
              <p className="text-xs text-slate-400 font-medium mb-4">
                Ofitsiant, Vendor yoki Resepsionistlarni ro'yxatga olish
              </p>

              {msg.text && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold mb-3 ${msg.isError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}
                >
                  {msg.text}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Foydalanuvchi nomi (Login)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: waiter_ali"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border p-2.5 rounded-xl outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Parol
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border p-2.5 rounded-xl outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Tizimdagi Lavozimi (Role)
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full border p-2.5 rounded-xl bg-white outline-none text-sm font-semibold text-slate-700 focus:border-blue-500"
                  >
                    <option value="waiter">Ofitsiant (Waiter)</option>
                    <option value="barman">Vendor - Bar (Barman)</option>
                    <option value="storekeeper">
                      Vendor - Oshxona (Storekeeper)
                    </option>
                    <option value="receptionist">
                      Kassir / Resepsion (Receptionist)
                    </option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-sm transition mt-2 shadow-sm"
                >
                  Tizimga Qo'shish
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* SECTION 3: AUDIT LOG VA UMUMIY STATISTIKA */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center border-b pb-3 mb-4">
            <h3 className="font-bold text-slate-800 text-lg">
              Barcha Tranzaksiyalar Auditi
            </h3>
            <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-mono font-bold text-slate-600">
              Kassa umumiy balansi (Kirim): +{totalIn.toLocaleString()} UZS
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
            {txs.map((t) => (
              <div
                key={t.id}
                className="flex justify-between items-center text-xs p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-100 transition"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${t.type === "topup" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                  >
                    {t.type === "topup" ? "Kassa Kirim" : "Sotuv"}
                  </span>
                  <span className="text-slate-500 font-medium">
                    Joylashuv:{" "}
                    <b className="text-slate-700">
                      {t.location || "Markaziy Kassa"}
                    </b>
                  </span>
                </div>
                <span
                  className={`font-mono font-bold text-sm ${t.type === "topup" ? "text-emerald-600" : "text-slate-800"}`}
                >
                  {t.type === "topup" ? "+" : "-"}
                  {Number(t.amount).toLocaleString()} UZS
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

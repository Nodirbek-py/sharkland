import { useState, useEffect } from "react";
import axios from "axios";
import {
  Shield,
  TrendingUp,
  DollarSign,
  Activity,
  UserPlus,
  Calendar,
  BarChart3,
  Store,
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
  const [stores, setStores] = useState([]);

  const [graphPeriod, setGraphPeriod] = useState("weekly");

  const [analytics, setAnalytics] = useState({
    summary: { dailyIncome: 0, weeklyIncome: 0, monthlyIncome: 0 },
    storeComparison: [],
    chartData: [],
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("waiter");
  const [selectedStore, setSelectedStore] = useState("");
  const [msg, setMsg] = useState({ text: "", isError: false });

  const [storeName, setStoreName] = useState("");
  const [storeMsg, setStoreMsg] = useState({ text: "", isError: false });

  const fetchAllData = () => {
    axios
      .get("http://localhost:5000/api/admin/transactions")
      .then((res) => setTxs(res.data))
      .catch((err) => console.error(err));

    axios
      .get("http://localhost:5000/api/admin/stores")
      .then((res) => {
        setStores(res.data);
        if (res.data.length > 0) setSelectedStore(res.data[0].id);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    axios
      .get(`/api/admin/analytics?period=${graphPeriod}`)
      .then((res) => setAnalytics(res.data))
      .catch((err) => console.error(err));
  }, [graphPeriod]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setStoreMsg({ text: "", isError: false });
    try {
      await axios.post("http://localhost:5000/api/admin/stores", {
        name: storeName,
      });
      setStoreMsg({ text: "Filial muvaffaqiyatli ochildi!", isError: false });
      setStoreName("");
      fetchAllData();
    } catch (err) {
      setStoreMsg({ text: "Filial qo'shishda xatolik", isError: true });
    }
  };

  const isIndependentRole =
    role === "receptionist" || role === "waiter" || role === "storekeeper";

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMsg({ text: "", isError: false });
    try {
      const res = await axios.post("http://localhost:5000/api/admin/users", {
        username,
        password,
        role,
        storeId: isIndependentRole ? null : selectedStore,
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
    ?.filter((t) => t.type === "topup")
    .reduce((s, t) => s + Number(t.amount), 0);

  const getStoreName = (id) => {
    if (!id) return "Markaziy Kassa";
    const store = stores.find((s) => s.id === id);
    return store ? store.name : "Noma'lum Filial";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* SHAXSIY HEADER */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Shield className="text-red-500 w-6 h-6" />
          {user.role === "manager"
            ? "Manager Dashboard"
            : "Supervisor Dashboard"}
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300 font-medium capitalize">
            {user.role}: {user?.username}
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
        {/* SECTION 1: DO'KONLAR VA ULARNI TAQQOSLASH */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* YANGI DO'KON YARATISH (Faqat Manager ko'radi) */}
          {user.role === "manager" && (
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-center">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-lg">
                <Store className="w-5 h-5 text-indigo-500" /> Yangi Do'kon
                (Filial) Ochish
              </h3>
              {storeMsg.text && (
                <p
                  className={`text-xs font-bold mb-3 ${storeMsg.isError ? "text-red-600" : "text-green-600"}`}
                >
                  {storeMsg.text}
                </p>
              )}
              <form onSubmit={handleCreateStore} className="flex gap-3">
                <input
                  required
                  placeholder="Filial nomi (masalan: Hovuz Bar)"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="border p-2.5 rounded-xl outline-none focus:border-indigo-500 text-sm flex-1"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition"
                >
                  Yaratish
                </button>
              </form>
            </div>
          )}

          {/* DO'KONLAR SAVDOSINI TAQQOSLASH (Supervisor uchun to'liq kenglikda chiqadi) */}
          <div
            className={`bg-white p-6 rounded-2xl border shadow-sm ${user.role !== "manager" ? "lg:col-span-2" : ""}`}
          >
            <h3 className="font-bold mb-4 text-lg">
              Filiallar Kesimida Savdo Tahlili
            </h3>
            <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
              {analytics.storeComparison &&
              analytics.storeComparison.length > 0 ? (
                analytics.storeComparison.map((store) => (
                  <div
                    key={store.storeName}
                    className="flex justify-between items-center border-b border-slate-100 pb-2 text-sm"
                  >
                    <span className="font-bold text-slate-700">
                      {store.storeName}
                    </span>
                    <div className="flex gap-4">
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Kunlik: {store.dailySales.toLocaleString()} UZS
                      </span>
                      <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                        Umumiy: {store.totalSales.toLocaleString()} UZS
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 font-medium">
                  Hozircha filiallar qo'shilmagan yoki savdo mavjud emas.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: DAVRIY DAROMADLAR VIDJETI */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> Umumiy Savdo va Daromadlar (Barcha
            filiallar)
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-emerald-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  Kunlik Sof Savdo
                </p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">
                  {analytics?.summary?.dailyIncome.toLocaleString()} UZS
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
                  {analytics?.summary?.weeklyIncome.toLocaleString()} UZS
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
                  {analytics?.summary?.monthlyIncome.toLocaleString()} UZS
                </h3>
              </div>
              <div className="bg-violet-50 p-3 rounded-2xl text-violet-600">
                <Activity />
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* GRAFIK (Manager bo'lsa 2 qism, Supervisor bo'lsa 3 qism to'liq kenglikni oladi) */}
          <div
            className={`bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between ${user.role === "manager" ? "lg:col-span-2" : "lg:col-span-3"}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <BarChart3 className="text-blue-500 w-5 h-5" /> Daromad
                  Tendensiyasi
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {graphPeriod === "daily" &&
                    "Bugungi kunlik (soatbay) umumiy savdo grafigi"}
                  {graphPeriod === "weekly" &&
                    "Oxirgi 7 kundagi umumiy savdo grafigi"}
                  {graphPeriod === "monthly" &&
                    "Oxirgi 30 kundagi oylik savdo grafigi"}
                </p>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-center">
                <button
                  onClick={() => setGraphPeriod("daily")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${graphPeriod === "daily" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Kunlik
                </button>
                <button
                  onClick={() => setGraphPeriod("weekly")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${graphPeriod === "weekly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Haftalik
                </button>
                <button
                  onClick={() => setGraphPeriod("monthly")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${graphPeriod === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Oylik
                </button>
              </div>
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
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toLocaleString()}k`}
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

          {/* YANGI XODIM QO'SHISH PANEL (Faqat Manager ko'radi) */}
          {user.role === "manager" && (
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
                      <option value="vendor">
                        Filial Xodimi / Oshpaz (Vendor)
                      </option>
                      <option value="storekeeper">
                        Bosh Omborchi (Storekeeper - Mustaqil)
                      </option>
                      <option value="receptionist">
                        Kassir / Resepsion (Mustaqil)
                      </option>
                    </select>
                  </div>

                  {!isIndependentRole && (
                    <div>
                      <label className="block text-xs font-bold text-indigo-500 mb-1">
                        Biriktiriladigan Do'kon (Filial)
                      </label>
                      <select
                        required
                        value={selectedStore}
                        onChange={(e) => setSelectedStore(e.target.value)}
                        className="w-full border p-2.5 rounded-xl bg-indigo-50 outline-none text-sm font-bold text-indigo-900 focus:border-indigo-500"
                      >
                        {stores.length === 0 && (
                          <option value="">Do'konlar mavjud emas</option>
                        )}
                        {stores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-sm transition mt-2 shadow-sm"
                  >
                    Tizimga Qo'shish
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: AUDIT LOG */}
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
                    Filial:{" "}
                    <b className="text-slate-700">{getStoreName(t.storeId)}</b>
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

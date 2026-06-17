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
  Edit,
  Trash2,
  Save,
  X,
  Users,
  Download,
  Layers,
} from "lucide-react";
import * as XLSX from "xlsx";
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

  const [activeOrders, setActiveOrders] = useState([]);
  const [canceledOrders, setCanceledOrders] = useState([]);
  const [orderTab, setOrderTab] = useState("active");
  const [cancelModal, setCancelModal] = useState({ isOpen: false, orderId: null, isLoading: false });
  const [deleteUserModal, setDeleteUserModal] = useState({ isOpen: false, userId: null, isLoading: false });

  const [graphPeriod, setGraphPeriod] = useState("weekly");

  const [analytics, setAnalytics] = useState({
    summary: { dailyIncome: 0, weeklyIncome: 0, monthlyIncome: 0, totalIncome: 0 },
    tipSummary: { dailyTip: 0, weeklyTip: 0, monthlyTip: 0, totalTip: 0 },
    storeComparison: [],
    waiterComparison: [],
    chartData: [],
    waitersChartData: [],
  });

  const [waiterChartMetric, setWaiterChartMetric] = useState("tip"); // "tip" yoki "sales"

  const [waiters, setWaiters] = useState([]);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterStoreId, setFilterStoreId] = useState("");
  const [filterWaiter, setFilterWaiter] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("waiter");
  const [selectedStore, setSelectedStore] = useState("");
  const [msg, setMsg] = useState({ text: "", isError: false });

  const [allUsers, setAllUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ username: "", password: "", storeId: "" });

  const [storeName, setStoreName] = useState("");
  const [storeMsg, setStoreMsg] = useState({ text: "", isError: false });
  const [editingStore, setEditingStore] = useState(null);
  const [editStoreName, setEditStoreName] = useState("");

  const fetchAllData = () => {
    axios
      .get("/api/admin/transactions")
      .then((res) => setTxs(res.data))
      .catch((err) => console.error(err));

    axios
      .get("/api/admin/stores")
      .then((res) => {
        setStores(res.data);
        if (res.data.length > 0) setSelectedStore(res.data[0].id);
      })
      .catch((err) => console.error(err));

    axios
      .get("/api/admin/users?role=waiter")
      .then((res) => setWaiters(res.data))
      .catch((err) => console.error(err));

    axios
      .get("/api/admin/users")
      .then((res) => setAllUsers(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error(err));

    axios
      .get("/api/admin/orders/active")
      .then((res) => setActiveOrders(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error(err));

    axios
      .get("/api/admin/orders/canceled")
      .then((res) => setCanceledOrders(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    let url = `/api/admin/analytics?period=${graphPeriod}`;
    if (filterStartDate) url += `&startDate=${filterStartDate}`;
    if (filterEndDate) url += `&endDate=${filterEndDate}`;
    if (filterStoreId) url += `&storeId=${filterStoreId}`;
    if (filterWaiter) url += `&waiterUsername=${filterWaiter}`;

    axios
      .get(url)
      .then((res) => setAnalytics(res.data))
      .catch((err) => console.error(err));
  }, [graphPeriod, filterStartDate, filterEndDate, filterStoreId, filterWaiter]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setStoreMsg({ text: "", isError: false });
    try {
      await axios.post("/api/admin/stores", {
        name: storeName,
      });
      setStoreMsg({ text: "Filial muvaffaqiyatli ochildi!", isError: false });
      setStoreName("");
      fetchAllData();
    } catch (err) {
      setStoreMsg({ text: "Filial qo'shishda xatolik", isError: true });
    }
  };

  const saveStoreEdit = async (id) => {
    try {
      await axios.put(`/api/admin/stores/${id}`, { name: editStoreName });
      setEditingStore(null);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Filialni tahrirlashda xatolik");
    }
  };

  const cancelStoreEdit = () => {
    setEditingStore(null);
  };

  const isIndependentRole =
    role === "receptionist" || role === "waiter" || role === "storekeeper";

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMsg({ text: "", isError: false });
    try {
      const res = await axios.post("/api/admin/users", {
        username,
        password,
        role,
        storeId: isIndependentRole ? null : selectedStore,
      });
      setMsg({ text: res.data.message, isError: false });
      setUsername("");
      setPassword("");
      fetchAllData();
    } catch (err) {
      setMsg({
        text: err.response?.data?.message || "Xatolik yuz berdi",
        isError: true,
      });
    }
  };

  const handleDeleteUser = (id) => {
    setDeleteUserModal({ isOpen: true, userId: id, isLoading: false });
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserModal.userId) return;
    setDeleteUserModal((prev) => ({ ...prev, isLoading: true }));
    try {
      await axios.delete(`/api/admin/users/${deleteUserModal.userId}`);
      fetchAllData();
      setDeleteUserModal({ isOpen: false, userId: null, isLoading: false });
    } catch (err) {
      alert("Xatolik yuz berdi");
      setDeleteUserModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user.id);
    setEditForm({ username: user.username, password: "", storeId: user.storeId || "" });
  };

  const saveUserEdit = async (id, role) => {
    try {
      const payload = { username: editForm.username };
      if (editForm.password) payload.password = editForm.password;
      if (role === 'barman') payload.storeId = editForm.storeId;

      await axios.put(`/api/admin/users/${id}`, payload);
      setEditingUser(null);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Xatolik yuz berdi");
    }
  };

  const cancelEdit = () => {
    setEditingUser(null);
  };

  const handleCancelOrder = (id) => {
    setCancelModal({ isOpen: true, orderId: id, isLoading: false });
  };

  const confirmCancelOrder = async () => {
    if (!cancelModal.orderId) return;
    setCancelModal((prev) => ({ ...prev, isLoading: true }));
    try {
      await axios.post(`/api/admin/orders/${cancelModal.orderId}/cancel`);
      setCancelModal({ isOpen: false, orderId: null, isLoading: false });
      fetchAllData();
    } catch (err) {
      alert("Xatolik yuz berdi");
      setCancelModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const totalIn = Array.isArray(txs) ? txs.filter((t) => t.type === "topup").reduce((s, t) => s + Number(t.amount), 0) : 0;

  const getStoreName = (id) => {
    if (!id) return "Asosiy";
    const store = stores.find((s) => s.id === id);
    return store ? store.name : "Noma'lum Filial";
  };

  const handleExportExcel = () => {
    const summaryData = [
      { Parametr: "Tanlangan Filtr bo'yicha (Savdo)", Qiymat: analytics?.summary?.totalIncome || 0 },
      { Parametr: "Tanlangan Filtr bo'yicha (Foyda)", Qiymat: analytics?.summary?.totalProfit || 0 },
      { Parametr: "Kunlik Sof Savdo", Qiymat: analytics?.summary?.dailyIncome || 0 },
      { Parametr: "Kunlik Sof Foyda", Qiymat: analytics?.summary?.dailyProfit || 0 },
      { Parametr: "Haftalik Sof Savdo", Qiymat: analytics?.summary?.weeklyIncome || 0 },
      { Parametr: "Haftalik Sof Foyda", Qiymat: analytics?.summary?.weeklyProfit || 0 },
      { Parametr: "Oylik Sof Savdo", Qiymat: analytics?.summary?.monthlyIncome || 0 },
      { Parametr: "Oylik Sof Foyda", Qiymat: analytics?.summary?.monthlyProfit || 0 },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);

    const chartData = (analytics?.chartData || []).map(d => ({
      "Vaqt / Sana": d.label,
      "Daromad (so'm)": d.daromad
    }));
    const wsChart = XLSX.utils.json_to_sheet(chartData);

    const storeData = (analytics?.storeComparison || []).map(s => ({
      "Filial Nomi": s.storeName,
      "Kunlik Savdo (so'm)": s.dailySales,
      "Kunlik Foyda (so'm)": s.dailyProfit,
      "Umumiy Savdo (so'm)": s.totalSales,
      "Umumiy Foyda (so'm)": s.totalProfit
    }));
    const wsStore = XLSX.utils.json_to_sheet(storeData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Umumiy Hisobot");
    XLSX.utils.book_append_sheet(wb, wsChart, "Vaqt bo'yicha");
    if (storeData.length > 0) {
      XLSX.utils.book_append_sheet(wb, wsStore, "Filiallar Kesimida");
    }

    XLSX.writeFile(wb, `Statistika_${new Date().toISOString().split('T')[0]}.xlsx`);
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

              {/* Barcha Filiallar Ro'yxati */}
              <div className="mt-6">
                <h4 className="text-sm font-bold text-slate-500 mb-3">Mavjud Filiallar</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {stores.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Filiallar yo'q</p>
                  ) : (
                    stores.map((s) => (
                      <div key={s.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border">
                        {editingStore === s.id ? (
                          <input
                            type="text"
                            value={editStoreName}
                            onChange={(e) => setEditStoreName(e.target.value)}
                            className="border p-1.5 rounded-md text-sm outline-none focus:border-indigo-500 flex-1 mr-2"
                          />
                        ) : (
                          <span className="text-sm font-bold text-slate-700">{s.name}</span>
                        )}
                        
                        <div className="flex gap-2">
                          {editingStore === s.id ? (
                            <>
                              <button
                                onClick={() => saveStoreEdit(s.id)}
                                className="text-emerald-600 hover:bg-emerald-100 p-1.5 rounded transition"
                                title="Saqlash"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelStoreEdit}
                                className="text-red-500 hover:bg-red-100 p-1.5 rounded transition"
                                title="Bekor qilish"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingStore(s.id);
                                setEditStoreName(s.name);
                              }}
                              className="text-indigo-600 hover:bg-indigo-100 p-1.5 rounded transition"
                              title="Tahrirlash"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
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
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-xs">
                        Kunlik: {(store?.dailySales || 0).toLocaleString()} | Foyda: {(store?.dailyProfit || 0).toLocaleString()} UZS
                      </span>
                      <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md text-xs">
                        Umumiy: {(store?.totalSales || 0).toLocaleString()} | Foyda: {(store?.totalProfit || 0).toLocaleString()} UZS
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

        {/* FILTRLAR PANELI */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 mb-1 block">Boshlanish sanasi</label>
            <input type="date" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setGraphPeriod("custom"); }} className="w-full border p-2 rounded-xl text-sm outline-none focus:border-blue-500" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 mb-1 block">Tugash sanasi</label>
            <input type="date" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setGraphPeriod("custom"); }} className="w-full border p-2 rounded-xl text-sm outline-none focus:border-blue-500" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 mb-1 block">Filial (Vendor)</label>
            <select value={filterStoreId} onChange={(e) => { setFilterStoreId(e.target.value); setFilterWaiter(""); setGraphPeriod("custom"); }} className="w-full border p-2 rounded-xl text-sm bg-white outline-none focus:border-blue-500">
              <option value="">Barchasi</option>
              {Array.isArray(stores) && stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 mb-1 block">Ofitsiant</label>
            <select value={filterWaiter} onChange={(e) => { setFilterWaiter(e.target.value); setFilterStoreId(""); setGraphPeriod("custom"); }} className="w-full border p-2 rounded-xl text-sm bg-white outline-none focus:border-blue-500">
              <option value="">Barchasi</option>
              {Array.isArray(waiters) && waiters.map(w => <option key={w.id} value={w.username}>{w.username}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-end">
            <button onClick={() => {
              setFilterStartDate(""); setFilterEndDate(""); setFilterStoreId(""); setFilterWaiter(""); setGraphPeriod("weekly");
            }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition h-[38px]">
              Tozalash
            </button>
            <button onClick={handleExportExcel} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-1.5 h-[38px]">
              <Download className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>

        {/* SECTION 2: DAVRIY DAROMADLAR VIDJETI */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> Umumiy Savdo va Daromadlar
          </h2>
          <div className="grid sm:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-emerald-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">Kunlik Savdo</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">
                  {analytics?.summary?.dailyIncome?.toLocaleString() || 0} UZS
                </h3>
                <p className="text-xs font-bold text-emerald-500 mt-1">
                  Foyda: {analytics?.summary?.dailyProfit?.toLocaleString() || 0} UZS
                </p>
                <p className="text-xs font-bold text-indigo-500 mt-0.5">
                  Choychaqa: {analytics?.tipSummary?.dailyTip?.toLocaleString() || 0} UZS
                </p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><DollarSign /></div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-blue-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">Haftalik Savdo</p>
                <h3 className="text-2xl font-black text-blue-600 mt-1">
                  {analytics?.summary?.weeklyIncome?.toLocaleString() || 0} UZS
                </h3>
                <p className="text-xs font-bold text-blue-500 mt-1">
                  Foyda: {analytics?.summary?.weeklyProfit?.toLocaleString() || 0} UZS
                </p>
                <p className="text-xs font-bold text-indigo-500 mt-0.5">
                  Choychaqa: {analytics?.tipSummary?.weeklyTip?.toLocaleString() || 0} UZS
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><TrendingUp /></div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-violet-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">Oylik Savdo</p>
                <h3 className="text-2xl font-black text-violet-600 mt-1">
                  {analytics?.summary?.monthlyIncome?.toLocaleString() || 0} UZS
                </h3>
                <p className="text-xs font-bold text-violet-500 mt-1">
                  Foyda: {analytics?.summary?.monthlyProfit?.toLocaleString() || 0} UZS
                </p>
                <p className="text-xs font-bold text-indigo-500 mt-0.5">
                  Choychaqa: {analytics?.tipSummary?.monthlyTip?.toLocaleString() || 0} UZS
                </p>
              </div>
              <div className="bg-violet-50 p-3 rounded-2xl text-violet-600"><Activity /></div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-indigo-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-400">Tanlangan Filtr bo'yicha</p>
                <h3 className="text-2xl font-black text-indigo-600 mt-1">
                  {analytics?.summary?.totalIncome?.toLocaleString() || 0} UZS
                </h3>
                <p className="text-xs font-bold text-indigo-500 mt-1">
                  Foyda: {analytics?.summary?.totalProfit?.toLocaleString() || 0} UZS
                </p>
                <p className="text-xs font-bold text-indigo-500 mt-0.5">
                  Choychaqa: {analytics?.tipSummary?.totalTip?.toLocaleString() || 0} UZS
                </p>
              </div>
              <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><BarChart3 /></div>
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
                    <linearGradient
                      id="colorProfit"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                    formatter={(value, name) => [
                      `${value.toLocaleString()} so'm`,
                      name === 'daromad' ? 'Savdo' : 'Foyda',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="daromad"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                    name="daromad"
                  />
                  <Area
                    type="monotone"
                    dataKey="sofDaromad"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                    name="sofDaromad"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* OFITSIANTLAR GRAFIGI */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between lg:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Users className="text-indigo-500 w-5 h-5" /> Ofitsiantlar Tahlili
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Ofitsiantlarning choychaqa (xizmat haqi) ko'rsatkichlari grafigi
                </p>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-center">
                <button
                  onClick={() => setWaiterChartMetric("tip")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${waiterChartMetric === "tip" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Choychaqa
                </button>
                <button
                  onClick={() => setWaiterChartMetric("sales")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${waiterChartMetric === "sales" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Savdo
                </button>
              </div>
            </div>

            <div className="w-full h-64">
              {(waiterChartMetric === "tip" ? analytics?.waitersChartData : analytics?.waitersSalesChartData)?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={waiterChartMetric === "tip" ? analytics.waitersChartData : analytics.waitersSalesChartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toLocaleString()}k`}
                    />
                    <Tooltip formatter={(value, name) => [`${value.toLocaleString()} so'm`, name]} />
                    {Object.keys((waiterChartMetric === "tip" ? analytics.waitersChartData[0] : analytics.waitersSalesChartData[0]) || {}).filter(k => k !== 'label').map((key, index) => {
                      const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#14b8a6", "#f97316"];
                      const color = colors[index % colors.length];
                      return (
                        <Area
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={color}
                          strokeWidth={2}
                          fillOpacity={0.1}
                          fill={color}
                          name={key}
                        />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-slate-400 text-sm">Ma'lumot topilmadi</p>
                </div>
              )}
            </div>
          </div>

          {/* OFITSIANTLAR RO'YXATI TABLE */}
          {analytics?.waiterComparison?.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between lg:col-span-3">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-4">
                <Users className="text-indigo-500 w-5 h-5" /> Ofitsiantlar Jadvali
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase">Ofitsiant</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase">Umumiy Savdo</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase">Choychaqa (15%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.waiterComparison.map((w, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-700">{w.waiterUsername}</td>
                        <td className="p-3 font-semibold text-emerald-600">{w.totalSales.toLocaleString()} so'm</td>
                        <td className="p-3 font-semibold text-indigo-600">{w.totalTip.toLocaleString()} so'm</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                      <option value="barman">
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

        {/* SECTION: BUYURTMALAR BOSHQARUVI (Manager) */}
        {user.role === "manager" && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Layers className="text-indigo-500 w-5 h-5" /> Buyurtmalar Boshqaruvi
              </h3>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setOrderTab("active")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${orderTab === "active" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Faol Buyurtmalar ({activeOrders.length})
                </button>
                <button
                  onClick={() => setOrderTab("canceled")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${orderTab === "canceled" ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Bekor Qilinganlar ({canceledOrders.length})
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto pr-2">
              {(orderTab === "active" ? activeOrders : canceledOrders).map(order => (
                <div key={order.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${order.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                        {order.status === 'pending' ? 'Faol' : 'Bekor Qilingan'}
                      </span>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block font-medium">{order.location}</span>
                        <span className="text-xs font-black text-slate-700 bg-slate-200 px-2 py-0.5 rounded mt-0.5 inline-block">Stol: {order.tableNumber}</span>
                      </div>
                    </div>
                    <div className="space-y-1 mb-3 text-sm text-slate-700">
                      {order.OrderItems?.map((it, i) => (
                        <p key={i}>• {it.name} <span className="text-indigo-600 font-bold">x{it.quantity}</span></p>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-3 flex flex-col justify-between items-start gap-2 mt-2">
                    <span className="font-black text-slate-800 text-lg">{Number(order.totalAmount).toLocaleString()} so'm</span>
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="text-xs w-full bg-red-100 hover:bg-red-200 text-red-700 font-bold px-3 py-2 rounded-lg transition"
                      >
                        Bekor Qilish
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(orderTab === "active" ? activeOrders : canceledOrders).length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-400 font-medium border-2 border-dashed rounded-xl">
                  {orderTab === "active" ? "Hozircha faol buyurtmalar yo'q." : "Bekor qilingan buyurtmalar yo'q."}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: XODIMLAR BOSHQARUVI (Faqat Manager ko'radi) */}
        {user.role === "manager" && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-4">
              <Users className="text-blue-500 w-5 h-5" /> Barcha Xodimlar
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-xl rounded-bl-xl">Foydalanuvchi nomi</th>
                    <th className="px-4 py-3">Lavozimi (Role)</th>
                    <th className="px-4 py-3">Filial (Store)</th>
                    <th className="px-4 py-3 rounded-tr-xl rounded-br-xl text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.isArray(allUsers) && allUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        {editingUser === u.id ? (
                          <>
                            <input
                              type="text"
                              value={editForm.username}
                              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                              className="border p-1.5 rounded-lg text-sm outline-none focus:border-blue-500 w-full"
                            />
                            <input
                              type="password"
                              placeholder="Yangi parol (ixtiyoriy)"
                              value={editForm.password}
                              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                              className="border p-1.5 rounded-lg text-sm outline-none focus:border-blue-500 w-full mt-2"
                            />
                          </>
                        ) : (
                          <span className="font-bold text-slate-700">{u.username}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize font-medium">{u.role}</td>
                      <td className="px-4 py-3">
                        {editingUser === u.id && u.role === 'barman' ? (
                          <select
                            value={editForm.storeId}
                            onChange={(e) => setEditForm({ ...editForm, storeId: e.target.value })}
                            className="border p-1.5 rounded-lg text-sm outline-none focus:border-blue-500 w-full"
                          >
                            <option value="">Filialni tanlang</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-full text-slate-600">
                            {getStoreName(u.storeId)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingUser === u.id ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => saveUserEdit(u.id, u.role)} className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition" title="Saqlash">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition" title="Bekor qilish">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleEditUser(u)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition" title="Tahrirlash">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="O'chirish">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {allUsers.length === 0 && (
                    <tr><td colSpan="4" className="text-center py-4 text-slate-500">Foydalanuvchilar topilmadi.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
            {Array.isArray(txs) && txs.map((t) => (
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
        {/* CUSTOM CONFIRM MODAL FOR DELETING USERS */}
        {deleteUserModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Foydalanuvchini O'chirish</h3>
              <p className="text-slate-500 text-sm mb-6">
                Rostdan ham bu foydalanuvchini o'chirmoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteUserModal({ isOpen: false, userId: null, isLoading: false })}
                  disabled={deleteUserModal.isLoading}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  Yo'q, Qaytish
                </button>
                <button
                  onClick={confirmDeleteUser}
                  disabled={deleteUserModal.isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {deleteUserModal.isLoading ? "Kuting..." : "Ha, O'chirish"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM CONFIRM MODAL FOR CANCELING ORDERS */}
        {cancelModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Buyurtmani Bekor Qilish</h3>
              <p className="text-slate-500 text-sm mb-6">
                Rostdan ham bu buyurtmani bekor qilmoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setCancelModal({ isOpen: false, orderId: null, isLoading: false })}
                  disabled={cancelModal.isLoading}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  Yo'q, Qaytish
                </button>
                <button
                  onClick={confirmCancelOrder}
                  disabled={cancelModal.isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {cancelModal.isLoading ? "Kuting..." : "Ha, Bekor Qilish"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

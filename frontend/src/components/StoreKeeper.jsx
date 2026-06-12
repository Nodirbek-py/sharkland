import { useState, useEffect } from "react";
import axios from "axios";
import { Package, AlertTriangle, Plus, Edit2, Trash2, Box } from "lucide-react";

export default function StorekeeperDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("all");
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Mahsulot formasi
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodStock, setProdStock] = useState("");
  const [prodUnitType, setProdUnitType] = useState("pcs");
  const [prodCategory, setProdCategory] = useState("bar");
  const [targetStoreId, setTargetStoreId] = useState(""); // Qaysi do'konga biriktiriladi
  const [editingProduct, setEditingProduct] = useState(null);
  const [availableStores, setAvailableStores] = useState([]);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(
        "/api/storekeeper/inventory",
      );
      setInventory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(
        "/api/storekeeper/inventory/alerts",
      );
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await axios.get("/api/admin/stores"); // Ensure this endpoint exists
      setAvailableStores(res.data);
    } catch (err) {
      console.error("Do'konlarni yuklashda xatolik", err);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchAlerts();
    fetchStores(); // Fetch real stores
  }, []);

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!targetStoreId)
      return alert("Iltimos, mahsulot uchun filialni tanlang!");

    const payload = {
      name: prodName,
      price: Number(prodPrice),
      stock: Number(prodStock),
      unitType: prodUnitType,
      category: prodCategory,
      storeId: targetStoreId,
    };

    try {
      if (editingProduct) {
        await axios.put(
          `/api/storekeeper/inventory/${editingProduct.id}`,
          payload,
        );
      } else {
        await axios.post(
          `/api/storekeeper/inventory`,
          payload,
        );
      }
      resetForm();
      fetchInventory();
      fetchAlerts();
    } catch (err) {
      alert("Xatolik yuz berdi");
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setProdName("");
    setProdPrice("");
    setProdStock("");
    setTargetStoreId("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Box className="text-indigo-600" /> Bosh Omborxona
        </h1>
        <div className="flex bg-slate-100 p-1 rounded-xl border">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === "all" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600"}`}
          >
            Barcha Mahsulotlar ({inventory.length})
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1 transition ${activeTab === "alerts" ? "bg-red-500 text-white shadow-sm" : "text-slate-600"}`}
          >
            <AlertTriangle className="w-4 h-4" /> Kam Qolgan ({alerts.length})
          </button>
        </div>
        <button onClick={onLogout} className="text-sm font-bold text-red-600">
          Chiqish
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid md:grid-cols-3 gap-6">
        {/* FORMA: Yangi qo'shish yoki tahrirlash */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm h-fit">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            {editingProduct ? (
              <Edit2 className="text-amber-500 w-5 h-5" />
            ) : (
              <Plus className="text-indigo-500 w-5 h-5" />
            )}
            {editingProduct ? "Tahrirlash" : "Yangi Qo'shish"}
          </h2>
          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Qaysi Filialga (Do'kon)?
              </label>
              <select
                required
                value={targetStoreId}
                onChange={(e) => setTargetStoreId(e.target.value)}
                className="w-full border p-2.5 rounded-xl bg-slate-50 text-sm font-semibold border-indigo-200"
              >
                <option value="">Filialni tanlang...</option>
                {availableStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Nomi
              </label>
              <input
                type="text"
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                className="w-full border p-2.5 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Narxi (So'm)
                </label>
                <input
                  type="number"
                  required
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  className="w-full border p-2.5 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Soni/Miqdori
                </label>
                <input
                  type="number"
                  required
                  value={prodStock}
                  onChange={(e) => setProdStock(e.target.value)}
                  className="w-full border p-2.5 rounded-xl text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm"
            >
              {editingProduct ? "Saqlash" : "Omborga Qo'shish"}
            </button>
            {editingProduct && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full bg-slate-200 mt-2 text-slate-700 py-2.5 rounded-xl text-sm font-bold"
              >
                Bekor qilish
              </button>
            )}
          </form>
        </div>

        {/* JADVAL: Barcha Mahsulotlar / Kam Qolganlar */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            {activeTab === "all" ? (
              <Package className="text-indigo-500" />
            ) : (
              <AlertTriangle className="text-red-500" />
            )}
            {activeTab === "all"
              ? "Umumiy Baza"
              : "Zudlik bilan to'ldirish kerak"}
          </h2>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-500">
                <th className="p-3">Filial</th>
                <th className="p-3">Mahsulot</th>
                <th className="p-3">Qoldiq</th>
                <th className="p-3 text-center">Amal</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === "all" ? inventory : alerts).map((p) => (
                <tr key={p.id} className="border-b hover:bg-slate-50/50">
                  <td className="p-3 font-mono text-xs font-bold text-slate-500">
                    {
                      availableStores?.find((store) => store.id === p.storeId)
                        ?.name
                    }
                  </td>
                  <td className="p-3 font-semibold text-slate-800">{p.name}</td>
                  <td className="p-3">
                    <span
                      className={`font-bold px-2 py-1 rounded text-xs ${Number(p.stock) <= 5 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                    >
                      {Number(p.stock).toFixed(0)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => {
                        setEditingProduct(p);
                        setProdName(p.name);
                        setProdPrice(p.price);
                        setProdStock(p.stock);
                        setTargetStoreId(p.storeId);
                      }}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

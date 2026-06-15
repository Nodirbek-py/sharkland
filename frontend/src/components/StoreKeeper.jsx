import { useState, useEffect } from "react";
import axios from "axios";
import { Package, AlertTriangle, Plus, Edit2, Trash2, Box, Clock } from "lucide-react";

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
  const [logs, setLogs] = useState([]);
  const [stockAction, setStockAction] = useState("add");
  const [prodImage, setProdImage] = useState(null);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/storekeeper/inventory",
      );
      setInventory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/storekeeper/inventory/alerts",
      );
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/stores"); // Ensure this endpoint exists
      setAvailableStores(res.data);
    } catch (err) {
      console.error("Do'konlarni yuklashda xatolik", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/storekeeper/inventory/logs",
      );
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchAlerts();
    fetchStores(); // Fetch real stores
    fetchLogs();
  }, []);

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!targetStoreId)
      return alert("Iltimos, mahsulot uchun filialni tanlang!");

    let finalStock = Number(prodStock);
    if (editingProduct) {
      if (stockAction === "add") {
        finalStock = Number(editingProduct.stock) + Number(prodStock);
      } else if (stockAction === "subtract") {
        finalStock = Number(editingProduct.stock) - Number(prodStock);
        if (finalStock < 0) finalStock = 0;
      }
    }

    const formData = new FormData();
    formData.append("name", prodName);
    formData.append("price", Number(prodPrice));
    formData.append("stock", finalStock);
    formData.append("unitType", prodUnitType);
    formData.append("category", prodCategory);
    formData.append("storeId", targetStoreId);
    formData.append("username", user.username);
    if (prodImage) {
      formData.append("image", prodImage);
    }

    try {
      if (editingProduct) {
        await axios.put(
          `http://localhost:5000/api/storekeeper/inventory/${editingProduct.id}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      } else {
        await axios.post(
          `http://localhost:5000/api/storekeeper/inventory`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      }
      resetForm();
      fetchInventory();
      fetchAlerts();
      fetchLogs();
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
    setStockAction("add");
    setProdImage(null);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Rostdan ham bu mahsulotni o'chirmoqchimisiz?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/storekeeper/inventory/${id}?username=${user.username}`);
      fetchInventory();
      fetchAlerts();
      fetchLogs();
    } catch (err) {
      alert("O'chirishda xatolik yuz berdi");
    }
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
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1 transition ${activeTab === "history" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600"}`}
          >
            <Clock className="w-4 h-4" /> Tarix
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

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Mahsulot Rasmi (Ixtiyoriy)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProdImage(e.target.files[0])}
                className="w-full border p-2.5 rounded-xl text-sm bg-slate-50"
              />
              {editingProduct && editingProduct.imageUrl && (
                <p className="text-[10px] mt-1 text-slate-400 font-bold">
                  Hozirgi rasm mavjud. Yangisini yuklasangiz, almashtiriladi.
                </p>
              )}
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
                  {editingProduct ? "O'zgarish Miqdori" : "Dastlabki Soni/Miqdori"}
                </label>
                {editingProduct && (
                  <div className="flex bg-slate-100 p-1 rounded-xl mb-2">
                    <button
                      type="button"
                      onClick={() => setStockAction("add")}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${stockAction === "add" ? "bg-white text-green-600 shadow-sm" : "text-slate-500"}`}
                    >
                      Qo'shish (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockAction("subtract")}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${stockAction === "subtract" ? "bg-white text-red-600 shadow-sm" : "text-slate-500"}`}
                    >
                      Ayirish (-)
                    </button>
                  </div>
                )}
                <input
                  type="number"
                  required
                  placeholder={editingProduct ? "Miqdorni kiriting (masalan: 5)" : "Soni"}
                  value={prodStock}
                  onChange={(e) => setProdStock(e.target.value)}
                  className="w-full border p-2.5 rounded-xl text-sm"
                  min="0"
                />
                {editingProduct && (
                  <p className="text-[10px] mt-1 text-slate-400 font-bold">
                    Hozirgi qoldiq: {Number(editingProduct.stock)} {editingProduct.unitType}
                  </p>
                )}
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

        {/* JADVAL: Barcha Mahsulotlar / Kam Qolganlar / Tarix */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border shadow-sm">
          {activeTab !== "history" ? (
            <>
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
                            setProdStock(""); // amount is blank initially
                            setStockAction("add");
                            setTargetStoreId(p.storeId);
                            setProdImage(null);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 bg-slate-50 rounded-lg ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(activeTab === "all" ? inventory : alerts).length === 0 && (
                     <tr><td colSpan="4" className="text-center py-4 text-slate-500">Ma'lumot topilmadi.</td></tr>
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Clock className="text-indigo-500" /> Barcha Amallar Tarixi
              </h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-xl bg-slate-50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        log.actionType === 'Yaratildi' ? 'bg-green-100 text-green-700' :
                        log.actionType === 'O\'chirildi' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {log.actionType}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 mb-1">
                      {log.productName} <span className="font-normal text-slate-500 text-xs">({log.storekeeperUsername})</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      {log.details}
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center py-4 text-slate-500 text-sm">Hali hech qanday tarix mavjud emas.</div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

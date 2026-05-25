import { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Coffee,
  CheckCircle,
  Package,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Layers,
} from "lucide-react";

const socket = io("http://localhost:5000");

export default function VendorDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [cards, setCards] = useState({});
  const [quickAmount, setQuickAmount] = useState("");
  const [quickCardId, setQuickCardId] = useState("");

  // Omborxona (Inventory) uchun shtatlar
  const [products, setProducts] = useState([]);
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodStock, setProdStock] = useState("");
  const [prodUnitType, setProdUnitType] = useState("pcs");
  const [prodCategory, setProdCategory] = useState("bar");
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchPendingOrders = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/vendors/orders/pending",
      );
      setOrders(res.data);
    } catch (err) {
      console.error("Buyurtmalarni yuklashda xatolik:", err);
    }
  };

  useEffect(() => {
    console.log(user)
    // Agar buyurtmalar oynasi ochiq bo'lsa, bazadan pending buyurtmalarni tortadi
    if (activeTab === "orders") {
      fetchPendingOrders();
    }

    if (activeTab === "inventory") {
      if (user.username.includes("bar")) setProdCategory("bar");
      else if (user.username.includes("cafe")) setProdCategory("cafe");
      fetchInventory();
    }
  }, [activeTab]);

  useEffect(() => {
    socket.on("new_order", (order) => setOrders((prev) => [order, ...prev]));
    socket.on("order_paid", ({ orderId }) =>
      setOrders((prev) => prev.filter((o) => o.id !== orderId)),
    );
    return () => {
      socket.off("new_order");
      socket.off("order_paid");
    };
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/vendors/inventory?vendorUsername=${user.username}`,
      );
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddOrUpdateProduct = async (e) => {
    console.log(user)
    e.preventDefault();
    const payload = {
      name: prodName,
      price: Number(prodPrice),
      stock: Number(prodStock),
      unitType: prodUnitType,
      category: prodCategory,
      vendorUsername: user.username,
      storeId: user.storeId,
    };

    try {
      if (editingProduct) {
        await axios.put(
          `http://localhost:5000/api/vendors/inventory/${editingProduct.id}`,
          payload,
        );
        setEditingProduct(null);
      } else {
        await axios.post(
          `http://localhost:5000/api/vendors/inventory`,
          payload,
        );
      }
      setProdName("");
      setProdPrice("");
      setProdStock("");
      setProdUnitType("pcs");
      fetchInventory();
    } catch (err) {
      alert("Xatolik yuz berdi");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (confirm("Mahsulot o'chirilsinmi?")) {
      await axios.delete(`http://localhost:5000/api/vendors/inventory/${id}`);
      fetchInventory();
    }
  };

  const handleCharge = async (orderId) => {
    const cardId = cards[orderId];
    if (!cardId) return alert("Kartani o'qiting!");
    try {
      const res = await axios.post(
        "http://localhost:5000/api/vendors/orders/charge-pending",
        {
          orderId,
          nfcCardId: cardId,
          storeId: user.storeId,
        },
      );
      alert(`To'lov muvaffaqiyatli! Qoldiq: ${res.data.remainingBalance} so'm`);
      // ... rest of the logic
    } catch (err) {
      alert(err.response?.data?.message);
    }
  };

  // 2. UPDATE: Pass storeId for Quick Charge
  const handleQuickCharge = async (e) => {
    e.preventDefault();
    if (!quickCardId) return alert("NFC Kartani skanerlang!");
    if (!quickAmount || Number(quickAmount) <= 0)
      return alert("To'g'ri summa kiriting!");

    try {
      const res = await axios.post(
        "http://localhost:5000/api/vendors/quick-charge",
        {
          nfcCardId: quickCardId,
          amount: Number(quickAmount),
          vendorName: user.username.toUpperCase(),
          storeId: user.storeId,
        },
      );
      // ... rest of the logic
    } catch (err) {
      alert(err.response?.data?.message || "To'lov amalga oshmadi");
    }
  };

  // O'lchov birligi nomlarini chiroyli qilib ko'rsatish funksiyasi
  const renderUnitName = (type) => {
    const units = {
      pcs: "dona",
      kg: "kg",
      liters: "litr",
      portions: "portsiya",
    };
    return units[type] || type;
  };

  const vendorSpecificOrders = orders.filter((order) =>
    order.items.some((item) => item.vendorUsername === user.username),
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="bg-white border-b p-4 flex flex-col sm:flex-row justify-between items-center shadow-sm gap-4">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Coffee className="text-green-600" /> Vendor Panel (
          {user.username.toUpperCase()})
        </h1>

        {/* TABS */}
        <div className="flex bg-slate-100 p-1 rounded-xl border">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${activeTab === "orders" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            <Layers className="w-4 h-4" /> Buyurtmalar (
            {vendorSpecificOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("quickpay")}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${activeTab === "quickpay" ? "bg-white text-green-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            <DollarSign className="w-4 h-4" /> Tezkor To'lov
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${activeTab === "inventory" ? "bg-white text-amber-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            <Package className="w-4 h-4" /> Omborxona (Inventory)
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onLogout}
            className="text-sm font-bold text-red-600 hover:underline"
          >
            Chiqish
          </button>
        </div>
      </header>

      {/* BODY KONTENT */}
      <main className="max-w-7xl mx-auto p-6">
        {/* TAB 1 & TAB 2 KODI (O'z holicha qoladi) */}
        {activeTab === "orders" && (
          <div>
            {vendorSpecificOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed text-slate-400 font-medium">
                Hozircha faol buyurtmalar yo'q.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                {vendorSpecificOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white p-5 rounded-2xl border-2 border-blue-100 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center border-b pb-2 mb-3">
                        <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold">
                          Kutilmoqda
                        </span>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-medium">
                            {order.location}
                          </span>
                          <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            Stol: {order.tableNumber}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {order.items.map((it, i) => (
                          <p
                            key={i}
                            className="text-sm text-slate-700 font-medium"
                          >
                            • {it.name}{" "}
                            <span className="text-blue-600 font-bold">
                              x{it.quantity}
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="border-t pt-3 mt-4">
                      <p className="font-black text-slate-900 text-lg mb-3">
                        {order.totalAmount.toLocaleString()} so'm
                      </p>
                      <input
                        type="text"
                        placeholder="Karta readerga tekkazing"
                        value={cards[order.id] || ""}
                        onChange={(e) =>
                          setCards({ ...cards, [order.id]: e.target.value })
                        }
                        className="w-full border p-2.5 rounded-xl text-center font-mono bg-amber-50 text-sm mb-2 outline-none"
                      />
                      <button
                        onClick={() => handleCharge(order.id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition"
                      >
                        <CheckCircle className="w-4 h-4" /> To'lovni Yopish
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "quickpay" && (
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <DollarSign className="text-green-600" /> Tezkor Xizmat To'lovi
            </h2>
            <form onSubmit={handleQuickCharge} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Narxi (UZS)
                </label>
                <input
                  type="number"
                  required
                  placeholder="Narxi"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  className="w-full border p-3 rounded-xl outline-none text-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  NFC Karta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Kartani bosing..."
                  value={quickCardId}
                  onChange={(e) => setQuickCardId(e.target.value)}
                  className="w-full border p-3 rounded-xl font-mono bg-amber-50 text-center text-sm outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition"
              >
                To'lovni Tasdiqlash
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: OMBORXONA YANGILANGAN VERSIYASI */}
        {activeTab === "inventory" && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* INPUT FORMA PANEL */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm h-fit">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                {editingProduct ? (
                  <Edit2 className="text-amber-500 w-5 h-5" />
                ) : (
                  <Plus className="text-blue-500 w-5 h-5" />
                )}
                {editingProduct ? "Mahsulotni Tahrirlash" : "Yangi Mahsulot"}
              </h2>
              <form onSubmit={handleAddOrUpdateProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Mahsulot Nomi
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Gilos sharbati"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full border p-2.5 rounded-xl outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      O'lchov Turi
                    </label>
                    <select
                      value={prodUnitType}
                      onChange={(e) => setProdUnitType(e.target.value)}
                      className="w-full border p-2.5 rounded-xl bg-white outline-none focus:border-blue-500 text-sm font-semibold"
                    >
                      <option value="pcs">Dona (pcs)</option>
                      <option value="portions">Portsiya</option>
                      <option value="kg">Kilogramm (kg)</option>
                      <option value="liters">Litr (liters)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Kategoriya
                    </label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full border p-2.5 rounded-xl bg-white outline-none focus:border-blue-500 text-sm font-semibold"
                    >
                      <option value="bar">Bar</option>
                      <option value="cafe">Kafe</option>
                      <option value="restaurant">Restoran</option>
                      <option value="store">Do'kon</option>
                      <option value="ride">Attraksion</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Narxi (So'm)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="15000"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      className="w-full border p-2.5 rounded-xl outline-none text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {prodUnitType === "kg" || prodUnitType === "liters"
                        ? "Hajmi / Og'irligi"
                        : "Soni (Miqdori)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder={
                        prodUnitType === "kg" || prodUnitType === "liters"
                          ? "5.50"
                          : "100"
                      }
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                      className="w-full border p-2.5 rounded-xl outline-none text-sm font-bold bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className={`flex-1 text-white font-bold py-2.5 rounded-xl text-sm transition ${editingProduct ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}
                  >
                    {editingProduct ? "Saqlash" : "Omborga Qo'shish"}
                  </button>
                  {editingProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(null);
                        setProdName("");
                        setProdPrice("");
                        setProdStock("");
                      }}
                      className="bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold"
                    >
                      Bekor qilish
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* INTEGRATSIYALASHGAN JADVAL */}
            <div className="md:col-span-2 bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Package className="text-amber-500 w-5 h-5" /> Mavjud
                Mahsulotlar Ro'yxati
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-500">
                      <th className="p-3">Mahsulot nomi</th>
                      <th className="p-3">Kategoriya</th>
                      <th className="p-3">Narxi</th>
                      <th className="p-3">Ombor qoldig'i</th>
                      <th className="p-3 text-center">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="text-center py-8 text-slate-400 italic"
                        >
                          Omborxona bo'sh. Mahsulot kiriting.
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b hover:bg-slate-50/50"
                        >
                          <td className="p-3 font-semibold text-slate-700">
                            <div>{p.name}</div>
                          </td>
                          <td className="p-3">
                            <span className="text-xs font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {p.category}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            {Number(p.price).toLocaleString()} so'm
                          </td>
                          <td className="p-3">
                            <span
                              className={`font-bold px-2 py-1 rounded text-xs ${Number(p.stock) <= 5 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}
                            >
                              {Number(p.stock)} {renderUnitName(p.unitType)}
                            </span>
                          </td>
                          <td className="p-3 text-center space-x-2">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setProdName(p.name);
                                setProdPrice(p.price);
                                setProdStock(p.stock);
                                setProdUnitType(p.unitType);
                                setProdCategory(p.category);
                              }}
                              className="p-1.5 text-slate-500 hover:text-amber-600 bg-slate-50 rounded-lg inline-flex"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 bg-slate-50 rounded-lg inline-flex"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

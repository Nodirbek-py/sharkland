import { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { Coffee, CheckCircle, DollarSign, Layers, Printer, ShoppingCart, Trash2, Search } from "lucide-react";
import { useMemo } from "react";

const socket = io("");

async function printReceipt(order) {
  try {
    console.log(window.api);
    if (window.api) {
      const result = await window.api.printReceipt(order);
      if (!result.success) {
        console.error("Printer error:", result.error);
        alert("Printer xatosi: " + result.error);
      }
    } else {
      console.warn("Electron muhitida emasmiz, print ishlamaydi.");
    }
  } catch (err) {
    console.error(err);
  }
}

export default function VendorDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [cards, setCards] = useState({});
  const [quickAmount, setQuickAmount] = useState("");
  const [quickCardId, setQuickCardId] = useState("");
  const [quickChargeModal, setQuickChargeModal] = useState({
    isOpen: false,
    isLoading: false,
    isSuccess: false,
    visitor: null,
    amount: 0,
    nfcCardId: ""
  });
  const [printerName, setPrinterName] = useState("");
  const [saved, setSaved] = useState(false);

  // Kassa (POS) states
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [posCardId, setPosCardId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (window.api) {
      window.api.getPrinterName().then((name) => setPrinterName(name));
    }
  }, []);

  const handleSave = async () => {
    if (window.api) {
      const res = await window.api.savePrinterName(printerName);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000); // clear alert badge
      } else {
        alert("Saqlashda xatolik: " + res.error);
      }
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const res = await axios.get(
        `/api/vendors/orders/pending?storeId=${user.storeId}`,
      );
      setOrders(res.data);
    } catch (err) {
      console.error("Buyurtmalarni yuklashda xatolik:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "orders") {
      fetchPendingOrders();
    } else if (activeTab === "pos") {
      fetchProducts();
    }
  }, [activeTab]);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(
        `/api/vendors/inventory?storeId=${user.storeId}`
      );
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        return alert("Omborda yetarli emas!");
      }
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      if (product.stock <= 0) return alert("Omborda yo'q!");
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1
        }
      ]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const handlePosCheckout = async (e) => {
    e.preventDefault();
    if (!posCardId) return alert("NFC kartani skanerlang!");
    if (cart.length === 0) return alert("Savatcha bo'sh!");

    try {
      const res = await axios.post("/api/vendors/direct-sale", {
        nfcCardId: posCardId,
        items: cart,
        vendorName: user.username,
        storeId: user.storeId
      });

      alert(`To'lov muvaffaqiyatli! Qoldiq: ${res.data.remainingBalance} so'm`);

      const storeTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

      await printReceipt({
        id: res.data.orderId || "KASSA",
        location: "Kassa",
        tableNumber: "Kassa",
        items: cart.map(i => ({ name: i.name, quantity: i.quantity, priceAtPurchase: i.price, storeId: user.storeId })),
        storeTotal
      });

      setCart([]);
      setPosCardId("");
      fetchProducts(); // Refresh stock
    } catch (err) {
      alert(err.response?.data?.message || "Xatolik yuz berdi");
    }
  };

  useEffect(() => {
    socket.on("new_order", async (order) => {
      setOrders((prev) => [order, ...prev]);
      const belongsToMe = order.items.some(
        (item) => item.storeId === user.storeId,
      );

      if (belongsToMe) {
        const myItems = order.items.filter(
          (item) => item.storeId === user.storeId,
        );

        const storeTotal = myItems.reduce(
          (sum, item) =>
            sum +
            (Number(item.priceAtPurchase) || 0) * (Number(item.quantity) || 0),
          0,
        );

        await printReceipt({
          ...order,
          items: myItems,
          storeTotal,
        });
      }
    });
    socket.on("store_order_paid", ({ orderId, paidStoreId }) => {
      if (user.storeId === paidStoreId) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
    });

    return () => {
      socket.off("new_order");
      socket.off("store_order_paid");
    };
  }, [user.storeId]);

  const handleCharge = async (orderId) => {
    const cardId = cards[orderId];
    if (!cardId) return alert("Kartani o'qiting!");
    try {
      const res = await axios.post(
        "/api/vendors/orders/charge-pending",
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

  const initiateQuickCharge = async (e) => {
    e.preventDefault();
    if (!quickCardId) return alert("NFC Kartani skanerlang!");
    if (!quickAmount || Number(quickAmount) <= 0)
      return alert("To'g'ri summa kiriting!");

    try {
      // Birinchi mijozni qidiramiz
      const res = await axios.get(`/api/visitors/scan/${quickCardId}`);
      setQuickChargeModal({
        isOpen: true,
        isLoading: false,
        isSuccess: false,
        visitor: res.data,
        amount: Number(quickAmount),
        nfcCardId: quickCardId
      });
    } catch (err) {
      alert(err.response?.data?.message || "Karta egasi topilmadi");
    }
  };

  const confirmQuickCharge = async () => {
    setQuickChargeModal((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await axios.post(
        "/api/vendors/quick-charge",
        {
          nfcCardId: quickChargeModal.nfcCardId,
          amount: quickChargeModal.amount,
          vendorName: user.username.toUpperCase(),
          storeId: user.storeId,
        },
      );

      setQuickChargeModal((prev) => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
        visitor: { ...prev.visitor, balance: res.data.remainingBalance }
      }));
      setQuickAmount("");
      setQuickCardId("");
    } catch (err) {
      alert(err.response?.data?.message || "To'lov amalga oshmadi");
      setQuickChargeModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const processedOrders = useMemo(() => {
    return (
      orders
        .map((order) => {
          // Backenddan "items" yoki "OrderItems" nomi bilan kelishiga qaramay ushlab olamiz
          const rawItems = order.items || order.OrderItems || [];

          // 2. Faqat hozirgi vendorning do'koniga (storeId) tegishli mahsulotlarni ajratib olamiz
          const myItems = rawItems.filter(
            (item) => item.storeId === user.storeId,
          );

          // 3. SHU DO'KON UCHUN JAMI SUMMANI HISOBLAYMIZ
          const storeTotal = myItems.reduce((sum, item) => {
            // Agar narx yoki soni kelmasa, NaN chiqmasligi uchun nolga (0) tenglaymiz
            const itemPrice = Number(item.priceAtPurchase) || 0;
            const itemQty = Number(item.quantity) || 0;

            return sum + itemPrice * itemQty;
          }, 0);

          // 4. Buyurtmani faqat o'zimizga tegishli mahsulotlar va yangi hisoblangan summa bilan qaytaramiz
          return { ...order, items: myItems, storeTotal };
        })
        // 5. Agar buyurtma ichida bu vendorga tegishli HECH NARSA bo'lmasa, ekrandan olib tashlaymiz
        .filter((order) => order.items.length > 0)
    );
  }, [orders]);

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
            <Layers className="w-4 h-4" /> Buyurtmalar ({processedOrders.length}
            )
          </button>
          <button
            onClick={() => setActiveTab("quickpay")}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${activeTab === "quickpay" ? "bg-white text-green-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            <DollarSign className="w-4 h-4" /> Tezkor To'lov
          </button>
          <button
            onClick={() => setActiveTab("pos")}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${activeTab === "pos" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            <ShoppingCart className="w-4 h-4" /> Kassa (Sotuv)
          </button>
          <button
            onClick={() => setActiveTab("printer")}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${activeTab === "printer" ? "bg-white text-green-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            <Printer className="w-4 h-4" /> Printer
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
            {processedOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed text-slate-400 font-medium">
                Hozircha faol buyurtmalar yo'q.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                {processedOrders?.map((order) => (
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
                      {order.items[0]?.isPaid ? (
                        <>
                          <div className="bg-green-100 text-green-800 p-2 mb-2 rounded-xl font-bold text-center text-sm flex items-center justify-center gap-1">
                            <CheckCircle className="w-4 h-4" /> To'langan (Naqd)
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await axios.post("/api/vendors/orders/mark-done", { orderId: order.id, storeId: user.storeId });
                              } catch (err) { alert("Xatolik: " + err?.response?.data?.message || err.message); }
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-sm transition"
                          >
                            Tayyor (Yopish)
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="font-black text-slate-900 text-lg mb-3">
                            {order.storeTotal.toLocaleString()} so'm
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
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "pos" && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ShoppingCart className="text-emerald-500" /> Mahsulotlar (Kassa)
                </h2>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Mahsulot qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border p-2 pl-9 rounded-xl text-sm outline-none bg-slate-50 focus:bg-white focus:border-emerald-300 w-full transition"
                  />
                </div>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-12 text-slate-400">Hozircha mahsulotlar yo'q.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto pr-2" style={{ maxHeight: "60vh" }}>
                  {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((p) => (
                    <div
                      key={p.id}
                      className={`border p-4 rounded-xl flex flex-col justify-between bg-white shadow-sm transition ${Number(p.stock) <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md cursor-pointer border-emerald-100'}`}
                      onClick={() => Number(p.stock) > 0 && addToCart(p)}
                    >
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{p.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">Omborda: <span className="font-bold text-slate-700">{Number(p.stock).toFixed(0)}</span></p>
                      </div>
                      <div className="mt-3 font-extrabold text-emerald-600">
                        {Number(p.price).toLocaleString()} so'm
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <form onSubmit={handlePosCheckout} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:sticky lg:top-4">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Savatcha</h2>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto mb-4 border-t border-b py-3">
                  {cart.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">Bo'sh</p>
                  ) : (
                    cart.map((i) => (
                      <div key={i.productId} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-slate-800">{i.name}</p>
                          <p className="text-[10px] text-slate-500">{Number(i.price).toLocaleString()} x {i.quantity}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-600">{(i.price * i.quantity).toLocaleString()}</span>
                          <button type="button" onClick={() => removeFromCart(i.productId)} className="text-red-500 bg-red-50 p-1.5 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-between text-lg font-bold mb-4 text-slate-800">
                  <span>Jami:</span>
                  <span className="text-emerald-600">
                    {cart.reduce((s, i) => s + i.price * i.quantity, 0).toLocaleString()} so'm
                  </span>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1">NFC Karta</label>
                  <input
                    type="text"
                    required
                    placeholder="Kartani skanerlang..."
                    value={posCardId}
                    onChange={(e) => setPosCardId(e.target.value)}
                    className="w-full border p-3 rounded-xl font-mono bg-amber-50 text-center outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={cart.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition"
                >
                  Sotish va To'lov
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "quickpay" && (
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <DollarSign className="text-green-600" /> Tezkor Xizmat To'lovi
            </h2>
            <form onSubmit={initiateQuickCharge} className="space-y-5">
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

        {activeTab === "printer" && (
          <div
            style={{
              padding: "20px",
              border: "1px solid #ccc",
              borderRadius: "8px",
            }}
          >
            <h3>Printer Sozlamalari</h3>
            <p style={{ fontSize: "12px", color: "#666" }}>
              Mac terminalida <code>lpstat -p</code> buyrug'i orqali ko'ringan
              nomni kiriting.
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
                placeholder="Masalan: Xprinter_XP_58"
                style={{
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #aaa",
                  flex: 1,
                }}
              />
              <button
                onClick={handleSave}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#0070f3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {saved ? "Saqlandi! ✅" : "Saqlash"}
              </button>
            </div>
          </div>
        )}
        {quickChargeModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              {!quickChargeModal.isSuccess ? (
                <>
                  <h3 className="text-xl font-bold text-slate-800 mb-4">To'lovni Tasdiqlash</h3>
                  <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border">
                    <p className="flex justify-between text-sm">
                      <span className="text-slate-500 font-medium">Mijoz:</span>
                      <span className="font-bold text-slate-800">{quickChargeModal.visitor?.name}</span>
                    </p>
                    <p className="flex justify-between text-sm">
                      <span className="text-slate-500 font-medium">Joriy Balans:</span>
                      <span className="font-bold text-blue-600">{Number(quickChargeModal.visitor?.balance).toLocaleString()} so'm</span>
                    </p>
                    <div className="border-t pt-2 mt-2">
                      <p className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Yechiladigan summa:</span>
                        <span className="font-black text-red-600">-{quickChargeModal.amount.toLocaleString()} so'm</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setQuickChargeModal({ ...quickChargeModal, isOpen: false })}
                      disabled={quickChargeModal.isLoading}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition disabled:opacity-50"
                    >
                      Bekor qilish
                    </button>
                    <button
                      onClick={confirmQuickCharge}
                      disabled={quickChargeModal.isLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {quickChargeModal.isLoading ? "Kuting..." : "Tasdiqlash"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">To'lov Muvaffaqiyatli!</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Yangi qoldiq: <span className="font-bold text-green-600">{Number(quickChargeModal.visitor?.balance).toLocaleString()} so'm</span>
                  </p>
                  <button
                    onClick={() => setQuickChargeModal({ ...quickChargeModal, isOpen: false })}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition"
                  >
                    Yopish
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

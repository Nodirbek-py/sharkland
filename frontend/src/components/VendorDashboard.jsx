import { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { Coffee, CheckCircle, DollarSign, Layers, Printer } from "lucide-react";
import { useMemo } from "react";

const socket = io("http://localhost:5000");

async function printReceipt(order) {
  try {
    console.log(window.api);
    if (window.api) {
      console.log("hey");
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
  const [printerName, setPrinterName] = useState("");
  const [saved, setSaved] = useState(false);

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
        `http://localhost:5000/api/vendors/orders/pending?storeId=${user.storeId}`,
      );
      setOrders(res.data);
    } catch (err) {
      console.error("Buyurtmalarni yuklashda xatolik:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "orders") {
      fetchPendingOrders();
    }
  }, [activeTab]);

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
      </main>
    </div>
  );
}

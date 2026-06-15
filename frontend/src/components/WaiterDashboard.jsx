import { useState, useEffect } from "react";
import axios from "axios";
import { ShoppingBag, Send, Layers, Hash, Trash2, Search, DollarSign } from "lucide-react";

export default function WaiterDashboard({ user, onLogout }) {
  const [products, setProducts] = useState([]); // Real inventory mahsulotlari
  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState(""); // Yangi: Stol raqami shtati
  const [searchQuery, setSearchQuery] = useState(""); // Qidiruv uchun state
  const [selectedVendor, setSelectedVendor] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const vendors = Array.from(new Set(products.map((p) => p.vendorUsername)));

  useEffect(() => {
    fetchLiveInventory();
  }, []);

  const fetchLiveInventory = async () => {
    try {
      const res = await axios.get(
        "/api/vendors/products/all",
      );
      setProducts(res.data);
    } catch (err) {
      console.error("Menyuni yuklashda xatolik:", err);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          vendorUsername: product.vendorUsername, // Vendor filtrlashi uchun juda muhim!
        },
      ]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const handleSendOrderClick = () => {
    if (!tableNumber.trim()) {
      return alert("Iltimos, avval stol raqamini kiriting!");
    }
    setShowPaymentModal(true);
  };

  const confirmAndSendOrder = async (isPaidOnSpot) => {
    setShowPaymentModal(false);

    const total = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    try {
      await axios.post("/api/vendors/orders/place", {
        items: cart,
        location: "Umumiy Zal",
        tableNumber: tableNumber,
        totalAmount: total,
        waiterUsername: user.username,
        paidOnSpot: isPaidOnSpot
      });
      alert(`Buyurtma muvaffaqiyatli jo'natildi! (Stol: ${tableNumber})`);
      setCart([]);
      setTableNumber(""); // Stol raqamini tozalash
    } catch (err) {
      alert("Buyurtmani yuborishda xatolik yuz berdi.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Layers className="text-amber-500" /> Ofitsiant Terminali
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">
            Ofitsiant: {user.username}
          </span>
          <button
            onClick={onLogout}
            className="text-sm font-bold text-red-600 hover:underline"
          >
            Chiqish
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-3 sm:p-6 grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* CHAP TOMON: DINAMIK MENYU */}
        <div className="lg:col-span-2 bg-white p-3 sm:p-6 rounded-2xl shadow-sm border">
          <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Raqamli Menyu (Ombordan)
            </h2>
          </div>

          {/* QIDIRUV */}
          <div className="flex gap-2 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Mahsulot nomini qidiring..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm bg-slate-50 outline-none focus:bg-white focus:border-blue-500 transition"
              />
            </div>
          </div>

          {products.filter((p) => {
            const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchVendor = selectedVendor === "" || p.vendorUsername === selectedVendor;
            return matchSearch && matchVendor;
          }).length === 0 ? (
            <p className="text-slate-400 italic text-sm text-center py-12">
              Mahsulot topilmadi.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products
                .filter((p) => {
                  const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchVendor = selectedVendor === "" || p.vendorUsername === selectedVendor;
                  return matchSearch && matchVendor;
                })
                .map((p) => (
                  <div
                    key={p.id}
                    className="border p-3 rounded-xl flex flex-col justify-between bg-white shadow-sm hover:shadow-md transition"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 text-xs sm:text-sm leading-tight line-clamp-2">
                        {p.name}
                      </h3>
                      <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase mt-1.5 inline-block">
                        {p.category}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-between items-end">
                      <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {Number(p.price).toLocaleString()}
                      </span>
                      <button
                        onClick={() => addToCart(p)}
                        className="bg-blue-600 text-white text-lg font-bold w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-blue-700 active:scale-95 transition-transform shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* O'NG TOMON: SAVATCHA VA STOL INPUTI */}
        <div className="lg:col-span-1">
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border flex flex-col justify-between min-h-[400px] lg:sticky lg:top-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ShoppingBag className="text-blue-500" /> Savatcha
              </h2>

              {/* STOL RAQAMINI KIRITISH INPUTI (YANGI) */}
              <div className="mb-4 relative">
                <Hash className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  required
                  placeholder="Stol raqamini kiriting..."
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm bg-slate-50 outline-none focus:bg-white focus:border-blue-500 transition font-bold"
                />
              </div>

              <div className="space-y-3 overflow-y-auto max-h-60 lg:max-h-[50vh] border-t pt-3">
                {cart.length === 0 ? (
                  <p className="text-slate-400 text-xs italic text-center py-6">
                    Savatcha bo'sh
                  </p>
                ) : (
                  cart.map((i) => (
                    <div
                      key={i.productId}
                      className="flex justify-between items-center text-sm border-b pb-2"
                    >
                      <div className="flex-1 pr-2">
                        <p className="font-semibold text-slate-800 text-xs sm:text-sm leading-tight">{i.name}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                          {Number(i.price).toLocaleString()} x {i.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {(i.price * i.quantity).toLocaleString()}
                        </span>
                        <button
                          onClick={() => removeFromCart(i.productId)}
                          className="text-red-500 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-base font-bold mb-4">
                <span>Umumiy:</span>
                <span className="text-blue-600">
                  {cart
                    .reduce((s, i) => s + i.price * i.quantity, 0)
                    .toLocaleString()}{" "}
                  so'm
                </span>
              </div>
              <button
                onClick={handleSendOrderClick}
                disabled={cart.length === 0 || !tableNumber}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Send className="w-4 h-4" /> Buyurtmani Jo'natish
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TO'LOV MODALI */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 transform transition-all animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">
              To'lov holati
            </h3>
            <p className="text-slate-500 text-center text-sm mb-6">
              Mijoz ushbu buyurtma uchun ofitsiantga naqd pul to'ladimi?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => confirmAndSendOrder(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition"
              >
                Yo'q
              </button>
              <button
                onClick={() => confirmAndSendOrder(true)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-2xl transition shadow-lg shadow-green-200"
              >
                Ha, to'landi
              </button>
            </div>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="mt-4 w-full text-slate-400 hover:text-slate-600 text-sm font-semibold transition"
            >
              Bekor qilish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

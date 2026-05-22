import { useState, useEffect } from "react";
import axios from "axios";
import { ShoppingBag, Send, Layers, Hash } from "lucide-react";

export default function WaiterDashboard({ user, onLogout }) {
  const [products, setProducts] = useState([]); // Real inventory mahsulotlari
  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState(""); // Yangi: Stol raqami shtati
  const [location, setLocation] = useState("Hovuz Markazi"); // Standart joylashuv

  useEffect(() => {
    fetchLiveInventory();
  }, []);

  const fetchLiveInventory = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/vendors/products/all",
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

  const handleSendOrder = async () => {
    if (!tableNumber.trim()) {
      return alert("Iltimos, avval stol raqamini kiriting!");
    }

    const total = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    try {
      await axios.post("http://localhost:5000/api/vendors/orders/place", {
        items: cart,
        location: location,
        tableNumber: tableNumber, // Stol raqami uzatildi
        totalAmount: total,
        waiterUsername: user.username,
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

      <div className="max-w-7xl mx-auto p-6 grid md:grid-cols-3 gap-6">
        {/* CHAP TOMON: DINAMIK MENYU */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Raqamli Menyu (Ombordan)
            </h2>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border p-1.5 rounded-xl text-xs font-semibold bg-slate-50 outline-none"
            >
              <option value="Hovuz Markazi">Hovuz Markazi</option>
              <option value="VIP Zona">VIP Zona</option>
              <option value="Bolalar maydonchasi">Bolalar maydonchasi</option>
            </select>
          </div>

          {products.length === 0 ? (
            <p className="text-slate-400 italic text-sm text-center py-12">
              Omborda hech qanday mahsulot topilmadi. Avval vendor profilidan
              mahsulot qo'shing.
            </p>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="border p-4 rounded-xl flex flex-col justify-between bg-slate-50 hover:shadow-sm transition"
                >
                  <div>
                    <h3 className="font-bold text-slate-700 text-sm">
                      {p.name}
                    </h3>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">
                      {p.category}
                    </span>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {Number(p.price).toLocaleString()} so'm
                    </span>
                    <button
                      onClick={() => addToCart(p)}
                      className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-blue-700"
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col justify-between min-h-[500px]">
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

            <div className="space-y-3 overflow-y-auto max-h-64 border-t pt-3">
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
                    <div>
                      <p className="font-medium text-slate-700">{i.name}</p>
                      <p className="text-xs text-slate-400">
                        {Number(i.price).toLocaleString()} x {i.quantity}
                      </p>
                    </div>
                    <span className="font-bold text-slate-800">
                      {(i.price * i.quantity).toLocaleString()} so'm
                    </span>
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
              onClick={handleSendOrder}
              disabled={cart.length === 0 || !tableNumber}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Send className="w-4 h-4" /> Buyurtmani Jo'natish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

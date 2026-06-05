import { useState, useEffect } from "react";
import axios from "axios";
import {
  CreditCard,
  PlusCircle,
  UserCheck,
  Trash2,
  Edit,
  DollarSign,
  X,
  Search,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function ReceptionistDashboard({ user, onLogout }) {
  const [visitors, setVisitors] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Ro'yxatdan o'tkazish shtatlari
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nfcCardId, setNfcCardId] = useState("");
  const [deposit, setDeposit] = useState("");

  // Tahrirlash va Top-up shtatlari
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [topupVisitor, setTopupVisitor] = useState(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [confirmModal, setConfirmModal] = useState(null);

  // ==========================================
  // NEW FEATURE: KIRISH NAZORATI SHTATLARI
  // ==========================================
  const [scanMode, setScanMode] = useState(false);
  const [scanCardId, setScanCardId] = useState("");
  const [entryFee, setEntryFee] = useState("50000"); // Standart bilet narxi (so'mda)
  const [chargeResult, setChargeResult] = useState(null);

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    try {
      const res = await axios.get("/api/visitors");
      setVisitors(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredVisitors = visitors.filter((v) => {
    const query = searchQuery.toLowerCase();
    return (
      v.name?.toLowerCase().includes(query) ||
      v.phone?.toLowerCase().includes(query) ||
      (v.nfcCardId && v.nfcCardId.toLowerCase().includes(query))
    );
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/visitors/register", {
        name,
        phone,
        nfcCardId,
        initialDeposit: Number(deposit),
      });
      alert("Karta muvaffaqiyatli topshirildi!");
      setName("");
      setPhone("");
      setNfcCardId("");
      setDeposit("");
      fetchVisitors();
    } catch (err) {
      alert(err.response?.data?.message || "Xatolik yuz berdi");
    }
  };

  const handleUpdate = async (e, override = false) => {
    if (e) e.preventDefault();
    const payload = {
      name: editingVisitor.name,
      phone: editingVisitor.phone,
      nfcCardId: editingVisitor.nfcCardId,
      overrideCard: override,
    };
    try {
      const res = await axios.put(
        `/api/visitors/${editingVisitor.id}`,
        payload,
      );
      if (res.data.requiresConfirmation) {
        setConfirmModal(res.data);
      } else if (res.data.success) {
        alert("Mijoz ma'lumotlari yangilandi!");
        setEditingVisitor(null);
        setConfirmModal(null);
        fetchVisitors();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Yangilashda xatolik");
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    if (!topupAmount || Number(topupAmount) <= 0)
      return alert("To'g'ri summa kiriting!");
    try {
      await axios.post("/api/visitors/topup", {
        nfcCardId: topupVisitor.nfcCardId,
        amount: Number(topupAmount),
      });
      alert("Balans muvaffaqiyatli to'ldirildi!");
      setTopupVisitor(null);
      setTopupAmount("");
      fetchVisitors();
    } catch (err) {
      alert(err.response?.data?.message || "To'ldirishda xatolik");
    }
  };

  // ==========================================
  // NEW FEATURE: KARTADAN PUL YECHISH FUNKSIYASI
  // ==========================================
  const handleChargeEntry = async (e) => {
    e.preventDefault();
    setChargeResult(null);
    if (!scanCardId) return alert("Iltimos, kartani skanerlang!");

    try {
      const res = await axios.post(
        "/api/visitors/charge-entry",
        {
          nfcCardId: scanCardId,
          entryFee: Number(entryFee),
        },
      );

      if (res.data.success) {
        setChargeResult({
          error: false,
          msg: `${res.data.visitorName} muvaffaqiyatli o'tdi! Qolgan balans: ${res.data.updatedBalance.toLocaleString()} so'm.`,
        });
        setScanCardId(""); // Navbatdagi mijoz uchun tozalaymiz
        fetchVisitors();
      }
    } catch (err) {
      setChargeResult({
        error: true,
        msg: err.response?.data?.message || "Tizim xatoligi",
      });
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Ushbu mijozni o'chirmoqchimisiz? (Karta bo'shatiladi)")) {
      await axios.delete(`/api/visitors/${id}`);
      fetchVisitors();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <CreditCard className="text-blue-600" /> Qabul Bo'limi (Receptionist)
        </h1>
        <div className="flex items-center gap-3">
          {/* Rejimlar o'rtasida o'tish tugmasi */}
          <button
            onClick={() => {
              setScanMode(!scanMode);
              setChargeResult(null);
            }}
            className={`text-sm font-bold px-4 py-1.5 rounded-xl transition inline-flex items-center gap-1.5 shadow-sm ${scanMode ? "bg-blue-600 text-white" : "bg-slate-800 text-white hover:bg-slate-700"}`}
          >
            <ScanLine className="w-4 h-4" />{" "}
            {scanMode ? "Mijozlar Ro'yxati" : "Kirish Joyi (Scan & Charge)"}
          </button>

          <span className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
            Operator: {user.username}
          </span>
          <button
            onClick={onLogout}
            className="text-sm font-bold text-red-600 hover:underline"
          >
            Chiqish
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {scanMode ? (
          /* =================================================== */
          /* NEW FEATURE VIEW: KIRISHNI SKANERLASH VA HAQ YECHISH */
          /* =================================================== */
          <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl shadow-sm border mt-6 space-y-6">
            <div className="text-center">
              <div className="bg-blue-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-blue-600 mb-3">
                <ScanLine className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-xl font-black text-slate-800">
                Aquaparkka Kirish Tizimi
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Mijoz kartasini skanerlang va hisobidan chipta pulini yeching
              </p>
            </div>

            {chargeResult && (
              <div
                className={`p-4 rounded-2xl flex items-start gap-3 text-sm font-bold border ${chargeResult.error ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-800"}`}
              >
                {chargeResult.error ? (
                  <AlertTriangle className="shrink-0" />
                ) : (
                  <CheckCircle2 className="shrink-0" />
                )}
                <div>{chargeResult.msg}</div>
              </div>
            )}

            <form onSubmit={handleChargeEntry} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  1. Bir martalik kirish narxi (UZS)
                </label>
                <input
                  type="number"
                  required
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  className="w-full border p-3 rounded-xl outline-none font-bold text-lg text-slate-700 focus:border-blue-500"
                  placeholder="Bilet narxi"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  2. Karta UID kodini teging (Skanerlang)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={scanCardId}
                  onChange={(e) => setScanCardId(e.target.value)}
                  className="w-full border p-4 rounded-xl bg-amber-50/50 text-center font-mono text-xl font-bold tracking-widest text-amber-900 outline-none focus:border-amber-500 focus:bg-amber-50"
                  placeholder="KARTANI KUTMOQDA..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl text-md shadow-md transition"
              >
                KIRISHNI TASDIQLASH VA HAQ YECHISH
              </button>
            </form>
          </div>
        ) : (
          /* =================================================== */
          /* STANDART JADVAL VA REGISTRATSIYA REJIMI */
          /* =================================================== */
          <div className="grid md:grid-cols-3 gap-6">
            {/* CHAP TOMON: FORMALAR PANEL */}
            <div className="space-y-6">
              {editingVisitor ? (
                <div className="bg-amber-50/60 p-6 rounded-2xl shadow-sm border border-amber-200">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Edit className="text-amber-500" /> Mijozni Tahrirlash
                    </h2>
                    <button
                      onClick={() => setEditingVisitor(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => handleUpdate(e, false)}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-xs font-semibold text-slate-500">
                        Mijoz ismi
                      </label>
                      <input
                        type="text"
                        required
                        value={editingVisitor.name}
                        onChange={(e) =>
                          setEditingVisitor({
                            ...editingVisitor,
                            name: e.target.value,
                          })
                        }
                        className="w-full bg-white border p-2.5 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500">
                        Telefon raqam
                      </label>
                      <input
                        type="text"
                        required
                        value={editingVisitor.phone}
                        onChange={(e) =>
                          setEditingVisitor({
                            ...editingVisitor,
                            phone: e.target.value,
                          })
                        }
                        className="w-full bg-white border p-2.5 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500">
                        NFC Karta UID
                      </label>
                      <input
                        type="text"
                        value={editingVisitor.nfcCardId || ""}
                        onChange={(e) =>
                          setEditingVisitor({
                            ...editingVisitor,
                            nfcCardId: e.target.value,
                          })
                        }
                        className="w-full border p-2.5 rounded-xl bg-white font-mono"
                        placeholder="Karta skanerlang"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl transition"
                    >
                      Ma'lumotlarni Saqlash
                    </button>
                  </form>
                </div>
              ) : topupVisitor ? (
                <div className="bg-green-50/60 p-6 rounded-2xl shadow-sm border border-green-200">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <DollarSign className="text-green-500" /> Hisob To'ldirish
                    </h2>
                    <button
                      onClick={() => {
                        setTopupVisitor(null);
                        setTopupAmount("");
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    Mijoz:{" "}
                    <strong className="text-slate-900">
                      {topupVisitor.name}
                    </strong>
                  </p>
                  <form onSubmit={handleTopup} className="space-y-4">
                    <input
                      type="number"
                      required
                      placeholder="Summani kiriting (UZS)"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      className="w-full bg-white border p-2.5 rounded-xl outline-none focus:border-green-500"
                    />
                    <button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition"
                    >
                      Balansni To'ldirish
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <PlusCircle className="text-green-500" /> Yangi Mijoz &
                    Karta
                  </h2>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <input
                      type="text"
                      required
                      placeholder="Mijoz to'liq ismi"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full border p-2.5 rounded-xl outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Telefon raqami"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border p-2.5 rounded-xl outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Karta UID kodini teging"
                      value={nfcCardId}
                      onChange={(e) => setNfcCardId(e.target.value)}
                      className="w-full border p-2.5 rounded-xl bg-amber-50 font-mono focus:border-blue-500"
                    />
                    <input
                      type="number"
                      required
                      placeholder="Boshlang'ich depozit (So'm)"
                      value={deposit}
                      onChange={(e) => setDeposit(e.target.value)}
                      className="w-full border p-2.5 rounded-xl outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition"
                    >
                      Kartani Faollashtirish
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* O'NG TOMON: JADVAL VA QIDIRUV */}
            <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck className="text-blue-500" /> Tizimdagi Mijozlar (
                  {filteredVisitors.length})
                </h2>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Ism, telefon yoki karta UID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm bg-slate-50 outline-none focus:bg-white focus:border-blue-500 transition font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-500">
                      <th className="p-3">Mijoz Ismi</th>
                      <th className="p-3">Karta UID</th>
                      <th className="p-3">Balans</th>
                      <th className="p-3 text-center">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVisitors.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center py-8 text-slate-400 italic"
                        >
                          Qidiruv bo'yicha hech qanday mijoz topilmadi.
                        </td>
                      </tr>
                    ) : (
                      filteredVisitors.map((v) => (
                        <tr
                          key={v.id}
                          className="border-b hover:bg-slate-50/50"
                        >
                          <td className="p-3 font-semibold text-slate-700">
                            <div>{v.name}</div>
                            <div className="text-xs text-slate-400 font-normal">
                              {v.phone}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-xs">
                            {v.nfcCardId ? (
                              <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded">
                                {v.nfcCardId}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">
                                Karta yo'q
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-green-600">
                            {Number(v.balance).toLocaleString()} so'm
                          </td>
                          <td className="p-3 text-center space-x-2">
                            <button
                              onClick={() => {
                                setTopupVisitor(v);
                                setEditingVisitor(null);
                              }}
                              className="bg-green-100 text-green-700 px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-green-200"
                            >
                              PUL QO'SHISH
                            </button>
                            <button
                              onClick={() => {
                                setEditingVisitor(v);
                                setTopupVisitor(null);
                              }}
                              className="bg-slate-100 text-slate-700 p-1.5 rounded-lg inline-flex items-center hover:bg-slate-200"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(v.id)}
                              className="bg-red-50 text-red-600 p-1.5 rounded-lg inline-flex items-center hover:bg-red-100"
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
      </div>

      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border">
            <h3 className="text-lg font-bold text-red-600 mb-2">
              Diqqat! Karta band
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleUpdate(null, true)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition"
              >
                Ha, Baribir O'tkazilsin
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 rounded-xl text-sm transition"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  History,
  Printer,
  XCircle,
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

  // Karta tarixi uchun state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyCardId, setHistoryCardId] = useState("");
  const [historyData, setHistoryData] = useState(null);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/visitors");
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
      await axios.post("http://localhost:5000/api/visitors/register", {
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
        `http://localhost:5000/api/visitors/${editingVisitor.id}`,
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
      await axios.post("http://localhost:5000/api/visitors/topup", {
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
        "http://localhost:5000/api/visitors/charge-entry",
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
      await axios.delete(`http://localhost:5000/api/visitors/${id}`);
      fetchVisitors();
    }
  };

  const fetchCardHistory = async (e) => {
    e.preventDefault();
    setHistoryError("");
    setHistoryData(null);
    if (!historyCardId.trim()) return;

    try {
      const res = await axios.get(`http://localhost:5000/api/visitors/history/${historyCardId}`);
      setHistoryData(res.data);
    } catch (err) {
      setHistoryError(err.response?.data?.message || "Tarixni yuklashda xatolik");
    }
    setHistoryCardId(""); // skanlangandan so'ng tozalash
  };

  const handlePrint = async () => {
    // Agar Electron ichida bo'lsak, to'g'ridan to'g'ri raw printer ga yuboramiz
    if (window.api && window.api.printHistory) {
      const res = await window.api.printHistory(historyData);
      if (!res.success) {
        alert("Printer xatosi: " + res.error);
        window.print(); // Agar xato bo'lsa standart chop etishga o'tish
      }
    } else {
      // Agar brauzerda (Safari/Chrome) bo'lsak standart print
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm print:hidden">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <CreditCard className="text-blue-600" /> Qabul Bo'limi (Receptionist)
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowHistoryModal(true);
              setHistoryData(null);
              setHistoryError("");
              setHistoryCardId("");
            }}
            className="flex items-center gap-1.5 text-sm font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-xl transition print:hidden"
          >
            <History className="w-4 h-4" /> Tarix
          </button>
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

      <div className="max-w-7xl mx-auto p-6 print:hidden">
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

      {/* TARIX MODALI */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4 print:static print:bg-white print:p-0">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 relative print:shadow-none print:w-full print:max-w-none print:p-0">
            {/* Modal yopish tugmasi */}
            <button 
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 print:hidden"
            >
              <XCircle className="w-6 h-6" />
            </button>

            {/* Print Settings uchun maxsus CSS (Header/Footer ni o'chiradi) */}
            <style type="text/css" media="print">
              {`
                @page { margin: 0; }
                body { margin: 1cm; }
              `}
            </style>

            <h3 className="text-xl font-bold text-slate-800 mb-4 print:text-center print:text-2xl print:mb-2">
              Xaridlar Tarixi (Bugun)
            </h3>

            {!historyData ? (
              <form onSubmit={fetchCardHistory} className="print:hidden">
                <p className="text-sm text-slate-500 mb-2">Mijoz kartasini skanerlang:</p>
                <input
                  type="text"
                  autoFocus
                  value={historyCardId}
                  onChange={(e) => setHistoryCardId(e.target.value)}
                  className="w-full border p-3 rounded-xl font-mono bg-slate-50 text-center mb-3 outline-none focus:border-blue-500"
                  placeholder="Karta kodi..."
                />
                {historyError && <p className="text-red-500 text-sm font-bold text-center mb-3">{historyError}</p>}
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition">
                  Tekshirish
                </button>
              </form>
            ) : (
              <div>
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl mb-4 text-center print:bg-transparent print:border-b print:border-dashed print:border-black print:rounded-none print:p-2">
                  <p className="font-bold text-lg print:text-sm">{historyData.visitor.name}</p>
                  <p className="text-sm print:text-xs">Joriy balans: <span className="font-black text-xl print:text-sm">{Number(historyData.visitor.balance).toLocaleString()} so'm</span></p>
                </div>

                <div className="max-h-64 overflow-y-auto pr-2 print:max-h-none print:overflow-visible space-y-3 mb-4">
                  {historyData.transactions.length === 0 ? (
                    <p className="text-slate-400 text-center py-4 print:text-sm">Bugun xaridlar qilinmagan.</p>
                  ) : (
                    historyData.transactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center border-b pb-2 print:border-dashed print:border-black print:pb-1 print:mb-1">
                        <div>
                          <p className="text-sm font-bold text-slate-800 print:text-xs">{tx.location}</p>
                          <p className="text-xs text-slate-500 print:text-[10px]">{new Date(tx.createdAt).toLocaleTimeString()}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black ${tx.type === 'expense' ? 'text-red-600' : 'text-green-600'} print:text-black print:text-xs`}>
                            {tx.type === 'expense' ? '-' : '+'}{Number(tx.amount).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-3 print:hidden">
                  <button
                    onClick={() => {
                      setHistoryData(null);
                      setHistoryCardId("");
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition"
                  >
                    Boshqa Karta
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition shadow-md"
                  >
                    <Printer className="w-5 h-5" /> Chop Etish
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

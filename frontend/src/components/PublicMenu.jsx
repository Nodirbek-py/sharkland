import { useState, useEffect } from "react";
import axios from "axios";

export default function PublicMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/public/menu");
        setMenuItems(res.data);
      } catch (err) {
        console.error("Menyuni yuklashda xatolik:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const categories = ["all", ...new Set(menuItems.map(item => item.category))];

  const filteredItems = activeCategory === "all"
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Bizning Menyu</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Mazali taomlar va salqin ichimliklar</p>
        </div>

        {/* Category Tabs */}
        <div className="max-w-7xl mx-auto px-4 pb-4 overflow-x-auto">
          <div className="flex gap-2 justify-center min-w-max">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-200 ${activeCategory === category
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {category === "all" ? "Barchasi" : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Product Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group">
              {/* Image Container */}
              <div className="relative h-48 bg-slate-100 overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={`http://localhost:5000${item.imageUrl}`}
                    alt={item.name}
                    className="h-full object-cover group-hover:scale-105 transition-transform duration-500 h-full w-auto mx-auto"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Availability Badge */}
                <div className="absolute top-3 right-3">
                  {Number(item.stock) > 0 ? (
                    <span className="bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm">
                      MAVJUD
                    </span>
                  ) : (
                    <span className="bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm">
                      TUGAGAN
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1">{item.name}</h3>
                <div className="flex justify-between items-end mt-4">
                  <div className="text-indigo-600 font-black text-xl">
                    {Number(item.price).toLocaleString()} <span className="text-sm">so'm</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-20">
            <div className="text-slate-400 mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-600">Mahsulotlar topilmadi</h3>
            <p className="text-slate-500 text-sm mt-1">Ushbu turkumda hozircha mahsulotlar yo'q.</p>
          </div>
        )}
      </main>
    </div>
  );
}

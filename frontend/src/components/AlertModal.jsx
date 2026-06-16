import React from "react";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";

export default function AlertModal({ isOpen, title, message, type = "info", onClose }) {
  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle className="w-6 h-6 text-green-500" />,
    error: <AlertTriangle className="w-6 h-6 text-red-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />
  };

  const colors = {
    success: "bg-green-50 text-green-800 border-green-200",
    error: "bg-red-50 text-red-800 border-red-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    info: "bg-blue-50 text-blue-800 border-blue-200"
  };

  const buttonColors = {
    success: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
    error: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
    warning: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
    info: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-all">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            {icons[type] || icons.info}
            <h3 className="text-xl font-bold text-slate-800">{title || "Xabar"}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className={`p-4 rounded-xl border ${colors[type]} mb-6 text-sm font-medium`}>
          {message}
        </div>
        
        <button
          onClick={onClose}
          className={`w-full text-white font-bold py-2.5 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonColors[type]}`}
        >
          Yopish
        </button>
      </div>
    </div>
  );
}

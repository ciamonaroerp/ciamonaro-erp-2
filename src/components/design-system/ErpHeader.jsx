import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Bell, Search, ChevronDown, ClipboardList } from "lucide-react";
import { Link } from 'react-router-dom';
import { useCRMTarefasAlert } from '@/hooks/useCRMTarefasAlert';

/**
 * ErpHeader — Header padrão do CIAMONARO ERP
 * 
 * Propriedades:
 * - title: Nome do módulo atual
 * - onSearch: Callback da busca global
 * - notifications: Número de notificações
 * - userName: Nome do usuário logado
 * - onLogout: Callback ao fazer logout
 */
export default function ErpHeader({
  title = "Dashboard",
  onSearch,
  notifications = 0,
  userName = "Usuário",
  userPerfil,
  onLogout,
  searchPlaceholder = "Buscar...",
}) {
  const [searchValue, setSearchValue] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { atrasadas, hoje } = useCRMTarefasAlert();
  const badgeTotal = atrasadas + hoje;

  const handleSearch = (e) => {
    setSearchValue(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-8 py-3.5 flex items-center gap-4 shadow-sm">
      {/* Título do módulo */}
      <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight">{title}</h1>

      {/* Espaço flexível */}
      <div className="flex-1" />

      {/* Busca global */}
      <div className="hidden sm:flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 hover:border-blue-300 transition-colors">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchValue}
          onChange={handleSearch}
          placeholder={searchPlaceholder}
          className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-40"
        />
      </div>

      {/* Alerta de tarefas CRM */}
      {badgeTotal > 0 && (
        <Link to="/CRMTarefasPage" className="relative" title={`${atrasadas} atrasadas · ${hoje} para hoje`}>
          <ClipboardList className={`h-5 w-5 ${atrasadas > 0 ? 'text-red-500' : 'text-amber-500'}`} />
          <span className={`absolute -top-2 -right-2 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold ${atrasadas > 0 ? 'bg-red-500' : 'bg-amber-500'}`}>
            {badgeTotal > 9 ? '9+' : badgeTotal}
          </span>
        </Link>
      )}

      {/* Notificações */}
      {notifications > 0 && (
        <div className="relative">
          <Bell className="h-5 w-5 text-slate-600 cursor-pointer hover:text-slate-900" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {notifications > 9 ? '9+' : notifications}
          </span>
        </div>
      )}

      {/* Menu do usuário */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <div className="h-8 w-8 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: '#3B5CCC' }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium text-slate-800">{userName}</span>
            {userPerfil && (
              <span className="text-xs text-slate-500">{userPerfil}</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden">
            <button
              onClick={() => { onLogout?.(); setShowUserMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Sair do sistema
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
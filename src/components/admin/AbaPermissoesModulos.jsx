import React from "react";
import { CheckSquare, Square, ShieldCheck, Loader2 } from "lucide-react";

/**
 * Aba de permissões granulares por módulo e página.
 * Exibe os módulos + páginas vindos do modulo_paginas e permite seleção por checkbox.
 * Se isAdmin=true, exibe badge de acesso total sem checkboxes.
 */
export default function AbaPermissoesModulos({ isAdmin, modulosPaginas = [], permissoes = [], onChange, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando módulos...
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
        <p className="text-sm text-emerald-700 font-medium">Administrador — acesso total a todos os módulos e páginas.</p>
      </div>
    );
  }

  if (modulosPaginas.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Nenhum módulo com páginas configuradas encontrado.
      </div>
    );
  }

  // Resolve quais páginas estão selecionadas para um módulo
  const getPaginasSelecionadas = (modulo) => {
    const entry = permissoes.find(p => p.modulo === modulo);
    return entry?.paginas || [];
  };

  const togglePagina = (modulo, pagina_nome) => {
    const novas = permissoes.map(p => p.modulo === modulo ? p : null).filter(Boolean);
    const entryIdx = permissoes.findIndex(p => p.modulo === modulo);

    let novasPermissoes;
    if (entryIdx === -1) {
      // Adiciona módulo + página
      novasPermissoes = [...permissoes, { modulo, paginas: [pagina_nome] }];
    } else {
      const paginasAtuais = permissoes[entryIdx].paginas;
      const jaTem = paginasAtuais.includes(pagina_nome);
      const novasPaginas = jaTem
        ? paginasAtuais.filter(p => p !== pagina_nome)
        : [...paginasAtuais, pagina_nome];

      if (novasPaginas.length === 0) {
        // Remove o módulo inteiro se não sobrou nenhuma página
        novasPermissoes = permissoes.filter(p => p.modulo !== modulo);
      } else {
        novasPermissoes = permissoes.map(p => p.modulo === modulo ? { ...p, paginas: novasPaginas } : p);
      }
    }
    onChange(novasPermissoes);
  };

  const toggleModuloInteiro = (modulo, todasPaginas) => {
    const selecionadas = getPaginasSelecionadas(modulo);
    const todas = todasPaginas.map(p => p.pagina_nome);
    const todosSelecionados = todas.every(p => selecionadas.includes(p));

    let novasPermissoes;
    if (todosSelecionados) {
      // Desmarca tudo → remove módulo
      novasPermissoes = permissoes.filter(p => p.modulo !== modulo);
    } else {
      // Marca todas
      const semEste = permissoes.filter(p => p.modulo !== modulo);
      novasPermissoes = [...semEste, { modulo, paginas: todas }];
    }
    onChange(novasPermissoes);
  };

  return (
    <div className="space-y-3">
      {modulosPaginas.map(({ modulo, paginas }) => {
        const selecionadas = getPaginasSelecionadas(modulo);
        const todas = paginas.map(p => p.pagina_nome);
        const todosSelecionados = todas.length > 0 && todas.every(p => selecionadas.includes(p));
        const algumSelecionado = selecionadas.length > 0;

        return (
          <div key={modulo} className="border border-slate-200 rounded-xl overflow-hidden">
            {/* Cabeçalho do módulo */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{modulo}</span>
              <div className="flex items-center gap-2">
                {algumSelecionado && (
                  <span className="text-xs text-slate-500 font-medium">{selecionadas.length}/{todas.length}</span>
                )}
                <button
                  type="button"
                  onClick={() => toggleModuloInteiro(modulo, paginas)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  {todosSelecionados ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              </div>
            </div>

            {/* Lista de páginas */}
            <div className="px-4 py-2 space-y-1 bg-white">
              {paginas.map(({ pagina_nome, label_menu }) => {
                const checked = selecionadas.includes(pagina_nome);
                return (
                  <button
                    key={pagina_nome}
                    type="button"
                    onClick={() => togglePagina(modulo, pagina_nome)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all border ${
                      checked
                        ? "bg-blue-50 border-blue-200 text-blue-800"
                        : "bg-white border-transparent text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {checked
                      ? <CheckSquare className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      : <Square className="h-4 w-4 text-slate-300 flex-shrink-0" />
                    }
                    <span className="text-left">{label_menu || pagina_nome}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
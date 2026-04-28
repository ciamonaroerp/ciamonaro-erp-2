import React, { useState, useEffect } from 'react';
import { supabase } from '@/components/lib/supabaseClient';
import { AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AtivarConta() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [stage, setStage] = useState('validando');
  const [convite, setConvite] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { validarToken(); }, [token]);

  const validarToken = async () => {
    if (!token) {
      setErro('Token não fornecido. Verifique o link recebido por email.');
      setStage('erro');
      return;
    }
    try {
      const { data: convites } = await supabase
        .from('convites_usuarios')
        .select('*')
        .eq('token', token)
        .eq('status', 'Pendente');

      if (!convites || convites.length === 0) {
        setErro('Token inválido ou já utilizado. Solicite um novo convite ao administrador.');
        setStage('erro');
        return;
      }

      const c = convites[0];
      if (new Date(c.data_expiracao) < new Date()) {
        setErro('Este convite expirou. Solicite um novo convite ao administrador.');
        setStage('erro');
        return;
      }

      const { data: usuarios } = await supabase
        .from('erp_usuarios')
        .select('*')
        .eq('email', c.email);

      if (!usuarios || usuarios.length === 0) {
        setErro('Usuário não encontrado. Entre em contato com o administrador.');
        setStage('erro');
        return;
      }

      setConvite(c);
      setUsuario(usuarios[0]);
      setStage('formulario');
    } catch (err) {
      setErro('Erro ao validar token: ' + err.message);
      setStage('erro');
    }
  };

  const handleAtivacao = async (e) => {
    e.preventDefault();
    setErro('');

    if (!senha || !confirmarSenha) { setErro('Preencha todos os campos'); return; }
    if (senha.length < 8) { setErro('A senha deve ter pelo menos 8 caracteres'); return; }
    if (senha !== confirmarSenha) { setErro('As senhas não conferem'); return; }

    setLoading(true);
    try {
      await Promise.all([
        supabase.from('erp_usuarios').update({ status: 'Ativo' }).eq('id', usuario.id),
        supabase.from('convites_usuarios').update({ status: 'Utilizado' }).eq('id', convite.id),
      ]);
      setStage('sucesso');
    } catch (err) {
      setErro('Erro ao ativar conta: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-white">CIAMONARO ERP</h1>
          <p className="text-slate-400 text-sm mt-1">Ativação de Conta</p>
        </div>

        {stage === 'validando' && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-slate-300">Validando convite...</p>
          </div>
        )}

        {stage === 'formulario' && usuario && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white mb-1">Olá, {usuario.nome}!</h2>
              <p className="text-slate-400 text-sm">Crie uma senha para ativar sua conta e acessar o CIAMONARO ERP.</p>
            </div>
            <div className="mb-5 p-3 bg-white/5 rounded-lg border border-white/10 space-y-1">
              <p className="text-xs text-slate-400">Email: <span className="text-slate-200">{usuario.email}</span></p>
              <p className="text-xs text-slate-400">Perfil: <span className="text-slate-200">{usuario.perfil}</span></p>
            </div>
            <form onSubmit={handleAtivacao} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1.5">Nova Senha</label>
                <div className="relative">
                  <input type={showSenha ? "text" : "password"} placeholder="Mínimo 8 caracteres" value={senha} onChange={e => setSenha(e.target.value)} className="w-full px-4 py-2.5 pr-10 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500" />
                  <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1.5">Confirmar Senha</label>
                <div className="relative">
                  <input type={showConfirmar ? "text" : "password"} placeholder="Repita a senha" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} className="w-full px-4 py-2.5 pr-10 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500" />
                  <button type="button" onClick={() => setShowConfirmar(!showConfirmar)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    {showConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {erro && (
                <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{erro}</span>
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 mt-2">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Ativando...</> : 'Ativar Conta'}
              </Button>
            </form>
          </div>
        )}

        {stage === 'sucesso' && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Conta Ativada!</h2>
            <p className="text-slate-300 text-sm mb-6">Sua conta foi ativada com sucesso.</p>
          </div>
        )}

        {stage === 'erro' && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Link Inválido</h2>
            <p className="text-slate-300 text-sm">{erro}</p>
          </div>
        )}
      </div>
    </div>
  );
}
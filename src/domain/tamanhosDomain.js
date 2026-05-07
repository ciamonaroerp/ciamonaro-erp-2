export function validarTamanho(form) {
  if (!form.codigo || !form.codigo.trim()) return "Código é obrigatório.";
  if (!form.descricao || !form.descricao.trim()) return "Descrição é obrigatória.";
  return null;
}

export function prepararPayloadCriar(form) {
  return {
    codigo: form.codigo.trim().toUpperCase(),
    descricao: form.descricao.trim(),
    ativo: form.ativo !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function prepararPayloadAtualizar(form) {
  return {
    codigo: form.codigo.trim().toUpperCase(),
    descricao: form.descricao.trim(),
    ativo: form.ativo !== false,
    updated_at: new Date().toISOString(),
  };
}

export const tamanhoFormVazio = {
  codigo: "",
  descricao: "",
  ativo: true,
};
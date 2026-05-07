export function validarItem(form) {
  if (!form.tamanho_id) return "Tamanho Global é obrigatório.";
  return null;
}

export function prepararPayloadCriar(gradeId, form, tamanhoSelecionado) {
  // Se titulo visual vazio, usa o código do tamanho global
  const titulo = form.titulo_visual?.trim() || tamanhoSelecionado?.codigo || "";
  return {
    grade_id: gradeId,
    tamanho_id: form.tamanho_id,
    titulo: titulo,
    ordem: form.ordem !== "" ? parseInt(form.ordem, 10) : 0,
    ativo: form.ativo !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function prepararPayloadAtualizar(form, tamanhoSelecionado) {
  const titulo = form.titulo_visual?.trim() || tamanhoSelecionado?.codigo || "";
  return {
    tamanho_id: form.tamanho_id,
    titulo: titulo,
    ordem: form.ordem !== "" ? parseInt(form.ordem, 10) : 0,
    ativo: form.ativo !== false,
    updated_at: new Date().toISOString(),
  };
}

export const itemFormVazio = {
  tamanho_id: "",
  titulo_visual: "",
  ordem: "",
  ativo: true,
};
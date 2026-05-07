export function validarItem(form) {
  if (!form.titulo || !form.titulo.trim()) return "Título é obrigatório.";
  return null;
}

export function prepararPayloadCriar(gradeId, form) {
  return {
    grade_id: gradeId,
    titulo: form.titulo.trim(),
    ordem: form.ordem !== "" ? parseInt(form.ordem, 10) : 0,
    ativo: form.ativo !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function prepararPayloadAtualizar(form) {
  return {
    titulo: form.titulo.trim(),
    ordem: form.ordem !== "" ? parseInt(form.ordem, 10) : 0,
    ativo: form.ativo !== false,
    updated_at: new Date().toISOString(),
  };
}

export const itemFormVazio = {
  titulo: "",
  ordem: "",
  ativo: true,
};
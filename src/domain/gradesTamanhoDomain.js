// Domain: regras de negócio e transformações para Grades de Tamanho

export function validarGrade(form) {
  if (!form.nome_grade || !form.nome_grade.trim()) {
    return "Nome da Grade é obrigatório.";
  }
  return null;
}

export function prepararPayloadCriar(form) {
  return {
    nome_grade: form.nome_grade.trim(),
    ativo: form.ativo !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function prepararPayloadAtualizar(form) {
  return {
    nome_grade: form.nome_grade.trim(),
    ativo: form.ativo !== false,
    updated_at: new Date().toISOString(),
  };
}

export const formVazio = {
  nome_grade: "",
  ativo: true,
};
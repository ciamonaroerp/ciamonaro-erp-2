/**
 * Utilitários de validação e formatação para formulários do CIAMONARO ERP
 */

/** Aplica máscara de telefone dinamicamente (fixo ou celular) */
export function maskPhone(val) {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Valida formato de e-mail */
export function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/**
 * Gera próximo código sequencial
 * @param {string} prefix - ex: "CLI", "FOR", "TRA"
 * @param {Array} existingList - registros existentes
 * @param {string} codigoField - nome do campo código
 */
export function generateCodigo(prefix, existingList, codigoField = "codigo") {
  const nums = existingList.map((item) => {
    const code = item[codigoField] || "";
    const match = code.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `${prefix} ${String(max + 1).padStart(4, "0")}`;
}

/**
 * Verifica duplicidade de CPF/CNPJ dentro do módulo
 * @param {string} documento
 * @param {Array} existingList
 * @param {string} documentoField - campo a comparar
 * @param {string|null} excludeId - ID a excluir (para edição)
 */
export function isDuplicateDocument(
  documento,
  existingList,
  documentoField = "documento",
  excludeId = null
) {
  if (!documento) return false;
  const clean = documento.replace(/\D/g, "");
  if (clean.length < 11) return false;
  return existingList.some((item) => {
    if (excludeId && item.id === excludeId) return false;
    const d = (item[documentoField] || "").replace(/\D/g, "");
    return d === clean;
  });
}
/**
 * Remove formatação do CNPJ, retornando apenas os 14 dígitos numéricos.
 * "12.345.678/0001-90" → "12345678000190"
 */
export function normalizeCNPJ(cnpj) {
  if (!cnpj) return "";
  return String(cnpj).replace(/\D/g, "");
}

/**
 * Formata CNPJ: "12345678000190" → "12.345.678/0001-90"
 */
export function formatCNPJ(cnpj) {
  const d = normalizeCNPJ(cnpj);
  if (d.length !== 14) return cnpj;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}
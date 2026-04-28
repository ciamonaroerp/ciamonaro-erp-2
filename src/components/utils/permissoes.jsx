/**
 * Módulos disponíveis no CIAMONARO ERP:
 * Administração | Comercial | Financeiro | Compras |
 * Estoque Matéria Prima | Estoque Produto Acabado |
 * PPCP | Logística | Produção | Qualidade | Embalagem
 */

export function usuarioPodeAcessar(usuario, modulo) {
  if (!usuario) return false;

  try {
    const modulos = Array.isArray(usuario.modulos_autorizados)
      ? usuario.modulos_autorizados
      : JSON.parse(usuario.modulos_autorizados || "[]");

    return modulos.includes(modulo);
  } catch (error) {
    console.error("Erro ao verificar permissões:", error);
    return false;
  }
}
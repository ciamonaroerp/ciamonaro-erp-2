/**
 * Utilitários de formatação de data
 * Padroniza TODAS as datas em dd/mm/aaaa
 */

// Converte ISO (yyyy-mm-dd ou yyyy-mm-ddThh:mm:ss) para dd/mm/aaaa
export function formatarDataDDMMAA(dataISO) {
  if (!dataISO) return '—';
  
  try {
    const data = new Date(dataISO);
    if (isNaN(data.getTime())) return '—';
    
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    
    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    console.error('Erro ao formatar data:', dataISO, e);
    return '—';
  }
}

// Converte dd/mm/aaaa para yyyy-mm-dd (ISO)
export function converterParaISO(dataDDMMAA) {
  if (!dataDDMMAA || typeof dataDDMMAA !== 'string') return null;
  
  try {
    const partes = dataDDMMAA.split('/');
    if (partes.length !== 3) return null;
    
    const dia = String(partes[0]).padStart(2, '0');
    const mes = String(partes[1]).padStart(2, '0');
    const ano = partes[2];
    
    return `${ano}-${mes}-${dia}`;
  } catch (e) {
    console.error('Erro ao converter data:', dataDDMMAA, e);
    return null;
  }
}

// Formata data + hora como dd/mm/aaaa hh:mm
export function formatarDataHora(dataISO) {
  if (!dataISO) return '—';
  
  try {
    const data = new Date(dataISO);
    if (isNaN(data.getTime())) return '—';
    
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const minuto = String(data.getMinutes()).padStart(2, '0');
    
    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
  } catch (e) {
    console.error('Erro ao formatar data/hora:', dataISO, e);
    return '—';
  }
}
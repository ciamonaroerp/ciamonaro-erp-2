import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCNPJLookup } from '@/components/hooks/useCNPJLookup';

export default function CNPJLookupInput({ 
  value, 
  onChange, 
  onDataFound, 
  placeholder = "00.000.000/0000-00",
  disabled = false,
  showIEField = false 
}) {
  const [displayValue, setDisplayValue] = useState(value || '');
  const { loading, error, formatCNPJ, validateCNPJ, debouncedLookup, clearError } = useCNPJLookup();
  const [found, setFound] = useState(false);

  const handleChange = (e) => {
    const raw = e.target.value;
    const formatted = formatCNPJ(raw);
    
    if (formatted) {
      setDisplayValue(formatted);
      onChange(formatted);
      setFound(false);
      clearError();

      // Busca automática quando tiver 14 dígitos
      debouncedLookup(raw, (dados) => {
        onDataFound(dados);
        setFound(true);
      });
    } else if (!raw.includes('.') && !raw.includes('/') && !raw.includes('-')) {
      // Permitir digitação livre
      setDisplayValue(raw);
      onChange(raw);
      setFound(false);
    }
  };

  const handleManualSearch = () => {
    if (validateCNPJ(displayValue)) {
      debouncedLookup(displayValue, (dados) => {
        onDataFound(dados);
        setFound(true);
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled || loading}
            className={`pr-10 ${error ? 'border-red-500' : ''} ${found ? 'border-green-500' : ''}`}
          />
          {found && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
          )}
          {error && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleManualSearch}
          disabled={!validateCNPJ(displayValue) || loading}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          Buscar
        </Button>
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      
      {found && (
        <div className="space-y-1">
          <p className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Dados preenchidos automaticamente
          </p>
          {showIEField && (
            <p className="text-xs text-slate-600 bg-blue-50 p-2 rounded border border-blue-100">
              ℹ️ Inscrição Estadual foi preenchida. Verifique e ajuste se necessário.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
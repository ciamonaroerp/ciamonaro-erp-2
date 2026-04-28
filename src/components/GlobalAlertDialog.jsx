import React, { createContext, useContext, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Trash2, Info, CheckCircle2 } from "lucide-react";

const GlobalAlertContext = createContext(null);

const ICONS = {
  error: <AlertTriangle className="h-6 w-6 text-red-500" />,
  confirm: <AlertTriangle className="h-6 w-6 text-amber-500" />,
  delete: <Trash2 className="h-6 w-6 text-red-500" />,
  info: <Info className="h-6 w-6 text-blue-500" />,
  success: <CheckCircle2 className="h-6 w-6 text-green-500" />,
};

const DEFAULT_STATE = {
  open: false,
  type: "confirm",
  title: "",
  description: "",
  confirmLabel: "Confirmar",
  cancelLabel: "Cancelar",
  confirmVariant: "default",
  onConfirm: null,
  loading: false,
  critical: false,
};

export function GlobalAlertProvider({ children }) {
  const [state, setState] = useState(DEFAULT_STATE);

  const close = useCallback(() => {
    if (state.loading) return;
    setState(DEFAULT_STATE);
  }, [state.loading]);

  const showAlert = useCallback((config) => {
    setState({ ...DEFAULT_STATE, open: true, ...config });
  }, []);

  const showError = useCallback(({ title = "Erro", description }) => {
    setState({
      ...DEFAULT_STATE,
      open: true,
      type: "error",
      title,
      description,
      confirmLabel: "Fechar",
      confirmVariant: "default",
      onConfirm: null,
      cancelLabel: null,
    });
  }, []);

  const showConfirm = useCallback(({
    title = "Confirmação",
    description,
    onConfirm,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    confirmVariant = "default",
    critical = false,
  }) => {
    setState({
      ...DEFAULT_STATE,
      open: true,
      type: "confirm",
      title,
      description,
      onConfirm,
      confirmLabel,
      cancelLabel,
      confirmVariant,
      critical,
    });
  }, []);

  const showDelete = useCallback(({
    title = "Deseja excluir este registro?",
    description = "Esta ação não poderá ser desfeita.",
    onConfirm,
    confirmLabel = "Excluir",
    cancelLabel = "Cancelar",
  }) => {
    setState({
      ...DEFAULT_STATE,
      open: true,
      type: "delete",
      title,
      description,
      onConfirm,
      confirmLabel,
      cancelLabel,
      confirmVariant: "destructive",
      critical: true,
    });
  }, []);

  const showSuccess = useCallback(({ title = "Sucesso", description }) => {
    setState({
      ...DEFAULT_STATE,
      open: true,
      type: "success",
      title,
      description,
      confirmLabel: "Fechar",
      confirmVariant: "default",
      onConfirm: null,
      cancelLabel: null,
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!state.onConfirm || typeof state.onConfirm !== 'function') {
      setState(DEFAULT_STATE);
      return;
    }
    setState(s => ({ ...s, loading: true }));
    try {
      await state.onConfirm();
    } catch (error) {
      console.error('Error in onConfirm:', error);
    } finally {
      setState(DEFAULT_STATE);
    }
  }, [state]);

  const icon = ICONS[state.type] || ICONS.confirm;

  return (
    <GlobalAlertContext.Provider value={{ showError, showConfirm, showDelete, showSuccess, showAlert }}>
      {children}

      <Dialog
        open={state.open}
        onOpenChange={(open) => { if (!open && !state.loading && !state.critical) close(); }}
      >
        <DialogContent
          className="max-w-md w-full"
          onEscapeKeyDown={(e) => { if (state.critical || state.loading) e.preventDefault(); }}
          onInteractOutside={(e) => { if (state.critical || state.loading) e.preventDefault(); }}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex-shrink-0">{icon}</div>
              <DialogTitle className="text-base font-semibold text-slate-900">
                {state.title}
              </DialogTitle>
            </div>
            {state.description && (
              <DialogDescription className="text-sm text-slate-500 ml-9">
                {state.description}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex justify-end gap-2 mt-4">
            {state.cancelLabel && (
              <Button
                variant="outline"
                onClick={close}
                disabled={state.loading}
              >
                {state.cancelLabel}
              </Button>
            )}
            <Button
              variant={state.confirmVariant}
              onClick={handleConfirm}
              disabled={state.loading}
              autoFocus
              className={
                state.confirmVariant === "destructive"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : state.confirmVariant === "default"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : ""
              }
            >
              {state.loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {state.confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </GlobalAlertContext.Provider>
  );
}

export function useGlobalAlert() {
  const ctx = useContext(GlobalAlertContext);
  if (!ctx) throw new Error("useGlobalAlert deve ser usado dentro de GlobalAlertProvider");
  return ctx;
}
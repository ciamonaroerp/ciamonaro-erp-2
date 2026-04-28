import { apiRequest } from "./api";

export function listarPedidos() {
  return apiRequest("/comercial/pedidos");
}
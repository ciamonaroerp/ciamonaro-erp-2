import { apiRequest } from "./api";

export function listarFretes() {
  return apiRequest("/logistica/fretes");
}
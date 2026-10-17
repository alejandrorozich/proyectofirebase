// URL del backend. Se toma de NEXT_PUBLIC_API_URL al hacer el build:
// - .env.development -> backend local
// - .env.production  -> backend deployado en Render
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");

export type Producto = {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  createdAt: string;
};

export type ProductoInput = {
  nombre: string;
  precio: number;
  stock: number;
};

export type Resumen = {
  totalProductos: number;
  stockTotal: number;
  valorInventario: number;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
  } catch {
    throw new Error(`No se pudo conectar con el backend (${API_URL})`);
  }

  if (!response.ok) {
    // El backend responde los errores como { error: "mensaje" }
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Error HTTP ${response.status}`);
  }

  return response.status === 204 ? (undefined as T) : response.json();
}

export const productosApi = {
  listar: (nombre?: string) =>
    request<Producto[]>(`/api/productos${nombre ? `?nombre=${encodeURIComponent(nombre)}` : ""}`),
  resumen: () => request<Resumen>("/api/productos/resumen"),
  obtener: (id: number) => request<Producto>(`/api/productos/${id}`),
  crear: (datos: ProductoInput) =>
    request<Producto>("/api/productos", { method: "POST", body: JSON.stringify(datos) }),
  actualizar: (id: number, datos: Partial<ProductoInput>) =>
    request<Producto>(`/api/productos/${id}`, { method: "PUT", body: JSON.stringify(datos) }),
  eliminar: (id: number) => request<void>(`/api/productos/${id}`, { method: "DELETE" }),
};

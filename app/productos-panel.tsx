"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL, productosApi, type Producto, type Resumen } from "@/lib/api";

type Formulario = { nombre: string; precio: string; stock: string };
type Toast = { id: number; tipo: "ok" | "error"; texto: string };

const formVacio: Formulario = { nombre: "", precio: "", stock: "" };

const moneda = (valor: number) =>
  `Bs ${Number(valor).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const mensajeDe = (error: unknown) => (error instanceof Error ? error.message : "Ocurrió un error inesperado");

// Colores para el avatar de cada producto (se elige según el id)
const avatarColores = [
  "from-indigo-500 to-violet-500",
  "from-fuchsia-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-cyan-500",
  "from-rose-500 to-red-500",
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100";
const card =
  "rounded-2xl border border-white/60 bg-white/80 shadow-xl shadow-indigo-500/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70";

export default function ProductosPanel() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [form, setForm] = useState<Formulario>(formVacio);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [filtro, setFiltro] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("");
  const [buscarId, setBuscarId] = useState("");
  const [encontrado, setEncontrado] = useState<Producto | null>(null);
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const nombreRef = useRef<HTMLInputElement>(null);

  const notificar = useCallback((tipo: Toast["tipo"], texto: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tipo, texto }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const cargar = useCallback(
    async (nombre: string) => {
      setCargando(true);
      try {
        const [lista, res] = await Promise.all([productosApi.listar(nombre || undefined), productosApi.resumen()]);
        setProductos(lista);
        setResumen(res);
        setConectado(true);
      } catch (error) {
        setConectado(false);
        notificar("error", mensajeDe(error));
      } finally {
        setCargando(false);
      }
    },
    [notificar]
  );

  useEffect(() => {
    const timer = setTimeout(() => void cargar(""), 0);
    return () => clearTimeout(timer);
  }, [cargar]);

  // Ejecuta una acción mostrando feedback y recargando la lista al terminar
  async function ejecutar(accion: () => Promise<string>) {
    setOcupado(true);
    try {
      const texto = await accion();
      notificar("ok", texto);
      await cargar(filtroActivo);
    } catch (error) {
      notificar("error", mensajeDe(error));
    } finally {
      setOcupado(false);
    }
  }

  function guardar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nombre = form.nombre.trim();
    const precio = Number(form.precio);
    const stock = Number(form.stock);
    if (!nombre || form.precio === "" || precio < 0 || form.stock === "" || !Number.isInteger(stock) || stock < 0) {
      notificar("error", "Ingresa un nombre, un precio ≥ 0 y un stock entero ≥ 0.");
      return;
    }
    const id = editandoId;
    void ejecutar(async () => {
      if (id !== null) {
        await productosApi.actualizar(id, { nombre, precio, stock });
      } else {
        await productosApi.crear({ nombre, precio, stock });
      }
      cancelarEdicion();
      return id !== null ? `Producto #${id} actualizado` : `"${nombre}" agregado al inventario`;
    });
  }

  function nuevo() {
    cancelarEdicion();
    nombreRef.current?.focus();
    nombreRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function editar(p: Producto) {
    setEditandoId(p.id);
    setForm({ nombre: p.nombre, precio: String(p.precio), stock: String(p.stock) });
    nombreRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setForm(formVacio);
  }

  function eliminar(p: Producto) {
    if (!window.confirm(`¿Eliminar "${p.nombre}"?`)) return;
    void ejecutar(async () => {
      await productosApi.eliminar(p.id);
      if (editandoId === p.id) cancelarEdicion();
      if (encontrado?.id === p.id) setEncontrado(null);
      return `"${p.nombre}" eliminado`;
    });
  }

  function filtrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nombre = filtro.trim();
    setFiltroActivo(nombre);
    void cargar(nombre);
  }

  function limpiarFiltro() {
    setFiltro("");
    setFiltroActivo("");
    void cargar("");
  }

  async function consultarPorId(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = Number(buscarId);
    if (!Number.isInteger(id) || id <= 0) {
      notificar("error", "El ID debe ser un entero positivo.");
      return;
    }
    setOcupado(true);
    try {
      setEncontrado(await productosApi.obtener(id));
    } catch (error) {
      setEncontrado(null);
      notificar("error", mensajeDe(error));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Manchas de color de fondo */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-indigo-400/30 blur-3xl dark:bg-indigo-600/20" />
      <div className="pointer-events-none absolute top-20 -right-32 h-96 w-96 rounded-full bg-fuchsia-400/25 blur-3xl dark:bg-fuchsia-600/15" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-600/10" />

      {/* Barra superior */}
      <nav className="relative z-10 border-b border-white/60 bg-white/60 backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30">
              <IconBox className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">UPB Inventario</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Gestión de productos</p>
            </div>
          </div>
          <EstadoConexion conectado={conectado} />
        </div>
      </nav>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8">
        {/* Encabezado */}
        <header className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-8 text-white shadow-2xl shadow-violet-500/30 sm:p-10">
          <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/25">
                <IconSparkle className="h-3.5 w-3.5" /> Express · PostgreSQL · Firebase
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Inventario de productos</h1>
              <p className="mt-2 max-w-lg text-sm text-white/80 sm:text-base">
                Crea, busca, edita y elimina productos en tiempo real. Todo se guarda en la base de datos del backend.
              </p>
            </div>
            <button
              onClick={nuevo}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-violet-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <IconPlus className="h-4 w-4" /> Nuevo producto
            </button>
          </div>
        </header>

        {/* Resumen */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            titulo="Productos"
            valor={resumen ? String(resumen.totalProductos) : "—"}
            icono={<IconBox className="h-5 w-5" />}
            color="from-indigo-500 to-violet-500 shadow-indigo-500/30"
          />
          <Stat
            titulo="Unidades en stock"
            valor={resumen ? resumen.stockTotal.toLocaleString("es-BO") : "—"}
            icono={<IconLayers className="h-5 w-5" />}
            color="from-emerald-500 to-teal-500 shadow-emerald-500/30"
          />
          <Stat
            titulo="Valor del inventario"
            valor={resumen ? moneda(resumen.valorInventario) : "—"}
            icono={<IconCoins className="h-5 w-5" />}
            color="from-amber-500 to-orange-500 shadow-amber-500/30"
          />
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_340px]">
          {/* Catálogo */}
          <section className={`${card} p-5 sm:p-6`}>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Catálogo</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {filtroActivo ? `Resultados para "${filtroActivo}"` : `${productos.length} ${productos.length === 1 ? "producto registrado" : "productos registrados"}`}
                </p>
              </div>
              <div className="flex gap-2">
                <form onSubmit={filtrar} className="relative flex-1 sm:w-64 sm:flex-none">
                  <IconSearch className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputClass} pl-9 ${filtroActivo ? "pr-9" : ""}`}
                    placeholder="Buscar por nombre..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                  />
                  {filtroActivo && (
                    <button
                      type="button"
                      onClick={limpiarFiltro}
                      aria-label="Limpiar búsqueda"
                      className="absolute top-1/2 right-2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                    >
                      <IconX className="h-3.5 w-3.5" />
                    </button>
                  )}
                </form>
                <button
                  onClick={() => void cargar(filtroActivo)}
                  disabled={cargando}
                  aria-label="Actualizar"
                  title="Actualizar"
                  className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"
                >
                  <IconRefresh className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {cargando && productos.length === 0 ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl p-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-1/5 rounded bg-slate-100 dark:bg-slate-800/60" />
                    </div>
                  </div>
                ))}
              </div>
            ) : productos.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-14 text-center dark:border-slate-800">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10">
                  {filtroActivo ? <IconSearch className="h-6 w-6" /> : <IconBox className="h-6 w-6" />}
                </div>
                <p className="mt-4 font-semibold">{filtroActivo ? "Sin resultados" : "Tu inventario está vacío"}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {filtroActivo
                    ? `No hay productos que coincidan con "${filtroActivo}".`
                    : "Agrega tu primer producto con el formulario."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {productos.map((p) => (
                  <li
                    key={p.id}
                    className={`group flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-indigo-50/60 dark:hover:bg-indigo-500/5 ${
                      editandoId === p.id ? "bg-amber-50 dark:bg-amber-500/10" : ""
                    }`}
                  >
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-md ${
                        avatarColores[p.id % avatarColores.length]
                      }`}
                    >
                      {p.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.nombre}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        #{p.id} · {new Date(p.createdAt).toLocaleDateString("es-BO")}
                        <span className="font-semibold text-slate-700 sm:hidden dark:text-slate-200"> · {moneda(p.precio)}</span>
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="font-semibold tabular-nums">{moneda(p.precio)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">precio</p>
                    </div>
                    <StockBadge stock={p.stock} />
                    <div className="flex gap-1">
                      <button
                        onClick={() => editar(p)}
                        disabled={ocupado}
                        aria-label={`Editar ${p.nombre}`}
                        title="Editar"
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-indigo-100 hover:text-indigo-700 disabled:opacity-40 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-300"
                      >
                        <IconPencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminar(p)}
                        disabled={ocupado}
                        aria-label={`Eliminar ${p.nombre}`}
                        title="Eliminar"
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-100 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="flex flex-col gap-6">
            {/* Formulario crear / editar */}
            <form onSubmit={guardar} className={`${card} overflow-hidden`}>
              <div
                className={`h-1.5 bg-gradient-to-r ${
                  editandoId !== null ? "from-amber-400 to-orange-500" : "from-indigo-500 via-violet-500 to-fuchsia-500"
                }`}
              />
              <div className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-xl ${
                      editandoId !== null
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-500/15"
                        : "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15"
                    }`}
                  >
                    {editandoId !== null ? <IconPencil className="h-5 w-5" /> : <IconPlus className="h-5 w-5" />}
                  </div>
                  <div>
                    <h2 className="font-bold tracking-tight">
                      {editandoId !== null ? `Editar producto #${editandoId}` : "Nuevo producto"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {editandoId !== null ? "Modifica los campos y guarda" : "Completa los datos del producto"}
                    </p>
                  </div>
                </div>

                <Campo label="Nombre">
                  <input
                    ref={nombreRef}
                    className={inputClass}
                    maxLength={100}
                    placeholder="Ej. Teclado mecánico"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                  />
                </Campo>
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Precio (Bs)">
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.precio}
                      onChange={(e) => setForm({ ...form, precio: e.target.value })}
                      required
                    />
                  </Campo>
                  <Campo label="Stock">
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      required
                    />
                  </Campo>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={ocupado}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:opacity-60 ${
                      editandoId !== null
                        ? "from-amber-500 to-orange-500 shadow-amber-500/30"
                        : "from-indigo-600 to-violet-600 shadow-indigo-500/30"
                    }`}
                  >
                    {ocupado ? (
                      <IconRefresh className="h-4 w-4 animate-spin" />
                    ) : editandoId !== null ? (
                      <IconCheck className="h-4 w-4" />
                    ) : (
                      <IconPlus className="h-4 w-4" />
                    )}
                    {ocupado ? "Guardando..." : editandoId !== null ? "Guardar cambios" : "Agregar producto"}
                  </button>
                  {editandoId !== null && (
                    <button
                      type="button"
                      onClick={cancelarEdicion}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </form>

            {/* Consultar por ID */}
            <form onSubmit={consultarPorId} className={`${card} flex flex-col gap-4 p-5 sm:p-6`}>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/15">
                  <IconHash className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold tracking-tight">Consultar por ID</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Busca un producto específico</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ej. 1"
                  value={buscarId}
                  onChange={(e) => setBuscarId(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={ocupado}
                  className="rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-600 disabled:opacity-60"
                >
                  Buscar
                </button>
              </div>
              {encontrado && (
                <div className="rounded-xl bg-gradient-to-br from-sky-50 to-indigo-50 p-4 ring-1 ring-sky-100 dark:from-sky-500/10 dark:to-indigo-500/10 dark:ring-sky-500/20">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-sky-600 dark:text-sky-400">Producto #{encontrado.id}</p>
                      <p className="font-bold">{encontrado.nombre}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEncontrado(null)}
                      aria-label="Cerrar"
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <Dato label="Precio" valor={moneda(encontrado.precio)} />
                    <Dato label="Stock" valor={String(encontrado.stock)} />
                    <Dato label="Creado" valor={new Date(encontrado.createdAt).toLocaleDateString("es-BO")} />
                  </dl>
                </div>
              )}
            </form>
          </aside>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-500 dark:text-slate-400">
          API: <code className="rounded bg-slate-200/60 px-1.5 py-0.5 dark:bg-slate-800">{API_URL}</code>
        </footer>
      </div>

      {/* Notificaciones */}
      <div className="fixed right-4 bottom-4 left-4 z-50 flex flex-col items-end gap-2 sm:left-auto" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-toast flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-2xl sm:w-auto sm:max-w-sm ${
              t.tipo === "ok" ? "bg-emerald-600 shadow-emerald-600/30" : "bg-rose-600 shadow-rose-600/30"
            }`}
          >
            {t.tipo === "ok" ? <IconCheck className="h-4 w-4 shrink-0" /> : <IconAlert className="h-4 w-4 shrink-0" />}
            {t.texto}
          </div>
        ))}
      </div>
    </div>
  );
}

function EstadoConexion({ conectado }: { conectado: boolean | null }) {
  const estilos =
    conectado === null
      ? { pill: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", dot: "bg-slate-400", texto: "Conectando..." }
      : conectado
        ? { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30", dot: "bg-emerald-500", texto: "Backend conectado" }
        : { pill: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30", dot: "bg-rose-500", texto: "Sin conexión" };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-transparent ${estilos.pill}`}>
      <span className="relative flex h-2 w-2">
        {conectado && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${estilos.dot}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${estilos.dot}`} />
      </span>
      {estilos.texto}
    </span>
  );
}

function Stat({ titulo, valor, icono, color }: { titulo: string; valor: string; icono: React.ReactNode; color: string }) {
  return (
    <div className={`${card} flex items-center gap-4 p-5 transition hover:-translate-y-0.5`}>
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg ${color}`}>
        {icono}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{titulo}</p>
        <p className="truncate text-2xl font-bold tracking-tight tabular-nums">{valor}</p>
      </div>
    </div>
  );
}

function StockBadge({ stock }: { stock: number }) {
  const estilo =
    stock === 0
      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
      : stock < 5
        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${estilo}`}>
      {stock === 0 ? "Agotado" : `${stock} u.`}
    </span>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
      {label}
      {children}
    </label>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-white/70 px-2 py-2 dark:bg-slate-900/60">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="truncate text-sm font-semibold tabular-nums">{valor}</dd>
    </div>
  );
}

/* Íconos (SVG en línea, estilo outline) */
type IconProps = { className?: string };
const svg = (path: React.ReactNode) =>
  function Icon({ className }: IconProps) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {path}
      </svg>
    );
  };

const IconBox = svg(<><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></>);
const IconLayers = svg(<><path d="m12 2 10 5-10 5L2 7l10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>);
const IconCoins = svg(<><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /></>);
const IconSearch = svg(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>);
const IconRefresh = svg(<><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></>);
const IconPlus = svg(<><path d="M12 5v14" /><path d="M5 12h14" /></>);
const IconPencil = svg(<><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></>);
const IconTrash = svg(<><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></>);
const IconCheck = svg(<path d="M20 6 9 17l-5-5" />);
const IconX = svg(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
const IconAlert = svg(<><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></>);
const IconHash = svg(<><path d="M4 9h16" /><path d="M4 15h16" /><path d="M10 3 8 21" /><path d="m16 3-2 18" /></>);
const IconSparkle = svg(<path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2L12 3Z" />);

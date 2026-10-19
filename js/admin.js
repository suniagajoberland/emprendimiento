/* ---------- AUTENTICACIÓN ---------- */
const SESSION_KEY = "avellvis_session";
const USERS_KEY = "avellvis_users";
const DB = window.AvellvisDB;

const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");
const loginForm = document.getElementById("login-form");
const loginMsg = document.getElementById("msg");
const loginButton = loginForm.querySelector(".btn-login");

/**
 * Respaldo local: solo se usa cuando NO hay backend configurado (js/config.js).
 * Con Google Sheets activo las credenciales se validan en el servidor.
 */
function localLogin(username, password) {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(
      USERS_KEY,
      JSON.stringify([{ username: "admin", password: "avellvis2026", fullName: "Administrador" }]),
    );
  }
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  return users.find((u) => u.username === username && u.password === password) || null;
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function setLoginMessage(text, type) {
  loginMsg.className = "msg" + (type ? " " + type : "");
  loginMsg.textContent = text || "";
}

function showLogin(mensaje) {
  adminView.hidden = true;
  loginView.hidden = false;
  if (mensaje) setLoginMessage(mensaje, "error");
  document.getElementById("username").focus();
}

function enterAdmin(session) {
  document.getElementById("nav-user").textContent = session.fullName || session.username;
  loginView.hidden = true;
  adminView.hidden = false;
  refresh();
}

async function iniciarSesion(username, password) {
  if (!DB.configured) {
    const user = localLogin(username, password);
    if (!user) throw new Error("Usuario o contraseña incorrectos.");
    return { username: user.username, fullName: user.fullName };
  }
  const res = await DB.login(username, password);
  const nombre = res.user || username;
  return { username: nombre, fullName: nombre };
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setLoginMessage("");

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    setLoginMessage("Completa usuario y contraseña.", "error");
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Verificando...";
  setLoginMessage("Validando credenciales...");

  try {
    const perfil = await iniciarSesion(username, password);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...perfil, loginAt: new Date().toISOString() }));
    setLoginMessage("Bienvenido, " + perfil.fullName + ".", "success");
    setTimeout(() => enterAdmin(readSession()), 350);
  } catch (err) {
    setLoginMessage(err.message || "No se pudo iniciar sesión.", "error");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Iniciar Sesión";
  }
});

document.getElementById("btn-logout").addEventListener("click", () => {
  DB.logout();
  localStorage.removeItem(SESSION_KEY);
  window.location.reload();
});

/* ---------- MÓDULO EXCEL (bajo demanda) ---------- */
const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
let xlsxPromise = null;

/** Carga la librería Excel solo cuando se usa (ahorra ~900 KB en la carga inicial). */
function loadXLSX() {
  if (typeof XLSX !== "undefined") return Promise.resolve();
  if (!xlsxPromise) {
    xlsxPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = XLSX_URL;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        xlsxPromise = null;
        reject(new Error("No se pudo cargar el módulo Excel (requiere conexión)."));
      };
      document.head.appendChild(script);
    });
  }
  return xlsxPromise;
}

/* ---------- DATA ---------- */
const DEFAULT_COLORS = [{ nombre: "Negro Ébano", hex: "#111111", img: "" }];

let products = [];
let editingId = null;
let currentImage = "";

const sourceBadge = document.createElement("div");
sourceBadge.className = "source-badge local";
sourceBadge.textContent = "Base de datos: Local (sin Google Sheets configurado)";
document.querySelector(".page-subtitle").after(sourceBadge);

function updateSourceBadge(source, warning) {
  if (source === "sheet") {
    sourceBadge.className = "source-badge sheet";
    sourceBadge.textContent = "Base de datos: Google Sheets" + (warning ? " (respaldo local activo)" : "");
  } else {
    sourceBadge.className = "source-badge local";
    sourceBadge.textContent = DB.configured
      ? "Base de datos: Local (Sheets no disponible)"
      : "Base de datos: Local (configura js/config.js para usar Google Sheets)";
  }
}

async function refresh() {
  const { products: list, source, warning } = await DB.list();
  products = list;
  aplicarResultado({ source, warning });
  render();
}

/** Refleja el origen de los datos y expulsa al login si el servidor cortó la sesión. */
function aplicarResultado(result) {
  updateSourceBadge(result.source, result.warning);
  if (result.warning) handleWarning(result.warning);
}

/** Si el servidor invalida la sesión, se vuelve al login en lugar de escribir en falso. */
function handleWarning(warning) {
  if (!warning || !DB.configured) return;
  if (/sesi[oó]n|token/i.test(warning)) {
    DB.logout();
    localStorage.removeItem(SESSION_KEY);
    toast("La sesión expiró. Inicia sesión de nuevo.");
    showLogin("La sesión expiró. Inicia sesión de nuevo.");
    return;
  }
  toast(warning);
}

/* ---------- TOAST ---------- */
let toastTimer;
function toast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

/* ---------- RENDER ---------- */
const grid = document.getElementById("grid");

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function render() {
  const q = document.getElementById("search").value.trim().toLowerCase();
  const list = products.filter(
    (p) =>
      !q ||
      p.nombre.toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      (p.categoria || "").toLowerCase().includes(q),
  );

  grid.innerHTML = "";

  if (!list.length) {
    grid.innerHTML = '<div class="empty">No hay productos registrados</div>';
  } else {
    list.forEach((p) => {
      const img = p.imagen || (p.colores || []).find((c) => c.img)?.img || "";
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        ${img ? `<img class="card-img" src="${escapeHtml(img)}" alt="${escapeHtml(p.nombre)}" loading="lazy" decoding="async" />` : `<div class="card-img placeholder">Sin imagen</div>`}
        <div class="card-body">
          <div class="card-cat">${escapeHtml(p.categoria || p.filtro)}</div>
          <h3 class="card-name">${escapeHtml(p.nombre)}</h3>
          <div class="card-sku">${escapeHtml(p.sku || "SIN SKU")} · ${escapeHtml(p.edicion || "Edición estándar")}</div>
          <div class="card-price">$${Number(p.precio).toFixed(2)}</div>
          <div class="card-meta">Stock: ${p.stock ?? 0} uds. · Tallas: ${escapeHtml((p.tallas || []).join(", ") || "—")}</div>
          <span class="badge ${p.active ? "on" : "off"}">${p.active ? "Activo" : "Oculto"}</span>
          <div class="card-actions">
            <button class="btn edit" data-edit="${escapeHtml(p.id)}">Editar</button>
            <button class="btn delete" data-del="${escapeHtml(p.id)}">Eliminar</button>
          </div>
        </div>`;
      grid.appendChild(card);
    });
  }

  document.getElementById("stat-total").textContent = products.length;
  document.getElementById("stat-active").textContent = products.filter((p) => p.active).length;
  document.getElementById("stat-stock").textContent = products.reduce((s, p) => s + (Number(p.stock) || 0), 0);
  document.getElementById("stat-value").textContent =
    "$" + products.reduce((s, p) => s + (Number(p.precio) || 0) * (Number(p.stock) || 0), 0).toFixed(2);
}

grid.addEventListener("click", (e) => {
  const editId = e.target.getAttribute("data-edit");
  const delId = e.target.getAttribute("data-del");
  if (editId) openModal(products.find((p) => String(p.id) === String(editId)));
  if (delId) deleteProduct(delId);
});

/* La búsqueda se retrasa para no re-renderizar con cada tecla. */
let searchTimer;
document.getElementById("search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(render, 180);
});

document.getElementById("btn-sync").addEventListener("click", async () => {
  toast("Sincronizando...");
  await refresh();
  toast(products.length + " productos cargados.");
});

/* ---------- COLOR ROWS ---------- */
const colorRows = document.getElementById("color-rows");
/* Imagen por color: más pequeña que la principal para que quejan varias en la celda de Sheets. */
const COLOR_IMG_MAX = 10000;

function updateColorThumb(row) {
  const src = row.querySelector(".c-img").value.trim() || row.querySelector(".c-img-data").value;
  const img = row.querySelector(".c-thumb-img");
  const icon = row.querySelector(".c-thumb-icon");
  const clear = row.querySelector(".c-thumb-clear");
  const thumb = row.querySelector(".c-thumb");
  if (src) {
    img.src = src;
    img.hidden = false;
    icon.hidden = true;
    clear.hidden = false;
    thumb.classList.add("has-img");
  } else {
    img.removeAttribute("src");
    img.hidden = true;
    icon.hidden = false;
    clear.hidden = true;
    thumb.classList.remove("has-img");
  }
}

function addColorRow(color = {}) {
  const esData = String(color.img || "").startsWith("data:");
  const row = document.createElement("div");
  row.className = "color-row";
  row.innerHTML = `
    <input type="text" class="c-name" placeholder="Nombre" value="${escapeHtml(color.nombre || "")}" />
    <input type="color" class="c-hex" value="${escapeHtml(color.hex || "#111111")}" />
    <input type="text" class="c-img" placeholder="URL de imagen (opcional)" value="${esData ? "" : escapeHtml(color.img || "")}" />
    <input type="hidden" class="c-img-data" value="${esData ? escapeHtml(color.img) : ""}" />
    <label class="c-thumb" title="Subir imagen del color">
      <img class="c-thumb-img" alt="" hidden />
      <span class="c-thumb-icon">IMG</span>
      <button type="button" class="c-thumb-clear" hidden title="Quitar imagen">×</button>
    </label>
    <input type="file" accept="image/*" class="c-file" hidden />
    <button type="button" class="color-remove" title="Quitar">×</button>`;

  const urlInput = row.querySelector(".c-img");
  const dataInput = row.querySelector(".c-img-data");
  const fileInput = row.querySelector(".c-file");

  row.querySelector(".color-remove").addEventListener("click", () => row.remove());

  row.querySelector(".c-thumb").addEventListener("click", (e) => {
    if (e.target.closest(".c-thumb-clear")) return;
    fileInput.click();
  });

  row.querySelector(".c-thumb-clear").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dataInput.value = "";
    urlInput.value = "";
    updateColorThumb(row);
  });

  urlInput.addEventListener("input", () => {
    if (urlInput.value.trim()) dataInput.value = "";
    updateColorThumb(row);
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("El archivo debe ser una imagen.");
    toast("Comprimiendo imagen del color...");
    try {
      const dataUrl = await DB.compressImage(file, COLOR_IMG_MAX);
      dataInput.value = dataUrl;
      urlInput.value = "";
      updateColorThumb(row);
      toast("Imagen lista (" + Math.round(dataUrl.length / 1024) + " KB).");
    } catch (err) {
      toast(err.message);
    }
  });

  updateColorThumb(row);
  colorRows.appendChild(row);
}

document.getElementById("btn-add-color").addEventListener("click", () => addColorRow());

function collectColors() {
  return [...colorRows.querySelectorAll(".color-row")]
    .map((r) => ({
      nombre: r.querySelector(".c-name").value.trim(),
      hex: r.querySelector(".c-hex").value,
      img: r.querySelector(".c-img").value.trim() || r.querySelector(".c-img-data").value,
    }))
    .filter((c) => c.nombre || c.img);
}

/* ---------- IMAGEN ---------- */
const imgPreview = document.getElementById("img-preview");
const imgInput = document.getElementById("f-imagen");
const imgFile = document.getElementById("f-imagen-file");

function setImage(value) {
  currentImage = value || "";
  if (currentImage) {
    imgPreview.textContent = "";
    const img = document.createElement("img");
    img.alt = "Vista previa";
    img.addEventListener("error", () => {
      imgPreview.textContent = "No se pudo cargar";
    });
    img.src = currentImage;
    imgPreview.appendChild(img);
  } else {
    imgPreview.textContent = "Sin imagen";
  }
}

imgInput.addEventListener("input", () => setImage(imgInput.value.trim()));

document.getElementById("btn-img-clear").addEventListener("click", () => {
  imgInput.value = "";
  setImage("");
});

imgFile.addEventListener("change", async () => {
  const file = imgFile.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return toast("El archivo debe ser una imagen.");
  toast("Comprimiendo imagen...");
  try {
    const dataUrl = await DB.compressImage(file);
    setImage(dataUrl);
    imgInput.value = "";
    toast("Imagen lista (" + Math.round(dataUrl.length / 1024) + " KB).");
  } catch (err) {
    toast(err.message);
  }
  imgFile.value = "";
});

/* ---------- MODAL ---------- */
const modal = document.getElementById("modal");

function openModal(product = null) {
  editingId = product ? product.id : null;
  document.getElementById("modal-title").textContent = product ? "Editar Producto" : "Nuevo Producto";
  document.getElementById("f-name").value = product?.nombre || "";
  document.getElementById("f-sku").value = product?.sku || "";
  document.getElementById("f-price").value = product?.precio ?? "";
  document.getElementById("f-category").value = product?.categoria || "";
  document.getElementById("f-filter").value = product?.filtro || "mujer";
  document.getElementById("f-edition").value = product?.edicion || "";
  document.getElementById("f-stock").value = product?.stock ?? 0;
  document.getElementById("f-sizes").value = (product?.tallas || []).join(", ");
  document.getElementById("f-active").checked = product ? !!product.active : true;

  setImage(product?.imagen || (product?.colores || []).find((c) => c.img)?.img || "");
  imgInput.value = currentImage.startsWith("data:") ? "" : currentImage;

  colorRows.innerHTML = "";
  (product?.colores?.length ? product.colores : DEFAULT_COLORS).forEach((c) =>
    addColorRow({ ...c, img: c.img && c.img !== currentImage ? c.img : "" }),
  );

  modal.classList.add("open");
  document.getElementById("f-name").focus();
}

function closeModal() {
  modal.classList.remove("open");
  editingId = null;
}

document.getElementById("btn-new").addEventListener("click", () => openModal());
document.getElementById("btn-cancel").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  document.querySelectorAll(".modal-overlay.open").forEach((m) => m.classList.remove("open"));
});

/* ---------- CRUD ---------- */
document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("f-name").value.trim();
  const precio = parseFloat(document.getElementById("f-price").value);

  if (!nombre) return toast("El nombre es obligatorio.");
  if (!Number.isFinite(precio) || precio < 0) return toast("Precio inválido.");

  const data = {
    nombre,
    sku: document.getElementById("f-sku").value.trim() || null,
    precio: Math.round(precio * 100) / 100,
    categoria: document.getElementById("f-category").value.trim(),
    filtro: document.getElementById("f-filter").value,
    edicion: document.getElementById("f-edition").value.trim(),
    stock: Math.max(0, parseInt(document.getElementById("f-stock").value, 10) || 0),
    tallas: document
      .getElementById("f-sizes")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    colores: collectColors(),
    imagen: currentImage,
    active: document.getElementById("f-active").checked ? 1 : 0,
  };

  if (editingId) {
    data.id = products.find((p) => String(p.id) === String(editingId)).id;
  } else {
    data.id = "p" + Date.now() + Math.floor(Math.random() * 1000);
  }

  const result = await DB.save(data);
  products = (await DB.list()).products;
  aplicarResultado(result);
  closeModal();
  render();
  toast(
    (editingId ? "Producto actualizado." : "Producto creado.") +
      (result.warning ? " (guardado local: " + result.warning + ")" : ""),
  );
});

async function deleteProduct(id) {
  const p = products.find((x) => String(x.id) === String(id));
  if (!p) return;
  if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
  const result = await DB.remove(id);
  products = products.filter((x) => String(x.id) !== String(id));
  aplicarResultado(result);
  render();
  toast("Producto eliminado.");
}

/* ---------- EXCEL: PLANTILLA ---------- */
document.getElementById("btn-template").addEventListener("click", async () => {
  const btn = document.getElementById("btn-template");
  btn.disabled = true;
  try {
    await loadXLSX();
    const headers = [
      "nombre", "sku", "precio", "categoria", "filtro", "edicion",
      "stock", "tallas", "colores", "imagen", "activo",
    ];
    const example = [
      "Top Minimal Seamless", "TS-01", 24, "Mujer / Haute Couture", "mujer", "SS26 Exclusive",
      10, "XS,S,M,L", "Negro Ébano#111111|Oro Champagne#d4af37",
      "https://ejemplo.com/imagen.jpg", "1",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(12, h.length + 4) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "plantilla-productos-avellvis.xlsx");
    toast("Plantilla descargada.");
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
  }
});

/* ---------- EXCEL: IMPORTAR ---------- */
const importModal = document.getElementById("import-modal");
const dropZone = document.getElementById("drop-zone");
const excelFile = document.getElementById("excel-file");
const importPreview = document.getElementById("import-preview");
const importCount = document.getElementById("import-count");
const importConfirm = document.getElementById("btn-import-confirm");
let importData = [];

function openImportModal() {
  importData = [];
  importPreview.classList.remove("open");
  importPreview.innerHTML = "";
  importCount.textContent = "";
  importConfirm.disabled = true;
  importModal.classList.add("open");
}

function closeImportModal() {
  importModal.classList.remove("open");
}

document.getElementById("btn-import").addEventListener("click", openImportModal);
document.getElementById("btn-import-cancel").addEventListener("click", closeImportModal);
importModal.addEventListener("click", (e) => {
  if (e.target === importModal) closeImportModal();
});

dropZone.addEventListener("click", () => excelFile.click());
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files[0]) readExcel(e.dataTransfer.files[0]);
});
excelFile.addEventListener("change", () => {
  if (excelFile.files[0]) readExcel(excelFile.files[0]);
});

function normKey(k) {
  return String(k)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function rowToProduct(row, i) {
  const get = (...keys) => {
    for (const k of Object.keys(row)) {
      if (keys.includes(normKey(k))) return row[k];
    }
    return "";
  };

  const nombre = String(get("nombre", "name", "producto") || "").trim();
  const precioRaw = get("precio", "price", "precio_usd", "price_usd");
  const precio = parseFloat(String(precioRaw).replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
  const stock = parseInt(get("stock", "cantidad", "inventario"), 10) || 0;
  const filtro = normKey(get("filtro", "categoria_filtro", "filter", "seccion"));
  const activoRaw = normKey(get("activo", "active", "visible", "publicado"));
  const imagen = String(get("imagen", "image", "img", "foto", "url_imagen") || "").trim();

  const coloresRaw = String(get("colores", "colors", "gama_colores") || "");
  let colores = coloresRaw
    .split("|")
    .map((c) => {
      const partes = c.split("#");
      const nombreC = partes[0];
      const hex = partes[1];
      const img = partes.slice(2).join("#").trim();
      return {
        nombre: (nombreC || "").trim(),
        hex: hex ? "#" + hex.replace(/^#/, "").slice(0, 6) : "#111111",
        img,
      };
    })
    .filter((c) => c.nombre);
  if (!colores.length) colores = [{ nombre: "Negro Ébano", hex: "#111111", img: "" }];

  return {
    id: "p" + Date.now() + i + Math.floor(Math.random() * 1000),
    nombre,
    sku: String(get("sku", "modelo", "code", "codigo") || "").trim() || null,
    precio,
    categoria: String(get("categoria", "category") || "").trim(),
    filtro: DB.FILTERS.includes(filtro) ? filtro : "casual",
    edicion: String(get("edicion", "edition", "coleccion") || "").trim(),
    stock,
    tallas: String(get("tallas", "sizes", "talla") || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    colores,
    imagen,
    active: ["0", "no", "false", "oculto", "inactivo"].includes(activoRaw) ? 0 : 1,
  };
}

async function readExcel(file) {
  try {
    await loadXLSX();
  } catch (err) {
    toast(err.message);
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const wb = XLSX.read(ev.target.result, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      importData = rows.map((r, i) => rowToProduct(r, i)).filter((p) => p.nombre);

      const skipped = rows.length - importData.length;
      importCount.textContent =
        importData.length + " producto(s) listo(s) para importar" +
        (skipped ? " · " + skipped + " fila(s) omitidas sin nombre" : "");

      if (importData.length) {
        const preview = importData.slice(0, 5).map((p) => ({
          nombre: p.nombre,
          sku: p.sku || "—",
          precio: "$" + p.precio.toFixed(2),
          filtro: p.filtro,
          stock: p.stock,
          tallas: p.tallas.join(", ") || "—",
          imagen: p.imagen ? "Sí" : "—",
        }));
        const keys = Object.keys(preview[0]);
        importPreview.innerHTML =
          "<table><thead><tr>" +
          keys.map((k) => `<th>${k}</th>`).join("") +
          "</tr></thead><tbody>" +
          preview
            .map((r) => "<tr>" + keys.map((k) => `<td>${escapeHtml(r[k])}</td>`).join("") + "</tr>")
            .join("") +
          "</tbody></table>";
        importPreview.classList.add("open");
        importConfirm.disabled = false;
      } else {
        toast("No se encontraron productos válidos en el archivo.");
      }
    } catch (err) {
      toast("Error al leer el archivo: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

importConfirm.addEventListener("click", async () => {
  if (!importData.length) return;
  importConfirm.disabled = true;
  importConfirm.textContent = "Importando...";
  const result = await DB.bulk(importData);
  importConfirm.textContent = "Importar";
  importConfirm.disabled = false;
  closeImportModal();
  await refresh();
  toast(
    result.count + " productos importados" +
      (result.source === "sheet" ? " a Google Sheets." : " localmente.") +
      (result.warning ? " (" + result.warning + ")" : ""),
  );
});

/* ---------- REPORTES ---------- */
const reportsModal = document.getElementById("reports-modal");

function productImage(p) {
  return p.imagen || (p.colores || []).find((c) => c.img)?.img || "";
}

function exportRows() {
  return products.map((p) => ({
    nombre: p.nombre,
    sku: p.sku || "",
    precio: p.precio,
    categoria: p.categoria || "",
    filtro: p.filtro,
    edicion: p.edicion || "",
    stock: p.stock,
    tallas: (p.tallas || []).join(","),
    colores: (p.colores || []).map((c) => c.nombre + "#" + String(c.hex || "").replace(/^#/, "")).join("|"),
    imagen: productImage(p),
    activo: p.active ? 1 : 0,
  }));
}

function openReports() {
  const total = products.length;
  const activos = products.filter((p) => p.active).length;
  const unidades = products.reduce((s, p) => s + (Number(p.stock) || 0), 0);
  const valor = products.reduce((s, p) => s + (Number(p.precio) || 0) * (Number(p.stock) || 0), 0);
  const sinImagen = products.filter((p) => !productImage(p));
  const stockBajo = products.filter((p) => p.active && (Number(p.stock) || 0) <= 3);

  document.getElementById("report-kpis").innerHTML = [
    ["Productos", total],
    ["Activos", activos],
    ["Ocultos", total - activos],
    ["Unidades", unidades],
    ["Valor inventario", "$" + valor.toFixed(2)],
  ]
    .map(
      ([l, v]) =>
        `<div class="report-kpi"><div class="rk-label">${l}</div><div class="rk-value">${v}</div></div>`,
    )
    .join("");

  const byFilter = {};
  products.forEach((p) => {
    byFilter[p.filtro] = byFilter[p.filtro] || { count: 0, value: 0 };
    byFilter[p.filtro].count++;
    byFilter[p.filtro].value += (Number(p.precio) || 0) * (Number(p.stock) || 0);
  });
  const maxCount = Math.max(1, ...Object.values(byFilter).map((x) => x.count));
  document.getElementById("report-bars").innerHTML = Object.keys(byFilter)
    .map(
      (k) => `
      <div class="bar-row">
        <span class="bar-label">${escapeHtml(k)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(byFilter[k].count / maxCount) * 100}%"></div></div>
        <span class="bar-value">${byFilter[k].count}</span>
      </div>`,
    )
    .join("") || '<span class="img-note">Sin datos</span>';

  document.getElementById("report-lowstock").innerHTML = stockBajo.length
    ? stockBajo
        .map(
          (p) =>
            `<div class="alert-item"><span>${escapeHtml(p.nombre)} (${escapeHtml(p.sku || "S/N")})</span><span class="alert-warn">${p.stock} uds.</span></div>`,
        )
        .join("")
    : '<div class="alert-item"><span class="img-note">Ninguno. Todo el stock es saludable.</span></div>';

  document.getElementById("report-noimg").innerHTML = sinImagen.length
    ? sinImagen
        .map(
          (p) =>
            `<div class="alert-item"><span>${escapeHtml(p.nombre)} (${escapeHtml(p.sku || "S/N")})</span><span class="alert-warn">Sin imagen</span></div>`,
        )
        .join("")
    : '<div class="alert-item"><span class="img-note">Todos los productos tienen imagen.</span></div>';

  reportsModal.classList.add("open");
}

document.getElementById("btn-reports").addEventListener("click", openReports);
document.getElementById("btn-report-close").addEventListener("click", () => reportsModal.classList.remove("open"));
reportsModal.addEventListener("click", (e) => {
  if (e.target === reportsModal) reportsModal.classList.remove("open");
});

document.getElementById("btn-report-csv").addEventListener("click", () => {
  const rows = exportRows();
  if (!rows.length) return toast("No hay productos para exportar.");
  const headers = Object.keys(rows[0]);
  const csv =
    headers.join(";") +
    "\n" +
    rows
      .map((r) =>
        headers
          .map((h) => `"${String(r[h]).replace(/"/g, '""')}"`)
          .join(";"),
      )
      .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "reporte-inventario-avellvis.csv";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Reporte CSV descargado.");
});

document.getElementById("btn-report-excel").addEventListener("click", async () => {
  const btn = document.getElementById("btn-report-excel");
  btn.disabled = true;
  try {
    await loadXLSX();
    const rows = exportRows();
    if (!rows.length) return toast("No hay productos para exportar.");
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "reporte-inventario-avellvis.xlsx");
    toast("Reporte Excel descargado.");
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
  }
});

/* ---------- IMÁGENES MASIVAS ---------- */
const imagesModal = document.getElementById("images-modal");
const imagesTbody = document.getElementById("images-tbody");
const imgDropZone = document.getElementById("img-drop-zone");
const imgBulkInput = document.getElementById("img-bulk-input");

function normText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findProductByFile(fileName) {
  const base = normText(fileName);
  return (
    products.find((p) => normText(p.sku) === base) ||
    products.find((p) => normText(p.nombre) === base) ||
    products.find((p) => base.includes(normText(p.sku)) && p.sku) ||
    products.find((p) => normText(p.nombre).includes(base)) ||
    null
  );
}

function renderImagesTable() {
  imagesTbody.innerHTML = products
    .map((p) => {
      const img = productImage(p);
      return `
      <tr data-id="${escapeHtml(p.id)}">
        <td>
          ${img ? `<img class="bulk-thumb" src="${escapeHtml(img)}" alt="" />` : `<div class="bulk-thumb empty">Sin img</div>`}
        </td>
        <td>${escapeHtml(p.nombre)}</td>
        <td>${escapeHtml(p.sku || "—")}</td>
        <td style="white-space:nowrap">
          <button type="button" class="bulk-img-btn" data-upload="${escapeHtml(p.id)}">Subir</button>
          <button type="button" class="bulk-img-btn" data-url="${escapeHtml(p.id)}">URL</button>
          ${img ? `<button type="button" class="bulk-img-btn" data-clearimg="${escapeHtml(p.id)}">Quitar</button>` : ""}
        </td>
      </tr>`;
    })
    .join("");
}

async function assignImage(product, dataUrl) {
  const result = await DB.save({ ...product, imagen: dataUrl });
  const i = products.findIndex((x) => String(x.id) === String(product.id));
  if (i >= 0) products[i] = result.product;
  return result;
}

imagesTbody.addEventListener("click", async (e) => {
  const uploadId = e.target.getAttribute("data-upload");
  const urlId = e.target.getAttribute("data-url");
  const clearId = e.target.getAttribute("data-clearimg");

  if (uploadId) {
    const p = products.find((x) => String(x.id) === String(uploadId));
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      toast("Comprimiendo imagen de " + p.nombre + "...");
      try {
        const dataUrl = await DB.compressImage(file);
        const result = await assignImage(p, dataUrl);
        updateSourceBadge(result.source, result.warning);
        renderImagesTable();
        render();
        toast("Imagen asignada a " + p.nombre + ".");
      } catch (err) {
        toast(err.message);
      }
    };
    input.click();
  }

  if (urlId) {
    const p = products.find((x) => String(x.id) === String(urlId));
    const url = prompt("URL de la imagen para " + p.nombre + ":", productImage(p).startsWith("data:") ? "" : productImage(p));
    if (url === null) return;
    const result = await assignImage(p, url.trim());
    updateSourceBadge(result.source, result.warning);
    renderImagesTable();
    render();
    toast("Imagen actualizada.");
  }

  if (clearId) {
    const p = products.find((x) => String(x.id) === String(clearId));
    const result = await assignImage(p, "");
    updateSourceBadge(result.source, result.warning);
    renderImagesTable();
    render();
    toast("Imagen eliminada de " + p.nombre + ".");
  }
});

async function handleImageFiles(files) {
  let assigned = 0;
  const unmatched = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const p = findProductByFile(file.name);
    if (!p) {
      unmatched.push(file.name);
      continue;
    }
    toast("Procesando " + file.name + " → " + p.nombre + "...");
    try {
      const dataUrl = await DB.compressImage(file);
      const result = await assignImage(p, dataUrl);
      updateSourceBadge(result.source, result.warning);
      assigned++;
    } catch (err) {
      toast(err.message);
    }
  }
  renderImagesTable();
  render();
  if (unmatched.length) {
    toast(assigned + " asignadas. Sin coincidencia: " + unmatched.join(", "));
  } else {
    toast(assigned + " imagen(es) asignada(s).");
  }
}

imgDropZone.addEventListener("click", () => imgBulkInput.click());
imgDropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  imgDropZone.classList.add("dragover");
});
imgDropZone.addEventListener("dragleave", () => imgDropZone.classList.remove("dragover"));
imgDropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  imgDropZone.classList.remove("dragover");
  if (e.dataTransfer.files.length) handleImageFiles([...e.dataTransfer.files]);
});
imgBulkInput.addEventListener("change", () => {
  if (imgBulkInput.files.length) handleImageFiles([...imgBulkInput.files]);
  imgBulkInput.value = "";
});

document.getElementById("btn-bulk-images").addEventListener("click", () => {
  renderImagesTable();
  imagesModal.classList.add("open");
});
document.getElementById("btn-images-close").addEventListener("click", () => imagesModal.classList.remove("open"));
document.getElementById("btn-images-sync").addEventListener("click", async () => {
  await refresh();
  renderImagesTable();
  toast("Sincronizado. " + products.length + " productos.");
});
imagesModal.addEventListener("click", (e) => {
  if (e.target === imagesModal) imagesModal.classList.remove("open");
});

/* ---------- COLORES Y TALLAS MASIVOS ---------- */
const attrsModal = document.getElementById("attrs-modal");
const attrsTbody = document.getElementById("attrs-tbody");

function renderAttrsTable() {
  attrsTbody.innerHTML = products
    .map((p) => {
      const swatches = (p.colores || [])
        .map((c) => `<span class="swatch-mini" style="background-color:${escapeHtml(c.hex)}" title="${escapeHtml(c.nombre)}"></span>`)
        .join("");
      return `
      <tr data-id="${escapeHtml(p.id)}">
        <td>${escapeHtml(p.nombre)}</td>
        <td><input type="text" class="a-sizes" value="${escapeHtml((p.tallas || []).join(", "))}" placeholder="XS, S, M, L" /></td>
        <td><input type="text" class="a-colors" value="${escapeHtml((p.colores || []).map((c) => c.nombre + "#" + String(c.hex || "#111111").replace(/^#/, "")).join("|"))}" placeholder="Negro#111111|Oro#d4af37" /></td>
        <td><div class="swatch-row">${swatches || '<span class="img-note">—</span>'}</div></td>
      </tr>`;
    })
    .join("");
}

attrsTbody.addEventListener("input", (e) => {
  const row = e.target.closest("tr");
  if (!row || !e.target.classList.contains("a-colors")) return;
  const swatchRow = row.querySelector(".swatch-row");
  swatchRow.innerHTML =
    e.target.value
      .split("|")
      .map((c) => {
        const [nombre, hex] = c.split("#");
        if (!nombre.trim()) return "";
        return `<span class="swatch-mini" style="background-color:#${(hex || "111111").replace(/^#/, "")}" title="${escapeHtml(nombre.trim())}"></span>`;
      })
      .join("") || '<span class="img-note">—</span>';
});

document.getElementById("btn-bulk-attrs").addEventListener("click", () => {
  renderAttrsTable();
  attrsModal.classList.add("open");
});
document.getElementById("btn-attrs-cancel").addEventListener("click", () => attrsModal.classList.remove("open"));
attrsModal.addEventListener("click", (e) => {
  if (e.target === attrsModal) attrsModal.classList.remove("open");
});

document.getElementById("btn-attrs-save").addEventListener("click", async () => {
  const rows = [...attrsTbody.querySelectorAll("tr")];
  if (!rows.length) return;

  const btn = document.getElementById("btn-attrs-save");
  const cambios = [];

  rows.forEach((row) => {
    const p = products.find((x) => String(x.id) === String(row.dataset.id));
    if (!p) return;

    const tallas = row
      .querySelector(".a-sizes")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const previos = p.colores || [];
    const colores = row
      .querySelector(".a-colors")
      .value.split("|")
      .map((c) => {
        const [nombre, hex] = c.split("#");
        const limpio = (nombre || "").trim();
        const igual = previos.find((x) => x.nombre === limpio);
        return {
          nombre: limpio,
          hex: "#" + (hex || "111111").replace(/^#/, "").slice(0, 6),
          img: (igual && igual.img) || "",
        };
      })
      .filter((c) => c.nombre);

    const sinCambios =
      JSON.stringify(p.tallas || []) === JSON.stringify(tallas) &&
      JSON.stringify(previos.map((c) => [c.nombre, c.hex])) === JSON.stringify(colores.map((c) => [c.nombre, c.hex]));
    if (sinCambios) return;

    cambios.push({ ...p, tallas, colores });
  });

  if (!cambios.length) {
    attrsModal.classList.remove("open");
    toast("No hay cambios que guardar.");
    return;
  }

  /* Una sola petición para todos los cambios: menos espera y menos choques. */
  btn.disabled = true;
  btn.textContent = "Guardando...";
  try {
    const result = await DB.bulk(cambios);
    cambios.forEach((c) => {
      const i = products.findIndex((x) => String(x.id) === String(c.id));
      if (i >= 0) products[i] = c;
    });
    await refresh();
    attrsModal.classList.remove("open");
    toast(result.count + " producto(s) actualizados.");
  } catch (err) {
    toast(err.message || "No se pudieron guardar los cambios.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar cambios";
  }
});

/* ---------- ARRANQUE ---------- */
const activeSession = readSession();
if (activeSession && (!DB.configured || DB.hasSession())) enterAdmin(activeSession);
else {
  DB.logout();
  localStorage.removeItem(SESSION_KEY);
  showLogin();
}

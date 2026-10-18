/**
 * Cliente compartido: Google Sheets (si AVELLVIS_SHEET_URL está configurada)
 * con espejo en localStorage como respaldo offline.
 */
(function () {
  const SHEET_URL = typeof AVELLVIS_SHEET_URL !== "undefined" ? AVELLVIS_SHEET_URL : "";
  const LOCAL_KEY = "avellvis_products";
  const IMG_MAX = typeof AVELLVIS_IMG_MAX_CHARS !== "undefined" ? AVELLVIS_IMG_MAX_CHARS : 42000;

  const FILTERS = ["mujer", "hombre", "deportivo", "casual"];

  function localList() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function localSave(list) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  }

  function normalize(p) {
    const tallas = Array.isArray(p.tallas)
      ? p.tallas
      : String(p.tallas || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

    let colores = p.colores;
    if (typeof colores === "string") {
      colores = colores
        .split("|")
        .map((c) => {
          const [nombre, hex] = c.split("#");
          return { nombre: (nombre || "").trim(), hex: hex ? "#" + hex.replace(/^#/, "") : "#111111", img: "" };
        })
        .filter((c) => c.nombre);
    }
    if (!Array.isArray(colores)) colores = [];
    colores = colores.map((c) => ({
      nombre: c.nombre || "Color",
      hex: c.hex || "#111111",
      img: c.img || ""
    }));

    return {
      id: String(p.id || "p" + Date.now() + Math.floor(Math.random() * 1000)),
      nombre: String(p.nombre || "").trim(),
      sku: p.sku ? String(p.sku) : null,
      precio: Number(p.precio) || 0,
      categoria: String(p.categoria || ""),
      filtro: FILTERS.includes(p.filtro)
        ? p.filtro
        : FILTERS.includes(p.filter)
          ? p.filter
          : "casual",
      edicion: String(p.edicion || ""),
      stock: parseInt(p.stock, 10) || 0,
      tallas,
      colores,
      imagen: String(p.imagen || ""),
      active:
        p.active === 0 ||
        p.active === false ||
        p.active === "0" ||
        ["no", "false", "oculto", "inactivo"].includes(String(p.active).toLowerCase())
          ? 0
          : 1
    };
  }

  async function sheetCall(action, payload) {
    const res = await fetch(SHEET_URL, {
      method: "POST",
      body: JSON.stringify(Object.assign({ action }, payload || {})),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow"
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Error en Google Sheets");
    return data;
  }

  function compressImage(file, maxChars) {
    maxChars = maxChars || IMG_MAX;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("El archivo no es una imagen válida."));
        img.onload = () => {
          let quality = 0.82;
          let scale = Math.min(1, 900 / img.width);
          let dataUrl = "";
          for (let i = 0; i < 10; i++) {
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL("image/jpeg", quality);
            if (dataUrl.length <= maxChars) return resolve(dataUrl);
            scale *= 0.78;
            quality = Math.max(0.4, quality - 0.08);
          }
          resolve(dataUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function list() {
    if (SHEET_URL) {
      try {
        const data = await sheetCall("list");
        const products = (data.products || []).map(normalize);
        localSave(products);
        return { products, source: "sheet" };
      } catch (err) {
        return { products: localList(), source: "local", warning: err.message };
      }
    }
    return { products: localList(), source: "local" };
  }

  async function save(product) {
    const p = normalize(product);
    let list = localList();
    const i = list.findIndex((x) => String(x.id) === String(p.id));
    if (i >= 0) list[i] = p;
    else list.push(p);
    localSave(list);

    if (SHEET_URL) {
      try {
        await sheetCall("save", { product: p });
        return { ok: true, product: p, source: "sheet" };
      } catch (err) {
        return { ok: true, product: p, source: "local", warning: err.message };
      }
    }
    return { ok: true, product: p, source: "local" };
  }

  async function remove(id) {
    let list = localList().filter((x) => String(x.id) !== String(id));
    localSave(list);

    if (SHEET_URL) {
      try {
        await sheetCall("delete", { id });
        return { ok: true, source: "sheet" };
      } catch (err) {
        return { ok: true, source: "local", warning: err.message };
      }
    }
    return { ok: true, source: "local" };
  }

  async function bulk(products) {
    const normalized = products.map((p) => normalize(p));
    const list = localList();
    const byId = new Map(list.map((p) => [String(p.id), p]));
    normalized.forEach((p) => byId.set(String(p.id), p));
    const merged = [...byId.values()];
    localSave(merged);

    if (SHEET_URL) {
      try {
        const data = await sheetCall("bulk", { products: normalized });
        return { ok: true, count: data.count || normalized.length, source: "sheet" };
      } catch (err) {
        return { ok: true, count: normalized.length, source: "local", warning: err.message };
      }
    }
    return { ok: true, count: normalized.length, source: "local" };
  }

  window.AvellvisDB = {
    configured: Boolean(SHEET_URL),
    localList,
    list,
    save,
    remove,
    bulk,
    compressImage,
    normalize,
    FILTERS
  };
})();

const TELEFONO = "584242714023";

/* Imagen mínima en memoria: evita una petición por cada producto sin foto. */
const IMG_VACIA =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

const productosDefault = {
  mujer: [
    {
      nombre: "Top Minimal Seamless",
      modelo: "TS-01",
      precio: "$24.00",
      categoria: "Mujer / Haute Couture",
      edicion: "SS26 Exclusive",
      tallas: ["XS", "S", "M", "L"],
      colores: [
        {
          nombre: "Negro Ébano",
          hex: "#111111",
          img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80",
        },
        {
          nombre: "Oro Champagne",
          hex: "#d4af37",
          img: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80",
        },
        {
          nombre: "Verde Esmeralda",
          hex: "#0a2e22",
          img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80",
        },
      ],
    },
    {
      nombre: "Vestido Linen Classic",
      modelo: "VS-12",
      precio: "$38.00",
      categoria: "Mujer / Resort Line",
      edicion: "Summer Elegance",
      tallas: ["XS", "S", "M"],
      colores: [
        {
          nombre: "Beige Arena",
          hex: "#e3dac9",
          img: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=600&q=80",
        },
        {
          nombre: "Azul Océano",
          hex: "#1f3044",
          img: "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=600&q=80",
        },
      ],
    },
  ],
  hombre: [
    {
      nombre: "Mono Urban Fleece",
      modelo: "MN-05",
      precio: "$45.00",
      categoria: "Hombre / Streetwear",
      edicion: "Limited Edition",
      tallas: ["S", "M", "L", "XL"],
      colores: [
        {
          nombre: "Azul Medianoche",
          hex: "#101820",
          img: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=600&q=80",
        },
        {
          nombre: "Gris Titanio",
          hex: "#8c8c8c",
          img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
        },
        {
          nombre: "Negro Mate",
          hex: "#1a1a1a",
          img: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=600&q=80",
        },
      ],
    },
    {
      nombre: "Blazer Minimal Black",
      modelo: "BZ-09",
      precio: "$85.00",
      categoria: "Hombre / Tailoring",
      edicion: "Executive Line",
      tallas: ["S", "M", "L"],
      colores: [
        {
          nombre: "Negro Puro",
          hex: "#111111",
          img: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=600&q=80",
        },
        {
          nombre: "Gris Carbón",
          hex: "#2d3748",
          img: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
        },
      ],
    },
  ],
  deportivo: [
    {
      nombre: "Short Deportivo Pro",
      modelo: "SH-21",
      precio: "$22.00",
      categoria: "Deportivo / Running",
      edicion: "Active Line",
      tallas: ["XS", "S", "M", "L"],
      colores: [
        {
          nombre: "Negro Ébano",
          hex: "#111111",
          img: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=600&q=80",
        },
        {
          nombre: "Gris Titanio",
          hex: "#8c8c8c",
          img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
        },
      ],
    },
    {
      nombre: "Leggins Sculpt Fit",
      modelo: "LG-14",
      precio: "$28.00",
      categoria: "Deportivo / Training",
      edicion: "Sculpt Series",
      tallas: ["XS", "S", "M", "L"],
      colores: [
        {
          nombre: "Negro Ébano",
          hex: "#111111",
          img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80",
        },
        {
          nombre: "Verde Esmeralda",
          hex: "#0a2e22",
          img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80",
        },
      ],
    },
    {
      nombre: "Pantalón Cargo Sport",
      modelo: "PT-33",
      precio: "$42.00",
      categoria: "Deportivo / Outdoor",
      edicion: "Terra Line",
      tallas: ["S", "M", "L", "XL"],
      colores: [
        {
          nombre: "Azul Medianoche",
          hex: "#101820",
          img: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=600&q=80",
        },
        {
          nombre: "Beige Arena",
          hex: "#e3dac9",
          img: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=600&q=80",
        },
      ],
    },
    {
      nombre: "Top Cropped Active",
      modelo: "TP-07",
      precio: "$20.00",
      categoria: "Deportivo / Yoga",
      edicion: "Flex Collection",
      tallas: ["XS", "S", "M", "L"],
      colores: [
        {
          nombre: "Oro Champagne",
          hex: "#d4af37",
          img: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80",
        },
        {
          nombre: "Azul Océano",
          hex: "#1f3044",
          img: "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=600&q=80",
        },
      ],
    },
  ],
  casual: [],
};

/** Evita inyección de HTML desde la hoja y URLs no seguras en las imágenes. */
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlSegura(u) {
  const s = String(u || "").trim();
  return /^(https?:\/\/|data:image\/)/i.test(s) ? s.replace(/"/g, "%22") : "";
}

function hexSeguro(h) {
  const s = String(h || "").trim();
  return /^#[0-9a-f]{3,8}$/i.test(s) ? s : "#111111";
}

function mapearParaTienda(guardados) {
  return guardados
    .filter((p) => p.active)
    .map((p) => {
      const colores =
        p.colores && p.colores.length
          ? p.colores.map((c, i) => ({
              nombre: c.nombre || "Color",
              hex: hexSeguro(c.hex),
              img: urlSegura(c.img || (i === 0 ? p.imagen || "" : "")),
            }))
          : [{ nombre: "Negro Ébano", hex: "#111111", img: urlSegura(p.imagen) }];
      if (p.imagen && !colores.some((c) => c.img)) colores[0].img = urlSegura(p.imagen);
      return {
        nombre: p.nombre,
        modelo: p.sku || "S/N",
        precioNumero: Number(p.precio) || 0,
        precio: "$" + Number(p.precio || 0).toFixed(2),
        categoria: p.categoria || p.filtro,
        edicion: p.edicion || "Edición estándar",
        tallas: p.tallas && p.tallas.length ? p.tallas : ["Única"],
        colores,
        filtro: p.filtro,
      };
    });
}

function listaPorDefecto() {
  const lista = [];
  Object.keys(productosDefault).forEach((filtro) => {
    productosDefault[filtro].forEach((producto) => {
      lista.push({ ...producto, filtro });
    });
  });
  return lista;
}

const grid = document.getElementById("product-grid");
const filtros = document.querySelectorAll("[data-filtro]");
let productosConFiltro = [];
let filtroActual = "todos";

function aplicarFiltro(filtro) {
  filtroActual = filtro;
  filtros.forEach((el) =>
    el.classList.toggle("active", el.dataset.filtro === filtro),
  );
  renderProductos(filtro);
}

filtros.forEach((el) => {
  el.addEventListener("click", (event) => {
    event.preventDefault();
    aplicarFiltro(el.dataset.filtro);
  });
});

async function initTienda() {
  /* 1. Pintado inmediato con lo último guardado en el navegador (sin esperar la red). */
  const cache = window.AvellvisDB.localList();
  if (cache.length) {
    productosConFiltro = mapearParaTienda(cache);
    renderProductos(filtroActual);
  }

  /* 2. Datos frescos de Google Sheets y repintado solo si cambian. */
  try {
    const { products, source } = await window.AvellvisDB.list();
    productosConFiltro = products.length ? mapearParaTienda(products) : listaPorDefecto();
    if (source === "sheet") {
      console.info("Avellvis: productos cargados desde Google Sheets.");
    }
  } catch {
    if (!productosConFiltro.length) productosConFiltro = listaPorDefecto();
  }

  renderProductos(filtroActual);
  inyectarDatosEstructurados();
}

/** Datos estructurados de los productos visibles (mejora cómo Google muestra la tienda). */
function inyectarDatosEstructurados() {
  if (!productosConFiltro.length) return;
  const base = "https://joberlands.vercel.app/";
  const items = productosConFiltro.slice(0, 50).map((p, i) => {
    const precio = p.precioNumero ?? (Number(String(p.precio).replace(/[^0-9.]/g, "")) || 0);
    const img = (p.colores.find((c) => c.img) || {}).img;
    return {
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.nombre,
        category: p.categoria,
        sku: p.modelo !== "S/N" ? p.modelo : undefined,
        image: img || undefined,
        offers: {
          "@type": "Offer",
          price: precio.toFixed(2),
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: base
        }
      }
    };
  });

  const previo = document.getElementById("jsonld-productos");
  if (previo) previo.remove();

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "jsonld-productos";
  script.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", itemListElement: items });
  document.head.appendChild(script);
}

initTienda();

function crearTarjeta(producto) {
  const colorInicial = producto.colores[0];
  const tallaInicial = producto.tallas[0];
  const imgInicial = colorInicial.img || IMG_VACIA;

  const card = document.createElement("div");
  card.className = "product-card";
  card.innerHTML = `
    <div class="card-inner">
      <div class="card-front">
        <div class="card-image-wrapper">
          <img class="card-image" src="${escapeHtml(imgInicial)}" alt="${escapeHtml(producto.nombre)}" loading="lazy" decoding="async" width="600" height="750" />
        </div>
        <div class="card-info-front">
          <div class="categoria">${escapeHtml(producto.categoria)}</div>
          <h3 class="nombre-producto">${escapeHtml(producto.nombre)}</h3>
          <div class="precio">${escapeHtml(producto.precio)}</div>
          <div class="selector-seccion">
            <span class="selector-label">Talla:</span>
            <div class="talla-selector">
              ${producto.tallas
                .map(
                  (t, i) =>
                    `<button class="talla-option${i === 0 ? " selected" : ""}">${escapeHtml(t)}</button>`,
                )
                .join("")}
            </div>
          </div>
          <div class="selector-seccion">
            <span class="selector-label">Gama de Color:</span>
            <div class="color-selector">
              ${producto.colores
                .map(
                  (c, i) =>
                    `<div class="color-option${i === 0 ? " selected" : ""}" style="background-color:${hexSeguro(c.hex)}" title="${escapeHtml(c.nombre)}"></div>`,
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
      <div class="card-back">
        <div>
          <div class="back-title">Resumen del Pedido</div>
          <div class="detalles-lista">
            <p><strong>Edición:</strong> ${escapeHtml(producto.edicion)}</p>
          </div>
          <div class="back-preview-wrapper">
            <img class="back-preview" src="${escapeHtml(imgInicial)}" alt="${escapeHtml(producto.nombre)}" loading="lazy" decoding="async" />
          </div>
          <div class="resumen">
            <div class="resumen-fila">
              <span class="resumen-label">Color</span>
              <span class="resumen-valor">
                <span class="resumen-swatch" style="background-color:${hexSeguro(colorInicial.hex)}"></span>
                <span class="resumen-color-nombre">${escapeHtml(colorInicial.nombre)}</span>
              </span>
            </div>
            <div class="resumen-fila">
              <span class="resumen-label">Talla</span>
              <span class="resumen-valor resumen-talla">${escapeHtml(tallaInicial)}</span>
            </div>
          </div>
        </div>
        <button class="btn-whatsapp">Adquirir por WhatsApp</button>
      </div>
    </div>
  `;

  const colorOpts = card.querySelectorAll(".color-option");
  const tallaOpts = card.querySelectorAll(".talla-option");
  const imgFront = card.querySelector(".card-image");
  const imgBack = card.querySelector(".back-preview");
  const swatch = card.querySelector(".resumen-swatch");
  const colorNombre = card.querySelector(".resumen-color-nombre");
  const tallaResumen = card.querySelector(".resumen-talla");

  function aplicarColor(index) {
    colorOpts.forEach((o, i) => o.classList.toggle("selected", i === index));
    const color = producto.colores[index];
    const nueva = color.img || IMG_VACIA;
    imgFront.style.opacity = "0.2";
    setTimeout(() => {
      imgFront.src = nueva;
      imgFront.style.opacity = "1";
    }, 200);
    imgBack.src = nueva;
    swatch.style.backgroundColor = hexSeguro(color.hex);
    colorNombre.textContent = color.nombre;
  }

  function aplicarTalla(index) {
    tallaOpts.forEach((o, i) => o.classList.toggle("selected", i === index));
    tallaResumen.textContent = producto.tallas[index];
  }

  colorOpts.forEach((opt, index) => {
    opt.addEventListener("click", () => aplicarColor(index));
  });

  tallaOpts.forEach((opt, index) => {
    opt.addEventListener("click", () => aplicarTalla(index));
  });

  card.addEventListener("click", (event) => {
    if (
      event.target.closest(".color-option") ||
      event.target.closest(".talla-option") ||
      event.target.closest(".btn-whatsapp")
    ) {
      return;
    }
    card.classList.toggle("flipped");
  });

  card.querySelector(".btn-whatsapp").addEventListener("click", () => {
    const colorSeleccionado = colorNombre.textContent;
    const tallaSeleccionada = tallaResumen.textContent;
    const mensaje = `Hola, deseo concretar la adquisición exclusiva:\n\n*Prenda:* ${producto.nombre}\n*Modelo:* ${producto.modelo}\n*Talla:* ${tallaSeleccionada}\n*Gama Color:* ${colorSeleccionado}\n*Inversión:* ${producto.precio}`;
    const url = `https://wa.me/${TELEFONO}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank", "noopener");

    setTimeout(() => {
      aplicarColor(0);
      aplicarTalla(0);
      card.classList.remove("flipped");
    }, 1000);
  });

  return card;
}

function renderProductos(filtro) {
  grid.innerHTML = "";
  const lista =
    filtro === "todos"
      ? productosConFiltro
      : productosConFiltro.filter((p) => p.filtro === filtro);

  if (lista.length === 0) {
    const vacio = document.createElement("div");
    vacio.className = "grid-empty";
    vacio.textContent = "Próximamente nuevas piezas";
    grid.appendChild(vacio);
    return;
  }

  lista.forEach((producto) => grid.appendChild(crearTarjeta(producto)));
}

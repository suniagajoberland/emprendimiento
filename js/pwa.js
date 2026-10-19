/* Registro del Service Worker para optimizar la carga en visitas repetidas. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* si falla el registro, el sitio sigue funcionando normal */
    });
  });
}

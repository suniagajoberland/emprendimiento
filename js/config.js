/**
 * Configuración de Google Sheets para Avellvis.
 *
 * HOJA DEL PROYECTO:
 *   https://docs.google.com/spreadsheets/d/1m4rU-dTII8t-Y5XYIafV-WxHAdBFpAT1rIBOut9in7o/edit
 *
 * Pasos para conectarla:
 * 1. Abre la hoja > Extensiones > Apps Script > pega google-apps-script/Code.gs
 * 2. Ejecuta la función setupSheet (crea la pestaña "Productos" con las columnas).
 * 3. Implementar > Nueva implementación > Aplicación web > Acceso: Cualquier usuario.
 * 4. Pega aquí la URL de la app web (termina en /exec).
 *
 * Mientras esté vacía, la app usa localStorage.
 */
const AVELLVIS_SHEET_URL =
  "https://script.google.com/macros/s/AKfycbxEk5lT56WUXF6EX1x5ZU3hh_3JeeMZ4em_8mo3GZjxvST-dHJhXwPxFaLUil7L_QeCpw/exec";

/** Límite de caracteres por celda de Google Sheets (~50.000). */
const AVELLVIS_IMG_MAX_CHARS = 42000;

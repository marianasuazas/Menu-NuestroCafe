// Enlaces de Google Sheets publicados como CSV
const BASE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQxUlWZGlna_454draUpia2Wur-3uZg_7kkeoKH6Nqsb7vG2wFEsJhs7MRzFF2itIyqIcLeOUdZ5khG/pub";
const GID = { info: "2109041954", categorias: "893191367", platos: "988201768" };
const urlHoja = g => `${BASE}?gid=${g}&single=true&output=csv`;

let INFO = {}, CATS = [], PLATOS = [];

// Lector de CSV que respeta comillas y comas dentro de los textos
function parseCSV(texto){
  const filas = []; let fila = [], campo = "", comillas = false;
  for (let i = 0; i < texto.length; i++){
    const c = texto[i];
    if (comillas){
      if (c === '"' && texto[i+1] === '"'){ campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") { fila.push(campo); campo = ""; }
    else if (c === "\n") { fila.push(campo); filas.push(fila); fila = []; campo = ""; }
    else if (c !== "\r") campo += c;
  }
  if (campo !== "" || fila.length){ fila.push(campo); filas.push(fila); }
  const [cab, ...resto] = filas;
  return resto.filter(f => f.some(v => v.trim() !== ""))
              .map(f => Object.fromEntries(cab.map((k, i) => [k.trim(), (f[i] || "").trim()])));
}

const leer = g => fetch(urlHoja(g)).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }).then(parseCSV);
const precio = v => "$" + Number(v || 0).toLocaleString("es-CO");
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function pintarInicio(){
  document.querySelectorAll("[data-info]").forEach(el => el.textContent = INFO[el.dataset.info] || "");
  document.querySelector("[data-footer]").textContent = `${INFO.nombre || ""} · ${INFO.subtitulo || ""}`;
  document.getElementById("lnkMapa").href = INFO.como_llegar || "#";
  document.getElementById("lnkWpp").href = INFO.whatsapp ? `https://wa.me/${INFO.whatsapp.replace(/\D/g,"")}` : "#";
  document.getElementById("lnkIg").href = INFO.instagram || "#";
  document.getElementById("lnkFb").href = INFO.facebook || "#";


  document.getElementById("grid").innerHTML = CATS.map(c => `
    <a class="cat" href="#/c/${esc(c.id)}">
      ${c.imagen ? `<img src="${esc(c.imagen)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
      <span>${esc(c.nombre)}</span>
    </a>`).join("");
}

function pintarCategoria(id){
  const c = CATS.find(x => x.id === id);
  if (!c){ location.hash = "#carta"; return; }
  document.getElementById("catNombre").textContent = c.nombre;
  document.getElementById("catSub").textContent = c.subtitulo || "";
  const foto = document.getElementById("catFoto");
  foto.classList.remove("oculto");
  foto.onerror = () => foto.classList.add("oculto");
  foto.src = c.imagen || "";
  const items = PLATOS.filter(p => p.categoria === id && (p.disponible || "SI").toUpperCase() !== "NO")
                      .sort((a, b) => Number(a.orden) - Number(b.orden));
  const fila = p => {
    const letra = esc(p.nombre.charAt(0));
    const img = p.imagen
      ? `<img class="mini" src="${esc(p.imagen)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;letra&quot;>${letra}</div>'">`
      : `<div class="letra">${letra}</div>`;
    return `<li class="item">${img}
      <div><h3>${esc(p.nombre)}</h3>${p.descripcion ? `<p>${esc(p.descripcion)}</p>` : ""}</div>
      <span class="precio">${precio(p.precio)}</span></li>`;
  };
  // Agrupa por subcategoría en el orden en que aparecen
  const grupos = [];
  items.forEach(p => {
    const s = (p.subcategoria || "").trim();
    let g = grupos.find(x => x.s === s);
    if (!g){ g = { s, items: [] }; grupos.push(g); }
    g.items.push(p);
  });
  document.getElementById("lista").innerHTML = grupos.map(g =>
    (g.s ? `<li class="subcat">${esc(g.s)}</li>` : "") + g.items.map(fila).join("")
  ).join("") || `<li class="item" style="grid-template-columns:1fr">No hay productos disponibles en esta sección por ahora.</li>`;
}

function ruta(){
  const h = location.hash;
  const enCategoria = h.startsWith("#/c/");
  document.getElementById("inicio").classList.toggle("oculto", enCategoria);
  document.getElementById("vistaCategoria").classList.toggle("oculto", !enCategoria);
  if (enCategoria){ pintarCategoria(decodeURIComponent(h.slice(4))); window.scrollTo(0, 0); }
  else if (h){ const el = document.querySelector(h); if (el) el.scrollIntoView(); }
}

Promise.all([leer(GID.info), leer(GID.categorias), leer(GID.platos)])
  .then(([info, cats, platos]) => {
    INFO = Object.fromEntries(info.map(r => [r.clave, r.valor]));
    CATS = cats.sort((a, b) => Number(a.orden) - Number(b.orden));
    PLATOS = platos;
    document.title = `${INFO.nombre || "Menú"} · ${INFO.subtitulo || ""}`;
    pintarInicio();
    document.getElementById("estado").classList.add("oculto");
    ruta();
  })
  .catch(() => {
    document.getElementById("estado").textContent = "No se pudo cargar la carta. Revisa tu conexión y recarga la página.";
  });

window.addEventListener("hashchange", ruta);

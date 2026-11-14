// Comportamiento de la plantilla. Sin dependencias. Sin almacenamiento: no usa cookies ni localStorage.
const cfg = JSON.parse(document.getElementById('sitio-config').textContent);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- aviso (acciones de demostración) ---- */
const toast = $('[data-toast]');
let tt;
function avisar(texto) {
  toast.textContent = texto;
  toast.classList.add('is-on');
  clearTimeout(tt);
  tt = setTimeout(() => toast.classList.remove('is-on'), 4500);
}
const MSG = {
  whatsapp: 'Demostración: aquí se abrirá el WhatsApp del negocio con un mensaje listo.',
  instagram: 'Demostración: aquí se abrirá el Instagram del negocio.',
  correo: 'Demostración: aquí irá el correo del negocio.',
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-demo]');
  if (b) avisar(MSG[b.dataset.demo] || 'Función de demostración.');
});

/* ---- navegación: borde al bajar, menú móvil, sección actual ---- */
const nav = $('.nav'), toggle = $('.nav__toggle'), sheet = $('#menu');
const alto = () => document.documentElement.style.setProperty('--nav-top', nav.getBoundingClientRect().bottom + 'px');
function menu(abrir) {
  alto();
  document.documentElement.classList.toggle('nav-open', abrir);
  toggle.setAttribute('aria-expanded', String(abrir));
  toggle.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
}
toggle.addEventListener('click', () => menu(toggle.getAttribute('aria-expanded') !== 'true'));
sheet.addEventListener('click', e => { if (e.target.closest('a')) menu(false); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { menu(false); toggle.focus(); }
});
matchMedia('(min-width: 900px)').addEventListener('change', () => menu(false));

const links = new Map($$('.nav__links .nav__link').map(a => [a.hash.slice(1), a]));
const spy = new IntersectionObserver(es => {
  for (const en of es) if (en.isIntersecting) {
    links.forEach(a => a.removeAttribute('aria-current'));
    links.get(en.target.id)?.setAttribute('aria-current', 'location');
  }
}, { rootMargin: '-45% 0px -50% 0px' });
links.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

/* ---- carta: pestañas accesibles (flechas, Inicio, Fin) ---- */
const tabs = $$('[role="tab"]');
function elegir(tab, foco) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  }
  if (foco) tab.focus();
  tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => elegir(t));
  t.addEventListener('keydown', e => {
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (k) { e.preventDefault(); elegir(tabs[(i + k + tabs.length) % tabs.length], true); }
    if (e.key === 'Home') { e.preventDefault(); elegir(tabs[0], true); }
    if (e.key === 'End') { e.preventDefault(); elegir(tabs.at(-1), true); }
  });
});
if (tabs.length) { const y = scrollY; elegir(tabs[0]); scrollTo(0, y); }

/* ---- horario: marca el día de hoy en la zona horaria del negocio ---- */
const DIAS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
function hoy() {
  const d = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: cfg.tz }).format(new Date()).toLowerCase();
  return DIAS.indexOf(d);
}
function incluye(codigo, dia) {
  return codigo.split(',').some(p => {
    const [a, b] = p.trim().split('-').map(x => DIAS.indexOf(x));
    if (b === undefined || b < 0) return a === dia;
    return a <= b ? dia >= a && dia <= b : dia >= a || dia <= b;
  });
}
try {
  const d = hoy();
  for (const dt of $$('.hours dt')) if (incluye(dt.dataset.days || '', d)) { dt.classList.add('is-today'); dt.nextElementSibling.classList.add('is-today'); }
  const h = cfg.horario.find(x => incluye(x.codigo, d)), out = $('[data-hoy]');
  if (h && out) out.textContent = h.horas;
} catch { /* zona horaria no válida: se deja el horario sin marcar */ }

/* ---- formulario: valida y envía según el modo ---- */
const form = $('form.form');
if (form) {
  const estado = $('[data-form-status]', form);
  const campos = $$('input', form);
  const revisar = el => {
    const ok = el.checkValidity();
    el.setAttribute('aria-invalid', String(!ok));
    document.getElementById(el.getAttribute('aria-describedby')).hidden = ok;
    return ok;
  };
  campos.forEach(el => el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') revisar(el); }));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const malos = campos.filter(el => !revisar(el));
    if (malos.length) { estado.textContent = `Revisa ${malos.length} campo(s) marcados.`; malos[0].focus(); return; }
    const d = Object.fromEntries(new FormData(form));
    if (cfg.endpoint) {                                   // fase posterior: servicio de reservas o formularios
      estado.textContent = 'Enviando…';
      try {
        const r = await fetch(cfg.endpoint, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(d) });
        if (!r.ok) throw new Error(r.status);
        estado.textContent = 'Solicitud enviada. La reserva queda confirmada cuando el local te responda.';
        form.reset();
      } catch { estado.textContent = 'No se pudo enviar. Inténtalo otra vez o escríbenos por WhatsApp.'; }
    } else if (cfg.whatsapp) {
      const txt = `${cfg.mensaje}\nNombre: ${d.name}\nDía: ${d.date}\nPersonas: ${d.guests}`;
      window.open(`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
      estado.textContent = 'Se abrió WhatsApp con tu solicitud. La reserva queda confirmada cuando el local te responda.';
    } else {
      estado.textContent = 'Demostración: la solicitud no se envió ni se guardó.';
      avisar('Demostración: no se envió ningún dato.');
    }
  });
}

/* ---- barra de acciones móvil: aparece tras la portada y se retira sobre el formulario ---- */
const bar = $('.actionbar'), hero = $('.hero'), reservas = $('#reservas');
function barra() {
  if (!bar) return;
  const r = reservas.getBoundingClientRect();
  const enForm = r.top < innerHeight * .75 && r.bottom > 0;
  bar.classList.toggle('is-on', scrollY > hero.offsetHeight * .7 && !enForm);
}

/* ---- historia: las palabras se encienden al pasar por el centro de la pantalla ---- */
const st = $('.story__text');
let palabras = [];
if (st && !sinMovimiento) {
  const walk = n => {
    for (const c of [...n.childNodes]) {
      if (c.nodeType === 3) {
        const f = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(t => { if (!t.trim()) f.append(t); else { const s = document.createElement('span'); s.className = 'w'; s.textContent = t; f.append(s); } });
        c.replaceWith(f);
      } else walk(c);
    }
  };
  walk(st); palabras = $$('.w', st); st.classList.add('is-split');
}
function historia() {
  if (!palabras.length) return;
  const r = st.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, (innerHeight * .82 - r.top) / (r.height + innerHeight * .32)));
  const n = Math.round(p * palabras.length);
  palabras.forEach((w, i) => w.classList.toggle('on', i < n));
}

let tick = false;
function alScroll() {
  if (tick) return; tick = true;
  requestAnimationFrame(() => { tick = false; nav.classList.toggle('is-stuck', scrollY > 8); barra(); historia(); revelar(); });
}
/* ---- entradas al hacer scroll (una sola vez): lo que entra en pantalla, o ya quedó arriba, se muestra ---- */
const pendientes = new Set($$('.rv'));
function revelar() {
  for (const el of pendientes) if (sinMovimiento || el.getBoundingClientRect().top < innerHeight * .94) { el.classList.add('in'); pendientes.delete(el); }
}
addEventListener('scroll', alScroll, { passive: true });
addEventListener('resize', alScroll, { passive: true });
addEventListener('load', alScroll);
alScroll();

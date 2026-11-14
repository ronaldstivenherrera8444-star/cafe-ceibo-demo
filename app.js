// Comportamiento propio de la plantilla (system.js del kit ya maneja menú, validación y barra móvil).
// - Acciones demo: muestran un aviso y no abren nada real.
// - Formulario: no guarda datos. Demo -> aviso. Con WhatsApp -> abre un mensaje con los datos.
//   Con endpoint -> lo envía system.js (no se intercepta).
// - Navegación: marca la sección en pantalla.
const cfg = JSON.parse(document.getElementById('sitio-config').textContent);
const toast = document.querySelector('[data-demo-toast]');
let tt;
function avisar(texto) {
  toast.textContent = texto;
  toast.classList.add('is-on');
  clearTimeout(tt);
  tt = setTimeout(() => toast.classList.remove('is-on'), 4500);
}
const MSG = {
  whatsapp: 'Demostración: aquí se abrirá el WhatsApp del negocio con un mensaje listo para reservar.',
  instagram: 'Demostración: aquí se abrirá el Instagram del negocio.',
  correo: 'Demostración: aquí irá el correo del negocio.',
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-demo]');
  if (b) avisar(MSG[b.dataset.demo] || 'Función de demostración.');
});

const form = document.querySelector('form.form');
if (form && !form.dataset.endpoint) {
  form.addEventListener('submit', e => {
    if (!form.checkValidity()) return;            // system.js ya mostró los errores
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    if (cfg.whatsapp) {
      const txt = `${cfg.mensaje}\nNombre: ${d.name}\nDía: ${d.date}\nPersonas: ${d.guests}`;
      window.open(`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
      form.querySelector('[data-form-status]').textContent = 'Se abrió WhatsApp con tu pedido. La reserva queda confirmada cuando el local te responda.';
    } else {
      form.querySelector('[data-form-status]').textContent = 'Demostración: el pedido no se envió ni se guardó. En la web real llegará al WhatsApp del negocio.';
      avisar('Demostración: no se envió ningún dato.');
    }
  });
}

const links = new Map([...document.querySelectorAll('.nav__links .nav__link')].map(a => [a.hash.slice(1), a]));
const io = new IntersectionObserver(entries => {
  for (const en of entries) if (en.isIntersecting) {
    links.forEach(a => a.removeAttribute('aria-current'));
    links.get(en.target.id)?.setAttribute('aria-current', 'location');
  }
}, { rootMargin: '-45% 0px -50% 0px' });
links.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });

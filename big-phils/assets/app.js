(() => {
  'use strict';
  const config = window.BIG_PHILS || {};
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  function closeMenu() { nav?.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false'); }
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open);
  });
  nav?.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });

  const contactDialog = document.querySelector('#contact-dialog');
  const confirmedPhone = typeof config.phone === 'string' && /^\+?[\d\s()-]{8,22}$/.test(config.phone) ? config.phone : null;
  document.querySelectorAll('[data-call]').forEach(link => {
    if (confirmedPhone) {
      link.href = `tel:${confirmedPhone.replace(/[^+\d]/g, '')}`;
      link.querySelector('small')?.remove();
    } else if (contactDialog) {
      link.setAttribute('aria-haspopup', 'dialog');
      link.addEventListener('click', e => { e.preventDefault(); contactDialog.showModal(); });
    }
  });
  if (confirmedPhone) {
    document.querySelectorAll('[data-phone-label]').forEach(el => { el.textContent = confirmedPhone; });
    document.querySelectorAll('.quote-phone small').forEach(el => { el.textContent = confirmedPhone; });
  }
  if (config.email) document.querySelectorAll('[data-email-label]').forEach(el => {
    const link = document.createElement('a'); link.href = `mailto:${config.email}`; link.textContent = config.email; el.replaceChildren(link);
  });
  if (config.serviceArea) {
    document.querySelectorAll('[data-service-area]').forEach(el => { el.textContent = `Service area: ${config.serviceArea}`; });
    document.querySelectorAll('[data-area-heading]').forEach(el => { el.textContent = config.serviceArea; });
  }
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } }));
  const gallery = document.querySelector('#gallery-dialog');
  document.querySelectorAll('.gallery-open').forEach(button => button.addEventListener('click', () => {
    const img = gallery.querySelector('img'); img.src = button.dataset.image; img.alt = button.querySelector('img').alt;
    gallery.querySelector('p').textContent = button.dataset.caption; gallery.showModal();
  }));

  const form = document.querySelector('#quote-form');
  if (!form) return;
  const first = document.querySelector('#job-step');
  const second = document.querySelector('#details-step');
  const result = document.querySelector('#quote-result');
  const input = document.querySelector('#photos');
  const previews = document.querySelector('#photo-previews');
  const status = document.querySelector('#photo-status');
  let selected = [];
  let processingPhotos = false;
  const nextButton = document.querySelector('#next-step');

  function showStep(number, focus = true) {
    first.hidden = number !== 1; first.disabled = number !== 1;
    second.hidden = number !== 2; second.disabled = number !== 2;
    document.querySelectorAll('[data-progress]').forEach(el => {
      const current = Number(el.dataset.progress) === number;
      el.classList.toggle('current', current);
      if (current) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    });
    if (focus) { const field = (number === 1 ? first : second).querySelector('input'); field.focus(); }
  }
  function validFields(fieldset) {
    for (const field of fieldset.querySelectorAll('input, textarea')) {
      if (field.type === 'file') continue;
      if (field.required && field.type !== 'radio') field.value = field.value.trim();
      if (!field.checkValidity()) { field.reportValidity(); return false; }
    }
    return true;
  }
  nextButton.addEventListener('click', () => { if (validFields(first) && !processingPhotos) showStep(2); });
  document.querySelector('#previous-step').addEventListener('click', () => showStep(1));
  const email = form.elements.email;
  const phone = form.elements.phone;
  function syncEmail() {
    email.required = form.elements.contact.value === 'Email';
    document.querySelector('.email-required').textContent = email.required ? 'Required' : 'Optional unless replying by email';
  }
  form.querySelectorAll('[name="contact"]').forEach(el => el.addEventListener('change', syncEmail));
  phone.addEventListener('input', () => phone.setCustomValidity(''));

  function renderPhotos() {
    previews.replaceChildren();
    selected.forEach((item, index) => {
      const li = document.createElement('li');
      const img = document.createElement('img'); img.src = item.url; img.alt = `Selected photo: ${item.file.name}`;
      const name = document.createElement('span'); name.textContent = item.file.name;
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${item.file.name}`);
      remove.addEventListener('click', () => {
        URL.revokeObjectURL(item.url); selected.splice(index, 1); renderPhotos();
        status.textContent = `${selected.length} of 5 photos selected.`;
        const replacement = previews.querySelectorAll('button')[Math.min(index, selected.length - 1)]; (replacement || input).focus();
      });
      li.append(img, remove, name); previews.append(li);
    });
  }
  async function genuineImage(file) {
    const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const jpeg = b[0] === 255 && b[1] === 216 && b[2] === 255;
    const png = [137,80,78,71,13,10,26,10].every((v,i) => b[i] === v);
    const webp = String.fromCharCode(...b.slice(0,4)) === 'RIFF' && String.fromCharCode(...b.slice(8,12)) === 'WEBP';
    if (!(jpeg || png || webp)) return null;
    const url = URL.createObjectURL(file);
    const loaded = await new Promise(resolve => {
      const image = new Image(); image.onload = () => resolve(true); image.onerror = () => resolve(false); image.src = url;
    });
    if (!loaded) { URL.revokeObjectURL(url); return null; }
    return url;
  }
  input.addEventListener('change', async () => {
    const files = Array.from(input.files);
    const errors = [];
    processingPhotos = true; input.disabled = true; nextButton.disabled = true; status.textContent = 'Checking selected photos…';
    try {
      for (const file of files) {
        if (selected.length >= 5) { errors.push('You can add up to 5 photos. Remove a photo to add another.'); break; }
        if (file.size > 10 * 1024 * 1024) { errors.push(`${file.name} is over 10 MB.`); continue; }
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { errors.push(`${file.name}: use JPG, PNG or WebP. Export HEIC photos as JPG first.`); continue; }
        if (selected.some(item => item.file.name === file.name && item.file.size === file.size)) { errors.push(`${file.name} is already selected.`); continue; }
        const url = await genuineImage(file);
        if (!url) { errors.push(`${file.name} could not be read as a supported image.`); continue; }
        selected.push({ file, url });
      }
    } catch { errors.push('A photo could not be read. Try selecting it again.'); }
    finally {
      renderPhotos(); input.value = ''; processingPhotos = false; input.disabled = false; nextButton.disabled = false;
      status.textContent = [...new Set(errors), `${selected.length} of 5 photos selected.`].join(' ');
    }
  });
  function clearPhotos() { selected.forEach(item => URL.revokeObjectURL(item.url)); selected = []; renderPhotos(); status.textContent = ''; input.value = ''; }
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!first.hidden) { if (validFields(first)) showStep(2); return; }
    syncEmail();
    const digitCount = phone.value.replace(/\D/g, '').length;
    phone.setCustomValidity(digitCount < 8 || digitCount > 15 || !/^[+\d\s().-]+$/.test(phone.value) ? 'Enter a contact phone number with 8–15 digits.' : '');
    if (!validFields(second)) return;
    // First step is disabled/hidden now; explicitly collect values. Never send them.
    const entries = [
      ['Service', form.elements.service.value], ['Location', form.elements.suburb.value],
      ['Job details', form.elements.description.value], ['Name', form.elements.name.value],
      ['Phone', phone.value], ['Email', email.value || 'Not supplied'],
      ['Preferred contact', form.elements.contact.value],
      ['Photos selected locally', selected.length ? selected.map(item => item.file.name).join(', ') : 'None']
    ];
    const summary = document.querySelector('#enquiry-summary'); summary.replaceChildren();
    entries.forEach(([label, value]) => { const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = value; summary.append(dt, dd); });
    form.hidden = true; result.hidden = false; result.focus();
  });
  document.querySelector('#start-again').addEventListener('click', () => {
    clearPhotos(); form.reset(); phone.setCustomValidity(''); syncEmail(); result.hidden = true; form.hidden = false; showStep(1);
  });
  const serviceBySlug = { 'tree-removal': 'Tree removal', 'tree-pruning': 'Tree pruning', 'stump-grinding': 'Stump grinding' };
  const service = serviceBySlug[new URLSearchParams(location.search).get('service')];
  if (service) { const option = [...form.querySelectorAll('[name="service"]')].find(el => el.value === service); if (option) option.checked = true; }
  window.addEventListener('pagehide', () => {
    clearPhotos(); form.reset(); phone.setCustomValidity(''); syncEmail();
    document.querySelector('#enquiry-summary').replaceChildren();
    result.hidden = true; form.hidden = false; showStep(1, false);
  });
  showStep(1, false);
})();

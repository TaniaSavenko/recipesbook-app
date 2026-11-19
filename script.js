/* =========================================================
   TASTE DEPT. — single-page app
   ---------------------------------------------------------
   1. recipesStore  – the ONLY place that touches storage
   2. Helpers       – escaping, formatting, image resizing
   3. Views         – one function per page, returns HTML
   4. Router        – hash-based (#/recipes, #/recipe/ID …)
   ========================================================= */

'use strict';

const CATEGORIES = ['Breakfast', 'Main', 'Soup', 'Salad', 'Dessert', 'Drinks'];

/* =========================================================
   1. DATA LAYER — recipesStore
   ---------------------------------------------------------
   Every method is async (returns a Promise) on purpose:
   a real database like Supabase is async, so swapping the
   implementation later will not require changing any page.

   Recipe shape:
   {
     id, title, category, photo (data URL or https URL),
     kcal, servings, time (minutes),
     ingredients: string[], steps: string[],
     createdAt, updatedAt  (ms timestamps)
   }
   ========================================================= */

const recipesStore = (() => {
  const KEY = 'tasteDept.recipes.v1';
  const BACKUP_KEY = KEY + '.damaged-backup';

  // When the browser blocks storage, recipes live here instead, so the
  // public pages still work (showing the sample recipes). Saving is refused.
  let memory = null;

  // Returns the saved list, or null when nothing has been saved yet.
  function read() {
    if (memory) return memory;

    let raw;
    try {
      raw = localStorage.getItem(KEY);
    } catch {
      memory = sampleRecipes(); // storage is blocked
      return memory;
    }
    if (raw === null) return null; // first visit

    try {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    } catch {}

    // Saved data is damaged. Keep a copy so it can be recovered, and only
    // then start fresh. If the copy can't be made, never overwrite it.
    try {
      localStorage.setItem(BACKUP_KEY, raw);
      return null;
    } catch {
      memory = sampleRecipes();
      return memory;
    }
  }

  const isQuotaError = err =>
    err?.name === 'QuotaExceededError' || err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err?.code === 22;

  function write(list) {
    if (memory) {
      throw new Error("Recipes can't be saved: this browser is blocking site storage, or the saved data is damaged.");
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (err) {
      if (isQuotaError(err)) {
        throw new Error('Storage is full. Try a smaller photo or delete an old recipe.');
      }
      throw err;
    }
  }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Seed sample recipes only the very first time (key missing).
  // If the chef later deletes everything, we keep it empty.
  function ensureSeeded() {
    const list = read();
    if (list === null) {
      const samples = sampleRecipes();
      try {
        localStorage.setItem(KEY, JSON.stringify(samples));
      } catch {
        memory = samples; // storage can't be written: show samples anyway
      }
      return;
    }
    if (!memory) refreshSamplePhotos(list);
  }

  // Sample recipes keep their generated illustration in storage. When the
  // illustration changes (e.g. a new palette), swap in the new version —
  // but only if the chef has not uploaded a real photo for that recipe.
  const SAMPLE_PHOTO_VERSION = '2';
  const VERSION_KEY = KEY + '.samplePhotos';
  function refreshSamplePhotos(list) {
    try {
      if (localStorage.getItem(VERSION_KEY) === SAMPLE_PHOTO_VERSION) return;
      const fresh = Object.fromEntries(sampleRecipes().map(r => [r.id, r.photo]));
      let changed = false;
      list.forEach(r => {
        if (fresh[r.id] && String(r.photo).startsWith('data:image/svg+xml')) {
          r.photo = fresh[r.id];
          changed = true;
        }
      });
      if (changed) write(list);
      localStorage.setItem(VERSION_KEY, SAMPLE_PHOTO_VERSION);
    } catch {
      // Not important enough to break the page; it will retry next load.
    }
  }

  const byNewest = (a, b) => b.createdAt - a.createdAt;

  return {
    async getAll() {
      ensureSeeded();
      return [...read()].sort(byNewest);
    },

    async getById(id) {
      ensureSeeded();
      return read().find(r => r.id === id) || null;
    },

    async add(data) {
      ensureSeeded();
      const now = Date.now();
      const recipe = { ...data, id: makeId(), createdAt: now, updatedAt: now };
      write([...read(), recipe]);
      return recipe;
    },

    async update(id, data) {
      ensureSeeded();
      const list = read();
      const i = list.findIndex(r => r.id === id);
      if (i === -1) throw new Error('Recipe not found.');
      list[i] = { ...list[i], ...data, id, updatedAt: Date.now() };
      write(list);
      return list[i];
    },

    async remove(id) {
      ensureSeeded();
      write(read().filter(r => r.id !== id));
    },
  };
})();

/* ---------- Sample data (first load only) ---------- */

function sampleRecipes() {
  const day = 86400000;
  const now = Date.now();
  return [
    {
      id: 'sample-shakshuka',
      title: 'Smoky Shakshuka',
      category: 'Breakfast',
      photo: illustration({ bg: '#1A3699', dish: '#1b1f33', sauce: '#FF7A30', dots: [['#FFE7A3', 4, 16], ['#6E9B4A', 14, 4]] }),
      kcal: 380, servings: 2, time: 30,
      ingredients: [
        '2 tbsp olive oil', '1 onion, finely sliced', '1 red pepper, sliced', '3 garlic cloves, crushed',
        '1 tsp smoked paprika', '1 tsp ground cumin', '400 g chopped tomatoes', '4 eggs',
        '50 g feta', 'Fresh coriander, salt, pepper',
      ],
      steps: [
        'Heat the oil in a wide pan. Cook onion and pepper over medium heat for 8 minutes until soft and sweet.',
        'Add garlic, paprika and cumin; cook for 1 minute until fragrant.',
        'Pour in the tomatoes, season and simmer for 10 minutes until thick.',
        'Make 4 wells in the sauce, crack in the eggs, cover and cook 5–7 minutes until the whites are set.',
        'Crumble over feta and coriander. Serve straight from the pan with good bread.',
      ],
      createdAt: now - 2 * day, updatedAt: now - 2 * day,
    },
    {
      id: 'sample-tomato-soup',
      title: 'Charred Tomato Soup',
      category: 'Soup',
      photo: illustration({ bg: '#F3EEE3', dish: '#ffffff', sauce: '#FF7A30', dots: [['#F3EEE3', 3, 22], ['#4F7A35', 18, 3]] }),
      kcal: 240, servings: 4, time: 45,
      ingredients: [
        '1 kg ripe tomatoes, halved', '1 red onion, quartered', '1 head of garlic', '3 tbsp olive oil',
        '600 ml vegetable stock', '1 tsp sugar', 'Handful of basil', '4 tbsp crème fraîche', 'Salt & black pepper',
      ],
      steps: [
        'Heat the oven to 220°C. Toss tomatoes, onion and the halved garlic head with oil, salt and pepper.',
        'Roast for 30 minutes until blistered and charred at the edges.',
        'Squeeze the garlic out of its skins into a pot. Add the roasted vegetables, stock and sugar.',
        'Simmer for 5 minutes, add basil, then blend until completely smooth.',
        'Serve with a swirl of crème fraîche and a drizzle of olive oil.',
      ],
      createdAt: now - day, updatedAt: now - day,
    },
    {
      id: 'sample-basque-cheesecake',
      title: 'Burnt Basque Cheesecake',
      category: 'Dessert',
      photo: illustration({ bg: '#2447C9', dish: '#F3EEE3', sauce: '#3a1a0e', inner: '#F3D9A4', dots: [['#FF7A30', 6, 6]] }),
      kcal: 520, servings: 10, time: 75,
      ingredients: [
        '900 g full-fat cream cheese, at room temperature', '300 g caster sugar', '5 large eggs',
        '480 ml double cream', '1 tsp vanilla', '½ tsp sea salt', '30 g plain flour',
      ],
      steps: [
        'Heat the oven to 220°C. Line a 23 cm tin with two crumpled sheets of baking paper, letting it stand tall above the rim.',
        'Beat the cream cheese and sugar until smooth. Add the eggs one at a time.',
        'Mix in cream, vanilla and salt, then sift in the flour and fold until just combined.',
        'Pour into the tin and bake 55–60 minutes — the top should be deeply caramelised and the centre very wobbly.',
        'Cool completely, then chill for at least 4 hours before slicing.',
      ],
      createdAt: now, updatedAt: now,
    },
  ];
}

/* Generates a simple top-down "plate" illustration as an SVG data URL,
   so sample recipes have a photo without any external image files. */
function illustration({ bg, dish, sauce, inner, dots = [] }) {
  let seed = bg.length * 7 + sauce.charCodeAt(1);
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const garnish = dots.map(([color, count, r]) =>
    Array.from({ length: count }, () => {
      const a = rand() * Math.PI * 2, d = rand() * 190;
      return `<circle cx="${600 + Math.cos(a) * d}" cy="${450 + Math.sin(a) * d}" r="${r * (0.6 + rand() * 0.6)}" fill="${color}"/>`;
    }).join('')
  ).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
    <rect width="1200" height="900" fill="${bg}"/>
    <circle cx="640" cy="480" r="330" fill="rgba(0,0,0,.12)"/>
    <circle cx="600" cy="450" r="330" fill="${dish}"/>
    <circle cx="600" cy="450" r="255" fill="${sauce}"/>
    ${inner ? `<circle cx="600" cy="450" r="215" fill="${inner}"/>` : ''}
    ${garnish}
    <rect x="980" y="120" width="34" height="660" rx="17" fill="rgba(0,0,0,.18)"/>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* =========================================================
   2. HELPERS
   ========================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatTime(min) {
  const m = Number(min);
  if (!m) return '—';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

const formatKcal = k => (k || k === 0 ? `${k} kcal` : '—');

const linesToList = text => text.split('\n').map(s => s.trim()).filter(Boolean);

let toastTimer;
function toast(message) {
  let el = $('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

/* Resize an uploaded image to max 1200px wide and compress to JPEG. */
function resizeImage(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file (JPG, PNG, WebP…).'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; // JPEG has no transparency
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be read. Try another file.'));
    };
    img.src = url;
  });
}

/* =========================================================
   3. VIEWS
   Each view returns { title, html, mount? }.
   mount() runs after the HTML is inserted (for event listeners).
   ========================================================= */

function recipeCard(r) {
  return `
    <a class="card" href="#/recipe/${encodeURIComponent(r.id)}">
      <div class="card-img"><img src="${esc(r.photo)}" alt="" loading="lazy"></div>
      <div class="card-body">
        <span class="label">${esc(r.category)}</span>
        <h3>${esc(r.title)}</h3>
        <div class="card-meta">
          <span>${esc(formatKcal(r.kcal))} / serving</span>
          <span>${esc(formatTime(r.time))}</span>
        </div>
      </div>
    </a>`;
}

function grid(recipes, emptyText = 'No recipes yet.') {
  if (!recipes.length) return `<div class="empty">${esc(emptyText)}</div>`;
  return `<div class="grid">${recipes.map(recipeCard).join('')}</div>`;
}

/* ---------- Home ---------- */

async function viewHome() {
  const all = await recipesStore.getAll();
  const latest = all.slice(0, 6);
  const counts = Object.fromEntries(CATEGORIES.map(c => [c, all.filter(r => r.category === c).length]));

  return {
    title: 'Taste Dept. | Chef Recipes',
    html: `
      <section class="page container">
        <div class="hero">
          <h1 class="hero-title">Taste Dept.&nbsp;<span class="hero-sep" aria-hidden="true">|</span> Chef Recipes</h1>
          <div class="hero-bottom">
            <p class="hero-sub">Orders straight from a chef's kitchen. Pro techniques, home-cook friendly. Ticket's in — <span class="nowrap">fire!&nbsp;<button type="button" class="hero-arrow" id="to-latest" aria-label="Scroll to latest recipes">↓</button></span></p>
            <a class="btn" href="#/recipes">Browse recipes →</a>
          </div>
        </div>

        <section class="section" id="latest">
          <div class="section-head">
            <h2>Latest recipes</h2>
            <a href="#/recipes">View all</a>
          </div>
          ${grid(latest)}
        </section>

        <section class="section">
          <div class="section-head"><h2>Categories</h2></div>
          <div class="cat-grid">
            ${CATEGORIES.map(c => `
              <a class="cat-tile" href="#/recipes/${c.toLowerCase()}">
                <span class="label">${counts[c]} ${counts[c] === 1 ? 'recipe' : 'recipes'}</span>
                <h3>${c}</h3>
              </a>`).join('')}
          </div>
        </section>
      </section>`,
    mount(root) {
      $('#to-latest', root).addEventListener('click', () => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        $('#latest', root).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      });
    },
  };
}

/* ---------- All recipes (optionally filtered by category) ---------- */

async function viewRecipes(catSlug) {
  const all = await recipesStore.getAll();
  const category = CATEGORIES.find(c => c.toLowerCase() === (catSlug || '').toLowerCase()) || null;
  const list = category ? all.filter(r => r.category === category) : all;

  return {
    title: `${category || 'All recipes'} — Taste Dept.`,
    html: `
      <section class="page container">
        <span class="label">Taste Dept. / Recipes</span>
        <h1 style="margin:12px 0 28px">${esc(category || 'All recipes')}</h1>
        <nav class="chips" aria-label="Filter by category" style="margin-bottom:36px">
          <a class="chip ${!category ? 'is-active' : ''}" href="#/recipes">All</a>
          ${CATEGORIES.map(c => `
            <a class="chip ${c === category ? 'is-active' : ''}" href="#/recipes/${c.toLowerCase()}">${c}</a>`).join('')}
        </nav>
        ${grid(list, category ? `No ${category.toLowerCase()} recipes yet.` : 'No recipes yet.')}
      </section>`,
  };
}

/* ---------- Single recipe ---------- */

async function viewRecipe(id) {
  const r = await recipesStore.getById(id);
  if (!r) return viewNotFound('This recipe could not be found.');

  return {
    title: `${r.title} — Taste Dept.`,
    html: `
      <article class="page container">
        <a class="back-link" href="#/recipes">← Back to recipes</a>

        <div class="recipe-head">
          <div class="recipe-photo"><img src="${esc(r.photo)}" alt="${esc(r.title)}"></div>
          <div class="recipe-title">
            <a class="label" href="#/recipes/${esc(String(r.category).toLowerCase())}" style="text-decoration:none">${esc(r.category)}</a>
            <h1>${esc(r.title)}</h1>
            <div class="stats">
              <div class="stat"><div class="stat-value">${esc(r.kcal ?? '—')}</div><span class="label">kcal / serving</span></div>
              <div class="stat"><div class="stat-value">${esc(r.servings || '—')}</div><span class="label">Servings</span></div>
              <div class="stat"><div class="stat-value">${esc(formatTime(r.time))}</div><span class="label">Cooking time</span></div>
            </div>
          </div>
        </div>

        <div class="recipe-body">
          <section class="ingredients">
            <h2>Ingredients</h2>
            ${r.ingredients?.length
              ? `<ul>${r.ingredients.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
              : '<p>No ingredients listed.</p>'}
          </section>
          <section class="method">
            <h2>Method</h2>
            ${r.steps?.length
              ? `<ol>${r.steps.map(s => `<li><span>${esc(s)}</span></li>`).join('')}</ol>`
              : '<p>No steps listed.</p>'}
          </section>
        </div>
      </article>`,
  };
}

/* ---------- About ---------- */

function viewAbout() {
  return {
    title: 'About — Taste Dept.',
    html: `
      <section class="page container">
        <div class="about">
          <div class="about-portrait">
            <img src="${illustration({ bg: '#1A3699', dish: '#F3EEE3', sauce: '#FF7A30', dots: [['#F3EEE3', 9, 10]] })}" alt="" style="width:100%;height:100%;object-fit:cover">
          </div>
          <div class="about-text">
            <span class="label">About the chef</span>
            <h1 style="margin:12px 0 28px">Cooking<br>out loud.</h1>
            <p>Taste Dept. is the recipe notebook of a professional chef — fifteen years in restaurant kitchens, now sharing the dishes that matter most.</p>
            <p>Every recipe here is tested at home, with home equipment and ingredients you can actually find. No fuss, no filler — just clear steps, honest portions and big flavour.</p>
            <div class="about-facts stats">
              <div class="stat"><div class="stat-value">15+</div><span class="label">Years cooking</span></div>
              <div class="stat"><div class="stat-value">6</div><span class="label">Categories</span></div>
              <div class="stat"><div class="stat-value">100%</div><span class="label">Home-tested</span></div>
            </div>
          </div>
        </div>
      </section>`,
  };
}

/* ---------- Admin: list ---------- */

const PROTO_BANNER = '<div class="proto-banner" role="note">Prototype: admin is not protected yet</div>';

async function viewAdmin() {
  const all = await recipesStore.getAll();

  return {
    title: 'Admin — Taste Dept.',
    html: `
      <section class="page container">
        ${PROTO_BANNER}
        <div class="admin-head">
          <div>
            <span class="label">Admin</span>
            <h1 style="margin-top:12px">Recipes <span style="opacity:.5">(${all.length})</span></h1>
          </div>
          <a class="btn" href="#/admin/new">+ Add recipe</a>
        </div>
        ${all.length ? `
          <ul class="admin-list">
            ${all.map(r => `
              <li class="admin-row">
                <img src="${esc(r.photo)}" alt="">
                <div>
                  <h3><a href="#/recipe/${encodeURIComponent(r.id)}">${esc(r.title)}</a></h3>
                  <div class="meta">${esc(r.category)} · ${esc(formatKcal(r.kcal))} · ${esc(formatTime(r.time))}</div>
                </div>
                <div class="admin-actions">
                  <a class="btn btn--dark btn--sm" href="#/admin/edit/${encodeURIComponent(r.id)}">Edit</a>
                  <button class="btn btn--danger btn--sm" type="button" data-delete="${esc(r.id)}" data-title="${esc(r.title)}">Delete</button>
                </div>
              </li>`).join('')}
          </ul>`
        : '<div class="empty">No recipes yet. Add your first one.</div>'}
      </section>`,
    mount(root) {
      $$('[data-delete]', root).forEach(btn => {
        btn.addEventListener('click', async () => {
          const ok = confirm(`Delete "${btn.dataset.title}"?\nThis cannot be undone.`);
          if (!ok) return;
          btn.disabled = true;
          try {
            await recipesStore.remove(btn.dataset.delete);
            toast('Recipe deleted');
            render();
          } catch (err) {
            toast(err.message || 'Could not delete the recipe.');
            btn.disabled = false;
          }
        });
      });
    },
  };
}

/* ---------- Admin: add / edit form ---------- */

async function viewAdminForm(id) {
  const existing = id ? await recipesStore.getById(id) : null;
  if (id && !existing) return viewNotFound('This recipe could not be found.');

  const r = existing || { title: '', category: CATEGORIES[1], photo: '', kcal: '', servings: '', time: '', ingredients: [], steps: [] };
  const isEdit = Boolean(existing);

  return {
    title: `${isEdit ? 'Edit' : 'Add'} recipe — Taste Dept.`,
    html: `
      <section class="page container">
        ${PROTO_BANNER}
        <a class="back-link" href="#/admin">← Back to admin</a>
        <h1 style="margin-bottom:32px">${isEdit ? 'Edit recipe' : 'Add recipe'}</h1>

        <form class="form" id="recipe-form" novalidate>
          <div class="form-summary" id="form-summary" role="alert"></div>

          <div class="field field--full" data-field="title">
            <label for="f-title">Title <span class="req">*</span></label>
            <input id="f-title" name="title" type="text" maxlength="120" value="${esc(r.title)}" placeholder="e.g. Charred Tomato Soup">
            <div class="field-error"></div>
          </div>

          <div class="field" data-field="category">
            <label for="f-category">Category</label>
            <select id="f-category" name="category">
              ${CATEGORIES.map(c => `<option ${c === r.category ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>

          <div class="field" data-field="kcal">
            <label for="f-kcal">Kcal per serving <span class="req">*</span></label>
            <input id="f-kcal" name="kcal" type="number" min="0" max="10000" inputmode="numeric" value="${esc(r.kcal)}" placeholder="e.g. 420">
            <div class="field-error"></div>
          </div>

          <div class="field" data-field="servings">
            <label for="f-servings">Servings</label>
            <input id="f-servings" name="servings" type="number" min="1" max="100" inputmode="numeric" value="${esc(r.servings)}" placeholder="e.g. 4">
            <div class="field-error"></div>
          </div>

          <div class="field" data-field="time">
            <label for="f-time">Cooking time (minutes)</label>
            <input id="f-time" name="time" type="number" min="1" max="10000" inputmode="numeric" value="${esc(r.time)}" placeholder="e.g. 45">
            <div class="field-error"></div>
          </div>

          <div class="field field--full" data-field="photo">
            <span class="field-label">Photo <span class="req">*</span></span>
            <label class="dropzone" id="dropzone">
              <input type="file" id="f-photo" accept="image/*" aria-label="Upload photo">
              <span class="dropzone-text" id="dropzone-text"><strong>Click or drop a photo</strong>Resized to 1200px and saved as JPEG</span>
              <img id="photo-preview" alt="Photo preview" ${r.photo ? `src="${esc(r.photo)}"` : 'hidden'}>
            </label>
            <div class="photo-actions" id="photo-actions" ${r.photo ? '' : 'hidden'}>
              <button type="button" class="btn btn--ghost btn--sm" id="photo-remove">Remove photo</button>
              <span class="hint">Click the image to replace it.</span>
            </div>
            <div class="field-error"></div>
          </div>

          <div class="field" data-field="ingredients">
            <label for="f-ingredients">Ingredients</label>
            <span class="hint">One per line</span>
            <textarea id="f-ingredients" name="ingredients" placeholder="500 g tomatoes&#10;2 garlic cloves&#10;…">${esc(r.ingredients.join('\n'))}</textarea>
          </div>

          <div class="field" data-field="steps">
            <label for="f-steps">Steps</label>
            <span class="hint">One per line</span>
            <textarea id="f-steps" name="steps" placeholder="Heat the oven to 220°C.&#10;Roast the tomatoes…">${esc(r.steps.join('\n'))}</textarea>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn--dark" id="save-btn">${isEdit ? 'Save changes' : 'Publish recipe'}</button>
            <a class="btn btn--ghost" href="#/admin">Cancel</a>
          </div>
        </form>
      </section>`,

    mount(root) {
      const form = $('#recipe-form', root);
      const fileInput = $('#f-photo', root);
      const preview = $('#photo-preview', root);
      const dropzone = $('#dropzone', root);
      const dropText = $('#dropzone-text', root);
      const photoActions = $('#photo-actions', root);
      const summary = $('#form-summary', root);
      const saveBtn = $('#save-btn', root);
      let photo = r.photo || '';

      const setError = (name, message) => {
        const field = $(`[data-field="${name}"]`, form);
        field.classList.toggle('has-error', Boolean(message));
        const err = $('.field-error', field);
        if (err) err.textContent = message || '';
      };

      const showPhoto = src => {
        photo = src;
        preview.hidden = !src;
        dropText.hidden = Boolean(src);
        photoActions.hidden = !src;
        if (src) preview.src = src; else preview.removeAttribute('src');
      };
      showPhoto(photo);

      async function handleFile(file) {
        if (!file) return;
        setError('photo', '');
        dropText.innerHTML = '<strong>Processing…</strong>';
        try {
          showPhoto(await resizeImage(file));
        } catch (err) {
          showPhoto(photo);
          dropText.innerHTML = '<strong>Click or drop a photo</strong>Resized to 1200px and saved as JPEG';
          setError('photo', err.message);
        }
      }

      fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
      ['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add('is-drag'); }));
      ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, () => dropzone.classList.remove('is-drag')));
      dropzone.addEventListener('drop', e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); });
      $('#photo-remove', root).addEventListener('click', () => {
        fileInput.value = '';
        dropText.innerHTML = '<strong>Click or drop a photo</strong>Resized to 1200px and saved as JPEG';
        showPhoto('');
      });

      // Clear a field's error as soon as the user fixes it
      form.addEventListener('input', e => { if (e.target.name) setError(e.target.name, ''); });

      form.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(form);
        const title = String(fd.get('title')).trim();
        const kcalRaw = String(fd.get('kcal')).trim();
        const servingsRaw = String(fd.get('servings')).trim();
        const timeRaw = String(fd.get('time')).trim();

        const errors = {};
        if (!title) errors.title = 'Please enter a title.';
        if (!photo) errors.photo = 'Please upload a photo.';
        if (!kcalRaw) errors.kcal = 'Please enter kcal per serving.';
        else if (!Number.isFinite(+kcalRaw) || +kcalRaw < 0 || +kcalRaw > 10000) errors.kcal = 'Kcal must be a number from 0 to 10,000.';
        if (servingsRaw && (!Number.isInteger(+servingsRaw) || +servingsRaw < 1 || +servingsRaw > 100)) errors.servings = 'Servings must be a whole number from 1 to 100.';
        if (timeRaw && (!Number.isFinite(+timeRaw) || +timeRaw < 1 || +timeRaw > 10000)) errors.time = 'Cooking time must be from 1 to 10,000 minutes.';

        ['title', 'photo', 'kcal', 'servings', 'time'].forEach(k => setError(k, errors[k]));
        const missing = Object.keys(errors);
        if (missing.length) {
          summary.textContent = `Please fix ${missing.length === 1 ? 'the highlighted field' : `${missing.length} highlighted fields`} before saving.`;
          const first = $(`[data-field="${missing[0]}"] input, [data-field="${missing[0]}"] select`, form);
          first?.focus();
          summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        summary.textContent = '';

        const data = {
          title,
          category: String(fd.get('category')),
          photo,
          kcal: Math.round(+kcalRaw),
          servings: servingsRaw ? +servingsRaw : null,
          time: timeRaw ? Math.round(+timeRaw) : null,
          ingredients: linesToList(String(fd.get('ingredients'))),
          steps: linesToList(String(fd.get('steps'))),
        };

        saveBtn.disabled = true;
        try {
          const saved = isEdit ? await recipesStore.update(existing.id, data) : await recipesStore.add(data);
          toast(isEdit ? 'Changes saved' : 'Recipe published');
          location.hash = `#/recipe/${encodeURIComponent(saved.id)}`;
        } catch (err) {
          summary.textContent = err.message || 'Could not save the recipe.';
          saveBtn.disabled = false;
        }
      });
    },
  };
}

/* ---------- 404 ---------- */

function viewNotFound(message = 'This page does not exist.') {
  return {
    title: 'Not found — Taste Dept.',
    html: `
      <section class="page container">
        <span class="label">404</span>
        <h1 style="margin:12px 0 20px">Nothing<br>cooking here.</h1>
        <p class="lead" style="margin-bottom:28px">${esc(message)}</p>
        <a class="btn" href="#/recipes">← Back to recipes</a>
      </section>`,
  };
}

/* =========================================================
   4. ROUTER
   ========================================================= */

const routes = [
  { pattern: /^\/?$/,                     view: () => viewHome(),            nav: null },
  { pattern: /^\/recipes(?:\/([\w-]+))?$/, view: m => viewRecipes(m[1]),      nav: 'recipes' },
  { pattern: /^\/recipe\/([^/]+)$/,        view: m => viewRecipe(decodeURIComponent(m[1])), nav: 'recipes' },
  { pattern: /^\/about$/,                  view: () => viewAbout(),           nav: 'about' },
  { pattern: /^\/admin$/,                  view: () => viewAdmin(),           nav: null },
  { pattern: /^\/admin\/new$/,             view: () => viewAdminForm(null),   nav: null },
  { pattern: /^\/admin\/edit\/([^/]+)$/,   view: m => viewAdminForm(decodeURIComponent(m[1])), nav: null },
];

let renderToken = 0;

async function render() {
  const token = ++renderToken;
  const path = location.hash.replace(/^#/, '') || '/';
  const main = $('#main');

  let match = null, route = null;
  for (const r of routes) {
    match = path.match(r.pattern);
    if (match) { route = r; break; }
  }

  let page;
  try {
    page = route ? await route.view(match) : viewNotFound();
  } catch (err) {
    console.error(err);
    page = viewNotFound('Something went wrong loading this page.');
  }
  if (token !== renderToken) return; // a newer navigation started meanwhile

  main.innerHTML = page.html;
  document.title = page.title;
  page.mount?.(main);

  // Highlight current nav link
  $$('[data-nav]').forEach(a => {
    const active = route && a.dataset.nav === route.nav;
    a.classList.toggle('is-active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });

  closeMenu();
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

/* ---------- Mobile menu ---------- */

const navToggle = $('.nav-toggle');
const mainNav = $('#main-nav');

function closeMenu() {
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open menu');
  mainNav.classList.remove('is-open');
}

navToggle.addEventListener('click', () => {
  const open = navToggle.getAttribute('aria-expanded') !== 'true';
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  mainNav.classList.toggle('is-open', open);
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

/* ---------- Header border on scroll ---------- */

const header = $('.site-header');
window.addEventListener('scroll', () => header.classList.toggle('is-scrolled', window.scrollY > 4), { passive: true });

/* ---------- Boot ---------- */

$('#year').textContent = new Date().getFullYear();
window.addEventListener('hashchange', render);
render();

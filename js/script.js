let catalogProducts = [];
const CATALOG_CACHE_KEY = 'joyeria_catalog_cache_v1';
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes
const CATALOG_PAGE_SIZE = 12;
let currentCatalogPage = 1;
const WHATSAPP_NUMBER = '523921368108';
const STORE_NAME = 'Berry Shop';

function normalizeCategory(value) {
  const text = String(value || '').trim().toLowerCase();
  
  // Categoría principal explícita
  if (text.includes('maqui')) return 'Maquillaje';
  if (text.includes('perf')) return 'Perfumes';
  if (text.includes('joy')) return 'Joyeria';
  
  // Subcategorías de Maquillaje
  if (text.match(/labial|rubor|sombra|base|polvo|rimel|mascara|brocha|delineador|corrector|contorno|cejas|base liquida/i)) {
    return 'Maquillaje';
  }
  
  // Subcategorías de Perfumes
  if (text.match(/perfume|colonia|fragancia|eau de toilette|edt|eau de parfum|edp/i)) {
    return 'Perfumes';
  }
  
  // Subcategorías de Joyería
  if (text.match(/anillo|pulsera|collar|arete|pendiente|cadena|brazalete|ring|necklace|bracelet|earring|joya|joyas/i)) {
    return 'Joyeria';
  }
  
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Sin categoría';
}

function getCategoryFilterKey(value) {
  const text = String(value || '').trim().toLowerCase();
  
  // Categoría principal explícita
  if (text.includes('maqui')) return 'maquillaje';
  if (text.includes('perf')) return 'perfumes';
  if (text.includes('joy')) return 'joyeria';
  
  // Subcategorías de Maquillaje
  if (text.match(/labial|rubor|sombra|base|polvo|rimel|mascara|brocha|delineador|corrector|contorno|cejas|base liquida/i)) {
    return 'maquillaje';
  }
  
  // Subcategorías de Perfumes
  if (text.match(/perfume|colonia|fragancia|eau de toilette|edt|eau de parfum|edp/i)) {
    return 'perfumes';
  }
  
  // Subcategorías de Joyería
  if (text.match(/anillo|pulsera|collar|arete|pendiente|cadena|brazalete|ring|necklace|bracelet|earring|joya|joyas/i)) {
    return 'joyeria';
  }
  
  return text || 'otros';
}

function normalizeSubcategory(rawValue, product) {
  const raw = String(rawValue || '').trim().toLowerCase();
  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const haystack = `${product.name || ''} ${product.desc || ''} ${product.cat || ''} ${normalized}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const keywordMap = [
    { key: 'labial', patterns: ['labial', 'labiales', 'lipstick', 'lip', 'gloss', 'mate velvet', 'matte'] },
    { key: 'rubor', patterns: ['rubor', 'rubores', 'blush', 'colorete'] },
    { key: 'sombra', patterns: ['sombra', 'sombras', 'eyeshadow', 'shadow', 'polvos', 'eye'] },
    { key: 'base', patterns: ['base', 'foundation', 'corrector', 'primer'] },
    { key: 'polvo', patterns: ['polvo', 'powder', 'compacto', 'traslucido', 'translucent'] },
    { key: 'mascara', patterns: ['mascara', 'rimel', 'pestanas', 'eyelash'] },
    { key: 'brocha', patterns: ['brocha', 'brochas', 'brush', 'pincel', 'brush set'] },
    { key: 'esmalte', patterns: ['esmalte', 'unas', 'nails', 'nail polish'] },
    { key: 'delineador', patterns: ['delineador', 'eyeliner', 'liner'] },
    { key: 'cejas', patterns: ['cejas', 'eyebrow', 'brow'] },
    { key: 'iluminador', patterns: ['iluminador', 'highlighter', 'luminoso'] },
    { key: 'contorno', patterns: ['contorno', 'contouring', 'contour'] },
    { key: 'colonia-hombre', patterns: ['colonia hombre', 'colonia masculina', 'hombre', 'mens', 'male'] },
    { key: 'colonia-mujer', patterns: ['colonia mujer', 'colonia femenina', 'mujer', 'womens', 'female'] },
    { key: 'fragancia', patterns: ['fragancia', 'perfume', 'eau de', 'eau de toilette', 'edt', 'eau de parfum', 'edp', 'spray'] },
    { key: 'anillo', patterns: ['anillo', 'ring', 'anillos'] },
    { key: 'pulsera', patterns: ['pulsera', 'brazalete', 'bracelet', 'pulseras'] },
    { key: 'collar', patterns: ['collar', 'necklace', 'cadena', 'collares'] },
    { key: 'arete', patterns: ['arete', 'earring', 'pendiente', 'pendientes', 'aretes'] },
    { key: 'tobillera', patterns: ['tobillera', 'anklet'] },
    { key: 'set', patterns: ['set', 'kit', 'combo', 'pack'] }
  ];

  for (const item of keywordMap) {
    if (item.patterns.some((pattern) => normalized.includes(pattern) || haystack.includes(pattern))) {
      return item.key;
    }
  }

  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'general';
}

function getSubcategoryLabel(subcat) {
  const labels = {
    rubor: 'Rubor',
    labial: 'Labial',
    sombra: 'Sombra',
    base: 'Base',
    polvo: 'Polvo',
    mascara: 'Máscara',
    brocha: 'Brocha',
    esmalte: 'Esmalte',
    delineador: 'Delineador',
    cejas: 'Cejas',
    iluminador: 'Iluminador',
    contorno: 'Contorno',
    'colonia-hombre': 'Colonia Hombre',
    'colonia-mujer': 'Colonia Mujer',
    fragancia: 'Fragancia',
    anillo: 'Anillo',
    pulsera: 'Pulsera',
    collar: 'Collar',
    arete: 'Arete',
    tobillera: 'Tobillera',
    set: 'Set',
    general: 'General'
  };
  return labels[subcat] || (subcat ? subcat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'General');
}

function normalizeCatalogProduct(data) {
  const safeData = data || {};
  const originalCat = typeof safeData.cat === 'string' ? safeData.cat : (safeData.category || '');
  const cat = normalizeCategory(originalCat);
  const subcat = normalizeSubcategory(
    safeData.subcat || safeData.subcategory || safeData.subCategory || safeData.type || safeData.tipo || safeData.productType || safeData.product_type || originalCat || '',
    { name: safeData.name, desc: safeData.desc || safeData.description, cat: originalCat }
  );

  return {
    id: safeData.id || '',
    name: typeof safeData.name === 'string' ? safeData.name : '',
    cat,
    desc: typeof safeData.desc === 'string' ? safeData.desc : (safeData.description || ''),
    price: typeof safeData.price === 'number' ? safeData.price : Number(safeData.price) || 0,
    image: typeof safeData.image === 'string' ? safeData.image : '',
    image2: typeof safeData.image2 === 'string' ? safeData.image2 : '',
    image3: typeof safeData.image3 === 'string' ? safeData.image3 : '',
    subcat,
    subcatLabel: getSubcategoryLabel(subcat)
  };
}

function loadCatalogFromCache() {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ts || !Array.isArray(parsed.products)) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.products.map((product) => normalizeCatalogProduct(product));
  } catch (e) {
    console.warn('Error leyendo cache de catálogo', e);
    return null;
  }
}

function saveCatalogToCache(products) {
  try {
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ ts: Date.now(), products }));
  } catch (e) {
    console.warn('Error guardando cache de catálogo', e);
  }
}

async function loadProductsFromFirestore() {
  if (!window.db || !window.firestoreTools) {
    console.error("Firestore no está inicializado");
    return;
  }

  const { collection, getDocs } = window.firestoreTools;
  catalogProducts = [];

  const collectionPaths = [
    ["Mercancia", "Categoria", "Maquillaje"],
    ["Mercancia", "Categoria", "Perfumes"],
    ["Mercancia", "Categoria", "Joyeria"]
  ];

  try {
    console.log('loadProductsFromFirestore: iniciando carga de colecciones');

    for (const path of collectionPaths) {
      try {
        console.log('Cargando:', path.join('/'));
        const ref = collection(window.db, ...path);
        const snapshot = await getDocs(ref);

        console.log(`Snapshot ${path.join('/')} size:`, snapshot.size);

        snapshot.forEach((doc) => {
          const data = doc.data() || {};
          catalogProducts.push(normalizeCatalogProduct({
            id: doc.id,
            ...data
          }));
        });
      } catch (innerErr) {
        console.error('Error cargando colección', path.join('/'), innerErr);
      }
    }

    console.log('Productos cargados totales:', catalogProducts.length);
    // guardar cache y renderizar
    saveCatalogToCache(catalogProducts);
    // exponer globalmente para listeners en otras páginas
    try { window.catalogProducts = catalogProducts; } catch (e) { /* ignore */ }
    renderAllViews();
    // notificar que el catálogo se cargó (para listeners en páginas)
    try { document.dispatchEvent(new CustomEvent('catalogLoaded')); } catch (e) { /* ignore */ }
  } catch (error) {
    console.error(error);
  }
}
  function renderAllViews() {
    renderGrids();
    initCatalogFromURL();
  }

  // ---------- HOME Y DETALLE DE PRODUCTO ----------
  function renderGrids() {
    if (catalogProducts.length === 0) return;

    const productSets = {
      'grid-nuevos': catalogProducts.slice(0, 4),
      'grid-maquillajes': catalogProducts.filter(p => getCategoryFilterKey(p.cat) === 'maquillaje'),
      'grid-perfumes': catalogProducts.filter(p => getCategoryFilterKey(p.cat) === 'perfumes'),
      'grid-joyeria': catalogProducts.filter(p => getCategoryFilterKey(p.cat) === 'joyeria')
    };

    Object.entries(productSets).forEach(([gridId, items]) => {
      const el = document.getElementById(gridId);
      if (!el) return;

      if (items.length === 0) {
        el.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #888;">No hay productos disponibles en esta sección.</div>';
        return;
      }

      el.innerHTML = items.map(item => `
        <div class="card">
          <a href="javascript:void(0)" onclick="goToProduct('${item.name.replace(/'/g, "\\'")}', ${item.price}, '${item.cat.replace(/'/g, "\\'")}', '${item.desc.replace(/'/g, "\\'")}', '${(item.image||'').replace(/'/g, "\\'")}', '${(item.image2||'').replace(/'/g, "\\'")}', '${(item.image3||'').replace(/'/g, "\\'")}')" class="card-img-link">
            <div class="card-img"><img src="${item.image || ''}" alt="${item.name}" style="max-width:100%;max-height:220px;object-fit:contain;display:block;margin:0 auto;background:#fff;padding:6px;" onerror="this.style.display='none'"/></div>
          </a>
          <div class="card-body">
            <div class="card-cat">${item.cat}</div>
            <a href="javascript:void(0)" onclick="goToProduct('${item.name.replace(/'/g, "\\'")}', ${item.price}, '${item.cat.replace(/'/g, "\\'")}', '${item.desc.replace(/'/g, "\\'")}', '${(item.image||'').replace(/'/g, "\\'")}', '${(item.image2||'').replace(/'/g, "\\'")}', '${(item.image3||'').replace(/'/g, "\\'")}')" class="card-title-link">
              <p class="card-name">${item.name}</p>
            </a>
            <p class="card-price">$${item.price} MXN</p>
            <button class="card-btn" onclick="addToCart('${item.name.replace(/'/g,"")}',${item.price})">Agregar Al Carrito</button>
          </div>
        </div>
      `).join('');
    });
  }

  function goToProduct(name, price, cat, desc) {
    const image = arguments.length > 4 ? arguments[4] : '';
    const image2 = arguments.length > 5 ? arguments[5] : '';
    const image3 = arguments.length > 6 ? arguments[6] : '';
    const selectedProduct = { name, price, cat, desc, image, image2, image3 };
    localStorage.setItem('joyeria_diana_selected', JSON.stringify(selectedProduct));
    window.location.href = 'producto.html';
  }

  function loadProductDetail() {
    const selectedProduct = JSON.parse(localStorage.getItem('joyeria_diana_selected'));
    if (!selectedProduct) return;

    const nameEl = document.querySelector('.product-name');
    const priceEl = document.querySelector('.product-price');
    const catEl = document.querySelector('.product-cat');
    const breadcrumbCurrent = document.querySelector('.breadcrumbs .current');
    const descEl = document.querySelector('.product-description p');
    const titleEl = document.querySelector('title');

    // gallery elements
    const galleryMain = document.getElementById('galleryMain');
    const thumbs = document.querySelectorAll('.gallery-thumbs .thumb');

    if (nameEl) nameEl.textContent = selectedProduct.name;
    if (priceEl) priceEl.textContent = `$${selectedProduct.price} MXN`;
    if (catEl) catEl.textContent = selectedProduct.cat;
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = selectedProduct.name;
    if (descEl) descEl.textContent = selectedProduct.desc;
    if (titleEl) titleEl.textContent = `${selectedProduct.name} — Joyería Diana`;

    // set gallery main image
    const availableImages = [selectedProduct.image, selectedProduct.image2, selectedProduct.image3].filter(Boolean);
    if (galleryMain) {
      if (availableImages.length > 0) {
        galleryMain.innerHTML = `<img src="${availableImages[0]}" alt="${selectedProduct.name}" style="max-width:420px;max-height:420px;width:auto;height:auto;object-fit:contain;display:block;margin:0 auto;" onerror="this.style.display='none'"/>`;
      } else {
        galleryMain.textContent = 'Imagen del producto';
      }
    }

    // thumbs: show available image URLs and switch gallery main on click
    if (thumbs && thumbs.length) {
      const images = availableImages;
      for (let i = 0; i < thumbs.length; i++) {
        const thumb = thumbs[i];
        const thumbSrc = images[i] || '';
        if (thumbSrc) {
          thumb.innerHTML = `<img src="${thumbSrc}" alt="${selectedProduct.name} - ${i + 1}" style="width:100%;height:100px;object-fit:contain;display:block;" onerror="this.style.display='none'"/>`;
          thumb.classList.toggle('active', i === 0);
          thumb.style.display = 'block';
          thumb.onclick = () => {
            if (!galleryMain) return;
            galleryMain.innerHTML = `<img src="${thumbSrc}" alt="${selectedProduct.name}" style="max-width:420px;max-height:420px;width:auto;height:auto;object-fit:contain;display:block;margin:0 auto;" onerror="this.style.display='none'"/>`;
            thumbs.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
          };
        } else {
          thumb.innerHTML = '';
          thumb.style.display = 'none';
          thumb.onclick = null;
          thumb.classList.remove('active');
        }
      }
    }
    const addBtn = document.querySelector('.btn-add-cart');
    const buyBtn = document.querySelector('.btn-buy-whatsapp');
    
    if (addBtn) addBtn.setAttribute('onclick', `addCurrentProductToCart('${selectedProduct.name.replace(/'/g,"")}', ${selectedProduct.price})`);
    if (buyBtn) buyBtn.setAttribute('onclick', `buyProductOnWhatsapp('${selectedProduct.name.replace(/'/g,"")}', ${selectedProduct.price})`);
  }

  // ---------- LÓGICA DE VISTA CATALOGO.HTML ----------
  function getCatalogPageCount(filteredItems) {
    return Math.max(1, Math.ceil(filteredItems.length / CATALOG_PAGE_SIZE));
  }

  function setCatalogPage(page) {
    currentCatalogPage = Math.max(1, Math.min(page, getCatalogPageCount(filteredItemsForCurrentFilters())));
    applyCatalogFilters();
  }

  function renderPaginationControls(pageCount, totalItems) {
    const pageLabel = `Página ${currentCatalogPage} de ${pageCount}`;
    const startItem = totalItems === 0 ? 0 : (currentCatalogPage - 1) * CATALOG_PAGE_SIZE + 1;
    const endItem = Math.min(currentCatalogPage * CATALOG_PAGE_SIZE, totalItems);

    return `
      <span class="pagination-info">Mostrando ${startItem}–${endItem} de ${totalItems} productos</span>
      <button ${currentCatalogPage === 1 ? 'disabled' : ''} onclick="setCatalogPage(1)">Primera</button>
      <button ${currentCatalogPage === 1 ? 'disabled' : ''} onclick="setCatalogPage(${currentCatalogPage - 1})">Anterior</button>
      <button class="pagination-page" disabled>${pageLabel}</button>
      <button ${currentCatalogPage === pageCount ? 'disabled' : ''} onclick="setCatalogPage(${currentCatalogPage + 1})">Siguiente</button>
      <button ${currentCatalogPage === pageCount ? 'disabled' : ''} onclick="setCatalogPage(${pageCount})">Última</button>
    `;
  }

  function filteredItemsForCurrentFilters() {
    return catalogProducts.filter((item) =>
      matchesCatalogCategory(item, currentCatalogCategory) && matchesCatalogSubcategory(item, currentCatalogSubcategory)
    ).filter(item => {
      if (!currentCatalogSearch.trim()) return true;
      const term = currentCatalogSearch.trim().toLowerCase();
      return item.name.toLowerCase().includes(term) ||
        item.cat.toLowerCase().includes(term) ||
        item.desc.toLowerCase().includes(term) ||
        (item.subcatLabel || '').toLowerCase().includes(term);
    });
  }

  function renderCatalog(filteredItems) {
    const grid = document.getElementById('catalogGrid');
    const pagination = document.getElementById('catalogPagination');
    if (!grid) return;

    const totalItems = filteredItems.length;
    const pageCount = getCatalogPageCount(filteredItems);
    if (currentCatalogPage > pageCount) currentCatalogPage = pageCount;

    const pageStart = (currentCatalogPage - 1) * CATALOG_PAGE_SIZE;
    const pageItems = filteredItems.slice(pageStart, pageStart + CATALOG_PAGE_SIZE);

    if (totalItems === 0) {
      grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px 0; color: #666;"><p>No se encontraron productos en esta categoría.</p></div>';
      if (pagination) pagination.innerHTML = '';
      return;
    }

    grid.innerHTML = pageItems.map(item => `
      <div class="card">
        <a href="javascript:void(0)" onclick="goToProduct('${item.name.replace(/'/g, "\\'")}', ${item.price}, '${item.cat.replace(/'/g, "\\'")}', '${item.desc.replace(/'/g, "\\'")}', '${(item.image||'').replace(/'/g, "\\'")}', '${(item.image2||'').replace(/'/g, "\\'")}', '${(item.image3||'').replace(/'/g, "\\'")}')" class="card-img-link">
          <div class="card-img"><img src="${item.image || ''}" alt="${item.name}" style="max-width:100%;max-height:220px;object-fit:contain;display:block;margin:0 auto;background:#fff;padding:6px;" onerror="this.style.display='none'"/></div>
        </a>
        <div class="card-body">
          <div class="card-cat">${item.cat}</div>
          <a href="javascript:void(0)" onclick="goToProduct('${item.name.replace(/'/g, "\\'")}', ${item.price}, '${item.cat.replace(/'/g, "\\'")}', '${item.desc.replace(/'/g, "\\'")}', '${(item.image||'').replace(/'/g, "\\'")}', '${(item.image2||'').replace(/'/g, "\\'")}', '${(item.image3||'').replace(/'/g, "\\'")}')" class="card-title-link">
            <p class="card-name">${item.name}</p>
          </a>
          <p class="card-price">$${item.price} MXN</p>
          <button class="card-btn" onclick="addToCart('${item.name.replace(/'/g,"")}',${item.price})">Agregar Al Carrito</button>
        </div>
      </div>
    `).join('');

    if (pagination) {
      pagination.innerHTML = renderPaginationControls(pageCount, totalItems);
    }
  }

  let currentCatalogCategory = 'todos';
  let currentCatalogSubcategory = 'todos';
  let currentCatalogSearch = '';

  function matchesCatalogCategory(product, categoryKey) {
    if (categoryKey === 'todos') return true;
    return getCategoryFilterKey(product.cat) === categoryKey;
  }

  function matchesCatalogSubcategory(product, subcategory) {
    if (!subcategory || subcategory === 'todos') return true;
    return product.subcat === subcategory;
  }

  function getAvailableSubcategories(categoryKey) {
    const source = catalogProducts.filter((product) => matchesCatalogCategory(product, categoryKey));
    const subcats = [...new Set(source.map((product) => product.subcat).filter(Boolean))];
    return subcats.sort();
  }

  function renderSubfilterChips() {
    const container = document.getElementById('subfilterContainer');
    if (!container) return;

    if (currentCatalogCategory === 'todos') {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    const subcats = getAvailableSubcategories(currentCatalogCategory);
    if (subcats.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    const buttons = [{ key: 'todos', label: 'Todos' }, ...subcats.map((subcat) => ({ key: subcat, label: getSubcategoryLabel(subcat) }))];

    container.innerHTML = buttons.map(({ key, label }) => `
      <button class="filter-chip ${currentCatalogSubcategory === key ? 'active' : ''}" data-subcat="${key}" onclick="filterCatalog('${currentCatalogCategory}', '${key}')">${label}</button>
    `).join('');
  }

  function syncCatalogURL() {
    const params = new URLSearchParams();
    if (currentCatalogCategory && currentCatalogCategory !== 'todos') params.set('cat', currentCatalogCategory);
    if (currentCatalogSubcategory && currentCatalogSubcategory !== 'todos') params.set('subcat', currentCatalogSubcategory);
    if (currentCatalogSearch.trim()) params.set('search', currentCatalogSearch.trim());
    if (currentCatalogPage > 1) params.set('page', String(currentCatalogPage));

    const queryString = params.toString();
    const nextUrl = 'catalogo.html' + (queryString ? `?${queryString}` : '');
    history.replaceState(null, '', nextUrl);
  }

function applyCatalogFilters() {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
      if (tab.getAttribute('data-cat') === currentCatalogCategory) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    const validSubcats = getAvailableSubcategories(currentCatalogCategory);
    if (currentCatalogSubcategory && currentCatalogSubcategory !== 'todos' && !validSubcats.includes(currentCatalogSubcategory)) {
      currentCatalogSubcategory = 'todos';
    }

    let filtered = [...catalogProducts].filter((item) =>
      matchesCatalogCategory(item, currentCatalogCategory) && matchesCatalogSubcategory(item, currentCatalogSubcategory)
    );

    if (currentCatalogSearch.trim()) {
      const term = currentCatalogSearch.trim().toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.cat.toLowerCase().includes(term) ||
        item.desc.toLowerCase().includes(term) ||
        (item.subcatLabel || '').toLowerCase().includes(term)
      );
    }

    renderSubfilterChips();
    renderCatalog(filtered);
    syncCatalogURL();
  }

  function filterCatalog(category, subcategory) {
    currentCatalogCategory = category || 'todos';
    currentCatalogSubcategory = subcategory || 'todos';
    currentCatalogPage = 1;

    if (currentCatalogCategory === 'todos') {
      currentCatalogSubcategory = 'todos';
    }

    applyCatalogFilters();
  }

  function searchCatalog(searchTerm) {
    currentCatalogSearch = searchTerm;
    currentCatalogPage = 1;
    applyCatalogFilters();
  }

  function navigateToCatalogSearch(searchTerm) {
    const query = searchTerm.trim();
    const params = new URLSearchParams();

    if (currentCatalogCategory && currentCatalogCategory !== 'todos') params.set('cat', currentCatalogCategory);
    if (currentCatalogSubcategory && currentCatalogSubcategory !== 'todos') params.set('subcat', currentCatalogSubcategory);
    if (query) params.set('search', query);

    const url = 'catalogo.html' + (params.toString() ? `?${params.toString()}` : '');
    window.location.href = url;
  }

  function setupHeaderSearch() {
    const headerSearch = document.querySelector('header .search-box input');
    if (!headerSearch) return;
    headerSearch.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const value = headerSearch.value || '';
      navigateToCatalogSearch(value);
    });
  }

  function setupCatalogSearch() {
    const searchInput = document.getElementById('catalogSearch');
    if (!searchInput) return;
    searchInput.addEventListener('input', (event) => {
      searchCatalog(event.target.value);
    });
    searchInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const value = searchInput.value || '';
      const url = 'catalogo.html' + (value.trim() ? `?search=${encodeURIComponent(value.trim())}` : '');
      history.replaceState(null, '', url);
      searchCatalog(value);
    });
  }

  function initCatalogFromURL() {
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;

    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('cat') || 'todos';
    currentCatalogCategory = catParam;
    const subcatParam = urlParams.get('subcat') || 'todos';
    currentCatalogSubcategory = subcatParam;
    const searchParam = urlParams.get('search') || '';
    currentCatalogSearch = searchParam;
    const pageParam = parseInt(urlParams.get('page'), 10);
    currentCatalogPage = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

    const searchInput = document.getElementById('catalogSearch');
    if (searchInput) searchInput.value = currentCatalogSearch;

    applyCatalogFilters();
  }

  // ---------- LOCAL STORAGE & CARRITO ----------
  let cart = JSON.parse(localStorage.getItem('joyeria_diana_cart')) || [];
  let currentProductQty = 1;

  document.addEventListener('DOMContentLoaded', () => {
    // intentar precargar desde cache para render inmediato
    const cached = loadCatalogFromCache();
    if (cached && Array.isArray(cached) && cached.length > 0) {
      catalogProducts = cached;
      window.catalogProducts = catalogProducts;
      renderAllViews();
      // refrescar en segundo plano
      loadProductsFromFirestore();
    } else {
      loadProductsFromFirestore();
    }

    if (document.querySelector('.product-name')) {
      loadProductDetail();
    }

    setupHeaderSearch();
    setupCatalogSearch();
    updateCartUI();
  });

  function saveCartToStorage() {
    localStorage.setItem('joyeria_diana_cart', JSON.stringify(cart));
  }

  function openCart() {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function toggleMenu() {
    const menu = document.getElementById('mobileMenu');
    if (!menu) return;
    menu.classList.toggle('show');
  }

  function changeProductQty(delta) {
    currentProductQty += delta;
    if (currentProductQty < 1) currentProductQty = 1;
    const qtyEl = document.getElementById('productQty');
    if (qtyEl) qtyEl.textContent = currentProductQty;
  }

  function addToCart(name, price) {
    const existing = cart.find(item => item.name === name);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ name, price, qty: 1 });
    }
    saveCartToStorage();
    updateCartUI();
    openCart();
  }

  function addCurrentProductToCart(name, price) {
    const existing = cart.find(item => item.name === name);
    if (existing) {
      existing.qty += currentProductQty;
    } else {
      cart.push({ name, price, qty: currentProductQty });
    }
    saveCartToStorage();
    updateCartUI();
    openCart();
    
    currentProductQty = 1;
    const qtyEl = document.getElementById('productQty');
    if (qtyEl) qtyEl.textContent = 1;
  }

  function buyProductOnWhatsapp(name, price) {
    const total = price * currentProductQty;
    const message = `Hola ${STORE_NAME}  Quisiera comprar directamente:\n- ${currentProductQty}x ${name} ($${total} MXN)\n\n¿Tienen disponibilidad?`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  }

  function updateQty(name, delta) {
    const item = cart.find(i => i.name === name);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.name !== name);
    saveCartToStorage();
    updateCartUI();
  }

  function removeItem(name) {
    cart = cart.filter(i => i.name !== name);
    saveCartToStorage();
    updateCartUI();
  }

  function updateCartUI() {
    const badge = document.getElementById('cartBadge');
    const container = document.getElementById('drawerItems');
    const totalEl = document.getElementById('drawerTotal');
    const waBtn = document.getElementById('waBtn');

    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    if (badge) badge.textContent = totalCount;

    if (container) {
      if (cart.length === 0) {
        container.innerHTML = '<div class="drawer-empty">Tu carrito está vacío.<br>Agrega productos para comenzar tu pedido.</div>';
      } else {
        container.innerHTML = cart.map(item => `
          <div class="drawer-item">
            <div class="drawer-item-img"></div>
            <div class="drawer-item-info">
              <p class="drawer-item-name">${item.name}</p>
              <p class="drawer-item-price">$${item.price} c/u</p>
              <div class="qty-control">
                <button onclick="updateQty('${item.name.replace(/'/g,"")}', -1)">−</button>
                <span>${item.qty}</span>
                <button onclick="updateQty('${item.name.replace(/'/g,"")}', 1)">+</button>
              </div>
            </div>
            <div style="text-align:right;">
              <div class="drawer-item-subtotal">$${item.price * item.qty}</div>
              <button class="drawer-remove-btn" onclick="removeItem('${item.name.replace(/'/g,"")}')" title="Eliminar producto">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    if (totalEl) totalEl.textContent = '$' + totalPrice;
    if (waBtn) waBtn.disabled = cart.length === 0;
  }

  // ---------- ENVIAR Y LIMPIAR EL CARRITO ----------
  function sendToWhatsapp() {
    if (cart.length === 0) return;

    let text = `Hola ${STORE_NAME} Me gustaría realizar el siguiente pedido:\n\n`;
    let total = 0;

    cart.forEach(item => {
      const sub = item.price * item.qty;
      total += sub;
      text += `• ${item.qty}x ${item.name} — $${sub} MXN\n`;
    });

    text += `\n*Total a pagar: $${total} MXN*\n\n¿Me indican los pasos para realizar el pago y envío? ¡Gracias!`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');

    setTimeout(() => {
      closeCart();
      cart = [];
      localStorage.removeItem('joyeria_diana_cart');
      updateCartUI();
    }, 500);
  }
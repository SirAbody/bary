// Basic state
const cartState = {
  items: [], // {id, name, price, calories, qty, img}
};

// Utils
const currency = (v) => `${Number(v).toFixed(2)} ر.س`;

function findItemIndex(productId) {
  return cartState.items.findIndex((x) => x.id === productId);
}

function updateCartCount() {
  const count = cartState.items.reduce((s, it) => s + it.qty, 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = String(count);
}

function computeTotal() {
  return cartState.items.reduce((s, it) => s + (it.qty * it.price), 0);
}

function renderCart() {
  const list = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (!list || !totalEl || !checkoutBtn) return;

  list.innerHTML = '';
  cartState.items.forEach((it) => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${it.img}" alt="${it.name}" />
      <div>
        <div class="title">${it.name}</div>
        <div class="muted">${it.calories} سعرة</div>
        <div class="qty">
          <button data-act="dec" aria-label="تقليل الكمية">-</button>
          <span>${it.qty}</span>
          <button data-act="inc" aria-label="زيادة الكمية">+</button>
          <button class="remove" data-act="remove" aria-label="حذف">حذف</button>
        </div>
      </div>
      <strong>${currency(it.price * it.qty)}</strong>
    `;

    row.querySelector('[data-act="inc"]').addEventListener('click', () => {
      it.qty += 1;
      syncAndRender();
    });
    row.querySelector('[data-act="dec"]').addEventListener('click', () => {
      it.qty = Math.max(1, it.qty - 1);
      syncAndRender();
    });
    row.querySelector('[data-act="remove"]').addEventListener('click', () => {
      cartState.items = cartState.items.filter((x) => x.id !== it.id);
      syncAndRender();
    });
    list.appendChild(row);
  });

  const total = computeTotal();
  totalEl.textContent = currency(total);
  checkoutBtn.disabled = cartState.items.length === 0;
  updateCartCount();
}

function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  toggleOverlay(true);
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  toggleOverlay(false);
}

function toggleOverlay(show) {
  const ov = document.getElementById('overlay');
  if (!ov) return;
  if (show) { ov.hidden = false; requestAnimationFrame(() => ov.classList.add('show')); }
  else { ov.classList.remove('show'); setTimeout(() => ov.hidden = true, 200); }
}

function addToCartFromCard(cardEl) {
  const id = Number(cardEl.dataset.productId);
  const name = cardEl.querySelector('.card-body h3')?.textContent?.trim() || cardEl.dataset.name;
  const price = Number(cardEl.dataset.price);
  const calories = Number(cardEl.dataset.calories);
  const img = cardEl.querySelector('img')?.src || '';
  const idx = findItemIndex(id);

  if (idx >= 0) {
    cartState.items[idx].qty += 1;
  } else {
    cartState.items.push({ id, name, price, calories, qty: 1, img });
  }
  syncAndRender();
  openCart();
  showToast(currentLang === 'ar' ? 'تمت الإضافة للسلة' : 'Added to cart');
}

function syncAndRender() {
  try { localStorage.setItem('barrydiet_cart', JSON.stringify(cartState.items)); } catch {}
  renderCart();
}

function restoreCart() {
  try {
    const raw = localStorage.getItem('barrydiet_cart');
    if (raw) cartState.items = JSON.parse(raw);
  } catch {}
}

function setupFadeObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.fade-observe').forEach((el) => observer.observe(el));
}

function setupEvents() {
  // Add to cart buttons
  document.querySelectorAll('.card .add-to-cart').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const card = e.currentTarget.closest('.card');
      addToCartFromCard(card);
    });
  });
  // if product images fail, swap to inline SVG placeholders
  document.querySelectorAll('.card-media img').forEach((img) => {
    img.addEventListener('error', () => {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('assets/')) {
        img.remove();
      }
    });
  });

  document.getElementById('cartButton').addEventListener('click', openCart);
  document.getElementById('closeCart').addEventListener('click', closeCart);
  document.getElementById('overlay').addEventListener('click', () => {
    closeCart();
    closeModal();
  });
  // Ensure overlay sits between drawers
  const ov = document.getElementById('overlay');
  if (ov) ov.addEventListener('click', () => {
    // nothing extra
  });

  // Checkout
  document.getElementById('checkoutBtn').addEventListener('click', openModal);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelOrder').addEventListener('click', closeModal);

  const form = document.getElementById('checkoutForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    // Simulate order create
    const order = {
      name: form.fullName.value.trim(),
      phone: form.phone.value.trim(),
      address: form.address.value.trim(),
      items: cartState.items,
      total: computeTotal(),
      method: 'COD',
      at: new Date().toISOString(),
    };
    try { sessionStorage.setItem('barrydiet_last_order', JSON.stringify(order)); } catch {}
    cartState.items = [];
    syncAndRender();
    closeModal();
    alert('تم استلام طلبك بنجاح! سيتم التواصل معك لتأكيد التوصيل.');
  });
}

function openModal() {
  const dlg = document.getElementById('checkoutModal');
  const summary = document.getElementById('orderSummary');
  summary.innerHTML = cartState.items.map((it) => `• ${it.name} × ${it.qty} — ${currency(it.price * it.qty)}`).join('<br>')
    + `<hr><strong>الإجمالي: ${currency(computeTotal())}</strong>`;
  if (typeof dlg.showModal === 'function') {
    dlg.showModal();
  } else {
    dlg.setAttribute('open', '');
  }
  toggleOverlay(true);
}

function closeModal() {
  const dlg = document.getElementById('checkoutModal');
  if (dlg.open && typeof dlg.close === 'function') dlg.close();
  dlg.removeAttribute('open');
  toggleOverlay(false);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  restoreCart();
  renderCart();
  setupEvents();
  setupFadeObserver();
  setupHeaderShadow();
  setupNavDrawer();
  setupToTop();
  setupI18n();
  setupSmoothNav();
  dismissIntro();
});

function setupHeaderShadow() {
  const header = document.querySelector('.header');
  const onScroll = () => {
    if (window.scrollY > 4) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function setupNavDrawer() {
  const drawer = document.getElementById('navDrawer');
  const openBtn = document.getElementById('menuButton');
  const closeBtn = document.getElementById('closeNav');
  const overlay = document.getElementById('overlay');
  if (!drawer || !openBtn || !closeBtn) return;
  const open = () => { drawer.classList.add('open'); toggleOverlay(true); };
  const close = () => { drawer.classList.remove('open'); toggleOverlay(false); };
  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); closeCart(); closeModal(); }});
  drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerHTML = `<div class="msg">${message}</div>`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}

// Smooth nav for internal links
function setupSmoothNav() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
    });
  });
}

// Intro overlay removal and hero parallax
function dismissIntro() {
  const intro = document.getElementById('intro');
  if (!intro) return;
  // start animation explicitly to avoid stuck opacity
  intro.classList.add('play');
  setTimeout(() => { intro.remove(); }, 1200);
  // simple parallax on hero image
  const heroImg = document.querySelector('.hero-img');
  if (heroImg) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      heroImg.style.transform = `translateY(${Math.min(y * 0.08, 24)}px)`;
    }, { passive: true });
  }
}

let currentLang = 'ar';
const translations = {
  ar: {
    brand: 'باري دايت',
    'nav.products': 'المنتجات',
    'nav.about': 'نبذة',
    'nav.contact': 'تواصل',
    'hero.title': 'خيارك الذكي للأكل الصحي',
    'hero.subtitle': 'وجبات متوازنة ومشروبات طبيعية، بتصميم سريع ومتجاوب.',
    'hero.ctaShop': 'تسوق الآن',
    'hero.ctaLearn': 'اعرف أكثر',
    'hero.scroll': 'اسحب للأسفل',
    'products.title': 'منتجاتنا',
    'products.subtitle': 'مختارة بعناية لأسلوب حياة صحي',
    'product1.name': 'وجبة رز ودجاج صحية',
    'product1.desc': 'صدر دجاج مشوي مع أرز بني وخضار موسمية.',
    'product2.name': 'مشروب فواكه صحي',
    'product2.desc': 'مزيج طبيعي من التوت والمانجو والبرتقال بدون سكر مضاف.',
    'product3.name': 'مياه نقية',
    'product3.desc': 'مياه نقية منعشة معادن متوازنة.',
    'meta.calories': 'سعرة',
    'actions.addToCart': 'أضف إلى السلة',
    'footer.home': 'الرئيسية',
    'footer.products': 'المنتجات',
    'footer.about': 'نبذة',
    'footer.rights': 'جميع الحقوق محفوظة.',
    'checkout.title': 'الدفع عند الاستلام',
    'checkout.fullName': 'الاسم الكامل',
    'checkout.fullNamePh': 'مثال: محمد أحمد',
    'checkout.phone': 'رقم الجوال',
    'checkout.phonePh': '05xxxxxxxx',
    'checkout.address': 'العنوان',
    'checkout.addressPh': 'المدينة، الحي، الشارع',
    'checkout.codNote': 'سيتم الدفع نقدًا عند استلام الطلب.',
    'checkout.confirm': 'تأكيد الطلب',
    'checkout.cancel': 'إلغاء',
  },
  en: {
    brand: 'Barry Diet',
    'nav.products': 'Products',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'hero.title': 'Your smart choice for healthy food',
    'hero.subtitle': 'Balanced meals and natural drinks, fast and responsive design.',
    'hero.ctaShop': 'Shop Now',
    'hero.ctaLearn': 'Learn More',
    'hero.scroll': 'Scroll down',
    'products.title': 'Our Products',
    'products.subtitle': 'Carefully selected for a healthy lifestyle',
    'product1.name': 'Healthy Rice & Chicken Meal',
    'product1.desc': 'Grilled chicken breast with brown rice and seasonal veggies.',
    'product2.name': 'Healthy Fruit Juice',
    'product2.desc': 'A natural blend of berries, mango, and orange with no added sugar.',
    'product3.name': 'Pure Water',
    'product3.desc': 'Refreshing pure water with balanced minerals.',
    'meta.calories': 'kcal',
    'actions.addToCart': 'Add to Cart',
    'footer.home': 'Home',
    'footer.products': 'Products',
    'footer.about': 'About',
    'footer.rights': 'All rights reserved.',
    'checkout.title': 'Cash on Delivery',
    'checkout.fullName': 'Full name',
    'checkout.fullNamePh': 'e.g., Mohammed Ahmed',
    'checkout.phone': 'Phone number',
    'checkout.phonePh': '05xxxxxxxx',
    'checkout.address': 'Address',
    'checkout.addressPh': 'City, district, street',
    'checkout.codNote': 'You will pay in cash upon delivery.',
    'checkout.confirm': 'Confirm Order',
    'checkout.cancel': 'Cancel',
  }
};

function setupI18n() {
  const btnHeader = document.getElementById('langToggle');
  const btnDrawer = document.getElementById('langToggleDrawer');
  const apply = (lang) => {
    currentLang = lang;
    const map = translations[lang];
    document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (map[key]) el.textContent = map[key];
    });
    // Update toggle button label to make change obvious
    const toggleLabel = lang === 'ar' ? 'EN' : 'ع';
    if (btnHeader) btnHeader.textContent = toggleLabel;
    if (btnDrawer) btnDrawer.textContent = toggleLabel;
    // Update page title
    try {
      document.title = lang === 'ar' ? 'باري دايت | متجر الأكل الصحي' : 'Barry Diet | Healthy Store';
    } catch {}
    const phMap = {
      'checkout.fullNamePh': 'input[name="fullName"]',
      'checkout.phonePh': 'input[name="phone"]',
      'checkout.addressPh': 'input[name="address"]',
    };
    Object.entries(phMap).forEach(([k, sel]) => {
      const input = document.querySelector(sel);
      if (input && map[k]) input.setAttribute('placeholder', map[k]);
    });
    document.querySelectorAll('.calories .cal-val').forEach((el) => {
      const parent = el.parentElement;
      const unitSpan = parent?.querySelector('[data-i18n="meta.calories"]');
      if (unitSpan) unitSpan.textContent = map['meta.calories'];
    });
  };

  const toggle = () => {
    const next = currentLang === 'ar' ? 'en' : 'ar';
    apply(next);
    try { localStorage.setItem('barrydiet_lang', next); } catch {}
  };
  if (btnHeader) btnHeader.addEventListener('click', toggle);
  if (btnDrawer) btnDrawer.addEventListener('click', toggle);
  try {
    const saved = localStorage.getItem('barrydiet_lang');
    if (saved && (saved === 'ar' || saved === 'en')) {
      apply(saved);
    } else {
      apply('ar');
    }
  } catch { apply('ar'); }
}



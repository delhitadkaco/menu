const DISCOUNT_PERCENT = 20;
const PHONE_NUMBER = "918860432553";
const DELIVERY_CHARGE = 50;

// Settings loaded from menu.json (injected by admin)
let siteSettings = {
  upiId: "",
  upiName: "",
  paymentMethods: ["upi", "cash"]
};

let cart = {};
let orderType = "delivery"; // "delivery" | "pickup"
let selectedPayment = "";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("discountPercent").innerText = DISCOUNT_PERCENT;
  fetch("data/menu.json")
    .then(res => res.json())
    .then(data => {
      // If settings block exists at top of JSON
      if (data.settings) {
        siteSettings = { ...siteSettings, ...data.settings };
        data = data.menu || data;
      }
      // Also check if it's wrapped
      if (!Array.isArray(data) && data.menu) data = data.menu;
      renderCategoryNav(data);
      renderMenu(data);
      setupScrollObserver(data.length);
    });

  document.getElementById("cartModal").addEventListener("click", function(e) {
    if (e.target === this) closeCart();
  });
  document.getElementById("checkoutModal").addEventListener("click", function(e) {
    if (e.target === this) closeCheckoutModal();
  });
});

function calculateDiscount(price) {
  if (DISCOUNT_PERCENT === 0) return price;
  return Math.round(price - (price * DISCOUNT_PERCENT / 100));
}

// ── Category Nav ──
function renderCategoryNav(menuData) {
  const nav = document.createElement("nav");
  nav.className = "category-nav";
  menuData.forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.textContent = cat.category;
    btn.id = "nav-btn-" + i;
    if (i === 0) btn.classList.add("active");
    btn.onclick = () => {
      isUserClicking = true;
      setActiveNav(i);
      document.getElementById("cat-" + i).scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => { isUserClicking = false; }, 800);
    };
    nav.appendChild(btn);
  });
  document.querySelector("header").insertAdjacentElement("afterend", nav);
}

let isUserClicking = false;

function setActiveNav(index) {
  document.querySelectorAll(".category-nav button").forEach(b => b.classList.remove("active"));
  const activeBtn = document.getElementById("nav-btn-" + index);
  if (!activeBtn) return;
  activeBtn.classList.add("active");
  activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
}

function setupScrollObserver(count) {
  const visibleSections = new Map();
  const observer = new IntersectionObserver((entries) => {
    if (isUserClicking) return;
    entries.forEach(entry => {
      const index = parseInt(entry.target.dataset.catIndex);
      if (entry.isIntersecting) visibleSections.set(index, entry.intersectionRatio);
      else visibleSections.delete(index);
    });
    if (visibleSections.size === 0) return;
    setActiveNav(Math.min(...visibleSections.keys()));
  }, { rootMargin: "-55px 0px -60% 0px", threshold: 0 });

  for (let i = 0; i < count; i++) {
    const el = document.getElementById("cat-" + i);
    if (el) { el.dataset.catIndex = i; observer.observe(el); }
  }
}

// ── Menu Render ──
function renderMenu(menuData) {
  const menu = document.getElementById("menu");
  menu.innerHTML = "";
  menuData.forEach((category, catIndex) => {
    const section = document.createElement("div");
    section.className = "category";
    section.id = "cat-" + catIndex;
    section.innerHTML = `<h2>${category.category}</h2>`;
    category.items.forEach(item => {
      if (item.available === false) return;
      const finalPrice = calculateDiscount(item.price);
      const dot = item.veg ? "🟢" : "🔴";
      const safeId = "item-" + item.name.replace(/[^a-zA-Z0-9]/g, "_");
      const div = document.createElement("div");
      div.className = "menu-item";
      const discountHTML = DISCOUNT_PERCENT
        ? `<span class="old-price">₹${item.price}</span>
           <span class="price">₹${finalPrice}</span>
           <span class="discount-badge">${DISCOUNT_PERCENT}% OFF</span>`
        : `<span class="price">₹${finalPrice}</span>`;
      div.innerHTML = `
        <div class="item-info">
          <h3>${dot} ${item.name}</h3>
          <p>${item.description}</p>
          <div class="price-row">${discountHTML}</div>
          <div class="item-cart-control" id="${safeId}">
            <button class="add-btn" onclick="addToCart('${item.name.replace(/'/g, "\\'")}', ${finalPrice}, '${safeId}')">+ Add</button>
          </div>
        </div>
        <div class="item-image">
          <img src="images/${item.image}" alt="${item.name}" loading="lazy">
        </div>`;
      section.appendChild(div);
    });
    menu.appendChild(section);
  });
}

// ── Cart ──
function addToCart(name, price, safeId) {
  if (cart[name]) cart[name].qty += 1;
  else cart[name] = { name, price, qty: 1, safeId };
  updateCartCount();
  refreshItemControl(name);
}

function changeQtyInline(name, delta) {
  if (!cart[name]) return;
  cart[name].qty += delta;
  if (cart[name].qty <= 0) delete cart[name];
  updateCartCount();
  refreshItemControl(name);
  if (document.getElementById("cartModal").style.display === "block") renderCart();
}

function refreshItemControl(name) {
  const item = cart[name];
  const safeId = item ? item.safeId : (() => {
    const all = document.querySelectorAll(".item-cart-control");
    for (const el of all) if (el.dataset.name === name) return el.id;
  })();
  if (!safeId) return;
  const ctrl = document.getElementById(safeId);
  if (!ctrl) return;
  ctrl.dataset.name = name;
  if (!item || item.qty === 0) {
    const price = ctrl.dataset.price;
    ctrl.innerHTML = `<button class="add-btn" onclick="addToCart('${name.replace(/'/g, "\\'")}', ${price}, '${safeId}')">+ Add</button>`;
  } else {
    ctrl.dataset.price = item.price;
    ctrl.innerHTML = `
      <div class="inline-qty">
        <button class="qty-btn" onclick="changeQtyInline('${name.replace(/'/g, "\\'")}', -1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="changeQtyInline('${name.replace(/'/g, "\\'")}', 1)">+</button>
      </div>`;
  }
}

function updateCartCount() {
  const total = Object.values(cart).reduce((s, i) => s + i.qty, 0);
  document.getElementById("cartCount").innerText = total;
}

function openCart() {
  document.getElementById("cartModal").style.display = "block";
  renderCart();
}
function closeCart() { document.getElementById("cartModal").style.display = "none"; }

function renderCart() {
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  cartItems.innerHTML = "";
  const items = Object.values(cart);
  if (items.length === 0) {
    cartItems.innerHTML = `<div class="cart-empty">🛒 Your cart is empty</div>`;
    cartTotal.innerHTML = "";
    document.querySelector(".whatsapp-btn").disabled = true;
    return;
  }
  document.querySelector(".whatsapp-btn").disabled = false;
  let total = 0;
  items.forEach(item => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <div class="cart-row-name">${item.name}</div>
      <div class="qty-controls">
        <button class="qty-btn" onclick="changeQtyInModal('${item.name.replace(/'/g, "\\'")}', -1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="changeQtyInModal('${item.name.replace(/'/g, "\\'")}', 1)">+</button>
      </div>
      <div class="cart-row-price">₹${subtotal}</div>`;
    cartItems.appendChild(row);
  });
  cartTotal.innerHTML = `<strong>Total: ₹${total}</strong>`;
}

function changeQtyInModal(name, delta) {
  changeQtyInline(name, delta);
  renderCart();
}

// ── Checkout ──
function checkout() {
  if (Object.values(cart).length === 0) return;
  closeCart();
  openCheckoutModal();
}

function openCheckoutModal() {
  orderType = "delivery";
  selectedPayment = "";
  document.getElementById("btnDelivery").classList.add("active");
  document.getElementById("btnPickup").classList.remove("active");
  document.getElementById("addressField").style.display = "block";
  document.getElementById("customerName").value = "";
  document.getElementById("addressInput").value = "";
  document.getElementById("customerName").classList.remove("error");
  document.getElementById("addressInput").classList.remove("error");
  renderPaymentOptions();
  renderCheckoutSummary();
  document.getElementById("checkoutModal").style.display = "block";
  document.getElementById("customerName").focus();
}

function closeCheckoutModal() {
  document.getElementById("checkoutModal").style.display = "none";
}

function selectOrderType(type) {
  orderType = type;
  document.getElementById("btnDelivery").classList.toggle("active", type === "delivery");
  document.getElementById("btnPickup").classList.toggle("active", type === "pickup");
  document.getElementById("addressField").style.display = type === "delivery" ? "block" : "none";
  renderCheckoutSummary();
}

function renderPaymentOptions() {
  const methods = siteSettings.paymentMethods || ["upi", "cash"];
  const labels = { upi: "💳 UPI / Online Payment", cash: "💵 Cash on Delivery", card: "🏦 Card" };
  const container = document.getElementById("paymentOptions");
  container.innerHTML = "";
  methods.forEach(m => {
    const div = document.createElement("div");
    div.className = "payment-option";
    div.id = "pay-opt-" + m;
    div.onclick = () => selectPayment(m);
    div.innerHTML = `
      <input type="radio" name="payment" value="${m}" id="pay-${m}">
      <label class="payment-option-label" for="pay-${m}">${labels[m] || m}</label>`;
    container.appendChild(div);
  });
}

function selectPayment(method) {
  selectedPayment = method;
  document.querySelectorAll(".payment-option").forEach(el => el.classList.remove("selected"));
  const opt = document.getElementById("pay-opt-" + method);
  if (opt) {
    opt.classList.add("selected");
    opt.querySelector("input").checked = true;
  }
  const upiBox = document.getElementById("upiBox");
  if (method === "upi" && siteSettings.upiId) {
    upiBox.style.display = "block";
    upiBox.innerHTML = `📲 Please pay to UPI ID: <strong>${siteSettings.upiId}</strong>${siteSettings.upiName ? ` (${siteSettings.upiName})` : ""}`;
  } else {
    upiBox.style.display = "none";
  }
}

function renderCheckoutSummary() {
  const items = Object.values(cart);
  const itemsTotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = orderType === "delivery" ? DELIVERY_CHARGE : 0;
  const grand = itemsTotal + delivery;
  const summaryEl = document.getElementById("checkoutSummary");
  summaryEl.innerHTML = `
    <div class="summary-row"><span>Items (${items.reduce((s,i)=>s+i.qty,0)})</span><span>₹${itemsTotal}</span></div>
    <div class="summary-row ${delivery === 0 ? 'delivery-free' : ''}">
      <span>Delivery Charge</span>
      <span>${delivery === 0 ? "FREE 🎉" : "₹" + delivery}</span>
    </div>
    <div class="summary-row total"><span>Grand Total</span><span>₹${grand}</span></div>`;
}

function confirmOrder() {
  const name = document.getElementById("customerName").value.trim();
  const address = document.getElementById("addressInput").value.trim();
  let valid = true;

  document.getElementById("customerName").classList.remove("error");
  document.getElementById("addressInput").classList.remove("error");

  if (!name) { document.getElementById("customerName").classList.add("error"); valid = false; }
  if (orderType === "delivery" && !address) { document.getElementById("addressInput").classList.add("error"); valid = false; }
  if (!selectedPayment) { alert("Please select a payment method."); valid = false; }
  if (!valid) return;

  const items = Object.values(cart);
  const itemsTotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = orderType === "delivery" ? DELIVERY_CHARGE : 0;
  const grand = itemsTotal + delivery;

  const payLabels = { upi: "UPI / Online", cash: "Cash on Delivery", card: "Card" };

  let msg = `Hi Delhi Tadka Co!%0A%0A`;
  msg += `*Name:* ${encodeURIComponent(name)}%0A`;
  msg += `*Order Type:* ${orderType === "delivery" ? "🛵 Delivery" : "🏃 Self Pickup"}%0A`;
  if (orderType === "delivery") msg += `*Address:* ${encodeURIComponent(address)}%0A`;
  msg += `*Payment:* ${payLabels[selectedPayment] || selectedPayment}%0A`;
  msg += `%0A*Order:*%0A`;
  items.forEach(item => {
    msg += `${item.qty}x ${encodeURIComponent(item.name)} - %E2%82%B9${item.price * item.qty}%0A`;
  });
  msg += `%0AItems Total: %E2%82%B9${itemsTotal}%0A`;
  if (delivery > 0) msg += `Delivery Charge: %E2%82%B9${delivery}%0A`;
  msg += `*Grand Total: %E2%82%B9${grand}*`;

  window.open(`https://wa.me/${PHONE_NUMBER}?text=${msg}`, "_blank");

  // Reset
  cart = {};
  updateCartCount();
  document.querySelectorAll(".item-cart-control").forEach(ctrl => {
    const n = ctrl.dataset.name;
    if (n) {
      ctrl.innerHTML = `<button class="add-btn" onclick="addToCart('${n.replace(/'/g, "\\'")}', ${ctrl.dataset.price}, '${ctrl.id}')">+ Add</button>`;
    }
  });
  closeCheckoutModal();
}

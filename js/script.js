const DISCOUNT_PERCENT = 20;
const PHONE_NUMBER = "918860432553";

// cart: itemName -> { name, price, qty }
let cart = {};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("discountPercent").innerText = DISCOUNT_PERCENT;
  fetch("data/menu.json")
    .then(res => res.json())
    .then(data => {
      renderCategoryNav(data);
      renderMenu(data);
      setupScrollObserver(data.length);
    });

  document.getElementById("cartModal").addEventListener("click", function(e) {
    if (e.target === this) closeCart();
  });
});

function calculateDiscount(price) {
  if (DISCOUNT_PERCENT === 0) return price;
  return Math.round(price - (price * DISCOUNT_PERCENT / 100));
}

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
      if (entry.isIntersecting) {
        visibleSections.set(index, entry.intersectionRatio);
      } else {
        visibleSections.delete(index);
      }
    });

    if (visibleSections.size === 0) return;

    // Highlight the topmost visible section
    const topmost = Math.min(...visibleSections.keys());
    setActiveNav(topmost);

  }, {
    // Fire when section enters just below the sticky nav bar
    rootMargin: "-55px 0px -60% 0px",
    threshold: 0
  });

  for (let i = 0; i < count; i++) {
    const el = document.getElementById("cat-" + i);
    if (el) {
      el.dataset.catIndex = i;
      observer.observe(el);
    }
  }
}

function renderMenu(menuData) {
  const menu = document.getElementById("menu");
  menu.innerHTML = "";

  menuData.forEach((category, catIndex) => {
    const section = document.createElement("div");
    section.className = "category";
    section.id = "cat-" + catIndex;
    section.innerHTML = `<h2>${category.category}</h2>`;

    category.items.forEach(item => {
      const finalPrice = calculateDiscount(item.price);
      const dot = item.veg ? "🟢" : "🔴";
      // safe key for DOM id: replace spaces & special chars
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
        </div>
      `;

      section.appendChild(div);
    });

    menu.appendChild(section);
  });
}

// Switch the item's Add button to inline qty controls
function addToCart(name, price, safeId) {
  if (cart[name]) {
    cart[name].qty += 1;
  } else {
    cart[name] = { name, price, qty: 1, safeId };
  }
  updateCartCount();
  refreshItemControl(name);
}

function changeQtyInline(name, delta) {
  if (!cart[name]) return;
  cart[name].qty += delta;
  if (cart[name].qty <= 0) {
    delete cart[name];
  }
  updateCartCount();
  refreshItemControl(name);
  // Also refresh cart modal if open
  if (document.getElementById("cartModal").style.display === "block") {
    renderCart();
  }
}

// Re-renders the per-item control (Add button ↔ qty stepper)
function refreshItemControl(name) {
  const item = cart[name];
  const safeId = item ? item.safeId : (
    // find it by scanning all controls
    (() => {
      const all = document.querySelectorAll(".item-cart-control");
      for (const el of all) {
        if (el.dataset.name === name) return el.id;
      }
    })()
  );

  if (!safeId) return;
  const ctrl = document.getElementById(safeId);
  if (!ctrl) return;

  // tag it so we can find it even after remove
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
      </div>
    `;
  }
}

function updateCartCount() {
  const total = Object.values(cart).reduce((sum, i) => sum + i.qty, 0);
  document.getElementById("cartCount").innerText = total;
}

function openCart() {
  document.getElementById("cartModal").style.display = "block";
  renderCart();
}

function closeCart() {
  document.getElementById("cartModal").style.display = "none";
}

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
      <div class="cart-row-price">₹${subtotal}</div>
    `;
    cartItems.appendChild(row);
  });

  cartTotal.innerHTML = `<strong>Total: ₹${total}</strong>`;
}

function changeQtyInModal(name, delta) {
  changeQtyInline(name, delta);
  renderCart();
}

// ── Checkout: show address modal first ──
function checkout() {
  const items = Object.values(cart);
  if (items.length === 0) return;
  closeCart();
  document.getElementById("addressModal").style.display = "block";
  document.getElementById("addressInput").focus();
}

function confirmOrder() {
  const address = document.getElementById("addressInput").value.trim();
  if (!address) {
    document.getElementById("addressInput").style.borderColor = "#c62828";
    document.getElementById("addressInput").placeholder = "Please enter your delivery address";
    return;
  }

  const items = Object.values(cart);
  let message = "Hi Delhi Tadka Co,%0A%0A*My Order:*%0A";
  let total = 0;

  items.forEach(item => {
    const subtotal = item.price * item.qty;
    message += `${item.qty}x ${item.name} - %E2%82%B9${subtotal}%0A`;
    total += subtotal;
  });

  message += `%0A*Total: %E2%82%B9${total}*%0A%0A*Delivery Address:*%0A${encodeURIComponent(address)}`;

  window.open(`https://wa.me/${PHONE_NUMBER}?text=${message}`, "_blank");

  cart = {};
  updateCartCount();
  // Reset all inline controls back to Add button
  document.querySelectorAll(".item-cart-control").forEach(ctrl => {
    const name = ctrl.dataset.name;
    if (name) {
      const price = ctrl.dataset.price;
      const safeId = ctrl.id;
      ctrl.innerHTML = `<button class="add-btn" onclick="addToCart('${name.replace(/'/g, "\\'")}', ${price}, '${safeId}')">+ Add</button>`;
    }
  });

  closeAddressModal();
}

function closeAddressModal() {
  document.getElementById("addressModal").style.display = "none";
  document.getElementById("addressInput").value = "";
  document.getElementById("addressInput").style.borderColor = "";
}

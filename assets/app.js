const Zap22 = (() => {
  const DATA_URL = "data/stores.json";

  const shareBtn = document.getElementById("shareBtn");

if (shareBtn) {
  shareBtn.addEventListener("click", async () => {
    const url = window.location.href;
    const title = document.title;

    // 📱 Se navegador suporta share nativo (celular)
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: "Olha essa loja no Zap22 👇",
          url: url,
        });
      } catch (err) {
        console.log("Compartilhamento cancelado");
      }
    } else {
      // 💻 fallback (copia link)
      navigator.clipboard.writeText(url);
      alert("Link copiado! Agora é só colar 👍");
    }
  });
}

  // ---------- Helpers ----------
  const money = (v) =>
    (Number(v || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const qs = (sel) => document.querySelector(sel);

  function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  async function loadData() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Não foi possível carregar o JSON de lojas.");
    return await res.json();
  }

  function cartKey(slug) {
    return `zap22_cart_${slug}`;
  }

  function neighborhoodKey(slug) {
    return `zap22_neighborhood_${slug}`;
  }

  function readCart(slug) {
    try {
      return JSON.parse(localStorage.getItem(cartKey(slug)) || "[]");
    } catch {
      return [];
    }
  }

  function writeCart(slug, cartItems) {
    localStorage.setItem(cartKey(slug), JSON.stringify(cartItems));
  }

  function readNeighborhood(slug) {
    return localStorage.getItem(neighborhoodKey(slug)) || "";
  }

  function writeNeighborhood(slug, neighborhoodName) {
    localStorage.setItem(neighborhoodKey(slug), neighborhoodName);
  }

  function upsertCartItem(slug, product, deltaQty) {
    const cart = readCart(slug);
    const idx = cart.findIndex((i) => i.productId === product.id);

    if (idx === -1 && deltaQty > 0) {
      cart.push({ productId: product.id, name: product.name, price: product.price, qty: deltaQty });
    } else if (idx !== -1) {
      cart[idx].qty += deltaQty;
      if (cart[idx].qty <= 0) cart.splice(idx, 1);
    }

    writeCart(slug, cart);
    return cart;
  }

  function clearCart(slug) {
    writeCart(slug, []);
  }

  function calcTotals(cart, fee) {
    const subtotal = cart.reduce((acc, it) => acc + it.price * it.qty, 0);
    const deliveryFee = Number(fee || 0);
    const total = subtotal + deliveryFee;
    return { subtotal, deliveryFee, total };
  }

  // ---------- Home ----------
  async function renderHome() {
    const grid = qs("#storesGrid");
    const badge = qs("#countBadge");
    const searchInput = qs("#searchInput");

    try {
      const data = await loadData();
      const stores = data.stores || [];
      badge.textContent = `${stores.length} lojas`;

      const render = (list) => {
        grid.innerHTML = "";

        list.forEach((s) => {
          const el = document.createElement("div");
          el.className = "card";

          // Logo (não corta) + fallback com letra
          const logoPath = (s.logo || "").trim();
          const logoHtml = logoPath
            ? `<div class="store-logo">
                 <img src="${escapeAttr(logoPath)}" alt="Logo ${escapeHtml(s.name)}" loading="lazy">
               </div>`
            : `<div class="store-logo fallback">
                 ${escapeHtml((s.name || "L").slice(0, 1).toUpperCase())}
               </div>`;

          // Card novo (sem "X bairros" e com endereço completo)
          el.innerHTML = `
            <div class="store-card">
              <div class="store-card-top">
                ${logoHtml}
                <div>
                  <h3 class="store-title">${escapeHtml(s.name)}</h3>
                  <div class="store-meta">${escapeHtml(s.category || "")}</div>
                  <div class="store-address">${escapeHtml(s.address || "")}</div>
                </div>
              </div>

              <div class="store-card-bottom">
                <a class="btn primary glow" href="loja.html?slug=${encodeURIComponent(s.slug)}">Ver loja</a>
              </div>
            </div>
          `;

          grid.appendChild(el);
        });

        badge.textContent = `${list.length} lojas`;
      };

      render(stores);

      searchInput?.addEventListener("input", (e) => {
        const q = (e.target.value || "").toLowerCase().trim();
        if (!q) return render(stores);

        const filtered = stores.filter(
          (s) =>
            (s.name || "").toLowerCase().includes(q) ||
            (s.category || "").toLowerCase().includes(q) ||
            (s.address || "").toLowerCase().includes(q) ||
            (s.slug || "").toLowerCase().includes(q)
        );

        render(filtered);
      });
    } catch (err) {
      grid.innerHTML = `<div class="card">Erro: ${escapeHtml(String(err.message || err))}</div>`;
      badge.textContent = "Erro";
    }
  }

  // ---------- Store page ----------
  async function renderStore() {
    const slug = getQueryParam("slug");
    if (!slug) {
      document.body.innerHTML =
        `<div class="container"><div class="card">Loja não encontrada (faltou ?slug=...).</div></div>`;
      return;
    }

    const els = {
      storeName: qs("#storeName"),
      storeMeta: qs("#storeMeta"),
      storeAddress: qs("#storeAddress"),
      mapFrame: qs("#mapFrame"),
      neighborhoodSelect: qs("#neighborhoodSelect"),
      neighborhoodInfo: qs("#neighborhoodInfo"),
      neighborhoodNotice: qs("#neighborhoodNotice"),
      productsGrid: qs("#productsGrid"),
      productsBadge: qs("#productsBadge"),
      cartItems: qs("#cartItems"),
      cartTotals: qs("#cartTotals"),
      cartStoreHint: qs("#cartStoreHint"),
      finishBtn: qs("#finishBtn"),
      clearBtn: qs("#clearBtn"),
      checkoutHint: qs("#checkoutHint"),
      cName: qs("#cName"),
      cPhone: qs("#cPhone"),
      cStreet: qs("#cStreet"),
      cNumber: qs("#cNumber"),
      cComp: qs("#cComp"),
      cRef: qs("#cRef"),
      cObs: qs("#cObs"),
      cPayment: qs("#cPayment"),
      checkoutSection: qs("#checkout"),
      toCheckoutBtn: qs("#toCheckoutBtn"),
      cartClose: qs("#cartClose"),
      cartDrawer: qs("#cartDrawer"),
      cartToggle: qs("#cartToggle"),
      cartbarTotal: qs("#cartbarTotal"),
      cartbarCount: qs("#cartbarCount"),
    };

    // Guard: se faltar container de produtos, não deixar o script quebrar silenciosamente
    if (!els.productsGrid) {
      document.body.innerHTML = `
        <div class="container">
          <div class="card">
            <h3 style="margin-top:0">Erro de HTML</h3>
            <p class="small">Não encontrei <b>#productsGrid</b> na sua loja.html.</p>
            <p class="small">Adicione: <code>&lt;div id="productsGrid" class="grid"&gt;&lt;/div&gt;</code></p>
          </div>
        </div>`;
      return;
    }

    let store;
    try {
      const data = await loadData();
      store = (data.stores || []).find((s) => s.slug === slug);
      if (!store) throw new Error("Loja não encontrada no JSON.");
    } catch (err) {
      document.body.innerHTML =
        `<div class="container"><div class="card">Erro: ${escapeHtml(String(err.message || err))}</div></div>`;
      return;
    }

    // Header info
    document.title = `zap22 • ${store.name}`;
    if (els.storeName) els.storeName.textContent = store.name;
    if (els.storeMeta) els.storeMeta.textContent = `${store.category} • WhatsApp: +${store.whatsapp}`;
    if (els.storeAddress) els.storeAddress.textContent = store.address;

    // Map (Google Maps embed sem API key)
    if (els.mapFrame) {
      const q = encodeURIComponent(`${store.lat},${store.lng}`);
      els.mapFrame.src = `https://www.google.com/maps?q=${q}&z=16&output=embed`;
    }

    // Neighborhood select
    if (els.neighborhoodSelect) {
      els.neighborhoodSelect.innerHTML =
        `<option value="">Selecione...</option>` +
        (store.deliveryNeighborhoods || [])
          .map((n) => `<option value="${escapeAttr(n.name)}">${escapeHtml(n.name)}</option>`)
          .join("");

      // restore neighborhood
      const savedN = readNeighborhood(slug);
      if (savedN) els.neighborhoodSelect.value = savedN;
    }

    // Products
    const products = store.products || [];
    if (els.productsBadge) els.productsBadge.textContent = `${products.length} itens`;

    // ✅ Produtos sempre visíveis
    const renderProducts = () => {
      els.productsGrid.innerHTML = "";

      if (!products.length) {
        els.productsGrid.innerHTML = `<div class="card"><div class="small">Nenhum produto cadastrado.</div></div>`;
        return;
      }

      products.forEach((p) => {
        const card = document.createElement("div");

        const imgHtml = p.image
          ? `<div class="product-img">
               <img src="${escapeAttr(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">
             </div>`
          : "";

        card.className = "card product-card";
        card.innerHTML = `
          ${imgHtml}
          <div class="product-body">
            <h3 style="margin:0 0 6px 0">${escapeHtml(p.name)}</h3>
            <div class="small">${escapeHtml(p.desc || "")}</div>
            <div class="spacer"></div>
            <div class="row" style="align-items:center; justify-content:space-between">
              <div style="font-weight:900">${money(p.price)}</div>
              <button class="btn primary glow" data-add="${escapeAttr(p.id)}">
                Adicionar
              </button>
            </div>
          </div>
        `;

        els.productsGrid.appendChild(card);
      });

      els.productsGrid.querySelectorAll("[data-add]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-add");
          const product = products.find((pp) => pp.id === id);
          if (!product) return;

          // ✅ Agora pode adicionar no carrinho SEM escolher bairro
          upsertCartItem(slug, product, 1);
          renderCartAndCheckout();
        });
      });
    };

    // Cart render + checkout availability
    const renderCartAndCheckout = () => {
      const cart = readCart(slug);
      const neighborhoodName = els.neighborhoodSelect?.value || "";
      const neighborhoodObj = (store.deliveryNeighborhoods || []).find((n) => n.name === neighborhoodName);
      const fee = neighborhoodObj?.fee || 0;

      // cart hint
      if (els.cartStoreHint) els.cartStoreHint.textContent = `Loja: ${store.name}`;

      // items
      if (els.cartItems) {
        els.cartItems.innerHTML = "";
        if (cart.length === 0) {
          els.cartItems.innerHTML = `<div class="small">Seu carrinho está vazio.</div>`;
        } else {
          cart.forEach((it) => {
            const row = document.createElement("div");
            row.className = "cart-item";
            row.innerHTML = `
              <div>
                <div class="name">${escapeHtml(it.name)}</div>
                <div class="muted">${money(it.price)} • qtd: ${it.qty}</div>
              </div>
              <div class="actions">
                <button class="qty" data-dec="${escapeAttr(it.productId)}">-</button>
                <button class="qty" data-inc="${escapeAttr(it.productId)}">+</button>
              </div>
            `;
            els.cartItems.appendChild(row);
          });
        }

        els.cartItems.querySelectorAll("[data-inc]").forEach((b) => {
          b.addEventListener("click", () => {
            const id = b.getAttribute("data-inc");
            const product = products.find((pp) => pp.id === id);
            if (!product) return;
            upsertCartItem(slug, product, 1);
            renderCartAndCheckout();
          });
        });

        els.cartItems.querySelectorAll("[data-dec]").forEach((b) => {
          b.addEventListener("click", () => {
            const id = b.getAttribute("data-dec");
            const product = products.find((pp) => pp.id === id);
            if (!product) return;
            upsertCartItem(slug, product, -1);
            renderCartAndCheckout();
          });
        });
      }

      // totals
      const totals = calcTotals(cart, fee);

      // ===== Atualiza Cartbar (topo) =====
      const itemsCount = cart.reduce((acc, it) => acc + it.qty, 0);
      if (els.cartbarCount) els.cartbarCount.textContent = String(itemsCount);
      if (els.cartbarTotal) els.cartbarTotal.textContent = money(totals.total);

      // botão "Enviar pedido" (leva ao checkout)
      if (els.toCheckoutBtn) els.toCheckoutBtn.disabled = cart.length === 0;

      if (els.cartTotals) {
        els.cartTotals.innerHTML = `
          <div class="line"><span>Subtotal</span><span>${money(totals.subtotal)}</span></div>
          <div class="line"><span>Taxa (${escapeHtml(neighborhoodName || "—")})</span><span>${money(totals.deliveryFee)}</span></div>
          <div class="line total"><span>Total</span><span>${money(totals.total)}</span></div>
        `;
      }

      // neighborhood info
      if (els.neighborhoodInfo && els.neighborhoodNotice) {
        if (!neighborhoodName) {
          els.neighborhoodInfo.textContent = "Selecione um bairro para ver a taxa e finalizar.";
          els.neighborhoodNotice.style.display = "block";
        } else {
          els.neighborhoodNotice.style.display = "none";
          els.neighborhoodInfo.textContent = `Taxa: ${money(neighborhoodObj.fee)}`;
        }
      }

      // ✅ Finalizar só libera com:
      // - carrinho não vazio
      // - bairro selecionado
      // - campos obrigatórios (*) preenchidos
      const cartNotEmpty = cart.length > 0;
      const hasNeighborhood = Boolean(neighborhoodName);

      const nameOk = Boolean((els.cName?.value || "").trim());
      const streetOk = Boolean((els.cStreet?.value || "").trim());
      const numberOk = Boolean((els.cNumber?.value || "").trim());
      const payOk = Boolean((els.cPayment?.value || "").trim());

      const canFinish = cartNotEmpty && hasNeighborhood && nameOk && streetOk && numberOk && payOk;
      if (els.finishBtn) els.finishBtn.disabled = !canFinish;

      if (els.checkoutHint) {
        els.checkoutHint.textContent =
          !cartNotEmpty
            ? "Adicione pelo menos 1 produto para finalizar."
            : !hasNeighborhood
              ? "Escolha o bairro para calcular a taxa e liberar o finalizar."
              : (!nameOk || !streetOk || !numberOk || !payOk)
                ? "Preencha os campos obrigatórios (*) para finalizar."
                : "Tudo certo! Clique em finalizar para abrir no WhatsApp.";
      }
};


    // ---------- Cart drawer (top) ----------
    const openCartDrawer = () => {
      if (!els.cartDrawer || !els.cartToggle) return;
      els.cartDrawer.hidden = false;
      els.cartToggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("cart-open");
    };

    const closeCartDrawer = () => {
      if (!els.cartDrawer || !els.cartToggle) return;
      els.cartDrawer.hidden = true;
      els.cartToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("cart-open");
    };

    els.cartToggle?.addEventListener("click", () => {
      const isOpen = els.cartToggle.getAttribute("aria-expanded") === "true";
      if (isOpen) closeCartDrawer();
      else openCartDrawer();
    });

    els.cartClose?.addEventListener("click", closeCartDrawer);

    // Fecha ao clicar fora (mobile/desktop)
    document.addEventListener("click", (e) => {
      if (!els.cartDrawer || els.cartDrawer.hidden) return;
      const withinDrawer = els.cartDrawer.contains(e.target);
      const withinToggle = els.cartToggle?.contains(e.target);
      if (!withinDrawer && !withinToggle) closeCartDrawer();
    });

    // neighborhood change listener
    els.neighborhoodSelect?.addEventListener("change", () => {
      writeNeighborhood(slug, els.neighborhoodSelect.value);
      // produtos ficam visíveis sempre; aqui só atualizamos taxas/totais
      renderCartAndCheckout();
    });

    // ✅ Atualiza o estado do botão Finalizar enquanto preenche
    ["input", "change"].forEach((evt) => {
      els.cName?.addEventListener(evt, renderCartAndCheckout);
      els.cStreet?.addEventListener(evt, renderCartAndCheckout);
      els.cNumber?.addEventListener(evt, renderCartAndCheckout);
      els.cPayment?.addEventListener(evt, renderCartAndCheckout);
    });


    // Botão "Enviar pedido" (no carrinho do topo) -> rola até o formulário
    els.toCheckoutBtn?.addEventListener("click", () => {
      const target = els.checkoutSection || document.querySelector("#checkout");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      // mantém o carrinho aberto para o usuário conferir, mas se quiser fechar, descomente:
      // closeCartDrawer();
    });

    // clear cart
    els.clearBtn?.addEventListener("click", () => {
      clearCart(slug);
      writeNeighborhood(slug, "");
      if (els.neighborhoodSelect) els.neighborhoodSelect.value = "";
      renderCartAndCheckout();
    });
// finish: build WhatsApp message
    els.finishBtn?.addEventListener("click", () => {
      const neighborhoodName = els.neighborhoodSelect?.value || "";
      const neighborhoodObj = (store.deliveryNeighborhoods || []).find((n) => n.name === neighborhoodName);
      const fee = neighborhoodObj?.fee || 0;
      const cart = readCart(slug);
      const payment = (els.cPayment?.value || "").trim();

      if (!neighborhoodName) {
        alert("Selecione um bairro para finalizar o pedido.");
        return;
      }
      if (cart.length === 0) return;

      const customer = {
        name: (els.cName?.value || "").trim(),
        phone: (els.cPhone?.value || "").trim(),
      };

      const delivery = {
        street: (els.cStreet?.value || "").trim(),
        number: (els.cNumber?.value || "").trim(),
        comp: (els.cComp?.value || "").trim(),
        ref: (els.cRef?.value || "").trim(),
        obs: (els.cObs?.value || "").trim(),
      };

      // valida obrigatórios aqui também
      if (!customer.name || !delivery.street || !delivery.number || !payment) {
        alert("Preencha os campos obrigatórios: Nome, Rua, Número e Forma de pagamento.");
        return;
      }

      const totals = calcTotals(cart, fee);

      // ===== Atualiza Cartbar (topo) =====
      const itemsCount = cart.reduce((acc, it) => acc + it.qty, 0);
      if (els.cartbarCount) els.cartbarCount.textContent = String(itemsCount);
      if (els.cartbarTotal) els.cartbarTotal.textContent = money(totals.total);

      // botão "Enviar pedido" (leva ao checkout)
      if (els.toCheckoutBtn) els.toCheckoutBtn.disabled = cart.length === 0;


      const lines = [];
      lines.push(`*Pedido via zap22*`);
      lines.push(`*Loja:* ${store.name}`);
      lines.push(`*Bairro:* ${neighborhoodName}`);
      lines.push(`*Pagamento:* ${payment}`);
      lines.push("");
      lines.push(`*Itens:*`);
      cart.forEach((it) => lines.push(`- ${it.qty}x ${it.name} (${money(it.price)})`));
      lines.push("");
      lines.push(` Subtotal: ${money(totals.subtotal)}`);
      lines.push(` Taxa: ${money(totals.deliveryFee)}`);
      lines.push(` *Total: ${money(totals.total)}*`);
      lines.push("");

      lines.push(` *Entrega:*`);
      lines.push(`Rua: ${delivery.street || "—"}, Nº: ${delivery.number || "—"}`);
      if (delivery.comp) lines.push(`Compl.: ${delivery.comp}`);
      if (delivery.ref) lines.push(`Ref.: ${delivery.ref}`);

      lines.push("");
      lines.push(` *Cliente:* ${customer.name || "—"}`);
      lines.push(` Tel: ${customer.phone || "—"}`);

      if (delivery.obs) {
        lines.push("");
        lines.push(` Obs.: ${delivery.obs}`);
      }

      const text = lines.join("\n");
      const url = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(text)}`;
      const win = window.open(url, "_blank");
      if (!win) window.location.href = url;
    });

    // initial render
    renderProducts(); // ✅ sempre
    renderCartAndCheckout();
  }

  // ---------- Security helpers (basic escaping) ----------
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replaceAll("`", "&#096;");
  }

  return { renderHome, renderStore };
})();

(function () {
  const KEY = "zap22_como_funciona_open";

  const acc = document.querySelector("#como-funciona.accordion");
  if (!acc) return;

  const btn = acc.querySelector(".accordion-btn");
  const panel = acc.querySelector(".accordion-panel");
  if (!btn || !panel) return;

  // pega o conteúdo atual do panel e cria estrutura animável
  let inner = panel.querySelector(".accordion-inner");
  if (!inner) {
    const content = document.createElement("div");
    content.className = "accordion-content";

    // move tudo que existe dentro do panel pra dentro do content
    while (panel.firstChild) content.appendChild(panel.firstChild);

    inner = document.createElement("div");
    inner.className = "accordion-inner";
    inner.appendChild(content);

    panel.appendChild(inner);
  }

  // mostrar panel (vamos controlar visual pelo inner)
  panel.hidden = false;

  function openAccordion(animated = true) {
    acc.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");

    // força medir altura real
    const h = inner.scrollHeight;

    if (!animated) {
      inner.style.transition = "none";
      inner.style.maxHeight = h + "px";
      inner.style.opacity = "1";
      // reativa transition
      requestAnimationFrame(() => (inner.style.transition = ""));
    } else {
      inner.style.maxHeight = h + "px";
      inner.style.opacity = "1";
    }

    sessionStorage.setItem(KEY, "1");
  }

  function closeAccordion() {
    acc.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");

    inner.style.maxHeight = "0px";
    inner.style.opacity = "0";

    sessionStorage.setItem(KEY, "0");
  }

  // clique
  btn.addEventListener("click", () => {
    const isOpen = btn.getAttribute("aria-expanded") === "true";
    if (isOpen) closeAccordion();
    else openAccordion(true);
  });

  // restaura estado da sessão
  const saved = sessionStorage.getItem(KEY);
  if (saved === "1") openAccordion(false);
  else closeAccordion();

  // se a tela mudar de tamanho, recalcula altura quando aberto
  window.addEventListener("resize", () => {
    const isOpen = btn.getAttribute("aria-expanded") === "true";
    if (!isOpen) return;
    inner.style.maxHeight = inner.scrollHeight + "px";
  });
})();

// Ano no footer
(function () {
  const el = document.getElementById("ano-footer");
  if (el) el.textContent = new Date().getFullYear();
})();
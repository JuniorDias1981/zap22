const Zap22 = (() => {
  const DATA_URL = "data/stores.json";

  const shareBtn = document.getElementById("shareBtn");

  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const url = window.location.href;
      const title = document.title;

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

  function clearCart(slug) {
    writeCart(slug, []);
  }

  function calcTotals(cart, fee) {
    const subtotal = cart.reduce((acc, it) => acc + it.price * it.qty, 0);
    const deliveryFee = Number(fee || 0);
    const total = subtotal + deliveryFee;
    return { subtotal, deliveryFee, total };
  }

  // 🔐 HELPER GLOBAL: Gerador de Token de Segurança (Checksum)
  const gerarTokenSeguranca = (valorTotal, lojaSlug) => {
    const slugLimpo = String(lojaSlug).trim().toLowerCase();
    const valorTexto = Number(valorTotal || 0).toFixed(2);
    const stringBase = `${valorTexto}-${slugLimpo}-zap22@seguro`;
    
    let hash = 0;
    for (let i = 0; i < stringBase.length; i++) {
      hash = (hash << 5) - hash + stringBase.charCodeAt(i);
      hash |= 0; 
    }
    return Math.abs(hash).toString(16).substring(0, 6).toUpperCase();
  };

  // ---------- Home ----------
  async function renderHome() {
    const grid = qs("#storesGrid");
    const badge = qs("#countBadge");
    const searchInput = qs("#searchInput");
    const sortSelect = qs("#sortOrder");
    const categoryContainer = qs("#categoryContainer");

    try {
      const data = await loadData();
      let allStores = data.stores || [];
      let currentFilter = "Todos";
      let currentSearch = "";
      let userLocation = null;

      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; 
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; 
      };

      const renderCategories = () => {
        if (!categoryContainer) return;
        const categories = ["Todos", ...new Set(allStores.map(s => s.category).filter(Boolean))];
        
        categoryContainer.innerHTML = categories.map(cat => `
          <button class="chip ${cat === currentFilter ? 'active' : ''}" data-cat="${cat}">
            ${cat}
          </button>
        `).join('');

        categoryContainer.querySelectorAll(".chip").forEach(btn => {
          btn.addEventListener("click", () => {
            currentFilter = btn.getAttribute("data-cat");
            applyFilters();
          });
        });
      };

      const applyFilters = () => {
        let filtered = [...allStores];

        if (userLocation) {
          filtered.forEach(s => {
            if (s.lat && s.lng) {
              s.distance = calculateDistance(userLocation.lat, userLocation.lng, parseFloat(s.lat), parseFloat(s.lng));
            } else {
              s.distance = Infinity;
            }
          });
        }

        if (currentFilter !== "Todos") {
          filtered = filtered.filter(s => s.category === currentFilter);
        }

        if (currentSearch) {
          filtered = filtered.filter(s => {
            const matchLoja = (s.name || "").toLowerCase().includes(currentSearch) ||
                              (s.category || "").toLowerCase().includes(currentSearch) ||
                              (s.address || "").toLowerCase().includes(currentSearch);

            const matchProduto = (s.products || []).some(p => 
              (p.name || "").toLowerCase().includes(currentSearch) ||
              (p.desc || "").toLowerCase().includes(currentSearch)
            );

            return matchLoja || matchProduto;
          });
        }

        const sortVal = sortSelect?.value;
        if (sortVal === "prox" && userLocation) {
          filtered.sort((a, b) => a.distance - b.distance);
        } else if (sortVal === "az") {
          filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        } else if (sortVal === "za") {
          filtered.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        }

        renderGrid(filtered);
        actualizeActiveChip();
      };

      const renderGrid = (list) => {
        if (!grid) return;
        grid.innerHTML = "";
        
        if (list.length === 0) {
          grid.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align:center;">Nenhum comércio encontrado.</div>`;
          if (badge) badge.textContent = "0 lojas";
          return;
        }

        list.forEach((s) => {
          const el = document.createElement("div");
          el.className = "card";
          
          const logoPath = (s.logo || "").trim();
          const logoHtml = logoPath
            ? `<div class="store-logo"><img src="${escapeAttr(logoPath)}" alt="Logo ${escapeHtml(s.name)}" loading="lazy"></div>`
            : `<div class="store-logo fallback">${escapeHtml((s.name || "L").slice(0, 1).toUpperCase())}</div>`;

          const distanceHtml = (userLocation && s.distance && s.distance !== Infinity)
            ? `<div class="store-distance" style="font-size: 11px; color: #ff5722; font-weight: bold; margin-top: 2px;">A ${s.distance.toFixed(1)} km de você</div>`
            : "";

          el.innerHTML = `
            <div class="store-card">
              <div class="store-card-top">
                ${logoHtml}
                <div>
                  <h3 class="store-title">${escapeHtml(s.name)}</h3>
                  <div class="store-meta">${escapeHtml(s.category || "")}</div>
                  ${distanceHtml}
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
        if (badge) badge.textContent = `${list.length} lojas`;
      };

      const actualizeActiveChip = () => {
        if (!categoryContainer) return;
        categoryContainer.querySelectorAll(".chip").forEach(btn => {
          btn.classList.toggle("active", btn.getAttribute("data-cat") === currentFilter);
        });
      };

      const initGeolocation = () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              
              if (sortSelect) {
                if (!sortSelect.querySelector('option[value="prox"]')) {
                  const opt = document.createElement("option");
                  opt.value = "prox";
                  opt.textContent = "Mais próximos de mim";
                  sortSelect.appendChild(opt);
                }
                sortSelect.value = "prox";
              }
              applyFilters();
            },
            (error) => {
              console.warn("Geolocalização recusada ou indisponível:", error.message);
            }
          );
        }
      };

      searchInput?.addEventListener("input", (e) => {
        currentSearch = (e.target.value || "").toLowerCase().trim();
        applyFilters();
      });

      sortSelect?.addEventListener("change", applyFilters);

      renderCategories();
      applyFilters();
      initGeolocation();

    } catch (err) {
      console.error(err);
      if (grid) grid.innerHTML = `<div class="card">Erro ao carregar lojas.</div>`;
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

    if (!els.productsGrid) {
      document.body.innerHTML = `
        <div class="container">
          <div class="card">
            <h3 style="margin-top:0">Erro de HTML</h3>
            <p class="small">Não encontrei <b>#productsGrid</b> na sua loja.html.</p>
            <p class="small">Adicione: <code><div id="productsGrid" class="grid"></div></code></p>
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

    document.title = `${store.name} | Zap22 Delivery`;
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", `Faça seu pedido online na ${store.name} pelo Zap22. Confira nosso cardápio completo de lanches, refeições e pizzas!`);
    }

    if (els.storeName) els.storeName.textContent = store.name;
    if (els.storeMeta) els.storeMeta.textContent = `${store.category} • WhatsApp: +${store.whatsapp}`;
    if (els.storeAddress) els.storeAddress.textContent = store.address;

    if (els.mapFrame) {
      const q = encodeURIComponent(`${store.lat},${store.lng}`);
      els.mapFrame.src = `https://www.google.com/maps?q=${q}&z=16&output=embed`;
    }

    if (els.neighborhoodSelect) {
      els.neighborhoodSelect.innerHTML =
        `<option value="">Selecione...</option>` +
        (store.deliveryNeighborhoods || [])
          .map((n) => `<option value="${escapeAttr(n.name)}">${escapeHtml(n.name)}</option>`)
          .join("");

      const savedN = readNeighborhood(slug);
      if (savedN) els.neighborhoodSelect.value = savedN;
    }

    const products = store.products || [];
    if (els.productsBadge) els.productsBadge.textContent = `${products.length} itens`;

    function adicionarAoCarrinhoComObsFixa(product, observacaoItem) {
      const cart = readCart(slug);
      const idx = cart.findIndex((i) => i.productId === product.id && (i.obsItem || "") === observacaoItem);

      if (idx === -1) {
        cart.push({ 
          productId: product.id, 
          name: product.name, 
          price: product.price, 
          qty: 1,
          obsItem: observacaoItem 
        });
      } else {
        cart[idx].qty += 1;
      }

      writeCart(slug, cart);
      renderCartAndCheckout();
    }

    const renderProducts = () => {
      els.productsGrid.innerHTML = "";

      if (!products.length) {
        els.productsGrid.innerHTML = `<div class="card"><div class="small">Nenhum produto cadastrado.</div></div>`;
        return;
      }

      products.forEach((p) => {
        const card = document.createElement("div");
        const imgHtml = p.image
          ? `<div class="product-img"><img src="${escapeAttr(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy"></div>`
          : "";

        const obsInputHtml = p.requiresObs === true
          ? `<div class="product-obs-container" style="margin: 8px 0 4px 0;">
               <input type="text" id="input-obs-${p.id}" class="input store-product-obs-input" placeholder="Ex: Sem cebola, ponto da carne..." style="width: 100%; font-size: 13px; padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;" />
             </div>`
          : "";

        card.className = "card product-card";
        
        card.innerHTML = `
          ${imgHtml}
          <div class="product-body" style="padding: 12px; display: flex; flex-direction: column;">
            <h3 style="margin: 0 0 6px 0; font-size: 16px;">${escapeHtml(p.name)}</h3>
            <div class="small" style="color: #666; margin-bottom: 8px; line-height: 1.4;">${escapeHtml(p.desc || "")}</div>
            
            ${obsInputHtml}
            
            <div class="row" style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px; gap: 8px;">
              <div style="font-weight: 900; font-size: 16px; color: #333;">${money(p.price)}</div>
              <button class="btn primary glow" data-add="${escapeAttr(p.id)}" style="margin: 0; white-space: nowrap;">Adicionar</button>
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

          let obsValue = "";
          const targetInput = document.getElementById(`input-obs-${product.id}`);
          if (targetInput) {
            obsValue = targetInput.value.trim();
            targetInput.value = ""; 
          }

          adicionarAoCarrinhoComObsFixa(product, obsValue); 
        });
      });
    };

    const renderCartAndCheckout = () => {
      const cart = readCart(slug);
      const neighborhoodName = els.neighborhoodSelect?.value || "";
      const neighborhoodObj = (store.deliveryNeighborhoods || []).find((n) => n.name === neighborhoodName);
      const fee = neighborhoodObj?.fee || 0;

      if (els.cartStoreHint) els.cartStoreHint.textContent = `Loja: ${store.name}`;

      if (els.cartItems) {
        els.cartItems.innerHTML = "";
        if (cart.length === 0) {
          els.cartItems.innerHTML = `<div class="small">Seu carrinho está vazio.</div>`;
        } else {
          cart.forEach((it, index) => {
            const row = document.createElement("div");
            row.className = "cart-item";
            const displayObs = it.obsItem ? `<div class="small" style="color: #ff5722; font-style: italic;">• Obs: ${escapeHtml(it.obsItem)}</div>` : "";
            
            row.innerHTML = `
              <div>
                <div class="name">${escapeHtml(it.name)}</div>
                ${displayObs}
                <div class="muted">${money(it.price)} • qtd: ${it.qty}</div>
              </div>
              <div class="actions">
                <button class="qty" data-dec-idx="${index}">-</button>
                <button class="qty" data-inc-idx="${index}">+</button>
              </div>
            `;
            els.cartItems.appendChild(row);
          });
        }

        els.cartItems.querySelectorAll("[data-inc-idx]").forEach((b) => {
          b.addEventListener("click", () => {
            const idx = parseInt(b.getAttribute("data-inc-idx"), 10);
            const cartList = readCart(slug);
            if (cartList[idx]) {
              cartList[idx].qty += 1;
              writeCart(slug, cartList);
              renderCartAndCheckout();
            }
          });
        });

        els.cartItems.querySelectorAll("[data-dec-idx]").forEach((b) => {
          b.addEventListener("click", () => {
            const idx = parseInt(b.getAttribute("data-dec-idx"), 10);
            const cartList = readCart(slug);
            if (cartList[idx]) {
              cartList[idx].qty -= 1;
              if (cartList[idx].qty <= 0) cartList.splice(idx, 1);
              writeCart(slug, cartList);
              renderCartAndCheckout();
            }
          });
        });
      }

      const totals = calcTotals(cart, fee);

      const itemsCount = cart.reduce((acc, it) => acc + it.qty, 0);
      if (els.cartbarCount) els.cartbarCount.textContent = String(itemsCount);
      if (els.cartbarTotal) els.cartbarTotal.textContent = money(totals.total);

      if (els.toCheckoutBtn) els.toCheckoutBtn.disabled = cart.length === 0;

      if (els.cartTotals) {
        els.cartTotals.innerHTML = `
          <div class="line"><span>Subtotal</span><span>${money(totals.subtotal)}</span></div>
          <div class="line"><span>Taxa (${escapeHtml(neighborhoodName || "—")})</span><span>${money(totals.deliveryFee)}</span></div>
          <div class="line total"><span>Total</span><span>${money(totals.total)}</span></div>
        `;
      }

      if (els.neighborhoodInfo && els.neighborhoodNotice) {
        if (!neighborhoodName) {
          els.neighborhoodInfo.textContent = "Selecione um bairro para ver a taxa e finalizar.";
          els.neighborhoodNotice.style.display = "block";
        } else {
          els.neighborhoodNotice.style.display = "none";
          els.neighborhoodInfo.textContent = `Taxa: ${money(neighborhoodObj.fee)}`;
        }
      }

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

    document.addEventListener("click", (e) => {
      if (!els.cartDrawer || els.cartDrawer.hidden) return;
      const withinDrawer = els.cartDrawer.contains(e.target);
      const withinToggle = els.cartToggle?.contains(e.target);
      if (!withinDrawer && !withinToggle) closeCartDrawer();
    });

    els.neighborhoodSelect?.addEventListener("change", () => {
      writeNeighborhood(slug, els.neighborhoodSelect.value);
      renderCartAndCheckout();
    });

    ["input", "change"].forEach((evt) => {
      els.cName?.addEventListener(evt, renderCartAndCheckout);
      els.cStreet?.addEventListener(evt, renderCartAndCheckout);
      els.cNumber?.addEventListener(evt, renderCartAndCheckout);
      els.cPayment?.addEventListener(evt, renderCartAndCheckout);
    });

    els.toCheckoutBtn?.addEventListener("click", () => {
      const target = els.checkoutSection || document.querySelector("#checkout");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    els.clearBtn?.addEventListener("click", () => {
      clearCart(slug);
      writeNeighborhood(slug, "");
      if (els.neighborhoodSelect) els.neighborhoodSelect.value = "";
      renderCartAndCheckout();
    });

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

      if (!customer.name || !delivery.street || !delivery.number || !payment) {
        alert("Preencha os campos obrigatórios: Nome, Rua, Número e Forma de pagamento.");
        return;
      }

      const totals = calcTotals(cart, fee);
      const tokenValidacao = gerarTokenSeguranca(totals.total, slug);

      const itemsCount = cart.reduce((acc, it) => acc + it.qty, 0);
      if (els.cartbarCount) els.cartbarCount.textContent = String(itemsCount);
      if (els.cartbarTotal) els.cartbarTotal.textContent = money(totals.total);

      if (els.toCheckoutBtn) els.toCheckoutBtn.disabled = cart.length === 0;

      // 🛠️ MENSAGEM DO WHATSAPP ATUALIZADA: Todos os emojis e símbolos especiais foram removidos
      const lines = [];
      lines.push(`*AVISO IMPORTANTE: NAO ALTERE NADA NESTA MENSAGEM*`);
      lines.push(`_Este pedido contem uma assinatura digital de seguranca. Se voce modificar o valor ou a chave abaixo, o sistema do comercio acusara fraude e seu pedido sera recusado automaticamente._`);
      lines.push(`----------------------------------`);
      lines.push("");
      lines.push(`*NOVO PEDIDO - ZAP22*`); 
      lines.push(`*Loja:* ${store.name}`);
      lines.push("");
      
      lines.push(`*CLIENTE E ENTREGA:*`);
      lines.push(`Cliente: ${customer.name}`);
      if (customer.phone) lines.push(`Tel: ${customer.phone}`);
      lines.push(`Endereco: ${delivery.street}, Num ${delivery.number}`);
      lines.push(`Bairro: ${neighborhoodName}`);
      if (delivery.comp) lines.push(`Compl.: ${delivery.comp}`);
      if (delivery.ref) lines.push(`Ref.: ${delivery.ref}`);
      if (delivery.obs) lines.push(`Obs. de Entrega: ${delivery.obs}`);
      lines.push("");
      
      lines.push(`*ITENS DO PEDIDO:*`);
      cart.forEach((it) => {
        lines.push(`- ${it.qty}x ${it.name} (${money(it.price)})`);
        if (it.obsItem) {
          lines.push(`  - Obs: ${it.obsItem}`);
        }
      });
      
      lines.push("");
      lines.push(`*VALORES E PAGAMENTO:*`);
      lines.push(`Subtotal: ${money(totals.subtotal)}`);
      lines.push(`Taxa de Entrega: ${money(totals.deliveryFee)}`);
      lines.push(`*Total: ${money(totals.total)}*`);
      lines.push(`Forma de Pagamento: ${payment}`);

      lines.push("");
      lines.push(`----------------------------------`);
      lines.push(`*CHAVE DE SEGURANCA:* #${tokenValidacao}`);
      lines.push(`_(Codigo gerado pelo sistema Zap22)_`);

      const text = lines.join("\n");
      const url = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(text)}`;
      const win = window.open(url, "_blank");
      if (!win) window.location.href = url;
    });

    renderStoreLayoutFixes();
    renderProducts();
    renderCartAndCheckout();
  }

  function renderStoreLayoutFixes() {
    const styleId = "zap22-store-dynamic-styles";
    if (document.getElementById(styleId)) return;
    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = `
      .store-product-obs-input:focus {
        border-color: #ff5722 !important;
        outline: none;
        box-shadow: 0 0 4px rgba(255,87,34,0.2);
      }
    `;
    document.head.appendChild(styleEl);
  }

  // ---------- Security helpers (basic escaping) ----------
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&")
      .replaceAll("<", "<")
      .replaceAll(">", ">")
      .replaceAll('"', "\"")
      .replaceAll("'", "'");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replaceAll("`", "`");
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

  let inner = panel.querySelector(".accordion-inner");
  if (!inner) {
    const content = document.createElement("div");
    content.className = "accordion-content";

    while (panel.firstChild) content.appendChild(panel.firstChild);

    inner = document.createElement("div");
    inner.className = "accordion-inner";
    inner.appendChild(content);

    panel.appendChild(inner);
  }

  panel.hidden = false;

  function openAccordion(animated = true) {
    acc.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");

    const h = inner.scrollHeight;

    if (!animated) {
      inner.style.transition = "none";
      inner.style.maxHeight = h + "px";
      inner.style.opacity = "1";
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

  btn.addEventListener("click", () => {
    const isOpen = btn.getAttribute("aria-expanded") === "true";
    if (isOpen) closeAccordion();
    else openAccordion(true);
  });

  const saved = sessionStorage.getItem(KEY);
  if (saved === "1") openAccordion(false);
  else closeAccordion();

  window.addEventListener("resize", () => {
    const isOpen = btn.getAttribute("aria-expanded") === "true";
    if (!isOpen) return;
    inner.style.maxHeight = inner.scrollHeight + "px";
  });
})();

(function () {
  const el = document.getElementById("ano-footer");
  if (el) el.textContent = new Date().getFullYear();
})();
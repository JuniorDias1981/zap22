fetch("data/comercios.json")
  .then(res => res.json())
  .then(comercios => {
    const container = document.getElementById("cards-container");

    comercios.forEach(c => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
  <div class="card-img">
    <img src="${c.imagem}" alt="${c.nome}">
  </div>

  <div class="card-body">
    <h3>${c.nome}</h3>
    <span class="chip">🍺 ${c.categoria}</span>

    <p class="bairro">📍 ${c.bairro}</p>
    <p class="endereco">📌 ${c.endereco}</p>

    <p class="info">${c.info}</p>
    <a href="${c.url}">
  Ver cardápio
</a>
  </div>
`;


      container.appendChild(card);
    });
  });

/* =========================
   ANO FOOTER
========================= */
const anoFooter = document.getElementById("ano-footer");
if (anoFooter) anoFooter.textContent = new Date().getFullYear();
const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");

fetch("data/comercios.json")
  .then(res => res.json())
  .then(comercios => {
    const comercio = comercios.find(c => c.slug === slug);

    document.getElementById("comercio-info").innerHTML = `
      <h2>${comercio.nome}</h2>
      <p>${comercio.categoria}</p>
    `;
  });

fetch("data/produtos.json")
  .then(res => res.json())
  .then(produtos => {
    const lista = produtos[slug];
    const container = document.getElementById("produtos");

    lista.forEach(item => {
      const div = document.createElement("div");
      div.classList.add("produto");

      div.innerHTML = `
        <p>${item.nome}</p>
        <strong>R$ ${item.preco.toFixed(2)}</strong>
        <a href="https://wa.me/5599999999999?text=Quero%20${item.nome}">
          Pedir no WhatsApp
        </a>
      `;

      container.appendChild(div);
    });
  });

let carrinho = [];
let dados = {};

// CARREGAR DADOS
fetch("data.json")
  .then(r => r.json())
  .then(json => {
    dados = json;
    carregarBairrosHeader();
    carregarBairrosFormulario();
    carregarProdutos();
  });

// BAIRROS HEADER
function carregarBairrosHeader() {
  const select = document.getElementById("select-bairro");
  select.innerHTML = "<option value=''>Bairro</option>";
  dados.bairros.forEach(b => {
    const o = document.createElement("option");
    o.value = b.nome;
    o.textContent = b.nome;
    select.appendChild(o);
  });
}

// BAIRROS FORMULÁRIO
function carregarBairrosFormulario() {
  const select = document.getElementById("bairro-form");
  select.innerHTML = "<option value=''>Selecione o bairro</option>";
  dados.bairros.forEach(b => {
    const o = document.createElement("option");
    o.value = b.nome;
    o.dataset.taxa = b.taxa;
    o.textContent = `${b.nome} (R$ ${b.taxa.toFixed(2)})`;
    select.appendChild(o);
  });
  select.addEventListener("change", atualizarCarrinho);
}

// PRODUTOS
function carregarProdutos() {
  const area = document.getElementById("produtos");
  area.innerHTML = "";
  dados.produtos.forEach(p => {
    area.innerHTML += `
      <div class="produto-card">
        <img src="${p.imagem}" alt="${p.nome}">
        <div class="produto-info">
          <span>${p.nome}</span>
          <strong>R$ ${p.preco.toFixed(2)}</strong>
          <button onclick="addProduto(${p.id})">Adicionar</button>
        </div>
      </div>
    `;
  });
}

// CARRINHO
function addProduto(id) {
  const p = dados.produtos.find(i => i.id === id);
  const item = carrinho.find(i => i.id === id);
  if (item) item.qtd++; else carrinho.push({ ...p, qtd:1 });
  atualizarCarrinho();
}

function removerProduto(id) {
  const item = carrinho.find(i => i.id === id);
  if (!item) return;
  item.qtd--;
  if (item.qtd===0) carrinho = carrinho.filter(i=>i.id!==id);
  atualizarCarrinho();
}

function limparCarrinho() {
  carrinho=[];
  atualizarCarrinho();
}

// ATUALIZAR CARRINHO
function atualizarCarrinho() {
  document.getElementById("cart-count").textContent = carrinho.reduce((s,i)=>s+i.qtd,0);
  const area = document.getElementById("carrinho-itens");
  area.innerHTML="";
  carrinho.forEach(i=>{
    area.innerHTML += `
      <div class="item">
        <span>${i.nome}</span>
        <div class="qty">
          <button onclick="removerProduto(${i.id})">−</button>
          <span>${i.qtd}</span>
          <button onclick="addProduto(${i.id})">+</button>
        </div>
      </div>
    `;
  });
  const subtotal = carrinho.reduce((t,i)=>t+i.preco*i.qtd,0);
  const taxa = obterTaxa();
  const total = subtotal + taxa;
  document.getElementById("carrinho-resumo").innerHTML = `
    Subtotal: R$ ${subtotal.toFixed(2)}<br>
    Entrega: R$ ${taxa.toFixed(2)}<br>
    <strong>Total: R$ ${total.toFixed(2)}</strong>
  `;
}

// TAXA
function obterTaxa() {
  const select = document.getElementById("bairro-form");
  return select.selectedOptions[0]?.dataset.taxa ? Number(select.selectedOptions[0].dataset.taxa) : 0;
}

// ABRIR / FECHAR CARRINHO
function abrirCarrinho() {
  document.getElementById("carrinho").classList.add("open");
  document.getElementById("overlay").classList.add("show");
  const bairroHeader = document.getElementById("select-bairro").value;
  if (bairroHeader) document.getElementById("bairro-form").value = bairroHeader;
  atualizarCarrinho();
}

function fecharCarrinho() {
  document.getElementById("carrinho").classList.remove("open");
  document.getElementById("overlay").classList.remove("show");
}

// FORMULÁRIO
function mostrarFormulario() {
  document.getElementById("formulario").classList.remove("hidden");
  atualizarCarrinho();
}

function enviarPedido() {
  const nome = document.getElementById("nome").value.trim();
  const endereco = document.getElementById("endereco").value.trim();
  const bairro = document.getElementById("bairro-form").value;
  const pagamento = document.getElementById("pagamento").value;
  const obs = document.getElementById("observacoes").value.trim();

  if (!nome || !endereco || !bairro || !pagamento || carrinho.length===0){
    alert("Preencha todos os campos e adicione produtos");
    return;
  }

  let msg = `🛒 *Pedido*\nNome: ${nome}\nEndereço: ${endereco}\nBairro: ${bairro}\nPagamento: ${pagamento}\n\nItens:\n`;
  carrinho.forEach(i=>{
    msg += `• ${i.nome} x${i.qtd} — R$ ${(i.preco*i.qtd).toFixed(2)}\n`;
  });
  const subtotal = carrinho.reduce((t,i)=>t+i.preco*i.qtd,0);
  const taxa = obterTaxa();
  const total = subtotal + taxa;
  if(obs) msg += `\nObservações: ${obs}`;
  msg += `\n\nSubtotal: R$ ${subtotal.toFixed(2)}\nEntrega: R$ ${taxa.toFixed(2)}\nTotal: R$ ${total.toFixed(2)}`;
  
  window.open(`https://wa.me/${dados.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
}

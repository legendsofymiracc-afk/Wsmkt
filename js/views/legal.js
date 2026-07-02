function renderTerms(container) {
    container.innerHTML = renderPanel('Termos de Uso', `
        <div style="padding:20px;color:#ccc;font-size:13px;line-height:1.7;">
            <h3 style="color:var(--gold)">1. Uso do Mercado</h3>
            <p>O Mercado Warspear é uma plataforma independente de intermediação entre compradores e vendedores de itens do jogo Warspear Online. Não temos vínculo oficial com a AIGRIND LLC.</p>
            <h3 style="color:var(--gold)">2. Responsabilidade</h3>
            <p>As transações são realizadas diretamente entre as partes via WhatsApp. O Mercado Warspear não se responsabiliza por golpes, vendas fraudulentas ou itens não entregues. Verifique a reputação do vendedor antes de comprar.</p>
            <h3 style="color:var(--gold)">3. Vendedores</h3>
            <p>Vendedores passam por aprovação administrativa. O administrador reserva-se o direito de remover qualquer anúncio ou vendedor a qualquer momento.</p>
            <h3 style="color:var(--gold)">4. Preços</h3>
            <p>Os preços são definidos pelos vendedores. O Mercado Warspear não cobra comissão sobre as vendas.</p>
            <h3 style="color:var(--gold)">5. Dados</h3>
            <p>Armazenamos apenas os dados necessários para o funcionamento da plataforma: email, nome, WhatsApp e itens anunciados. Nenhum dado é compartilhado com terceiros.</p>
        </div>
    `, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
}

function renderPrivacy(container) {
    container.innerHTML = renderPanel('Política de Privacidade', `
        <div style="padding:20px;color:#ccc;font-size:13px;line-height:1.7;">
            <h3 style="color:var(--gold)">Dados coletados</h3>
            <p>Coletamos: email (login), nome de exibição, número de WhatsApp (vendedores), itens anunciados e avaliações.</p>
            <h3 style="color:var(--gold)">Uso dos dados</h3>
            <p>Os dados são usados exclusivamente para o funcionamento da plataforma: autenticação, exibição de anúncios e contato entre compradores e vendedores.</p>
            <h3 style="color:var(--gold)">Armazenamento</h3>
            <p>Dados armazenados em banco SQLite local. Senhas são hash bcrypt. Nenhum dado é enviado para serviços externos.</p>
            <h3 style="color:var(--gold)">Cookies</h3>
            <p>Usamos apenas cookie de sessão PHP (PHPSESSID) para manter sua autenticação. Nenhum cookie de rastreamento.</p>
        </div>
    `, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
}

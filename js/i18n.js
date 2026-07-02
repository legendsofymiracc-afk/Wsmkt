const I18N = (() => {
    const STORAGE_KEY = 'mercado_language';
    const LEGACY_STORAGE_KEY = 'lang';
    let menuOpen = false;

    const languages = [
        { code: 'id', label: 'indonésio', native: 'Indonesia' },
        { code: 'de', label: 'Alemão', native: 'Deutsch' },
        { code: 'en', label: 'Inglês', native: 'English' },
        { code: 'es', label: 'Espanhol', native: 'Español' },
        { code: 'pt', label: 'Português', native: 'Português' },
        { code: 'ru', label: 'Русский', native: 'Русский' },
        { code: 'uk', label: 'Ucraniano', native: 'Українська' },
        { code: 'vi', label: 'Tiếng Việt', native: 'Tiếng Việt' },
        { code: 'zh', label: '中文', native: '中文' }
    ];

    const translations = {
        pt: {
            appName: 'Mercado Warspear',
            languageTitle: 'Idiomas',
            warspearDatabase: 'Base de dados do Warspear',
            calculator: 'Calculadora',
            items: 'Itens',
            skills: 'Habilidades',
            warSpear: 'Mente de Lança de Guerra',
            fanWarspear: 'Fan Warspear Online',
            buyCoffee: 'Compre-me um café',
            home: 'Início',
            catalog: 'Catálogo',
            market: 'Mercado',
            searchMarket: 'Procurar no mercado',
            searchItems: 'Buscar itens...',
            search: 'Buscar',
            favorites: 'Favoritos',
            cart: 'Meu Carrinho',
            cartShort: 'Carrinho',
            top: 'Topo',
            account: 'Conta',
            access: 'Acesso',
            myAds: 'Meus Anúncios',
            sellerPanel: 'Painel do Vendedor',
            adminPanel: 'Painel Administrativo',
            admin: 'Admin',
            seller: 'Vendedor',
            buyer: 'Comprador',
            owner: 'Dono (Admin)',
            enter: 'Entrar',
            createAccount: 'Criar Conta',
            login: 'Entrar',
            logout: 'SAIR',
            close: 'FECHAR',
            back: 'VOLTAR',
            menu: 'Menu',
            email: 'E-mail',
            password: 'Senha',
            currentPassword: 'Senha atual',
            newPassword: 'Nova Senha',
            confirmPassword: 'Confirmar senha',
            username: 'Nome de usuário',
            name: 'Nome',
            profile: 'Perfil',
            changePassword: 'Alterar senha',
            changePasswordShort: 'Mudar senha',
            change: 'Mudar',
            giveUp: 'Desistir',
            buyerAccount: 'Conta de comprador',
            marketAccess: 'Acesso ao Mercado',
            noAccount: 'Não tem conta?',
            alreadyAccount: 'Já tem conta?',
            quickLogin: 'Entrar / Cadastrar',
            loginSuccess: 'Login realizado!',
            loginDone: 'Login efetuado',
            registerSuccess: 'Cadastro realizado!',
            passwordChanged: 'Senha alterada com sucesso!',
            informEmailPassword: 'Informe email e senha',
            typeEmail: 'Digite seu email',
            typeName: 'Digite seu nome',
            typePassword: 'Digite uma senha',
            typeYourPassword: 'Digite sua senha',
            fillAll: 'Preencha todos os campos',
            passwordMin: 'Senha deve ter ao menos 6 caracteres',
            newPasswordMin: 'Nova senha deve ter ao menos 6 caracteres',
            passwordsDontMatch: 'Senhas não conferem',
            differentPassword: 'A nova senha deve ser diferente da atual',
            wrongLogin: 'Email ou senha incorretos',
            loginError: 'Erro ao fazer login',
            registerError: 'Erro ao cadastrar',
            loginRegisterError: 'Erro ao fazer login/cadastro',
            changePasswordError: 'Erro ao trocar senha',
            loginRequired: 'Faça login para acessar essa área',
            loginToBuy: 'Faça login para comprar',
            loginToFavorites: 'Faça login para ver favoritos',
            loginToCart: 'Faça login para adicionar ao carrinho',
            loginToReview: 'Faça login para avaliar',
            loginFirst: 'Faça login primeiro',
            sellerOnly: 'Área liberada apenas para vendedores aprovados',
            ownerOnly: 'Área liberada apenas para o dono do sistema',
            recentlyViewed: 'Vistos recentemente',
            clear: 'Limpar',
            historyCleared: 'Histórico limpo',
            becomeSeller: 'Quero me tornar um vendedor',
            wantSell: 'Quero vender',
            sellerRequestPending: 'Solicitação de vendedor em análise',
            sellerRequestTitle: 'Quero me tornar vendedor',
            sellerRequestHelp: 'Seu acesso de venda será liberado somente após aprovação do administrador.',
            storeName: 'Nome da loja',
            whatsapp: 'WhatsApp',
            message: 'Mensagem',
            sendRequest: 'Enviar solicitação',
            sellerRequestSent: 'Solicitação enviada! Aguarde aprovação do administrador.',
            onlyBuyers: 'Essa solicitação é apenas para compradores',
            requestAlreadyPending: 'Sua solicitação já está em análise',
            cancel: 'Cancelar',
            confirm: 'Confirmar',
            confirmation: 'Confirmação',
            sortBy: 'Ordenar por',
            defaultSort: 'Padrão',
            lowestPrice: 'Menor preço',
            highestPrice: 'Maior preço',
            nameAz: 'Nome A-Z',
            nameZa: 'Nome Z-A',
            lowestLevel: 'Menor nível',
            highestLevel: 'Maior nível',
            server: 'Servidor',
            all: 'Todos',
            minPrice: 'Preço mín',
            maxPrice: 'Preço máx',
            soldOut: 'ESGOTADO',
            loadMore: 'Carregar mais',
            loading: 'Carregando...',
            buyWhatsapp: 'Comprar no WhatsApp',
            addCart: 'Adicionar ao carrinho',
            addedCart: 'Adicionado ao carrinho!',
            removedCart: 'Removido do carrinho',
            emptyCart: 'Carrinho vazio',
            yourCartEmpty: 'Seu carrinho está vazio.',
            checkoutWhatsapp: 'Finalizar no WhatsApp',
            whatsappMissing: 'WhatsApp não configurado',
            share: 'Compartilhar',
            linkCopied: 'Link copiado para a area de transferencia!',
            copyError: 'Erro ao copiar link.',
            details: 'Detalhes',
            price: 'Preço',
            coins: 'Moedas',
            stock: 'Estoque',
            category: 'Categoria',
            reviews: 'Avaliações',
            noReviews: 'Nenhuma avaliação ainda.',
            reviewsLoadError: 'Erro ao carregar avaliações.',
            review: 'Avaliar',
            reviewSent: 'Avaliação enviada!',
            sendReviewError: 'Erro ao enviar avaliação',
            noItems: 'Nenhum item encontrado.',
            noItemsRegistered: 'Nenhum item cadastrado.',
            itemNotFound: 'Item nao encontrado',
            loadItemsError: 'Erro ao carregar itens',
            loadMoreError: 'Erro ao carregar mais itens',
            loadCategoriesError: 'Não foi possível carregar as categorias',
            favoritesLogin: 'Faça login para ver seus favoritos.',
            removedFavorite: 'Removido dos favoritos',
            addedFavorite: 'Adicionado aos favoritos',
            updateFavoriteError: 'Erro ao atualizar favoritos',
            searchMin: 'Digite pelo menos 2 caracteres para buscar',
            searchError: 'Erro ao buscar itens',
            results: 'Resultados',
            chat: 'Chat',
            useChatLogin: 'Faça login para usar o chat',
            sendMessageError: 'Erro ao enviar mensagem',
            terms: 'Termos de Uso',
            privacy: 'Política de Privacidade',
            overview: 'Visão geral',
            quickActions: 'Ações rápidas',
            createItem: 'Criar item',
            newItem: 'Novo Item',
            itemsAdmin: 'Itens',
            categories: 'Categorias',
            sellers: 'Vendedores',
            settings: 'Configurações',
            coupons: 'Cupons',
            dashboard: 'Dashboard',
            generalCategories: 'Categorias gerais',
            categoriesAndSubcategories: 'Categorias e subcategorias',
            refreshView: 'Atualizar visão',
            lastItems: 'Últimos itens',
            manageSellers: 'Gerenciar vendedores',
            pendingRequests: 'Solicitações pendentes',
            approve: 'Aprovar',
            deny: 'Negar',
            sellerApproved: 'Vendedor aprovado',
            requestDenied: 'Solicitação negada',
            requestReviewError: 'Erro ao analisar solicitação',
            noPendingRequests: 'Nenhuma solicitação pendente.',
            sellersLoadError: 'Erro ao carregar vendedores.',
            noSellerRegistered: 'Nenhum vendedor cadastrado.',
            active: 'Ativo',
            inactive: 'Inativo',
            activate: 'Ativar',
            deactivate: 'Desativar',
            edit: 'Editar',
            delete: 'Excluir',
            save: 'Salvar',
            saveSettings: 'Salvar configurações',
            settingsSaved: 'Configurações salvas',
            saveError: 'Erro ao salvar',
            createdSeller: 'Vendedor criado',
            updatedSeller: 'Vendedor atualizado',
            sellerActivated: 'Vendedor ativado',
            sellerDeactivated: 'Vendedor desativado',
            sellerDeleted: 'Vendedor excluído',
            statusChangeError: 'Erro ao alterar status',
            deleteSellerError: 'Erro ao excluir vendedor',
            requiredFields: 'Preencha os campos obrigatórios',
            itemUpdated: 'Item atualizado',
            itemCreated: 'Item criado',
            itemDeleted: 'Item excluído',
            deleteItemError: 'Erro ao excluir item',
            chooseItem: 'Escolha o item pelo campo de busca',
            chooseItemAuto: 'Escolha um item da lista para organizar automaticamente',
            cannotAutoCategory: 'Não foi possível organizar a categoria automaticamente',
            templateLoaded: 'Template carregado',
            templateNotFound: 'Nenhum template encontrado',
            couponCode: 'Digite um código para o cupom',
            couponDiscount: 'Desconto deve ser entre 1 e 100',
            couponCreated: 'Cupom criado!',
            couponEmpty: 'Nenhum cupom cadastrado.',
            couponLoadError: 'Erro ao carregar cupons.',
            couponActivated: 'Cupom ativado',
            couponPaused: 'Cupom pausado',
            couponDeleted: 'Cupom excluído',
            couponUpdateError: 'Erro ao atualizar cupom',
            couponDeleteError: 'Erro ao excluir cupom',
            restrictedAccess: 'Acesso restrito',
            adminLoginHelp: 'Entre para gerenciar catálogo, vendedores, preços e configurações.',
            firstPasswordChange: 'Por segurança, troque sua senha antes de continuar.',
            level: 'Nível',
            role: 'Papel',
            total: 'Total',
            status: 'Status',
            date: 'Data',
            actions: 'Ações',
            description: 'Descrição',
            quantity: 'Quantidade',
            invalidCoins: 'Preço em moedas inválido',
            invalidQuantity: 'Quantidade inválida',
            informName: 'Informe o nome',
            selectGeneralCategory: 'Selecione uma categoria geral',
            adCreated: 'Anúncio criado com sucesso!',
            stockUpdatedError: 'Erro ao atualizar estoque',
            createFirstAd: 'Nenhum item encontrado. Crie seu primeiro anúncio!',
            useMarket: 'Uso do Mercado',
            transactions: 'Transações',
            prices: 'Preços',
            responsibility: 'Responsabilidade'
        },
        en: {
            appName: 'Warspear Market', languageTitle: 'Languages', warspearDatabase: 'Warspear database', calculator: 'Calculator', items: 'Items', skills: 'Skills', warSpear: 'Warspear Mind', fanWarspear: 'Fan Warspear Online', buyCoffee: 'Buy me a coffee',
            home: 'Home', catalog: 'Catalog', market: 'Market', searchMarket: 'Search market', searchItems: 'Search items...', search: 'Search', favorites: 'Favorites', cart: 'My Cart', cartShort: 'Cart', top: 'Top', account: 'Account', access: 'Access', myAds: 'My Ads', sellerPanel: 'Seller Panel', adminPanel: 'Admin Panel', admin: 'Admin', seller: 'Seller', buyer: 'Buyer', owner: 'Owner (Admin)',
            enter: 'Sign in', createAccount: 'Create Account', login: 'Sign in', logout: 'LOGOUT', close: 'CLOSE', back: 'BACK', menu: 'Menu', email: 'Email', password: 'Password', currentPassword: 'Current password', newPassword: 'New Password', confirmPassword: 'Confirm password', username: 'Username', name: 'Name', profile: 'Profile', changePassword: 'Change password', changePasswordShort: 'Change password', change: 'Change', giveUp: 'Cancel', buyerAccount: 'Buyer account', marketAccess: 'Market Access', noAccount: 'No account?', alreadyAccount: 'Already have an account?', quickLogin: 'Sign in / Register',
            loginSuccess: 'Signed in!', loginDone: 'Signed in', registerSuccess: 'Account created!', passwordChanged: 'Password changed successfully!', informEmailPassword: 'Enter email and password', typeEmail: 'Enter your email', typeName: 'Enter your name', typePassword: 'Enter a password', typeYourPassword: 'Enter your password', fillAll: 'Fill in all fields', passwordMin: 'Password must be at least 6 characters', newPasswordMin: 'New password must be at least 6 characters', passwordsDontMatch: 'Passwords do not match', differentPassword: 'The new password must be different', wrongLogin: 'Incorrect email or password', loginError: 'Error signing in', registerError: 'Error creating account', loginRegisterError: 'Error signing in/registering', changePasswordError: 'Error changing password', loginRequired: 'Sign in to access this area', loginToBuy: 'Sign in to buy', loginToFavorites: 'Sign in to view favorites', loginToCart: 'Sign in to add to cart', loginToReview: 'Sign in to review', loginFirst: 'Sign in first', sellerOnly: 'Area only for approved sellers', ownerOnly: 'Area only for the site owner',
            recentlyViewed: 'Recently viewed', clear: 'Clear', historyCleared: 'History cleared', becomeSeller: 'Become a seller', wantSell: 'I want to sell', sellerRequestPending: 'Seller request under review', sellerRequestTitle: 'Become a seller', sellerRequestHelp: 'Your selling access will be enabled after admin approval.', storeName: 'Store name', whatsapp: 'WhatsApp', message: 'Message', sendRequest: 'Send request', sellerRequestSent: 'Request sent! Wait for admin approval.', onlyBuyers: 'This request is only for buyers', requestAlreadyPending: 'Your request is already under review', cancel: 'Cancel',
            sortBy: 'Sort by', defaultSort: 'Default', lowestPrice: 'Lowest price', highestPrice: 'Highest price', nameAz: 'Name A-Z', nameZa: 'Name Z-A', lowestLevel: 'Lowest level', highestLevel: 'Highest level', server: 'Server', all: 'All', minPrice: 'Min price', maxPrice: 'Max price', soldOut: 'SOLD OUT', loadMore: 'Load more', loading: 'Loading...', buyWhatsapp: 'Buy on WhatsApp', addCart: 'Add to cart', addedCart: 'Added to cart!', removedCart: 'Removed from cart', emptyCart: 'Cart is empty', yourCartEmpty: 'Your cart is empty.', checkoutWhatsapp: 'Checkout on WhatsApp', whatsappMissing: 'WhatsApp not configured', share: 'Share', linkCopied: 'Link copied to clipboard!', copyError: 'Error copying link.',
            details: 'Details', price: 'Price', coins: 'Coins', stock: 'Stock', category: 'Category', reviews: 'Reviews', noReviews: 'No reviews yet.', reviewsLoadError: 'Error loading reviews.', review: 'Review', reviewSent: 'Review sent!', sendReviewError: 'Error sending review', noItems: 'No items found.', noItemsRegistered: 'No registered items.', itemNotFound: 'Item not found', loadItemsError: 'Error loading items', loadMoreError: 'Error loading more items', loadCategoriesError: 'Could not load categories', favoritesLogin: 'Sign in to view your favorites.', removedFavorite: 'Removed from favorites', addedFavorite: 'Added to favorites', updateFavoriteError: 'Error updating favorites', searchMin: 'Type at least 2 characters to search', searchError: 'Error searching items', results: 'Results', chat: 'Chat', useChatLogin: 'Sign in to use chat', sendMessageError: 'Error sending message',
            terms: 'Terms of Use', privacy: 'Privacy Policy', overview: 'Overview', quickActions: 'Quick actions', createItem: 'Create item', newItem: 'New Item', itemsAdmin: 'Items', categories: 'Categories', sellers: 'Sellers', settings: 'Settings', coupons: 'Coupons', dashboard: 'Dashboard', generalCategories: 'General categories', categoriesAndSubcategories: 'Categories and subcategories', refreshView: 'Refresh view', lastItems: 'Latest items', manageSellers: 'Manage sellers', pendingRequests: 'Pending requests', approve: 'Approve', deny: 'Deny', sellerApproved: 'Seller approved', requestDenied: 'Request denied', requestReviewError: 'Error reviewing request', noPendingRequests: 'No pending requests.', sellersLoadError: 'Error loading sellers.', noSellerRegistered: 'No sellers registered.', active: 'Active', inactive: 'Inactive', activate: 'Activate', deactivate: 'Deactivate', edit: 'Edit', delete: 'Delete', save: 'Save', saveSettings: 'Save settings', settingsSaved: 'Settings saved', saveError: 'Error saving', createdSeller: 'Seller created', updatedSeller: 'Seller updated', sellerActivated: 'Seller activated', sellerDeactivated: 'Seller deactivated', sellerDeleted: 'Seller deleted', statusChangeError: 'Error changing status', deleteSellerError: 'Error deleting seller', requiredFields: 'Fill required fields', itemUpdated: 'Item updated', itemCreated: 'Item created', itemDeleted: 'Item deleted', deleteItemError: 'Error deleting item', chooseItem: 'Choose the item in the search field', chooseItemAuto: 'Choose an item from the list to organize automatically', cannotAutoCategory: 'Could not organize category automatically', templateLoaded: 'Template loaded', templateNotFound: 'No template found', couponCode: 'Enter a coupon code', couponDiscount: 'Discount must be between 1 and 100', couponCreated: 'Coupon created!', couponEmpty: 'No coupons registered.', couponLoadError: 'Error loading coupons.', couponActivated: 'Coupon activated', couponPaused: 'Coupon paused', couponDeleted: 'Coupon deleted', couponUpdateError: 'Error updating coupon', couponDeleteError: 'Error deleting coupon', restrictedAccess: 'Restricted access', adminLoginHelp: 'Sign in to manage catalog, sellers, prices and settings.', firstPasswordChange: 'For security, change your password before continuing.', level: 'Level', role: 'Role', total: 'Total', status: 'Status', date: 'Date', actions: 'Actions', description: 'Description', quantity: 'Quantity', invalidCoins: 'Invalid coin price', invalidQuantity: 'Invalid quantity', informName: 'Enter the name', selectGeneralCategory: 'Select a general category', adCreated: 'Ad created successfully!', stockUpdatedError: 'Error updating stock', createFirstAd: 'No items found. Create your first ad!', useMarket: 'Market Use', transactions: 'Transactions', prices: 'Prices', responsibility: 'Responsibility', confirm: 'Confirm', confirmation: 'Confirmation'
        }
    };

    const localeText = {
        es: { languageTitle: 'Idiomas', warspearDatabase: 'Base de datos de Warspear', calculator: 'Calculadora', items: 'Artículos', skills: 'Habilidades', home: 'Inicio', catalog: 'Catálogo', market: 'Mercado', searchMarket: 'Buscar en el mercado', searchItems: 'Buscar artículos...', favorites: 'Favoritos', cart: 'Mi Carrito', account: 'Cuenta', access: 'Acceso', myAds: 'Mis Anuncios', enter: 'Entrar', createAccount: 'Crear Cuenta', logout: 'SALIR', back: 'VOLVER', email: 'Correo', password: 'Contraseña', newPassword: 'Nueva Contraseña', confirmPassword: 'Confirmar contraseña', name: 'Nombre', profile: 'Perfil', changePassword: 'Cambiar contraseña', change: 'Cambiar', giveUp: 'Cancelar', buyerAccount: 'Cuenta de comprador', marketAccess: 'Acceso al Mercado', noAccount: '¿No tienes cuenta?', alreadyAccount: '¿Ya tienes cuenta?', quickLogin: 'Entrar / Registrarse', loginSuccess: '¡Sesión iniciada!', registerSuccess: '¡Cuenta creada!', passwordChanged: '¡Contraseña cambiada!', loginRequired: 'Entra para acceder a esta área', sellerOnly: 'Área solo para vendedores aprobados', ownerOnly: 'Área solo para el dueño del sitio', recentlyViewed: 'Visto recientemente', clear: 'Limpiar', becomeSeller: 'Quiero ser vendedor', sellerRequestPending: 'Solicitud de vendedor en revisión', sendRequest: 'Enviar solicitud', sortBy: 'Ordenar por', defaultSort: 'Predeterminado', lowestPrice: 'Menor precio', highestPrice: 'Mayor precio', server: 'Servidor', all: 'Todos', soldOut: 'AGOTADO', loadMore: 'Cargar más', loading: 'Cargando...', buyWhatsapp: 'Comprar por WhatsApp', addCart: 'Añadir al carrito', emptyCart: 'Carrito vacío', checkoutWhatsapp: 'Finalizar por WhatsApp', share: 'Compartir', details: 'Detalles', price: 'Precio', coins: 'Monedas', stock: 'Stock', category: 'Categoría', reviews: 'Reseñas', noReviews: 'Aún no hay reseñas.', review: 'Valorar', noItems: 'No se encontraron artículos.', terms: 'Términos de Uso', privacy: 'Política de Privacidad', adminPanel: 'Panel Administrativo', sellerPanel: 'Panel del Vendedor', overview: 'Resumen', quickActions: 'Acciones rápidas', categories: 'Categorías', sellers: 'Vendedores', settings: 'Configuración', coupons: 'Cupones', approve: 'Aprobar', deny: 'Negar', save: 'Guardar', cancel: 'Cancelar' },
        de: { languageTitle: 'Sprachen', warspearDatabase: 'Warspear-Datenbank', calculator: 'Rechner', items: 'Gegenstände', skills: 'Fähigkeiten', home: 'Start', catalog: 'Katalog', market: 'Markt', searchMarket: 'Markt durchsuchen', searchItems: 'Gegenstände suchen...', favorites: 'Favoriten', cart: 'Mein Warenkorb', account: 'Konto', access: 'Zugang', myAds: 'Meine Anzeigen', enter: 'Anmelden', createAccount: 'Konto erstellen', logout: 'ABMELDEN', back: 'ZURÜCK', email: 'E-Mail', password: 'Passwort', newPassword: 'Neues Passwort', confirmPassword: 'Passwort bestätigen', name: 'Name', profile: 'Profil', changePassword: 'Passwort ändern', change: 'Ändern', giveUp: 'Abbrechen', buyerAccount: 'Käuferkonto', marketAccess: 'Marktzugang', noAccount: 'Kein Konto?', alreadyAccount: 'Schon ein Konto?', quickLogin: 'Anmelden / Registrieren', loginSuccess: 'Angemeldet!', registerSuccess: 'Konto erstellt!', passwordChanged: 'Passwort geändert!', loginRequired: 'Melde dich an, um diesen Bereich zu öffnen', sellerOnly: 'Nur für freigegebene Verkäufer', ownerOnly: 'Nur für den Besitzer der Seite', recentlyViewed: 'Zuletzt angesehen', clear: 'Leeren', becomeSeller: 'Verkäufer werden', sellerRequestPending: 'Verkäuferanfrage wird geprüft', sendRequest: 'Anfrage senden', sortBy: 'Sortieren nach', defaultSort: 'Standard', lowestPrice: 'Niedrigster Preis', highestPrice: 'Höchster Preis', server: 'Server', all: 'Alle', soldOut: 'AUSVERKAUFT', loadMore: 'Mehr laden', loading: 'Lädt...', buyWhatsapp: 'Über WhatsApp kaufen', addCart: 'In den Warenkorb', emptyCart: 'Warenkorb leer', checkoutWhatsapp: 'Über WhatsApp abschließen', share: 'Teilen', details: 'Details', price: 'Preis', coins: 'Münzen', stock: 'Bestand', category: 'Kategorie', reviews: 'Bewertungen', noReviews: 'Noch keine Bewertungen.', review: 'Bewerten', noItems: 'Keine Gegenstände gefunden.', terms: 'Nutzungsbedingungen', privacy: 'Datenschutz', adminPanel: 'Adminbereich', sellerPanel: 'Verkäuferbereich', overview: 'Übersicht', quickActions: 'Schnellaktionen', categories: 'Kategorien', sellers: 'Verkäufer', settings: 'Einstellungen', coupons: 'Gutscheine', approve: 'Genehmigen', deny: 'Ablehnen', save: 'Speichern', cancel: 'Abbrechen' },
        id: { languageTitle: 'Bahasa', warspearDatabase: 'Basis data Warspear', calculator: 'Kalkulator', items: 'Item', skills: 'Skill', home: 'Beranda', catalog: 'Katalog', market: 'Pasar', searchMarket: 'Cari di pasar', searchItems: 'Cari item...', favorites: 'Favorit', cart: 'Keranjang Saya', account: 'Akun', access: 'Akses', myAds: 'Iklan Saya', enter: 'Masuk', createAccount: 'Buat Akun', logout: 'KELUAR', back: 'KEMBALI', email: 'Email', password: 'Kata sandi', newPassword: 'Kata Sandi Baru', confirmPassword: 'Konfirmasi kata sandi', name: 'Nama', profile: 'Profil', changePassword: 'Ubah kata sandi', change: 'Ubah', giveUp: 'Batal', buyerAccount: 'Akun pembeli', marketAccess: 'Akses Pasar', noAccount: 'Belum punya akun?', alreadyAccount: 'Sudah punya akun?', quickLogin: 'Masuk / Daftar', loginSuccess: 'Berhasil masuk!', registerSuccess: 'Akun dibuat!', passwordChanged: 'Kata sandi berhasil diubah!', loginRequired: 'Masuk untuk mengakses area ini', sellerOnly: 'Area hanya untuk penjual yang disetujui', ownerOnly: 'Area hanya untuk pemilik situs', recentlyViewed: 'Baru dilihat', clear: 'Bersihkan', becomeSeller: 'Saya ingin menjadi penjual', sellerRequestPending: 'Permintaan penjual sedang ditinjau', sendRequest: 'Kirim permintaan', sortBy: 'Urutkan', defaultSort: 'Default', lowestPrice: 'Harga terendah', highestPrice: 'Harga tertinggi', server: 'Server', all: 'Semua', soldOut: 'HABIS', loadMore: 'Muat lagi', loading: 'Memuat...', buyWhatsapp: 'Beli lewat WhatsApp', addCart: 'Tambah ke keranjang', emptyCart: 'Keranjang kosong', checkoutWhatsapp: 'Checkout lewat WhatsApp', share: 'Bagikan', details: 'Detail', price: 'Harga', coins: 'Koin', stock: 'Stok', category: 'Kategori', reviews: 'Ulasan', noReviews: 'Belum ada ulasan.', review: 'Ulas', noItems: 'Item tidak ditemukan.', terms: 'Ketentuan Penggunaan', privacy: 'Kebijakan Privasi', adminPanel: 'Panel Admin', sellerPanel: 'Panel Penjual', overview: 'Ringkasan', quickActions: 'Aksi cepat', categories: 'Kategori', sellers: 'Penjual', settings: 'Pengaturan', coupons: 'Kupon', approve: 'Setujui', deny: 'Tolak', save: 'Simpan', cancel: 'Batal' },
        ru: { languageTitle: 'Языки', warspearDatabase: 'База данных Warspear', calculator: 'Калькулятор', items: 'Предметы', skills: 'Навыки', home: 'Главная', catalog: 'Каталог', market: 'Рынок', searchMarket: 'Искать на рынке', searchItems: 'Искать предметы...', favorites: 'Избранное', cart: 'Моя корзина', account: 'Аккаунт', access: 'Доступ', myAds: 'Мои объявления', enter: 'Войти', createAccount: 'Создать аккаунт', logout: 'ВЫЙТИ', back: 'НАЗАД', email: 'E-mail', password: 'Пароль', newPassword: 'Новый пароль', confirmPassword: 'Подтвердить пароль', name: 'Имя', profile: 'Профиль', changePassword: 'Сменить пароль', change: 'Сменить', giveUp: 'Отмена', buyerAccount: 'Аккаунт покупателя', marketAccess: 'Доступ к рынку', noAccount: 'Нет аккаунта?', alreadyAccount: 'Уже есть аккаунт?', quickLogin: 'Войти / Регистрация', loginSuccess: 'Вход выполнен!', registerSuccess: 'Аккаунт создан!', passwordChanged: 'Пароль изменён!', loginRequired: 'Войдите для доступа', sellerOnly: 'Только для одобренных продавцов', ownerOnly: 'Только для владельца сайта', recentlyViewed: 'Недавно просмотрено', clear: 'Очистить', becomeSeller: 'Стать продавцом', sellerRequestPending: 'Заявка продавца на проверке', sendRequest: 'Отправить заявку', sortBy: 'Сортировать', defaultSort: 'По умолчанию', lowestPrice: 'Низкая цена', highestPrice: 'Высокая цена', server: 'Сервер', all: 'Все', soldOut: 'НЕТ В НАЛИЧИИ', loadMore: 'Загрузить ещё', loading: 'Загрузка...', buyWhatsapp: 'Купить в WhatsApp', addCart: 'В корзину', emptyCart: 'Корзина пуста', checkoutWhatsapp: 'Оформить в WhatsApp', share: 'Поделиться', details: 'Детали', price: 'Цена', coins: 'Монеты', stock: 'Запас', category: 'Категория', reviews: 'Отзывы', noReviews: 'Отзывов пока нет.', review: 'Оценить', noItems: 'Предметы не найдены.', terms: 'Условия использования', privacy: 'Политика конфиденциальности', adminPanel: 'Панель администратора', sellerPanel: 'Панель продавца', overview: 'Обзор', quickActions: 'Быстрые действия', categories: 'Категории', sellers: 'Продавцы', settings: 'Настройки', coupons: 'Купоны', approve: 'Одобрить', deny: 'Отклонить', save: 'Сохранить', cancel: 'Отмена' },
        uk: { languageTitle: 'Мови', warspearDatabase: 'База даних Warspear', calculator: 'Калькулятор', items: 'Предмети', skills: 'Навички', home: 'Головна', catalog: 'Каталог', market: 'Ринок', searchMarket: 'Шукати на ринку', searchItems: 'Шукати предмети...', favorites: 'Обране', cart: 'Мій кошик', account: 'Акаунт', access: 'Доступ', myAds: 'Мої оголошення', enter: 'Увійти', createAccount: 'Створити акаунт', logout: 'ВИЙТИ', back: 'НАЗАД', email: 'E-mail', password: 'Пароль', newPassword: 'Новий пароль', confirmPassword: 'Підтвердити пароль', name: 'Ім’я', profile: 'Профіль', changePassword: 'Змінити пароль', change: 'Змінити', giveUp: 'Скасувати', buyerAccount: 'Акаунт покупця', marketAccess: 'Доступ до ринку', noAccount: 'Немає акаунта?', alreadyAccount: 'Вже є акаунт?', quickLogin: 'Увійти / Реєстрація', loginSuccess: 'Вхід виконано!', registerSuccess: 'Акаунт створено!', passwordChanged: 'Пароль змінено!', loginRequired: 'Увійдіть для доступу', sellerOnly: 'Тільки для схвалених продавців', ownerOnly: 'Тільки для власника сайту', recentlyViewed: 'Нещодавно переглянуті', clear: 'Очистити', becomeSeller: 'Стати продавцем', sellerRequestPending: 'Заявка продавця на перевірці', sendRequest: 'Надіслати заявку', sortBy: 'Сортувати', defaultSort: 'За замовчуванням', lowestPrice: 'Найнижча ціна', highestPrice: 'Найвища ціна', server: 'Сервер', all: 'Усі', soldOut: 'РОЗПРОДАНО', loadMore: 'Завантажити ще', loading: 'Завантаження...', buyWhatsapp: 'Купити в WhatsApp', addCart: 'До кошика', emptyCart: 'Кошик порожній', checkoutWhatsapp: 'Оформити в WhatsApp', share: 'Поділитися', details: 'Деталі', price: 'Ціна', coins: 'Монети', stock: 'Запас', category: 'Категорія', reviews: 'Відгуки', noReviews: 'Відгуків ще немає.', review: 'Оцінити', noItems: 'Предмети не знайдено.', terms: 'Умови використання', privacy: 'Політика приватності', adminPanel: 'Панель адміністратора', sellerPanel: 'Панель продавця', overview: 'Огляд', quickActions: 'Швидкі дії', categories: 'Категорії', sellers: 'Продавці', settings: 'Налаштування', coupons: 'Купони', approve: 'Схвалити', deny: 'Відхилити', save: 'Зберегти', cancel: 'Скасувати' },
        vi: { languageTitle: 'Ngôn ngữ', warspearDatabase: 'Cơ sở dữ liệu Warspear', calculator: 'Máy tính', items: 'Vật phẩm', skills: 'Kỹ năng', home: 'Trang chủ', catalog: 'Danh mục', market: 'Chợ', searchMarket: 'Tìm trong chợ', searchItems: 'Tìm vật phẩm...', favorites: 'Yêu thích', cart: 'Giỏ hàng của tôi', account: 'Tài khoản', access: 'Truy cập', myAds: 'Tin của tôi', enter: 'Đăng nhập', createAccount: 'Tạo tài khoản', logout: 'ĐĂNG XUẤT', back: 'QUAY LẠI', email: 'Email', password: 'Mật khẩu', newPassword: 'Mật khẩu mới', confirmPassword: 'Xác nhận mật khẩu', name: 'Tên', profile: 'Hồ sơ', changePassword: 'Đổi mật khẩu', change: 'Đổi', giveUp: 'Hủy', buyerAccount: 'Tài khoản người mua', marketAccess: 'Truy cập chợ', noAccount: 'Chưa có tài khoản?', alreadyAccount: 'Đã có tài khoản?', quickLogin: 'Đăng nhập / Đăng ký', loginSuccess: 'Đăng nhập thành công!', registerSuccess: 'Đã tạo tài khoản!', passwordChanged: 'Đổi mật khẩu thành công!', loginRequired: 'Đăng nhập để vào khu vực này', sellerOnly: 'Chỉ dành cho người bán đã duyệt', ownerOnly: 'Chỉ dành cho chủ trang', recentlyViewed: 'Đã xem gần đây', clear: 'Xóa', becomeSeller: 'Tôi muốn bán hàng', sellerRequestPending: 'Yêu cầu bán hàng đang được xét', sendRequest: 'Gửi yêu cầu', sortBy: 'Sắp xếp', defaultSort: 'Mặc định', lowestPrice: 'Giá thấp nhất', highestPrice: 'Giá cao nhất', server: 'Máy chủ', all: 'Tất cả', soldOut: 'HẾT HÀNG', loadMore: 'Tải thêm', loading: 'Đang tải...', buyWhatsapp: 'Mua qua WhatsApp', addCart: 'Thêm vào giỏ', emptyCart: 'Giỏ hàng trống', checkoutWhatsapp: 'Thanh toán qua WhatsApp', share: 'Chia sẻ', details: 'Chi tiết', price: 'Giá', coins: 'Xu', stock: 'Kho', category: 'Danh mục', reviews: 'Đánh giá', noReviews: 'Chưa có đánh giá.', review: 'Đánh giá', noItems: 'Không tìm thấy vật phẩm.', terms: 'Điều khoản sử dụng', privacy: 'Chính sách riêng tư', adminPanel: 'Bảng quản trị', sellerPanel: 'Bảng người bán', overview: 'Tổng quan', quickActions: 'Thao tác nhanh', categories: 'Danh mục', sellers: 'Người bán', settings: 'Cài đặt', coupons: 'Mã giảm giá', approve: 'Duyệt', deny: 'Từ chối', save: 'Lưu', cancel: 'Hủy' },
        zh: { languageTitle: '语言', warspearDatabase: 'Warspear 数据库', calculator: '计算器', items: '物品', skills: '技能', home: '首页', catalog: '目录', market: '市场', searchMarket: '搜索市场', searchItems: '搜索物品...', favorites: '收藏', cart: '我的购物车', account: '账户', access: '访问', myAds: '我的广告', enter: '登录', createAccount: '创建账户', logout: '退出', back: '返回', email: '电子邮件', password: '密码', newPassword: '新密码', confirmPassword: '确认密码', name: '名称', profile: '资料', changePassword: '修改密码', change: '修改', giveUp: '取消', buyerAccount: '买家账户', marketAccess: '市场访问', noAccount: '没有账户？', alreadyAccount: '已有账户？', quickLogin: '登录 / 注册', loginSuccess: '登录成功！', registerSuccess: '账户已创建！', passwordChanged: '密码修改成功！', loginRequired: '请登录以访问此区域', sellerOnly: '仅限已批准卖家', ownerOnly: '仅限网站所有者', recentlyViewed: '最近浏览', clear: '清除', becomeSeller: '我想成为卖家', sellerRequestPending: '卖家申请审核中', sendRequest: '发送申请', sortBy: '排序', defaultSort: '默认', lowestPrice: '最低价格', highestPrice: '最高价格', server: '服务器', all: '全部', soldOut: '售罄', loadMore: '加载更多', loading: '加载中...', buyWhatsapp: '在 WhatsApp 购买', addCart: '加入购物车', emptyCart: '购物车为空', checkoutWhatsapp: '在 WhatsApp 结算', share: '分享', details: '详情', price: '价格', coins: '金币', stock: '库存', category: '类别', reviews: '评价', noReviews: '暂无评价。', review: '评价', noItems: '未找到物品。', terms: '使用条款', privacy: '隐私政策', adminPanel: '管理面板', sellerPanel: '卖家面板', overview: '概览', quickActions: '快捷操作', categories: '类别', sellers: '卖家', settings: '设置', coupons: '优惠券', approve: '批准', deny: '拒绝', save: '保存', cancel: '取消' }
    };

    for (const [code, entries] of Object.entries(localeText)) {
        translations[code] = { ...translations.en, ...entries };
    }
    const shortLabels = {
        pt: { cartShort: 'Carrinho', top: 'Topo' },
        en: { cartShort: 'Cart', top: 'Top' },
        es: { cartShort: 'Carrito', top: 'Arriba', appName: 'Mercado Warspear' },
        de: { cartShort: 'Warenkorb', top: 'Oben', appName: 'Warspear Markt' },
        id: { cartShort: 'Keranjang', top: 'Atas', appName: 'Pasar Warspear' },
        ru: { cartShort: 'Корзина', top: 'Вверх', appName: 'Рынок Warspear' },
        uk: { cartShort: 'Кошик', top: 'Вгору', appName: 'Ринок Warspear' },
        vi: { cartShort: 'Giỏ', top: 'Đầu trang', appName: 'Chợ Warspear' },
        zh: { cartShort: '购物车', top: '顶部', appName: 'Warspear 市场' }
    };
    Object.entries(shortLabels).forEach(([code, entries]) => {
        translations[code] = { ...translations[code], ...entries };
    });
    const extraTranslations = {
        pt: {
            activeOffer: 'Oferta ativa',
            noDescription: 'Sem descricao',
            noDescriptionAccent: 'Sem descrição',
            buyerOpinions: 'Opiniões de compradores',
            writeReview: 'Escreva uma avaliação',
            rating: 'Nota',
            boughtItem: 'Comprei este item',
            comment: 'Comentário',
            submitReview: 'Enviar avaliação',
            brlPrice: 'Preço em R$',
            brlPricePlain: 'Preco em R$',
            chatSeller: 'Chat com vendedor',
            checkoutBuyWhatsapp: 'Finalizar compra no WhatsApp',
            eachCoins: '{value} moedas cada',
            stockValue: 'Estoque: {value}',
            loadMoreRemaining: 'Carregar mais ({value} restantes)',
            select: 'Selecione',
            min: 'Min',
            max: 'Max',
            sort: 'Ordenar',
            noFavoriteSaved: 'Nenhum favorito salvo.',
            cartLoadError: 'Erro ao carregar carrinho.',
            buyAction: 'Comprar no WhatsApp',
            shareAction: 'Compartilhar',
            unavailableView: 'Item sem visualizacao disponivel.',
            unavailableViewAccent: 'Item sem visualização disponível.',
            reviewPurchasePlaceholder: 'Conte como foi a compra...',
            stillAvailable: 'Ainda esta disponivel?',
            categoryPathEmpty: 'Sem categoria'
        },
        en: {
            activeOffer: 'Active offer',
            noDescription: 'No description',
            noDescriptionAccent: 'No description',
            buyerOpinions: 'Buyer opinions',
            writeReview: 'Write a review',
            rating: 'Rating',
            boughtItem: 'I bought this item',
            comment: 'Comment',
            submitReview: 'Send review',
            brlPrice: 'Price in BRL',
            brlPricePlain: 'Price in BRL',
            chatSeller: 'Chat with seller',
            checkoutBuyWhatsapp: 'Checkout on WhatsApp',
            eachCoins: '{value} coins each',
            stockValue: 'Stock: {value}',
            loadMoreRemaining: 'Load more ({value} left)',
            select: 'Select',
            min: 'Min',
            max: 'Max',
            sort: 'Sort',
            noFavoriteSaved: 'No saved favorites.',
            cartLoadError: 'Error loading cart.',
            buyAction: 'Buy on WhatsApp',
            shareAction: 'Share',
            unavailableView: 'Item preview unavailable.',
            unavailableViewAccent: 'Item preview unavailable.',
            reviewPurchasePlaceholder: 'Tell us how the purchase went...',
            stillAvailable: 'Is it still available?',
            categoryPathEmpty: 'No category'
        }
    };
    Object.entries(extraTranslations).forEach(([code, entries]) => {
        translations[code] = { ...translations[code], ...entries };
    });

    const categoryTranslations = {
        en: {
            'baus': 'Chests',
            'pacotes de iniciante': 'Starter Packs',
            'armas': 'Weapons',
            'armadura': 'Armor',
            'acessorios': 'Accessories',
            'aprimoramentos': 'Enhancements',
            'consumiveis': 'Consumables',
            'utilidades': 'Utilities',
            'lacaios': 'Minions',
            'reliquias': 'Relics',
            'livros de habilidade': 'Skill Books',
            'visuais decorativos': 'Decorative Skins',
            'trajes luxuosos': 'Luxury Costumes',
            'sorrisos': 'Smiles',
            'recursos': 'Resources',
            'saquear': 'Loot',
            'adagas': 'Daggers',
            'espadas de uma mao': 'One-handed Swords',
            'espadas de duas maos': 'Two-handed Swords',
            'machados de uma mao': 'One-handed Axes',
            'machados de duas maos': 'Two-handed Axes',
            'macas de uma mao': 'One-handed Maces',
            'macas de duas maos': 'Two-handed Maces',
            'lancas': 'Spears',
            'escudos': 'Shields',
            'cajados': 'Staves',
            'arcos': 'Bows',
            'bestas': 'Crossbows',
            'armadura de tecido': 'Cloth Armor',
            'armadura leve': 'Light Armor',
            'armadura pesada': 'Heavy Armor',
            'cristais': 'Crystals',
            'runas': 'Runes',
            'amplificacao': 'Amplification',
            'capotes': 'Cloaks',
            'aneis': 'Rings',
            'amuletos': 'Amulets',
            'braceletes': 'Bracelets',
            'alimento': 'Food',
            'pocoes': 'Potions',
            'pergaminhos': 'Scrolls',
            'artefatos': 'Artifacts',
            'armas de uma mao': 'One-handed Weapons',
            'armas corpo a corpo de duas maos': 'Two-handed Melee Weapons',
            'pergaminho da purificacao': 'Purification Scroll',
            'essencias': 'Essences',
            'catalizadores': 'Catalysts',
            'recursos de artesanato': 'Crafting Resources',
            'recursos do castelo': 'Castle Resources',
            'substancias': 'Substances',
            'aprimoramento': 'Enhancement',
            'ataque': 'Attack',
            'defesa': 'Defense',
            'grupo': 'Group',
            'cabeca': 'Head',
            'tronco': 'Body',
            'maos': 'Hands',
            'cintura': 'Waist',
            'pernas': 'Legs',
            'cristas milagrosos': 'Miracle Crests',
            'cristais comuns': 'Common Crystals',
            'runas milagrosas': 'Miracle Runes',
            'runas comuns': 'Common Runes',
            'alimentos milagrosos': 'Miracle Food',
            'alimentos comuns': 'Common Food',
            'pocoes milagrosas': 'Miracle Potions',
            'pocoes comuns': 'Common Potions',
            'pergaminhos milagrosos': 'Miracle Scrolls',
            'pergaminhos comuns': 'Common Scrolls',
            'artefato de instalacao': 'Installation Artifact',
            'artefato de evocacao': 'Summoning Artifact',
            'armas de longo alcance': 'Ranged Weapons',
            'armas corpo a corpo': 'Melee Weapons',
            'progressao': 'Progression',
            'producao': 'Production',
            'itens sem categoria': 'Uncategorized Items',
            'sem categoria': 'No category',
            'item do mercado': 'Market item',
            'nenhuma categoria cadastrada.': 'No categories registered.',
            'nenhuma categoria disponivel.': 'No categories available.',
            'nenhuma subcategoria disponivel.': 'No subcategories available.'
        },
        ru: {
            'baus': 'Сундуки',
            'pacotes de iniciante': 'Наборы новичка',
            'armas': 'Оружие',
            'armadura': 'Броня',
            'acessorios': 'Аксессуары',
            'aprimoramentos': 'Улучшения',
            'consumiveis': 'Расходники',
            'utilidades': 'Полезное',
            'lacaios': 'Миньоны',
            'reliquias': 'Реликвии',
            'livros de habilidade': 'Книги навыков',
            'visuais decorativos': 'Декоративные облики',
            'trajes luxuosos': 'Роскошные костюмы',
            'sorrisos': 'Смайлы',
            'recursos': 'Ресурсы',
            'saquear': 'Добыча',
            'adagas': 'Кинжалы',
            'espadas de uma mao': 'Одноручные мечи',
            'espadas de duas maos': 'Двуручные мечи',
            'machados de uma mao': 'Одноручные топоры',
            'machados de duas maos': 'Двуручные топоры',
            'macas de uma mao': 'Одноручные булавы',
            'macas de duas maos': 'Двуручные булавы',
            'lancas': 'Копья',
            'escudos': 'Щиты',
            'cajados': 'Посохи',
            'arcos': 'Луки',
            'bestas': 'Арбалеты',
            'armadura de tecido': 'Тканевая броня',
            'armadura leve': 'Лёгкая броня',
            'armadura pesada': 'Тяжёлая броня',
            'cristais': 'Кристаллы',
            'runas': 'Руны',
            'amplificacao': 'Усиление',
            'capotes': 'Плащи',
            'aneis': 'Кольца',
            'amuletos': 'Амулеты',
            'braceletes': 'Браслеты',
            'alimento': 'Еда',
            'pocoes': 'Зелья',
            'pergaminhos': 'Свитки',
            'artefatos': 'Артефакты',
            'armas de uma mao': 'Одноручное оружие',
            'armas corpo a corpo de duas maos': 'Двуручное оружие ближнего боя',
            'pergaminho da purificacao': 'Свиток очищения',
            'essencias': 'Эссенции',
            'catalizadores': 'Катализаторы',
            'recursos de artesanato': 'Ресурсы ремесла',
            'recursos do castelo': 'Ресурсы замка',
            'substancias': 'Субстанции',
            'aprimoramento': 'Улучшение',
            'ataque': 'Атака',
            'defesa': 'Защита',
            'grupo': 'Группа',
            'cabeca': 'Голова',
            'tronco': 'Тело',
            'maos': 'Руки',
            'cintura': 'Пояс',
            'pernas': 'Ноги',
            'cristas milagrosos': 'Чудесные знаки',
            'cristais comuns': 'Обычные кристаллы',
            'runas milagrosas': 'Чудесные руны',
            'runas comuns': 'Обычные руны',
            'alimentos milagrosos': 'Чудесная еда',
            'alimentos comuns': 'Обычная еда',
            'pocoes milagrosas': 'Чудесные зелья',
            'pocoes comuns': 'Обычные зелья',
            'pergaminhos milagrosos': 'Чудесные свитки',
            'pergaminhos comuns': 'Обычные свитки',
            'artefato de instalacao': 'Артефакт установки',
            'artefato de evocacao': 'Артефакт призыва',
            'armas de longo alcance': 'Дальнобойное оружие',
            'armas corpo a corpo': 'Оружие ближнего боя',
            'progressao': 'Прогресс',
            'producao': 'Производство',
            'itens sem categoria': 'Предметы без категории',
            'sem categoria': 'Без категории',
            'item do mercado': 'Рыночный предмет'
        }
    };
    const categoryRoot = categoryTranslations.en;
    const categoryAliases = {
        es: {
            'baus': 'Cofres', 'pacotes de iniciante': 'Paquetes de inicio', 'armas': 'Armas', 'armadura': 'Armadura', 'acessorios': 'Accesorios', 'aprimoramentos': 'Mejoras', 'consumiveis': 'Consumibles', 'utilidades': 'Utilidades', 'lacaios': 'Secuaces', 'reliquias': 'Reliquias', 'livros de habilidade': 'Libros de habilidad', 'visuais decorativos': 'Apariencias decorativas', 'trajes luxuosos': 'Trajes lujosos', 'sorrisos': 'Sonrisas', 'recursos': 'Recursos', 'saquear': 'Botín'
        },
        de: {
            'baus': 'Truhen', 'pacotes de iniciante': 'Starterpakete', 'armas': 'Waffen', 'armadura': 'Rüstung', 'acessorios': 'Zubehör', 'aprimoramentos': 'Verbesserungen', 'consumiveis': 'Verbrauchsgüter', 'utilidades': 'Nützliches', 'lacaios': 'Begleiter', 'reliquias': 'Relikte', 'livros de habilidade': 'Fähigkeitsbücher', 'visuais decorativos': 'Dekorative Skins', 'trajes luxuosos': 'Luxuskostüme', 'sorrisos': 'Smileys', 'recursos': 'Ressourcen', 'saquear': 'Beute'
        },
        id: {
            'baus': 'Peti', 'pacotes de iniciante': 'Paket Pemula', 'armas': 'Senjata', 'armadura': 'Armor', 'acessorios': 'Aksesori', 'aprimoramentos': 'Peningkatan', 'consumiveis': 'Konsumsi', 'utilidades': 'Utilitas', 'lacaios': 'Minion', 'reliquias': 'Relik', 'livros de habilidade': 'Buku Skill', 'visuais decorativos': 'Skin Dekoratif', 'trajes luxuosos': 'Kostum Mewah', 'sorrisos': 'Senyum', 'recursos': 'Sumber Daya', 'saquear': 'Loot'
        },
        uk: {
            'baus': 'Скрині', 'pacotes de iniciante': 'Набори новачка', 'armas': 'Зброя', 'armadura': 'Броня', 'acessorios': 'Аксесуари', 'aprimoramentos': 'Покращення', 'consumiveis': 'Витратні предмети', 'utilidades': 'Корисне', 'lacaios': 'Поплічники', 'reliquias': 'Реліквії', 'livros de habilidade': 'Книги навичок', 'visuais decorativos': 'Декоративні образи', 'trajes luxuosos': 'Розкішні костюми', 'sorrisos': 'Смайли', 'recursos': 'Ресурси', 'saquear': 'Здобич'
        },
        vi: {
            'baus': 'Rương', 'pacotes de iniciante': 'Gói khởi đầu', 'armas': 'Vũ khí', 'armadura': 'Giáp', 'acessorios': 'Phụ kiện', 'aprimoramentos': 'Nâng cấp', 'consumiveis': 'Vật phẩm tiêu hao', 'utilidades': 'Tiện ích', 'lacaios': 'Lính hầu', 'reliquias': 'Di vật', 'livros de habilidade': 'Sách kỹ năng', 'visuais decorativos': 'Ngoại hình trang trí', 'trajes luxuosos': 'Trang phục sang trọng', 'sorrisos': 'Biểu cảm', 'recursos': 'Tài nguyên', 'saquear': 'Chiến lợi phẩm'
        },
        zh: {
            'baus': '宝箱', 'pacotes de iniciante': '新手礼包', 'armas': '武器', 'armadura': '护甲', 'acessorios': '饰品', 'aprimoramentos': '强化', 'consumiveis': '消耗品', 'utilidades': '实用品', 'lacaios': '随从', 'reliquias': '遗物', 'livros de habilidade': '技能书', 'visuais decorativos': '装饰外观', 'trajes luxuosos': '豪华服装', 'sorrisos': '表情', 'recursos': '资源', 'saquear': '战利品'
        }
    };
    Object.entries(categoryAliases).forEach(([code, entries]) => {
        categoryTranslations[code] = { ...categoryRoot, ...entries };
    });

    const phraseKey = new Map();
    Object.values(translations).forEach(dict => {
        Object.entries(dict).forEach(([key, value]) => {
            if (typeof value === 'string') phraseKey.set(value, key);
        });
    });
    [
        ['Início', 'home'], ['Catalogo', 'catalog'], ['Catálogo', 'catalog'], ['Meu Carrinho', 'cart'],
        ['Entrar / Cadastrar', 'quickLogin'], ['Painel Administrativo', 'adminPanel'],
        ['Trocar Senha', 'changePassword'], ['Mudar senha', 'changePasswordShort'],
        ['Mudar', 'change'], ['Desistir', 'giveUp'], ['Voltar', 'back'], ['VOLTAR', 'back'],
        ['ENTRAR', 'enter'], ['Entrar', 'enter'], ['Criar conta', 'createAccount'], ['Criar Conta', 'createAccount'],
        ['Conta de comprador', 'buyerAccount'], ['Procurar no mercado', 'searchMarket'],
        ['Meu Carrinho', 'cart'], ['Favoritos', 'favorites'], ['Acesso', 'access'],
        ['Quero me tornar um vendedor', 'becomeSeller'], ['Meus Anúncios', 'myAds'],
        ['Seu carrinho está vazio.', 'yourCartEmpty'], ['Carrinho vazio', 'emptyCart'],
        ['Nenhuma avaliação ainda.', 'noReviews'], ['Erro ao carregar avaliações.', 'reviewsLoadError'],
        ['Nenhum item encontrado.', 'noItems'], ['Nenhum item cadastrado.', 'noItemsRegistered']
    ].forEach(([phrase, key]) => phraseKey.set(phrase, key));

    let current = 'pt';

    function readSavedLanguage() {
        try {
            return localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || 'pt';
        } catch (_) {
            return 'pt';
        }
    }

    function saveLanguage(code) {
        try {
            localStorage.setItem(STORAGE_KEY, code);
            localStorage.setItem(LEGACY_STORAGE_KEY, code);
        } catch (_) {}
    }

    function hasLanguage(code) {
        return !!translations[code];
    }

    function normalizeCategoryKey(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function translateCategoryName(value) {
        if (!value) return value;
        const key = normalizeCategoryKey(value);
        if (current === 'pt') return value;
        const dict = categoryTranslations[current] || {};
        return dict[key] || categoryTranslations.en[key] || value;
    }

    function translateCategoryPath(parts, separator = ' > ') {
        return (parts || [])
            .filter(Boolean)
            .map(part => translateCategoryName(part))
            .join(separator);
    }

    function t(key, vars = {}) {
        const dict = translations[current] || translations.pt;
        let value = dict[key] || translations.pt[key] || translations.en[key] || key;
        Object.entries(vars).forEach(([name, replacement]) => {
            value = value.replaceAll('{' + name + '}', String(replacement));
        });
        return value;
    }

    function translatePhrase(text) {
        if (!text || current === 'pt') return text;
        const trimmed = String(text).trim();
        if (!trimmed) return text;

        let match = trimmed.match(/^Conta\s*\((.+)\)$/);
        if (match) return `${t('account')} (${match[1]})`;
        match = trimmed.match(/^SAIR\s*\((.+)\)$/i);
        if (match) return `${t('logout')} (${match[1]})`;
        match = trimmed.match(/^Favoritos\s*\((\d+)\)$/);
        if (match) return `${t('favorites')} (${match[1]})`;
        match = trimmed.match(/^Meu Carrinho\s*\((\d+)\)$/);
        if (match) return `${t('cart')} (${match[1]})`;
        match = trimmed.match(/^Perfil:\s*(.+)$/);
        if (match) return `${t('profile')}: ${match[1]}`;
        match = trimmed.match(/^Resultados:\s*(.+)$/);
        if (match) return `${t('results')}: ${match[1]}`;
        match = trimmed.match(/^Logado como:\s*(.+)\s*\(Dono\)$/);
        if (match) return `${t('loginDone')}: ${match[1]} (${t('owner')})`;
        match = trimmed.match(/^Estoque:\s*(.+)$/);
        if (match) return t('stockValue', { value: match[1] });
        match = trimmed.match(/^(.+?)\s+moedas cada$/);
        if (match) return t('eachCoins', { value: match[1] });
        match = trimmed.match(/^Carregar mais\s*\((.+?)\s+restantes\)$/);
        if (match) return t('loadMoreRemaining', { value: match[1] });
        match = trimmed.match(/^Meu Carrinho\s*\((\d+)\)$/);
        if (match) return `${t('cart')} (${match[1]})`;
        match = trimmed.match(/^Carrinho\s*\((\d+)\)$/);
        if (match) return `${t('cartShort')} (${match[1]})`;

        const categoryName = translateCategoryName(trimmed);
        if (categoryName !== trimmed) return categoryName;

        const key = phraseKey.get(trimmed);
        return key ? t(key) : text;
    }

    function translateTextNode(node) {
        const original = node.nodeValue;
        const translated = translatePhrase(original);
        if (translated !== original) {
            const leading = original.match(/^\s*/)?.[0] || '';
            const trailing = original.match(/\s*$/)?.[0] || '';
            node.nodeValue = leading + translated.trim() + trailing;
        }
    }

    function applyAttributes(root) {
        root.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) el.textContent = t(key);
        });
        root.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            if (key) el.innerHTML = t(key);
        });
        ['placeholder', 'title', 'aria-label', 'alt'].forEach(attr => {
            root.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => {
                const key = el.getAttribute(`data-i18n-${attr}`);
                if (key) el.setAttribute(attr, t(key));
            });
        });
    }

    function applyTextNodes(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (['SCRIPT', 'STYLE', 'TEXTAREA', 'OPTION'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
                if (parent.closest('.language-menu')) return NodeFilter.FILTER_REJECT;
                if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(translateTextNode);
    }

    function applyFormOptions(root) {
        root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
            const translated = translatePhrase(el.getAttribute('placeholder'));
            if (translated !== el.getAttribute('placeholder')) el.setAttribute('placeholder', translated);
        });
        root.querySelectorAll('button[title], a[title]').forEach(el => {
            const translated = translatePhrase(el.getAttribute('title'));
            if (translated !== el.getAttribute('title')) el.setAttribute('title', translated);
        });
    }

    function updateActiveLanguage() {
        document.querySelectorAll('[data-lang-option]').forEach(btn => {
            const active = btn.getAttribute('data-lang-option') === current;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-current', active ? 'true' : 'false');
        });
    }

    function apply(root = document) {
        document.documentElement.lang = current === 'pt' ? 'pt-BR' : current;
        applyAttributes(root);
        applyTextNodes(root);
        applyFormOptions(root);
        updateActiveLanguage();
        const title = document.getElementById('page-title');
        if (title && title.textContent.includes('Mercado Warspear') && current !== 'pt') {
            title.textContent = title.textContent.replaceAll('Mercado Warspear', t('appName'));
        }
    }

    function renderLanguageMenu() {
        let menu = document.getElementById('language-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'language-menu';
            menu.className = 'language-menu';
            document.body.prepend(menu);
        }
        menu.classList.toggle('is-open', menuOpen);
        menu.innerHTML = `
            <button type="button" class="language-menu-toggle" onclick="toggleLanguageMenu()" aria-label="${t('languageTitle')}" aria-expanded="${menuOpen ? 'true' : 'false'}">
                <span aria-hidden="true">⋮</span>
            </button>
            <div class="language-menu-backdrop" onclick="closeLanguageMenu()" aria-hidden="true"></div>
            <aside class="language-sidebar" aria-label="${t('languageTitle')}">
                <nav class="language-options" aria-label="${t('languageTitle')}">
                    ${languages.map(lang => `
                        <button type="button" data-lang-option="${lang.code}" onclick="setLanguage('${lang.code}')" title="${lang.native}">
                            ${lang.native}
                        </button>
                    `).join('')}
                </nav>
            </aside>
        `;
        updateActiveLanguage();
    }

    function setLanguage(code, options = {}) {
        if (!hasLanguage(code)) code = 'pt';
        current = code;
        menuOpen = false;
        saveLanguage(code);
        renderLanguageMenu();
        if (options.rerender !== false && typeof window.renderView === 'function') {
            window.renderView();
        } else {
            apply(document);
        }
    }

    function toggleLanguageMenu(force) {
        menuOpen = typeof force === 'boolean' ? force : !menuOpen;
        renderLanguageMenu();
    }

    function closeLanguageMenu() {
        if (!menuOpen) return;
        menuOpen = false;
        renderLanguageMenu();
    }

    function init() {
        const saved = readSavedLanguage();
        current = hasLanguage(saved) ? saved : 'pt';
        renderLanguageMenu();
        apply(document);
    }

    current = hasLanguage(readSavedLanguage()) ? readSavedLanguage() : 'pt';

    return {
        languages,
        translations,
        get current() { return current; },
        t,
        translatePhrase,
        translateCategoryName,
        translateCategoryPath,
        apply,
        init,
        setLanguage,
        toggleLanguageMenu,
        closeLanguageMenu
    };
})();

function t(key, vars) {
    return I18N.t(key, vars);
}

function applyI18n(root) {
    I18N.apply(root || document);
}

function translateCategoryName(value) {
    return I18N.translateCategoryName(value);
}

function translateCategoryPath(parts, separator) {
    return I18N.translateCategoryPath(parts, separator);
}

function setLanguage(code) {
    I18N.setLanguage(code);
}

function toggleLanguageMenu(force) {
    I18N.toggleLanguageMenu(force);
}

function closeLanguageMenu() {
    I18N.closeLanguageMenu();
}

document.addEventListener('DOMContentLoaded', () => {
    I18N.init();
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') I18N.closeLanguageMenu();
    });
});

window.I18N = I18N;
window.t = t;
window.applyI18n = applyI18n;
window.translateCategoryName = translateCategoryName;
window.translateCategoryPath = translateCategoryPath;
window.setLanguage = setLanguage;
window.toggleLanguageMenu = toggleLanguageMenu;
window.closeLanguageMenu = closeLanguageMenu;

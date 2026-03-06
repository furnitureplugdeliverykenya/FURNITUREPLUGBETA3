/**
 * Furniture Plug Kenya - E-Commerce Application
 * External JavaScript file
 */

const app = (function() {
    'use strict';
    
    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        // Your Cloudflare Worker URL
        API_URL: 'https://furnitureplugbeta2.furnitureplugdelivery.workers.dev',
        
        // WhatsApp Business Number
        WHATSAPP_NUMBER: '254140679628',
        
        // Storage Keys
        STORAGE_KEY: 'fpk_cart_v1',
        
        // Demo Products (used if API fails)
        DEMO_PRODUCTS: [
            {
                id: '1',
                name: '3 link waiting bench',
                price: 16000,
                description: '3-Seater Waiting Chair: Compact seating designed for reception areas, maximizing space.',
                category: 'office chairs',
                image: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=400&h=400&fit=crop'
            },
            {
                id: '2',
                name: 'J-151 Mesh Office Visitor Chair',
                price: 6900,
                description: 'Comfortable mesh office visitor chair with ergonomic design.',
                category: 'office chairs',
                image: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=400&h=400&fit=crop'
            },
            {
                id: '3',
                name: 'Red Crown Banquet Chair',
                price: 3000,
                description: 'Elegant red banquet chair perfect for events and conferences.',
                category: 'banquet',
                image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400&h=400&fit=crop'
            },
            {
                id: '4',
                name: 'Blue Crown Banquet Chair',
                price: 3000,
                description: 'Elegant blue banquet chair perfect for events and conferences.',
                category: 'banquet',
                image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400&h=400&fit=crop'
            },
            {
                id: '5',
                name: 'Black Banquet/Meeting Chair',
                price: 4000,
                description: 'Professional black chair suitable for banquets and meetings.',
                category: 'banquet',
                image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400&h=400&fit=crop'
            },
            {
                id: '6',
                name: 'Wicker Hanging Chair',
                price: 25000,
                description: 'Beautiful wicker hanging chair for outdoor relaxation.',
                category: 'outdoor',
                image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop'
            }
        ]
    };
    
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    let state = {
        products: [],
        cart: [],
        filteredProducts: [],
        currentCategory: 'all',
        searchQuery: '',
        isLoading: false,
        error: null
    };
    
    // ============================================
    // HERO SLIDER STATE
    // ============================================
    let sliderState = {
        currentSlide: 0,
        totalSlides: 2,
        autoPlayInterval: null,
        isAutoPlaying: true
    };
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    function sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
    
    function formatPrice(price) {
        const num = parseFloat(price);
        if (isNaN(num)) return 'Ksh0.00';
        return 'Ksh' + num.toLocaleString('en-KE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = sanitizeInput(message);
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // ============================================
    // HERO SLIDER FUNCTIONS
    // ============================================
    function initSlider() {
        goToSlide(0);
        startAutoPlay();
        
        const slider = document.getElementById('heroSlider');
        let touchStartX = 0;
        let touchEndX = 0;
        
        slider.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            stopAutoPlay();
        }, { passive: true });
        
        slider.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
            startAutoPlay();
        }, { passive: true });
        
        slider.addEventListener('mouseenter', stopAutoPlay);
        slider.addEventListener('mouseleave', startAutoPlay);
        
        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) nextSlide();
                else prevSlide();
            }
        }
    }
    
    function goToSlide(index) {
        const slides = document.querySelectorAll('.hero-slide');
        const dots = document.querySelectorAll('.hero-dot');
        if (index < 0) index = sliderState.totalSlides - 1;
        if (index >= sliderState.totalSlides) index = 0;
        slides[sliderState.currentSlide].classList.remove('active');
        dots[sliderState.currentSlide].classList.remove('active');
        sliderState.currentSlide = index;
        slides[sliderState.currentSlide].classList.add('active');
        dots[sliderState.currentSlide].classList.add('active');
        if (sliderState.isAutoPlaying) startAutoPlay();
    }
    
    function nextSlide() { goToSlide(sliderState.currentSlide + 1); }
    function prevSlide() { goToSlide(sliderState.currentSlide - 1); }
    
    function startAutoPlay() {
        stopAutoPlay();
        sliderState.isAutoPlaying = true;
        sliderState.autoPlayInterval = setInterval(nextSlide, 5000);
    }
    
    function stopAutoPlay() {
        if (sliderState.autoPlayInterval) {
            clearInterval(sliderState.autoPlayInterval);
            sliderState.autoPlayInterval = null;
        }
        sliderState.isAutoPlaying = false;
    }
    
    // ============================================
    // LOCAL STORAGE OPERATIONS
    // ============================================
    function loadCartFromStorage() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (stored) {
                state.cart = JSON.parse(stored);
                updateCartUI();
            }
        } catch (error) {
            console.error('Error loading cart:', error);
            state.cart = [];
        }
    }
    
    function saveCartToStorage() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.cart));
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }
    
    // ============================================
    // PRODUCT OPERATIONS (using API)
    // ============================================
    
    async function fetchProductsFromAPI() {
        try {
            const response = await fetch(CONFIG.API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const products = await response.json();
            return products;
        } catch (error) {
            console.error('Error fetching from API:', error);
            throw error;
        }
    }
    
    async function loadProducts() {
        state.isLoading = true;
        state.error = null;
        updateLoadingState();
        
        try {
            const products = await fetchProductsFromAPI();
            if (products && products.length > 0) {
                state.products = products;
            } else {
                console.log('No products from API, using demo data');
                state.products = CONFIG.DEMO_PRODUCTS;
            }
        } catch (error) {
            console.log('Failed to fetch from API, using demo data');
            state.products = CONFIG.DEMO_PRODUCTS;
        }
        
        state.filteredProducts = [...state.products];
        state.isLoading = false;
        updateLoadingState();
        renderProducts();
    }
    
    function updateLoadingState() {
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        const productsGrid = document.getElementById('productsGrid');
        
        if (state.isLoading) {
            loadingState.style.display = 'flex';
            errorState.style.display = 'none';
            productsGrid.style.display = 'none';
        } else if (state.error) {
            loadingState.style.display = 'none';
            errorState.style.display = 'block';
            productsGrid.style.display = 'none';
            document.getElementById('errorMessage').textContent = sanitizeInput(state.error);
        } else {
            loadingState.style.display = 'none';
            errorState.style.display = 'none';
            productsGrid.style.display = 'grid';
        }
    }
    
    function filterByCategory(category) {
        state.currentCategory = category;
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        const sectionTitle = document.getElementById('sectionTitle');
        sectionTitle.textContent = category === 'all' ? 'All Products' : 
            category.charAt(0).toUpperCase() + category.slice(1);
        applyFilters();
    }
    
    const handleSearch = debounce(function(query) {
        state.searchQuery = query.toLowerCase().trim();
        applyFilters();
    }, 300);
    
    function applyFilters() {
        state.filteredProducts = state.products.filter(product => {
            const categoryMatch = state.currentCategory === 'all' || 
                product.category.toLowerCase() === state.currentCategory.toLowerCase();
            const searchMatch = !state.searchQuery || 
                product.name.toLowerCase().includes(state.searchQuery) ||
                product.description.toLowerCase().includes(state.searchQuery);
            return categoryMatch && searchMatch;
        });
        renderProducts();
    }
    
    function renderProducts() {
        const grid = document.getElementById('productsGrid');
        
        if (state.filteredProducts.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <p style="color: var(--gray-600);">No products found</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = state.filteredProducts.map(product => {
            const cartItem = state.cart.find(item => item.id === product.id);
            const qty = cartItem ? cartItem.quantity : 0;
            
            return `
                <article class="product-card" data-product-id="${sanitizeInput(product.id)}">
                    <div class="product-image-wrapper" onclick="app.openProductDetail('${sanitizeInput(product.id)}')">
                        <img 
                            src="${sanitizeInput(product.image)}" 
                            alt="${sanitizeInput(product.name)}" 
                            class="product-image"
                            loading="lazy"
                            onerror="this.src='https://via.placeholder.com/400'"
                        >
                    </div>
                    <div class="product-info">
                        <h3 class="product-name" onclick="app.openProductDetail('${sanitizeInput(product.id)}')">${sanitizeInput(product.name)}</h3>
                        <p class="product-price">${formatPrice(product.price)}</p>
                        <div class="product-actions">
                            <button 
                                class="qty-btn" 
                                onclick="app.updateCartItem('${sanitizeInput(product.id)}', -1)"
                                ${qty <= 0 ? 'disabled' : ''}
                                aria-label="Decrease quantity"
                            >−</button>
                            <span class="qty-display" id="qty-${sanitizeInput(product.id)}">${qty}</span>
                            <button 
                                class="qty-btn" 
                                onclick="app.updateCartItem('${sanitizeInput(product.id)}', 1)"
                                aria-label="Increase quantity"
                            >+</button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }
    
    // ============================================
    // CART OPERATIONS
    // ============================================
    function updateCartItem(productId, change) {
        const product = state.products.find(p => p.id === productId);
        if (!product) return;
        
        const existingItem = state.cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += change;
            if (existingItem.quantity <= 0) {
                state.cart = state.cart.filter(item => item.id !== productId);
            }
        } else if (change > 0) {
            state.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }
        
        saveCartToStorage();
        updateCartUI();
        renderProducts();
        
        if (change > 0) {
            showToast('Added to cart!');
        }
    }
    
    function removeFromCart(productId) {
        state.cart = state.cart.filter(item => item.id !== productId);
        saveCartToStorage();
        updateCartUI();
        renderCartItems();
        renderProducts();
        showToast('Item removed from cart');
    }
    
    function updateCartItemQuantity(productId, change) {
        const item = state.cart.find(item => item.id === productId);
        if (!item) return;
        
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        
        saveCartToStorage();
        updateCartUI();
        renderCartItems();
        renderProducts();
    }
    
    function updateCartUI() {
        const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        document.getElementById('cartBadge').textContent = totalItems;
        document.getElementById('floatingCartBadge').textContent = totalItems;
        
        document.getElementById('cartItemCount').textContent = `Subtotal (${totalItems} items)`;
        document.getElementById('cartSubtotal').textContent = formatPrice(subtotal);
        document.getElementById('cartTotal').textContent = formatPrice(subtotal);
        
        document.getElementById('checkoutItemCount').textContent = `Subtotal (${totalItems} items)`;
        document.getElementById('checkoutSubtotal').textContent = formatPrice(subtotal);
        document.getElementById('checkoutTotal').textContent = formatPrice(subtotal);
        
        const cartFooter = document.getElementById('cartFooter');
        cartFooter.style.display = totalItems > 0 ? 'block' : 'none';
    }
    
    function renderCartItems() {
        const cartBody = document.getElementById('cartBody');
        
        if (state.cart.length === 0) {
            cartBody.innerHTML = `
                <div class="cart-empty">
                    <div class="cart-empty-icon">🛒</div>
                    <p class="cart-empty-text">Your cart is empty</p>
                </div>
            `;
            return;
        }
        
        cartBody.innerHTML = `
            <div class="cart-items">
                ${state.cart.map(item => `
                    <div class="cart-item">
                        <img 
                            src="${sanitizeInput(item.image)}" 
                            alt="${sanitizeInput(item.name)}" 
                            class="cart-item-image"
                            onerror="this.src='https://via.placeholder.com/80'"
                        >
                        <div class="cart-item-details">
                            <h4 class="cart-item-name">${sanitizeInput(item.name)}</h4>
                            <p class="cart-item-price">${formatPrice(item.price)}</p>
                            <div class="cart-item-actions">
                                <button 
                                    class="cart-item-qty-btn" 
                                    onclick="app.updateCartItemQuantity('${sanitizeInput(item.id)}', -1)"
                                    aria-label="Decrease quantity"
                                >−</button>
                                <span class="cart-item-qty">${item.quantity}</span>
                                <button 
                                    class="cart-item-qty-btn" 
                                    onclick="app.updateCartItemQuantity('${sanitizeInput(item.id)}', 1)"
                                    aria-label="Increase quantity"
                                >+</button>
                                <button 
                                    class="cart-item-remove" 
                                    onclick="app.removeFromCart('${sanitizeInput(item.id)}')"
                                    aria-label="Remove item"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <a href="#" class="continue-shopping" onclick="app.closeCart(); return false;" style="margin-top: 24px;">
                Continue Shopping →
            </a>
        `;
    }
    
    // ============================================
    // MODAL OPERATIONS
    // ============================================
    function openCart() {
        renderCartItems();
        document.getElementById('cartOverlay').classList.add('active');
        document.getElementById('cartModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeCart() {
        document.getElementById('cartOverlay').classList.remove('active');
        document.getElementById('cartModal').classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function openCheckout() {
        closeCart();
        document.getElementById('checkoutOverlay').classList.add('active');
        document.getElementById('checkoutModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeCheckout() {
        document.getElementById('checkoutOverlay').classList.remove('active');
        document.getElementById('checkoutModal').classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function openProductDetail(productId) {
        const product = state.products.find(p => p.id === productId);
        if (!product) return;
        
        const similarProducts = state.products
            .filter(p => p.category === product.category && p.id !== product.id)
            .slice(0, 4);
        
        const cartItem = state.cart.find(item => item.id === productId);
        const qty = cartItem ? cartItem.quantity : 1;
        
        document.getElementById('productDetailBody').innerHTML = `
            <img 
                src="${sanitizeInput(product.image)}" 
                alt="${sanitizeInput(product.name)}" 
                class="product-detail-image"
                onerror="this.src='https://via.placeholder.com/400'"
            >
            <h2 class="product-detail-name">${sanitizeInput(product.name)}</h2>
            <p class="product-detail-price">${formatPrice(product.price)}</p>
            
            <div class="product-detail-section">
                <h3 class="product-detail-section-title">Description</h3>
                <p class="product-detail-description">${sanitizeInput(product.description) || 'No description available.'}</p>
            </div>
            
            <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                <select class="form-input" style="width: 80px;" id="detailQty">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${n === qty ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
                <button class="add-to-cart-btn" onclick="app.addToCartFromDetail('${sanitizeInput(product.id)}')">
                    Add to cart
                </button>
            </div>
            
            ${similarProducts.length > 0 ? `
                <div class="similar-products">
                    <h3 class="similar-products-title">Similar Products</h3>
                    <div class="products-grid">
                        ${similarProducts.map(p => `
                            <article class="product-card" onclick="app.openProductDetail('${sanitizeInput(p.id)}')">
                                <div class="product-image-wrapper">
                                    <img 
                                        src="${sanitizeInput(p.image)}" 
                                        alt="${sanitizeInput(p.name)}" 
                                        class="product-image"
                                        loading="lazy"
                                        onerror="this.src='https://via.placeholder.com/400'"
                                    >
                                </div>
                                <div class="product-info">
                                    <h3 class="product-name">${sanitizeInput(p.name)}</h3>
                                    <p class="product-price">${formatPrice(p.price)}</p>
                                    <button class="add-to-cart-btn" onclick="event.stopPropagation(); app.updateCartItem('${sanitizeInput(p.id)}', 1)">
                                        Add to cart
                                    </button>
                                </div>
                            </article>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
        
        document.getElementById('productOverlay').classList.add('active');
        document.getElementById('productModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeProductDetail() {
        document.getElementById('productOverlay').classList.remove('active');
        document.getElementById('productModal').classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function addToCartFromDetail(productId) {
        const qty = parseInt(document.getElementById('detailQty').value) || 1;
        const product = state.products.find(p => p.id === productId);
        if (!product) return;
        
        const existingItem = state.cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity = qty;
        } else {
            state.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: qty
            });
        }
        
        saveCartToStorage();
        updateCartUI();
        renderProducts();
        showToast('Added to cart!');
    }
    
    // ============================================
    // CHECKOUT & WHATSAPP
    // ============================================
    function placeOrder(event) {
        event.preventDefault();
        
        const nameInput = document.getElementById('customerName');
        const locationInput = document.getElementById('customerLocation');
        
        const name = sanitizeInput(nameInput.value.trim());
        const location = sanitizeInput(locationInput.value.trim());
        
        let hasError = false;
        
        if (!name || name.length < 2) {
            nameInput.classList.add('error');
            hasError = true;
        } else {
            nameInput.classList.remove('error');
        }
        
        if (!location || location.length < 2) {
            locationInput.classList.add('error');
            hasError = true;
        } else {
            locationInput.classList.remove('error');
        }
        
        if (hasError) {
            showToast('Please fill in all required fields');
            return;
        }
        
        const items = state.cart.map(item => 
            `• ${item.name} x ${item.quantity} - ${formatPrice(item.price * item.quantity)}`
        ).join('\n');
        
        const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const message = `Hello Furniture Plug Kenya,\n\n` +
            `My name is ${name} from ${location}.\n\n` +
            `I'd like to order:\n${items}\n\n` +
            `Total: ${formatPrice(total)}\n\n` +
            `Please confirm my order. Thank you!`;
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodedMessage}`;
        
        state.cart = [];
        saveCartToStorage();
        updateCartUI();
        renderProducts();
        closeCheckout();
        window.open(whatsappUrl, '_blank');
        showToast('Redirecting to WhatsApp...');
    }
    
    // ============================================
    // NAVIGATION
    // ============================================
    function goHome() {
        state.currentCategory = 'all';
        state.searchQuery = '';
        document.getElementById('searchInput').value = '';
        filterByCategory('all');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    function viewAllProducts() {
        document.getElementById('productsGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    function scrollToProducts() {
        document.getElementById('products').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        loadCartFromStorage();
        loadProducts();
        initSlider();
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeCart();
                closeCheckout();
                closeProductDetail();
            }
        });
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    return {
        init,
        loadProducts,
        filterByCategory,
        handleSearch,
        updateCartItem,
        updateCartItemQuantity,
        removeFromCart,
        openCart,
        closeCart,
        openCheckout,
        closeCheckout,
        openProductDetail,
        closeProductDetail,
        addToCartFromDetail,
        placeOrder,
        goHome,
        viewAllProducts,
        scrollToProducts,
        sliderNext: nextSlide,
        sliderPrev: prevSlide,
        sliderGoTo: goToSlide
    };
})();

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', app.init);
} else {
    app.init();
}

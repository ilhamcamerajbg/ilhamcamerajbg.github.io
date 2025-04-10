// Load products from JSON file
let catalogProducts = [];

// Fetch products from JSON file
async function loadProducts() {
  try {
    const response = await fetch('products.json'); // Asumsikan file JSON disimpan dengan nama products.json
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    catalogProducts = await response.json();
    
    // Setelah produk dimuat, perbarui UI
    updateCategoryPills();
    renderCatalog();
  } catch (error) {
    console.error('Error loading products:', error);
    document.getElementById('catalogGrid').innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="py-5">
          <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
          <h4>Gagal memuat produk</h4>
          <p class="text-muted">Terjadi kesalahan saat memuat produk. Mohon muat ulang halaman.</p>
        </div>
      </div>
    `;
  }
}

// Render catalog grid with pagination
function renderCatalog(page = 1, itemsPerPage = 24, filterCategory = 'Semua', searchTerm = '', sortBy = 'popular') {
    const catalogGrid = document.getElementById('catalogGrid');
    catalogGrid.innerHTML = ''; // Clear grid
    
    // Filter products
    let filteredProducts = catalogProducts;
    
    if (filterCategory !== 'Semua') {
        filteredProducts = filteredProducts.filter(product => product.category === filterCategory);
    }
    
    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredProducts = filteredProducts.filter(product => 
            product.name.toLowerCase().includes(searchLower) || 
            product.category.toLowerCase().includes(searchLower)
        );
    }
    
    // Sort products
    switch (sortBy) {
        case 'newest':
            filteredProducts.sort((a, b) => a.isNew ? -1 : b.isNew ? 1 : 0);
            break;
        case 'price-low':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'popular':
        default:
            filteredProducts.sort((a, b) => a.isPopular ? -1 : b.isPopular ? 1 : 0);
            break;
    }
    
    // Pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    // Render products
    if (paginatedProducts.length === 0) {
        catalogGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h4>Tidak ada produk yang ditemukan</h4>
                    <p class="text-muted">Coba ubah filter atau kata kunci pencarian</p>
                </div>
            </div>
        `;
        return;
    }
    
    paginatedProducts.forEach(product => {
        // Skip products that don't have a price (not available)
        if (product.price === null) return;
        
        const itemEl = document.createElement('div');
        itemEl.className = 'col-lg-2 col-md-3 col-sm-4 col-6 mb-4';
        
        // Format price display with consideration for multiple duration options
        let priceDisplay = '';
        if (product.price6h && product.price12h && product.price24h) {
            priceDisplay = `Rp${product.price6h.toLocaleString('id-ID')}-${product.price24h.toLocaleString('id-ID')}`;
        } else {
            priceDisplay = `Rp${product.price.toLocaleString('id-ID')}`;
        }
        
        itemEl.innerHTML = `
            <div class="catalog-item" data-id="${product.id}" data-bs-toggle="modal" data-bs-target="#quickViewModal">
                <img src="${product.image}" alt="${product.name}">
                ${product.isNew ? '<span class="catalog-item-badge badge-new">Baru</span>' : ''}
                ${product.isPopular ? '<span class="catalog-item-badge badge-popular">Populer</span>' : ''}
                <div class="catalog-item-overlay">
                    <div class="catalog-item-title">${product.name}</div>
                    <div class="catalog-item-price">${priceDisplay}/hari</div>
                </div>
            </div>
        `;
        
        catalogGrid.appendChild(itemEl);
    });
    
    // Update pagination
    updatePagination(page, Math.ceil(filteredProducts.length / itemsPerPage), filterCategory, searchTerm, sortBy);
    
    // Setup quick view modal triggers
    setupQuickViews();
}

// Update pagination controls
function updatePagination(currentPage, totalPages, filterCategory, searchTerm, sortBy) {
    const paginationContainer = document.querySelector('.catalog-pagination ul');
    if (!paginationContainer) return;
    
    let paginationHTML = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" aria-label="Previous" data-page="${currentPage - 1}">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;
    
    // Display page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" aria-label="Next" data-page="${currentPage + 1}">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
    
    // Add event listeners to pagination controls
    paginationContainer.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageNum = parseInt(this.getAttribute('data-page'));
            if (pageNum) {
                renderCatalog(pageNum, 24, filterCategory, searchTerm, sortBy);
                // Scroll back to top of catalog
                document.getElementById('catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// Setup quick view modal functionality
function setupQuickViews() {
    document.querySelectorAll('.catalog-item').forEach(item => {
        item.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            const product = catalogProducts.find(p => p.id === productId);
            
            if (product) {
                document.getElementById('modalProductTitle').textContent = product.name;
                
                // Format price display for modal with all duration options
                let priceHTML = '';
                if (product.price6h !== null) {
                    priceHTML += `<p>6 Jam: Rp${product.price6h.toLocaleString('id-ID')}</p>`;
                }
                if (product.price12h !== null) {
                    priceHTML += `<p>12 Jam: Rp${product.price12h.toLocaleString('id-ID')}</p>`;
                }
                if (product.price24h !== null) {
                    priceHTML += `<p>24 Jam: Rp${product.price24h.toLocaleString('id-ID')}</p>`;
                }
                
                document.getElementById('modalProductPrice').innerHTML = priceHTML;
                document.getElementById('modalProductImage').src = product.image;
                
                const specsList = document.getElementById('modalProductSpecs');
                specsList.innerHTML = '';
                product.specs.forEach(spec => {
                    const li = document.createElement('li');
                    li.textContent = spec;
                    specsList.appendChild(li);
                });
            }
        });
    });
}

// Add HTML to update the category pills
function updateCategoryPills() {
    // Get unique categories from products
    const categories = ['Semua', ...new Set(catalogProducts.map(p => p.category))];
    
    // Get the category pills container
    const categoryPillsContainer = document.querySelector('.category-pills');
    if (!categoryPillsContainer) return;
    
    // Clear existing pills
    categoryPillsContainer.innerHTML = '';
    
    // Add new pills for each category
    categories.forEach((category, index) => {
        const pill = document.createElement('button');
        pill.className = 'category-pill' + (index === 0 ? ' active' : '');
        pill.textContent = category;
        
        pill.addEventListener('click', function() {
            // Remove active class from all pills
            document.querySelectorAll('.category-pill').forEach(p => {
                p.classList.remove('active');
            });
            
            // Add active class to clicked pill
            this.classList.add('active');
            
            // Get search term and sort value
            const searchTerm = document.getElementById('catalogSearch').value;
            const sortBy = document.getElementById('catalogSort').value;
            
            // Filter products with the selected category
            renderCatalog(1, 24, category, searchTerm, sortBy);
        });
        
        categoryPillsContainer.appendChild(pill);
    });
}

// Initialize AOS animation
AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Initialize catalog when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load products first
    loadProducts().then(() => {
        // Setup search functionality
        const searchInput = document.getElementById('catalogSearch');
        let searchTimeout;
        
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const category = document.querySelector('.category-pill.active').textContent;
                    const sortBy = document.getElementById('catalogSort').value;
                    renderCatalog(1, 24, category, this.value, sortBy);
                }, 500);
            });
        }
        
        // Setup sort functionality
        const sortSelector = document.getElementById('catalogSort');
        if (sortSelector) {
            sortSelector.addEventListener('change', function() {
                const category = document.querySelector('.category-pill.active').textContent;
                const searchTerm = document.getElementById('catalogSearch').value;
                renderCatalog(1, 24, category, searchTerm, this.value);
            });
        }
    });
});
class RecentLoansTable {
    constructor(containerId, apiUrl) {
        this.container = document.getElementById(containerId);
        this.apiUrl = apiUrl;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.init();
    }

    init() {
        this.createTableStructure();
        this.loadData();
    }

    createTableStructure() {
        console.log('🏗️ Creating table structure...');
        this.container.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="d-flex align-items-center">
                        <label class="form-label me-2 mb-0">Mostrar:</label>
                        <select class="form-select form-select-sm" id="itemsPerPageSelect" style="width: auto;">
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                        </select>
                        <span class="ms-2 text-muted">registros por página</span>
                    </div>
                    <div class="text-muted small">
                        <i class="fas fa-database me-1"></i>Datos en tiempo real desde MongoDB
                    </div>
                </div>
                <div class="table-loading" id="recentLoansLoading" style="display: block;">
                    <div class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <p class="text-muted mt-2">Obteniendo datos reales de la base de datos...</p>
                    </div>
                </div>
                <div class="table-responsive" id="recentLoansTable" style="display: none;">
                    <table class="table table-bordered table-hover" width="100%" cellspacing="0">
                        <thead class="table-light">
                            <tr>
                                <th><i class="fas fa-user me-1"></i>Cliente</th>
                                <th><i class="fas fa-dollar-sign me-1"></i>Monto</th>
                                <th><i class="fas fa-calendar me-1"></i>Fecha</th>
                                <th><i class="fas fa-info-circle me-1"></i>Estado</th>
                                <th><i class="fas fa-clock me-1"></i>Próximo Pago</th>
                                <th><i class="fas fa-chart-line me-1"></i>Progreso</th>
                            </tr>
                        </thead>
                        <tbody id="recentLoansBody">
                            <tr>
                                <td colspan="6" class="text-center py-4">
                                    <i class="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i>
                                    <p class="text-muted">Cargando datos de la base de datos...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <div class="text-muted">
                        <span id="paginationInfo">Cargando...</span>
                    </div>
                    <nav>
                        <ul class="pagination pagination-sm mb-0" id="paginationControls">
                        </ul>
                    </nav>
                </div>
            </div>
        `;

        console.log('🎛️ Setting up event listeners...');
        // Agregar event listener para el selector de items por página
        const selectElement = document.getElementById('itemsPerPageSelect');
        if (selectElement) {
            selectElement.addEventListener('change', (e) => {
                console.log('📊 Items per page changed to:', e.target.value);
                this.itemsPerPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.loadData();
            });
        } else {
            console.error('❌ itemsPerPageSelect not found');
        }
    }

    showLoading() {
        document.getElementById('recentLoansLoading').style.display = 'block';
        document.getElementById('recentLoansTable').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('recentLoansLoading').style.display = 'none';
        document.getElementById('recentLoansTable').style.display = 'block';
    }

    async loadData() {
        this.showLoading();
        console.log(`Loading data: page=${this.currentPage}, limit=${this.itemsPerPage}`);

        try {
            const token = localStorage.getItem('token');
            console.log('Token available:', !!token);

            if (!token) {
                // For demo purposes, try without token first
                console.log('No token found, trying without authentication...');
                const response = await fetch(`${this.apiUrl}?page=${this.currentPage}&limit=${this.itemsPerPage}`, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('Data received:', data);

                if (data.loans) {
                    this.renderTable(data.loans);
                    this.updatePagination(data.pagination);
                } else {
                    throw new Error('Formato de datos inválido');
                }
            } else {
                // Use token if available
                const response = await fetch(`${this.apiUrl}?page=${this.currentPage}&limit=${this.itemsPerPage}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('Data received with token:', data);

                if (data.loans) {
                    this.renderTable(data.loans);
                    this.updatePagination(data.pagination);
                } else {
                    throw new Error('Formato de datos inválido');
                }
            }
        } catch (error) {
            console.error('Error loading loans data:', error);
            this.renderError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    renderTable(loans) {
        console.log('📊 Rendering table with', loans.length, 'loans');
        const tbody = document.getElementById('recentLoansBody');

        if (!tbody) {
            console.error('❌ recentLoansBody not found');
            return;
        }

        if (loans.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
                        <p class="text-muted mb-1">No hay préstamos registrados en la base de datos</p>
                        <small class="text-muted">Los datos se obtienen directamente de MongoDB</small>
                    </td>
                </tr>
            `;
            return;
        }

        console.log('🔄 Processing loan data...');
        tbody.innerHTML = loans.map((loan, index) => {
            const statusClass = this.getStatusClass(loan.status);
            const progressClass = this.getProgressClass(loan.progress);
            const formattedDate = new Date(loan.date).toLocaleDateString('es-ES');
            const formattedNextPayment = loan.nextPayment ? new Date(loan.nextPayment).toLocaleDateString('es-ES') : 'Completado';
            const formattedAmount = new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'USD'
            }).format(loan.amount);

            const rowNumber = ((this.currentPage - 1) * this.itemsPerPage) + index + 1;

            return `
                <tr class="table-row-hover">
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 30px; height: 30px; font-size: 12px;">
                                ${rowNumber}
                            </div>
                            <strong>${loan.clientName || 'Cliente Desconocido'}</strong>
                        </div>
                    </td>
                    <td><strong class="text-success">${formattedAmount}</strong></td>
                    <td><small class="text-muted">${formattedDate}</small></td>
                    <td><span class="badge ${statusClass}">${loan.status || 'Desconocido'}</span></td>
                    <td><small class="text-muted">${formattedNextPayment}</small></td>
                    <td>
                        <div class="progress" style="height: 10px;">
                            <div class="progress-bar ${progressClass}"
                                  style="width: ${Math.max(0, Math.min(100, loan.progress || 0))}%"
                                  aria-valuenow="${loan.progress || 0}"
                                  aria-valuemin="0"
                                  aria-valuemax="100"
                                  title="${Math.round(loan.progress || 0)}% completado">
                            </div>
                        </div>
                        <small class="text-muted">${Math.round(loan.progress || 0)}%</small>
                    </td>
                </tr>
            `;
        }).join('');

        console.log('✅ Table rendered successfully with', loans.length, 'rows');
    }

    renderError(errorMessage = 'Error al cargar los datos') {
        const tbody = document.getElementById('recentLoansBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-exclamation-triangle fa-2x text-warning mb-2"></i>
                    <p class="text-muted mb-1">${errorMessage}</p>
                    <small class="text-muted d-block mb-3">No se pudieron obtener los datos de MongoDB</small>
                    <button class="btn btn-sm btn-outline-primary" onclick="recentLoansTable.loadData()">
                        <i class="fas fa-redo me-1"></i>Reintentar Conexión
                    </button>
                </td>
            </tr>
        `;
    }

    getStatusClass(status) {
        const statusClasses = {
            'Activo': 'bg-success',
            'Pagado': 'bg-primary',
            'Vencido': 'bg-danger',
            'Pendiente': 'bg-warning'
        };
        return statusClasses[status] || 'bg-secondary';
    }

    getProgressClass(progress) {
        if (progress >= 80) return 'bg-success';
        if (progress >= 50) return 'bg-warning';
        return 'bg-danger';
    }

    updatePagination(pagination) {
        if (!pagination) return;

        this.totalPages = pagination.pages;
        this.currentPage = pagination.page;

        // Update info
        const start = ((pagination.page - 1) * pagination.limit) + 1;
        const end = Math.min(pagination.page * pagination.limit, pagination.total);
        document.getElementById('paginationInfo').textContent = 
            `Mostrando ${start}-${end} de ${pagination.total} registros`;

        // Update pagination controls
        const paginationControls = document.getElementById('paginationControls');
        paginationControls.innerHTML = this.generatePaginationHTML(pagination);
    }

    generatePaginationHTML(pagination) {
        let html = '';
        const { page, pages } = pagination;

        // Previous button
        html += `
            <li class="page-item ${page <= 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="recentLoansTable.goToPage(${page - 1})" aria-label="Anterior">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(pages, page + 2);

        if (startPage > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="recentLoansTable.goToPage(1)">1</a></li>`;
            if (startPage > 2) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="recentLoansTable.goToPage(${i})">${i}</a>
                </li>
            `;
        }

        if (endPage < pages) {
            if (endPage < pages - 1) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            html += `<li class="page-item"><a class="page-link" href="#" onclick="recentLoansTable.goToPage(${pages})">${pages}</a></li>`;
        }

        // Next button
        html += `
            <li class="page-item ${page >= pages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="recentLoansTable.goToPage(${page + 1})" aria-label="Siguiente">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;

        return html;
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        this.currentPage = page;
        this.loadData();
    }

    refresh() {
        console.log('Manual refresh called');
        this.loadData();
    }

    // Manual initialization function for debugging
    static init() {
        initializeRecentLoansTable();
    }
}

// Agregar estilos CSS adicionales
const additionalStyles = `
    <style>
        .table-row-hover:hover {
            background-color: #f8f9fa !important;
            cursor: pointer;
        }
        .progress {
            background-color: #e9ecef;
            border-radius: 0.375rem;
        }
        .badge {
            font-size: 0.75em;
            padding: 0.375em 0.75em;
        }
        .form-select-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
        }
        .table th {
            border-top: none;
            font-weight: 600;
            background-color: #f8f9fa;
        }
        .spinner-border {
            width: 2rem;
            height: 2rem;
        }
    </style>
`;

// Insertar estilos en el head
if (!document.querySelector('#recent-loans-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'recent-loans-styles';
    styleElement.innerHTML = additionalStyles;
    document.head.appendChild(styleElement);
}

// Initialize immediately and force replacement of any hardcoded content
function initializeRecentLoansTable() {
    console.log('🚀 Initializing RecentLoansTable...');
    const container = document.getElementById('recentLoansContainer');

    if (!container) {
        console.error('❌ recentLoansContainer not found');
        return;
    }

    console.log('✅ Found recentLoansContainer, clearing any existing content...');

    // Clear any existing hardcoded content immediately
    container.innerHTML = '';

    try {
        console.log('🔧 Creating RecentLoansTable instance...');
        window.recentLoansTable = new RecentLoansTable(
            'recentLoansContainer',
            'https://clean-daphene-personal351-7963be99.koyeb.app/api/dashboard/recent-loans'
        );
        console.log('✅ RecentLoansTable initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing RecentLoansTable:', error);
        // Fallback: show error in container
        container.innerHTML = `
            <div class="alert alert-danger m-3">
                <h5><i class="fas fa-exclamation-triangle me-2"></i>Error al cargar la tabla de préstamos</h5>
                <p class="mb-2">${error.message}</p>
                <button class="btn btn-sm btn-outline-primary" onclick="initializeRecentLoansTable()">
                    <i class="fas fa-redo me-1"></i>Reintentar
                </button>
            </div>
        `;
    }
}

// Execute immediately - don't wait for DOM events
console.log('🎯 Starting RecentLoansTable initialization...');
initializeRecentLoansTable();

// Multiple fallback attempts
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOMContentLoaded - checking if table needs re-initialization...');
    if (!window.recentLoansTable || !document.querySelector('#recentLoansTable')) {
        console.log('🔄 Re-initializing table...');
        initializeRecentLoansTable();
    }
});

// Additional fallback after page load
window.addEventListener('load', () => {
    setTimeout(() => {
        if (!window.recentLoansTable || !document.querySelector('#recentLoansTable')) {
            console.log('⏰ Late initialization fallback...');
            initializeRecentLoansTable();
        }
    }, 500);
});
/**
 * Sistema de Paginación Universal
 * Maneja la paginación para todas las listas del sistema
 */

class PaginationManager {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.currentPage = 1;
        this.pageSize = options.pageSize || 10;
        this.totalRecords = 0;
        this.totalPages = 1;
        this.data = [];
        this.filteredData = [];
        this.renderCallback = options.renderCallback;
        this.searchCallback = options.searchCallback;
        this.labels = {
            showing: 'Mostrando',
            to: 'a',
            of: 'de',
            records: 'registros',
            noRecords: 'No hay registros para mostrar',
            ...options.labels
        };
    }

    setData(data) {
        this.data = data;
        this.filteredData = [...data];
        this.totalRecords = data.length;
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
        this.currentPage = 1;
        this.render();
    }

    setPageSize(size) {
        this.pageSize = parseInt(size);
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
        this.currentPage = 1;
        this.render();
    }

    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.render();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.render();
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.render();
        }
    }

    search(searchTerm) {
        if (this.searchCallback) {
            this.filteredData = this.searchCallback(this.data, searchTerm);
        } else {
            // Búsqueda por defecto en todas las propiedades del objeto
            this.filteredData = this.data.filter(item => {
                return Object.values(item).some(value => 
                    value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
                );
            });
        }
        
        this.totalRecords = this.filteredData.length;
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
        this.currentPage = 1;
        this.render();
    }

    render() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.totalRecords);
        const pageData = this.filteredData.slice(startIndex, endIndex);

        // Renderizar los datos usando el callback
        if (this.renderCallback) {
            this.renderCallback(pageData);
        }

        // Renderizar controles de paginación
        this.renderPaginationControls();
    }

    renderPaginationControls() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const startRecord = this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
        const endRecord = Math.min(this.currentPage * this.pageSize, this.totalRecords);

        const paginationHtml = `
            <div class="d-flex justify-content-between align-items-center mt-3" id="${this.containerId}_pagination">
                <div class="d-flex align-items-center">
                    <span class="text-muted small me-3">
                        ${this.labels.showing} ${startRecord} ${this.labels.to} ${endRecord} ${this.labels.of} ${this.totalRecords} ${this.labels.records}
                    </span>
                    <div class="d-flex align-items-center">
                        <span class="me-2 text-muted small">Mostrar:</span>
                        <select class="form-select form-select-sm" style="width: auto;" onchange="window.${this.containerId}_manager.setPageSize(this.value)">
                            <option value="10" ${this.pageSize === 10 ? 'selected' : ''}>10</option>
                            <option value="25" ${this.pageSize === 25 ? 'selected' : ''}>25</option>
                            <option value="50" ${this.pageSize === 50 ? 'selected' : ''}>50</option>
                            <option value="100" ${this.pageSize === 100 ? 'selected' : ''}>100</option>
                        </select>
                    </div>
                </div>
                <nav>
                    <ul class="pagination pagination-sm mb-0">
                        <li class="page-item ${this.currentPage <= 1 ? 'disabled' : ''}">
                            <a class="page-link" href="#" onclick="event.preventDefault(); window.${this.containerId}_manager.prevPage()">
                                <i class="fas fa-chevron-left"></i>
                            </a>
                        </li>
                        ${this.generatePageNumbers()}
                        <li class="page-item ${this.currentPage >= this.totalPages ? 'disabled' : ''}">
                            <a class="page-link" href="#" onclick="event.preventDefault(); window.${this.containerId}_manager.nextPage()">
                                <i class="fas fa-chevron-right"></i>
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        `;

        // Remover paginación existente
        const existingPagination = document.getElementById(`${this.containerId}_pagination`);
        if (existingPagination) {
            existingPagination.remove();
        }

        // Agregar nueva paginación
        container.insertAdjacentHTML('afterend', paginationHtml);

        // Registrar manager globalmente para callbacks
        window[`${this.containerId}_manager`] = this;
    }

    generatePageNumbers() {
        let pages = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

        // Ajustar si estamos cerca del final
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Primera página
        if (startPage > 1) {
            pages += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="event.preventDefault(); window.${this.containerId}_manager.goToPage(1)">1</a>
                </li>
            `;
            if (startPage > 2) {
                pages += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // Páginas visibles
        for (let i = startPage; i <= endPage; i++) {
            pages += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="event.preventDefault(); window.${this.containerId}_manager.goToPage(${i})">${i}</a>
                </li>
            `;
        }

        // Última página
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                pages += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            pages += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="event.preventDefault(); window.${this.containerId}_manager.goToPage(${this.totalPages})">${this.totalPages}</a>
                </li>
            `;
        }

        return pages;
    }

    // Método para crear barra de búsqueda
    createSearchBar(placeholder = 'Buscar...') {
        return `
            <div class="mb-3">
                <div class="input-group">
                    <span class="input-group-text"><i class="fas fa-search"></i></span>
                    <input type="text" class="form-control" placeholder="${placeholder}" 
                           onkeyup="window.${this.containerId}_manager.search(this.value)">
                    <button class="btn btn-outline-secondary" type="button" 
                            onclick="this.previousElementSibling.value=''; window.${this.containerId}_manager.search('')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }
}

// Funciones de utilidad para renderizado común
const PaginationUtils = {
    // Renderizar tabla vacía
    renderEmptyTable(tbody, colspan, icon, message) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="text-center py-4">
                    <i class="${icon} fa-3x text-muted mb-3"></i>
                    <p class="text-muted">${message}</p>
                </td>
            </tr>
        `;
    },

    // Renderizar estado de carga
    renderLoadingTable(tbody, colspan, message = 'Cargando...') {
        tbody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="mt-2 text-muted">${message}</p>
                </td>
            </tr>
        `;
    },

    // Formatear fecha
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-ES');
    },

    // Formatear moneda
    formatCurrency(amount) {
        return `$${amount.toLocaleString()}`;
    },

    // Crear badge de estado
    createStatusBadge(status, type = 'info') {
        const badgeTypes = {
            'activo': 'success',
            'pagado': 'primary',
            'vencido': 'danger',
            'individual': 'info',
            'grupo': 'warning',
            'pago': 'success',
            'interes': 'info',
            'mora': 'warning'
        };
        
        const badgeClass = badgeTypes[status.toLowerCase()] || type;
        return `<span class="badge bg-${badgeClass}">${status}</span>`;
    }
};
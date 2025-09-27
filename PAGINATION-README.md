# Sistema de Paginación Universal

## Descripción
Sistema de paginación reutilizable implementado para todas las listas del sistema de préstamos. Proporciona funcionalidades de paginación, búsqueda y renderizado consistente.

## Archivos Implementados

### ✅ Archivos Actualizados
- `js/pagination.js` - Sistema de paginación principal
- `loan-admin.html` - Dashboard principal con paginación en:
  - Lista de clientes
  - Lista de préstamos  
  - Lista de pagos
  - Reportes detallados
- `client-search.html` - Búsqueda de clientes con paginación en:
  - Historial de préstamos del cliente
  - Historial de pagos del cliente
- `data-management.html` - Gestión de datos con:
  - Vista previa paginada de clientes
  - Vista previa paginada de préstamos
  - Vista previa paginada de pagos
- `pagination-example.html` - Ejemplo de implementación

## Características Implementadas

### 🔍 Funcionalidades de Paginación
- **Navegación por páginas**: Anterior, siguiente, ir a página específica
- **Tamaños de página configurables**: 10, 25, 50, 100 registros
- **Información de registros**: "Mostrando X a Y de Z registros"
- **Navegación inteligente**: Muestra páginas relevantes con puntos suspensivos

### 🔎 Funcionalidades de Búsqueda
- **Búsqueda en tiempo real**: Filtrado mientras se escribe
- **Búsqueda personalizable**: Función de búsqueda específica por tipo de datos
- **Botón de limpiar**: Resetea la búsqueda fácilmente
- **Búsqueda por múltiples campos**: Nombre, email, teléfono, etc.

### 🎨 Interfaz de Usuario
- **Diseño consistente**: Mismo estilo en todas las listas
- **Responsive**: Funciona en dispositivos móviles
- **Estados visuales**: Carga, vacío, error
- **Iconos informativos**: FontAwesome para mejor UX

## Uso del Sistema

### 1. Incluir el Script
```html
<script src="js/pagination.js"></script>
```

### 2. Estructura HTML Básica
```html
<div id="searchBar"></div>
<table class="table" id="myTable">
    <thead>
        <tr>
            <th>Columna 1</th>
            <th>Columna 2</th>
        </tr>
    </thead>
    <tbody id="myTableBody">
    </tbody>
</table>
```

### 3. Inicializar Paginación
```javascript
let myPagination = new PaginationManager('myTable', {
    pageSize: 10,
    renderCallback: renderMyTable,
    searchCallback: searchMyData,
    labels: { records: 'elementos' }
});

// Agregar barra de búsqueda
document.getElementById('searchBar').innerHTML = 
    myPagination.createSearchBar('Buscar...');

// Cargar datos
myPagination.setData(myDataArray);
```

### 4. Implementar Callbacks
```javascript
function renderMyTable(data) {
    const tbody = document.getElementById('myTableBody');
    
    if (data.length === 0) {
        PaginationUtils.renderEmptyTable(tbody, 2, 'fas fa-search', 'No hay datos');
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.field1}</td>
                <td>${item.field2}</td>
            </tr>
        `;
    });
}

function searchMyData(data, searchTerm) {
    return data.filter(item => 
        item.field1.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.field2.toLowerCase().includes(searchTerm.toLowerCase())
    );
}
```

## Opciones de Configuración

### PaginationManager Options
```javascript
{
    pageSize: 10,           // Registros por página
    renderCallback: func,   // Función para renderizar datos
    searchCallback: func,   // Función para búsqueda personalizada
    labels: {              // Etiquetas personalizables
        showing: 'Mostrando',
        to: 'a',
        of: 'de',
        records: 'registros',
        noRecords: 'No hay registros'
    }
}
```

## Utilidades Disponibles

### PaginationUtils
```javascript
// Renderizar tabla vacía
PaginationUtils.renderEmptyTable(tbody, colspan, icon, message);

// Renderizar estado de carga
PaginationUtils.renderLoadingTable(tbody, colspan, message);

// Formatear fecha
PaginationUtils.formatDate(dateString);

// Formatear moneda
PaginationUtils.formatCurrency(amount);

// Crear badge de estado
PaginationUtils.createStatusBadge(status, type);
```

## Métodos de la Clase PaginationManager

### Métodos Principales
- `setData(data)` - Cargar datos
- `setPageSize(size)` - Cambiar tamaño de página
- `goToPage(page)` - Ir a página específica
- `nextPage()` - Página siguiente
- `prevPage()` - Página anterior
- `search(term)` - Buscar en los datos
- `render()` - Re-renderizar vista actual

### Métodos de Utilidad
- `createSearchBar(placeholder)` - Crear barra de búsqueda
- `renderPaginationControls()` - Renderizar controles
- `generatePageNumbers()` - Generar números de página

## Ejemplos de Implementación

### Lista de Clientes
```javascript
// Configuración específica para clientes
const clientsPagination = new PaginationManager('clientsTable', {
    pageSize: 10,
    renderCallback: renderClientsTable,
    searchCallback: searchClients,
    labels: { records: 'clientes' }
});

function searchClients(clients, searchTerm) {
    return clients.filter(client => 
        client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.telefono.includes(searchTerm)
    );
}
```

### Lista de Préstamos
```javascript
// Configuración específica para préstamos
const loansPagination = new PaginationManager('loansTable', {
    pageSize: 15,
    renderCallback: renderLoansTable,
    searchCallback: searchLoans,
    labels: { records: 'préstamos' }
});

function searchLoans(loans, searchTerm) {
    return loans.filter(loan => {
        const clientName = loan.cliente_info ? 
            `${loan.cliente_info.nombre} ${loan.cliente_info.apellido}` : 
            `Cliente ID: ${loan.cliente_id}`;
        return clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               loan.estado.toLowerCase().includes(searchTerm.toLowerCase());
    });
}
```

## Beneficios del Sistema

### ✅ Ventajas
- **Consistencia**: Mismo comportamiento en todas las listas
- **Reutilizable**: Una sola implementación para múltiples casos
- **Configurable**: Adaptable a diferentes necesidades
- **Responsive**: Funciona en todos los dispositivos
- **Accesible**: Cumple estándares de accesibilidad
- **Performante**: Manejo eficiente de grandes conjuntos de datos

### 🚀 Mejoras Implementadas
- **Búsqueda instantánea**: Sin necesidad de botones
- **Navegación intuitiva**: Controles claros y fáciles de usar
- **Estados visuales**: Feedback claro para el usuario
- **Formateo automático**: Fechas y monedas formateadas
- **Badges de estado**: Identificación visual rápida

## Compatibilidad

### Navegadores Soportados
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Dependencias
- Bootstrap 5.2.3+
- FontAwesome 6.0+
- JavaScript ES6+

## Mantenimiento

### Para Agregar Nueva Lista
1. Incluir `pagination.js` en el HTML
2. Crear estructura de tabla HTML
3. Inicializar PaginationManager
4. Implementar callbacks de renderizado y búsqueda
5. Cargar datos con `setData()`

### Para Personalizar Estilos
- Modificar clases CSS de Bootstrap
- Personalizar iconos de FontAwesome
- Ajustar labels en configuración

## Archivos de Referencia
- `pagination-example.html` - Ejemplo completo de implementación
- `js/pagination.js` - Código fuente del sistema
- `loan-admin.html` - Implementación en dashboard principal
- `client-search.html` - Implementación en búsqueda de clientes
- `data-management.html` - Implementación en gestión de datos
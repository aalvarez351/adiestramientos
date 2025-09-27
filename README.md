# Aplicación de Registro de Cursos Avanzados de Informática

## Descripción
Aplicación web completa para registro de intereses en cursos avanzados de informática, con sistema de autenticación de usuarios y dashboard administrativo.

## Arquitectura
- **Frontend**: HTML/CSS/JavaScript puro, desplegado en GitHub Pages
- **Backend**: Node.js + Express, desplegado en hosting (ej: Heroku)
- **Base de Datos**: MongoDB Atlas (Cloud)

## Características
- ✅ Landing page con información de cursos
- ✅ Formulario de registro de interés (sin cuenta requerida)
- ✅ Sistema de autenticación con JWT
- ✅ Dashboard administrativo con gestión de usuarios
- ✅ Portal de usuario con detalles de cursos
- ✅ Base de datos MongoDB con colecciones `users` y `course_interests`

## Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/aalvarez351/advanced-computer-courses.git
cd advanced-computer-courses
```

### 2. Instalar dependencias (Backend)
```bash
npm install
```

### 3. Configurar variables de entorno
Crear archivo `.env`:
```env
MONGO_URI=mongodb+srv://aalvarez351:Lentesdesol@ianube.furqsl0.mongodb.net/
PORT=3000
JWT_SECRET=your_jwt_secret_key_here
```

### 4. Ejecutar localmente
```bash
npm start
```

## Despliegue

### Frontend (GitHub Pages)
1. Crear repositorio en GitHub
2. Subir archivos HTML, CSS, JS
3. Ir a Settings → Pages → Deploy from branch → main
4. URL: `https://aalvarez351.github.io/nombre-repo/`

### Backend (Koyeb - Actual)
1. Ve a [Koyeb Dashboard](https://app.koyeb.com)
2. Crea nueva app conectando tu repo de GitHub
3. Configura variables de entorno:
   ```
   MONGO_URI=mongodb+srv://aalvarez351:Lentesdesol@ianube.furqsl0.mongodb.net/
   JWT_SECRET=tu_clave_jwt_segura
   PORT=8000
   ```
4. Build command: `npm install`
5. Run command: `npm start`
6. Despliega y obtén la URL (ej: `https://tu-app.koyeb.app`)

### Solución de Problemas MongoDB en Koyeb
Si hay errores SSL con MongoDB Atlas:
1. Ve a MongoDB Atlas → Network Access
2. Agrega IP `0.0.0.0/0` (temporalmente)
3. O configura DNS personalizado en Koyeb

### Alternativa: Railway (Más confiable)
1. Ve a [Railway.app](https://railway.app)
2. Conecta tu repo de GitHub
3. Railway detecta automáticamente Node.js
4. Configura variables de entorno
5. Se despliega automáticamente

## URLs de Producción
- **Frontend**: `https://aalvarez351.github.io/`
- **Backend**: `https://conectandopersonas.life`

## Credenciales de Prueba
- **Admin**: `aalvarez351@gmail.com` / `Lentesdesol*`

## Estructura de Base de Datos

### Colección `users`
```json
{
  "_id": ObjectId,
  "name": "Admin User",
  "email": "aalvarez351@gmail.com",
  "password": "hashed_password",
  "role": "admin"
}
```

### Colección `course_interests`
```json
{
  "_id": ObjectId,
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "juan@example.com",
  "phone": "+507-12345678",
  "course": "AI"
}
```

## Endpoints API
- `POST /register` - Registrar interés en curso
- `POST /login` - Autenticación de usuario
- `POST /register-user` - Crear cuenta de usuario
- `GET /users` - Lista de usuarios registrados (admin)
- `GET /courses` - Información de cursos
- `GET /verify-token` - Verificar token JWT

## Tecnologías Utilizadas
- **Frontend**: HTML5, CSS3, Bootstrap 5, JavaScript ES6
- **Backend**: Node.js, Express.js
- **Base de Datos**: MongoDB Atlas
- **Autenticación**: JWT (JSON Web Tokens)
- **Encriptación**: bcryptjs
- **CORS**: Configurado para múltiples orígenes

## Seguridad
- Autenticación JWT con expiración
- Contraseñas hasheadas con bcrypt
- Validación de roles (admin/user)
- CORS configurado para dominios específicos
- Middleware de autenticación en rutas protegidas

## Desarrollo
Para desarrollo local:
1. Frontend: Abrir archivos HTML con Live Server
2. Backend: `npm start` en puerto 3000
3. Base de datos: MongoDB Atlas

## Contribución
1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Sistema de Gestión de Préstamos - KPIs

### 6 KPIs Principales
1. **Pago Mensual Esperado**: (Capital / Plazo) + Interés programado
2. **Total Pagado**: SUMA(Pagos realizados)
3. **Interés Acumulado**: SUMA(Intereses cobrados)
4. **Atrasos Acumulados**: SUMA(Multas por atraso)
5. **Saldo Actual**: Capital inicial – SUMA(Abonos)
6. **Diferencia Pendiente**: Total a pagar – Total pagado

### Dashboard HTML
```html
<div class="row mb-4">
    <div class="col-md-3">
        <div class="card">
            <div class="card-header">
                <h6 class="card-title mb-0">Estado de Préstamos</h6>
            </div>
            <div class="card-body">
                <canvas id="loansStatusChart" width="309" height="309" style="display: block; box-sizing: border-box; height: 413px; width: 413px;"></canvas>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card">
            <div class="card-header">
                <h6 class="card-title mb-0">Distribución de Cartera</h6>
            </div>
            <div class="card-body">
                <canvas id="portfolioChart" width="309" height="232" style="display: block; box-sizing: border-box; height: 310px; width: 413px;"></canvas>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center">
            <div class="card-body">
                <h5 class="text-primary" id="totalLoans">$0</h5>
                <small class="text-muted">Total Cartera</small>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center">
            <div class="card-body">
                <h5 class="text-success" id="totalPaid">$0</h5>
                <small class="text-muted">Total Pagado</small>
            </div>
        </div>
    </div>
</div>

<div class="row mb-4">
    <div class="col-md-4">
        <div class="card text-center">
            <div class="card-body">
                <h5 class="text-warning" id="interestAccumulated">$0</h5>
                <small class="text-muted">Interés Acumulado</small>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card text-center">
            <div class="card-body">
                <h5 class="text-danger" id="lateFeesAccumulated">$0</h5>
                <small class="text-muted">Atrasos Acumulados</small>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card text-center">
            <div class="card-body">
                <h5 class="text-info" id="currentBalance">$0</h5>
                <small class="text-muted">Saldo Pendiente</small>
            </div>
        </div>
    </div>
</div>
```

### JavaScript para KPIs
```javascript
class LoanKPICalculator {
    static calculateKPIs(loan) {
        const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0);
        const interestAccumulated = loan.payments.reduce((sum, p) => sum + p.interest, 0);
        const lateFeesAccumulated = loan.payments.reduce((sum, p) => sum + p.lateFee, 0);
        const principalPaid = loan.payments.reduce((sum, p) => sum + p.principal, 0);
        
        const monthlyPayment = (loan.principal / loan.termMonths) + (loan.principal * loan.interestRate / 100 / 12);
        const currentBalance = loan.principal - principalPaid;
        const totalToPay = loan.principal + (loan.principal * loan.interestRate / 100) + lateFeesAccumulated;
        const difference = totalToPay - totalPaid;
        
        return {
            monthlyPayment: Math.round(monthlyPayment * 100) / 100,
            totalPaid: Math.round(totalPaid * 100) / 100,
            interestAccumulated: Math.round(interestAccumulated * 100) / 100,
            lateFeesAccumulated: Math.round(lateFeesAccumulated * 100) / 100,
            currentBalance: Math.round(currentBalance * 100) / 100,
            totalToPay: Math.round(totalToPay * 100) / 100,
            difference: Math.round(difference * 100) / 100
        };
    }
    
    static updateDashboard(loans) {
        const totals = loans.reduce((acc, loan) => {
            const kpis = this.calculateKPIs(loan);
            acc.totalLoans += loan.principal;
            acc.totalPaid += kpis.totalPaid;
            acc.interestAccumulated += kpis.interestAccumulated;
            acc.lateFeesAccumulated += kpis.lateFeesAccumulated;
            acc.currentBalance += kpis.currentBalance;
            return acc;
        }, { totalLoans: 0, totalPaid: 0, interestAccumulated: 0, lateFeesAccumulated: 0, currentBalance: 0 });
        
        document.getElementById('totalLoans').textContent = `$${totals.totalLoans.toLocaleString()}`;
        document.getElementById('totalPaid').textContent = `$${totals.totalPaid.toLocaleString()}`;
        document.getElementById('interestAccumulated').textContent = `$${totals.interestAccumulated.toLocaleString()}`;
        document.getElementById('lateFeesAccumulated').textContent = `$${totals.lateFeesAccumulated.toLocaleString()}`;
        document.getElementById('currentBalance').textContent = `$${totals.currentBalance.toLocaleString()}`;
    }
}
```

## Licencia
Este proyecto está bajo la Licencia MIT.
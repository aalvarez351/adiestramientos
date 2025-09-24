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

### Backend (Heroku)
1. Crear app en Heroku
2. Conectar con GitHub
3. Configurar variables de entorno en Heroku
4. Desplegar automáticamente

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

## Licencia
Este proyecto está bajo la Licencia MIT.
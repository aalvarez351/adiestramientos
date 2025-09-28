# Sistema de Gestión Empresarial

Sistema web para gestión de operaciones empresariales con autenticación segura y panel administrativo.

## Características

- ✅ Autenticación JWT segura
- ✅ Panel administrativo con roles
- ✅ API REST completa
- ✅ Interfaz web responsiva
- ✅ Gestión de datos empresariales
- ✅ Reportes y estadísticas

## Tecnologías

- **Backend**: Node.js, Express.js
- **Base de datos**: MongoDB
- **Autenticación**: JWT + bcrypt
- **Frontend**: HTML5, CSS3, JavaScript
- **Seguridad**: Encriptación AES-256, CORS, Rate Limiting

## Instalación

1. Clonar el repositorio
```bash
git clone [URL_REPOSITORIO]
cd [NOMBRE_PROYECTO]
```

2. Instalar dependencias
```bash
npm install
```

3. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con sus configuraciones
```

4. Iniciar la aplicación
```bash
npm start
```

## Configuración

### Variables de Entorno Requeridas

Copie `.env.example` a `.env` y configure:

- `MONGO_URI`: Conexión a MongoDB
- `DB_NAME`: Nombre de la base de datos
- `JWT_SECRET`: Clave secreta para JWT (mínimo 32 caracteres)
- `ADMIN_EMAIL`: Email del administrador
- `ADMIN_PASSWORD`: Contraseña del administrador
- `LOAN_ADMIN_EMAIL`: Email del administrador de préstamos
- `LOAN_ADMIN_PASSWORD`: Contraseña del administrador de préstamos

### Seguridad

- Todas las contraseñas se almacenan con hash bcrypt (12 rounds)
- JWT con expiración de 24 horas
- Rate limiting: 100 requests por 15 minutos
- Headers de seguridad configurados
- CORS restringido a dominios autorizados

## Uso

### Acceso Web
- Aplicación: `http://localhost:3000`
- Login: `http://localhost:3000/login.html`
- Panel Admin: `http://localhost:3000/admin.html`

### API Endpoints

#### Autenticación
- `POST /login` - Iniciar sesión
- `GET /verify-token` - Verificar token

#### Gestión (requiere autenticación)
- `GET /api/clientes` - Listar clientes
- `POST /api/clientes` - Crear cliente
- `GET /api/prestamos` - Listar préstamos
- `POST /api/prestamos` - Crear préstamo
- `GET /api/pagos` - Listar pagos
- `POST /api/pagos` - Registrar pago

## Estructura del Proyecto

```
├── assets/          # Recursos estáticos
├── css/            # Estilos CSS
├── js/             # Scripts JavaScript
├── .env.example    # Plantilla de configuración
├── .gitignore      # Archivos ignorados por Git
├── index.js        # Servidor principal
├── package.json    # Dependencias del proyecto
└── README.md       # Documentación
```

## Desarrollo

### Scripts Disponibles
- `npm start` - Iniciar servidor
- `npm run import` - Importar datos desde Excel

### Contribución

1. Fork del proyecto
2. Crear rama para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia

Este proyecto es privado y confidencial. Todos los derechos reservados.

## Soporte

Para soporte técnico, contactar al equipo de desarrollo a través de los canales internos de la empresa.

---

**Nota de Seguridad**: Este sistema maneja información sensible. Asegúrese de:
- Usar HTTPS en producción
- Configurar variables de entorno seguras
- Realizar backups regulares de la base de datos
- Mantener las dependencias actualizadas
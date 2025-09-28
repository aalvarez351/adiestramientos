# Configuración de Producción Segura

## Lista de Verificación de Seguridad

### 1. Variables de Entorno
- [ ] Configurar todas las variables en `.env` con valores únicos y seguros
- [ ] JWT_SECRET debe ser una clave aleatoria de al menos 64 caracteres
- [ ] Contraseñas deben tener al menos 12 caracteres con mayúsculas, minúsculas, números y símbolos
- [ ] URLs de base de datos deben usar conexiones SSL/TLS

### 2. Base de Datos
- [ ] Habilitar autenticación en MongoDB
- [ ] Configurar usuarios con permisos mínimos necesarios
- [ ] Habilitar SSL/TLS para conexiones
- [ ] Configurar firewall para restringir acceso
- [ ] Realizar backups automáticos diarios

### 3. Servidor Web
- [ ] Usar HTTPS con certificados SSL válidos
- [ ] Configurar headers de seguridad
- [ ] Implementar rate limiting
- [ ] Configurar CORS para dominios específicos
- [ ] Deshabilitar información de servidor en headers

### 4. Aplicación
- [ ] Validar todas las entradas de usuario
- [ ] Sanitizar datos antes de almacenar
- [ ] Implementar logging de seguridad
- [ ] Configurar monitoreo de errores
- [ ] Actualizar dependencias regularmente

### 5. Archivos Sensibles
- [ ] Verificar que `.env` esté en `.gitignore`
- [ ] Eliminar archivos de datos de prueba
- [ ] Remover logs con información sensible
- [ ] Verificar que no hay credenciales hardcodeadas

## Comandos de Verificación

```bash
# Verificar variables de entorno
npm run validate-env

# Auditoría de seguridad
npm run security-check

# Verificar archivos ignorados
git status --ignored

# Verificar que no hay credenciales en el código
grep -r "password\|secret\|key" --exclude-dir=node_modules .
```

## Configuración de Servidor

### Nginx (Recomendado)
```nginx
server {
    listen 443 ssl http2;
    server_name [DOMINIO_PRODUCCION];
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Headers de seguridad
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Variables de Entorno de Producción
```bash
# Ejemplo de configuración segura
export MONGO_URI="mongodb+srv://[USER_PROD]:[PASS_ENCRYPTED]@[CLUSTER_PROD].mongodb.net/[DB_PROD]?retryWrites=true&w=majority&ssl=true"
export DB_NAME="[DATABASE_PRODUCTION]"
export JWT_SECRET="[RANDOM_64_CHAR_STRING]"
export NODE_ENV="production"
export PORT="3000"
```

## Monitoreo y Logs

### Configurar PM2 para Producción
```bash
# Instalar PM2
npm install -g pm2

# Configurar aplicación
pm2 start index.js --name "sistema-gestion" --env production

# Configurar logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# Guardar configuración
pm2 save
pm2 startup
```

### Backup Automático
```bash
# Script de backup diario (crontab)
0 2 * * * /usr/local/bin/mongodump --uri="[MONGO_URI]" --out="/backups/$(date +\%Y\%m\%d)"
```

## Contacto de Emergencia

En caso de incidente de seguridad:
1. Cambiar inmediatamente todas las credenciales
2. Revisar logs de acceso
3. Notificar al equipo de seguridad
4. Documentar el incidente

---
**IMPORTANTE**: Este archivo contiene información de configuración. No incluir credenciales reales.
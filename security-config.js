// Configuración de seguridad para la aplicación
// Este archivo contiene configuraciones de seguridad sin credenciales

const crypto = require('crypto');

const securityConfig = {
  // Configuración de encriptación
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16
  },

  // Configuración de JWT
  jwt: {
    algorithm: 'HS256',
    expiresIn: '24h',
    issuer: 'secure-app',
    audience: 'app-users'
  },

  // Configuración de bcrypt
  bcrypt: {
    saltRounds: 12,
    maxLength: 72
  },

  // Configuración de rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por ventana
    message: 'Demasiadas solicitudes, intente más tarde'
  },

  // Headers de seguridad
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'"
  },

  // Configuración de CORS segura
  cors: {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    maxAge: 86400 // 24 horas
  }
};

// Función para generar claves seguras
function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Función para encriptar datos sensibles
function encryptSensitiveData(text, key) {
  const iv = crypto.randomBytes(securityConfig.encryption.ivLength);
  const cipher = crypto.createCipher(securityConfig.encryption.algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

// Función para desencriptar datos
function decryptSensitiveData(encryptedData, key) {
  const decipher = crypto.createDecipher(
    securityConfig.encryption.algorithm, 
    key, 
    Buffer.from(encryptedData.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Función para validar configuración de entorno
function validateEnvironmentConfig() {
  const requiredVars = [
    'MONGO_URI',
    'DB_NAME',
    'JWT_SECRET',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'LOAN_ADMIN_EMAIL',
    'LOAN_ADMIN_PASSWORD'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Variables de entorno faltantes: ${missing.join(', ')}`);
  }

  // Validar longitud mínima de JWT_SECRET
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }

  return true;
}

module.exports = {
  securityConfig,
  generateSecureKey,
  encryptSensitiveData,
  decryptSensitiveData,
  validateEnvironmentConfig
};
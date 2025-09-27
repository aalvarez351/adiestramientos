# 📊 Módulo de Importación de Datos Excel

## 🎯 Descripción

Este módulo permite importar datos de clientes y sus movimientos financieros desde un archivo Excel estandarizado llamado `30deagosto.xlsx`. El sistema procesa automáticamente la información y la estructura en MongoDB según el esquema requerido.

## 📋 Requisitos

- **Archivo Excel**: Cualquier archivo `.xlsx` o `.xls` con estructura compatible (debe estar en la raíz del proyecto)
- **Hoja**: `Datos` (contiene todos los registros a importar)
- **Estructura**: Columnas con los mismos nombres que la plantilla `30deagosto.xlsx`
- **Dependencias**: `xlsx` package instalado

## 📊 Estructura del Archivo Excel

### Columnas Esperadas en la Hoja "Datos":

#### Información del Cliente:
- `Nombre del cliente` o `nombre`
- `Apellido del cliente` o `apellido`
- `Teléfono` o `telefono`
- `Correo electrónico` o `correo`
- `Dirección` o `direccion`

#### Información Financiera:
- `Capital` o `capital`
- `Interés` o `interes`
- `Atrasos` o `atrasos`
- `Total` o `total`
- `Saldo total` o `saldo_total`
- `Fecha de creación` o `fecha_creacion`

#### Información de Pagos:
- `Pagos` o `pagos` (monto total de pagos)
- `Fecha de pago` o `fecha_pago`
- Columnas adicionales para pagos múltiples: `Fecha Pago 1`, `Monto Pago 1`, etc.

## 🗂️ Estructura de Datos en MongoDB

### Colección: `clientes`

```json
{
  "_id": ObjectId(),
  "nombre": "Carlos",
  "apellido": "Gómez",
  "telefono": "+50760000000",
  "correo": "carlos@email.com",
  "direccion": "Ciudad de Panamá",
  "cuentas": [
    {
      "cuenta_id": ObjectId(),
      "fecha_creacion": "2025-01-01T00:00:00.000Z",
      "saldo_total": 1200.50,
      "capital": 1000.00,
      "interes_acumulado": 120.50,
      "atrasos": 80.00,
      "total": 1200.50,
      "pagos": [
        {
          "pago_id": ObjectId(),
          "fecha_pago": "2025-01-15T00:00:00.000Z",
          "monto_pago": 100.00,
          "tipo": "quincenal",
          "capital_abonado": 90.00,
          "interes_pagado": 5.00,
          "atraso_pagado": 5.00,
          "saldo_restante": 1100.50
        }
      ]
    }
  ]
}
```

## 🚀 Uso del Módulo

### 1. Desde Línea de Comandos

```bash
# Instalar dependencias
npm install

# Ejecutar importación con archivo específico
node -e "const { importarDatos } = require('./import-excel'); importarDatos('mi_archivo.xlsx');"

# O usar el archivo por defecto
node import-excel.js
```

### 2. Desde la Interfaz Web (Admin)

1. **Acceder como administrador**: `carlosmoto@gmail.com` / `carlosmoto1234`
2. **Ir al panel de préstamos**: `loan-admin.html`
3. **Sección "Importar/Exportar Datos"**
4. **Ingresar nombre del archivo Excel** (ej: `datos_clientes.xlsx`)
5. **Hacer clic en "Importar Datos Excel"**
6. **Confirmar la importación**

### 3. API Programática

```javascript
const { importarDatos } = require('./import-excel');

// Importar archivo específico
await importarDatos('clientes_enero.xlsx');

// Importar archivo por defecto
await importarDatos(); // usa '30deagosto.xlsx'
```

## ⚙️ Funcionalidades Técnicas

### ✅ Validaciones
- Verifica existencia del archivo Excel
- Valida estructura de columnas
- Maneja datos faltantes con valores por defecto

### 🔄 Procesamiento de Datos
- **Conversión de tipos**: Fechas, números, texto
- **Manejo de fechas Excel**: Convierte números seriales a fechas
- **Limpieza de datos**: Elimina espacios, normaliza formatos

### 👥 Gestión de Clientes
- **Cliente nuevo**: Crea registro completo
- **Cliente existente**: Actualiza información y agrega nuevas cuentas
- **Deduplicación**: Basada en correo electrónico único

### 💰 Procesamiento Financiero
- **Cálculos automáticos**: Saldos, intereses, atrasos
- **Historial de pagos**: Vinculado a fechas específicas
- **Frecuencia quincenal**: Pagos cada 15 días

### 🔍 Optimización de Base de Datos

#### Índices Creados:
```javascript
// Índice único para correos
{ correo: 1 } // unique: true

// Índice para búsqueda rápida de cuentas
{ 'cuentas.cuenta_id': 1 }

// Índice para reportes por fecha
{ 'cuentas.pagos.fecha_pago': 1 }

// Índice compuesto para consultas complejas
{ correo: 1, 'cuentas.pagos.fecha_pago': 1 }
```

## 📈 Resultados de la Importación

### ✅ Éxito
- Número de clientes procesados
- Número de cuentas creadas/actualizadas
- Número de pagos importados
- Índices de optimización creados

### ⚠️ Advertencias
- Registros con datos faltantes
- Fechas inválidas convertidas a fecha actual
- Valores numéricos inválidos convertidos a 0

### ❌ Errores
- Archivo Excel no encontrado (usa datos de ejemplo)
- Columnas requeridas faltantes
- Errores de conexión a MongoDB

## 🔧 Configuración

### Variables de Entorno (.env)
```env
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/test
JWT_SECRET=tu_jwt_secret
```

### Ubicación del Archivo Excel
```
📁 proyecto/
├── 📄 cualquier_archivo.xlsx  ← Archivo a importar (cualquier nombre)
├── 📄 30deagosto.xlsx         ← Archivo por defecto (opcional)
├── 📄 import-excel.js         ← Módulo de importación
└── 📄 package.json
```

**Nota**: El archivo Excel debe estar ubicado en la raíz del proyecto. El módulo acepta cualquier nombre de archivo con extensión `.xlsx` o `.xls`.

## 📋 Ejemplo de Archivo Excel

| Nombre del cliente | Apellido del cliente | Teléfono | Correo electrónico | Dirección | Capital | Interés | Atrasos | Total | Saldo total | Fecha de pago | Pagos |
|-------------------|---------------------|----------|-------------------|-----------|---------|---------|---------|-------|-------------|---------------|-------|
| Carlos | Gómez | +50760000000 | carlos@email.com | Ciudad de Panamá | 1000 | 120.50 | 80 | 1200.50 | 1200.50 | 2025-01-15 | 100 |
| María | Rodríguez | +50760000001 | maria@email.com | San Miguelito | 750 | 30 | 20 | 800 | 800 | 2025-01-30 | 80 |

## 🎯 Casos de Uso

### 📊 Importación Inicial
- Carga masiva de datos históricos
- Migración desde sistemas anteriores
- Configuración inicial del sistema

### 🔄 Actualización Periódica
- Importación mensual de nuevos movimientos
- Actualización de saldos y pagos
- Sincronización con sistemas externos

### 📈 Reportes y Análisis
- Datos históricos para análisis financiero
- Generación de reportes consolidados
- Seguimiento de tendencias de pago

## 🛠️ Solución de Problemas

### Archivo no encontrado
```
⚠️ Archivo 30deagosto.xlsx no encontrado. Usando datos de ejemplo...
```
**Solución**: Colocar el archivo Excel en la raíz del proyecto

### Columnas faltantes
```
❌ Error procesando fila: Columnas requeridas no encontradas
```
**Solución**: Verificar nombres de columnas en el Excel

### Errores de conexión
```
❌ Failed to connect to MongoDB
```
**Solución**: Verificar cadena de conexión en `.env`

## 📞 Soporte

Para soporte técnico o preguntas sobre el módulo de importación, contactar al equipo de desarrollo.

---

**Nota**: Este módulo está diseñado específicamente para el archivo `30deagosto.xlsx` con estructura estandarizada. Para archivos con estructuras diferentes, puede requerir modificaciones personalizadas.
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 5000,
  retryWrites: true,
  retryReads: true
});

const BATCH_SIZE = 100; // Procesar en lotes de 100 registros
const MAX_RETRIES = 3;

async function importarDatosGrandes(filename = '30deagosto.xlsx') {
  let db, session;
  
  try {
    console.log(`🚀 Iniciando importación masiva desde: ${filename}`);
    console.log(`📊 Configuración: Lotes de ${BATCH_SIZE} registros`);

    // Conectar a MongoDB
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    db = client.db('test');
    
    // Verificar archivo
    const excelPath = path.join(__dirname, filename);
    if (!fs.existsSync(excelPath)) {
      throw new Error(`❌ Archivo ${filename} no encontrado`);
    }

    const stats = fs.statSync(excelPath);
    console.log(`📁 Tamaño del archivo: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // PASO 1: Limpiar datos existentes
    await limpiarDatosExistentes(db);

    // PASO 2: Leer y procesar Excel
    console.log('📖 Leyendo archivo Excel...');
    const workbook = XLSX.readFile(excelPath, {
      cellDates: true,
      cellNF: false,
      cellText: false,
      raw: false
    });

    const sheetName = workbook.SheetNames[0];
    console.log(`📋 Procesando hoja: "${sheetName}"`);
    
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      dateNF: 'yyyy-mm-dd'
    });

    console.log(`📊 Total de registros encontrados: ${jsonData.length}`);

    // PASO 3: Procesar en lotes
    await procesarEnLotes(db, jsonData);

    // PASO 4: Crear índices
    await crearIndices(db);

    console.log('✅ Importación masiva completada exitosamente');

  } catch (error) {
    console.error('❌ Error en importación masiva:', error.message);
    throw error;
  } finally {
    if (session) await session.endSession();
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

async function limpiarDatosExistentes(db) {
  console.log('🧹 Limpiando datos existentes...');
  
  try {
    // Eliminar todas las colecciones relacionadas con préstamos
    const collections = ['clientes', 'prestamos', 'pagos'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      
      if (count > 0) {
        await collection.deleteMany({});
        console.log(`🗑️  Eliminados ${count} registros de ${collectionName}`);
      }
    }
    
    console.log('✅ Limpieza completada');
  } catch (error) {
    console.error('❌ Error en limpieza:', error.message);
    throw error;
  }
}

async function procesarEnLotes(db, jsonData) {
  const totalBatches = Math.ceil(jsonData.length / BATCH_SIZE);
  console.log(`🔄 Procesando ${totalBatches} lotes...`);

  for (let i = 0; i < totalBatches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, jsonData.length);
    const batch = jsonData.slice(start, end);
    
    console.log(`📦 Procesando lote ${i + 1}/${totalBatches} (${start + 1}-${end})`);
    
    await procesarLote(db, batch, i + 1);
    
    // Pausa pequeña entre lotes para no sobrecargar
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function procesarLote(db, batch, batchNumber) {
  const clientesCollection = db.collection('clientes');
  const prestamosCollection = db.collection('prestamos');
  const pagosCollection = db.collection('pagos');
  
  const clientesParaInsertar = [];
  const prestamosParaInsertar = [];
  const pagosParaInsertar = [];
  
  for (const row of batch) {
    try {
      const { cliente, prestamo, pagos } = procesarFila(row);
      
      if (cliente) clientesParaInsertar.push(cliente);
      if (prestamo) prestamosParaInsertar.push(prestamo);
      if (pagos && pagos.length > 0) pagosParaInsertar.push(...pagos);
      
    } catch (error) {
      console.warn(`⚠️  Error procesando fila en lote ${batchNumber}:`, error.message);
    }
  }
  
  // Insertar en lotes con manejo de errores
  await insertarConReintentos(clientesCollection, clientesParaInsertar, 'clientes');
  await insertarConReintentos(prestamosCollection, prestamosParaInsertar, 'prestamos');
  await insertarConReintentos(pagosCollection, pagosParaInsertar, 'pagos');
}

async function insertarConReintentos(collection, datos, tipo) {
  if (datos.length === 0) return;
  
  for (let intento = 1; intento <= MAX_RETRIES; intento++) {
    try {
      const result = await collection.insertMany(datos, { 
        ordered: false,
        writeConcern: { w: 1, j: true }
      });
      console.log(`✅ Insertados ${result.insertedCount} ${tipo}`);
      return;
    } catch (error) {
      if (intento === MAX_RETRIES) {
        console.error(`❌ Error insertando ${tipo} después de ${MAX_RETRIES} intentos:`, error.message);
        throw error;
      }
      console.warn(`⚠️  Intento ${intento} fallido para ${tipo}, reintentando...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * intento));
    }
  }
}

function procesarFila(row) {
  // Mapear columnas del Excel (ajustar según estructura real)
  const nombre = limpiarTexto(row['Nombre'] || row['nombre'] || row['NOMBRE']);
  const apellido = limpiarTexto(row['Apellido'] || row['apellido'] || row['APELLIDO']);
  const telefono = limpiarTexto(row['Telefono'] || row['telefono'] || row['TELEFONO']);
  const email = limpiarTexto(row['Email'] || row['email'] || row['EMAIL'] || row['Correo']);
  const direccion = limpiarTexto(row['Direccion'] || row['direccion'] || row['DIRECCION']);
  
  // Datos financieros
  const capitalInicial = parseFloat(row['Capital'] || row['capital'] || row['CAPITAL'] || 0);
  const tasaInteres = parseFloat(row['Tasa'] || row['tasa'] || row['TASA'] || 15);
  const plazo = parseInt(row['Plazo'] || row['plazo'] || row['PLAZO'] || 12);
  const fechaCreacion = parsearFecha(row['Fecha'] || row['fecha'] || row['FECHA']);
  
  if (!nombre || !apellido || capitalInicial <= 0) {
    return { cliente: null, prestamo: null, pagos: [] };
  }
  
  // Crear cliente
  const clienteId = new ObjectId();
  const cliente = {
    _id: clienteId,
    nombre,
    apellido,
    telefono: telefono || 'No disponible',
    email: email || `${nombre.toLowerCase()}.${apellido.toLowerCase()}@noemail.com`,
    direccion: direccion || 'No disponible',
    tipo: 'individual',
    fecha_registro: fechaCreacion || new Date()
  };
  
  // Crear préstamo
  const prestamoId = new ObjectId();
  const prestamo = {
    _id: prestamoId,
    cliente_id: clienteId,
    capital_inicial: capitalInicial,
    plazo,
    frecuencia_pago: 'quincenal',
    tasa_interes: tasaInteres,
    condiciones_mora: 'Mora del 5% después de 3 días',
    estado: 'activo',
    fecha_creacion: fechaCreacion || new Date(),
    saldo_actual: capitalInicial,
    total_pagado: 0,
    interes_acumulado: 0,
    atraso_acumulado: 0
  };
  
  // Procesar pagos (si existen)
  const pagos = procesarPagos(row, prestamoId);
  
  return { cliente, prestamo, pagos };
}

function procesarPagos(row, prestamoId) {
  const pagos = [];
  
  // Buscar columnas de pagos
  const columnKeys = Object.keys(row);
  const pagoColumns = columnKeys.filter(key => 
    key.toLowerCase().includes('pago') || 
    key.toLowerCase().includes('abono') ||
    key.toLowerCase().includes('cuota')
  );
  
  pagoColumns.forEach((col, index) => {
    const monto = parseFloat(row[col]);
    if (monto > 0) {
      pagos.push({
        _id: new ObjectId(),
        prestamo_id: prestamoId,
        fecha: new Date(),
        monto,
        tipo: 'pago',
        comprobante: `AUTO-${index + 1}`,
        registrado_por: 'sistema',
        fecha_registro: new Date()
      });
    }
  });
  
  return pagos;
}

function limpiarTexto(texto) {
  if (!texto) return '';
  return String(texto).trim().replace(/\s+/g, ' ');
}

function parsearFecha(fecha) {
  if (!fecha) return new Date();
  
  try {
    if (typeof fecha === 'number') {
      // Número serial de Excel
      const excelEpoch = new Date(1900, 0, 1);
      return new Date(excelEpoch.getTime() + (fecha - 1) * 24 * 60 * 60 * 1000);
    }
    
    if (typeof fecha === 'string') {
      const parsed = new Date(fecha);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    
    return new Date(fecha);
  } catch (error) {
    return new Date();
  }
}

async function crearIndices(db) {
  console.log('🔍 Creando índices optimizados...');
  
  try {
    // Índices para clientes
    await db.collection('clientes').createIndexes([
      { key: { email: 1 }, unique: true, sparse: true },
      { key: { nombre: 1, apellido: 1 } },
      { key: { telefono: 1 } }
    ]);
    
    // Índices para préstamos
    await db.collection('prestamos').createIndexes([
      { key: { cliente_id: 1 } },
      { key: { estado: 1 } },
      { key: { fecha_creacion: -1 } },
      { key: { saldo_actual: 1 } }
    ]);
    
    // Índices para pagos
    await db.collection('pagos').createIndexes([
      { key: { prestamo_id: 1 } },
      { key: { fecha: -1 } },
      { key: { tipo: 1 } }
    ]);
    
    console.log('✅ Índices creados exitosamente');
  } catch (error) {
    console.error('❌ Error creando índices:', error.message);
  }
}

// Función para verificar el progreso
async function verificarImportacion() {
  try {
    await client.connect();
    const db = client.db('test');
    
    const clientesCount = await db.collection('clientes').countDocuments();
    const prestamosCount = await db.collection('prestamos').countDocuments();
    const pagosCount = await db.collection('pagos').countDocuments();
    
    console.log('📊 Resumen de importación:');
    console.log(`   Clientes: ${clientesCount}`);
    console.log(`   Préstamos: ${prestamosCount}`);
    console.log(`   Pagos: ${pagosCount}`);
    
    return { clientesCount, prestamosCount, pagosCount };
  } catch (error) {
    console.error('❌ Error verificando importación:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const filename = process.argv[2] || '30deagosto.xlsx';
  
  importarDatosGrandes(filename)
    .then(() => {
      console.log('🎉 Importación masiva completada');
      return verificarImportacion();
    })
    .then((stats) => {
      console.log('✅ Verificación completada:', stats);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { importarDatosGrandes, verificarImportacion };
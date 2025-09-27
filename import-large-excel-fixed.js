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

const BATCH_SIZE = 100;
const MAX_RETRIES = 3;

async function importarDatosGrandes(filename = '30deagosto.xlsx') {
  let db, session;
  
  try {
    console.log(`🚀 Iniciando importación masiva desde: ${filename}`);
    console.log(`📊 Configuración: Lotes de ${BATCH_SIZE} registros`);

    await client.connect();
    console.log('✅ Conectado a MongoDB');

    db = client.db('test');
    
    const excelPath = path.join(__dirname, filename);
    if (!fs.existsSync(excelPath)) {
      throw new Error(`❌ Archivo ${filename} no encontrado`);
    }

    const stats = fs.statSync(excelPath);
    console.log(`📁 Tamaño del archivo: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    await limpiarDatosExistentes(db);

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

    await procesarEnLotes(db, jsonData);
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
  const clientesMap = new Map();
  
  for (const row of batch) {
    try {
      const { cliente, prestamo, pagos } = procesarFila(row);
      
      if (cliente && prestamo) {
        const clienteKey = `${cliente.nombre}_${cliente.apellido}`;
        
        if (!clientesMap.has(clienteKey)) {
          clientesParaInsertar.push(cliente);
          clientesMap.set(clienteKey, cliente._id);
        }
        
        prestamo.cliente_id = clientesMap.get(clienteKey);
        prestamosParaInsertar.push(prestamo);
        
        if (pagos && pagos.length > 0) {
          pagosParaInsertar.push(...pagos);
        }
      }
      
    } catch (error) {
      console.warn(`⚠️  Error procesando fila en lote ${batchNumber}:`, error.message);
    }
  }
  
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
  // Mapear columnas según estructura real del Excel
  const fechaStr = limpiarTexto(row['0']); // Fecha
  const lugar = limpiarTexto(row['1']); // Lugar
  const nombreCompleto = limpiarTexto(row['2']); // Nombre
  const pagos = parseFloat(row['5'] || 0); // Pagos
  const interes = parseFloat(row['7'] || 0); // Interes
  const atraso = parseFloat(row['8'] || 0); // Atraso
  const total = parseFloat(row['9'] || 0); // Total
  const abono = parseFloat(row['10'] || 0); // Abono
  const capital = parseFloat(row['11'] || 0); // Capital
  const saldo = parseFloat(row['12'] || 0); // Saldo
  
  // Saltar filas de encabezado o vacías
  if (!nombreCompleto || nombreCompleto === 'Nombre' || (!capital && !saldo)) {
    return { cliente: null, prestamo: null, pagos: [] };
  }
  
  // Separar nombre y apellido
  const partesNombre = nombreCompleto.split(' ');
  const nombre = partesNombre[0] || 'Cliente';
  const apellido = partesNombre.slice(1).join(' ') || 'Anónimo';
  
  const fechaCreacion = parsearFecha(fechaStr);
  const capitalInicial = capital > 0 ? capital : (saldo > 0 ? saldo : 1000);
  
  // Crear cliente
  const clienteId = new ObjectId();
  const cliente = {
    _id: clienteId,
    nombre,
    apellido,
    telefono: 'No disponible',
    email: `${nombre.toLowerCase().replace(/[^a-z]/g, '')}.${apellido.toLowerCase().replace(/[^a-z]/g, '')}@noemail.com`,
    direccion: lugar || 'No disponible',
    tipo: 'individual',
    fecha_registro: fechaCreacion || new Date()
  };
  
  // Crear préstamo
  const prestamoId = new ObjectId();
  const prestamo = {
    _id: prestamoId,
    cliente_id: clienteId,
    capital_inicial: capitalInicial,
    plazo: 12,
    frecuencia_pago: 'quincenal',
    tasa_interes: 15,
    condiciones_mora: 'Mora del 5% después de 3 días',
    estado: saldo > 0 ? 'activo' : 'pagado',
    fecha_creacion: fechaCreacion || new Date(),
    saldo_actual: saldo || 0,
    total_pagado: pagos || 0,
    interes_acumulado: interes || 0,
    atraso_acumulado: atraso || 0
  };
  
  // Crear pagos si existen
  const pagosArray = [];
  if (abono > 0) {
    pagosArray.push({
      _id: new ObjectId(),
      prestamo_id: prestamoId,
      fecha: fechaCreacion || new Date(),
      monto: abono,
      tipo: 'pago',
      comprobante: `AUTO-${fechaStr}`,
      registrado_por: 'sistema',
      fecha_registro: new Date()
    });
  }
  
  return { cliente, prestamo, pagos: pagosArray };
}

function limpiarTexto(texto) {
  if (!texto) return '';
  return String(texto).trim().replace(/\s+/g, ' ');
}

function parsearFecha(fecha) {
  if (!fecha) return new Date();
  
  try {
    if (typeof fecha === 'number') {
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
    await db.collection('clientes').createIndexes([
      { key: { email: 1 }, unique: true, sparse: true },
      { key: { nombre: 1, apellido: 1 } },
      { key: { telefono: 1 } }
    ]);
    
    await db.collection('prestamos').createIndexes([
      { key: { cliente_id: 1 } },
      { key: { estado: 1 } },
      { key: { fecha_creacion: -1 } },
      { key: { saldo_actual: 1 } }
    ]);
    
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
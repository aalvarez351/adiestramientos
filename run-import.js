#!/usr/bin/env node

const { importarDatosGrandes, verificarImportacion } = require('./import-large-excel-fixed');

async function ejecutarImportacion() {
  const filename = process.argv[2] || '30deagosto.xlsx';
  
  console.log('🚀 Iniciando proceso de importación masiva...');
  console.log(`📁 Archivo: ${filename}`);
  console.log('⚠️  ADVERTENCIA: Se eliminarán todos los datos existentes\n');
  
  try {
    // Ejecutar importación
    await importarDatosGrandes(filename);
    
    console.log('\n🎉 Importación completada exitosamente!');
    
    // Verificar resultados
    console.log('\n📊 Verificando resultados...');
    const stats = await verificarImportacion();
    
    console.log('\n✅ Proceso completado:');
    console.log(`   📋 Clientes importados: ${stats.clientesCount}`);
    console.log(`   💰 Préstamos creados: ${stats.prestamosCount}`);
    console.log(`   💳 Pagos registrados: ${stats.pagosCount}`);
    
  } catch (error) {
    console.error('\n❌ Error durante la importación:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  ejecutarImportacion();
}

module.exports = { ejecutarImportacion };
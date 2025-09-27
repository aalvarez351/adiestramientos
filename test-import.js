const XLSX = require('xlsx');
const path = require('path');

function testImport() {
  try {
    const excelPath = path.join(__dirname, '30deagosto.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Leer solo las primeras 10 filas para debug
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      range: 0,
      header: 1,
      raw: false
    }).slice(0, 10);
    
    console.log('📊 Primeras 10 filas del Excel:');
    jsonData.forEach((row, index) => {
      console.log(`\n--- Fila ${index + 1} ---`);
      
      const fechaStr = row['0']; // Fecha
      const lugar = row['1']; // Lugar
      const nombreCompleto = row['2']; // Nombre
      const pagos = parseFloat(row['5'] || 0); // Pagos
      const interes = parseFloat(row['7'] || 0); // Interes
      const atraso = parseFloat(row['8'] || 0); // Atraso
      const total = parseFloat(row['9'] || 0); // Total
      const abono = parseFloat(row['10'] || 0); // Abono
      const capital = parseFloat(row['11'] || 0); // Capital
      const saldo = parseFloat(row['12'] || 0); // Saldo
      
      console.log(`   Fecha: ${fechaStr}`);
      console.log(`   Lugar: ${lugar}`);
      console.log(`   Nombre: ${nombreCompleto}`);
      console.log(`   Pagos: ${pagos}`);
      console.log(`   Interes: ${interes}`);
      console.log(`   Atraso: ${atraso}`);
      console.log(`   Total: ${total}`);
      console.log(`   Abono: ${abono}`);
      console.log(`   Capital: ${capital}`);
      console.log(`   Saldo: ${saldo}`);
      
      // Verificar si se procesaría
      const shouldProcess = nombreCompleto && nombreCompleto !== 'Nombre' && (capital > 0 || saldo > 0);
      console.log(`   ¿Se procesaría?: ${shouldProcess}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testImport();
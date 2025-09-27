const XLSX = require('xlsx');
const path = require('path');

function debugExcel() {
  try {
    const excelPath = path.join(__dirname, '30deagosto.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Leer primeras 20 filas para debug
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false }).slice(0, 20);
    
    console.log('🔍 Debug de las primeras 20 filas:');
    
    let validRows = 0;
    
    jsonData.forEach((row, index) => {
      const nombreCompleto = String(row['2'] || '').trim();
      const capital = parseFloat(row['11'] || 0);
      const saldo = parseFloat(row['12'] || 0);
      const abono = parseFloat(row['10'] || 0);
      
      console.log(`\nFila ${index + 1}:`);
      console.log(`  Nombre: "${nombreCompleto}"`);
      console.log(`  Capital (col 11): "${row['11']}" -> ${capital}`);
      console.log(`  Saldo (col 12): "${row['12']}" -> ${saldo}`);
      console.log(`  Abono (col 10): "${row['10']}" -> ${abono}`);
      
      // Condiciones de validación
      const isNotHeader = nombreCompleto && nombreCompleto !== 'Nombre';
      const hasFinancialData = capital > 0 || saldo > 0 || abono > 0;
      
      console.log(`  ¿No es encabezado?: ${isNotHeader}`);
      console.log(`  ¿Tiene datos financieros?: ${hasFinancialData}`);
      console.log(`  ¿Se procesaría?: ${isNotHeader && hasFinancialData}`);
      
      if (isNotHeader && hasFinancialData) {
        validRows++;
      }
    });
    
    console.log(`\n📊 Filas válidas encontradas en muestra: ${validRows}/20`);
    
    // Verificar si hay datos con formato diferente
    console.log('\n🔍 Verificando formato de números:');
    const sampleRow = jsonData[2]; // Tercera fila (debería tener datos)
    if (sampleRow) {
      Object.keys(sampleRow).forEach(key => {
        const value = sampleRow[key];
        if (value && !isNaN(value) && value !== '') {
          console.log(`  Columna ${key}: "${value}" (tipo: ${typeof value})`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugExcel();
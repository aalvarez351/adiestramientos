const XLSX = require('xlsx');
const path = require('path');

function checkColumns() {
  try {
    const excelPath = path.join(__dirname, '30deagosto.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Leer con headers automáticos
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
    
    if (jsonData.length > 0) {
      console.log('📋 Columnas disponibles:');
      const headers = Object.keys(jsonData[0]);
      headers.forEach((header, index) => {
        console.log(`   ${index}: "${header}"`);
      });
      
      console.log('\n📄 Primera fila con datos:');
      const firstRow = jsonData[0];
      Object.entries(firstRow).forEach(([key, value]) => {
        if (value && value !== '') {
          console.log(`   ${key}: "${value}"`);
        }
      });
      
      console.log('\n📄 Segunda fila con datos:');
      if (jsonData[1]) {
        const secondRow = jsonData[1];
        Object.entries(secondRow).forEach(([key, value]) => {
          if (value && value !== '') {
            console.log(`   ${key}: "${value}"`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkColumns();
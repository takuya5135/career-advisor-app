const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function checkFields() {
    try {
        const templatePath = path.join(process.cwd(), 'public', 'rirekisho_03_A4.pdf');
        if (!fs.existsSync(templatePath)) {
            console.log('Template not found:', templatePath);
            return;
        }
        const templateBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(templateBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        
        console.log(`Found ${fields.length} fields.`);
        fields.forEach(field => {
            const name = field.getName();
            console.log(' - ' + name + ' (' + field.constructor.name + ')');
        });
    } catch (e) {
        console.error('Error:', e);
    }
}

checkFields();

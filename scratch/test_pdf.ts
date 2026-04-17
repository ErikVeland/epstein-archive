import fs from 'fs';
import pdf from 'pdf-parse';

async function testPdf(path: string) {
  const dataBuffer = fs.readFileSync(path);
  const data = await pdf(dataBuffer);
  console.log(`PDF: ${path}`);
  console.log(`Pages: ${data.numpages}`);
  console.log(`Text Length: ${data.text.length}`);
  // pdf-parse doesn't easily show embedded image counts, but we can check the buffer
}

testPdf('data/originals/Email 1.pdf').catch(console.error);

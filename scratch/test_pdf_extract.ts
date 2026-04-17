import { getDocument } from 'pdfjs-dist';
import fs from 'fs';
import path from 'path';

async function extractMetadata(pdfPath: string) {
  try {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = getDocument(data);
    const pdf = await loadingTask.promise;
    console.log(`Document: ${pdfPath}`);
    console.log(`Pages: ${pdf.numPages}`);

    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
      const page = await pdf.getPage(i);
      const opList = await page.getOperatorList();
      const images = opList.fnArray.filter((fn) => fn === 82 || fn === 85); // OPS.paintImageXObject, OPS.paintInlineImageXObject
      console.log(`Page ${i}: Found ${images.length} image operations`);
    }
  } catch (err) {
    console.error(`Error processing ${pdfPath}:`, err);
  }
}

const samplePdf = 'data/originals/Gieuffre vs Maxwell Exhibit 1.pdf';
if (fs.existsSync(samplePdf)) {
  extractMetadata(samplePdf);
} else {
  console.log(`Sample PDF not found: ${samplePdf}`);
}

export async function up(pgm) {
  pgm.addColumns('document_annotations', {
    pdf_page: { type: 'integer' },
    pdf_x: { type: 'numeric' },
    pdf_y: { type: 'numeric' },
    pdf_width: { type: 'numeric' },
    pdf_height: { type: 'numeric' },
  });
}

export async function down(pgm) {
  pgm.dropColumns('document_annotations', [
    'pdf_page',
    'pdf_x',
    'pdf_y',
    'pdf_width',
    'pdf_height',
  ]);
}

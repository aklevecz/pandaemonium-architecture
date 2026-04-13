#!/bin/bash
# Upload all PDFs to R2 bucket
BUCKET="pandaemonium-pdfs"
PDF_DIR="./PDFs"

find "$PDF_DIR" -name "*.pdf" | while IFS= read -r file; do
  # Get path relative to PDF_DIR
  rel="${file#$PDF_DIR/}"
  echo "Uploading: $rel"
  npx wrangler r2 object put "$BUCKET/$rel" --file "$file" --content-type "application/pdf" --remote 2>&1 | tail -1
done

echo "Done."

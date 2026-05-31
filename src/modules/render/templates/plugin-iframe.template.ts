function escapeSrcdoc(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getWidgetTemplate(content: string, { width, height }: { width: number; height: number }): string {
  return `
      <!DOCTYPE html>
      <html lang="pl">
        <head>
          <meta charset="UTF-8" />
          <!-- TODO: check security -->
          <!-- <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'none'; img-src 'self' data:; font-src 'self' data:; frame-src 'self'; frame-ancestors 'none';" /> -->
          <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'none'; img-src * data:; font-src 'self' data:; frame-src 'self'; frame-ancestors 'none';" />
          <style>
            html, body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: #ffffff; }
            iframe { border: none; width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          <iframe sandbox="" srcdoc="${escapeSrcdoc(content)}" width="${width}" height="${height}"></iframe>
        </body>
      </html>
    `;
}

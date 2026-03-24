export function getWidgetTemplate(content: string, { width, height }: { width: number; height: number }): string {
  return `
      <!DOCTYPE html>
      <html lang="pl">
        <head>
          <meta charset="UTF-8" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            html, body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: #ffffff; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `;
}

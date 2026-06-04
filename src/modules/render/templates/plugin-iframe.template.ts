export function getWidgetTemplate(content: string, { width, height }: { width: number; height: number }): string {
  return `
<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
      </style>
    </head>
    <body>${content}</body>
  </html>
`;
}

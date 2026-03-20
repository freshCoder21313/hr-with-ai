export const svgToPngBase64 = (svg: SVGElement): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const svgStr = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const width = parseFloat(svg.getAttribute('width') || '1000');
      const height = parseFloat(svg.getAttribute('height') || '1000');
      canvas.width = width;
      canvas.height = height;
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0);
        }
        const dataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        console.error('Image loading failed', e);
        resolve('');
      };
      img.src = url;
    } catch (e) {
      console.error('SVG conversion failed', e);
      resolve('');
    }
  });
};

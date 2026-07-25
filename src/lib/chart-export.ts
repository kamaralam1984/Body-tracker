/**
 * Rasterizes the first `<svg>` found inside `container` (every chart in this
 * design system renders through Recharts' `ResponsiveContainer`, which
 * always produces exactly one) and downloads it as a PNG. No `html2canvas`
 * dependency needed — SVG charts convert to canvas natively via `Image`.
 * Lives in shared `lib/` (not a feature) since any chart, anywhere, can use it.
 */
export async function exportChartAsPng(container: HTMLElement, filename: string): Promise<void> {
  const svg = container.querySelector("svg");
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const scale = 2; // retina-sharp output

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(rect.width));
  clone.setAttribute("height", String(rect.height));
  const surfaceColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-surface-elevated")
      .trim() || "#ffffff";

  const svgString = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = surfaceColor;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.drawImage(image, 0, 0, rect.width, rect.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `${filename}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

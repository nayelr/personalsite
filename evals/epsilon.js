(() => {
  'use strict';
  const stage = document.getElementById('epsilon-stage');
  const output = document.getElementById('epsilon');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reducedMotion.matches;
  let visible = true;
  let angle = -0.3;
  let lastFrame = 0;
  let cols = 96;
  let rows = 65;
  let animationFrame = null;
  let buffer;
  let cells;
  const samples = [];

  // Sample the epsilon glyph and extrude it into a shallow solid.
  // Project the rotating surface into a character grid using a depth buffer.
  const mask = document.createElement('canvas');
  mask.width = 280; mask.height = 300;
  const ctx = mask.getContext('2d', { willReadFrequently: true });
  ctx.font = '300px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('\u03b5', 140, 244);
  const pixels = ctx.getImageData(0, 0, mask.width, mask.height).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < mask.width && y < mask.height && pixels[(y * mask.width + x) * 4 + 3] > 110;
  let minX = 280, maxX = 0, minY = 300, maxY = 0;
  for (let y = 0; y < 300; y++) for (let x = 0; x < 280; x++) if (solid(x, y)) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, scale = 2.65 / (maxY - minY);
  for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
    if (!solid(x,y)) continue;
    const px = (x - cx) * scale, py = (y - cy) * scale;
    if (x % 2 === 0 && y % 2 === 0) {
      samples.push([px, py, .18, 0, 0, 1], [px, py, -.18, 0, 0, -1]);
    }
    const nx = Number(solid(x-1,y)) - Number(solid(x+1,y));
    const ny = Number(solid(x,y-1)) - Number(solid(x,y+1));
    if (nx || ny) {
      const length = Math.hypot(nx,ny);
      for (let z = -.18; z <= .18; z += .022) samples.push([px, py, z, nx/length, ny/length, 0]);
    }
  }

  function render() {
    buffer.fill(-Infinity);
    cells.fill(' ');
    const sin = Math.sin(angle), cos = Math.cos(angle);
    const tilt = -.10, ct = Math.cos(tilt), st = Math.sin(tilt);
    const shades = '.:-=+*#%@';
    for (const [x,y,z,nx,ny,nz] of samples) {
      const rx = x*cos + z*sin, rz = -x*sin + z*cos;
      const ry = y*ct - rz*st, depth = y*st + rz*ct;
      const perspective = 5.5 / (5.5-depth);
      const gx = Math.round(cols/2 + rx*rows*.49*perspective);
      const gy = Math.round(rows/2 + ry*rows*.29*perspective);
      if (gx<0 || gx>=cols || gy<0 || gy>=rows) continue;
      const index = gy*cols+gx;
      if (depth <= buffer[index]) continue;
      buffer[index] = depth;
      const rotatedNX = nx*cos+nz*sin;
      const rotatedNZ = -nx*sin+nz*cos;
      const light = Math.max(0, rotatedNX*-.45 + ny*-.35 + rotatedNZ*.8);
      const shade = Math.min(shades.length-1, Math.floor((.22+light*.75)*(shades.length-1)));
      cells[index] = shades[shade];
    }
    const lines = [];
    for (let y=0; y<rows; y++) lines.push(cells.slice(y*cols,(y+1)*cols).join(''));
    output.textContent = lines.join('\n');
  }
  function resize() {
    const width = stage.clientWidth, height = stage.clientHeight;
    const fontSize = width < 430 ? 7.5 : 9;
    const lineHeight = fontSize * 1.16;
    cols = Math.floor(width/(fontSize*.602));
    rows = Math.floor(height/lineHeight);
    buffer = new Float32Array(cols * rows);
    cells = new Array(cols * rows);
    output.style.fontSize = fontSize+'px';
    output.style.lineHeight = lineHeight+'px';
    render();
  }
  function syncAnimation() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    lastFrame = 0;
    if (!paused && visible && !document.hidden) animationFrame = requestAnimationFrame(frame);
  }
  reducedMotion.addEventListener('change', event => {paused=event.matches;syncAnimation();});
  document.addEventListener('visibilitychange', syncAnimation);
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(entries => {visible=entries[0].isIntersecting;syncAnimation();}).observe(stage);
  function frame(time) {
    if (time-lastFrame>=50) {
      const elapsed = Math.min(time-lastFrame,100);
      lastFrame=time;
      if (!paused && visible && !document.hidden) {angle+=elapsed*.00028;render();}
    }
    animationFrame = requestAnimationFrame(frame);
  }
  resize();syncAnimation();
})();

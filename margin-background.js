/* No-library WebGL1 halftone, restricted to the page margins. */
(() => {
  'use strict';
  const margins = document.createElement('div');
  margins.className = 'margin-background';
  margins.setAttribute('aria-hidden', 'true');
  document.body.prepend(margins);
  const wide = matchMedia('(min-width: 851px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let canvas, gl, program, buffer, uniforms;
  let loading = false;
  let frame = 0;
  let last = -Infinity;
  let time = 0;
  let previous = 0;
  let lost = false;
  const animated = () => wide.matches && !reduced.matches && !navigator.connection?.saveData && !document.hidden && !lost;
  function stop() { cancelAnimationFrame(frame); frame = 0; previous = 0; }
  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) { gl.deleteShader(result); throw new Error('Shader unavailable'); }
    return result;
  }
  function draw(now = 0) {
    frame = 0;
    if (!gl || lost || !wide.matches || document.hidden) return;
    if (now - last >= 50 || !animated()) {
      if (previous) time += Math.min((now - previous) / 1000, .1) * .22;
      previous = now;
      last = now;
      gl.uniform4f(uniforms.u_scene, canvas.width, canvas.height, time, 4);
      const rail = Math.max(24, (innerWidth - 1200) / 2);
      const pixels = Math.ceil(rail * canvas.width / innerWidth);
      gl.enable(gl.SCISSOR_TEST);
      for (const x of [0, canvas.width - pixels]) {
        gl.scissor(x, 0, pixels, canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.disable(gl.SCISSOR_TEST);
    }
    if (animated()) frame = requestAnimationFrame(draw);
  }
  function sync() {
    stop();
    if (!gl || lost || !wide.matches || document.hidden) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(innerWidth * ratio);
    canvas.height = Math.round(innerHeight * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    last = -Infinity;
    draw();
  }
  async function init() {
    if (loading || gl || !wide.matches) return;
    loading = true;
    try {
      const response = await fetch('/Assets/margin-halftone.frag');
      if (!response.ok) throw new Error('Shader unavailable');
      const fragment = await response.text();
      canvas = document.createElement('canvas');
      gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
      if (!gl) throw new Error('WebGL unavailable');
      const vertex = shader(gl.VERTEX_SHADER, 'attribute vec2 position; void main(){gl_Position=vec4(position,0.0,1.0);}');
      const pixel = shader(gl.FRAGMENT_SHADER, fragment);
      program = gl.createProgram();
      gl.attachShader(program, vertex); gl.attachShader(program, pixel); gl.linkProgram(program);
      gl.deleteShader(vertex); gl.deleteShader(pixel);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader unavailable');
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      uniforms = Object.fromEntries(['u_scene', 'u_shape', 'u_surface', 'u_finish', 'u_transform', 'u_space', 'u_cursor'].map(name => [name, gl.getUniformLocation(program, name)]));
      const colors = ['101014', '7C3AED', 'B18CFF', 'D9F99D', 'D9F99D', 'D9F99D', 'D9F99D', 'D9F99D'].flatMap(hex => [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255));
      gl.uniform3fv(gl.getUniformLocation(program, 'u_colors[0]'), new Float32Array(colors));
      gl.uniform4f(uniforms.u_shape, 1.48, .88, .5, 0);
      gl.uniform4f(uniforms.u_surface, 2.4, .91, 0, 1);
      gl.uniform4f(uniforms.u_finish, 0, 0, 0, .025);
      gl.uniform4f(uniforms.u_transform, 2926, 0, 0, 0);
      gl.uniform4f(uniforms.u_space, 0, 0, 0, 0);
      gl.uniform4f(uniforms.u_cursor, 0, 2, 0, .46);
      canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; stop(); canvas.remove(); });
      margins.append(canvas);
      margins.dataset.shader = 'ready';
      sync();
    } catch {
      stop();
      if (gl && !lost) { if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); }
      canvas?.remove();
      gl = null;
      margins.dataset.shader = 'fallback';
    }
  }
  wide.addEventListener('change', () => { if (wide.matches && !gl) init(); else sync(); });
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  addEventListener('resize', sync, { passive: true });
  addEventListener('pagehide', stop);
  addEventListener('pageshow', sync);
  init();
})();

// Referencias generales
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const cameraBtn = document.getElementById('cameraBtn');
const cameraSection = document.getElementById('cameraSection');
const videoPreview = document.getElementById('videoPreview');
const previewSection = document.getElementById('previewSection');
const previewCanvas = document.getElementById('previewCanvas');
const retakeBtn = document.getElementById('retakeBtn');
const shareBtn = document.getElementById('shareBtn');
const downloadLink = document.getElementById('downloadLink');
const watermarkTextInput = document.getElementById('watermarkText');
const infoBtn = document.getElementById('infoBtn'); // Se elimina el uso del botón info
const infoModal = document.getElementById('infoModal');
const closeModal = document.getElementById('closeModal');

// Referencias para controles de personalización
const colorPicker = document.getElementById('colorPicker');
const opacityRange = document.getElementById('opacityRange');

// Referencia para el overlay en la cámara
const overlayCanvas = document.getElementById('overlayCanvas');

// Variables dinámicas para la marca de agua
let watermarkColor = colorPicker.value;
let watermarkOpacity = parseFloat(opacityRange.value);

let cameraStream = null;
let cameraActive = false; // Estado de la cámara
// Variable para guardar la imagen cargada (modo archivo)
let currentImg = null;

// Función para actualizar dinámicamente el overlay en la vista de la cámara
function updateOverlay() {
  if (cameraActive && videoPreview.videoWidth) {
    overlayCanvas.width = videoPreview.videoWidth;
    overlayCanvas.height = videoPreview.videoHeight;
    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    applyWatermarkPattern(overlayCanvas, watermarkTextInput.value);
  }
  setTimeout(() => requestAnimationFrame(updateOverlay), 50);
}
updateOverlay();

// Actualizamos las variables
colorPicker.addEventListener('input', () => {
  watermarkColor = colorPicker.value;
});
opacityRange.addEventListener('input', () => {
  watermarkOpacity = parseFloat(opacityRange.value);
});

// ============ Función para Reducir Saturación ============
function reduceSaturation(ctx, width, height, factor) {
  let imageData = ctx.getImageData(0, 0, width, height);
  let data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = r * (1 - factor) + gray * factor;
    data[i + 1] = g * (1 - factor) + gray * factor;
    data[i + 2] = b * (1 - factor) + gray * factor;
  }
  ctx.putImageData(imageData, 0, 0);
}

// ============ Funciones para la Marca de Agua ============
const tileFont = "15px cursive";
function drawTextOnSineCurve(ctx, text, startX, baseY, amplitude, period) {
  let x = startX;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const metrics = ctx.measureText(char);
    const charWidth = metrics.width;
    const offsetY = amplitude * Math.sin(x / period);
    const angle = Math.atan((amplitude / period) * Math.cos(x / period));
    ctx.save();
    ctx.translate(x + charWidth / 2, baseY + offsetY);
    ctx.rotate(angle);
    ctx.fillText(char, 0, 0);
    ctx.restore();
    x += charWidth;
  }
}

function generateWatermarkTile(text, canvasWidth, canvasHeight) {
  const decoratedText = "**" + text + "**";
  
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = canvasWidth;
  tileCanvas.height = canvasHeight;
  const ctx = tileCanvas.getContext('2d');
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  ctx.font = tileFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = watermarkColor;

  ctx.save();
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.rotate(-Math.PI / 4);

  const textWidth = ctx.measureText(decoratedText).width;
  const horizontalSpacing = 10;
  const verticalSpacing = 20;
  const amplitude = 12;
  const period = 30;

  for (let offsetY = -canvasHeight; offsetY < canvasHeight; offsetY += verticalSpacing) {
    let startX = -canvasWidth * 2;
    while (startX < canvasWidth * 2) {
      const waveOffset = amplitude * Math.sin(startX / period);
      drawTextOnSineCurve(ctx, decoratedText, startX, offsetY + waveOffset, amplitude, period);
      startX += textWidth + horizontalSpacing;
    }
  }
  ctx.restore();
  return tileCanvas;
}

function applyWatermarkPattern(mainCanvas, text) {
  const ctx = mainCanvas.getContext('2d');
  const tileCanvas = generateWatermarkTile(text, mainCanvas.width, mainCanvas.height);
  ctx.save();
  ctx.globalAlpha = watermarkOpacity;
  ctx.drawImage(tileCanvas, 0, 0, mainCanvas.width, mainCanvas.height);
  ctx.restore();
}

// ============ Manejo de Botones y Archivos ============

// Usamos el mismo botón "cameraBtn" para iniciar la cámara y capturar
cameraBtn.addEventListener('click', () => {
  if (!cameraActive) {
    // Abrir cámara
    cameraSection.style.display = 'block';
    previewSection.style.display = 'none';
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        cameraStream = stream;
        videoPreview.srcObject = stream;
        cameraActive = true;
        cameraBtn.textContent = "Capturar";
        cameraBtn.classList.add("capture-mode");
      })
      .catch(err => {
        alert("No se pudo acceder a la cámara.");
        console.error(err);
      });
  } else {
    // Capturar imagen
    const canvas = previewCanvas;
    canvas.width = videoPreview.videoWidth;
    canvas.height = videoPreview.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
    reduceSaturation(ctx, canvas.width, canvas.height, 0.9);
    applyWatermarkPattern(canvas, watermarkTextInput.value);
    const dataURL = canvas.toDataURL('image/png');
    downloadLink.href = dataURL;
    downloadLink.download = "foto_con_marca_de_agua.png";
    previewSection.style.display = 'block';
    // Detener cámara y resetear botón
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    cameraActive = false;
    cameraSection.style.display = 'none';
    cameraBtn.textContent = "Tomar Foto";
    cameraBtn.classList.remove("capture-mode");
  }
});

uploadBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    processFile(fileInput.files[0]);
  }
});

retakeBtn.addEventListener('click', () => {
  const ctx = previewCanvas.getContext('2d');
  ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewSection.style.display = 'none';
  currentImg = null;
});

shareBtn.addEventListener('click', async () => {
  if (navigator.share) {
    previewCanvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.share({
          title: 'Imagen con Marca de Agua',
          files: [new File([blob], 'imagen_con_marca_de_agua.png', { type: blob.type })]
        });
      } catch (err) {
        console.error("Error al compartir:", err);
      }
    });
  } else {
    alert("Tu dispositivo no soporta la función de compartir.");
  }
});

function processFile(file) {
  const text = watermarkTextInput.value;
  if (file.type === "application/pdf") {
    file.arrayBuffer().then(async (buffer) => {
      const pdfDoc = await PDFLib.PDFDocument.load(buffer);
      const tileCanvas = generateWatermarkTile(text, 800, 200);
      const watermarkDataURL = tileCanvas.toDataURL('image/png');
      const embeddedWatermark = await pdfDoc.embedPng(watermarkDataURL);
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();
        for (let x = 0; x < width; x += 800 + 10) {
          for (let y = 0; y < height; y += 200 + 10) {
            page.drawImage(embeddedWatermark, {
              x, y,
              width: 800,
              height: 200
            });
          }
        }
      }
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const pdfURL = URL.createObjectURL(blob);
      downloadLink.href = pdfURL;
      downloadLink.download = "documento_con_marca_de_agua.pdf";

      const canvas = previewCanvas;
      const ctx = canvas.getContext('2d');
      canvas.width = 400;
      canvas.height = 300;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#999";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000";
      ctx.fillText("Vista previa no disponible para PDF", 200, 150);

      cameraSection.style.display = 'none';
      previewSection.style.display = 'block';
    });
  } else if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        currentImg = img;
        const canvas = previewCanvas;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        reduceSaturation(ctx, canvas.width, canvas.height, 0.9);
        applyWatermarkPattern(canvas, text);
        const dataURL = canvas.toDataURL('image/png');
        downloadLink.href = dataURL;
        downloadLink.download = "imagen_con_marca_de_agua.png";
        cameraSection.style.display = 'none';
        previewSection.style.display = 'block';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    alert("Tipo de archivo no soportado.");
  }
}

// ============ Modal de Información ============
/* Se han eliminado los eventos del botón info, ya que se ha quitado */

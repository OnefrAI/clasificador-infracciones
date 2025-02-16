document.addEventListener('DOMContentLoaded', () => {
  const noteForm = document.getElementById('noteForm');
  const notesContainer = document.getElementById('notesContainer');
  const activateCameraButton = document.getElementById('activateCameraButton');
  const saveNoteButton = document.getElementById('saveNoteButton');
  const videoContainer = document.getElementById('videoContainer');
  const video = document.getElementById('video');
  const capturePhotoButton = document.getElementById('capturePhotoButton');
  const photoPreviewContainer = document.getElementById('photoPreviewContainer');
  const photoPreview = document.getElementById('photoPreview');
  const photoActions = document.getElementById('photoActions');
  const retakePhotoButton = document.getElementById('retakePhotoButton');
  const deletePhotoButton = document.getElementById('deletePhotoButton');

  let cameraStream = null;
  let tempPhotoData = '';
  let lastSavedNote = null;

  // Iniciar la cámara
  function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        cameraStream = stream;
        video.srcObject = stream;
        video.play();
        videoContainer.style.display = 'block';
        capturePhotoButton.style.display = 'block';
        activateCameraButton.style.display = 'none';
      })
      .catch(err => {
        console.error("Error al acceder a la cámara:", err);
        alert("No se pudo acceder a la cámara. Asegúrate de haber otorgado permisos.");
      });
  }

  // Función de preprocesamiento de imagen para mejorar el OCR
  function preprocessImage(canvas) {
    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const threshold = 128; // Umbral: ajusta según sea necesario

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const binary = gray > threshold ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = binary;
    }
    context.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  // Capturar foto al pulsar el botón circular
  function capturePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.filter = 'grayscale(100%) contrast(150%)';
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Preprocesar imagen para OCR
    tempPhotoData = preprocessImage(canvas);

    photoPreview.src = tempPhotoData;
    photoPreviewContainer.style.display = 'block';
    videoContainer.style.display = 'none';
    capturePhotoButton.style.display = 'none';
    photoActions.style.display = 'flex';

    // Detener la cámara
    stopCamera();

    // Procesar imagen con OCR
    Tesseract.recognize(tempPhotoData, 'spa', { logger: m => console.log(m) })
      .then(({ data: { text } }) => {
        console.log("Resultado OCR:", text);
        autoCompletarCampos(text);
      })
      .catch(err => {
        console.error("Error en OCR:", err);
      });
  }

  // Detener la cámara
  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    videoContainer.style.display = 'none';
    capturePhotoButton.style.display = 'none';
    activateCameraButton.style.display = 'block';
  }

  // Activar la cámara al pulsar el botón azul
  activateCameraButton.addEventListener('click', () => {
    if (!cameraStream) {
      startCamera();
    }
  });

  // Evento para el botón circular de capturar foto
  capturePhotoButton.addEventListener('click', () => {
    capturePhoto();
  });

  // Evento para rehacer la foto
  retakePhotoButton.addEventListener('click', () => {
    tempPhotoData = '';
    photoPreviewContainer.style.display = 'none';
    photoActions.style.display = 'none';
    startCamera();
  });

  // Evento para eliminar la foto
  deletePhotoButton.addEventListener('click', () => {
    if (confirm("¿Estás seguro de eliminar la foto?")) {
      tempPhotoData = '';
      photoPreviewContainer.style.display = 'none';
      photoActions.style.display = 'none';
      activateCameraButton.style.display = 'block';
    }
  });

  // Función para autocompletar campos usando OCR
  function autoCompletarCampos(ocrText) {
    const docMatch = ocrText.match(/\d{8,}/);
    if (docMatch) {
      document.getElementById('documentNumber').value = docMatch[0];
    }
    const nameMatch = ocrText.match(/([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)/);
    if (nameMatch) {
      document.getElementById('fullName').value = nameMatch[0];
    }
    // Más lógica de extracción según formato del documento
  }

  // Guardar la nota
  noteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveNote();
  });

  function saveNote() {
    const noteData = {
      documentNumber: document.getElementById('documentNumber').value,
      fullName: document.getElementById('fullName').value,
      birthdate: document.getElementById('birthdate').value,
      parentsName: document.getElementById('parentsName').value,
      address: document.getElementById('address').value,
      phone: document.getElementById('phone').value,
      facts: document.getElementById('facts').value,
      photoUrl: tempPhotoData
    };

    const notes = JSON.parse(localStorage.getItem('notes')) || [];
    notes.push(noteData);
    localStorage.setItem('notes', JSON.stringify(notes));
    displayNotes();

    noteForm.reset();
    tempPhotoData = '';
    photoPreviewContainer.style.display = 'none';
    photoActions.style.display = 'none';
    activateCameraButton.style.display = 'block';
    alert("Nota guardada exitosamente.");

    lastSavedNote = noteData;
  }

  // Compartir nota usando la Web Share API, incluyendo la foto si está disponible
  function shareNote(noteData) {
    const shareText = `Nota Policial:
Documento: ${noteData.documentNumber || 'N/A'}
Nombre: ${noteData.fullName || 'N/A'}
Fecha de Nacimiento: ${noteData.birthdate || 'N/A'}
Padres: ${noteData.parentsName || 'N/A'}
Domicilio: ${noteData.address || 'N/A'}
Teléfono: ${noteData.phone || 'N/A'}
Hechos: ${noteData.facts || 'N/A'}`;
    
    if (noteData.photoUrl) {
      // Convertir dataURL a Blob y luego a File
      fetch(noteData.photoUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'nota.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
              title: 'Nota Policial',
              text: shareText,
              files: [file]
            }).then(() => {
              console.log('Nota compartida exitosamente.');
            }).catch(err => {
              console.error('Error al compartir:', err);
            });
          } else {
            // Fallback a compartir solo texto
            navigator.share({
              title: 'Nota Policial',
              text: shareText
            }).then(() => {
              console.log('Nota compartida exitosamente.');
            }).catch(err => {
              console.error('Error al compartir:', err);
            });
          }
        });
    } else {
      if (navigator.share) {
        navigator.share({
          title: 'Nota Policial',
          text: shareText
        }).then(() => {
          console.log('Nota compartida exitosamente.');
        }).catch(err => {
          console.error('Error al compartir:', err);
        });
      } else {
        alert("Tu navegador no soporta la función de compartir.");
      }
    }
  }

  function displayNotes() {
    const notes = JSON.parse(localStorage.getItem('notes')) || [];
    if (notes.length === 0) {
      notesContainer.innerHTML = "<p>No hay notas guardadas.</p>";
      return;
    }
    notesContainer.innerHTML = notes.map((note, index) => `
      <div class="note">
        <p><strong>Documento:</strong> ${note.documentNumber || 'N/A'}</p>
        <p><strong>Nombre:</strong> ${note.fullName || 'N/A'}</p>
        <p><strong>Fecha de nacimiento:</strong> ${note.birthdate || 'N/A'}</p>
        <p><strong>Padres:</strong> ${note.parentsName || 'N/A'}</p>
        <p><strong>Dirección:</strong> ${note.address || 'N/A'}</p>
        <p><strong>Teléfono:</strong> ${note.phone || 'N/A'}</p>
        <p><strong>Hechos:</strong> ${note.facts || 'N/A'}</p>
        ${note.photoUrl ? `<img src="${note.photoUrl}" alt="Foto de la nota">` : ''}
        <button onclick="deleteNote(${index})">Eliminar</button>
        <button onclick="shareNoteFromIndex(${index})">Compartir</button>
      </div>
    `).join('');
  }

  window.deleteNote = function(index) {
    const notes = JSON.parse(localStorage.getItem('notes')) || [];
    if (index >= 0 && index < notes.length && confirm("¿Estás seguro de eliminar esta nota?")) {
      notes.splice(index, 1);
      localStorage.setItem('notes', JSON.stringify(notes));
      displayNotes();
    }
  };

  window.shareNoteFromIndex = function(index) {
    const notes = JSON.parse(localStorage.getItem('notes')) || [];
    if (index >= 0 && index < notes.length) {
      shareNote(notes[index]);
    }
  };

  displayNotes();
});

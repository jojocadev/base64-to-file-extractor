// Amostra de PDF minimalista válido em Base64 ("Hello, World! Base64 to PDF")
const SAMPLE_BASE64 = `JVBERi0xLjQKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCiAgPj4KZW5kb2JqCjIgMCBvYmoKICA8PCAvVHlwZSAvUGFnZXMKICAgICAvS2lkcyBbMyAwIFJdCiAgICAgL0NvdW50IDEKICA+PgplbmRvYmoKMyAwIG9iagogIDw8IC9UeXBlIC9QYWdlCiAgICAgL1BhcmVudCAyIDAgUgogICAgIC9SZXNvdXJjZXMgPDwgL0ZvbnQgPDwgL0YxIDQgMCBSID4+ID4+ID4+CiAgICAgL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KICAgICAvQ29udGVudHMgNSAwIFIKICA+PgplbmRvYmoKNCAwIG9iagogIDw8IC9UeXBlIC9Gb250CiAgICAgL1N1YnR5cGUgL1R5cGUxCiAgICAgL0Jhc2VGb250IC9IZWx2ZXRpY2EKICA+PgplbmRvYmoKNSAwIG9iagogIDw8IC9MZW5ndGggNTYgPj4Kc3RyZWFtCkJUCiAgL0YxIDI0IFRmCiAgNzAgNzIwIFRkCiAgKEhlbGxvLCBXb3JsZCEgQmFzZTY0IHRvIFBERikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYNCjAwMDAwMDAwMDAgMDAwMDAgbg0KMDAwMDAwMDAwOSAwMDAwMCBuDQowMDAwMDAwMDY3IDAwMDAwIG4NCjAwMDAwMDAxMzggMDAwMDAgbg0KMDAwMDAwMDI5MSAwMDAwMCBuDQowMDAwMDAwMzc1IDAwMDAwIG4NCnRyYWlsZXIKICA8PCAvU2l6ZSA2CiAgICAgL1Jvb3QgMSAwIFIKICA+PgpzdGFydHhyZWYKNDkxCiUlRU9GCg==`;

// Elementos do DOM
const textarea = document.getElementById('base64Input');
const fileInput = document.getElementById('fileInput');
const uploadZone = document.getElementById('uploadZone');
const btnExtract = document.getElementById('btnExtract');
const btnDownload = document.getElementById('btnDownload');
const resultSection = document.getElementById('resultSection');
const errorAlert = document.getElementById('errorAlert');
const errorMessage = document.getElementById('errorMessage');
const fileInfo = document.getElementById('fileInfo');
const successBadge = document.getElementById('successBadge');

// Elementos de Preview
const pdfPreview = document.getElementById('pdfPreview');
const imagePreview = document.getElementById('imagePreview');
const textPreview = document.getElementById('textPreview');
const genericPreview = document.getElementById('genericPreview');

// Utilitários de botões auxiliares
const btnClear = document.getElementById('btnClear');
const btnCopy = document.getElementById('btnCopy');
const btnLoadSample = document.getElementById('btnLoadSample');

let currentBlobUrl = null;

// Função de conversão, validação e detecção de tipo de arquivo
function base64ToBytes(base64String) {
  if (typeof base64String !== 'string') {
    throw new TypeError('A entrada deve ser uma string contendo dados em formato Base64.');
  }

  // Mapeamento de tipos comuns para extensões
  const MIME_EXTENSION_MAP = {
    'application/pdf': 'pdf',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'text/plain': 'txt',
    'text/html': 'html',
    'text/css': 'css',
    'application/json': 'json',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'application/xml': 'xml',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'video/mp4': 'mp4',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
  };

  // 2. Detecção e remoção de qualquer prefixo Data URL (ex: "data:image/png;base64,")
  const prefixRegex = /^data:([a-zA-Z0-9.+\/-]+);base64,/i;
  const match = base64String.match(prefixRegex);
  let mimeType = null;

  if (match) {
    mimeType = match[1].toLowerCase();
  }

  // Remove o prefixo da string
  let cleanedBase64 = base64String.replace(/^data:[a-zA-Z0-9.+\/-]+;base64,/i, '');

  // Remove espaços, quebras de linha e retornos de carro
  cleanedBase64 = cleanedBase64.replace(/\s/g, '');

  // Valida caracteres válidos de base64
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  if (cleanedBase64.length === 0 || !base64Regex.test(cleanedBase64)) {
    throw new Error('A string informada não é uma representação Base64 válida.');
  }

  // Valida comprimento
  if (cleanedBase64.length % 4 === 1) {
    throw new Error('A string Base64 possui um comprimento inválido.');
  }

  // Decodifica a string usando a API nativa atob do navegador
  let binaryString;
  try {
    binaryString = atob(cleanedBase64);
  } catch (error) {
    throw new Error('Falha ao decodificar a string Base64. Os dados podem estar corrompidos.');
  }

  // Converte para array de bytes (Uint8Array)
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 3. Detecção do tipo de arquivo por Magic Numbers caso não tenha vindo no prefixo
  let extension = null;

  if (!mimeType) {
    if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      mimeType = 'application/pdf';
      extension = 'pdf';
    } else if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 && bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
      mimeType = 'image/png';
      extension = 'png';
    } else if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      mimeType = 'image/jpeg';
      extension = 'jpg';
    } else if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      mimeType = 'image/gif';
      extension = 'gif';
    } else if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
      mimeType = 'application/zip';
      extension = 'zip';
    } else {
      // Verifica se é texto plano legível
      let isText = true;
      const checkLen = Math.min(bytes.length, 128);
      for (let i = 0; i < checkLen; i++) {
        const code = bytes[i];
        if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
          isText = false;
          break;
        }
      }
      if (isText && bytes.length > 0) {
        mimeType = 'text/plain';
        extension = 'txt';
      } else {
        mimeType = 'application/octet-stream';
        extension = 'bin';
      }
    }
  } else {
    extension = MIME_EXTENSION_MAP[mimeType] || mimeType.split('/')[1] || 'bin';
  }

  // Anexa metadados ao array de bytes para retorno
  bytes.mimeType = mimeType;
  bytes.extension = extension;

  return bytes;
}

// Manipulador de erros
function showError(message) {
  errorMessage.textContent = message;
  errorAlert.style.display = 'flex';
  resultSection.style.display = 'none';
  errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Ocultar erros
function hideError() {
  errorAlert.style.display = 'none';
}

// Limpar áreas de resultado e de preview
function cleanResults() {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  
  // Limpa frames e mídias
  pdfPreview.src = '';
  imagePreview.src = '';
  textPreview.textContent = '';
  
  // Oculta todos os previews
  pdfPreview.style.display = 'none';
  imagePreview.style.display = 'none';
  textPreview.style.display = 'none';
  genericPreview.style.display = 'none';

  resultSection.style.display = 'none';
  hideError();
}

// Extrair e gerar o arquivo decodificado
function processBase64() {
  const value = textarea.value.trim();
  cleanResults();

  if (!value) {
    showError('Por favor, insira ou envie uma string Base64 primeiro.');
    return;
  }

  try {
    const bytes = base64ToBytes(value);
    const mimeType = bytes.mimeType;
    const extension = bytes.extension;
    
    // Calcula tamanho do arquivo
    const sizeInKB = (bytes.length / 1024).toFixed(2);
    fileInfo.textContent = `Tipo: ${mimeType} | Tamanho: ${sizeInKB} KB`;
    
    // Altera o texto do Badge para indicar o tipo extraído
    successBadge.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      Arquivo .${extension.toUpperCase()} Extraído!
    `;

    // Cria Blob e URL de visualização
    const blob = new Blob([bytes], { type: mimeType });
    currentBlobUrl = URL.createObjectURL(blob);
    
    // --- Lógica de Visualização Dinâmica ---
    if (mimeType === 'application/pdf') {
      pdfPreview.src = currentBlobUrl;
      pdfPreview.style.display = 'block';
    } else if (mimeType.startsWith('image/')) {
      imagePreview.src = currentBlobUrl;
      imagePreview.style.display = 'block';
    } else if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml') {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(bytes);
      textPreview.textContent = text;
      textPreview.style.display = 'block';
    } else {
      genericPreview.style.display = 'flex';
    }
    
    // Configura ação do botão de download com o nome do arquivo dinâmico
    btnDownload.onclick = () => {
      const a = document.createElement('a');
      a.href = currentBlobUrl;
      a.download = `arquivo_extraido.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    // Mostra seção de resultados
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    showError(error.message);
  }
}

// Lógica de leitura de arquivos e conversão automática para Base64 para teste
function handleFile(file) {
  if (!file) return;

  hideError();
  const reader = new FileReader();

  // Caso seja um arquivo de texto (.txt, .base64), lemos o conteúdo texto puro contido nele
  if (file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.base64')) {
    reader.onload = function(e) {
      textarea.value = e.target.result.trim();
      textarea.dispatchEvent(new Event('input'));
      alertToast('Texto Base64 carregado do arquivo com sucesso!');
    };
    reader.readAsText(file);
  } 
  // Qualquer outro arquivo físico (PDF, PNG, ZIP, etc.) será convertido para string Base64
  else {
    reader.onload = function(e) {
      textarea.value = e.target.result;
      textarea.dispatchEvent(new Event('input'));
      alertToast(`Arquivo .${file.name.split('.').pop().toUpperCase()} convertido para Base64! Clique em 'Extrair Arquivo'.`);
    };
    reader.readAsDataURL(file);
  }
}

// Toast amigável para notificações rápidas
function alertToast(message) {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%) translateY(100px)';
  toast.style.background = 'rgba(99, 102, 241, 0.95)';
  toast.style.color = '#ffffff';
  toast.style.padding = '0.75rem 1.5rem';
  toast.style.borderRadius = '30px';
  toast.style.fontSize = '0.9rem';
  toast.style.boxShadow = '0 10px 25px rgba(99, 102, 241, 0.3)';
  toast.style.zIndex = '1000';
  toast.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  toast.textContent = message;

  document.body.appendChild(toast);
  
  // Anima entrada
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }, 10);

  // Anima saída e remove
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 400);
  }, 3500);
}

// --- Event Listeners ---

// Botão principal de extração
btnExtract.addEventListener('click', processBase64);

// Drag and drop events
['dragenter', 'dragover'].forEach(eventName => {
  uploadZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  uploadZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
  }, false);
});

uploadZone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

// Ações auxiliares
btnClear.addEventListener('click', () => {
  textarea.value = '';
  cleanResults();
  alertToast('Campos limpos!');
});

btnCopy.addEventListener('click', () => {
  if (!textarea.value.trim()) {
    alertToast('Nada para copiar!');
    return;
  }
  navigator.clipboard.writeText(textarea.value)
    .then(() => alertToast('Copiado para a área de transferência!'))
    .catch(() => alertToast('Erro ao copiar.'));
});

btnLoadSample.addEventListener('click', () => {
  textarea.value = SAMPLE_BASE64;
  cleanResults();
  alertToast('Base64 de teste carregado com sucesso!');
});

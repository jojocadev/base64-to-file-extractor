/**
 * Converte uma string Base64 em um Buffer contendo os bytes do arquivo decodificado.
 * 
 * Requisitos atendidos:
 * - Detecta e remove automaticamente qualquer prefixo Data URL do tipo "data:tipo/subtipo;base64," (case-insensitive).
 * - Remove espaços em branco ou quebras de linha que possam vir no Base64.
 * - Valida se a string é um Base64 estruturalmente válido antes de decodificar.
 * - Decodifica o conteúdo utilizando recursos nativos (Buffer).
 * - Detecta o tipo do arquivo (MIME type e extensão) a partir do prefixo ou analisando
 *   os bytes de cabeçalho (magic numbers) do conteúdo decodificado.
 * - Retorna o conteúdo em formato de Buffer (apropriado para Node.js), com metadados
 *   "mimeType" e "extension" injetados no próprio Buffer.
 * - Retorna o arquivo decodificado independente de ser ou não um PDF.
 * 
 * @param {string} base64String - A string Base64 a ser convertida.
 * @returns {Buffer} - O Buffer contendo os bytes do arquivo decodificado, com as propriedades .mimeType e .extension.
 * @throws {TypeError|Error} - Erros descritivos para falhas de validação estrutural do Base64.
 */
function base64ToPdf(base64String) {
  // 1. Validação de tipo de entrada
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

  // 2. Detecção e remoção de qualquer prefixo Data URL, se presente
  // Captura o MIME type do prefixo caso exista (ex: "data:image/png;base64,")
  const prefixRegex = /^data:([a-zA-Z0-9.+\/-]+);base64,/i;
  const match = base64String.match(prefixRegex);
  let mimeType = null;

  if (match) {
    mimeType = match[1].toLowerCase();
  }

  let cleanedBase64 = base64String.replace(/^data:[a-zA-Z0-9.+\/-]+;base64,/i, '');

  // Remoção de espaços em branco, quebras de linha (\n) ou retornos de carro (\r)
  cleanedBase64 = cleanedBase64.replace(/\s/g, '');

  // 3. Validação do formato Base64
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  if (cleanedBase64.length === 0 || !base64Regex.test(cleanedBase64)) {
    throw new Error('A string informada não é uma representação Base64 válida.');
  }

  // O comprimento de uma string Base64 válida com padding padrão deve ser múltiplo de 4.
  if (cleanedBase64.length % 4 === 1) {
    throw new Error('A string Base64 possui um comprimento (número de caracteres) inválido.');
  }

  // 4. Decodificação nativa da string Base64 para Buffer
  let fileBuffer;
  try {
    fileBuffer = Buffer.from(cleanedBase64, 'base64');
  } catch (error) {
    throw new Error(`Falha ao decodificar a string Base64: ${error.message}`);
  }

  // 5. Detecção do tipo de arquivo baseando-se nos magic numbers (bytes de cabeçalho)
  // caso o tipo não tenha sido fornecido via prefixo Data URL.
  let extension = null;

  if (!mimeType) {
    // Detecta por assinatura de bytes
    if (fileBuffer.length >= 4 && fileBuffer[0] === 0x25 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x44 && fileBuffer[3] === 0x46) {
      mimeType = 'application/pdf';
      extension = 'pdf';
    } else if (fileBuffer.length >= 8 && fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x4E && fileBuffer[3] === 0x47 && fileBuffer[4] === 0x0D && fileBuffer[5] === 0x0A && fileBuffer[6] === 0x1A && fileBuffer[7] === 0x0A) {
      mimeType = 'image/png';
      extension = 'png';
    } else if (fileBuffer.length >= 3 && fileBuffer[0] === 0xFF && fileBuffer[1] === 0xD8 && fileBuffer[2] === 0xFF) {
      mimeType = 'image/jpeg';
      extension = 'jpg';
    } else if (fileBuffer.length >= 4 && fileBuffer[0] === 0x47 && fileBuffer[1] === 0x49 && fileBuffer[2] === 0x46 && fileBuffer[3] === 0x38) {
      mimeType = 'image/gif';
      extension = 'gif';
    } else if (fileBuffer.length >= 4 && fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B && fileBuffer[2] === 0x03 && fileBuffer[3] === 0x04) {
      mimeType = 'application/zip';
      extension = 'zip';
    } else {
      // Verifica se é texto plano legível
      let isText = true;
      const checkLen = Math.min(fileBuffer.length, 128);
      for (let i = 0; i < checkLen; i++) {
        const code = fileBuffer[i];
        if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
          isText = false;
          break;
        }
      }
      if (isText && fileBuffer.length > 0) {
        mimeType = 'text/plain';
        extension = 'txt';
      } else {
        mimeType = 'application/octet-stream';
        extension = 'bin';
      }
    }
  } else {
    // Se o MIME type veio no prefixo, mapeia para a extensão
    extension = MIME_EXTENSION_MAP[mimeType] || mimeType.split('/')[1] || 'bin';
  }

  // Adiciona as propriedades detectadas ao Buffer
  fileBuffer.mimeType = mimeType;
  fileBuffer.extension = extension;

  return fileBuffer;
}

module.exports = base64ToPdf;

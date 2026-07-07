const http = require('http');
const fs = require('fs');
const path = require('path');
const base64ToPdf = require('./base64ToPdf');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Configura cabeçalhos de CORS para permitir chamadas externas à API/Webhook
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Trata requisições OPTIONS do CORS
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // 1. Trata a rota do Webhook / API de Conversão (POST /webhook ou /api/extract)
  if (req.method === 'POST' && (req.url === '/webhook' || req.url === '/api/extract')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    
    req.on('end', () => {
      try {
        let base64String = '';
        let filename = 'arquivo_extraido';
        let customExtension = null;
        
        // Tenta parsear como JSON
        try {
          const parsed = JSON.parse(body);
          
          // Busca recursiva pelas chaves base64, filename e extension (case-insensitive)
          const found = {};
          function search(current) {
            if (!current || typeof current !== 'object') return;
            for (const key of Object.keys(current)) {
              const lowerKey = key.toLowerCase();
              if (lowerKey === 'base64' && !found.base64) {
                found.base64 = current[key];
              } else if ((lowerKey === 'filename' || lowerKey === 'file-name') && !found.filename) {
                found.filename = current[key];
              } else if ((lowerKey === 'extension' || lowerKey === 'ext') && !found.extension) {
                found.extension = current[key];
              }
              search(current[key]);
            }
          }
          search(parsed);

          base64String = found.base64 || parsed.base64 || parsed.data || '';
          if (found.filename) {
            filename = found.filename;
          }
          if (found.extension) {
            customExtension = found.extension.replace(/^\./, '');
          }
        } catch (e) {
          // Se não for JSON, assume que o corpo é o próprio Base64 puro
          base64String = body.trim();
        }

        if (!base64String) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ 
            error: 'Nenhuma string Base64 informada. Envie no formato JSON esperado ou como texto no corpo da requisição.' 
          }));
          return;
        }

        // Decodifica a string usando nossa biblioteca utilitária nativa
        const fileBuffer = base64ToPdf(base64String);

        // Define a extensão final (usa a customizada se veio no JSON, senão a detectada)
        const finalExtension = customExtension || fileBuffer.extension || 'bin';

        // Garante que o nome do arquivo tenha a extensão correta
        let finalFilename = filename;
        if (finalExtension && !finalFilename.toLowerCase().endsWith('.' + finalExtension.toLowerCase())) {
          finalFilename = `${finalFilename}.${finalExtension}`;
        }

        // Configura cabeçalhos de resposta para download binário com o nome customizado
        res.statusCode = 200;
        res.setHeader('Content-Type', fileBuffer.mimeType || 'application/octet-stream');
        
        // Define cabeçalhos de Content-Disposition seguindo múltiplos padrões da RFC e headers alternativos
        res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`);
        res.setHeader('X-Filename', finalFilename);
        res.setHeader('X-File-Name', finalFilename);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Filename, X-File-Name');
        res.setHeader('Content-Length', fileBuffer.length);
        
        // Retorna o buffer binário diretamente na resposta
        res.end(fileBuffer);
        
        console.log(`[Webhook] Sucesso: Arquivo "${finalFilename}" extraído (${(fileBuffer.length/1024).toFixed(2)} KB)`);
      } catch (error) {
        console.error(`[Webhook] Erro: ${error.message}`);
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // 2. Trata rotas de arquivos estáticos (GET)
  if (req.method === 'GET') {
    // Resolve o caminho do arquivo solicitado
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    // Evita travessia de diretório para fora da pasta de execução
    if (!filePath.startsWith(__dirname)) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Acesso Negado');
      return;
    }

    // Verifica se o arquivo existe e o serve
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Arquivo Não Encontrado');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);

      const stream = fs.createReadStream(filePath);
      stream.on('error', (streamErr) => {
        console.error(`Erro ao ler o arquivo: ${streamErr.message}`);
        res.statusCode = 500;
        res.end('Erro Interno do Servidor');
      });
      stream.pipe(res);
    });
    return;
  }

  // Rota padrão se o método for incompatível
  res.statusCode = 405;
  res.end('Método Não Permitido');
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` Servidor local rodando com sucesso!`);
  console.log(` Acesse em seu navegador: http://localhost:${PORT}`);
  console.log(` API/Webhook ativo em: http://localhost:${PORT}/webhook`);
  console.log(`======================================================\n`);
});

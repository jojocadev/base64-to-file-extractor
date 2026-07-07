const base64ToPdf = require('./base64ToPdf');

// Cores para o console para facilitar a visualização dos resultados
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function runTest(testName, testFn) {
  try {
    testFn();
    console.log(`${GREEN}✔ PASSOU:${RESET} ${testName}`);
  } catch (error) {
    console.error(`${RED}✘ FALHOU:${RESET} ${testName}`);
    console.error(`  Erro retornado: ${error.message}\n`);
  }
}

console.log('Iniciando os testes da função base64ToPdf (com suporte genérico a qualquer arquivo)...\n');

// 1. Caso de sucesso: PDF com prefixo
runTest('Deve decodificar PDF com prefixo e identificar o tipo', () => {
  const base64ComPrefixo = 'data:application/pdf;base64,JVBERi0xLjQK';
  const result = base64ToPdf(base64ComPrefixo);
  
  if (!Buffer.isBuffer(result)) {
    throw new Error('O resultado retornado não é um Buffer.');
  }
  if (result.mimeType !== 'application/pdf' || result.extension !== 'pdf') {
    throw new Error(`Tipo de arquivo incorreto detectado: ${result.mimeType} (.${result.extension})`);
  }
});

// 2. Caso de sucesso: PNG sem prefixo (detectado via Magic Numbers)
runTest('Deve decodificar PNG sem prefixo e identificar por Magic Numbers', () => {
  // Cabeçalho PNG em Base64: iVBORw0KGgo=
  const base64Png = 'iVBORw0KGgo=';
  const result = base64ToPdf(base64Png);
  
  if (!Buffer.isBuffer(result)) {
    throw new Error('O resultado retornado não é um Buffer.');
  }
  if (result.mimeType !== 'image/png' || result.extension !== 'png') {
    throw new Error(`Esperava PNG, obteve: ${result.mimeType} (.${result.extension})`);
  }
});

// 3. Caso de sucesso: Texto plano legível (detectado por amostragem de caracteres)
runTest('Deve decodificar Texto Plano e identificar o tipo como text/plain', () => {
  // "dGVzdGUxMjM0NQ==" decodifica para "teste12345"
  const base64Txt = 'dGVzdGUxMjM0NQ==';
  const result = base64ToPdf(base64Txt);
  
  if (result.mimeType !== 'text/plain' || result.extension !== 'txt') {
    throw new Error(`Esperava text/plain (.txt), obteve: ${result.mimeType} (.${result.extension})`);
  }
  if (result.toString('utf8') !== 'teste12345') {
    throw new Error(`Conteúdo decodificado incorreto: "${result.toString('utf8')}"`);
  }
});

// 4. Caso de falha: Entrada com tipo inválido
runTest('Deve lançar erro se a entrada não for uma string', () => {
  try {
    base64ToPdf(98765);
    throw new Error('Deveria ter lançado um erro, mas passou.');
  } catch (error) {
    if (!(error instanceof TypeError)) {
      throw new Error(`Tipo de erro incorreto. Esperava TypeError, mas obteve: ${error.constructor.name}`);
    }
  }
});

// 5. Caso de falha: Base64 inválido estruturalmente
runTest('Deve lançar erro se a string não for um Base64 estruturalmente válido', () => {
  try {
    base64ToPdf('StringTotalmenteInvalida!@#$');
    throw new Error('Deveria ter lançado um erro para caracteres inválidos, mas passou.');
  } catch (error) {
    if (!error.message.includes('não é uma representação Base64 válida')) {
      throw new Error(`Mensagem de erro incorreta: "${error.message}"`);
    }
  }
});

// 6. Caso de falha: Comprimento inválido
runTest('Deve lançar erro se a string Base64 tiver comprimento inválido', () => {
  try {
    base64ToPdf('dGVzdGUxMjM0NQs'); // Comprimento 15 (resto 3 - inválido para unpadded ou resto 1 dependendo do padding)
    // dGVzdGUxMjM0NQ (16 chars, ok)
    // dGVzdGUxMjM0NQs (15 chars, resto 3) -> na verdade, length % 4 === 1 é o caso inválido absoluto
    base64ToPdf('dGVzdGUxMjM0NQJ'); // 15 chars, resto 3
    // Vamos testar o resto 1 diretamente:
    base64ToPdf('A'); // 1 char, resto 1
    throw new Error('Deveria ter lançado um erro para comprimento inválido, mas passou.');
  } catch (error) {
    if (!error.message.includes('comprimento (número de caracteres) inválido')) {
      throw new Error(`Mensagem de erro incorreta: "${error.message}"`);
    }
  }
});

console.log('\nFim dos testes.');

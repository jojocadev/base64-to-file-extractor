# Usa a imagem oficial do Node.js LTS como base (versão leve alpine)
FROM node:20-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia o package.json para instalar dependências se necessário
COPY package.json ./

# Copia todo o restante do código fonte do projeto
COPY . .

# Expõe a porta em que o servidor web escuta
EXPOSE 3000

# Define o comando de inicialização do container
CMD [ "npm", "start" ]

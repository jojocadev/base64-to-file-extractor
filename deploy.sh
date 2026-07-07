#!/bin/bash

# ==============================================================================
# SCRIPT DE DEPLOY PARA VPS (BASH) - AUTOMATIZADO COM DOCKER
# ==============================================================================

# Defina as configurações da sua VPS aqui:
VPS_USER="seu_usuario"
VPS_HOST="ip_ou_host_da_vps"
VPS_PORT="22"
REMOTE_PATH="/var/www/base64-extractor"

ARCHIVE_NAME="base64-app-deploy.tar.gz"

echo "=== 📦 1/4 Compactando arquivos do projeto... ==="
tar --exclude='node_modules' --exclude='.git' --exclude='*.tar.gz' -czf $ARCHIVE_NAME .

echo "=== 🚀 2/4 Enviando arquivos para a VPS ($VPS_HOST)... ==="
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "mkdir -p $REMOTE_PATH"
scp -P $VPS_PORT $ARCHIVE_NAME $VPS_USER@$VPS_HOST:$REMOTE_PATH/

echo "=== 🔧 3/4 Extraindo arquivos na VPS... ==="
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "cd $REMOTE_PATH && tar -xzf $ARCHIVE_NAME && rm $ARCHIVE_NAME"

echo "=== 🐳 4/4 Reconstruindo e reiniciando o container Docker na VPS... ==="
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "cd $REMOTE_PATH && \
  docker stop base64-app-running 2>/dev/null || true && \
  docker rm base64-app-running 2>/dev/null || true && \
  docker build -t base64-extractor-img . && \
  docker run -d --restart unless-stopped -p 3000:3000 --name base64-app-running base64-extractor-img"

# Limpa o arquivo local temporário
rm $ARCHIVE_NAME

echo "=== 🎉 Deploy finalizado com sucesso! ==="
echo "Acesse a aplicação em: http://$VPS_HOST:3000"

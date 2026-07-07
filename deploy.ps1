# ==============================================================================
# SCRIPT DE DEPLOY PARA VPS (POWERSHELL) - AUTOMATIZADO COM DOCKER
# ==============================================================================

# Defina as configurações da sua VPS aqui:
$vpsUser = "seu_usuario"
$vpsHost = "ip_ou_host_da_vps"
$vpsPort = "22"
$remotePath = "/var/www/base64-extractor"

$archiveName = "base64-app-deploy.tar.gz"

Write-Host "=== 📦 1/4 Compactando arquivos do projeto... ===" -ForegroundColor Cyan
# Usa o utilitário tar nativo do Windows (disponível no Windows 10/11)
tar --exclude="node_modules" --exclude=".git" --exclude="*.tar.gz" -czf $archiveName .

Write-Host "=== 🚀 2/4 Enviando arquivos para a VPS ($vpsHost)... ===" -ForegroundColor Cyan
# Cria a pasta remota na VPS (se não existir) e envia o arquivo compactado
ssh -p $vpsPort "$vpsUser@$vpsHost" "mkdir -p $remotePath"
scp -P $vpsPort $archiveName "$vpsUser@$vpsHost`:$remotePath/"

Write-Host "=== 🔧 3/4 Extraindo arquivos na VPS... ===" -ForegroundColor Cyan
ssh -p $vpsPort "$vpsUser@$vpsHost" "cd $remotePath && tar -xzf $archiveName && rm $archiveName"

Write-Host "=== 🐳 4/4 Reconstruindo e reiniciando o container Docker na VPS... ===" -ForegroundColor Cyan
ssh -p $vpsPort "$vpsUser@$vpsHost" "cd $remotePath && docker stop base64-app-running 2>`$null || true && docker rm base64-app-running 2>`$null || true && docker build -t base64-extractor-img . && docker run -d --restart unless-stopped -p 3000:3000 --name base64-app-running base64-extractor-img"

# Limpa o arquivo local temporário
Remove-Item $archiveName -ErrorAction SilentlyContinue

Write-Host "=== 🎉 Deploy finalizado com sucesso! ===" -ForegroundColor Green
Write-Host "Acesse a aplicação em: http://$vpsHost`:3000" -ForegroundColor Green

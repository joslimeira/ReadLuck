# Guia para Criar Instalador e Versão Portátil - ReadLuck Windows

## Resumo
Este guia ensina como criar:
1. **Versão Portátil** - Pasta com executável que roda sem instalação
2. **Instalador NSIS** - Arquivo .exe que instala o programa no Windows

## Pré-requisitos
- Node.js instalado
- Projeto ReadLuck funcionando
- NSIS (opcional, para criar instalador)

## Passo 1: Criar Versão Portátil

### Comando Principal
```bash
npx electron-packager . ReadLuck --platform=win32 --arch=x64 --out=dist --overwrite
```

### O que acontece:
- Cria pasta `dist/ReadLuck-win32-x64/`
- Contém `ReadLuck.exe` e todos os arquivos necessários
- Funciona como versão portátil (não precisa instalar)

### Para criar ZIP da versão portátil:
```powershell
Compress-Archive -Path "dist\ReadLuck-win32-x64\*" -DestinationPath "dist\ReadLuck-Portable-v1.0.0.zip" -Force
```

## Passo 2: Criar Instalador (Opcional)

### Instalar NSIS
1. Baixe em: https://nsis.sourceforge.io/Download
2. Instale o NSIS no Windows
3. Adicione ao PATH ou use caminho completo

### Usar o script NSIS fornecido
Já foi criado o arquivo `ReadLuck-Installer.nsi` no projeto.

### Comando para gerar instalador:
```bash
makensis ReadLuck-Installer.nsi
```

Ou com caminho completo:
```bash
"C:\Program Files (x86)\NSIS\makensis.exe" ReadLuck-Installer.nsi
```

### Resultado:
- Cria arquivo `ReadLuck-Setup-1.0.0.exe`
- Instalador completo com atalhos
- Entrada no "Adicionar ou Remover Programas"

## Comandos Rápidos

### Apenas versão portátil:
```bash
npx electron-packager . ReadLuck --platform=win32 --arch=x64 --out=dist --overwrite
```

### Versão portátil + ZIP:
```bash
npx electron-packager . ReadLuck --platform=win32 --arch=x64 --out=dist --overwrite
powershell "Compress-Archive -Path 'dist\ReadLuck-win32-x64\*' -DestinationPath 'dist\ReadLuck-Portable-v1.0.0.zip' -Force"
```

### Tudo (se NSIS estiver instalado):
```bash
npx electron-packager . ReadLuck --platform=win32 --arch=x64 --out=dist --overwrite
powershell "Compress-Archive -Path 'dist\ReadLuck-win32-x64\*' -DestinationPath 'dist\ReadLuck-Portable-v1.0.0.zip' -Force"
makensis ReadLuck-Installer.nsi
```

## Estrutura de Arquivos Gerados

```
dist/
├── ReadLuck-win32-x64/          # Versão portátil
│   ├── ReadLuck.exe             # Executável principal
│   ├── resources/               # Recursos do app
│   └── ... (outros arquivos)    # DLLs e dependências
├── ReadLuck-Portable-v1.0.0.zip # ZIP da versão portátil
ReadLuck-Setup-1.0.0.exe         # Instalador (se criado)
```

## Distribuição

### Versão Portátil
- Distribua a pasta `ReadLuck-win32-x64` ou o ZIP
- Usuário executa `ReadLuck.exe` diretamente
- Não requer instalação
- Dados salvos na pasta do usuário

### Instalador
- Distribua o arquivo `ReadLuck-Setup-1.0.0.exe`
- Usuário executa e segue o assistente
- Cria atalhos automáticos
- Aparece em "Programas" do Windows

## Solução de Problemas

### Erro "app-builder.exe process failed"
- Use `electron-packager` em vez de `electron-builder`
- Comando: `npx electron-packager . ReadLuck --platform=win32 --arch=x64 --out=dist --overwrite`

### NSIS não encontrado
- Instale NSIS: https://nsis.sourceforge.io/Download
- Verifique se está no PATH
- Use caminho completo: `"C:\Program Files (x86)\NSIS\makensis.exe"`

### Arquivo muito grande
- Normal para apps Electron (100-200MB)
- Inclui runtime do Chromium
- Considere usar compressão ZIP

## Scripts Prontos

Já foram criados no projeto:
- `ReadLuck-Installer.nsi` - Script NSIS para instalador
- `build-windows.ps1` - Script PowerShell automatizado

## Exemplo Completo

1. Abra terminal no diretório do projeto
2. Execute:
   ```bash
   npx electron-packager . ReadLuck --platform=win32 --arch=x64 --out=dist --overwrite
   ```
3. Aguarde conclusão (pode demorar alguns minutos)
4. Teste: `dist\ReadLuck-win32-x64\ReadLuck.exe`
5. Para instalador: `makensis ReadLuck-Installer.nsi`

Pronto! Você terá versão portátil e instalador do ReadLuck para Windows.
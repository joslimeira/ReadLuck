/*
  ReadLuck - Aplicativo de gestão de livros
  
  Este programa é software livre: você pode redistribuí-lo e/ou modificá-lo
  sob os termos da GNU Affero General Public License conforme publicada pela Free Software Foundation,
  na versão 3 da Licença.

  Este programa é distribuído na esperança de que seja útil, mas SEM NENHUMA GARANTIA;
  sem mesmo a garantia implícita de COMERCIALIZAÇÃO ou ADEQUAÇÃO A UM DETERMINADO PROPÓSITO.
  Veja a GNU Affero General Public License para mais detalhes.

  Você deve ter recebido uma cópia da GNU Affero General Public License
  junto com este programa. Se não, veja <https://www.gnu.org/licenses/agpl-3.0>.
*/
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const XLSX = require('xlsx');
const rtfToText = require('rtf2text').string;
const logger = require('./utils/logger');

// Detectar modo portátil de forma mais eficiente
const isPortable = process.env.PORTABLE_EXECUTABLE_DIR !== undefined || 
                  path.basename(process.execPath).toLowerCase().includes('portable');

logger.info('MAIN', `Modo de execução: ${isPortable ? 'Portátil' : 'Instalado'}`);
logger.info('MAIN', `Diretório de execução: ${process.execPath}`);

// Inicializar store de forma lazy (apenas quando necessário)
let store;
function getStore() {
  if (!store) {
    try {
      if (isPortable) {
        // Caminho para dados portáteis ao lado do executável
        const execDir = path.dirname(process.execPath);
        const portableDataPath = path.join(execDir, 'portable_data');
        
        logger.info('MAIN', `Diretório de dados portáteis: ${portableDataPath}`);
        
        // Verificar se o diretório existe e criar se necessário
        if (!fs.existsSync(portableDataPath)) {
          logger.info('MAIN', `Criando diretório de dados portáteis: ${portableDataPath}`);
          try {
            fs.mkdirSync(portableDataPath, { recursive: true });
            logger.info('MAIN', `Diretório de dados portáteis criado com sucesso`);
          } catch (dirError) {
            logger.error('MAIN', `Erro ao criar diretório de dados portáteis: ${dirError.message}`);
            // Tentar criar no diretório temporário como fallback
            const tempDir = path.join(require('os').tmpdir(), 'readluck-portable');
            logger.info('MAIN', `Tentando usar diretório temporário como fallback: ${tempDir}`);
            fs.mkdirSync(tempDir, { recursive: true });
            store = new Store({
              name: 'readluck-data',
              cwd: tempDir
            });
            logger.info('MAIN', `Store inicializado em diretório temporário: ${tempDir}`);
            return store;
          }
        }
        
        // Testar permissões de escrita
        const testFile = path.join(portableDataPath, '.write-test');
        try {
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile); // Remover arquivo de teste
          logger.info('MAIN', `Teste de escrita bem-sucedido em: ${portableDataPath}`);
        } catch (writeError) {
          logger.error('MAIN', `Erro no teste de escrita: ${writeError.message}`);
          // Usar diretório temporário como fallback
          const tempDir = path.join(require('os').tmpdir(), 'readluck-portable');
          logger.info('MAIN', `Usando diretório temporário como fallback: ${tempDir}`);
          fs.mkdirSync(tempDir, { recursive: true });
          store = new Store({
            name: 'readluck-data',
            cwd: tempDir
          });
          logger.info('MAIN', `Store inicializado em diretório temporário: ${tempDir}`);
          return store;
        }
        
        // Criar store no diretório portátil
        store = new Store({
          name: 'readluck-data',
          cwd: portableDataPath
        });
        logger.info('MAIN', `Store inicializado em modo portátil: ${portableDataPath}`);
      } else {
        // Modo instalado - usar localização padrão
        store = new Store({
          name: 'readluck-installed'
        });
        logger.info('MAIN', `Store inicializado em modo instalado`);
      }
      
      // Verificar se o store está funcionando
      const testData = { test: 'test-data' };
      store.set('test-write', testData);
      const readTest = store.get('test-write');
      if (JSON.stringify(readTest) !== JSON.stringify(testData)) {
        throw new Error('Falha na verificação de leitura/escrita do store');
      }
      store.delete('test-write');
      logger.info('MAIN', `Teste de leitura/escrita do store bem-sucedido`);
      
    } catch (error) {
      logger.error('MAIN', `Erro ao inicializar store: ${error.message}`);
      // Fallback para armazenamento em memória em caso de erro
      store = new Store({
        name: 'readluck-memory',
        cwd: require('os').tmpdir()
      });
      logger.warn('MAIN', `Usando armazenamento temporário em memória devido a erro`);
      
      // Mostrar mensagem ao usuário
      if (mainWindow) {
        dialog.showMessageBox(mainWindow, {
          type: 'warning',
          title: 'Aviso de Armazenamento',
          message: 'Não foi possível acessar o armazenamento permanente. Seus dados serão salvos temporariamente nesta sessão.',
          detail: `Erro: ${error.message}\n\nTente executar o aplicativo em uma pasta com permissões de escrita ou sem privilégios de administrador.`,
          buttons: ['OK']
        });
      }
    }
  }
  return store;
}

// Lista de extensões de arquivo permitidas
const ALLOWED_FILE_EXTENSIONS = ['.txt', '.csv', '.json', '.xlsx', '.ods', '.html'];

// Função para validar extensão de arquivo
function validateFileExtension(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: 'Caminho de arquivo inválido' };
  }
  
  const extension = path.extname(filePath).toLowerCase();
  
  if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
    return { 
      valid: false, 
      error: `Tipo de arquivo não permitido: ${extension}. Tipos permitidos: ${ALLOWED_FILE_EXTENSIONS.join(', ')}` 
    };
  }
  
  return { valid: true };
}

// Função para gerar novo ID de livro (simples incremento)
// Considere uma estratégia mais robusta para IDs únicos se necessário (ex: UUID)
function getNextBookId() {
  const books = getStore().get('books', []);
  if (books.length === 0) {
    return 1;
  }
  const maxId = books.reduce((max, book) => (book.id > max ? book.id : max), 0);
  return maxId + 1;
}

// Mantém uma referência global do objeto window para evitar que a janela seja fechada automaticamente quando o objeto JavaScript for coletado pelo garbage collector
let mainWindow;

function createWindow() {
  try {
    const iconPath = path.join(__dirname, 'assets/ReadLuck-Icone-Oficial-2025-Final.ico');
    
    // Verificação assíncrona do ícone para não bloquear a inicialização
    const iconExists = fs.existsSync(iconPath);
    
    // Criar janela do navegador com configurações otimizadas
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      autoHideMenuBar: true,
      title: 'ReadLuck',
      icon: iconExists ? iconPath : undefined,
      show: false, // Não mostrar a janela até que esteja pronta
      skipTaskbar: false,
      alwaysOnTop: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        sandbox: false,
        backgroundThrottling: false, // Evita throttling em background
        enableRemoteModule: false
      }
    });
    
    // Mostrar a janela quando estiver pronta
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });


    // Carregar o arquivo index.html do aplicativo de forma otimizada
    const indexPath = path.join(__dirname, 'index.html');
    
    mainWindow.loadFile(indexPath).catch(err => {
      logger.error('MAIN_WINDOW', 'Erro ao carregar index.html:', err);
      dialog.showErrorBox('Erro ao Iniciar', `Não foi possível carregar a interface do aplicativo: ${err.message}`);
      app.exit(1);
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      logger.error('MAIN_WINDOW', `Falha ao carregar a URL ${validatedURL}`, { errorCode, errorDescription });
      dialog.showErrorBox('Erro ao Iniciar', `Não foi possível carregar a interface do aplicativo: ${errorDescription}`);
    });

    // Abrir DevTools em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }

    // Quando a janela for fechada
    mainWindow.on('closed', function () {
      logger.debug('MAIN_WINDOW', 'Evento \'closed\' disparado para mainWindow.');
      mainWindow = null;
    });
    
    // Adicionar manipulador para o evento 'close' para garantir que a aplicação seja encerrada corretamente
    mainWindow.on('close', function (event) {
      logger.debug('MAIN_WINDOW', 'Evento \'close\' disparado para mainWindow.');
      
      // Se não estiver no processo de encerramento, permitir o fechamento normal
      if (!isQuitting) {
        logger.debug('MAIN_WINDOW', 'Fechando a janela normalmente.');
      }
    });
  } catch (error) {
    logger.error('MAIN_WINDOW', 'Erro ao criar janela principal:', error);
    dialog.showErrorBox('Erro de Inicialização', `Falha ao criar a janela do aplicativo: ${error.message}`);
    app.exit(1);
  }
}

// Este método será chamado quando o Electron terminar a inicialização 
// e estiver pronto para criar janelas do navegador.
// Algumas APIs podem ser usadas somente depois que este evento ocorre.

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  try {
    logger.error('PROCESS', 'Erro não capturado:', error);
    dialog.showErrorBox('Erro Crítico', `Ocorreu um erro inesperado: ${error.message}`);
  } catch (dialogError) {
    console.error('Falha ao mostrar diálogo de erro:', dialogError);
  } finally {
    app.exit(1);
  }
});

// Tratamento de rejeições de promessas não tratadas
process.on('unhandledRejection', (reason, promise) => {
  try {
    logger.error('PROCESS', 'Promessa rejeitada não tratada:', { reason });
    dialog.showErrorBox('Erro Assíncrono', `Ocorreu um erro assíncrono: ${reason}`);
  } catch (dialogError) {
    console.error('Falha ao mostrar diálogo de erro:', dialogError);
  }
});

app.whenReady().then(() => {
  logger.info('MAIN', 'Evento \'ready\' disparado. Chamando createWindow.');
  createWindow();
}).catch(err => {
  try {
    logger.error('MAIN', 'Erro ao inicializar aplicativo:', err);
    dialog.showErrorBox('Erro de Inicialização', `Não foi possível iniciar o aplicativo: ${err.message}`);
  } catch (dialogError) {
    console.error('Falha ao mostrar diálogo de erro:', dialogError);
  } finally {
    app.exit(1);
  }
});

// Handler para salvar arquivo
ipcMain.handle('save-file', async (event, options) => {
  logger.debug('MAIN_IPC', 'save-file: Handler invocado com opções:', options);
  try {
    let filePathToSave = options.filePath;

    // Se o filePath não foi fornecido, mostrar o diálogo para o usuário escolher
    if (!filePathToSave) {
      logger.debug('save-file', 'filePath não fornecido, mostrando showSaveDialog');
      const result = await dialog.showSaveDialog({
        defaultPath: options.defaultPath,
        filters: options.filters,
        properties: ['createDirectory']
      });
      
      logger.debug('save-file', 'Resultado do showSaveDialog:', result);
      
      if (result.canceled) {
        logger.debug('save-file', 'Operação cancelada pelo usuário no diálogo');
        return { success: false, message: 'Operation cancelled by user' };
      }
      filePathToSave = result.filePath;
    }

    // VALIDAÇÃO DE SEGURANÇA: Verificar extensão do arquivo
    const validation = validateFileExtension(filePathToSave);
    if (!validation.valid) {
      logger.error('SECURITY', 'Tentativa de salvar arquivo com extensão não permitida:', filePathToSave);
      return { success: false, error: validation.error };
    }

    // Se filePathToSave existe E options.content existe, então podemos salvar.
    if (filePathToSave && typeof options.content !== 'undefined') {
      logger.debug('save-file', 'Salvando conteúdo no arquivo em:', filePathToSave);
      fs.writeFileSync(filePathToSave, options.content);
      logger.debug('save-file', 'Arquivo salvo com sucesso');
      return { success: true, filePath: filePathToSave };
    } else if (filePathToSave && typeof options.content === 'undefined'){
      logger.debug('save-file', 'filePathToSave existe, mas content não. Retornando apenas o caminho.');
      return { success: true, filePath: filePathToSave };
    } else {
      logger.error('save-file', 'Condição inesperada para salvar arquivo. options:', options);
      return { success: false, error: 'Condição inesperada para salvar arquivo.' };
    }

  } catch (error) {
    logger.error('MAIN_IPC', 'save-file: Erro no handler:', error);
    return { success: false, error: error.message };
  }
});

// Handler para abrir arquivo
ipcMain.handle('open-file', async (event, options) => {
  logger.debug('MAIN_IPC', 'open-file: Handler invocado com opções:', options);
  try {
    const result = await dialog.showOpenDialog({
      filters: options.filters,
      properties: ['openFile']
    });
    
    logger.debug('open-file', 'Resultado do showOpenDialog:', result);
    
    if (result.canceled || result.filePaths.length === 0) {
      logger.debug('open-file', 'Operação cancelada pelo usuário');
      return { success: false, message: 'Operation cancelled by user' };
    }
    
    const filePath = result.filePaths[0];
    
    // VALIDAÇÃO DE SEGURANÇA: Verificar extensão do arquivo
    const validation = validateFileExtension(filePath);
    if (!validation.valid) {
      logger.error('SECURITY', 'Tentativa de abrir arquivo com extensão não permitida:', filePath);
      return { success: false, error: validation.error };
    }
    
    // Ler o conteúdo do arquivo
    logger.debug('open-file', 'Lendo arquivo:', filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    logger.debug('open-file', 'Arquivo lido com sucesso');
    return { success: true, content, filePath };
  } catch (error) {
    logger.error('MAIN_IPC', 'open-file: Erro no handler:', error);
    return { success: false, error: error.message };
  }
});

// Handler para exportar livros (MANTER APENAS ESTE)
ipcMain.handle('export-books', async (event, format) => {
  logger.debug('MAIN_IPC', `export-books: Handler invocado com formato: ${format}`);
  try {
    let defaultPath = '';
    let filters = [];
    
    switch (format) {
      case 'csv':
        defaultPath = 'minha_biblioteca.csv';
        filters = [{ name: 'CSV', extensions: ['csv'] }];
        break;
      case 'txt':
        defaultPath = 'minha_biblioteca.txt';
        filters = [{ name: 'Texto', extensions: ['txt'] }];
        break;
      case 'ods':
        defaultPath = 'minha_biblioteca.ods';
        filters = [{ name: 'Planilha ODS', extensions: ['ods'] }];
        break;
      case 'html':
        defaultPath = 'minha_biblioteca.html';
        filters = [{ name: 'HTML', extensions: ['html', 'xhtml'] }];
        break;
      default:
        throw new Error('Formato não suportado');
    }
    
    const result = await dialog.showSaveDialog({
      defaultPath,
      filters,
      properties: ['createDirectory']
    });
    
    if (result.canceled) {
      return { success: false, message: 'Operation cancelled by user' };
    }
    
    // VALIDAÇÃO DE SEGURANÇA: Verificar extensão do arquivo
    const validation = validateFileExtension(result.filePath);
    if (!validation.valid) {
      logger.error('SECURITY', 'Tentativa de salvar arquivo com extensão não permitida:', result.filePath);
      return { success: false, error: validation.error };
    }
    
    // Obter os livros do store
    const books = getStore().get('books', []);
    logger.debug(`MAIN_IPC', 'export-books: ${books.length} livros encontrados para exportação`);
    
    if (books.length === 0) {
      return { success: false, message: 'Nenhum livro encontrado para exportar' };
    }
    
    // Processar e salvar baseado no formato
    if (format === 'csv') {
      // Criar cabeçalho CSV
      const headers = ['Título', 'Autor', 'Páginas', 'Status', 'Páginas Lidas'];
      let csvContent = headers.join(',') + '\n';
      
      // Adicionar dados dos livros
      books.forEach(book => {
        const row = [
          `"${(book.title || '').replace(/"/g, '""')}"`,
          `"${(book.author || '').replace(/"/g, '""')}"`,
          book.pages || 0,
          `"${(book.status || 'Não Lido').replace(/"/g, '""')}"`,
          book.paginasLidas || book.pagesRead || 0
        ];
        csvContent += row.join(',') + '\n';
      });
      
      // Salvar arquivo
      fs.writeFileSync(result.filePath, csvContent, 'utf-8');
      logger.debug(`MAIN_IPC', 'export-books: Arquivo CSV salvo em: ${result.filePath}`);
      
      return { 
        success: true, 
        filePath: result.filePath,
        message: `${books.length} books exported successfully to ${result.filePath}`
      };
    }
    
    // Para outros formatos, retornar não implementado por enquanto
    return { success: false, message: `Exportação em formato ${format} ainda não implementada` };
    
  } catch (error) {
    logger.error('MAIN_IPC', 'export-books: Erro no handler:', error);
    return { success: false, error: error.message };
  }
});

// Handler para parsear conteúdo XLSX e salvar no store
ipcMain.handle('parse-xlsx-and-save', async (event, fileContent) => {
  try {
    if (!fileContent) {
      throw new Error('Conteúdo do arquivo XLSX não fornecido.');
    }

    const workbook = XLSX.read(fileContent, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Nenhuma planilha encontrada no arquivo XLSX.');
    }
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (!Array.isArray(jsonData)) {
        throw new Error('Falha ao converter planilha para JSON.');
    }

    const currentBooks = getStore().get('books', []);
    let nextId = getNextBookId(); // Usa a função para obter o próximo ID disponível

    const importedBooks = jsonData.map(row => {
      const title = row['Título'] || row['title'] || row['Title'];
      const author = row['Autor'] || row['author'] || row['Author'];
      const pages = parseInt(row['Páginas'] || row['pages'] || row['Pages'], 10);
      const status = row['Status'] || row['status'] || 'Não Lido'; // Default para 'Não Lido'

      // Validação básica
      if (!title || !author || isNaN(pages) || pages <= 0) {
        logger.warn('parse-xlsx-and-save', 'Linha ignorada por dados inválidos ou ausentes:', row);
        return null; // Ignorar linhas com dados essenciais ausentes/inválidos
      }

      const newBook = {
        id: nextId++,
        title: String(title),
        author: String(author),
        pages: pages,
        status: String(status),
        lastSelectedDate: null,
        isFavorite: false,
        pagesRead: 0,
        coverImage: null,
        dateAdded: new Date().toISOString(),
        // Adicione quaisquer outros campos padrão que seus objetos de livro possam ter
      };
      return newBook;
    }).filter(book => book !== null); // Remover entradas nulas (linhas ignoradas)

    if (importedBooks.length === 0 && jsonData.length > 0) {
        throw new Error('Nenhum livro válido pôde ser importado. Verifique o formato das colunas (Título, Autor, Páginas, Status) e os dados do arquivo.');
    }
    
    // No momento, a importação substitui toda a biblioteca.
    // Se desejar mesclar, a lógica precisará ser mais complexa aqui.
    getStore().set('books', importedBooks);
    logger.debug(`parse-xlsx-and-save', ${importedBooks.length} livros importados e salvos via XLSX.`);

    return { success: true, message: `${importedBooks.length} books imported successfully.` };

  } catch (error) {
    logger.error('parse-xlsx-and-save', 'Erro ao processar arquivo XLSX e salvar:', error);
    return { success: false, error: error.message };
  }
});

// Handler para parsear conteúdo RTF
ipcMain.handle('parse-rtf-content', async (event, rtfString) => {
  return new Promise((resolve, reject) => {
    rtfToText(rtfString, (err, plainText) => {
      if (err) {
        logger.error('parse-rtf-content', 'Erro ao converter RTF para texto no processo principal:', err);
        return reject(err);
      }
      resolve(plainText);
    });
  });
});

// Handler para parsear conteúdo ODS (usando XLSX)
ipcMain.handle('parse-ods-content', async (event, odsBuffer) => {
  try {
    const workbook = XLSX.read(odsBuffer, { type: 'buffer' });
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Planilha ODS vazia ou inválida');
    }
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
    return data;
  } catch (error) {
    logger.error('parse-ods-content', 'Erro ao parsear ODS no processo principal:', error);
    throw error; // Re-throw para ser pego pelo invoke no renderer
  }
});

// Handler para gerar e salvar arquivo de planilha (ODS/XLSX)
ipcMain.handle('generate-sheet-file', async (event, filePath, books, format) => {
  logger.debug('generate-sheet-file', 'Handler chamado com:', { filePath, booksCount: books.length, format });
  try {
    // Preparar dados para a planilha (array de arrays)
    const headers = ['ID', 'Título', 'Autor', 'Páginas', 'Status', 'Último Sorteio', 'Favorito', 'Páginas Lidas', 'Adicionado em', 'Capa'];
    const sheetData = [headers];

    books.forEach(book => {
      const row = [
        book.id || '',
        book.title || '',
        book.author || '',
        book.pages || '',
        book.status || '',
        book.lastSelectedDate ? new Date(book.lastSelectedDate).toLocaleDateString() : 'Nunca', // Formatar data
        book.favorite ? 'Sim' : 'Não',
        book.pagesRead || 0,
        book.addedDate ? new Date(book.addedDate).toLocaleDateString() : 'N/A', // Formatar data
        book.coverImage || 'Nenhuma'
      ];
      sheetData.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Biblioteca');

    // Determinar o tipo de livro com base no formato para writeFile
    let bookType;
    if (format === 'xlsx') {
      bookType = 'xlsx';
    } else if (format === 'ods') {
      bookType = 'ods';
    } else {
      throw new Error('Formato de planilha não suportado para escrita: ' + format);
    }

    XLSX.writeFile(workbook, filePath, { bookType: bookType });
    
    logger.debug(`generate-sheet-file', 'Arquivo ${format.toUpperCase()} gerado e salvo com sucesso em: ${filePath}`);
    return { success: true, filePath };
  } catch (error) {
    logger.error(`generate-sheet-file', 'Erro ao gerar arquivo ${format.toUpperCase()}:`, error);
    return { success: false, error: error.message };
  }
});

// Handler para gerar e salvar arquivo PDF
ipcMain.handle('generate-pdf-file', async (event, filePath, books) => {
  logger.debug('generate-pdf-file', 'Handler chamado com:', { filePath, booksCount: books.length });
  try {
    // 1. Criar conteúdo HTML para o PDF
    let htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Minha Biblioteca</title>
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; margin: 20px; }
            h1 { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
            .book-item { border: 1px solid #eee; padding: 10px; margin-bottom: 10px; page-break-inside: avoid; }
            .book-item h2 { margin-top: 0; font-size: 1.2em; }
            .book-item p { margin: 5px 0; }
            strong { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Minha Biblioteca de Livros</h1>
    `;

    if (books && books.length > 0) {
      books.forEach(book => {
        htmlContent += `
          <div class="book-item">
            <h2>${book.title || 'N/A'}</h2>
            <p><strong>Autor:</strong> ${book.author || 'N/A'}</p>
            <p><strong>Páginas:</strong> ${book.pages || 'N/A'}</p>
            <p><strong>Status:</strong> ${book.status || 'N/A'}</p>
            <p><strong>Último Sorteio:</strong> ${book.lastSelectedDate ? new Date(book.lastSelectedDate).toLocaleDateString() : 'Nunca'}</p>
            <p><strong>Favorito:</strong> ${book.favorite ? 'Sim' : 'Não'}</p>
            <p><strong>Páginas Lidas:</strong> ${book.pagesRead || 0}</p>
            <p><strong>Adicionado em:</strong> ${book.addedDate ? new Date(book.addedDate).toLocaleDateString() : 'N/A'}</p>
          </div>
        `;
      });
    } else {
      htmlContent += '<p style="text-align:center;">Nenhum livro na biblioteca.</p>';
    }

    htmlContent += `
        </body>
      </html>
    `;

    // 2. Criar uma janela invisível para carregar o HTML
    const pdfWindow = new BrowserWindow({
      show: false, // Não mostrar a janela
      webPreferences: { nodeIntegration: false, contextIsolation: true } // Boas práticas de segurança
    });

    // Carregar o HTML na janela invisível
    await pdfWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(htmlContent));
    logger.debug('generate-pdf-file', 'Janela invisível carregou o HTML para PDF.');

    // 3. Imprimir para PDF
    // Opções de printToPDF: https://www.electronjs.org/docs/latest/api/web-contents#contentsprinttopdfoptions
    const pdfData = await pdfWindow.webContents.printToPDF({
      printBackground: true, // Imprime o fundo (cores, etc)
      pageSize: {
        width: 210000, // A4 width in microns (210mm)
        height: 297000 // A4 height in microns (297mm)
      },
      margins: {
        top: 10000,    // 10mm em microns
        bottom: 10000, // 10mm em microns
        left: 10000,   // 10mm em microns
        right: 10000   // 10mm em microns
      }
    });
    logger.debug('generate-pdf-file', 'printToPDF concluído.');

    // 4. Salvar o PDF no caminho especificado
    fs.writeFileSync(filePath, pdfData);
    logger.debug(`generate-pdf-file', 'Arquivo PDF gerado e salvo com sucesso em: ${filePath}`);

    // 5. Fechar a janela invisível
    pdfWindow.close();

    return { success: true, filePath };
  } catch (error) {
    logger.error('generate-pdf-file', 'Erro ao gerar arquivo PDF:', error);
    return { success: false, error: error.message };
  }
});

// Handler para parsear conteúdo TXT e extrair livros
ipcMain.handle('parse-txt-content', async (event, { filePath, fileContent }) => {
  logger.debug(`parse-txt-content', 'Handler chamado para: ${filePath}`);
  if (!fileContent) {
    return { success: false, error: 'Conteúdo do arquivo TXT está vazio ou não foi fornecido.', books: [] };
  }
  try {
    const lines = fileContent.split(/\r?\n/); // Divide por nova linha (Windows ou Unix)
    const parsedBooks = [];
    let bookIdCounter = Date.now(); // Uma forma simples de gerar IDs únicos para esta importação

    for (const line of lines) {
      if (line.trim() === '') continue; // Pular linhas vazias

      let title = line.trim();
      let author = ''; // Autor padrão como string vazia

      // Tentar extrair autor por parênteses: Ex: "Título (Autor)"
      const authorMatchParentheses = line.match(/(.*)\s*\(([^)]+)\)/);
      if (authorMatchParentheses && authorMatchParentheses.length === 3) {
        title = authorMatchParentheses[1].trim();
        author = authorMatchParentheses[2].trim();
      } else {
        // Tentar extrair autor por hífen: Ex: "Título - Autor"
        // Procurar por " - " (com espaços) para evitar hífens no título
        const parts = line.split(/\s+-\s+/);
        if (parts.length > 1) {
          // Assume que tudo após o último " - " é o autor
          author = parts.pop().trim(); 
          title = parts.join(' - ').trim(); // Rejunta o título caso ele mesmo contenha " - "
        }
      }
      
      // Se após as tentativas de extração o título ficar vazio e o autor não, 
      // pode ser que a linha inteira fosse o autor (menos provável, mas para cobrir)
      // No entanto, a regra é que a linha é primariamente o título.
      // Se o título estiver vazio após a extração, mas a linha original não, usar a linha original como título.
      if (title === '' && line.trim() !== '') {
          title = line.trim(); // Restaura a linha original como título se a extração o anulou
          author = ''; // Reseta o autor se o título foi anulado pela extração
      }

      if (title) { // Adicionar apenas se tiver um título
        parsedBooks.push({
          // Simula a estrutura esperada pela função addBook no renderer
          // id: bookIdCounter++, // O ID real será gerado pela função addBook do renderer
          title: title,
          author: author,
          pages: 0, // Default para 0 páginas, usuário pode editar depois
          status: 'Não Lido', // Default status
          // lastSelectedDate: null // Será definido pela lógica do app
          // dateAdded: new Date().toISOString() // Adicionado pela addBook
        });
      }
    }
    logger.debug(`parse-txt-content', 'Livros parseados do TXT (${parsedBooks.length}):`, parsedBooks.slice(0, 5)); // Logar os 5 primeiros
    return { success: true, books: parsedBooks };
  } catch (error) {
    logger.error('parse-txt-content', 'Erro ao parsear conteúdo TXT:', error);
    return { success: false, error: error.message, books: [] };
  }
});

// Handler para parsear conteúdo CSV e extrair livros
ipcMain.handle('parse-csv-content', async (event, { filePath, fileContent }) => {
  logger.debug(`parse-csv-content', 'Handler chamado para: ${filePath}`);
  logger.debug('parse-csv-content', 'Conteúdo do arquivo CSV (primeiros 500 chars):', fileContent ? fileContent.substring(0, 500) : 'Nulo');
  if (!fileContent) {
    return { success: false, error: 'Conteúdo do arquivo CSV está vazio ou não foi fornecido.', books: [] };
  }
  try {
    const workbook = XLSX.read(fileContent, { type: 'string' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Converter para array de arrays, pulando a primeira linha (cabeçalho)
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 1 }); 

    const parsedBooks = [];
    const targetColumnIndex = 1; // Assumindo coluna B (índice 1) para título/autor

    for (const row of rows) {
      if (!row || row.length <= targetColumnIndex || !row[targetColumnIndex]) {
        logger.debug('parse-csv-content', 'Linha CSV pulada (vazia, curta ou coluna alvo vazia):', row);
        continue; // Pular linha se for vazia, curta ou a coluna alvo não existir/estiver vazia
      }

      const cellValue = String(row[targetColumnIndex]).trim();
      if (cellValue === '') continue; // Pular se o valor da célula principal estiver vazio

      let title = cellValue;
      let author = '';

      const authorMatchParentheses = cellValue.match(/(.*)\s*\(([^)]+)\)/);
      if (authorMatchParentheses && authorMatchParentheses.length === 3) {
        title = authorMatchParentheses[1].trim();
        author = authorMatchParentheses[2].trim();
      } else {
        const parts = cellValue.split(/\s+-\s+/);
        if (parts.length > 1) {
          author = parts.pop().trim();
          title = parts.join(' - ').trim();
        }
      }
      
      if (title === '' && cellValue !== '') {
          title = cellValue; 
          author = ''; 
      }

      if (title) {
        parsedBooks.push({
          title: title,
          author: author,
          pages: 0, 
          status: 'Não Lido',
        });
      }
    }
    logger.debug(`parse-csv-content', 'Livros parseados do CSV (${parsedBooks.length}):`, parsedBooks.slice(0,5));
    return { success: true, books: parsedBooks };
  } catch (error) {
    logger.error('parse-csv-content', 'Erro ao parsear conteúdo CSV:', error);
    return { success: false, error: `Erro ao processar CSV: ${error.message}`, books: [] };
  }
});

// Novo handler para processar (parsear) e salvar conteúdo CSV
ipcMain.handle('process-and-save-csv', async (event, fileContent) => {
    logger.debug('process-and-save-csv', 'Handler invocado.');
    logger.debug('process-and-save-csv', 'Conteúdo do arquivo CSV (primeiros 500 chars):', fileContent ? fileContent.substring(0, 500) : 'Nulo');
    if (!fileContent) {
        logger.error('process-and-save-csv', 'Conteúdo do arquivo CSV vazio ou não fornecido.');
        return { success: false, error: 'Conteúdo do arquivo CSV vazio ou não fornecido.' };
    }
    try {
        // --- Lógica de parseamento de CSV ---
        const workbook = XLSX.read(fileContent, { type: 'string' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Converter para JSON usando a primeira linha como cabeçalho
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importedBooks = [];

        for (const row of jsonData) {
            const title = row['Título'] ? String(row['Título']).trim() : '';
            const author = row['Autor'] ? String(row['Autor']).trim() : '';
            const pages = row['Páginas'] ? parseInt(row['Páginas'], 10) : 0;
            const status = row['Status'] ? String(row['Status']).trim() : 'Não Lido'; // Default status
            const paginasLidas = row['Páginas Lidas'] ? parseInt(row['Páginas Lidas'], 10) : 0; // Incluir Páginas Lidas

            // Validar se o título existe, pois é a métrica para duplicação
            if (title) {
                importedBooks.push({
                    title: title,
                    author: author,
                    pages: isNaN(pages) || pages < 0 ? 0 : pages, // Validar e default para 0
                    status: status,
                    paginasLidas: isNaN(paginasLidas) || paginasLidas < 0 ? 0 : paginasLidas, // Validar e default para 0
                    // Outros campos como id, dateAdded, lastSelectedDate, isFavorite, coverImage
                    // serão definidos ou padrão na lógica de mesclagem/adição
                });
            } else {
                 logger.debug('process-and-save-csv', 'Linha CSV ignorada por não ter Título:', row);
            }
        }
        logger.debug(`process-and-save-csv', ${importedBooks.length} livros parseados do CSV.`);
        // --- Fim da lógica de parseamento de CSV ---

        if (importedBooks.length === 0) {
             logger.warn('process-and-save-csv', 'Nenhum livro válido parseado do CSV.');
             return { success: false, message: 'Nenhum livro válido encontrado no arquivo CSV.' };
        }

        // --- Lógica de mesclagem ---
        let currentBooks = getStore().get('books', []);
        let nextId = getNextBookId(); // Obter o próximo ID disponível
        const mergedBooks = [...currentBooks]; // Começa com os livros existentes
        let newBooksAddedCount = 0;
        let duplicatesIgnoredCount = 0;

        for (const importedBook of importedBooks) {
            // Verificar se o livro importado já existe na lista atual (comparando APENAS TÍTULO)
            const exists = mergedBooks.some(book =>
                book.title === importedBook.title
            );

            if (!exists) {
                // Se não existir, adicionar à lista mesclada com um novo ID e data
                mergedBooks.push({
                    ...importedBook, // Inclui title, author, pages, status, paginasLidas do CSV
                    id: nextId++,
                    dateAdded: new Date().toISOString(),
                    lastSelectedDate: null, // Sempre null para novos livros importados? Ou manter do CSV se existir? Manter null para novos.
                    isFavorite: false, // Sempre false para novos livros importados? Ou manter do CSV se existir? Manter false para novos.
                    coverImage: null, // Sempre null para novos livros importados?
                });
                newBooksAddedCount++;
            } else {
                 logger.debug(`process-and-save-csv', 'Livro duplicado (Título) encontrado e ignorado: ${importedBook.title}`);
                 duplicatesIgnoredCount++;
            }
        }

        // Salvar a lista mesclada de volta no store
        getStore().set('books', mergedBooks);
        logger.debug(`process-and-save-csv', ${newBooksAddedCount} novos livros adicionados. ${duplicatesIgnoredCount} duplicados ignorados. Total de livros no store: ${mergedBooks.length}.`);
        // --- Fim da lógica de mesclagem ---

        // Notificar o renderer que os livros foram atualizados
        if (mainWindow) {
             mainWindow.webContents.send('books-updated', getStore().get('books', [])); // Envia a lista mesclada
        }

        return { success: true, message: `${newBooksAddedCount} livro(s) importado(s) com sucesso! (${duplicatesIgnoredCount} duplicados ignorados)` };

    } catch (error) {
        logger.error('process-and-save-csv', 'Erro no handler:', error);
        return { success: false, error: error.message };
    }
});

// Stub handler para processar e salvar conteúdo JSON (Implementação pendente)
ipcMain.handle('process-and-save-json', async (event, fileContent) => {
     logger.debug('process-and-save-json', 'Handler stub invocado.');
     // TODO: Implementar lógica de parseamento e salvamento de JSON
     return { success: false, message: 'Importação de JSON em desenvolvimento.' };
});

// Stub handler para processar e salvar conteúdo TXT (Implementação pendente)
ipcMain.handle('process-and-save-txt', async (event, { filePath, fileContent }) => {
     logger.debug('process-and-save-txt', 'Handler stub invocado.');
     // TODO: Implementar lógica de parseamento e salvamento de TXT
     // Reutilizar parse-txt-content, atribuir IDs, e salvar no store.
     return { success: false, message: 'Importação de TXT em desenvolvimento.' };
});

// Stub handler para processar e salvar conteúdo RTF (Implementação pendente)
ipcMain.handle('process-and-save-rtf', async (event, { filePath, fileContent }) => {
     logger.debug('process-and-save-rtf', 'Handler stub invocado.');
     // TODO: Implementar lógica de parseamento e salvamento de RTF
     // Reutilizar parse-rtf-content, atribuir IDs, e salvar no store.
     return { success: false, message: 'Importação de RTF em desenvolvimento.' };
});

// Stub handler para processar e salvar conteúdo HTML (Implementação pendente)
ipcMain.handle('process-and-save-html', async (event, { filePath, fileContent }) => {
     logger.debug('process-and-save-html', 'Handler stub invocado.');
     // TODO: Implementar lógica de parseamento e salvamento de HTML
     // Reutilizar parse-html-content (se existir), atribuir IDs, e salvar no store.
     return { success: false, message: 'Importação de HTML em desenvolvimento.' };
});

// Handler para ADICIONAR um novo livro ao store
ipcMain.handle('add-book-to-store', async (event, newBookData) => {
  logger.debug('add-book-to-store', 'Handler invocado com dados:', newBookData);
  try {
    const books = getStore().get('books', []);
    const nextId = getNextBookId();

    const bookToAdd = {
      ...newBookData, // Dados recebidos do renderer (title, author, pages, status, etc.)
      id: nextId,
      addedDate: new Date().toISOString(),
      lastSelectedDate: null, // Default
      isFavorite: false,      // Default
      // paginasLidas já deve vir de newBookData ou ser 0 por default no renderer
    };

    books.push(bookToAdd);
    getStore().set('books', books);
    logger.debug(`add-book-to-store', 'Livro adicionado ao store com ID: ${nextId}`, bookToAdd);
    
    // Notificar o renderer que os livros foram atualizados para que ele possa re-renderizar se necessário
    // Esta notificação pode ser útil para outras partes da UI que não iniciaram a adição.
    if (mainWindow) {
      mainWindow.webContents.send('books-updated', books);
    }

    return { success: true, data: bookToAdd };
  } catch (error) {
    logger.error('add-book-to-store', 'Erro ao adicionar livro:', error);
    return { success: false, error: error.message };
  }
});

// Handler para OBTER todos os livros do store
ipcMain.handle('get-all-books', async () => {
  logger.debug('get-all-books', 'Handler invocado.');
  try {
    const books = getStore().get('books', []);
    // Realizar migração de pagesRead para paginasLidas se necessário
    const migratedBooks = books.map(book => {
      if (typeof book.pagesRead !== 'undefined' && typeof book.paginasLidas === 'undefined') {
        logger.debug('get-all-books', `Migrando pagesRead para paginasLidas para o livro ID: ${book.id}`);
        return { ...book, paginasLidas: book.pagesRead, pagesRead: undefined };
      }
      // Remover a propriedade pagesRead se ela ainda existir e paginasLidas já estiver definida
      if (typeof book.pagesRead !== 'undefined' && typeof book.paginasLidas !== 'undefined') {
         // logger.debug('get-all-books', `Removendo pagesRead duplicada para o livro ID: ${book.id}`);
         // return { ...book, pagesRead: undefined }; // Esta linha está causando problemas com a imutabilidade
         const { pagesRead, ...restOfBook } = book; // Cria um novo objeto sem pagesRead
         return restOfBook;
      }
      return book;
    });

    // Salvar os livros migrados de volta no store, se houveram migrações
    // É importante fazer isso apenas se realmente houver mudança para evitar escritas desnecessárias.
    // Uma forma simples de verificar é comparar o JSON.stringify, mas pode ser custoso para listas grandes.
    // Uma verificação mais granular seria ideal, ou simplesmente salvar sempre que houver uma migração detectada.
    if (migratedBooks.some(book => typeof book.pagesRead !== 'undefined' && typeof book.paginasLidas === 'undefined')) { // Verifica se alguma migração ocorreu
        getStore().set('books', migratedBooks);
        logger.debug('get-all-books', 'Livros migrados e salvos no store.');
    } else if (migratedBooks.some(book => typeof book.pagesRead !== 'undefined' && typeof book.paginasLidas !== 'undefined')) {
        // Esta condição é para o caso de remoção de pagesRead duplicada
        getStore().set('books', migratedBooks);
        logger.debug('get-all-books', 'Propriedade pagesRead duplicada removida e livros salvos no store.');
    }


    logger.debug('get-all-books', `Retornando livros: ${migratedBooks.length > 0 ? migratedBooks.map(b => ({id: b.id, title: b.title, paginasLidas: b.paginasLidas })) : "Nenhum livro"}`);
    return { success: true, data: migratedBooks };
  } catch (error) {
    logger.error('get-all-books', 'Erro ao obter livros:', error);
    return { success: false, error: error.message };
  }
});

// Handler para DELETAR um livro do store
ipcMain.handle('delete-book', async (event, bookIdToDelete) => {
  logger.debug('delete-book', `Handler chamado para ID: ${bookIdToDelete}`);
  try {
    let books = getStore().get('books', []);
    const initialLength = books.length;
    books = books.filter(book => String(book.id) !== String(bookIdToDelete));

    if (books.length === initialLength) {
      logger.warn(`delete-book', 'Livro com ID ${bookIdToDelete} não encontrado para deleção.`);
      // Considerar se deve retornar erro ou sucesso se não encontrado
      return { success: false, error: 'Livro não encontrado para deleção.' }; 
    }

    getStore().set('books', books);
    logger.debug(`delete-book', 'Livro com ID ${bookIdToDelete} deletado. ${books.length} livros restantes.`);
    
    if (mainWindow) {
      mainWindow.webContents.send('books-updated', books);
    }
    return { success: true, books }; // Retorna a lista atualizada
  } catch (error) {
    logger.error('delete-book', 'Erro ao deletar livro no main.js:', error);
    return { success: false, error: error.message };
  }
});

// Handler para atualizar livro
ipcMain.handle('update-book', async (event, bookId, bookData) => {
  logger.debug('update-book', 'Handler invocado com:', { bookId, bookData });
  try {
    // Obter livros atuais do store
    const books = getStore().get('books', []);
    
    // Encontrar o índice do livro a ser atualizado (comparação robusta)
    const bookIndex = books.findIndex(book => String(book.id) === String(bookId));
    
    if (bookIndex === -1) {
      logger.error('update-book', `Livro não encontrado com ID: ${bookId}`);
      logger.error('update-book', `IDs disponíveis: ${books.map(b => ({ id: b.id, type: typeof b.id }))}`);
      return { success: false, error: `Livro com ID ${bookId} não encontrado` };
    }
    
    // Atualizar o livro com os novos dados
    books[bookIndex] = { ...books[bookIndex], ...bookData };
    
    // Salvar de volta no store
    getStore().set('books', books);
    
    logger.debug('update-book', 'Livro atualizado com sucesso:', books[bookIndex]);
    return { success: true, book: books[bookIndex] };
    
  } catch (error) {
    logger.error('update-book', 'Erro no handler:', error);
    return { success: false, error: error.message };
  }
});

// Handler para deletar um livro do store
ipcMain.handle('delete-book-in-store', async (event, bookIdToDelete) => {
  // Handler compatível com o canal usado no preload/renderer
  let books = getStore().get('books', []);
  const initialLength = books.length;
  books = books.filter(book => String(book.id) !== String(bookIdToDelete));

  if (books.length === initialLength) {
    return { success: false, error: 'Livro não encontrado para deleção.' };
  }

  getStore().set('books', books);
  if (mainWindow) {
    mainWindow.webContents.send('books-updated', books);
  }
  return { success: true, books };
});

// Sair quando todas as janelas estiverem fechadas, exceto no macOS.
// No macOS é comum que aplicativos e sua barra de menu permaneçam ativos 
// até que o usuário saia explicitamente com Cmd + Q
// Variável para controlar se o aplicativo está sendo encerrado
let isQuitting = false;

// Evento disparado antes de tentar encerrar o aplicativo
app.on('before-quit', function (event) {
  logger.debug('app', 'Evento \'before-quit\' disparado.');
  isQuitting = true;
});

app.on('window-all-closed', function () {
  logger.debug('app', 'Evento \'window-all-closed\' disparado.');
  if (process.platform !== 'darwin') {
    logger.debug('app', 'Plataforma não é darwin. PREPARANDO PARA ENCERRAR APP (app.quit()).');
    app.quit();
  }
});

app.on('activate', function () {
  // No macOS é comum recriar uma janela no aplicativo quando o 
  // ícone do dock é clicado e não há outras janelas abertas.
  logger.debug('app', 'Evento \'activate\' disparado.');
  if (BrowserWindow.getAllWindows().length === 0) {
    logger.debug('app', 'Nenhuma janela aberta, chamando createWindow.');
    createWindow();
  }
});

// Adicionar um listener para 'uncaughtException' pode ajudar a pegar erros não tratados
process.on('uncaughtException', (error) => {
  logger.error('uncaughtException', 'Uncaught Exception:', error);
  // É importante decidir se a aplicação deve tentar continuar ou encerrar.
  // Para depuração, logar é útil. Em produção, pode ser melhor encerrar de forma graciosa.
  // dialog.showErrorBox('Erro Inesperado', `Ocorreu um erro não tratado: ${error.message}`);
  // app.quit(); // Descomente se quiser que a aplicação feche em exceções não tratadas.
});

// Handler para obter o histórico de sorteios
ipcMain.handle('get-draw-history', async () => {
  try {
    const history = getStore().get('drawHistory', []);
    return { success: true, data: history };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler para salvar o histórico de sorteios
ipcMain.handle('set-draw-history', async (event, history) => {
  try {
    getStore().set('drawHistory', history);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler para abrir arquivo localmente (para documentos legais, etc.)
ipcMain.handle('open-local-file', async (event, filePath) => {
  logger.debug('open-local-file', 'Handler invocado no início (antes do try).');
  try {
    // Construir o caminho absoluto para o arquivo
    const absolutePath = path.join(__dirname, filePath);
    logger.debug('open-local-file', `Entrando no bloco try para abrir arquivo ${filePath}. Caminho absoluto: ${absolutePath}`);

    // Use shell.openPath para abrir o arquivo com o programa padrão do sistema operacional
    const result = await shell.openPath(absolutePath);

    // shell.openPath retorna uma string vazia se for bem-sucedido, ou uma string de erro caso contrário
    if (result) {
      logger.error('open-local-file', `Erro ao abrir arquivo ${filePath} (Path: ${absolutePath}): ${result}`);
      // Informar o renderer que houve um erro
      return { success: false, error: `Erro ao abrir arquivo: ${result}` };
    } else {
      logger.debug('open-local-file', `Arquivo aberto com sucesso: ${filePath} (Path: ${absolutePath})`);
      return { success: true };
    }
  } catch (error) {
    logger.error('open-local-file', 'Erro inesperado no handler:', error);
    return { success: false, error: error.message };
  }
});
logger.debug('open-local-file', 'Handler definido no main.js.');

ipcMain.handle('deleteBook', async (event, bookId) => {
    logger.debug('deleteBook', `Recebida solicitação para excluir livro com ID ${bookId}`);
    try {
        const success = getStore().delete(`books.${bookId}`);
        logger.debug('deleteBook', `Resultado da exclusão para ID ${bookId}: ${success}`);
        // Opcional: Persistir mudanças imediatamente se getStore().delete não fizer isso
        // store.save(); 
        return { success: success };
    } catch (error) {
        logger.error(`deleteBook', 'Erro ao excluir livro com ID ${bookId}:`, error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('deleteSelectedBooks', async (event, bookIds) => {
    logger.debug('deleteSelectedBooks', `Recebida solicitação para excluir livros com IDs: ${bookIds.join(', ')}`);
    let successCount = 0;
    let failedIds = [];
    for (const bookId of bookIds) {
        try {
            const success = getStore().delete(`books.${bookId}`);
            logger.debug('deleteSelectedBooks', `Tentando excluir ID ${bookId}. Resultado: ${success}`);
            if (success) {
                successCount++;
            } else {
                failedIds.push(bookId);
            }
        } catch (error) {
            logger.error(`deleteSelectedBooks', 'Erro ao excluir livro com ID ${bookId}:`, error);
            failedIds.push(bookId);
        }
    }
    // Opcional: Persistir mudanças imediatamente
    // store.save();
    logger.debug('deleteSelectedBooks', `Exclusão em massa concluída. Sucesso: ${successCount}, Falhas: ${failedIds.length}`);
    return { success: failedIds.length === 0, successCount: successCount, failedIds: failedIds };
});

// Handler para importar livros
ipcMain.handle('import-books', async (event, format) => {
  logger.debug('import-books', `Handler invocado com formato: ${format}`);
  try {
    let filters = [];
    
    switch (format) {
      case 'json':
        filters = [{ name: 'JSON', extensions: ['json'] }];
        break;
      case 'csv':
        filters = [{ name: 'CSV', extensions: ['csv'] }];
        break;
      case 'txt':
        filters = [{ name: 'Texto', extensions: ['txt'] }];
        break;
      case 'ods':
        filters = [{ name: 'Planilha ODS', extensions: ['ods'] }];
        break;
      case 'rtf':
        filters = [{ name: 'Rich Text Format', extensions: ['rtf'] }];
        break;
      case 'html':
        filters = [{ name: 'HTML', extensions: ['html', 'xhtml'] }];
        break;
      case 'xlsx':
        filters = [{ name: 'Planilha Excel', extensions: ['xlsx'] }];
        break;
      default:
        throw new Error('Formato não suportado');
    }
    
    const result = await dialog.showOpenDialog({
      filters,
      properties: ['openFile']
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, message: 'Seleção de arquivo cancelada.' };
    }
    
    const filePath = result.filePaths[0];
    
    // VALIDAÇÃO DE SEGURANÇA: Verificar extensão do arquivo
    const validation = validateFileExtension(filePath);
    if (!validation.valid) {
      logger.error('SECURITY', 'Tentativa de abrir arquivo com extensão não permitida:', filePath);
      return { success: false, error: validation.error };
    }
    
    let content;

    if (format === 'ods' || format === 'xlsx') {
      content = fs.readFileSync(filePath); // Retorna como Buffer
    } else {
      content = fs.readFileSync(filePath, 'utf-8'); // Retorna como string
    }

    return { success: true, filePath, content };
  } catch (error) {
    logger.error('import-books', 'Erro no handler:', error);
    return { success: false, error: error.message };
  }
});

// Handler para EXCLUIR múltiplos livros do store
ipcMain.handle('delete-multiple-books-in-store', async (event, bookIds) => {
  logger.debug('delete-multiple-books-in-store', `Handler invocado com IDs: ${bookIds ? bookIds.join(', ') : 'Nenhum'}`);
  try {
    if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
      logger.warn('delete-multiple-books-in-store', 'IDs de livros ausentes ou inválidos.');
      return { success: false, error: 'IDs de livros ausentes ou inválidos.' };
    }

    const currentBooks = getStore().get('books', []);
    logger.debug('delete-multiple-books-in-store', `${currentBooks.length} livros antes da exclusão.`);

    // Filtrar livros que NÃO estão na lista de IDs a serem excluídos
    const updatedBooks = currentBooks.filter(book => !bookIds.includes(String(book.id))); // Comparar como string por segurança

    // Calcular quantos livros foram realmente removidos
    const deletedCount = currentBooks.length - updatedBooks.length;

    // Salvar a lista filtrada de volta no store
    getStore().set('books', updatedBooks);

    logger.debug('delete-multiple-books-in-store', `${updatedBooks.length} livros após a exclusão.`);
    logger.debug('delete-multiple-books-in-store', `${deletedCount} livro(s) excluído(s) com sucesso.`);

    // Notificar o renderer sobre o sucesso e quantos foram excluídos
    return { success: true, successCount: deletedCount };

  } catch (error) {
    logger.error('delete-multiple-books-in-store', 'Erro no handler:', error);
    return { success: false, error: error.message };
  }
});
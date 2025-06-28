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
const { contextBridge, ipcRenderer } = require('electron');

// Importar o logger
const logger = require('./utils/logger');

// Detecta ambiente de desenvolvimento
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

try {
  // ÚNICA exposição da electronAPI
  contextBridge.exposeInMainWorld('electronAPI', {
    // Adiciona informação sobre ambiente
    isDevelopment,
    
    getVersions: () => {
      return {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
      };
    },

    // Funções para importação e exportação de arquivos
    exportBooks: (format) => {
      return ipcRenderer.invoke('export-books', format);
    },
    importBooks: (format) => {
      return ipcRenderer.invoke('import-books', format);
    },
    
    saveFile: async (options) => {
      const result = await ipcRenderer.invoke('save-file', options);
      return result;
    },
    
    openFile: async (options) => {
      const result = await ipcRenderer.invoke('open-file', options);
      return result;
    },

    parseRTFContent: (rtfString) => {
        return ipcRenderer.invoke('parse-rtf', rtfString);
    },
    
    // Remover logs redundantes de entrada/saída, manter apenas logs importantes
    parseSpreadsheet: async (filePath, fileType) => {
        return await ipcRenderer.invoke('parse-spreadsheet', filePath, fileType);
    },
    
    generateSheetFile: async (filePath, books, format) => {
        const result = await ipcRenderer.invoke('generate-sheet-file', filePath, books, format);
        return result;
    },

    generatePdfFile: async (filePath, books) => {
        const result = await ipcRenderer.invoke('generate-pdf-file', filePath, books);
        return result;
    },

    // Manter logs apenas para operações críticas
    updateBook: async (bookId, bookData) => {
        const result = await ipcRenderer.invoke('update-book', bookId, bookData);
        return result;
    },

    addBookToStore: async (newBookData) => {
        const result = await ipcRenderer.invoke('add-book-to-store', newBookData);
        return result;
    },

    getAllBooks: async () => {
        const result = await ipcRenderer.invoke('get-all-books');
        return result;
    },

    // Remover logs de operações simples
    deleteBookInStore: async (bookId) => {
        return await ipcRenderer.invoke('delete-book-in-store', bookId);
    },

    deleteMultipleBooksInStore: async (bookIds) => {
        return await ipcRenderer.invoke('delete-multiple-books-in-store', bookIds);
    },

    clearAllBooks: async () => {
        return await ipcRenderer.invoke('clear-all-books');
    },

    updateWindowTitle: (title) => {
        ipcRenderer.send('update-window-title', title);
    },

    // Remover logs de callback registration
    onBooksUpdated: (callback) => {
        ipcRenderer.on('books-updated', callback);
    },

    offBooksUpdated: (callback) => {
        ipcRenderer.removeListener('books-updated', callback);
    },

    getDrawHistory: async () => {
        return await ipcRenderer.invoke('get-draw-history');
    },

    setDrawHistory: async (history) => {
        return await ipcRenderer.invoke('set-draw-history', history);
    },

    // Handler para processar e salvar conteúdo CSV
    processAndSaveCsv: (fileContent) => ipcRenderer.invoke('process-and-save-csv', fileContent),
    // Handlers stub para outros formatos (Implementação pendente)
    processAndSaveJson: (fileContent) => ipcRenderer.invoke('process-and-save-json', fileContent), // Stub
    processAndSaveTxt: (data) => ipcRenderer.invoke('process-and-save-txt', data), // Stub
    processAndSaveRtf: (data) => ipcRenderer.invoke('process-and-save-rtf', data), // Stub

    // Novo manipulador para abrir arquivos locais
    openLocalFile: (filePath) => {
        return ipcRenderer.invoke('open-local-file', filePath);
    }
  });

  // Expor o logger para o renderer
  contextBridge.exposeInMainWorld('logger', logger);

} catch (error) {
  console.error('Erro crítico no preload.js:', error);
}
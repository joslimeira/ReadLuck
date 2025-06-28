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
import { log } from './logger.js';

// Verifica se a electronAPI foi exposta corretamente
if (!window.electronAPI) {
    log('error', 'RENDERER', 'ERRO CRÍTICO: window.electronAPI não está disponível! O preload.js pode ter falhado.');
    alert('Erro crítico na inicialização da aplicação. Verifique o console para mais detalhes.');
}

export const getBooks = async () => {
    try {
        const result = await window.electronAPI.getAllBooks();
        if (result.success) {
            return result.data;
        } else {
            log('error', 'RENDERER', 'Falha ao obter livros via IPC', { error: result.error });
            return [];
        }
    } catch (error) {
        log('error', 'RENDERER', 'Erro de comunicação ao obter livros', { error: error.message });
        return [];
    }
};

export const updateBook = async (bookId, bookData) => {
    return await window.electronAPI.updateBook(bookId, bookData);
};

export const deleteBookInStore = async (bookId) => {
    return await window.electronAPI.deleteBookInStore(bookId);
};

export const deleteMultipleBooksInStore = async (bookIds) => {
    return await window.electronAPI.deleteMultipleBooksInStore(bookIds);
};

export const getDrawHistory = async () => {
    return await window.electronAPI.getDrawHistory();
};

export const setDrawHistory = async (history) => {
    return await window.electronAPI.setDrawHistory(history);
};
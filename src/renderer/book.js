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
import { getBooks, updateBook, getDrawHistory, setDrawHistory } from './utils/api.js';
import { log } from './utils/logger.js';
import { showToastNotification } from './utils/notifications.js';
import { loadBooksAndRender, updateReadingStats } from './index.js';
import { getBooks, getDrawHistory, setDrawHistory, deleteBookInStore, deleteMultipleBooksInStore, updateBook } from './utils/api.js';
import { renderBookCards } from './utils/dom.js';

// Função para selecionar um livro aleatório que não esteja concluído
export async function selectRandomBook() {
  try {
    const books = await getBooks();
    if (!books) {
        log('error', 'RENDERER', 'Falha ao obter livros para sorteio');
        alert(window.t('messages.errorLoadingBooks'));
        return null;
    }
    const availableBooks = books.filter(book => book.status !== 'Concluído');
    if (availableBooks.length === 0) {
      alert(window.t('messages.noAvailableBooks'));
      return null;
    }

    // Buscar histórico dos últimos 7 sorteios via IPC
    let drawHistory = [];
    try {
      const historyResult = await getDrawHistory();
      if (historyResult && historyResult.success && Array.isArray(historyResult.data)) {
        drawHistory = historyResult.data;
      }
    } catch (e) {
      log('warn', 'RENDERER', 'Falha ao obter histórico de sorteios', { error: e.message });
    }

    // Filtrar livros que não estão no histórico
    let filteredBooks = availableBooks.filter(book => !drawHistory.includes(book.id));
    // Se todos os disponíveis estão no histórico, usar todos
    if (filteredBooks.length === 0) {
      filteredBooks = availableBooks;
    }

    // Sorteio aleatório
    const randomIndex = Math.floor(Math.random() * filteredBooks.length);
    const selectedBook = filteredBooks[randomIndex];

    // Atualizar a data do último sorteio do livro via IPC
    const bookToUpdate = books.find(book => String(book.id) === String(selectedBook.id));
    if (bookToUpdate) {
      const now = new Date().toISOString();
      const updatedData = { ...bookToUpdate, lastSelectedDate: now };
      try {
        const result = await updateBook(selectedBook.id, updatedData);
        if (!result.success) {
          log('error', 'RENDERER', 'Falha ao atualizar lastSelectedDate via IPC', { error: result.error });
          alert(`Erro ao atualizar data do sorteio: ${result.error || 'Erro desconhecido'}`);
        }
      } catch (error) {
        log('error', 'RENDERER', 'Erro de comunicação ao atualizar lastSelectedDate', { error: error.message });
        alert(`Erro de comunicação ao atualizar data do sorteio: ${error.message}`);
      }
    }

    // Atualizar histórico (adiciona o novo, mantém só os 7 mais recentes)
    try {
      let newHistory = drawHistory.filter(id => id !== selectedBook.id);
      newHistory.unshift(selectedBook.id);
      if (newHistory.length > 7) newHistory = newHistory.slice(0, 7);
      await setDrawHistory(newHistory);
    } catch (e) {
      log('warn', 'RENDERER', 'Falha ao atualizar histórico de sorteios', { error: e.message });
    }

    return selectedBook;
  } catch (error) {
    log('error', 'RENDERER', 'Erro em selectRandomBook', { error: error.message });
    alert('Ocorreu um erro ao selecionar um livro aleatório. Verifique o console.');
    return null;
  }
}

// Função para excluir um livro pelo ID
export async function deleteBook(bookId) {
    if (!bookId) {
        log('error', 'RENDERER', 'deleteBook: ID do livro não fornecido');
        return;
    }

    try {
        const result = await deleteBookInStore(bookId);

        if (result && result.success) {
            const updatedBooksResult = await getBooks();
            if (updatedBooksResult) {
                await renderBookCards();
                showToastNotification(window.t('messages.bookDeleted'));
            } else {
                log('error', 'RENDERER', 'Falha ao recarregar livros após exclusão');
                showToastNotification('Livro excluído, mas falha ao atualizar a lista.');
            }
        } else {
            log('error', 'RENDERER', 'Falha ao excluir livro', { bookId, error: result?.error });
            showToastNotification(`Falha ao excluir livro: ${result ? result.error : 'Erro desconhecido'}`);
        }
    } catch (error) {
        log('error', 'RENDERER', 'Erro ao excluir livro', { bookId, error });
        showToastNotification(window.t('messages.errorDeleting'));
    }
}

// Função para excluir múltiplos livros
export async function deleteSelectedBooks(bookIds) {
    if (!bookIds || bookIds.length === 0) {
        log('warn', 'RENDERER', 'Nenhum ID selecionado para exclusão');
        return;
    }

    try {
        const result = await deleteMultipleBooksInStore(bookIds);

        if (result && result.success) {
            showToastNotification(`${result.successCount} ${window.t('messages.booksDeleted')}`);
            await loadBooksAndRender();
            log('info', 'RENDERER', 'Exclusão em massa concluída', { count: result.successCount });
        } else {
            log('error', 'RENDERER', 'Falha na exclusão em massa', { error: result?.error });
            showToastNotification(`${window.t('messages.errorMassDeleting')} ${result ? result.error : 'Erro desconhecido'}`, 'error');
        }
    } catch (error) {
        log('error', 'RENDERER', 'Erro na exclusão em massa', { error });
        showToastNotification(window.t('messages.errorMassDeleting'), 'error');
    }
}

// Função para adicionar favorito
export async function addToFavorites(bookId) { 
  console.log(`[RENDERER_DEBUG] addToFavorites: Tentando favoritar livro ID ${bookId}`);
  try {
    const books = await getBooks();
    const bookIndex = books.findIndex(b => String(b.id) === String(bookId));

    if (bookIndex !== -1) {
      const bookToUpdate = { ...books[bookIndex], isFavorite: true };
      const result = await updateBook(bookId, bookToUpdate);
      if (result.success) {
        showToastNotification(window.t('messages.addedToFavorites'));
        await loadBooksAndRender();
      } else {
        alert(`${window.t('messages.errorCommunication')} ${result.error || 'Erro desconhecido.'}`);
      }
    } else {
      alert(window.t('messages.bookNotFound'));
    }
  } catch (error) {
    console.error('[RENDERER_DEBUG] Erro ao chamar updateBook IPC para favoritar:', error);
    alert(`${window.t('messages.errorCommunication')} ${error.message}`);
  }
}

// Função para remover favorito
export async function removeFromFavorites(bookId) {
  console.log(`[RENDERER_DEBUG] removeFromFavorites: Tentando desfavoritar livro ID ${bookId}`);
  try {
    const books = await getBooks();
    const bookIndex = books.findIndex(b => String(b.id) === String(bookId));

    if (bookIndex !== -1) {
      const bookToUpdate = { ...books[bookIndex], isFavorite: false };
      const result = await updateBook(bookId, bookToUpdate);
      if (result.success) {
        showToastNotification(window.t('messages.removedFromFavorites'));
        await loadBooksAndRender();
      } else {
        alert(`${window.t('messages.errorCommunication')} ${result.error || 'Erro desconhecido.'}`);
      }
    } else {
      alert(window.t('messages.bookNotFound'));
    }
  } catch (error) {
    console.error('[RENDERER_DEBUG] Erro ao chamar updateBook IPC para desfavoritar:', error);
    alert(`${window.t('messages.errorCommunication')} ${error.message}`);
  }
}
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
import { getBooks, updateBook, deleteBookInStore, deleteMultipleBooksInStore } from './api.js';
import { log } from './logger.js';
import { formatDate } from './date.js';
import { showToastNotification } from './notifications.js';
import { getBooks } from './api.js';
import { removeFromFavorites } from '../book.js';

// Função para renderizar os cards de livros
export async function renderBookCards() {
  try {
    const books = await getBooks();
    // Adicionar um pequeno delay para garantir que o DOM esteja pronto
    await new Promise(resolve => setTimeout(resolve, 50));

    const booksContainer = document.getElementById('books-list');
    if (!booksContainer) {
        log('error', 'RENDERER', 'Container #books-list não encontrado');
        return;
    }
    
    booksContainer.innerHTML = '';

    if (!books || books.length === 0) {
        log('info', 'RENDERER', 'Nenhum livro para renderizar');
        booksContainer.innerHTML = `<p class="empty-library">${window.t('messages.emptyLibrary')}</p>`;
        return;
    }

    books.forEach(book => {
      const bookCard = document.createElement('div');
      bookCard.className = 'book-card';
      bookCard.dataset.id = book.id;

      bookCard.innerHTML = `
        <h3 class="book-title">${book.title}</h3>
        <p class="book-author">${book.author}</p>
        <p class="book-pages">${book.pages} ${window.t('modals.selectedBook.pages')}</p>
        <div class="status-dropdown">
          <select class="book-status" data-id="${book.id}">
            <option value="Não Lido" ${book.status === 'Não Lido' ? 'selected' : ''}>Não Lido</option>
            <option value="Lendo" ${book.status === 'Lendo' ? 'selected' : ''}>Lendo</option>
            <option value="Concluído" ${book.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
          </select>
        </div>
        <p class="book-last-selected">Último sorteio: ${book.lastSelectedDate ? formatDate(new Date(book.lastSelectedDate)) : 'Nunca'}</p>
      `;

      booksContainer.appendChild(bookCard);
    });

    // Adicionar event listeners para os select de status
    document.querySelectorAll('.book-status').forEach(select => {
      select.addEventListener('change', async function() { // Tornar async
        const bookId = this.dataset.id;
        const newStatus = this.value;
        
        try {
          const books = await getBooks();
          const bookToUpdate = books.find(b => String(b.id) === String(bookId));
          if (bookToUpdate) {
            const updatedData = { ...bookToUpdate, status: newStatus };
            const result = await updateBook(bookId, updatedData);
            if (result.success) {
              showToastNotification(window.t('messages.bookUpdated'));
              await loadBooksAndRender(); // Re-renderizar para refletir a mudança
            } else {
              alert(`${window.t('messages.errorUpdatingStatus')} ${result.error || 'Erro desconhecido'}`);
            }
          } else {
            alert(window.t('messages.bookNotFound'));
          }
        } catch (error) {
            log('error', 'RENDERER', 'Erro ao chamar updateBook IPC para status', { error: error.message });
            alert(`${window.t('messages.errorCommunication')} ${error.message}`);
          }
      });
    });
  } catch (error) {
    log('error', 'RENDERER', 'Erro em renderBookCards', { error: error.message });
    alert('Ocorreu um erro ao renderizar os cards de livros. Verifique o console.');
  }
}

// Função para renderizar a lista de livros (na página principal)
export function renderBooks(books) {
  const booksList = document.getElementById('books-list');
  if (!booksList) return;
  
  booksList.innerHTML = '';
  
  if (books.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-books';
    emptyMessage.innerHTML = `<p>${window.t('messages.emptyMyBooks')}</p>`;
    booksList.appendChild(emptyMessage);
    return;
  }
  
  books.forEach(book => {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.dataset.id = book.id;
    
    bookCard.innerHTML = `
      <h3 class="book-title">${book.title}</h3>
      <p class="book-author">${book.author}</p>
      <p class="book-pages">${book.pages} ${window.t('modals.selectedBook.pages')}</p>
      <div class="status-dropdown">
        <select class="book-status" data-id="${book.id}">
          <option value="Não Lido" ${book.status === 'Não Lido' ? 'selected' : ''}>Não Lido</option>
          <option value="Lendo" ${book.status === 'Lendo' ? 'selected' : ''}>Lendo</option>
          <option value="Concluído" ${book.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
        </select>
      </div>
      <p class="book-last-selected">Último sorteio: ${book.lastSelectedDate ? formatDate(new Date(book.lastSelectedDate)) : 'Nunca'}</p>
    `;
    
    booksList.appendChild(bookCard);
  });
  
  // Adicionar listeners aos status
  document.querySelectorAll('.book-status').forEach(select => {
    select.addEventListener('change', function() {
      const bookId = this.dataset.id;
      const newStatus = this.value;
      
      const books = getBooks();
      const book = books.find(b => b.id == bookId);
      if (book) {
        book.status = newStatus;
        saveBooks(books);
      }
    });
  });
  
  // Atualizar contador
  updateBooksCount(books);
}

// Função para atualizar o contador de livros
export function updateBooksCount(books) {
  const totalBooks = books.length;
  const unreadBooks = books.filter(book => book.status === 'Não Lido').length;
  const readingBooks = books.filter(book => book.status === 'Lendo').length;
  const completedBooks = books.filter(book => book.status === 'Concluído').length;
  
  const countElement = document.getElementById('books-count');
  if (countElement) {
    // Modify this line to include the prefix
    countElement.textContent = `${window.t('messages.booksRegistered')} ${totalBooks}`;
    console.log(`[RENDERER_DEBUG] updateBooksCount: Atualizado #books-count para: ${countElement.textContent}`); // Add log
  }
  
  const unreadElement = document.getElementById('unread-count');
  if (unreadElement) {
    unreadElement.textContent = unreadBooks;
  }
  
  const readingElement = document.getElementById('reading-count');
  if (readingElement) {
    readingElement.textContent = readingBooks;
  }
  
  const completedElement = document.getElementById('completed-count');
  if (completedElement) {
    completedElement.textContent = completedBooks;
  }
}

// Função para renderizar favoritos
export async function renderFavorites() {
  const favoritesContainer = document.getElementById('favorites-container');
  if (!favoritesContainer) return;
  
  const books = await getBooks();
  if (!books) return;
  
  const favorites = books.filter(book => book.isFavorite);
  
  favoritesContainer.innerHTML = '';
  
  if (favorites.length === 0) {
    favoritesContainer.innerHTML = '<p class="empty-favorites">Você ainda não tem favoritos.</p>';
    return;
  }
  
  favorites.forEach(book => {
    const favoriteCard = document.createElement('div');
    favoriteCard.className = 'favorite-card';
    favoriteCard.dataset.id = book.id;
    
    favoriteCard.innerHTML = `
      <h3 class="book-title">${book.title}</h3>
      <p class="book-author">${book.author}</p>
      <p class="book-pages">${book.pages} ${window.t('modals.selectedBook.pages')}</p>
      <p class="book-status">Status: ${book.status}</p>
      <button class="remove-favorite" data-id="${book.id}">Remover dos Favoritos</button>
    `;
    
    favoritesContainer.appendChild(favoriteCard);
  });
  
  // Adicionar listeners para remover dos favoritos
  document.querySelectorAll('.remove-favorite').forEach(button => {
    button.addEventListener('click', function() {
      const bookId = this.dataset.id;
      removeFromFavorites(bookId);
    });
  });
}
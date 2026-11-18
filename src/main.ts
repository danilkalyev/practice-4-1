import './styles.css';
import { AsyncState, Book } from './task1-types';
import { applyFilters, filterByAuthor, filterByMinYear } from './task3-filters';
import { createBookFromForm } from "./task4-integration";
import { filterByTitle, sortBooks } from './task5-utils';
import { BookCatalog } from './task6-classes';
import { Wishlist } from './task7-wishlist';
import { fetchBooks, saveBooks } from './mock-api';

// ============================================================
// СОСТОЯНИЕ
// ============================================================
let state: AsyncState<Book[]> = { status: 'loading' };

// Временное сообщение об ошибке сохранения (список при этом не пропадает)
let errorMessage = '';

let wishlist = new Wishlist();

const savedWishlist = localStorage.getItem('wishlist');
if (savedWishlist) {
  wishlist = new Wishlist(JSON.parse(savedWishlist));
}

function saveWishlist() {
  localStorage.setItem('wishlist', JSON.stringify(wishlist.getFavoriteIds()));
}

// ============================================================
// DOM-элементы
// ============================================================
const bookList = document.querySelector('#bookList') as HTMLDivElement;
const wishlistContainer = document.querySelector('#wishlistContainer') as HTMLDivElement;
const form = document.querySelector('#bookForm') as HTMLFormElement;
const filterBtn = document.querySelector('#applyFilters') as HTMLButtonElement;
const authorInput = document.querySelector('#filterAuthor') as HTMLInputElement;
const yearInput = document.querySelector('#filterYear') as HTMLInputElement;
const errorBox = document.querySelector('#errorMessage') as HTMLDivElement;
const searchInput = document.querySelector('#searchInput') as HTMLInputElement;
const sortBySelect = document.querySelector('#sortBy') as HTMLSelectElement;

// ============================================================
// СОХРАНЕНИЕ (асинхронно, с обработкой ошибок)
// ============================================================
async function updateBooks(newBooks: Book[]) {
  try {
    await saveBooks(newBooks);
    state = { status: 'success', data: newBooks };
    render();
    return true;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Не удалось сохранить';
    render();
    setTimeout(() => {
      errorMessage = '';
      render();
    }, 3000);
    return false;
  }
}

// ============================================================
// СОЗДАНИЕ КАРТОЧКИ
// ============================================================
function createBookCard(book: Book): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'book-card';

  const titleEl = document.createElement('h3');
  titleEl.textContent = `${book.title} — ${book.authors.join(', ')}${book.year ? `, ${book.year}` : ''}`;
  card.append(titleEl);

  if (book.rating !== undefined) {
    const ratingEl = document.createElement('p');
    ratingEl.textContent = `Рейтинг: ${book.rating}`;
    card.append(ratingEl);
  }

  // Кнопка «Удалить»
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', async () => {
    if (state.status !== 'success') return;
    const catalog = new BookCatalog('main', state.data);
    catalog.removeBook(book.id);
    await updateBooks(catalog.getBooks());
  });
  card.append(deleteBtn);

  // Кнопка «Избранное»
  const favBtn = document.createElement('button');
  favBtn.textContent = wishlist.has(book.id) ? '❤️ В избранном' : '🤍 В избранное';
  favBtn.addEventListener('click', () => {
    wishlist.toggle(book.id);
    saveWishlist();
    render();
  });
  card.append(favBtn);

  return card;
}

// ============================================================
// ОТРИСОВКА
// ============================================================
function renderBooks(books: Book[]) {
  bookList.innerHTML = '';

  if (books.length === 0) {
    bookList.textContent = 'Книги не найдены. Попробуйте изменить фильтры.';
    return;
  }

  books.forEach(book => {
    bookList.append(createBookCard(book));
  });
}

function renderWishlist(catalog: BookCatalog) {
  wishlistContainer.innerHTML = '';
  const favBooks = wishlist.getFavorites(catalog);

  if (favBooks.length === 0) {
    wishlistContainer.textContent = 'Пока ничего не добавлено';
    return;
  }

  favBooks.forEach(book => {
    wishlistContainer.append(createBookCard(book));
  });
}

// Отрисовка списка книг с учётом фильтров и сортировки
function renderSuccess(books: Book[]) {
  const catalog = new BookCatalog('main', books);

  const filters: ((book: Book) => boolean)[] = [];
  if (authorInput.value.trim()) filters.push(filterByAuthor(authorInput.value.trim()));
  if (yearInput.value) filters.push(filterByMinYear(parseInt(yearInput.value, 10)));
  if (searchInput.value.trim()) filters.push(filterByTitle(searchInput.value.trim()));

  const filtered = applyFilters(catalog.getBooks(), filters);
  const sorted = sortBooks(filtered, sortBySelect.value as 'year' | 'rating');

  renderBooks(sorted);
  renderWishlist(catalog);
}

function renderError(message: string) {
  bookList.innerHTML = '';
  wishlistContainer.innerHTML = '';

  const box = document.createElement('div');
  box.style.color = 'white';
  box.style.background = '#d33';
  box.style.padding = '16px';
  box.style.borderRadius = '8px';
  box.textContent = message;

  const retryBtn = document.createElement('button');
  retryBtn.textContent = 'Повторить попытку';
  retryBtn.style.marginLeft = '12px';
  retryBtn.addEventListener('click', () => {
    initApp();
  });
  box.append(retryBtn);

  bookList.append(box);
}

// Единая функция отрисовки — вызывается после каждого изменения state
function render() {
  errorBox.textContent = errorMessage;
  errorBox.style.color = 'red';

  switch (state.status) {
    case 'idle':
      bookList.textContent = 'Нажмите, чтобы загрузить данные';
      wishlistContainer.innerHTML = '';
      break;
    case 'loading':
      bookList.textContent = 'Загрузка данных...';
      wishlistContainer.innerHTML = '';
      break;
    case 'success':
      renderSuccess(state.data);
      break;
    case 'error':
      renderError(state.message);
      break;
  }
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
async function initApp() {
  state = { status: 'loading' };
  render();

  try {
    const books = await fetchBooks();
    state = { status: 'success', data: books };
  } catch (error) {
    state = { status: 'error', message: error instanceof Error ? error.message : 'Неизвестная ошибка' };
  }

  render();
}

initApp();

// ============================================================
// ОБРАБОТЧИК ФОРМЫ
// ============================================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (state.status !== 'success') return;

  let newBook: Book;
  try {
    newBook = createBookFromForm(new FormData(form));
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Ошибка в форме';
    render();
    return;
  }

  errorMessage = '';
  const catalog = new BookCatalog('main', state.data);
  catalog.addBook(newBook);

  const saved = await updateBooks(catalog.getBooks());
  if (saved) form.reset();
});

// ============================================================
// ФИЛЬТРЫ И СОРТИРОВКА
// ============================================================
filterBtn.addEventListener('click', render);
searchInput.addEventListener('input', render);
sortBySelect.addEventListener('change', render);

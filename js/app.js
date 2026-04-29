// ── App Controller ──

const App = {
    currentTab: 'books',
    currentView: 'list', // list | detail | form | import
    currentBookId: null,
    searchText: '',
    filterStatus: null,
    statPeriod: 'year',
    modalEl: null,

    init() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(() => {});
        }

        // Tab bar
        document.getElementById('tab-bar').addEventListener('click', e => {
            const btn = e.target.closest('.tab-btn');
            if (!btn) return;
            this.switchTab(btn.dataset.tab);
        });

        // Listen for store changes
        Store.onChange(() => this.refresh());

        // Fetch covers for existing books
        Covers.fetchAll(Store.getAll());

        // Initial render
        this.render();
    },

    switchTab(tab) {
        this.currentTab = tab;
        this.currentView = 'list';
        this.currentBookId = null;
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tab);
            b.setAttribute('aria-selected', b.dataset.tab === tab);
        });
        this.render();
    },

    render() {
        const main = document.getElementById('main-content');
        main.scrollTop = 0;

        if (this.currentTab === 'stats') {
            StatsView.render(main, this.statPeriod);
            this._bindStats(main);
            return;
        }

        if (this.currentView === 'detail' && this.currentBookId) {
            const book = Store.getById(this.currentBookId);
            if (book) {
                Views.renderBookDetail(main, book);
                this._bindDetail(main);
                return;
            }
        }

        Views.renderBookList(main, { search: this.searchText, filter: this.filterStatus });
        this._bindList(main);
    },

    refresh() {
        if (!this.modalEl) this.render();
    },

    // ── Bindings ──

    _bindList(el) {
        // Search
        const searchInput = el.querySelector('#search-input');
        if (searchInput) {
            searchInput.addEventListener('input', e => {
                this.searchText = e.target.value;
                Views.renderBookList(el, { search: this.searchText, filter: this.filterStatus });
                this._bindList(el);
                // Re-focus and restore cursor
                const input = el.querySelector('#search-input');
                if (input) { input.focus(); input.selectionStart = input.selectionEnd = input.value.length; }
            });
        }

        // Filters
        el.querySelector('#filter-bar')?.addEventListener('click', e => {
            const chip = e.target.closest('.filter-chip');
            if (!chip) return;
            this.filterStatus = chip.dataset.filter || null;
            this.render();
        });

        // Book rows
        el.querySelectorAll('.book-row[data-id]').forEach(row => {
            row.addEventListener('click', () => {
                this.currentView = 'detail';
                this.currentBookId = row.dataset.id;
                this.render();
            });
        });

        // Add / Import buttons
        const bindBtn = (id, fn) => el.querySelector(id)?.addEventListener('click', fn);
        bindBtn('#btn-add', () => this._openModal('add'));
        bindBtn('#btn-import', () => this._openModal('import'));
        bindBtn('#btn-export', () => CSVParser.downloadExport(Store.getAll()));
        bindBtn('#empty-add', () => this._openModal('add'));
        bindBtn('#empty-import', () => this._openModal('import'));
    },

    _bindDetail(el) {
        el.querySelector('#btn-back')?.addEventListener('click', () => {
            this.currentView = 'list';
            this.currentBookId = null;
            this.render();
        });
        el.querySelector('#btn-edit')?.addEventListener('click', () => {
            const book = Store.getById(this.currentBookId);
            if (book) this._openModal('edit', book);
        });
    },

    _bindStats(el) {
        el.querySelector('.stat-picker')?.addEventListener('click', e => {
            const btn = e.target.closest('button[data-period]');
            if (!btn) return;
            this.statPeriod = btn.dataset.period;
            this.render();
        });
        el.querySelector('#year-bar')?.addEventListener('click', e => {
            const btn = e.target.closest('button[data-year]');
            if (!btn) return;
            StatsView._selectedYear = parseInt(btn.dataset.year);
            this.render();
        });
    },

    // ── Modal ──

    _openModal(type, book = null) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = '<div class="modal-sheet"></div>';
        document.body.appendChild(overlay);
        this.modalEl = overlay;

        const sheet = overlay.querySelector('.modal-sheet');

        overlay.addEventListener('click', e => {
            if (e.target === overlay) this._closeModal();
        });

        if (type === 'import') {
            this._renderImportModal(sheet);
        } else if (type === 'add') {
            this._renderSearchModal(sheet);
        } else {
            this._renderFormModal(sheet, type, book);
        }
    },

    _closeModal() {
        if (this.modalEl) {
            this.modalEl.remove();
            this.modalEl = null;
            this.render();
        }
    },

    _renderFormModal(sheet, type, book) {
        Views.renderBookForm(sheet, book);

        sheet.querySelector('#form-cancel')?.addEventListener('click', () => this._closeModal());

        sheet.querySelector('#form-save')?.addEventListener('click', () => {
            const title = sheet.querySelector('#f-title')?.value?.trim();
            const authors = sheet.querySelector('#f-authors')?.value?.trim();
            if (!title || !authors) {
                sheet.querySelector('#f-title').style.borderBottom = title ? '' : '2px solid var(--red)';
                sheet.querySelector('#f-authors').style.borderBottom = authors ? '' : '2px solid var(--red)';
                return;
            }
            const data = Views.getFormData(book);
            if (type === 'edit') {
                Store.update(data);
            } else {
                Store.add(data);
            }
            this._closeModal();
        });

        sheet.querySelector('#form-delete')?.addEventListener('click', () => {
            if (confirm('Delete this book?')) {
                Store.delete(book.id);
                this.currentView = 'list';
                this.currentBookId = null;
                this._closeModal();
            }
        });
    },

    _renderSearchModal(sheet) {
        let searchTimer = null;
        let selectedBook = null;

        sheet.innerHTML = `
            <div class="modal-handle"></div>
            <div class="nav-bar">
                <button class="nav-btn" id="search-cancel">Cancel</button>
                <span class="nav-title">Add Book</span>
                <span></span>
            </div>
            <div class="search-bar" style="padding-top:8px">
                <input type="search" id="book-search" placeholder="Search by title or author..." autocomplete="off" autofocus>
            </div>
            <div id="search-results" style="padding:0 16px">
                <div style="text-align:center;padding:40px 16px;color:var(--text2)">
                    <div style="font-size:36px;margin-bottom:12px">🔍</div>
                    <p>Search for a book to add it to your library.</p>
                </div>
            </div>
            <div id="search-add-form" style="display:none"></div>
        `;

        sheet.querySelector('#search-cancel').addEventListener('click', () => this._closeModal());

        const searchInput = sheet.querySelector('#book-search');
        const resultsDiv = sheet.querySelector('#search-results');
        const formDiv = sheet.querySelector('#search-add-form');

        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            const q = searchInput.value.trim();
            if (q.length < 2) {
                resultsDiv.innerHTML = `<div style="text-align:center;padding:40px 16px;color:var(--text2)">
                    <div style="font-size:36px;margin-bottom:12px">🔍</div>
                    <p>Search for a book to add it to your library.</p>
                </div>`;
                return;
            }
            resultsDiv.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text2)">Searching...</div>`;
            searchTimer = setTimeout(() => this._searchBooks(q, resultsDiv, formDiv, sheet), 400);
        });
    },

    async _searchBooks(query, resultsDiv, formDiv, sheet) {
        try {
            const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`);
            if (!resp.ok) throw new Error('API error');
            const data = await resp.json();

            if (!data.items || data.items.length === 0) {
                resultsDiv.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text2)">
                    <p>No books found. Try a different search.</p>
                </div>`;
                return;
            }

            resultsDiv.innerHTML = `<div class="card-group">${data.items.map(item => {
                const v = item.volumeInfo || {};
                const thumb = v.imageLinks?.smallThumbnail?.replace('http://', 'https://') || '';
                const authors = (v.authors || []).join(', ');
                const year = v.publishedDate ? v.publishedDate.substring(0, 4) : '';
                return `
                    <div class="book-row search-result-row" data-gid="${item.id}" role="button" tabindex="0">
                        <div class="book-icon ${thumb ? 'has-cover' : ''}" style="width:44px;height:64px">
                            ${thumb ? `<img src="${thumb}" alt="Cover" loading="lazy">` : '📖'}
                        </div>
                        <div class="book-info">
                            <div class="book-title">${Views._esc(v.title || '')}</div>
                            <div class="book-author">${Views._esc(authors)}${year ? ` · ${year}` : ''}</div>
                            <div style="font-size:11px;color:var(--text3);margin-top:2px">${v.pageCount ? v.pageCount + ' pages' : ''} ${Views._esc(v.publisher || '')}</div>
                        </div>
                        <span class="chevron">›</span>
                    </div>
                `;
            }).join('')}</div>`;

            resultsDiv.querySelectorAll('.search-result-row').forEach(row => {
                row.addEventListener('click', () => {
                    const gid = row.dataset.gid;
                    const item = data.items.find(i => i.id === gid);
                    if (item) this._showAddForm(item, resultsDiv, formDiv, sheet);
                });
            });
        } catch {
            resultsDiv.innerHTML = `<div style="text-align:center;padding:30px;color:var(--red)">
                <p>Search failed. Check your connection and try again.</p>
            </div>`;
        }
    },

    _showAddForm(item, resultsDiv, formDiv, sheet) {
        const v = item.volumeInfo || {};
        const authors = (v.authors || []).join(', ');
        const thumb = v.imageLinks?.thumbnail?.replace('http://', 'https://') || '';
        const isbn = (v.industryIdentifiers || []).find(i => i.type === 'ISBN_13')?.identifier || '';
        const subjects = (v.categories || []).join('; ');

        resultsDiv.style.display = 'none';
        sheet.querySelector('.search-bar').style.display = 'none';
        formDiv.style.display = 'block';

        const today = '';

        formDiv.innerHTML = `
            <div style="padding:16px;display:flex;gap:16px;align-items:start">
                <div class="book-cover-large ${thumb ? 'has-cover' : ''}" style="width:80px;height:120px;flex-shrink:0">
                    ${thumb ? `<img src="${thumb}" alt="Cover">` : '📖'}
                </div>
                <div style="flex:1;min-width:0">
                    <div style="font-size:18px;font-weight:700">${Views._esc(v.title || '')}</div>
                    ${v.subtitle ? `<div style="font-size:14px;color:var(--text2);margin-top:2px">${Views._esc(v.subtitle)}</div>` : ''}
                    <div style="font-size:14px;color:var(--text2);margin-top:4px">${Views._esc(authors)}</div>
                    <div style="font-size:12px;color:var(--text3);margin-top:4px">${v.pageCount ? v.pageCount + ' pages · ' : ''}${Views._esc(v.publisher || '')}</div>
                </div>
            </div>

            <div class="section-header">Reading Details</div>
            <div class="form-section">
                <div class="form-row">
                    <label class="form-label">Format</label>
                    <select class="form-select" id="add-format">
                        ${FORMATS.map(f => `<option value="${f}">${f}</option>`).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <label class="form-label">Status</label>
                    <select class="form-select" id="add-status">
                        ${STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <label class="form-label">Started</label>
                    <input class="form-input" id="add-started" type="date" value="${today}">
                </div>
                <div class="form-row">
                    <label class="form-label">Finished</label>
                    <input class="form-input" id="add-finished" type="date">
                </div>
            </div>

            <div style="padding:16px;display:flex;gap:12px">
                <button class="btn btn-secondary" id="add-back" style="flex:1">Back</button>
                <button class="btn btn-primary" id="add-save" style="flex:2">Add to Library</button>
            </div>
        `;

        formDiv.querySelector('#add-back').addEventListener('click', () => {
            formDiv.style.display = 'none';
            resultsDiv.style.display = 'block';
            sheet.querySelector('.search-bar').style.display = 'block';
        });

        formDiv.querySelector('#add-save').addEventListener('click', () => {
            const format = formDiv.querySelector('#add-format').value;
            const status = formDiv.querySelector('#add-status').value;
            const started = formDiv.querySelector('#add-started').value || null;
            const finished = formDiv.querySelector('#add-finished').value || null;

            const book = {
                id: crypto.randomUUID(),
                googleBooksID: item.id,
                isbn13: isbn,
                title: v.title || '',
                subtitle: v.subtitle || '',
                authors: authors,
                pageCount: v.pageCount || 0,
                publicationDate: v.publishedDate || '',
                publisher: v.publisher || '',
                description: v.description || '',
                subjects: subjects,
                languageCode: v.language || 'en',
                startedReading: started,
                paused: null,
                finishedReading: finished,
                didNotFinish: status === 'Did Not Finish',
                currentPage: 0,
                currentPercentage: 0,
                rating: null,
                notes: '',
                lists: '',
                format: format,
                status: status
            };

            Store.add(book);
            Covers.fetchAll([book]);
            this._closeModal();
        });
    },

    _renderImportModal(sheet) {
        Views.renderImport(sheet);
        let parsedBooks = [];

        sheet.querySelector('#import-cancel')?.addEventListener('click', () => this._closeModal());

        sheet.querySelector('#btn-choose-file')?.addEventListener('click', () => {
            sheet.querySelector('#csv-file')?.click();
        });

        sheet.querySelector('#csv-file')?.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                parsedBooks = CSVParser.parse(ev.target.result);
                if (parsedBooks.length === 0) {
                    alert('No books found in the CSV. Check the file format.');
                    return;
                }
                Views.showImportPreview(sheet, parsedBooks);
                sheet.querySelector('#btn-do-import')?.addEventListener('click', () => {
                    const count = Store.importBooks(parsedBooks);
                    Covers.fetchAll(parsedBooks);
                    Views.showImportResult(sheet, count);
                    sheet.querySelector('#import-done')?.addEventListener('click', () => this._closeModal());
                });
            };
            reader.readAsText(file);
        });
    }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());

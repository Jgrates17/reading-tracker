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
    },

    // ── Modal ──

    _openModal(type, book = null) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = '<div class="modal-sheet"></div>';
        document.body.appendChild(overlay);
        this.modalEl = overlay;

        const sheet = overlay.querySelector('.modal-sheet');

        // Close on overlay tap
        overlay.addEventListener('click', e => {
            if (e.target === overlay) this._closeModal();
        });

        if (type === 'import') {
            this._renderImportModal(sheet);
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

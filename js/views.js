// ── View Rendering ──

const Views = {
    // ── Book List ──
    renderBookList(container, { search = '', filter = null } = {}) {
        let books = Store.getAll();
        if (filter) books = books.filter(b => b.status === filter);
        if (search) {
            const q = search.toLowerCase();
            books = books.filter(b =>
                b.title.toLowerCase().includes(q) || b.authors.toLowerCase().includes(q)
            );
        }
        books.sort((a, b) => a.title.localeCompare(b.title));

        const current = Store.currentlyReading();

        container.innerHTML = `
            <div class="nav-bar">
                <span class="nav-title">My Books</span>
                <div style="display:flex;gap:4px">
                    <button class="nav-btn" id="btn-export" aria-label="Export CSV">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </button>
                    <button class="nav-btn" id="btn-import" aria-label="Import CSV">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button class="nav-btn" id="btn-add" aria-label="Add book">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                </div>
            </div>
            <div class="search-bar">
                <input type="search" id="search-input" placeholder="Search by title or author" value="${this._esc(search)}" autocomplete="off">
            </div>
            <div class="filter-bar" id="filter-bar">
                <button class="filter-chip ${!filter ? 'active' : ''}" data-filter="">All</button>
                ${STATUSES.map(s => `<button class="filter-chip ${filter === s ? 'active' : ''}" data-filter="${s}">${s}</button>`).join('')}
            </div>
            ${books.length === 0 && Store.getAll().length === 0 ? `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    <h2>No Books Yet</h2>
                    <p>Add a book or import your reading list to get started.</p>
                    <div class="btn-group">
                        <button class="btn btn-primary" id="empty-import">Import CSV</button>
                        <button class="btn btn-secondary" id="empty-add">Add Book</button>
                    </div>
                </div>
            ` : ''}
            ${books.length === 0 && Store.getAll().length > 0 ? `
                <div class="empty-state">
                    <h2>No matches</h2>
                    <p>Try a different search or filter.</p>
                </div>
            ` : ''}
            ${current.length > 0 && !filter && !search ? `
                <div class="section-header">Currently Reading</div>
                <div class="card-group">
                    ${current.map(b => this._bookRow(b)).join('')}
                </div>
            ` : ''}
            ${books.length > 0 ? `
                <div class="section-header">All Books (${books.length})</div>
                <div class="card-group">
                    ${books.map(b => this._bookRow(b)).join('')}
                </div>
            ` : ''}
        `;
    },

    _bookRow(book) {
        const icon = FORMAT_ICONS[book.format] || '📖';
        const cls = FORMAT_CLASS[book.format] || '';
        const statusCls = STATUS_CLASS[book.status] || 'want';
        const ratingHtml = book.rating != null ? `<span class="rating">★ ${book.rating.toFixed(1)}</span>` : '';
        const pagesHtml = book.pageCount > 0 ? `<span class="pages-label">${book.pageCount}p</span>` : '';

        const coverKey = book.googleBooksID || book.isbn13 || '';
        const coverUrl = Covers.getCoverUrl(book);
        const coverContent = coverUrl
            ? `<img src="${coverUrl}" alt="Cover" loading="lazy">`
            : icon;
        const coverClass = coverUrl ? 'book-icon has-cover' : `book-icon ${cls}`;

        return `
            <div class="book-row" data-id="${book.id}" role="button" tabindex="0" aria-label="${this._esc(book.title)} by ${this._esc(book.authors)}">
                <div class="${coverClass}" data-cover-key="${this._esc(coverKey)}">${coverContent}</div>
                <div class="book-info">
                    <div class="book-title">${this._esc(book.title)}</div>
                    <div class="book-author">${this._esc(book.authors)}</div>
                    <div class="book-meta">
                        <span class="badge ${statusCls}">${book.status}</span>
                        ${pagesHtml}${ratingHtml}
                    </div>
                </div>
                <span class="chevron">›</span>
            </div>
        `;
    },

    // ── Book Detail ──
    renderBookDetail(container, book) {
        const progress = book.currentPercentage > 0 ? book.currentPercentage / 100
            : (book.pageCount > 0 && book.currentPage > 0) ? book.currentPage / book.pageCount
            : (book.status === 'Finished' ? 1 : 0);
        const pct = Math.round(progress * 100);
        const statusCls = STATUS_CLASS[book.status] || 'want';

        const startedFmt = book.startedReading ? new Date(book.startedReading).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
        const finishedFmt = book.finishedReading ? new Date(book.finishedReading).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

        container.innerHTML = `
            <div class="nav-bar">
                <button class="nav-btn" id="btn-back">‹ Books</button>
                <button class="nav-btn" id="btn-edit">Edit</button>
            </div>
            <div class="detail-header">
                <div style="display:flex;gap:16px;align-items:start;margin-bottom:12px">
                    ${this._detailCover(book)}
                    <div style="flex:1;min-width:0;padding-top:4px">
                        <div class="detail-title">${this._esc(book.title)}</div>
                        ${book.subtitle ? `<div class="detail-subtitle">${this._esc(book.subtitle)}</div>` : ''}
                        <div class="detail-author">${this._esc(book.authors)}</div>
                        <div style="margin-top:8px"><span class="badge ${statusCls}" style="font-size:13px;padding:4px 12px">${book.status}</span></div>
                    </div>
                </div>
            </div>

            ${book.status === 'Reading' || book.status === 'Started' ? `
                <div class="progress-section">
                    <div style="font-size:15px;font-weight:600">Progress</div>
                    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
                    <div class="progress-labels">
                        <span>${book.currentPage > 0 ? `Page ${book.currentPage} of ${book.pageCount}` : ''}</span>
                        <span>${pct}%</span>
                    </div>
                </div>
            ` : ''}

            <div class="detail-grid">
                <div class="detail-card">
                    <div class="detail-card-icon">${FORMAT_ICONS[book.format] || '📖'}</div>
                    <div class="detail-card-label">Format</div>
                    <div class="detail-card-value">${book.format}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-card-icon">📄</div>
                    <div class="detail-card-label">Pages</div>
                    <div class="detail-card-value">${book.pageCount || '—'}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-card-icon">🏢</div>
                    <div class="detail-card-label">Publisher</div>
                    <div class="detail-card-value">${this._esc(book.publisher) || '—'}</div>
                </div>
                ${book.rating != null ? `
                    <div class="detail-card">
                        <div class="detail-card-icon">⭐</div>
                        <div class="detail-card-label">Rating</div>
                        <div class="detail-card-value">${book.rating.toFixed(1)} / 5</div>
                    </div>
                ` : ''}
                ${startedFmt ? `
                    <div class="detail-card">
                        <div class="detail-card-icon">▶️</div>
                        <div class="detail-card-label">Started</div>
                        <div class="detail-card-value">${startedFmt}</div>
                    </div>
                ` : ''}
                ${finishedFmt ? `
                    <div class="detail-card">
                        <div class="detail-card-icon">✅</div>
                        <div class="detail-card-label">Finished</div>
                        <div class="detail-card-value">${finishedFmt}</div>
                    </div>
                ` : ''}
            </div>

            ${book.description ? `
                <div class="detail-section">
                    <h3>Description</h3>
                    <p>${this._esc(book.description)}</p>
                </div>
            ` : ''}

            ${book.notes ? `
                <div class="detail-section">
                    <h3>Notes</h3>
                    <p style="white-space:pre-wrap">${this._esc(book.notes)}</p>
                </div>
            ` : ''}

            ${book.subjects ? `
                <div class="detail-section">
                    <h3>Subjects</h3>
                    <div class="tag-list">
                        ${book.subjects.split('; ').map(s => `<span class="tag">${this._esc(s)}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    },

    // ── Add / Edit Form ──
    renderBookForm(container, book = null) {
        const isEdit = !!book;
        const b = book || {
            title: '', subtitle: '', authors: '', isbn13: '', publisher: '',
            pageCount: '', description: '', notes: '', format: 'Physical',
            status: 'Want to Read', currentPage: '', rating: null,
            startedReading: '', finishedReading: ''
        };

        container.innerHTML = `
            <div class="modal-handle"></div>
            <div class="nav-bar">
                <button class="nav-btn" id="form-cancel">Cancel</button>
                <span class="nav-title">${isEdit ? 'Edit Book' : 'Add Book'}</span>
                <button class="nav-btn" id="form-save" style="font-weight:600">Save</button>
            </div>

            <div class="section-header">Book Info</div>
            <div class="form-section">
                <div class="form-row"><label class="form-label">Title</label><input class="form-input" id="f-title" value="${this._esc(b.title)}" placeholder="Book title" required></div>
                <div class="form-row"><label class="form-label">Subtitle</label><input class="form-input" id="f-subtitle" value="${this._esc(b.subtitle)}"></div>
                <div class="form-row"><label class="form-label">Author(s)</label><input class="form-input" id="f-authors" value="${this._esc(b.authors)}" placeholder="Author name" required></div>
                <div class="form-row"><label class="form-label">ISBN-13</label><input class="form-input" id="f-isbn" value="${this._esc(b.isbn13)}" inputmode="numeric"></div>
                <div class="form-row"><label class="form-label">Publisher</label><input class="form-input" id="f-publisher" value="${this._esc(b.publisher)}"></div>
                <div class="form-row"><label class="form-label">Pages</label><input class="form-input" id="f-pages" value="${b.pageCount || ''}" inputmode="numeric"></div>
            </div>

            <div class="section-header">Reading Details</div>
            <div class="form-section">
                <div class="form-row">
                    <label class="form-label">Format</label>
                    <select class="form-select" id="f-format">
                        ${FORMATS.map(f => `<option value="${f}" ${b.format === f ? 'selected' : ''}>${f}</option>`).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <label class="form-label">Status</label>
                    <select class="form-select" id="f-status">
                        ${STATUSES.map(s => `<option value="${s}" ${b.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-row"><label class="form-label">Current Page</label><input class="form-input" id="f-curpage" value="${b.currentPage || ''}" inputmode="numeric"></div>
                <div class="form-row"><label class="form-label">Started</label><input class="form-input" id="f-started" type="date" value="${b.startedReading || ''}"></div>
                <div class="form-row"><label class="form-label">Finished</label><input class="form-input" id="f-finished" type="date" value="${b.finishedReading || ''}"></div>
                <div class="form-row">
                    <label class="form-label">Rating</label>
                    <input class="form-input" id="f-rating" type="number" min="0" max="5" step="0.5" value="${b.rating != null ? b.rating : ''}" placeholder="0-5">
                </div>
            </div>

            <div class="section-header">Description</div>
            <div class="form-section">
                <textarea class="form-textarea" id="f-desc" rows="3" placeholder="Book description">${this._esc(b.description || '')}</textarea>
            </div>

            <div class="section-header">Notes</div>
            <div class="form-section">
                <textarea class="form-textarea" id="f-notes" rows="3" placeholder="Your notes">${this._esc(b.notes || '')}</textarea>
            </div>

            ${isEdit ? `
                <div style="padding:16px">
                    <button class="btn btn-danger btn-full" id="form-delete">Delete Book</button>
                </div>
            ` : ''}
            <div style="height:40px"></div>
        `;
    },

    getFormData(existingBook = null) {
        const val = id => document.getElementById(id)?.value?.trim() || '';
        const ratingVal = val('f-rating');
        return {
            id: existingBook?.id || crypto.randomUUID(),
            googleBooksID: existingBook?.googleBooksID || '',
            isbn13: val('f-isbn'),
            title: val('f-title'),
            subtitle: val('f-subtitle'),
            authors: val('f-authors'),
            pageCount: parseInt(val('f-pages')) || 0,
            publicationDate: existingBook?.publicationDate || '',
            publisher: val('f-publisher'),
            description: val('f-desc'),
            subjects: existingBook?.subjects || '',
            languageCode: existingBook?.languageCode || 'en',
            startedReading: val('f-started') || null,
            paused: existingBook?.paused || null,
            finishedReading: val('f-finished') || null,
            didNotFinish: val('f-status') === 'Did Not Finish',
            currentPage: parseInt(val('f-curpage')) || 0,
            currentPercentage: existingBook?.currentPercentage || 0,
            rating: ratingVal ? parseFloat(ratingVal) : null,
            notes: val('f-notes'),
            lists: existingBook?.lists || '',
            format: val('f-format'),
            status: val('f-status')
        };
    },

    // ── Import View ──
    renderImport(container) {
        container.innerHTML = `
            <div class="modal-handle"></div>
            <div class="nav-bar">
                <button class="nav-btn" id="import-cancel">Cancel</button>
                <span class="nav-title">Import</span>
                <span></span>
            </div>
            <div class="import-area" id="import-area">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <h2>Import Reading List</h2>
                <p>Select a CSV file exported from your reading list app.</p>
                <input type="file" id="csv-file" accept=".csv,text/csv,text/plain" style="display:none">
                <button class="btn btn-primary" id="btn-choose-file" style="margin-top:8px">Choose CSV File</button>
            </div>
            <div id="import-preview" style="display:none"></div>
            <div id="import-result" style="display:none"></div>
        `;
    },

    showImportPreview(container, books) {
        const area = container.querySelector('#import-area');
        const preview = container.querySelector('#import-preview');
        area.style.display = 'none';
        preview.style.display = 'block';
        preview.innerHTML = `
            <div style="padding:16px">
                <div style="font-size:17px;font-weight:600;margin-bottom:12px">Found ${books.length} books</div>
            </div>
            <div class="import-preview">
                ${books.slice(0, 20).map(b => `
                    <div class="book-row" style="cursor:default">
                        <div class="book-icon ${FORMAT_CLASS[b.format] || ''}">${FORMAT_ICONS[b.format] || '📖'}</div>
                        <div class="book-info">
                            <div class="book-title">${this._esc(b.title)}</div>
                            <div class="book-author">${this._esc(b.authors)}</div>
                        </div>
                    </div>
                `).join('')}
                ${books.length > 20 ? `<div style="padding:12px 16px;color:var(--text2);font-size:13px">...and ${books.length - 20} more</div>` : ''}
            </div>
            <div style="padding:16px">
                <button class="btn btn-primary btn-full" id="btn-do-import">Import ${books.length} Books</button>
            </div>
        `;
    },

    showImportResult(container, count) {
        const preview = container.querySelector('#import-preview');
        const result = container.querySelector('#import-result');
        if (preview) preview.style.display = 'none';
        result.style.display = 'block';
        result.innerHTML = `
            <div class="empty-state">
                <div style="font-size:48px;margin-bottom:12px">✅</div>
                <h2>Imported ${count} books!</h2>
                <button class="btn btn-primary" id="import-done" style="margin-top:16px">Done</button>
            </div>
        `;
    },

    _detailCover(book) {
        const coverKey = book.googleBooksID || book.isbn13 || '';
        const coverUrl = Covers.getCoverUrl(book);
        const icon = FORMAT_ICONS[book.format] || '📖';
        if (coverUrl) {
            return `<div class="book-cover-large has-cover" data-cover-key="${this._esc(coverKey)}"><img src="${coverUrl}" alt="Cover of ${this._esc(book.title)}" loading="lazy"></div>`;
        }
        return `<div class="book-cover-large" data-cover-key="${this._esc(coverKey)}">${icon}</div>`;
    },

    _esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
};

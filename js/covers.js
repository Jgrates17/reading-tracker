// ── Book Cover Service ──
// Uses Google Books API to fetch cover images via googleBooksID or ISBN.
// Caches URLs in localStorage to avoid repeated API calls.

const Covers = {
    _cache: {},
    _CACHE_KEY: 'reading-tracker-covers',
    _pending: new Map(),

    init() {
        try {
            const raw = localStorage.getItem(this._CACHE_KEY);
            this._cache = raw ? JSON.parse(raw) : {};
        } catch {
            this._cache = {};
        }
    },

    _saveCache() {
        localStorage.setItem(this._CACHE_KEY, JSON.stringify(this._cache));
    },

    // Returns cached URL immediately, or null. Kicks off fetch in background.
    getCoverUrl(book) {
        const key = book.googleBooksID || book.isbn13 || '';
        if (!key) return null;
        if (this._cache[key]) return this._cache[key] === 'none' ? null : this._cache[key];

        // Trigger background fetch if not already pending
        if (!this._pending.has(key)) {
            this._pending.set(key, true);
            this._fetchCover(book, key);
        }
        return null;
    },

    async _fetchCover(book, key) {
        try {
            let url = null;

            // Try Google Books ID first (direct and fast)
            if (book.googleBooksID) {
                const resp = await fetch(`https://www.googleapis.com/books/v1/volumes/${book.googleBooksID}`);
                if (resp.ok) {
                    const data = await resp.json();
                    url = data.volumeInfo?.imageLinks?.thumbnail
                       || data.volumeInfo?.imageLinks?.smallThumbnail
                       || null;
                }
            }

            // Fallback: search by ISBN
            if (!url && book.isbn13) {
                const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${book.isbn13}&maxResults=1`);
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.items?.length) {
                        url = data.items[0].volumeInfo?.imageLinks?.thumbnail
                           || data.items[0].volumeInfo?.imageLinks?.smallThumbnail
                           || null;
                    }
                }
            }

            // Upgrade to https and get a better size
            if (url) {
                url = url.replace('http://', 'https://');
                // Request a larger zoom for better quality
                url = url.replace('zoom=1', 'zoom=2');
            }

            this._cache[key] = url || 'none';
            this._saveCache();
            this._pending.delete(key);

            // Notify app to re-render with the new cover
            if (url) {
                this._updateCoverImages(key, url);
            }
        } catch {
            this._cache[key] = 'none';
            this._saveCache();
            this._pending.delete(key);
        }
    },

    // Directly update any visible cover images without a full re-render
    _updateCoverImages(key, url) {
        document.querySelectorAll(`[data-cover-key="${key}"]`).forEach(el => {
            el.innerHTML = `<img src="${url}" alt="Book cover" loading="lazy">`;
            el.classList.add('has-cover');
        });
    },

    // Fetch covers for a batch of books (used after import)
    fetchAll(books) {
        books.forEach(b => this.getCoverUrl(b));
    }
};

Covers.init();

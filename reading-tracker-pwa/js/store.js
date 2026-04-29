// ── Data Store (localStorage) ──

const STORAGE_KEY = 'reading-tracker-books';

const FORMATS = ['Physical', 'E-Book', 'Audio', 'Kindle', 'Library E-Book'];
const STATUSES = ['Want to Read', 'Started', 'Reading', 'Paused', 'Finished', 'Did Not Finish'];

const FORMAT_ICONS = {
    'Physical': '📖', 'E-Book': '📱', 'Audio': '🎧', 'Kindle': '📲', 'Library E-Book': '🏛️'
};
const FORMAT_CLASS = {
    'Physical': '', 'E-Book': 'ebook', 'Audio': 'audio', 'Kindle': 'kindle', 'Library E-Book': 'library'
};
const STATUS_CLASS = {
    'Want to Read': 'want', 'Started': 'started', 'Reading': 'reading',
    'Paused': 'paused', 'Finished': 'finished', 'Did Not Finish': 'dnf'
};

const Store = {
    _books: [],
    _listeners: [],

    init() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            this._books = raw ? JSON.parse(raw) : [];
        } catch {
            this._books = [];
        }
    },

    _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._books));
        this._listeners.forEach(fn => fn());
    },

    onChange(fn) { this._listeners.push(fn); },

    getAll() { return this._books; },

    getById(id) { return this._books.find(b => b.id === id); },

    add(book) {
        if (!book.id) book.id = crypto.randomUUID();
        this._books.push(book);
        this._save();
    },

    update(book) {
        const i = this._books.findIndex(b => b.id === book.id);
        if (i >= 0) { this._books[i] = book; this._save(); }
    },

    delete(id) {
        this._books = this._books.filter(b => b.id !== id);
        this._save();
    },

    importBooks(books) {
        const existing = new Set(this._books.map(b => b.id));
        const unique = books.filter(b => !existing.has(b.id));
        this._books.push(...unique);
        this._save();
        return unique.length;
    },

    // ── Stats helpers ──

    finished(startDate, endDate) {
        return this._books.filter(b => {
            if (!b.finishedReading) return false;
            const d = new Date(b.finishedReading);
            return d >= startDate && d <= endDate;
        });
    },

    finishedThisMonth() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return this.finished(start, end);
    },

    finishedThisQuarter() {
        const now = new Date();
        const qStart = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), qStart, 1);
        const end = new Date(now.getFullYear(), qStart + 3, 0, 23, 59, 59);
        return this.finished(start, end);
    },

    finishedThisYear() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        return this.finished(start, end);
    },

    totalPages(books) {
        return books.reduce((sum, b) => sum + (b.pageCount || 0), 0);
    },

    avgRating(books) {
        const rated = books.filter(b => b.rating != null);
        if (!rated.length) return null;
        return rated.reduce((s, b) => s + b.rating, 0) / rated.length;
    },

    currentlyReading() {
        return this._books.filter(b => b.status === 'Reading' || b.status === 'Started');
    }
};

Store.init();

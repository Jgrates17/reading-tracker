// ── CSV Parser & Exporter ──

const CSV_HEADERS = [
    'Reading List ID','Google Books ID','Apple Books ID','Open Library Edition ID',
    'ISBN-13','Title','Subtitle','Authors','Page Count','Publication Date',
    'Publisher','Description','Subjects','Language Code','Started Reading',
    'Paused','Finished Reading','Did Not Finish','Current Page',
    'Current Percentage','Rating','Notes','Lists'
];

const CSVParser = {
    parse(content) {
        const rows = this._parseRows(content);
        if (rows.length < 2) return [];

        const header = rows[0];
        const colMap = {};
        header.forEach((h, i) => colMap[h.trim()] = i);

        const books = [];
        for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            if (row.length < 5) continue;

            const col = name => {
                const i = colMap[name];
                return (i != null && i < row.length) ? row[i].trim() : '';
            };

            const listsStr = col('Lists');
            const startedStr = col('Started Reading');
            const pausedStr = col('Paused');
            const finishedStr = col('Finished Reading');
            const dnfStr = col('Did Not Finish');
            const currentPageStr = col('Current Page');

            books.push({
                id: col('Reading List ID') || crypto.randomUUID(),
                googleBooksID: col('Google Books ID'),
                isbn13: col('ISBN-13'),
                title: col('Title'),
                subtitle: col('Subtitle'),
                authors: col('Authors'),
                pageCount: parseInt(col('Page Count')) || 0,
                publicationDate: col('Publication Date'),
                publisher: col('Publisher'),
                description: col('Description'),
                subjects: col('Subjects'),
                languageCode: col('Language Code'),
                startedReading: startedStr || null,
                paused: pausedStr || null,
                finishedReading: finishedStr || null,
                didNotFinish: !!dnfStr,
                currentPage: parseInt(currentPageStr) || 0,
                currentPercentage: parseInt(col('Current Percentage')) || 0,
                rating: col('Rating') ? parseFloat(col('Rating')) : null,
                notes: col('Notes'),
                lists: listsStr,
                format: this._detectFormat(listsStr),
                status: this._detectStatus(startedStr, pausedStr, finishedStr, dnfStr, currentPageStr)
            });
        }
        return books;
    },

    _detectFormat(lists) {
        const l = lists.toLowerCase();
        if (l.includes('audio')) return 'Audio';
        if (l.includes('kindle')) return 'Kindle';
        if (l.includes('library e-book') || l.includes('e-book')) return 'Library E-Book';
        if (l.includes('ebook')) return 'E-Book';
        return 'Physical';
    },

    _detectStatus(started, paused, finished, dnf, currentPage) {
        if (finished) return 'Finished';
        if (dnf) return 'Did Not Finish';
        if (paused) return 'Paused';
        if (currentPage && started) return 'Reading';
        if (started) return 'Started';
        return 'Want to Read';
    },

    _parseRows(text) {
        const rows = [];
        let field = '';
        let row = [];
        let inQuotes = false;
        const chars = text;

        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            if (inQuotes) {
                if (c === '"') {
                    if (i + 1 < chars.length && chars[i + 1] === '"') {
                        field += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += c;
                }
            } else {
                if (c === '"') {
                    inQuotes = true;
                } else if (c === ',') {
                    row.push(field);
                    field = '';
                } else if (c === '\r' || c === '\n') {
                    if (c === '\r' && i + 1 < chars.length && chars[i + 1] === '\n') i++;
                    row.push(field);
                    field = '';
                    if (row.some(f => f !== '')) rows.push(row);
                    row = [];
                } else {
                    field += c;
                }
            }
        }
        row.push(field);
        if (row.some(f => f !== '')) rows.push(row);
        return rows;
    },

    // ── Export ──

    export(books) {
        const rows = [CSV_HEADERS.join(',')];
        for (const b of books) {
            const fields = [
                b.id || '',
                b.googleBooksID || '',
                '', // Apple Books ID
                '', // Open Library Edition ID
                b.isbn13 || '',
                b.title || '',
                b.subtitle || '',
                b.authors || '',
                b.pageCount || '',
                b.publicationDate || '',
                b.publisher || '',
                b.description || '',
                b.subjects || '',
                b.languageCode || '',
                b.startedReading || '',
                b.paused || '',
                b.finishedReading || '',
                b.didNotFinish ? 'true' : '',
                b.currentPage || '',
                b.currentPercentage || '',
                b.rating != null ? b.rating : '',
                b.notes || '',
                b.lists || ''
            ];
            rows.push(fields.map(f => this._csvField(String(f))).join(','));
        }
        return rows.join('\r\n');
    },

    _csvField(val) {
        if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
            return '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
    },

    downloadExport(books) {
        const csv = this.export(books);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 16).replace('T', ' ').replace(':', '-');
        const filename = `Reading List_${dateStr}.csv`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

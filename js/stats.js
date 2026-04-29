// ── Statistics View ──

const StatsView = {
    _selectedYear: new Date().getFullYear(),

    render(container, period = 'year') {
        const years = this._getAvailableYears();
        if (!years.includes(this._selectedYear)) {
            this._selectedYear = years.length ? years[0] : new Date().getFullYear();
        }

        const periodBooks = this._getBooksForPeriod(period);
        const allFinished = Store.getAll().filter(b => b.status === 'Finished');
        const avgR = Store.avgRating(periodBooks);
        const allAvgR = Store.avgRating(allFinished);

        container.innerHTML = `
            <div class="nav-bar">
                <span class="nav-title">Statistics</span>
            </div>

            ${years.length > 1 ? `
                <div class="filter-bar" id="year-bar" style="padding-top:12px">
                    ${years.map(y => `<button class="filter-chip ${y === this._selectedYear ? 'active' : ''}" data-year="${y}">${y}</button>`).join('')}
                </div>
            ` : ''}

            <div class="stat-picker">
                <button data-period="month" class="${period === 'month' ? 'active' : ''}">Month</button>
                <button data-period="quarter" class="${period === 'quarter' ? 'active' : ''}">Quarter</button>
                <button data-period="year" class="${period === 'year' ? 'active' : ''}">Year</button>
            </div>

            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-card-icon">✅</div>
                    <div class="stat-card-value">${periodBooks.length}</div>
                    <div class="stat-card-label">Books Finished</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon">📄</div>
                    <div class="stat-card-value">${Store.totalPages(periodBooks).toLocaleString()}</div>
                    <div class="stat-card-label">Pages Read</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon">⭐</div>
                    <div class="stat-card-value">${avgR != null ? avgR.toFixed(1) : '—'}</div>
                    <div class="stat-card-label">Avg Rating</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon">📖</div>
                    <div class="stat-card-value">${Store.currentlyReading().length}</div>
                    <div class="stat-card-label">Currently Reading</div>
                </div>
            </div>

            ${periodBooks.length > 0 ? `
                <div class="chart-container">
                    <h3>By Format</h3>
                    <div class="donut-chart">
                        <canvas id="format-chart" width="120" height="120"></canvas>
                        <div class="donut-legend" id="format-legend"></div>
                    </div>
                </div>

                ${period === 'year' ? `
                    <div class="chart-container">
                        <h3>Monthly Trend — ${this._selectedYear}</h3>
                        <div class="bar-chart" id="monthly-chart"></div>
                    </div>
                ` : ''}

                <div class="chart-container">
                    <h3>Finished Books</h3>
                    ${periodBooks
                        .sort((a, b) => new Date(b.finishedReading) - new Date(a.finishedReading))
                        .map(b => `
                            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid var(--separator)">
                                <span>${FORMAT_ICONS[b.format] || '📖'}</span>
                                <div style="flex:1;min-width:0">
                                    <div style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Views._esc(b.title)}</div>
                                    <div style="font-size:12px;color:var(--text2)">${Views._esc(b.authors)}</div>
                                </div>
                                ${b.finishedReading ? `<span style="font-size:11px;color:var(--text3)">${new Date(b.finishedReading).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>` : ''}
                                ${b.rating != null ? `<span class="rating">★ ${b.rating.toFixed(1)}</span>` : ''}
                            </div>
                        `).join('')}
                </div>
            ` : `
                <div class="empty-state" style="padding-top:40px">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>
                    <h2>No Finished Books</h2>
                    <p>No books finished for this ${period} in ${this._selectedYear}.</p>
                </div>
            `}

            <div class="chart-container" style="margin-top:8px">
                <h3>All Time</h3>
                <div class="stat-grid" style="padding:8px 0 0">
                    <div class="stat-card">
                        <div class="stat-card-icon">📚</div>
                        <div class="stat-card-value">${Store.getAll().length}</div>
                        <div class="stat-card-label">Total Books</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon">✅</div>
                        <div class="stat-card-value">${allFinished.length}</div>
                        <div class="stat-card-label">Finished</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon">📄</div>
                        <div class="stat-card-value">${Store.totalPages(allFinished).toLocaleString()}</div>
                        <div class="stat-card-label">Pages</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon">⭐</div>
                        <div class="stat-card-value">${allAvgR != null ? allAvgR.toFixed(1) : '—'}</div>
                        <div class="stat-card-label">Avg Rating</div>
                    </div>
                </div>
            </div>

            ${years.length > 1 ? `
                <div class="chart-container" style="margin-top:8px">
                    <h3>Year-over-Year</h3>
                    <div class="bar-chart" id="yearly-chart"></div>
                </div>
                <div class="chart-container" style="margin-top:8px">
                    <h3>Format by Year</h3>
                    <div class="bar-chart stacked-chart" id="yearly-format-chart"></div>
                    <div class="donut-legend" id="yearly-format-legend" style="margin-top:10px"></div>
                </div>
            ` : ''}
            <div style="height:20px"></div>
        `;

        requestAnimationFrame(() => {
            if (periodBooks.length > 0) {
                this._drawDonut(periodBooks);
                if (period === 'year') this._drawMonthlyBars();
            }
            if (years.length > 1) {
                this._drawYearlyBars(years);
                this._drawYearlyFormatBars(years);
            }
        });
    },

    _getAvailableYears() {
        const years = new Set();
        Store.getAll().forEach(b => {
            if (b.finishedReading) years.add(new Date(b.finishedReading).getFullYear());
            if (b.startedReading) years.add(new Date(b.startedReading).getFullYear());
        });
        years.add(new Date().getFullYear());
        return [...years].sort((a, b) => b - a);
    },

    _getBooksForPeriod(period) {
        const y = this._selectedYear;
        const now = new Date();
        const isCurrentYear = y === now.getFullYear();
        if (period === 'year') {
            return Store.finished(new Date(y, 0, 1), new Date(y, 11, 31, 23, 59, 59));
        }
        if (period === 'quarter') {
            const qMonth = isCurrentYear ? Math.floor(now.getMonth() / 3) * 3 : 9;
            return Store.finished(new Date(y, qMonth, 1), new Date(y, qMonth + 3, 0, 23, 59, 59));
        }
        if (period === 'month') {
            const m = isCurrentYear ? now.getMonth() : 11;
            return Store.finished(new Date(y, m, 1), new Date(y, m + 1, 0, 23, 59, 59));
        }
        return [];
    },

    _drawDonut(books) {
        const canvas = document.getElementById('format-chart');
        const legend = document.getElementById('format-legend');
        if (!canvas || !legend) return;
        const ctx = canvas.getContext('2d');
        const grouped = {};
        books.forEach(b => { grouped[b.format] = (grouped[b.format] || 0) + 1; });
        const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
        const total = books.length;
        const colors = ['#007aff', '#34c759', '#ff9500', '#af52de', '#ff3b30', '#5856d6'];
        const cx = 60, cy = 60, r = 50, inner = 30;
        let startAngle = -Math.PI / 2;
        entries.forEach(([fmt, count], i) => {
            const slice = (count / total) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, startAngle + slice);
            ctx.arc(cx, cy, inner, startAngle + slice, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();
            startAngle += slice;
        });
        legend.innerHTML = entries.map(([fmt, count], i) => `
            <div class="legend-item">
                <span class="legend-dot" style="background:${colors[i % colors.length]}"></span>
                ${fmt}: ${count}
            </div>
        `).join('');
    },

    _drawMonthlyBars() {
        const container = document.getElementById('monthly-chart');
        if (!container) return;
        const y = this._selectedYear;
        const yearBooks = Store.finished(new Date(y, 0, 1), new Date(y, 11, 31, 23, 59, 59));
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const counts = months.map((_, i) =>
            yearBooks.filter(b => b.finishedReading && new Date(b.finishedReading).getMonth() === i).length
        );
        const max = Math.max(...counts, 1);
        container.innerHTML = months.map((m, i) => `
            <div class="bar-col">
                ${counts[i] > 0 ? `<span class="bar-value">${counts[i]}</span>` : ''}
                <div class="bar" style="height:${(counts[i] / max) * 100}%"></div>
                <span class="bar-label">${m}</span>
            </div>
        `).join('');
    },

    _drawYearlyBars(years) {
        const container = document.getElementById('yearly-chart');
        if (!container) return;
        const sorted = [...years].sort((a, b) => a - b);
        const counts = sorted.map(y => Store.finished(new Date(y, 0, 1), new Date(y, 11, 31, 23, 59, 59)).length);
        const max = Math.max(...counts, 1);
        container.innerHTML = sorted.map((y, i) => `
            <div class="bar-col">
                ${counts[i] > 0 ? `<span class="bar-value">${counts[i]}</span>` : ''}
                <div class="bar ${y === this._selectedYear ? '' : 'bar-muted'}" style="height:${(counts[i] / max) * 100}%"></div>
                <span class="bar-label">${y}</span>
            </div>
        `).join('');
    },

    _drawYearlyFormatBars(years) {
        const container = document.getElementById('yearly-format-chart');
        const legend = document.getElementById('yearly-format-legend');
        if (!container || !legend) return;

        const FORMAT_COLORS = {
            'Physical': '#007aff', 'E-Book': '#ff9500', 'Audio': '#af52de',
            'Kindle': '#ff3b30', 'Library E-Book': '#34c759'
        };

        const sorted = [...years].sort((a, b) => a - b);
        const yearData = sorted.map(y => {
            const books = Store.finished(new Date(y, 0, 1), new Date(y, 11, 31, 23, 59, 59));
            const counts = {};
            books.forEach(b => { counts[b.format] = (counts[b.format] || 0) + 1; });
            return { year: y, counts, total: books.length };
        });

        const allFormats = [...new Set(yearData.flatMap(d => Object.keys(d.counts)))];
        const max = Math.max(...yearData.flatMap(d => Object.values(d.counts)), 1);

        // Build a table-style layout: rows = formats, columns = years
        let html = '<div class="format-year-table">';

        // Header row with years
        html += '<div class="fy-row fy-header"><div class="fy-label"></div>';
        sorted.forEach(y => { html += `<div class="fy-cell">${y}</div>`; });
        html += '</div>';

        // One row per format
        allFormats.forEach(fmt => {
            const color = FORMAT_COLORS[fmt] || '#8e8e93';
            html += `<div class="fy-row"><div class="fy-label"><span class="legend-dot" style="background:${color}"></span>${fmt}</div>`;
            sorted.forEach(y => {
                const d = yearData.find(d => d.year === y);
                const count = d?.counts[fmt] || 0;
                const pct = (count / max) * 100;
                html += `<div class="fy-cell">
                    <div class="fy-bar-wrap">
                        <div class="fy-bar" style="width:${pct}%;background:${color}"></div>
                    </div>
                    <span class="fy-count">${count || ''}</span>
                </div>`;
            });
            html += '</div>';
        });

        // Totals row
        html += `<div class="fy-row fy-totals"><div class="fy-label" style="font-weight:700">Total</div>`;
        sorted.forEach(y => {
            const d = yearData.find(d => d.year === y);
            html += `<div class="fy-cell"><span class="fy-count" style="font-weight:700;width:100%;text-align:center">${d?.total || 0}</span></div>`;
        });
        html += '</div>';

        html += '</div>';
        container.innerHTML = html;
        legend.innerHTML = '';
    }
};

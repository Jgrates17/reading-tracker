// ── Statistics View ──

const StatsView = {
    render(container, period = 'year') {
        const periodBooks = period === 'month' ? Store.finishedThisMonth()
            : period === 'quarter' ? Store.finishedThisQuarter()
            : Store.finishedThisYear();

        const allFinished = Store.getAll().filter(b => b.status === 'Finished');
        const avgR = Store.avgRating(periodBooks);
        const allAvgR = Store.avgRating(allFinished);

        container.innerHTML = `
            <div class="nav-bar">
                <span class="nav-title">Statistics</span>
            </div>

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
                        <h3>Monthly Trend</h3>
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
                    <p>Finish some books this ${period} to see stats here.</p>
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
            <div style="height:20px"></div>
        `;

        // Draw charts after DOM is ready
        requestAnimationFrame(() => {
            if (periodBooks.length > 0) {
                this._drawDonut(periodBooks);
                if (period === 'year') this._drawMonthlyBars();
            }
        });
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

        const yearBooks = Store.finishedThisYear();
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
    }
};

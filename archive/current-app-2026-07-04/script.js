// ═══════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════

let state = {
    papers: [], // { id, name, sections: [{ id, name, questions: [{ id, text, options: [{ id, text, isCorrect }], images: { q: null, opts: [null,null,null,null] } }] }] }
    activePaperId: null,
    activeSectionId: null,
    optionLayout: 'row', // 'row' | 'column' | 'grid2'
    reuseTargetSectionId: null,
    reuseSelected: [],
};

const STORAGE_KEY = 'mcq_builder_data';
const LAYOUT_KEY = 'mcq_builder_layout';
const EDITOR_TYPES = ['plain', 'markdown', 'crepe'];
const DEFAULT_EDITOR_TYPE = 'plain';
const DOCX_NS = {
    w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
    pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    m: 'http://schemas.openxmlformats.org/officeDocument/2006/math',
};
let crepeModulePromise = null;
let activeCrepeInstances = [];

// ─── Load from localStorage ───
function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            state.papers = JSON.parse(saved);
        } catch (e) { state.papers = []; }
    }
    const layout = localStorage.getItem(LAYOUT_KEY);
    if (layout && ['row', 'column', 'grid2'].includes(layout)) {
        state.optionLayout = layout;
    }
    if (state.papers.length === 0) {
        // seed with a sample paper
        state.papers = [createSamplePaper()];
    }
    if (state.papers.length > 0 && !state.activePaperId) {
        state.activePaperId = state.papers[0].id;
    }
    // ensure active section
    const activePaper = state.papers.find(p => p.id === state.activePaperId);
    if (activePaper && activePaper.sections.length > 0 && !state.activeSectionId) {
        state.activeSectionId = activePaper.sections[0].id;
    }
    normalizeState();
}

function saveState() {
    normalizeState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.papers));
    localStorage.setItem(LAYOUT_KEY, state.optionLayout);
}

function normalizeState() {
    state.papers.forEach(p => {
        p.sections.forEach(s => {
            s.questions.forEach(q => {
                if (!q.images) q.images = { q: null, opts: [null, null, null, null] };
                if (!q.images.opts) q.images.opts = [null, null, null, null];
                while (q.images.opts.length < 4) q.images.opts.push(null);
                if (!q.options) q.options = [];
                if (!q.optionLayout || !['row', 'column', 'grid2'].includes(q.optionLayout)) {
                    q.optionLayout = state.optionLayout || 'row';
                }
                if (!q.editorType || !EDITOR_TYPES.includes(q.editorType)) {
                    q.editorType = DEFAULT_EDITOR_TYPE;
                }
                q.options.forEach((o, i) => {
                    if (!o.id) o.id = 'opt_' + Date.now() + '_' + i;
                    if (!o.editorType || !EDITOR_TYPES.includes(o.editorType)) {
                        o.editorType = DEFAULT_EDITOR_TYPE;
                    }
                });
            });
        });
    });
}

// ─── Sample Paper ───
function createSamplePaper() {
    return {
        id: 'paper_' + Date.now(),
        name: 'Sample Paper - IX IIT',
        sections: [{
            id: 'sec_' + Date.now() + '_1',
            name: 'Mathematics',
            questions: [{
                id: 'q_' + Date.now() + '_1',
                text: 'Two circles having same \\_\\_\\_\\_\\_ are called concentric circles',
                options: [
                    { id: 'o1', text: 'Center', isCorrect: true, editorType: 'plain' },
                    { id: 'o2', text: 'radius', isCorrect: false, editorType: 'plain' },
                    { id: 'o3', text: 'arc', isCorrect: false, editorType: 'plain' },
                    { id: 'o4', text: 'segment', isCorrect: false, editorType: 'plain' }
                ],
                editorType: 'plain',
                optionLayout: 'row',
                images: { q: null, opts: [null, null, null, null] }
            }, {
                id: 'q_' + Date.now() + '_2',
                text: 'Degree measure of a circle is \\_\\_\\_\\_\\_ degrees',
                options: [
                    { id: 'o5', text: '90', isCorrect: false, editorType: 'plain' },
                    { id: 'o6', text: '180', isCorrect: false, editorType: 'plain' },
                    { id: 'o7', text: '270', isCorrect: false, editorType: 'plain' },
                    { id: 'o8', text: '360', isCorrect: true, editorType: 'plain' }
                ],
                editorType: 'plain',
                optionLayout: 'row',
                images: { q: null, opts: [null, null, null, null] }
            }, {
                id: 'q_' + Date.now() + '_3',
                text: 'If a line intersect a circle in two distinct points, then it is called',
                options: [
                    { id: 'o9', text: 'Secant', isCorrect: true, editorType: 'plain' },
                    { id: 'o10', text: 'tangent', isCorrect: false, editorType: 'plain' },
                    { id: 'o11', text: 'median', isCorrect: false, editorType: 'plain' },
                    { id: 'o12', text: 'altitude', isCorrect: false, editorType: 'plain' }
                ],
                editorType: 'plain',
                optionLayout: 'row',
                images: { q: null, opts: [null, null, null, null] }
            }]
        }, {
            id: 'sec_' + Date.now() + '_2',
            name: 'Physics',
            questions: [{
                id: 'q_' + Date.now() + '_4',
                text: 'If the length of the wire is increased its resistivity \\_\\_\\_\\_\\_\\_\\_\\_\\_',
                options: [
                    { id: 'o13', text: 'Increase', isCorrect: false, editorType: 'plain' },
                    { id: 'o14', text: 'decrease', isCorrect: false, editorType: 'plain' },
                    { id: 'o15', text: 'remains same', isCorrect: true, editorType: 'plain' },
                    { id: 'o16', text: 'may increase or decrease', isCorrect: false, editorType: 'plain' }
                ],
                editorType: 'plain',
                optionLayout: 'row',
                images: { q: null, opts: [null, null, null, null] }
            }]
        }, {
            id: 'sec_' + Date.now() + '_3',
            name: 'Chemistry',
            questions: [{
                id: 'q_' + Date.now() + '_5',
                text: 'If eight electrons present in valence shell, it is called',
                options: [
                    { id: 'o17', text: 'Duplet configuration', isCorrect: false, editorType: 'plain' },
                    { id: 'o18', text: 'Octet configuration', isCorrect: true, editorType: 'plain' },
                    { id: 'o19', text: 'Inert gas configuration', isCorrect: false, editorType: 'plain' },
                    { id: 'o20', text: 'Pseudo inert gas configuration', isCorrect: false, editorType: 'plain' }
                ],
                editorType: 'plain',
                optionLayout: 'row',
                images: { q: null, opts: [null, null, null, null] }
            }]
        }, {
            id: 'sec_' + Date.now() + '_4',
            name: 'MAT',
            questions: [{
                id: 'q_' + Date.now() + '_6',
                text: 'Choose the term which will continue the following series: P3C, R5F, T8I, V12L, ?',
                options: [
                    { id: 'o21', text: 'Y17O', isCorrect: false, editorType: 'plain' },
                    { id: 'o22', text: 'X17M', isCorrect: false, editorType: 'plain' },
                    { id: 'o23', text: 'X17O', isCorrect: true, editorType: 'plain' },
                    { id: 'o24', text: 'X16O', isCorrect: false, editorType: 'plain' }
                ],
                editorType: 'plain',
                optionLayout: 'row',
                images: { q: null, opts: [null, null, null, null] }
            }]
        }]
    };
}

// ═══════════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════════

function render() {
    renderPaperList();
    renderEditor();
    saveState();
}

function renderPaperList() {
    const container = document.getElementById('paperList');
    if (state.papers.length === 0) {
        container.innerHTML =
            `<div class="empty-papers">No papers yet.<br>Click "+ New" to create one.</div>`;
        return;
    }
    let html = '';
    state.papers.forEach(p => {
        const active = p.id === state.activePaperId ? 'active' : '';
        const qCount = p.sections.reduce((sum, s) => sum + s.questions.length, 0);
        html += `
            <div class="paper-item ${active}" onclick="selectPaper('${p.id}')">
                <span class="paper-name">${escHtml(p.name)}</span>
                <span class="paper-meta">${p.sections.length} sec · ${qCount} Q</span>
                <button class="del-paper" onclick="event.stopPropagation(); deletePaper('${p.id}')" title="Delete">✕</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderEditor() {
    destroyCrepeInstances();
    const container = document.getElementById('mainEditor');
    const paper = state.papers.find(p => p.id === state.activePaperId);
    if (!paper) {
        container.innerHTML = `
            <div style="text-align:center;padding:80px 20px;color:#94a3b8;">
                <div style="font-size:48px;margin-bottom:16px;">📄</div>
                <h3 style="color:#1e293b;">No paper selected</h3>
                <p style="font-size:14px;">Create a new paper or select one from the left panel.</p>
                <button onclick="createNewPaper()" style="margin-top:16px;background:#2563eb;color:#fff;border:none;padding:8px 24px;border-radius:8px;cursor:pointer;">+ New Paper</button>
            </div>
        `;
        return;
    }

    let html = `
        <div class="editor-paper-title">
            <input type="text" value="${escHtml(paper.name)}" 
                   onchange="renamePaper('${paper.id}', this.value)" 
                   placeholder="Paper title..." />
            <div class="paper-actions">
                <button onclick="addSection('${paper.id}')">+ Section</button>
                <button onclick="openReuseModal('${paper.id}')">📥 Reuse Q</button>
                <button onclick="exportDOCX('${paper.id}')">📄 DOCX</button>
                <button onclick="exportPDF('${paper.id}')">📄 PDF</button>
                <button onclick="exportJSON('${paper.id}')">📋 JSON</button>
                <button onclick="exportCSV('${paper.id}')">📊 CSV</button>
            </div>
        </div>
    `;

    if (paper.sections.length === 0) {
        html += `<div style="text-align:center;padding:40px 0;color:#94a3b8;">
                    No sections yet. Click "+ Section" to add one.
                </div>`;
        container.innerHTML = html;
        return;
    }

    paper.sections.forEach((sec, si) => {
        const qCount = sec.questions.length;
        html += `
            <div class="section-block" data-sec-id="${sec.id}">
                <div class="section-header">
                    <div class="sec-name">
                        <span>📂</span>
                        <input type="text" value="${escHtml(sec.name)}" 
                               onchange="renameSection('${paper.id}','${sec.id}',this.value)" 
                               placeholder="Section name" />
                        <span class="text-muted">(${qCount} Q)</span>
                    </div>
                    <div class="sec-actions">
                        <button onclick="addQuestion('${paper.id}','${sec.id}')">+ Question</button>
                        <button class="del-sec" onclick="deleteSection('${paper.id}','${sec.id}')">✕</button>
                    </div>
                </div>
                <div class="section-body">
        `;

        if (sec.questions.length === 0) {
            html += `<div style="color:#94a3b8;padding:12px 0;text-align:center;font-size:13px;">No questions yet.</div>`;
        } else {
            sec.questions.forEach((q, qi) => {
                const qNum = qi + 1;
                const imgQ = q.images && q.images.q ? q.images.q : null;
                const qLayout = q.optionLayout || state.optionLayout || 'row';
                html += `
                    <div class="question-item" data-q-id="${q.id}">
                        <div class="q-header">
                            <span class="q-number">${qNum}.</span>
                            <div style="flex:1;min-width:0;">
                                ${renderContentEditor({
                                    value: q.text,
                                    editorType: q.editorType,
                                    className: 'q-text',
                                    placeholder: 'Enter question text... Markdown, images, and \\(...\\) math supported',
                                    onInput: `updateQuestionText('${paper.id}','${sec.id}','${q.id}',this.value)`,
                                    context: {
                                        field: 'question',
                                        paperId: paper.id,
                                        secId: sec.id,
                                        qId: q.id
                                    }
                                })}
                                ${imgQ ? `<div><img src="${imgQ}" class="img-preview" /><button class="img-remove" onclick="removeQuestionImage('${paper.id}','${sec.id}','${q.id}')">✕</button></div>` : ''}
                                <div class="img-hint">📷 Paste image (Ctrl+V) into question</div>
                            </div>
                            <div class="q-actions">
                                ${renderEditorSelect(q.editorType, `setQuestionEditor('${paper.id}','${sec.id}','${q.id}',this.value)`)}
                                <button onclick="duplicateQuestion('${paper.id}','${sec.id}','${q.id}')" title="Duplicate">📋</button>
                                <button class="del-q" onclick="deleteQuestion('${paper.id}','${sec.id}','${q.id}')" title="Delete">✕</button>
                            </div>
                        </div>
                        <div class="options-container ${qLayout}" data-layout="${qLayout}">
                `;
                // ensure 4 options
                while (q.options.length < 4) {
                    q.options.push({ id: 'opt_' + Date.now() + '_' + q.options.length, text: '',
                    isCorrect: false, editorType: 'plain' });
                }
                const labels = ['A', 'B', 'C', 'D'];
                q.options.forEach((opt, oi) => {
                    const imgOpt = q.images && q.images.opts && q.images.opts[oi] ? q.images
                        .opts[oi] : null;
                    html += `
                        <div class="option-item">
                            <span class="opt-label">${labels[oi]}.</span>
                            <div class="option-editor-wrap">
                                ${renderContentEditor({
                                    value: opt.text,
                                    editorType: opt.editorType,
                                    className: 'opt-text',
                                    placeholder: `Option ${labels[oi]}`,
                                    onInput: `updateOptionText('${paper.id}','${sec.id}','${q.id}',${oi},this.value)`,
                                    context: {
                                        field: 'option',
                                        paperId: paper.id,
                                        secId: sec.id,
                                        qId: q.id,
                                        optIdx: oi
                                    }
                                })}
                            </div>
                            ${imgOpt ? `<img src="${imgOpt}" class="img-preview" /><button class="img-remove" onclick="removeOptionImage('${paper.id}','${sec.id}','${q.id}',${oi})">✕</button>` : ''}
                            ${renderEditorSelect(opt.editorType, `setOptionEditor('${paper.id}','${sec.id}','${q.id}',${oi},this.value)`)}
                            <input type="radio" class="opt-correct" name="correct_${q.id}" 
                                   ${opt.isCorrect ? 'checked' : ''}
                                   onchange="setCorrectOption('${paper.id}','${sec.id}','${q.id}',${oi})" />
                            <button class="opt-del" onclick="deleteOption('${paper.id}','${sec.id}','${q.id}',${oi})" title="Remove option">✕</button>
                        </div>
                    `;
                });
                html += `
                        </div>
                        <div class="layout-selector">
                            <label><input type="radio" name="layout_${q.id}" value="row" ${qLayout === 'row' ? 'checked' : ''} onchange="setQuestionLayout('${paper.id}','${sec.id}','${q.id}','row')" /> 1×4</label>
                            <label><input type="radio" name="layout_${q.id}" value="grid2" ${qLayout === 'grid2' ? 'checked' : ''} onchange="setQuestionLayout('${paper.id}','${sec.id}','${q.id}','grid2')" /> 2×2</label>
                            <label><input type="radio" name="layout_${q.id}" value="column" ${qLayout === 'column' ? 'checked' : ''} onchange="setQuestionLayout('${paper.id}','${sec.id}','${q.id}','column')" /> 4×1</label>
                        </div>
                    </div>
                `;
            });
        }

        html += `
                    <button class="btn-add-question" onclick="addQuestion('${paper.id}','${sec.id}')">+ Add Question</button>
                </div>
            </div>
        `;
    });

    html += `<button class="btn-add-section" onclick="addSection('${paper.id}')">+ Add Section</button>`;
    container.innerHTML = html;

    // render math
    if (window.renderMathInElement) {
        try {
            renderMathInElement(container, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false }
                ],
                throwOnError: false
            });
        } catch (e) {}
    }

    // auto-resize textareas
    document.querySelectorAll('.q-text').forEach(ta => autoResize(ta));
    initRichEditors();
}

// ─── Helpers ───
function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
}

function renderEditorSelect(editorType, onChange) {
    const current = EDITOR_TYPES.includes(editorType) ? editorType : DEFAULT_EDITOR_TYPE;
    return `
        <select class="editor-select" onchange="${onChange}" title="Editor">
            <option value="plain" ${current === 'plain' ? 'selected' : ''}>Plain</option>
            <option value="markdown" ${current === 'markdown' ? 'selected' : ''}>Markdown</option>
            <option value="crepe" ${current === 'crepe' ? 'selected' : ''}>Crepe</option>
        </select>
    `;
}

function renderContentEditor({ value, editorType, className, placeholder, onInput, context }) {
    const type = EDITOR_TYPES.includes(editorType) ? editorType : DEFAULT_EDITOR_TYPE;
    const contextAttrs = Object.entries(context)
        .map(([key, val]) => `data-${camelToKebab(key)}="${escAttr(val)}"`)
        .join(' ');
    const dataAttrs = `data-editor-type="${type}" data-value="${escAttr(value || '')}" ${contextAttrs}`;
    if (type === 'plain') {
        const rows = className === 'q-text' ? ' rows="1"' : '';
        return `<textarea class="${className} rich-source"${rows} ${dataAttrs}
                    oninput="autoResize(this); ${onInput}"
                    placeholder="${escAttr(placeholder)}">${escHtml(value || '')}</textarea>`;
    }
    if (type === 'crepe') {
        return `<div class="${className} rich-source rich-crepe" ${dataAttrs}
                    data-on-input="${escAttr(onInput)}"
                    data-placeholder="${escAttr(placeholder)}"></div>`;
    }
    return `<textarea class="${className} rich-source markdown-editor" rows="2" ${dataAttrs}
                data-on-input="${escAttr(onInput)}"
                data-placeholder="${escAttr(placeholder)}"
                oninput="autoResize(this); syncMarkdownEditor(this)"
                placeholder="${escAttr(placeholder)}">${escHtml(value || '')}</textarea>`;
}

function initRichEditors() {
    document.querySelectorAll('.markdown-editor').forEach(el => {
        if (!el.textContent.trim() && !el.dataset.value) {
            el.classList.add('empty');
        }
    });
    document.querySelectorAll('.rich-crepe').forEach(el => initCrepeEditor(el));
}

function syncMarkdownEditor(el) {
    el.classList.toggle('empty', !getEditorElementValue(el).trim());
    const value = markdownFromEditor(el);
    el.dataset.value = value;
    applyEditorValueFromElement(el, value);
}

function markdownFromEditor(el) {
    return getEditorElementValue(el).replace(/\n{3,}/g, '\n\n').trimEnd();
}

function getEditorElementValue(el) {
    if ('value' in el) return el.value;
    return el.innerText || el.textContent || '';
}

function applyEditorValueFromElement(el, value) {
    if (el.dataset.field === 'question') {
        updateQuestionText(el.dataset.paperId, el.dataset.secId, el.dataset.qId, value);
    } else if (el.dataset.field === 'option') {
        updateOptionText(el.dataset.paperId, el.dataset.secId, el.dataset.qId, Number(el.dataset.optIdx), value);
    }
}

async function initCrepeEditor(el) {
    if (el.dataset.crepeInit === '1') return;
    el.dataset.crepeInit = '1';
    try {
        const mod = await loadCrepeModule();
        if (!mod || !mod.Crepe) throw new Error('Crepe module unavailable');
        const crepe = new mod.Crepe({
            root: el,
            defaultValue: el.dataset.value || '',
        });
        activeCrepeInstances.push(crepe);
        await crepe.create();
        const syncCrepe = async () => {
            let markdown = el.dataset.value || '';
            try {
                if (typeof crepe.getMarkdown === 'function') markdown = await crepe.getMarkdown();
                else if (typeof crepe.getValue === 'function') markdown = await crepe.getValue();
                else markdown = el.innerText || markdown;
            } catch (e) {
                markdown = el.innerText || markdown;
            }
            el.dataset.value = markdown;
            applyEditorValueFromElement(el, markdown);
        };
        el.addEventListener('input', syncCrepe);
        el.addEventListener('blur', syncCrepe, true);
        const editor = crepe.editor;
        if (editor && typeof editor.action === 'function' && mod.listenerCtx) {
            editor.action((ctx) => {
                const listener = ctx.get(mod.listenerCtx);
                listener.markdownUpdated((_, markdown) => {
                    el.dataset.value = markdown;
                    applyEditorValueFromElement(el, markdown);
                });
            });
        }
    } catch (err) {
        el.classList.remove('rich-crepe');
        el.classList.add('markdown-editor', 'crepe-fallback');
        el.contentEditable = 'true';
        el.textContent = el.dataset.value || '';
        el.dataset.crepeInit = 'fallback';
        el.addEventListener('input', () => syncMarkdownEditor(el));
        toast('Crepe editor unavailable; markdown editor used');
    }
}

function loadCrepeModule() {
    if (!crepeModulePromise) {
        crepeModulePromise = import('https://esm.sh/@milkdown/crepe@7.21.2?bundle');
    }
    return crepeModulePromise;
}

function destroyCrepeInstances() {
    activeCrepeInstances.forEach(instance => {
        try {
            if (typeof instance.destroy === 'function') instance.destroy();
        } catch (e) {}
    });
    activeCrepeInstances = [];
}

function renderMarkdownPreview(markdown) {
    return parseInlineMarkdown(markdown || '').html || '';
}

function camelToKebab(str) {
    return str.replace(/[A-Z]/g, char => '-' + char.toLowerCase());
}

function escAttr(str) {
    return escHtml(String(str ?? '')).replace(/"/g, '&quot;');
}

// ─── Layout ───
function setLayout(layout) {
    state.optionLayout = layout;
    localStorage.setItem(LAYOUT_KEY, layout);
    render();
}

function setQuestionLayout(paperId, secId, qId, layout) {
    if (!['row', 'column', 'grid2'].includes(layout)) return;
    const q = findQuestion(paperId, secId, qId);
    if (!q) return;
    q.optionLayout = layout;
    state.optionLayout = layout;
    saveState();
    render();
}

function setQuestionEditor(paperId, secId, qId, editorType) {
    if (!EDITOR_TYPES.includes(editorType)) return;
    const q = findQuestion(paperId, secId, qId);
    if (!q) return;
    q.editorType = editorType;
    saveState();
    render();
}

function setOptionEditor(paperId, secId, qId, idx, editorType) {
    if (!EDITOR_TYPES.includes(editorType)) return;
    const q = findQuestion(paperId, secId, qId);
    if (!q || !q.options[idx]) return;
    q.options[idx].editorType = editorType;
    saveState();
    render();
}

function findQuestion(paperId, secId, qId) {
    const paper = state.papers.find(p => p.id === paperId);
    const sec = paper && paper.sections.find(s => s.id === secId);
    return sec && sec.questions.find(q => q.id === qId);
}

// ═══════════════════════════════════════════════════════════════
//  CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

function createNewPaper() {
    const paper = {
        id: 'paper_' + Date.now(),
        name: 'New Paper ' + (state.papers.length + 1),
        sections: []
    };
    state.papers.push(paper);
    state.activePaperId = paper.id;
    // add a default section
    addSection(paper.id);
    render();
    toast('📄 New paper created');
}

function deletePaper(paperId) {
    if (!confirm('Delete this paper and all its questions?')) return;
    state.papers = state.papers.filter(p => p.id !== paperId);
    if (state.activePaperId === paperId) {
        state.activePaperId = state.papers.length > 0 ? state.papers[0].id : null;
        state.activeSectionId = null;
    }
    render();
    toast('🗑️ Paper deleted');
}

function selectPaper(paperId) {
    state.activePaperId = paperId;
    const paper = state.papers.find(p => p.id === paperId);
    if (paper && paper.sections.length > 0) {
        state.activeSectionId = paper.sections[0].id;
    }
    render();
}

function renamePaper(paperId, newName) {
    const paper = state.papers.find(p => p.id === paperId);
    if (paper) {
        paper.name = newName || 'Untitled';
        saveState();
        renderPaperList();
    }
}

// ─── Sections ───
function addSection(paperId) {
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;
    const sec = {
        id: 'sec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: 'Section ' + (paper.sections.length + 1),
        questions: []
    };
    paper.sections.push(sec);
    state.activeSectionId = sec.id;
    render();
    toast('📂 Section added');
}

function deleteSection(paperId, secId) {
    if (!confirm('Delete this section and all its questions?')) return;
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;
    paper.sections = paper.sections.filter(s => s.id !== secId);
    if (state.activeSectionId === secId) {
        state.activeSectionId = paper.sections.length > 0 ? paper.sections[0].id : null;
    }
    render();
    toast('🗑️ Section deleted');
}

function renameSection(paperId, secId, newName) {
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;
    const sec = paper.sections.find(s => s.id === secId);
    if (sec) {
        sec.name = newName || 'Untitled';
        saveState();
        render();
    }
}

// ─── Questions ───
function addQuestion(paperId, secId) {
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;
    const sec = paper.sections.find(s => s.id === secId);
    if (!sec) return;
    const q = {
        id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        text: '',
        options: [
            { id: 'opt_' + Date.now() + '_0', text: '', isCorrect: false, editorType: 'plain' },
            { id: 'opt_' + Date.now() + '_1', text: '', isCorrect: false, editorType: 'plain' },
            { id: 'opt_' + Date.now() + '_2', text: '', isCorrect: false, editorType: 'plain' },
            { id: 'opt_' + Date.now() + '_3', text: '', isCorrect: false, editorType: 'plain' }
        ],
        editorType: DEFAULT_EDITOR_TYPE,
        optionLayout: state.optionLayout || 'row',
        images: { q: null, opts: [null, null, null, null] }
    };
    sec.questions.push(q);
    render();
    // focus the new question's textarea
    setTimeout(() => {
        const ta = document.querySelector(`.question-item[data-q-id="${q.id}"] .q-text`);
        if (ta) ta.focus();
    }, 50);
    toast('✏️ Question added');
}

function deleteQuestion(paperId, secId, qId) {
    if (!confirm('Delete this question?')) return;
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;
    const sec = paper.sections.find(s => s.id === secId);
    if (!sec) return;
    sec.questions = sec.questions.filter(q => q.id !== qId);
    render();
    toast('🗑️ Question deleted');
}

function duplicateQuestion(paperId, secId, qId) {
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;
    const sec = paper.sections.find(s => s.id === secId);
    if (!sec) return;
    const orig = sec.questions.find(q => q.id === qId);
    if (!orig) return;
    const copy = JSON.parse(JSON.stringify(orig));
    copy.id = 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    copy.options.forEach(o => { o.id = 'opt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); });
    if (copy.images) {
        copy.images = { q: copy.images.q || null, opts: copy.images.opts ? [...copy.images.opts] : [null, null,
                null, null
            ] };
    }
    sec.questions.splice(sec.questions.indexOf(orig) + 1, 0, copy);
    render();
    toast('📋 Question duplicated');
}

function updateQuestionText(paperId, secId, qId, text) {
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;
    const sec = paper.sections.find(s => s.id === secId);
    if (!sec) return;
    const q = sec.questions.find(q => q.id === qId);
    if (q) {
        q.text = text;
        saveState();
    }
}

// ─── Options ───
function updateOptionText(paperId, secId, qId, idx, text) {
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;
    const sec = paper.sections.find(s => s.id === secId);
    if (!sec) return;
    const q = sec.questions.find(q => q.id === qId);
    if (q && q.options[idx]) {
        q.options[idx].text = text;
        saveState();
    }
}

function setCorrectOption(paperId, secId, qId, idx) {
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;
    const sec = paper.sections.find(s => s.id === secId);
    if (!sec) return;
    const q = sec.questions.find(q => q.id === qId);
    if (q) {
        q.options.forEach((o, i) => o.isCorrect = (i === idx));
        saveState();
        render();
    }
}

function deleteOption(paperId, secId, qId, idx) {
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;
    const sec = paper.sections.find(s => s.id === secId);
    if (!sec) return;
    const q = sec.questions.find(q => q.id === qId);
    if (!q || q.options.length <= 1) return;
    q.options.splice(idx, 1);
    if (q.images && q.images.opts) {
        q.images.opts.splice(idx, 1);
    }
    // ensure we have 4 options
    while (q.options.length < 4) {
        q.options.push({ id: 'opt_' + Date.now() + '_' + q.options.length, text: '', isCorrect: false, editorType: 'plain' });
        if (q.images && q.images.opts) q.images.opts.push(null);
    }
    render();
    toast('🗑️ Option removed');
}

// ─── Images ───
function handleImagePaste(e, paperId, secId, qId, optIdx = null) {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    let imageItem = null;
    for (let item of items) {
        if (item.type.startsWith('image/')) {
            imageItem = item;
            break;
        }
    }
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    const reader = new FileReader();
    reader.onload = function(ev) {
        const dataUrl = ev.target.result;
        const paper = state.papers.find(p => p.id === paperId);
        if (!paper) return;
        const sec = paper.sections.find(s => s.id === secId);
        if (!sec) return;
        const q = sec.questions.find(q => q.id === qId);
        if (!q) return;
        if (!q.images) q.images = { q: null, opts: [null, null, null, null] };
        if (optIdx === null) {
            q.images.q = dataUrl;
        } else if (optIdx >= 0 && optIdx < 4) {
            if (!q.images.opts) q.images.opts = [null, null, null, null];
            q.images.opts[optIdx] = dataUrl;
        }
        saveState();
        render();
        toast('🖼️ Image pasted');
    };
    reader.readAsDataURL(file);
}

function handleEditorImagePaste(e, editorEl) {
    const imageItem = getClipboardImageItem(e);
    if (!imageItem) return false;
    e.preventDefault();
    const file = imageItem.getAsFile();
    const reader = new FileReader();
    reader.onload = function(ev) {
        const dataUrl = ev.target.result;
        insertMarkdownImageAtCursor(editorEl, dataUrl);
        toast('🖼️ Image inserted');
    };
    reader.readAsDataURL(file);
    return true;
}

function getClipboardImageItem(e) {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return null;
    for (let item of items) {
        if (item.type.startsWith('image/')) return item;
    }
    return null;
}

function insertMarkdownImageAtCursor(editorEl, dataUrl) {
    const markdown = `![pasted image](${dataUrl})`;
    if ('selectionStart' in editorEl && 'value' in editorEl) {
        const start = editorEl.selectionStart || 0;
        const end = editorEl.selectionEnd || start;
        const before = editorEl.value.slice(0, start);
        const after = editorEl.value.slice(end);
        const needsLead = before && !before.endsWith('\n') ? '\n' : '';
        const needsTrail = after && !after.startsWith('\n') ? '\n' : '';
        const insert = `${needsLead}${markdown}${needsTrail}`;
        editorEl.value = before + insert + after;
        const cursor = before.length + insert.length;
        editorEl.setSelectionRange(cursor, cursor);
        editorEl.dataset.value = editorEl.value;
        autoResize(editorEl);
        applyEditorValueFromElement(editorEl, editorEl.value);
        return;
    }

    editorEl.focus();
    const selection = window.getSelection && window.getSelection();
    if (selection && selection.rangeCount) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(markdown);
        range.insertNode(node);
        range.setStartAfter(node);
        range.setEndAfter(node);
        selection.removeAllRanges();
        selection.addRange(range);
    } else if (document.execCommand) {
        document.execCommand('insertText', false, markdown);
    }
    setTimeout(() => {
        const value = markdownFromEditor(editorEl);
        editorEl.dataset.value = value;
        applyEditorValueFromElement(editorEl, value);
    }, 0);
}

function removeQuestionImage(paperId, secId, qId) {
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;
    const sec = paper.sections.find(s => s.id === secId);
    if (!sec) return;
    const q = sec.questions.find(q => q.id === qId);
    if (q && q.images) {
        q.images.q = null;
        saveState();
        render();
        toast('🖼️ Image removed');
    }
}

function removeOptionImage(paperId, secId, qId, idx) {
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;
    const sec = paper.sections.find(s => s.id === secId);
    if (!sec) return;
    const q = sec.questions.find(q => q.id === qId);
    if (q && q.images && q.images.opts) {
        q.images.opts[idx] = null;
        saveState();
        render();
        toast('🖼️ Image removed');
    }
}

// ─── Paste event binding ───
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('paste', function(e) {
        const target = e.target;
        if (!target.closest) return;
        const richEditor = target.closest('.rich-source') || target.closest('.milkdown')?.closest('.rich-source');
        if (richEditor && handleEditorImagePaste(e, richEditor)) {
            return;
        }
        const qText = target.closest('.q-text');
        if (qText) {
            const qItem = qText.closest('.question-item');
            if (qItem) {
                const qId = qItem.dataset.qId;
                // find paper and sec
                for (let p of state.papers) {
                    for (let s of p.sections) {
                        const q = s.questions.find(q => q.id === qId);
                        if (q) {
                            handleImagePaste(e, p.id, s.id, qId, null);
                            return;
                        }
                    }
                }
            }
            return;
        }
        const optText = target.closest('.opt-text');
        if (optText) {
            const optItem = optText.closest('.option-item');
            if (optItem) {
                const qItem = optItem.closest('.question-item');
                if (qItem) {
                    const qId = qItem.dataset.qId;
                    const optIdx = Array.from(optItem.parentElement.children).indexOf(optItem);
                    for (let p of state.papers) {
                        for (let s of p.sections) {
                            const q = s.questions.find(q => q.id === qId);
                            if (q) {
                                handleImagePaste(e, p.id, s.id, qId, optIdx);
                                return;
                            }
                        }
                    }
                }
            }
        }
    });
});

// ═══════════════════════════════════════════════════════════════
//  REUSE QUESTIONS (Modal)
// ═══════════════════════════════════════════════════════════════

let reuseTargetPaperId = null;

function openReuseModal(paperId) {
    reuseTargetPaperId = paperId;
    state.reuseSelected = [];
    const modal = document.getElementById('reuseModal');
    modal.classList.remove('hidden');
    renderReuseModal();
}

function closeReuseModal() {
    document.getElementById('reuseModal').classList.add('hidden');
    state.reuseSelected = [];
}

function renderReuseModal() {
    const body = document.getElementById('reuseModalBody');
    let html = '';
    const allQuestions = [];
    state.papers.forEach(p => {
        p.sections.forEach(s => {
            s.questions.forEach(q => {
                allQuestions.push({
                    paperName: p.name,
                    sectionName: s.name,
                    question: q,
                    paperId: p.id,
                    sectionId: s.id
                });
            });
        });
    });
    if (allQuestions.length === 0) {
        html = `<div style="color:#94a3b8;padding:30px 0;text-align:center;">No questions available to reuse.</div>`;
    } else {
        allQuestions.forEach((item, idx) => {
            const checked = state.reuseSelected.includes(idx) ? 'checked' : '';
            const qText = item.question.text || '(empty question)';
            html += `
                <div class="reuse-item" onclick="toggleReuseItem(${idx})">
                    <span class="ri-text">${escHtml(qText.substring(0, 80))}${qText.length > 80 ? '…' : ''}</span>
                    <span class="ri-meta">${escHtml(item.paperName)} › ${escHtml(item.sectionName)}</span>
                    <input type="checkbox" ${checked} onclick="event.stopPropagation(); toggleReuseItem(${idx})" />
                </div>
            `;
        });
    }
    body.innerHTML = html;
    // store items for apply
    body.dataset.items = JSON.stringify(allQuestions);
}

function toggleReuseItem(idx) {
    const pos = state.reuseSelected.indexOf(idx);
    if (pos === -1) state.reuseSelected.push(idx);
    else state.reuseSelected.splice(pos, 1);
    renderReuseModal();
}

function applyReuseQuestions() {
    const body = document.getElementById('reuseModalBody');
    const items = JSON.parse(body.dataset.items || '[]');
    const selected = state.reuseSelected;
    if (selected.length === 0) {
        toast('⚠️ No questions selected');
        return;
    }
    const paper = state.papers.find(p => p.id === reuseTargetPaperId);
    if (!paper) {
        toast('⚠️ Paper not found');
        return;
    }
    // add to first section, or create one
    let targetSec = paper.sections.length > 0 ? paper.sections[0] : null;
    if (!targetSec) {
        targetSec = { id: 'sec_' + Date.now(), name: 'Section 1', questions: [] };
        paper.sections.push(targetSec);
    }
    selected.forEach(idx => {
        const item = items[idx];
        if (!item) return;
        const qCopy = JSON.parse(JSON.stringify(item.question));
        qCopy.id = 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        qCopy.options.forEach(o => { o.id = 'opt_' + Date.now() + '_' + Math.random().toString(36).slice(2,
            6); });
        if (qCopy.images) {
            qCopy.images = { q: qCopy.images.q || null, opts: qCopy.images.opts ? [...qCopy.images
                    .opts] : [null, null, null, null] };
        }
        targetSec.questions.push(qCopy);
    });
    closeReuseModal();
    render();
    toast('📥 ' + selected.length + ' question(s) reused');
}

// ═══════════════════════════════════════════════════════════════
//  EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getPaper(paperId) {
    return state.papers.find(p => p.id === paperId);
}

function parseInlineMarkdown(markdown) {
    const source = String(markdown || '');
    const segments = [];
    let html = '';
    const tokenRe = /!\[([^\]]*)\]\((data:image\/[^)]+)\)|\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;
    let last = 0;
    let match;
    while ((match = tokenRe.exec(source))) {
        pushText(source.slice(last, match.index));
        if (match[2]) {
            segments.push({ type: 'image', alt: match[1], src: match[2] });
            html += `<img src="${escAttr(match[2])}" alt="${escAttr(match[1])}" class="inline-md-image" />`;
        } else {
            const latex = match[3] || match[4] || match[5] || '';
            segments.push({ type: 'math', latex });
            html += `<span class="math-inline">\\(${escHtml(latex)}\\)</span>`;
        }
        last = tokenRe.lastIndex;
    }
    pushText(source.slice(last));
    return { segments, html };

    function pushText(text) {
        if (!text) return;
        segments.push({ type: 'text', text });
        html += formatMarkdownText(text);
    }
}

function formatMarkdownText(text) {
    return escHtml(text)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

function buildExportHTML(paper) {
    const labels = ['A', 'B', 'C', 'D'];
    let html = `
        <html><head><meta charset="UTF-8">
        <style>
            body { font-family: 'Times New Roman', serif; padding: 30px; max-width: 900px; margin: auto; }
            .paper-title { font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 8px; }
            .paper-meta { text-align: center; color: #555; margin-bottom: 24px; font-size: 14px; }
            .section-title { font-size: 18px; font-weight: 600; margin: 24px 0 12px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
            .q-item { margin-bottom: 16px; page-break-inside: avoid; }
            .q-text { font-weight: 500; margin-bottom: 4px; }
            .opts { display: grid; gap: 4px 16px; padding-left: 24px; }
            .opts.row { grid-template-columns: 1fr 1fr 1fr 1fr; }
            .opts.grid2 { grid-template-columns: 1fr 1fr; }
            .opts.column { grid-template-columns: 1fr; }
            .opt { display: flex; align-items: baseline; gap: 4px; }
            .opt-label { font-weight: 500; min-width: 20px; }
            .opt-text { }
            .q-img { max-width: 200px; max-height: 120px; margin: 4px 0; border: 1px solid #ddd; border-radius: 4px; }
            .opt-img { max-width: 80px; max-height: 60px; margin: 2px 0; border: 1px solid #ddd; border-radius: 3px; }
            .inline-md-image { max-width: 180px; max-height: 120px; display: inline-block; vertical-align: middle; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 12px; }
    </style>
</head><body>
    <div class="paper-title">${escHtml(paper.name)}</div>
    <div class="paper-meta">Total Questions: ${paper.sections.reduce((s,sec) => s + sec.questions.length, 0)}  •  Sections: ${paper.sections.length}</div>
    `;
    paper.sections.forEach(sec => {
if (sec.questions.length === 0) return;
html += `<div class="section-title">${escHtml(sec.name)}</div>`;
sec.questions.forEach((q, qi) => {
    const qText = q.text || '(empty question)';
    const layout = q.optionLayout || state.optionLayout || 'row';
    html += `<div class="q-item"><div class="q-text">${qi+1}. ${parseInlineMarkdown(qText).html}</div>`;
    if (q.images && q.images.q) {
        html += `<div><img src="${q.images.q}" class="q-img" /></div>`;
    }
    html += `<div class="opts ${layout}">`;
    q.options.forEach((o, oi) => {
        const imgOpt = q.images && q.images.opts && q.images.opts[oi] ? q.images.opts[oi] : null;
        html += `<div class="opt">
                    <span class="opt-label">${labels[oi]}.</span>
                    <span class="opt-text">${parseInlineMarkdown(o.text || '').html}</span>
                    ${imgOpt ? `<img src="${imgOpt}" class="opt-img" />` : ''}
                </div>`;
    });
    html += `</div></div>`;
});
    });
    html += `<div class="footer">Generated by MCQ Builder • ${new Date().toLocaleString()}</div>`;
    html += `</body></html>`;
    return html;
}

function exportDOCX(paperId) {
    const paper = getPaper(paperId);
    if (!paper) { toast('⚠️ Paper not found'); return; }
    try {
        const blob = buildDocxBlob(paper);
        downloadBlob(blob, `${safeFileName(paper.name)}.docx`);
        toast('📄 DOCX exported');
    } catch (err) {
        console.error(err);
        toast('⚠️ DOCX export failed');
    }
}

function buildDocxBlob(paper) {
    const media = [];
    const documentXml = buildDocumentXml(paper, media);
    const relsXml = buildDocumentRels(media);
    const files = {
        '[Content_Types].xml': buildContentTypes(media),
        '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
        'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xmlEscape(paper.name)}</dc:title><dc:creator>MCQ Builder</dc:creator><cp:lastModifiedBy>MCQ Builder</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`,
        'docProps/app.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>MCQ Builder</Application></Properties>`,
        'word/document.xml': documentXml,
        'word/_rels/document.xml.rels': relsXml,
    };
    media.forEach(item => {
        files[`word/media/${item.fileName}`] = item.bytes;
    });
    return new Blob([createZip(files)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
}

function buildContentTypes(media) {
    const defaults = new Map([
        ['rels', 'application/vnd.openxmlformats-package.relationships+xml'],
        ['xml', 'application/xml'],
    ]);
    media.forEach(item => defaults.set(item.ext, item.mime));
    const defaultXml = [...defaults.entries()]
        .map(([ext, type]) => `<Default Extension="${ext}" ContentType="${type}"/>`)
        .join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
${defaultXml}
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function buildDocumentRels(media) {
    const imageRels = media.map(item =>
        `<Relationship Id="${item.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${item.fileName}"/>`
    ).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${imageRels}</Relationships>`;
}

function buildDocumentXml(paper, media) {
    const totalQuestions = paper.sections.reduce((sum, sec) => sum + sec.questions.length, 0);
    let body = '';
    body += docxParagraph([
        docxTextRun(paper.name || 'Question Paper', { bold: true, size: 28 })
    ], { align: 'center', after: 80 });
    body += docxParagraph([
        docxTextRun(`Total Questions: ${totalQuestions}    Sections: ${paper.sections.length}`, { size: 20 })
    ], { align: 'center', after: 200 });
    paper.sections.forEach(sec => {
        if (!sec.questions.length) return;
        body += docxParagraph([docxTextRun(sec.name, { bold: true, size: 24 })], { before: 120, after: 80 });
        sec.questions.forEach((q, qi) => {
            const prefix = docxTextRun(`${qi + 1}) `, { bold: true });
            body += docxParagraph([prefix, ...docxInlineFromMarkdown(q.text || '(empty question)', media)], { after: 70 });
            if (q.images && q.images.q) {
                body += docxParagraph([docxImageRun(q.images.q, media, 220, 140)], { after: 80 });
            }
            body += docxOptionsTable(q, media);
        });
    });
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${DOCX_NS.w}" xmlns:r="${DOCX_NS.r}" xmlns:wp="${DOCX_NS.wp}" xmlns:a="${DOCX_NS.a}" xmlns:pic="${DOCX_NS.pic}" xmlns:m="${DOCX_NS.m}">
<w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr></w:body>
</w:document>`;
}

function docxOptionsTable(q, media) {
    const labels = ['A', 'B', 'C', 'D'];
    const layout = q.optionLayout || state.optionLayout || 'row';
    const rows = layout === 'row'
        ? [[0, 1, 2, 3]]
        : layout === 'grid2'
            ? [[0, 1], [2, 3]]
            : [[0], [1], [2], [3]];
    const colCount = rows[0].length;
    const colWidth = Math.floor(9360 / colCount);
    const grid = Array.from({ length: colCount }, () => `<w:gridCol w:w="${colWidth}"/>`).join('');
    const body = rows.map(row => `<w:tr>${row.map(idx => {
        const opt = q.options[idx] || { text: '' };
        const img = q.images && q.images.opts && q.images.opts[idx] ? q.images.opts[idx] : null;
        const runs = [
            docxTextRun(`${labels[idx]}) `, { bold: true }),
            ...docxInlineFromMarkdown(opt.text || '', media)
        ];
        if (img) runs.push(docxImageRun(img, media, 80, 55));
        return `<w:tc><w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/></w:tcPr>${docxParagraph(runs, { after: 30 })}</w:tc>`;
    }).join('')}</w:tr>`).join('');
    return `<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>${docxParagraph([], { after: 80 })}`;
}

function docxInlineFromMarkdown(markdown, media) {
    const pieces = [];
    parseInlineMarkdown(markdown).segments.forEach(seg => {
        if (seg.type === 'text') pieces.push(...docxTextRunsFromMarkdownText(seg.text));
        if (seg.type === 'math') pieces.push(docxMath(seg.latex));
        if (seg.type === 'image') pieces.push(docxImageRun(seg.src, media, 160, 100));
    });
    return pieces;
}

function docxTextRunsFromMarkdownText(text) {
    const runs = [];
    const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let last = 0;
    let match;
    while ((match = re.exec(text))) {
        runs.push(...docxTextRuns(text.slice(last, match.index)));
        runs.push(...docxTextRuns(match[2] || match[3] || '', { bold: !!match[2], italic: !!match[3] }));
        last = re.lastIndex;
    }
    runs.push(...docxTextRuns(text.slice(last)));
    return runs;
}

function docxTextRuns(text, opts = {}) {
    return String(text || '').split('\n').flatMap((part, idx, arr) => {
        const out = [];
        if (part) out.push(docxTextRun(part, opts));
        if (idx < arr.length - 1) out.push('<w:r><w:br/></w:r>');
        return out;
    });
}

function docxTextRun(text, opts = {}) {
    const props = [];
    if (opts.bold) props.push('<w:b/>');
    if (opts.italic) props.push('<w:i/>');
    if (opts.size) props.push(`<w:sz w:val="${opts.size}"/>`);
    const rPr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : '';
    return `<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

function docxParagraph(runs, opts = {}) {
    const pPr = [];
    if (opts.align) pPr.push(`<w:jc w:val="${opts.align}"/>`);
    if (opts.before || opts.after !== undefined) {
        pPr.push(`<w:spacing w:before="${opts.before || 0}" w:after="${opts.after || 0}"/>`);
    }
    return `<w:p>${pPr.length ? `<w:pPr>${pPr.join('')}</w:pPr>` : ''}${runs.join('')}</w:p>`;
}

function docxMath(latex) {
    const trimmed = String(latex || '').trim();
    const frac = trimmed.match(/^\\frac\{([^{}]+)\}\{([^{}]+)\}$/);
    if (frac) {
        return `<m:oMath><m:f><m:num><m:r><m:t>${xmlEscape(frac[1])}</m:t></m:r></m:num><m:den><m:r><m:t>${xmlEscape(frac[2])}</m:t></m:r></m:den></m:f></m:oMath>`;
    }
    return `<m:oMath><m:r><m:t>${xmlEscape(cleanLatex(trimmed))}</m:t></m:r></m:oMath>`;
}

function cleanLatex(latex) {
    return latex
        .replace(/\\_/g, '_')
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\pm/g, '±')
        .replace(/\\cdot/g, '·')
        .replace(/\\degree/g, '°')
        .replace(/\\/g, '');
}

function docxImageRun(dataUrl, media, widthPx, heightPx) {
    const item = addMedia(dataUrl, media);
    if (!item) return '';
    const cx = Math.round(widthPx * 9525);
    const cy = Math.round(heightPx * 9525);
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${item.docPrId}" name="${xmlEscape(item.fileName)}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="${xmlEscape(item.fileName)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${item.rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

function addMedia(dataUrl, media) {
    const match = String(dataUrl || '').match(/^data:(image\/(png|jpe?g|gif));base64,(.+)$/i);
    if (!match) return null;
    const mime = match[1].toLowerCase();
    const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
    const existing = media.find(item => item.dataUrl === dataUrl);
    if (existing) return existing;
    const id = media.length + 1;
    const item = {
        dataUrl,
        mime,
        ext,
        bytes: base64ToUint8(match[3]),
        fileName: `image${id}.${ext}`,
        rId: `rId${id}`,
        docPrId: id,
    };
    media.push(item);
    return item;
}

function base64ToUint8(base64) {
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

function downloadBlob(blob, fileName) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
}

function safeFileName(name) {
    return String(name || 'question_paper').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_');
}

function xmlEscape(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function createZip(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    Object.entries(files).forEach(([name, content]) => {
        const nameBytes = encoder.encode(name);
        const data = typeof content === 'string' ? encoder.encode(content) : content;
        const crc = crc32(data);
        const local = new Uint8Array(30 + nameBytes.length);
        const lv = new DataView(local.buffer);
        lv.setUint32(0, 0x04034b50, true);
        lv.setUint16(4, 20, true);
        lv.setUint16(6, 0, true);
        lv.setUint16(8, 0, true);
        lv.setUint16(10, 0, true);
        lv.setUint16(12, 0, true);
        lv.setUint32(14, crc, true);
        lv.setUint32(18, data.length, true);
        lv.setUint32(22, data.length, true);
        lv.setUint16(26, nameBytes.length, true);
        local.set(nameBytes, 30);
        localParts.push(local, data);

        const central = new Uint8Array(46 + nameBytes.length);
        const cv = new DataView(central.buffer);
        cv.setUint32(0, 0x02014b50, true);
        cv.setUint16(4, 20, true);
        cv.setUint16(6, 20, true);
        cv.setUint16(8, 0, true);
        cv.setUint16(10, 0, true);
        cv.setUint16(12, 0, true);
        cv.setUint16(14, 0, true);
        cv.setUint32(16, crc, true);
        cv.setUint32(20, data.length, true);
        cv.setUint32(24, data.length, true);
        cv.setUint16(28, nameBytes.length, true);
        cv.setUint32(42, offset, true);
        central.set(nameBytes, 46);
        centralParts.push(central);
        offset += local.length + data.length;
    });
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, centralParts.length, true);
    ev.setUint16(10, centralParts.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
}

function crc32(data) {
    let crc = -1;
    for (let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
}

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[i] = c >>> 0;
    }
    return table;
})();

function exportPDF(paperId) {
    const paper = getPaper(paperId);
    if (!paper) { toast('⚠️ Paper not found'); return; }
    // Use html2canvas + jsPDF
    const html = buildExportHTML(paper);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '900px';
    wrapper.style.background = '#fff';
    wrapper.style.padding = '30px';
    wrapper.style.zIndex = '-1';
    document.body.appendChild(wrapper);
    html2canvas(wrapper, { scale: 2, useCORS: true, allowTaint: true }).then(canvas => {
const imgData = canvas.toDataURL('image/png');
const { jsPDF } = window.jspdf;
const pdf = new jsPDF('p', 'mm', 'a4');
const pdfWidth = pdf.internal.pageSize.getWidth();
const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
let heightLeft = pdfHeight;
let position = 0;
pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
heightLeft -= pdf.internal.pageSize.getHeight();
while (heightLeft > 0) {
    position = heightLeft - pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();
}
pdf.save(`${paper.name.replace(/\s+/g,'_')}.pdf`);
document.body.removeChild(wrapper);
toast('📄 PDF exported');
    }).catch(() => {
document.body.removeChild(wrapper);
toast('⚠️ PDF export failed. Try using "Print to PDF" from browser.');
    });
}

function exportJSON(paperId) {
    const paper = getPaper(paperId);
    if (!paper) { toast('⚠️ Paper not found'); return; }
    const data = JSON.stringify(paper, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${paper.name.replace(/\s+/g,'_')}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast('📋 JSON exported');
}

function exportAllJSON() {
    const data = JSON.stringify(state.papers, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `all_papers_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast('📋 All papers exported as JSON');
}

function exportCSV(paperId) {
    const paper = getPaper(paperId);
    if (!paper) { toast('⚠️ Paper not found'); return; }
    const labels = ['A','B','C','D'];
    let rows = [['Section','Question','Option','Correct','Answer']];
    paper.sections.forEach(sec => {
sec.questions.forEach(q => {
    const qText = q.text.replace(/,/g,';').replace(/\n/g,' ');
    q.options.forEach((o, oi) => {
        const optText = o.text.replace(/,/g,';').replace(/\n/g,' ');
        rows.push([
            sec.name.replace(/,/g,';'),
            qText,
            labels[oi] + '. ' + optText,
            o.isCorrect ? 'Yes' : 'No',
            o.isCorrect ? labels[oi] : ''
        ]);
    });
});
    });
    let csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${paper.name.replace(/\s+/g,'_')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast('📊 CSV exported');
}

function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
const file = e.target.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = function(ev) {
    try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) {
            state.papers = data;
        } else if (data.id && data.sections) {
            state.papers.push(data);
        } else {
            toast('⚠️ Invalid JSON format');
            return;
        }
        if (state.papers.length > 0) {
            state.activePaperId = state.papers[0].id;
        }
        saveState();
        render();
        toast('📂 Imported successfully');
    } catch(err) {
        toast('⚠️ Error parsing JSON: ' + err.message);
    }
};
reader.readAsText(file);
    };
    input.click();
}

function clearAllData() {
    if (!confirm('⚠️ Delete ALL papers and questions? This cannot be undone!')) return;
    state.papers = [];
    state.activePaperId = null;
    state.activeSectionId = null;
    saveState();
    render();
    toast('🗑️ All data cleared');
}

// ─── Toast ───
function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => el.classList.remove('show'), 2500);
}

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════

loadState();
render();

// re-render math on any change
const origRender = render;
render = function() {
    origRender();
    if (window.renderMathInElement) {
try {
    renderMathInElement(document.getElementById('mainEditor'), {
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
    });
} catch(e) {}
    }
};
render();

console.log('📝 MCQ Builder loaded!');

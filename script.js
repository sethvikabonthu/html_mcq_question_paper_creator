const STORAGE_KEY = 'school_mcq_paper_studio_v1';
const LABELS = ['A', 'B', 'C', 'D'];
const LAYOUTS = [
    { id: 'row', label: '1x4' },
    { id: 'grid2', label: '2x2' },
    { id: 'column', label: '4x1' },
];

let state = {
    papers: [],
    activePaperId: null,
    activeSectionId: null,
};

const els = {
    paperList: document.getElementById('paperList'),
    paperSetup: document.getElementById('paperSetup'),
    sectionTabs: document.getElementById('sectionTabs'),
    workbench: document.getElementById('questionWorkbench'),
    teacherPanel: document.getElementById('teacherPanel'),
    toast: document.getElementById('toast'),
    fileInput: document.getElementById('fileInput'),
};

document.getElementById('newPaperBtn').addEventListener('click', createPaper);
document.getElementById('importBtn').addEventListener('click', () => els.fileInput.click());
document.getElementById('exportBtn').addEventListener('click', exportBackup);
document.getElementById('printBtn').addEventListener('click', () => window.print());
document.getElementById('wordBtn').addEventListener('click', exportWord);
els.fileInput.addEventListener('change', importBackup);

document.addEventListener('paste', handlePaste);

load();
render();

function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            state = JSON.parse(raw);
        } catch (err) {
            state = { papers: [], activePaperId: null, activeSectionId: null };
        }
    }
    if (!state.papers.length) {
        const paper = samplePaper();
        state.papers = [paper];
        state.activePaperId = paper.id;
        state.activeSectionId = paper.sections[0].id;
    }
    normalize();
}

function save() {
    normalize();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalize() {
    state.papers.forEach(paper => {
        paper.meta ||= {};
        paper.sections ||= [];
        paper.sections.forEach(section => {
            section.questions ||= [];
            section.questions.forEach(question => {
                question.options ||= [];
                question.layout = ['row', 'grid2', 'column'].includes(question.layout) ? question.layout : 'row';
                while (question.options.length < 4) {
                    question.options.push(newOption(question.options.length));
                }
                question.options = question.options.slice(0, 4);
                if (!Number.isInteger(question.correctIndex)) question.correctIndex = 0;
            });
        });
    });
    const activePaper = getActivePaper();
    if (!activePaper && state.papers[0]) state.activePaperId = state.papers[0].id;
    const paper = getActivePaper();
    if (paper && !paper.sections.find(s => s.id === state.activeSectionId)) {
        state.activeSectionId = paper.sections[0]?.id || null;
    }
}

function samplePaper() {
    const math = {
        id: uid('section'),
        name: 'Mathematics',
        questions: [
            newQuestion('Two circles having same _____ are called concentric circles', ['Center', 'radius', 'arc', 'segment'], 0),
            newQuestion('Degree measure of a circle is _____ degrees', ['90', '180', '270', '360'], 3),
            newQuestion('If a line intersect a circle in two distinct points, then it is called', ['Secant', 'tangent', 'median', 'altitude'], 0),
        ],
    };
    const paper = {
        id: uid('paper'),
        title: 'Sample Paper - IX IIT',
        meta: {
            className: 'IX',
            subject: 'MPCM',
            testName: 'IIT Test 10',
            duration: '1:20 hr',
            marks: '180',
            instructions: 'Choose the correct answer. Use pasted images or \\(LaTeX\\) where needed.',
        },
        sections: [math],
    };
    return paper;
}

function uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function newQuestion(text = '', options = ['', '', '', ''], correctIndex = 0) {
    return {
        id: uid('q'),
        text,
        layout: 'row',
        correctIndex,
        marks: 1,
        options: options.map((value, index) => newOption(index, value)),
    };
}

function newOption(index, text = '') {
    return { id: uid(`opt${index}`), text };
}

function getActivePaper() {
    return state.papers.find(p => p.id === state.activePaperId) || null;
}

function getActiveSection() {
    const paper = getActivePaper();
    return paper?.sections.find(s => s.id === state.activeSectionId) || null;
}

function render() {
    normalize();
    renderPaperList();
    renderPaperSetup();
    renderSectionTabs();
    renderWorkbench();
    renderTeacherPanel();
    save();
    renderMathSoon();
}

function renderPaperList() {
    els.paperList.innerHTML = state.papers.map(paper => {
        const count = countQuestions(paper);
        return `
            <button class="paper-row ${paper.id === state.activePaperId ? 'active' : ''}" data-action="select-paper" data-id="${paper.id}">
                <strong>${esc(paper.title)}</strong>
                <span>${esc(paper.meta.className || 'Class')} · ${count} questions</span>
            </button>
        `;
    }).join('');
    els.paperList.querySelectorAll('[data-action="select-paper"]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.activePaperId = btn.dataset.id;
            state.activeSectionId = getActivePaper().sections[0]?.id || null;
            render();
        });
    });
}

function renderPaperSetup() {
    const paper = getActivePaper();
    if (!paper) return;
    els.paperSetup.innerHTML = `
        <div class="setup-grid">
            ${field('Title', 'title', paper.title, 'Paper title')}
            ${field('Class', 'className', paper.meta.className, 'IX')}
            ${field('Subject', 'subject', paper.meta.subject, 'MPCM')}
            ${field('Test', 'testName', paper.meta.testName, 'Unit Test')}
            ${field('Time', 'duration', paper.meta.duration, '1 hr')}
            ${field('Marks', 'marks', paper.meta.marks, '60')}
            <div class="field instructions-field">
                <label>Instructions</label>
                <textarea data-meta="instructions" placeholder="Instructions shown on the paper">${esc(paper.meta.instructions)}</textarea>
            </div>
        </div>
    `;
    els.paperSetup.querySelectorAll('[data-meta]').forEach(input => {
        input.addEventListener('input', () => updateMeta(input.dataset.meta, input.value));
    });
}

function field(label, key, value, placeholder) {
    return `
        <div class="field">
            <label>${label}</label>
            <input data-meta="${key}" value="${esc(value || '')}" placeholder="${esc(placeholder)}" />
        </div>
    `;
}

function renderSectionTabs() {
    const paper = getActivePaper();
    if (!paper) return;
    els.sectionTabs.innerHTML = `
        ${paper.sections.map(section => `
            <button class="section-tab ${section.id === state.activeSectionId ? 'active' : ''}" data-section="${section.id}">
                ${esc(section.name)} · ${section.questions.length}
            </button>
        `).join('')}
        <button class="section-tab" id="addSectionBtn">+ Section</button>
    `;
    els.sectionTabs.querySelectorAll('[data-section]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.activeSectionId = btn.dataset.section;
            render();
        });
    });
    document.getElementById('addSectionBtn').addEventListener('click', addSection);
}

function renderWorkbench() {
    const section = getActiveSection();
    if (!section) {
        els.workbench.innerHTML = `<div class="empty-state"><strong>No section selected</strong>Add a section to start writing questions.</div>`;
        return;
    }

    els.workbench.innerHTML = `
        <div class="workbench-head">
            <div class="workbench-title">
                <input id="sectionNameInput" value="${esc(section.name)}" />
            </div>
            <div class="question-tools">
                <button class="small-btn success" id="addQuestionBtn">+ Question</button>
                <button class="small-btn" id="duplicateSectionBtn">Duplicate</button>
                <button class="small-btn danger" id="deleteSectionBtn">Delete</button>
            </div>
        </div>
        ${section.questions.length ? section.questions.map((question, index) => questionCard(question, index)).join('') : emptyQuestions()}
    `;

    document.getElementById('sectionNameInput').addEventListener('input', e => {
        section.name = e.target.value || 'Untitled Section';
        renderSectionTabs();
        renderTeacherPanel();
        save();
    });
    document.getElementById('addQuestionBtn').addEventListener('click', () => addQuestion(section.id));
    document.getElementById('duplicateSectionBtn').addEventListener('click', duplicateSection);
    document.getElementById('deleteSectionBtn').addEventListener('click', deleteSection);

    bindRichEditors();

    els.workbench.querySelectorAll('[data-correct]').forEach(input => {
        input.addEventListener('change', () => {
            findQuestion(input.dataset.qid).correctIndex = Number(input.dataset.correct);
            render();
        });
    });

    els.workbench.querySelectorAll('[data-layout]').forEach(btn => {
        btn.addEventListener('click', () => {
            findQuestion(btn.dataset.qid).layout = btn.dataset.layout;
            render();
        });
    });

    els.workbench.querySelectorAll('[data-question-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.questionAction;
            const question = findQuestion(btn.dataset.qid);
            if (action === 'duplicate') duplicateQuestion(question.id);
            if (action === 'delete') deleteQuestion(question.id);
            if (action === 'move-up') moveQuestion(question.id, -1);
            if (action === 'move-down') moveQuestion(question.id, 1);
        });
    });

    els.workbench.querySelectorAll('[data-remove-image]').forEach(btn => {
        btn.addEventListener('click', () => {
            const question = findQuestion(btn.dataset.qid);
            const field = btn.dataset.field;
            const index = Number(btn.dataset.index);
            removeImageFromQuestionField(question, field, index);
            render();
        });
    });
}

function questionCard(question, index) {
    return `
        <article class="question-card" data-card="${question.id}">
            <div class="question-head">
                <span class="q-number">${index + 1}</span>
                <div>
                    ${richEditor({
                        id: `${question.id}-text`,
                        qid: question.id,
                        field: 'text',
                        value: question.text,
                        placeholder: 'Type question. Paste images here. Use math like \\(x^2\\).'
                    })}
                    <div class="paste-hint">Paste images directly at the cursor. Use simple markdown for bold, italics, and math.</div>
                </div>
                <div class="question-tools">
                    <button class="small-btn" data-question-action="move-up" data-qid="${question.id}">↑</button>
                    <button class="small-btn" data-question-action="move-down" data-qid="${question.id}">↓</button>
                    <button class="small-btn" data-question-action="duplicate" data-qid="${question.id}">Copy</button>
                    <button class="small-btn danger" data-question-action="delete" data-qid="${question.id}">Delete</button>
                </div>
            </div>
            <div class="options-grid ${question.layout}">
                ${question.options.map((option, optionIndex) => optionCard(question, option, optionIndex)).join('')}
            </div>
            <div class="layout-row">
                <div class="segmented">
                    ${LAYOUTS.map(layout => `
                        <button class="${question.layout === layout.id ? 'active' : ''}" data-layout="${layout.id}" data-qid="${question.id}">${layout.label}</button>
                    `).join('')}
                </div>
                <span class="paste-hint">Answer: ${LABELS[question.correctIndex] || 'A'}</span>
            </div>
        </article>
    `;
}

function optionCard(question, option, optionIndex) {
    return `
        <div class="option-card ${question.correctIndex === optionIndex ? 'correct' : ''}">
            <span class="option-label">${LABELS[optionIndex]}.</span>
            <div>
                ${richEditor({
                    id: `${question.id}-option-${optionIndex}`,
                    qid: question.id,
                    option: optionIndex,
                    field: `options.${optionIndex}.text`,
                    value: option.text,
                    placeholder: `Option ${LABELS[optionIndex]}`
                })}
            </div>
            <input class="correct-radio" type="radio" name="correct-${question.id}" ${question.correctIndex === optionIndex ? 'checked' : ''} data-correct="${optionIndex}" data-qid="${question.id}" title="Correct answer" />
            <span></span>
        </div>
    `;
}

function richEditor({ id, qid, option = '', field, value, placeholder }) {
    const imageMap = extractImages(value).map(img => img.src);
    const mapAttr = esc(JSON.stringify(imageMap));
    const codeValue = codeFromMarkdown(value);
    return `
        <div class="rich-editor" data-rich-editor data-editor-id="${esc(id)}" data-qid="${esc(qid)}" data-option="${esc(option)}" data-field="${esc(field)}">
            <div class="editor-toolbar">
                <button type="button" class="tool-btn" data-format="bold" data-editor-id="${esc(id)}" title="Bold"><b>B</b></button>
                <button type="button" class="tool-btn" data-format="italic" data-editor-id="${esc(id)}" title="Italic"><i>I</i></button>
                <button type="button" class="tool-btn" data-toggle-code data-editor-id="${esc(id)}" title="Show code">Code</button>
            </div>
            <div class="editor visual-editor"
                 contenteditable="true"
                 data-visual-editor
                 data-editor-id="${esc(id)}"
                 data-placeholder="${esc(placeholder)}">${markdownToVisualHtml(value)}</div>
            <textarea class="editor code-editor"
                      data-code-editor
                      data-editor-id="${esc(id)}"
                      data-image-map="${mapAttr}"
                      placeholder="Markdown code">${esc(codeValue)}</textarea>
        </div>
    `;
}

function bindRichEditors() {
    els.workbench.querySelectorAll('[data-visual-editor]').forEach(editor => {
        editor.addEventListener('input', () => {
            updateFieldFromEditor(editor.dataset.editorId, markdownFromVisual(editor));
        });
        editor.addEventListener('blur', () => {
            updateFieldFromEditor(editor.dataset.editorId, markdownFromVisual(editor));
            render();
        });
    });

    els.workbench.querySelectorAll('[data-code-editor]').forEach(editor => {
        editor.addEventListener('input', () => {
            autoResize(editor);
            updateFieldFromEditor(editor.dataset.editorId, markdownFromCode(editor.value, editor.dataset.imageMap));
        });
        autoResize(editor);
    });

    els.workbench.querySelectorAll('[data-format]').forEach(btn => {
        btn.addEventListener('click', () => applyFormat(btn.dataset.editorId, btn.dataset.format));
    });

    els.workbench.querySelectorAll('[data-toggle-code]').forEach(btn => {
        btn.addEventListener('click', () => toggleCodeMode(btn.dataset.editorId));
    });
}

function updateFieldFromEditor(editorId, markdown) {
    const wrapper = document.querySelector(`[data-rich-editor][data-editor-id="${cssEscape(editorId)}"]`);
    if (!wrapper) return;
    const question = findQuestion(wrapper.dataset.qid);
    if (!question) return;
    setQuestionField(question, wrapper.dataset.field, markdown);
    renderTeacherPanel();
    save();
}

function setQuestionField(question, field, value) {
    if (field === 'text') {
        question.text = value;
        return;
    }
    const optionMatch = field.match(/^options\.(\d+)\.text$/);
    if (optionMatch) {
        const option = question.options[Number(optionMatch[1])];
        if (option) option.text = value;
    }
}

function getQuestionField(question, field) {
    if (field === 'text') return question.text;
    const optionMatch = field.match(/^options\.(\d+)\.text$/);
    if (optionMatch) return question.options[Number(optionMatch[1])]?.text || '';
    return '';
}

function toggleCodeMode(editorId) {
    const wrapper = document.querySelector(`[data-rich-editor][data-editor-id="${cssEscape(editorId)}"]`);
    if (!wrapper) return;
    const codeEditor = wrapper.querySelector('[data-code-editor]');
    const visualEditor = wrapper.querySelector('[data-visual-editor]');
    const showingCode = wrapper.classList.toggle('show-code');
    const question = findQuestion(wrapper.dataset.qid);
    const markdown = question ? getQuestionField(question, wrapper.dataset.field) : '';
    if (showingCode) {
        codeEditor.dataset.imageMap = JSON.stringify(extractImages(markdown).map(img => img.src));
        codeEditor.value = codeFromMarkdown(markdown);
        autoResize(codeEditor);
        codeEditor.focus();
    } else {
        const restored = markdownFromCode(codeEditor.value, codeEditor.dataset.imageMap);
        updateFieldFromEditor(editorId, restored);
        visualEditor.innerHTML = markdownToVisualHtml(restored);
        visualEditor.focus();
    }
}

function applyFormat(editorId, format) {
    const wrapper = document.querySelector(`[data-rich-editor][data-editor-id="${cssEscape(editorId)}"]`);
    if (!wrapper) return;
    if (wrapper.classList.contains('show-code')) {
        wrapCodeSelection(wrapper.querySelector('[data-code-editor]'), format);
        return;
    }
    const visual = wrapper.querySelector('[data-visual-editor]');
    visual.focus();
    document.execCommand(format === 'bold' ? 'bold' : 'italic', false, null);
    updateFieldFromEditor(editorId, markdownFromVisual(visual));
}

function wrapCodeSelection(textarea, format) {
    const marker = format === 'bold' ? '**' : '*';
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || start;
    const selected = textarea.value.slice(start, end) || 'text';
    textarea.value = textarea.value.slice(0, start) + marker + selected + marker + textarea.value.slice(end);
    textarea.setSelectionRange(start + marker.length, start + marker.length + selected.length);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
}

function emptyQuestions() {
    return `<div class="empty-state"><strong>No questions yet</strong><button class="btn primary" onclick="addQuestion('${state.activeSectionId}')">Add first question</button></div>`;
}

function imageStrip(markdown, qid, field) {
    const images = extractImages(markdown);
    if (!images.length) return '';
    return `
        <div class="image-strip">
            ${images.map((img, index) => `
                <span class="image-chip">
                    <img src="${img.src}" alt="${esc(img.alt)}" />
                    <button data-remove-image data-qid="${qid}" data-field="${field}" data-index="${index}" title="Remove image">x</button>
                </span>
            `).join('')}
        </div>
    `;
}

function markdownToVisualHtml(markdown) {
    const source = String(markdown || '');
    if (!source.trim()) return '';
    let html = '';
    const tokenRe = /!\[([^\]]*)\]\((data:image\/[^)]+)\)|\\\(([\s\S]+?)\\\)|\*\*([^*]+)\*\*|\*([^*]+)\*|\n/g;
    let last = 0;
    let match;
    while ((match = tokenRe.exec(source))) {
        html += esc(source.slice(last, match.index));
        if (match[2]) {
            html += `<img class="editor-image" src="${match[2]}" alt="${esc(match[1] || 'image')}" data-src="${match[2]}" data-alt="${esc(match[1] || 'image')}" contenteditable="false">`;
        } else if (match[3]) {
            html += mathHtml(match[3]);
        } else if (match[4]) {
            html += `<strong>${esc(match[4])}</strong>`;
        } else if (match[5]) {
            html += `<em>${esc(match[5])}</em>`;
        } else {
            html += '<br>';
        }
        last = tokenRe.lastIndex;
    }
    html += esc(source.slice(last));
    return html;
}

function mathHtml(latex) {
    const safeLatex = esc(latex);
    let rendered = safeLatex;
    if (window.katex) {
        try {
            rendered = katex.renderToString(latex, { throwOnError: false });
        } catch (err) {
            rendered = safeLatex;
        }
    }
    return `<span class="math-token" data-latex="${safeLatex}" contenteditable="false">${rendered}</span>`;
}

function markdownFromVisual(root) {
    return Array.from(root.childNodes).map(nodeToMarkdown).join('').replace(/\u00a0/g, ' ').trim();
}

function nodeToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node;
    if (el.matches('br')) return '\n';
    if (el.matches('img.editor-image')) {
        return `![${el.dataset.alt || 'image'}](${el.dataset.src || el.src})`;
    }
    if (el.matches('.math-token')) {
        return `\\(${el.dataset.latex || el.textContent || ''}\\)`;
    }
    const content = Array.from(el.childNodes).map(nodeToMarkdown).join('');
    if (el.matches('strong,b')) return `**${content}**`;
    if (el.matches('em,i')) return `*${content}*`;
    if (el.matches('div,p')) return `${content}\n`;
    return content;
}

function codeFromMarkdown(markdown) {
    let index = 0;
    return String(markdown || '').replace(/!\[([^\]]*)\]\((data:image\/[^)]+)\)/g, (_, alt) => {
        index += 1;
        return `![${alt || `image ${index}`}](image:${index})`;
    });
}

function markdownFromCode(code, imageMapJson) {
    let imageMap = [];
    try {
        imageMap = JSON.parse(imageMapJson || '[]');
    } catch (err) {
        imageMap = [];
    }
    return String(code || '').replace(/!\[([^\]]*)\]\(image:(\d+)\)/g, (full, alt, ref) => {
        const src = imageMap[Number(ref) - 1];
        return src ? `![${alt || 'image'}](${src})` : full;
    });
}

function renderTeacherPanel() {
    const paper = getActivePaper();
    if (!paper) return;
    const questions = allQuestions(paper);
    const unanswered = questions.filter(q => !q.options.some(o => o.text.trim())).length;
    els.teacherPanel.innerHTML = `
        <div class="teacher-card">
            <h3>Paper Check</h3>
            <div class="stat-grid">
                <div class="stat"><b>${questions.length}</b><span>Questions</span></div>
                <div class="stat"><b>${paper.sections.length}</b><span>Sections</span></div>
                <div class="stat"><b>${totalMarks(paper)}</b><span>Marks</span></div>
                <div class="stat"><b>${unanswered}</b><span>Need options</span></div>
            </div>
        </div>
        <div class="teacher-card">
            <h3>Answer Key</h3>
            <div class="answer-key">
                ${questions.length ? questions.map((q, i) => `
                    <div class="answer-key-row"><span>${i + 1}</span><b>${LABELS[q.correctIndex] || 'A'}</b></div>
                `).join('') : '<span class="paste-hint">No questions yet.</span>'}
            </div>
        </div>
        <div class="teacher-card">
            <h3>Quick Flow</h3>
            <div class="answer-key">
                <span>1. Fill paper details.</span>
                <span>2. Add sections and questions.</span>
                <span>3. Select the correct answer.</span>
                <span>4. Choose option layout per question.</span>
                <span>5. Export Word or print.</span>
            </div>
        </div>
    `;
}

function updateMeta(key, value) {
    const paper = getActivePaper();
    if (!paper) return;
    if (key === 'title') paper.title = value || 'Untitled Paper';
    else paper.meta[key] = value;
    renderPaperList();
    renderTeacherPanel();
    save();
}

function createPaper() {
    const paper = {
        id: uid('paper'),
        title: `Question Paper ${state.papers.length + 1}`,
        meta: {
            className: '',
            subject: '',
            testName: '',
            duration: '',
            marks: '',
            instructions: '',
        },
        sections: [{ id: uid('section'), name: 'Section 1', questions: [] }],
    };
    state.papers.push(paper);
    state.activePaperId = paper.id;
    state.activeSectionId = paper.sections[0].id;
    render();
    toast('New paper created');
}

function addSection() {
    const paper = getActivePaper();
    const section = { id: uid('section'), name: `Section ${paper.sections.length + 1}`, questions: [] };
    paper.sections.push(section);
    state.activeSectionId = section.id;
    render();
}

function duplicateSection() {
    const paper = getActivePaper();
    const section = getActiveSection();
    const copy = deepCopy(section);
    copy.id = uid('section');
    copy.name = `${section.name} Copy`;
    copy.questions.forEach(q => {
        q.id = uid('q');
        q.options.forEach((o, i) => o.id = uid(`opt${i}`));
    });
    paper.sections.push(copy);
    state.activeSectionId = copy.id;
    render();
}

function deleteSection() {
    const paper = getActivePaper();
    if (paper.sections.length === 1) {
        toast('Keep at least one section');
        return;
    }
    if (!confirm('Delete this section and all questions?')) return;
    paper.sections = paper.sections.filter(s => s.id !== state.activeSectionId);
    state.activeSectionId = paper.sections[0].id;
    render();
}

function addQuestion(sectionId) {
    const section = getActivePaper().sections.find(s => s.id === sectionId);
    section.questions.push(newQuestion('', ['', '', '', ''], 0));
    render();
    setTimeout(() => {
        const cards = document.querySelectorAll('.question-card');
        const last = cards[cards.length - 1];
        last?.querySelector('[data-visual-editor]')?.focus();
    }, 40);
}

function duplicateQuestion(qid) {
    const section = getActiveSection();
    const index = section.questions.findIndex(q => q.id === qid);
    const copy = deepCopy(section.questions[index]);
    copy.id = uid('q');
    copy.options.forEach((o, i) => o.id = uid(`opt${i}`));
    section.questions.splice(index + 1, 0, copy);
    render();
}

function deleteQuestion(qid) {
    if (!confirm('Delete this question?')) return;
    const section = getActiveSection();
    section.questions = section.questions.filter(q => q.id !== qid);
    render();
}

function moveQuestion(qid, delta) {
    const section = getActiveSection();
    const index = section.questions.findIndex(q => q.id === qid);
    const next = index + delta;
    if (next < 0 || next >= section.questions.length) return;
    const [question] = section.questions.splice(index, 1);
    section.questions.splice(next, 0, question);
    render();
}

function findQuestion(qid) {
    for (const section of getActivePaper().sections) {
        const question = section.questions.find(q => q.id === qid);
        if (question) return question;
    }
    return null;
}

function handlePaste(event) {
    const target = event.target;
    const codeEditor = target instanceof HTMLTextAreaElement ? target.closest('[data-code-editor]') : null;
    const visualEditor = target instanceof HTMLElement ? target.closest('[data-visual-editor]') : null;
    if (!codeEditor && !visualEditor) return;
    const item = [...(event.clipboardData?.items || [])].find(entry => entry.type.startsWith('image/'));
    if (!item) return;
    event.preventDefault();
    const reader = new FileReader();
    reader.onload = () => {
        if (codeEditor) {
            const imageMap = JSON.parse(codeEditor.dataset.imageMap || '[]');
            imageMap.push(reader.result);
            codeEditor.dataset.imageMap = JSON.stringify(imageMap);
            insertAtCursor(codeEditor, `![pasted image](image:${imageMap.length})`);
            codeEditor.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            insertImageIntoVisualEditor(visualEditor, reader.result);
            updateFieldFromEditor(visualEditor.dataset.editorId, markdownFromVisual(visualEditor));
        }
        toast('Image inserted');
    };
    reader.readAsDataURL(item.getAsFile());
}

function insertImageIntoVisualEditor(editor, src) {
    editor.focus();
    const img = document.createElement('img');
    img.className = 'editor-image';
    img.src = src;
    img.alt = 'pasted image';
    img.dataset.src = src;
    img.dataset.alt = 'pasted image';
    img.contentEditable = 'false';
    const selection = window.getSelection();
    if (selection && selection.rangeCount) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);
        const spacer = document.createTextNode(' ');
        img.after(spacer);
        range.setStartAfter(spacer);
        range.setEndAfter(spacer);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        editor.append(img);
    }
}

function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const lead = before && !before.endsWith('\n') ? '\n' : '';
    const trail = after && !after.startsWith('\n') ? '\n' : '';
    const insert = `${lead}${text}${trail}`;
    textarea.value = before + insert + after;
    const pos = before.length + insert.length;
    textarea.setSelectionRange(pos, pos);
    autoResize(textarea);
}

function extractImages(markdown) {
    const images = [];
    const re = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;
    let match;
    while ((match = re.exec(markdown || ''))) {
        images.push({ alt: match[1] || 'image', src: match[2] });
    }
    return images;
}

function removeMarkdownImage(value, imageIndex) {
    let index = -1;
    return String(value || '').replace(/!\[[^\]]*\]\(data:image\/[^)]+\)/g, match => {
        index += 1;
        return index === imageIndex ? '' : match;
    }).replace(/\n{3,}/g, '\n\n').trim();
}

function removeImageFromQuestionField(question, field, imageIndex) {
    if (field === 'text') {
        question.text = removeMarkdownImage(question.text, imageIndex);
        return;
    }
    const optionMatch = field.match(/^options\.(\d+)\.text$/);
    if (optionMatch) {
        const option = question.options[Number(optionMatch[1])];
        if (option) option.text = removeMarkdownImage(option.text, imageIndex);
    }
}

function allQuestions(paper) {
    return paper.sections.flatMap(section => section.questions);
}

function countQuestions(paper) {
    return allQuestions(paper).length;
}

function totalMarks(paper) {
    return allQuestions(paper).reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
}

function exportBackup() {
    downloadBlob(
        new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
        `mcq-paper-backup-${Date.now()}.json`
    );
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const imported = JSON.parse(reader.result);
            state = Array.isArray(imported) ? { papers: imported, activePaperId: imported[0]?.id, activeSectionId: imported[0]?.sections?.[0]?.id } : imported;
            normalize();
            render();
            toast('Imported');
        } catch (err) {
            toast('Import failed');
        } finally {
            els.fileInput.value = '';
        }
    };
    reader.readAsText(file);
}

function exportWord() {
    const paper = getActivePaper();
    if (!paper) return;
    const html = buildWordHtml(paper);
    downloadBlob(new Blob([html], { type: 'application/msword' }), `${fileName(paper.title)}.doc`);
    toast('Word file exported');
}

function buildWordHtml(paper) {
    const questionBlocks = [];
    let globalIndex = 0;
    paper.sections.forEach(section => {
        if (!section.questions.length) return;
        questionBlocks.push(`<h2>${esc(section.name)}</h2>`);
        section.questions.forEach(question => {
            globalIndex += 1;
            questionBlocks.push(`
                <div class="question">
                    <p><b>${globalIndex})</b> ${formatForWord(question.text)}</p>
                    ${optionsForWord(question)}
                </div>
            `);
        });
    });
    const key = allQuestions(paper).map((q, i) => `${i + 1}. ${LABELS[q.correctIndex] || 'A'}`).join('&nbsp;&nbsp;&nbsp;');
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page { margin: 0.65in; }
                body { font-family: "Times New Roman", serif; font-size: 12pt; color: #111; }
                h1 { text-align: center; font-size: 18pt; margin: 0 0 6pt; }
                .meta { text-align: center; margin-bottom: 10pt; }
                .name { margin: 10pt 0; }
                h2 { font-size: 13pt; margin: 12pt 0 6pt; border-bottom: 1px solid #888; }
                .question { page-break-inside: avoid; margin: 0 0 8pt; }
                .options { width: 100%; border-collapse: collapse; margin-left: 18pt; }
                .options td { vertical-align: top; padding: 2pt 8pt 2pt 0; }
                img { max-width: 180px; max-height: 120px; vertical-align: middle; }
                .answer-key { margin-top: 18pt; border-top: 1px solid #888; padding-top: 8pt; }
            </style>
        </head>
        <body>
            <h1>${esc(paper.title)}</h1>
            <div class="meta">
                Class: ${esc(paper.meta.className || '')} &nbsp;&nbsp;
                Subject: ${esc(paper.meta.subject || '')} &nbsp;&nbsp;
                ${esc(paper.meta.testName || '')} &nbsp;&nbsp;
                Time: ${esc(paper.meta.duration || '')} &nbsp;&nbsp;
                Marks: ${esc(paper.meta.marks || totalMarks(paper))}
            </div>
            <div class="name">Name: ________________________________</div>
            ${paper.meta.instructions ? `<p><b>Instructions:</b> ${formatForWord(paper.meta.instructions)}</p>` : ''}
            ${questionBlocks.join('')}
            <div class="answer-key"><b>Answer Key:</b><br>${key}</div>
        </body>
        </html>
    `;
}

function optionsForWord(question) {
    const rows = question.layout === 'row'
        ? [[0, 1, 2, 3]]
        : question.layout === 'grid2'
            ? [[0, 1], [2, 3]]
            : [[0], [1], [2], [3]];
    return `
        <table class="options">
            ${rows.map(row => `
                <tr>
                    ${row.map(index => `<td><b>${LABELS[index]}.</b> ${formatForWord(question.options[index]?.text || '')}</td>`).join('')}
                </tr>
            `).join('')}
        </table>
    `;
}

function formatForWord(value) {
    return esc(value || '')
        .replace(/!\[([^\]]*)\]\((data:image\/[^)]+)\)/g, '<img alt="$1" src="$2">')
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
        .replace(/\*([^*]+)\*/g, '<i>$1</i>')
        .replace(/\\\((.*?)\\\)/g, '<span>$1</span>')
        .replace(/\n/g, '<br>');
}

function downloadBlob(blob, name) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
}

function fileName(value) {
    return (value || 'question-paper').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_');
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function renderMathSoon() {
    requestAnimationFrame(() => {
        if (!window.renderMathInElement) return;
        try {
            renderMathInElement(document.body, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false },
                ],
                ignoredTags: ['textarea', 'script', 'style'],
                throwOnError: false,
            });
        } catch (err) {}
    });
}

function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(els.toast._timer);
    els.toast._timer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function deepCopy(value) {
    return JSON.parse(JSON.stringify(value));
}

function esc(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function cssEscape(value) {
    if (window.CSS && typeof CSS.escape === 'function') return CSS.escape(value);
    return String(value).replace(/["\\]/g, '\\$&');
}

'use strict';

const STORAGE_KEY_SUBJECTS = 'app_subjects_data';
const STORAGE_KEY_TEACHERS = 'app_teachers_data';

let subjects = [];
let teachers = [];

const ui = {};


function el(tag, props, children) {
  const node = document.createElement(tag);

  if (props) {
    Object.keys(props).forEach(key => {
      if (key === 'on') {
        Object.keys(props.on).forEach(evt => node.addEventListener(evt, props.on[evt]));
      } else if (key in node) {
        node[key] = props[key];
      } else {
        node.setAttribute(key, props[key]);
      }
    });
  }

  if (children) {
    children.forEach(child => {
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
  }

  return node;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}


function buildTable(columns) {
  const headRow = el('tr', null, columns.map(col => {
    const th = el('th', null, [col.title]);
    if (col.width) th.style.width = col.width;
    return th;
  }));

  const tbody = el('tbody');
  const table = el('table', null, [el('thead', null, [headRow]), tbody]);

  return { table, tbody, columnCount: columns.length };
}

function buildSubjectsSection() {
  ui.subjectInput = el('input', {
    type: 'text',
    placeholder: 'Назва дисципліни',
    required: true
  });

  const form = el('form', { on: { submit: onSubjectSubmit } }, [
    ui.subjectInput,
    el('button', { type: 'submit' }, ['Додати дисципліну '])
  ]);

  ui.subjectsTable = buildTable([
    { title: '№' },
    { title: 'Назва' },
    { title: 'Кількість викладачів ' },
    { title: 'Дії', width: '100px' }
  ]);

  return el('section', null, [
    el('h2', null, ['1. Дисципліни']),
    form,
    ui.subjectsTable.table
  ]);
}

function buildTeachersSection() {
  ui.teacherInput = el('input', {
    type: 'text',
    placeholder: 'ПІБ викладача',
    required: true
  });

  ui.subjectSelect = el('select', { required: true });

  const form = el('form', { on: { submit: onTeacherSubmit } }, [
    ui.teacherInput,
    ui.subjectSelect,
    el('button', { type: 'submit' }, ['Додати викладача'])
  ]);

  ui.teachersTable = buildTable([
    { title: '№' },
    { title: 'Викладач' },
    { title: 'Закріплена дисципліна' },
    { title: 'Дії', width: '100px' }
  ]);

  return el('section', null, [
    el('h2', null, ['2. Викладачі']),
    form,
    ui.teachersTable.table
  ]);
}

function buildPage() {
  const app = document.getElementById('app');
  clear(app);

  app.appendChild(el('h1', null, ['Управління дисциплінами та викладачами']));
  app.appendChild(buildSubjectsSection());
  app.appendChild(buildTeachersSection());
}


function readArray(key) {
  try {
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Помилка читання localStorage (' + key + '):', e);
    return [];
  }
}

function loadData() {
  subjects = readArray(STORAGE_KEY_SUBJECTS);
  teachers = readArray(STORAGE_KEY_TEACHERS);

  let migrated = false;
  teachers.forEach(t => {
    if (t.subjectId === undefined && t.subject !== undefined) {
      const found = subjects.find(s => s.name === t.subject);
      t.subjectId = found ? found.id : null;
      delete t.subject;
      migrated = true;
    }
  });
  if (migrated) saveTeachers();
}

function saveSubjects() {
  localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(subjects));
}

function saveTeachers() {
  localStorage.setItem(STORAGE_KEY_TEACHERS, JSON.stringify(teachers));
}

function nextId(list) {
  return list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function findSubject(id) {
  return subjects.find(s => s.id === id);
}

function emptyRow(text, columnCount) {
  return el('tr', null, [el('td', { colSpan: columnCount, className: 'empty' }, [text])]);
}

function deleteButton(handler) {
  return el('button', { type: 'button', className: 'btn-del', on: { click: handler } }, ['Видалити']);
}

function renderSubjectsTable() {
  const { tbody, columnCount } = ui.subjectsTable;
  clear(tbody);

  if (subjects.length === 0) {
    tbody.appendChild(emptyRow('Дисциплін ще немає', columnCount));
    return;
  }

  subjects.forEach((subject, index) => {
    const count = teachers.filter(t => t.subjectId === subject.id).length;

    tbody.appendChild(el('tr', null, [
      el('td', null, [String(index + 1)]),
      el('td', null, [subject.name]),
      el('td', null, [String(count)]),
      el('td', null, [deleteButton(() => deleteSubject(subject.id))])
    ]));
  });
}

function renderSubjectSelect() {
  const select = ui.subjectSelect;
  const previousValue = select.value; 
  clear(select);

  select.appendChild(el('option', {
    value: '',
    disabled: true,
    selected: true
  }, [subjects.length ? 'Оберіть дисципліну...' : 'Спочатку додайте дисципліну']));

  subjects.forEach(subject => {
    select.appendChild(el('option', { value: String(subject.id) }, [subject.name]));
  });

  if (previousValue && findSubject(Number(previousValue))) {
    select.value = previousValue;
  }
}

function renderTeachersTable() {
  const { tbody, columnCount } = ui.teachersTable;
  clear(tbody);

  if (teachers.length === 0) {
    tbody.appendChild(emptyRow('Викладачів ще немає', columnCount));
    return;
  }

  teachers.forEach((teacher, index) => {
    const subject = findSubject(teacher.subjectId);

    tbody.appendChild(el('tr', null, [
      el('td', null, [String(index + 1)]),
      el('td', null, [teacher.name]),
      el('td', null, [subject ? subject.name : '— (дисципліну видалено)']),
      el('td', null, [deleteButton(() => deleteTeacher(teacher.id))])
    ]));
  });
}

function renderAll() {
  renderSubjectsTable();
  renderSubjectSelect();
  renderTeachersTable();
}

function onSubjectSubmit(e) {
  e.preventDefault();
  const name = ui.subjectInput.value.trim();
  if (!name) return;

  const duplicate = subjects.some(s => s.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    alert('Така дисципліна вже існує');
    return;
  }

  subjects.push({ id: nextId(subjects), name: name });
  saveSubjects();
  renderAll();

  ui.subjectInput.value = '';
  ui.subjectInput.focus();
}

function onTeacherSubmit(e) {
  e.preventDefault();
  const name = ui.teacherInput.value.trim();
  const subjectId = Number(ui.subjectSelect.value);

  if (!name || !findSubject(subjectId)) return;

  teachers.push({ id: nextId(teachers), name: name, subjectId: subjectId });
  saveTeachers();
  renderAll(); 

  ui.teacherInput.value = '';
  ui.subjectSelect.selectedIndex = 0;
  ui.teacherInput.focus();
}

function deleteSubject(id) {
  const linked = teachers.filter(t => t.subjectId === id);

  if (linked.length > 0) {
    const ok = confirm(
      'За цією дисципліною закріплено викладачів: ' + linked.length +
      '.\nВидалити дисципліну разом із ними?'
    );
    if (!ok) return;

    teachers = teachers.filter(t => t.subjectId !== id);
    saveTeachers();
  }

  subjects = subjects.filter(s => s.id !== id);
  saveSubjects();
  renderAll();
}

function deleteTeacher(id) {
  teachers = teachers.filter(t => t.id !== id);
  saveTeachers();
  renderAll();
}


window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY_SUBJECTS ||
      event.key === STORAGE_KEY_TEACHERS ||
      event.key === null) { // null — localStorage.clear()
    loadData();
    renderAll();
  }
});


buildPage();
loadData();
renderAll();

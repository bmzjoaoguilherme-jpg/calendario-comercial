const YEAR = 2026;
const MONTH_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTH_SHORT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

// Metas padrão (total do mês por pessoa) e do time — usadas em qualquer mês ainda não editado
const DEFAULT_GOALS = {
  "Equipe": 67,
  "Cauã": 12,
  "Elaine": 21,
  "Hilary": 14,
  "João": 12,
  "Letícia": 8
};
const personNames = Object.keys(DEFAULT_GOALS);
const individualNames = personNames.filter(n => n !== 'Equipe');

function daysInMonth(m){ return new Date(YEAR, m + 1, 0).getDate(); }
function firstWeekdayOf(m){ return new Date(YEAR, m, 1).getDay(); }

// Gera a curva acumulada proporcional ao total, redistribuindo os contratos
// igualmente pelos dias do mês para manter o ritmo em dia com a meta
function buildCumulative(total, dim){
  const arr = [];
  for(let d=1; d<=dim; d++){
    arr.push(Math.round(total * d / dim));
  }
  if(dim > 0) arr[arr.length-1] = total; // último dia sempre bate exatamente com a meta
  return arr;
}

let goals = {};       // goals[monthIndex] = { nome: metaTotal }
const progress = {};  // progress[nome] = { monthIndex: { "1": 2, "5": 1, ... } }
individualNames.forEach(name => progress[name] = {});

let currentMonth = 7; // Agosto por padrão
let currentView = 'Equipe';

function getGoals(m){
  if(!goals[m]) goals[m] = { ...DEFAULT_GOALS };
  return goals[m];
}
function getProgressMonth(name, m){
  if(!progress[name][m]) progress[name][m] = {};
  return progress[name][m];
}

const tabsEl = document.getElementById('tabs');
const grid = document.getElementById('grid');
const metaName = document.getElementById('metaName');
const metaTotal = document.getElementById('metaTotal');
const metaRate = document.getElementById('metaRate');
const metaActual = document.getElementById('metaActual');
const metaLabel1 = document.getElementById('metaLabel1');
const monthLabel = document.getElementById('monthLabel');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const editBtn = document.getElementById('editBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
const modalMonthName = document.getElementById('modalMonthName');
const modalSave = document.getElementById('modalSave');
const modalCancel = document.getElementById('modalCancel');

const GOALS_KEY = 'mamba-negra:goals';
function storageKeyProgress(name){ return 'mamba-negra:progress:' + name; }

function loadAll(){
  try{
    const raw = localStorage.getItem(GOALS_KEY);
    goals = raw ? JSON.parse(raw) : {};
  } catch(e){
    goals = {};
  }
  for(const name of individualNames){
    try{
      const raw = localStorage.getItem(storageKeyProgress(name));
      progress[name] = raw ? JSON.parse(raw) : {};
    } catch(e){
      progress[name] = progress[name] || {};
    }
  }
}

function saveGoals(){
  try{
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch(e){
    // localStorage indisponível (modo privado, por exemplo) — segue só na tela
  }
}

function saveProgress(name){
  try{
    localStorage.setItem(storageKeyProgress(name), JSON.stringify(progress[name]));
  } catch(e){
    // localStorage indisponível (modo privado, por exemplo) — segue só na tela
  }
}

function getDailyActual(name, day, m){
  if(name === 'Equipe'){
    return individualNames.reduce((sum, n) => sum + (getProgressMonth(n, m)[day] || 0), 0);
  }
  return getProgressMonth(name, m)[day] || 0;
}

function getActualCumulative(name, uptoDay, m){
  let sum = 0;
  for(let d=1; d<=uptoDay; d++) sum += getDailyActual(name, d, m);
  return sum;
}

function updateMonthLabel(){
  monthLabel.textContent = MONTH_FULL[currentMonth] + ' · ' + YEAR;
  prevMonthBtn.style.visibility = currentMonth === 0 ? 'hidden' : 'visible';
  nextMonthBtn.style.visibility = currentMonth === 11 ? 'hidden' : 'visible';
}

function render(name){
  currentView = name;
  updateMonthLabel();

  const dim = daysInMonth(currentMonth);
  const fw = firstWeekdayOf(currentMonth);
  const gm = getGoals(currentMonth);
  const total = gm[name] || 0;

  metaLabel1.textContent = name === 'Equipe' ? 'Visão geral' : 'Vendedor';
  metaName.textContent = name;
  metaTotal.textContent = total + ' contratos';
  metaRate.textContent = (dim ? total/dim : 0).toFixed(2).replace('.', ',') + ' / dia';
  metaActual.textContent = getActualCumulative(name, dim, currentMonth);

  const cumulative = buildCumulative(total, dim);
  const editable = name !== 'Equipe';

  grid.innerHTML = '';
  for(let i=0;i<fw;i++){
    const empty = document.createElement('div');
    empty.className='day empty';
    grid.appendChild(empty);
  }

  let prev = 0;
  for(let d=1; d<=dim; d++){
    const cell = document.createElement('div');
    const goal = cumulative[d-1];
    const inc = goal - prev;
    prev = goal;
    const actualToday = getDailyActual(name, d, currentMonth);
    const actualCum = getActualCumulative(name, d, currentMonth);

    const weekday = (fw + (d-1)) % 7;
    let cls = 'day';
    if(weekday===0) cls += ' sunday';
    if(d===dim) cls += ' final';
    if(actualCum >= goal) cls += ' hit'; else if (d < dim) cls += ' behind';
    cell.className = cls;

    cell.innerHTML = `
      <div class="num">${d}</div>
      <div class="inc">▲${inc}</div>
      <div class="goal">${goal}</div>
      <div class="actual-row">
        ${editable ? `<div class="actual-btn" data-act="minus" data-day="${d}">−</div>` : ''}
        <div class="actual">${actualToday}</div>
        ${editable ? `<div class="actual-btn" data-act="plus" data-day="${d}">+</div>` : ''}
        <div class="actual-label">${editable ? 'fechados' : 'time'}</div>
      </div>
    `;
    grid.appendChild(cell);
  }

  if(editable){
    grid.querySelectorAll('.actual-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const day = btn.getAttribute('data-day');
        const act = btn.getAttribute('data-act');
        const monthProg = getProgressMonth(name, currentMonth);
        const cur = monthProg[day] || 0;
        const next = act === 'plus' ? cur + 1 : Math.max(0, cur - 1);
        monthProg[day] = next;
        render(name);
        renderLog();
        saveProgress(name);
      });
    });
  }
}

let logFilter = 'Todos';

function renderLog(){
  const logBody = document.getElementById('logBody');
  const logEmpty = document.getElementById('logEmpty');
  const rows = [];

  const namesToShow = logFilter === 'Todos' ? individualNames : [logFilter];

  namesToShow.forEach(name=>{
    const monthProg = getProgressMonth(name, currentMonth);
    Object.keys(monthProg).forEach(day=>{
      const qty = monthProg[day];
      if(qty > 0){
        rows.push({ day: parseInt(day, 10), name, qty });
      }
    });
  });

  rows.sort((a, b) => a.day - b.day || a.name.localeCompare(b.name));

  if(rows.length === 0){
    logBody.innerHTML = '';
    logEmpty.style.display = 'block';
    logEmpty.textContent = logFilter === 'Todos'
      ? 'Nenhum fechamento registrado ainda.'
      : `Nenhum fechamento registrado para ${logFilter} neste mês.`;
    return;
  }
  logEmpty.style.display = 'none';

  logBody.innerHTML = rows.map(r => `
    <tr>
      <td>${String(r.day).padStart(2,'0')} de ${MONTH_SHORT[currentMonth]}</td>
      <td>${r.name}</td>
      <td class="qty">${r.qty}</td>
    </tr>
  `).join('');
}

personNames.forEach(name=>{
  const btn = document.createElement('div');
  btn.className = 'tab' + (name==='Equipe' ? ' active' : '');
  btn.textContent = name;
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active');
    render(name);
    renderLog();
  });
  tabsEl.appendChild(btn);
});

const logFilterSelect = document.getElementById('logFilterSelect');
individualNames.forEach(name=>{
  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = name;
  logFilterSelect.appendChild(opt);
});
logFilterSelect.addEventListener('change', ()=>{
  logFilter = logFilterSelect.value;
  renderLog();
});

prevMonthBtn.addEventListener('click', ()=>{
  if(currentMonth > 0){
    currentMonth--;
    render(currentView);
    renderLog();
  }
});
nextMonthBtn.addEventListener('click', ()=>{
  if(currentMonth < 11){
    currentMonth++;
    render(currentView);
    renderLog();
  }
});

function openModal(){
  const gm = getGoals(currentMonth);
  modalMonthName.textContent = MONTH_FULL[currentMonth];
  modalBody.innerHTML = personNames.map(name => `
    <div class="modal-row">
      <label>${name === 'Equipe' ? 'Equipe (grupo)' : name}</label>
      <input type="number" min="0" inputmode="numeric" id="goalInput-${name}" value="${gm[name] ?? 0}">
    </div>
  `).join('');
  modalOverlay.style.display = 'flex';
}
function closeModal(){
  modalOverlay.style.display = 'none';
}

editBtn.addEventListener('click', openModal);
modalCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e)=>{ if(e.target === modalOverlay) closeModal(); });

modalSave.addEventListener('click', ()=>{
  const gm = getGoals(currentMonth);
  personNames.forEach(name=>{
    const input = document.getElementById('goalInput-' + name);
    const val = Math.max(0, parseInt(input.value, 10) || 0);
    gm[name] = val; // buildCumulative() redistribui os contratos pelos dias do mês ao renderizar
  });
  closeModal();
  render(currentView);
  renderLog();
  saveGoals();
});

loadAll();
render(currentView);
renderLog();

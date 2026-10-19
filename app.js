// CareNest: simplified, local-only classroom prototype. Not a medical tool.
(() => {
  const KEY = 'carenest-simple-v1';
  const example = () => ({
    medicines: [
      { id: 'a', name: 'Demo Medicine A', dose: '1 tablet', time: '08:00', instructions: 'Check the label before taking your prescribed dose.', reminder: 'Alex, it is time to check Demo Medicine A.', status: 'Due', takenAt: '' },
      { id: 'b', name: 'Demo Medicine B', dose: '1 capsule', time: '13:00', instructions: 'Check the label before taking your prescribed dose.', reminder: 'Alex, it is time to check Demo Medicine B.', status: 'Upcoming', takenAt: '' }
    ],
    alerts: [], reply: ''
  });
  let data;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    data = saved && Array.isArray(saved.medicines) && Array.isArray(saved.alerts) ? saved : example();
  } catch { data = example(); }
  let role = 'user';
  let checking = null; // {id, step, wrong}: the only multistep task
  let editing = null;
  let message = '';
  const app = document.getElementById('app');
  const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId = id => data.medicines.find(m => m.id === id);
  const save = () => localStorage.setItem(KEY, JSON.stringify(data));
  const timeLabel = t => { const [h,m] = t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`; };
  const badge = status => `<span class="status ${status === 'Taken' ? 'taken' : status === 'Due' ? 'due' : status === 'Unconfirmed' ? 'unconfirmed' : status === 'Remind later' ? 'later' : ''}">${escapeHTML(status)}</span>`;
  const bottle = med => `<div class="bottle" role="img" aria-label="Illustration of a sample bottle labeled ${escapeHTML(med.name)}"><div class="lid"></div><div class="body"><div class="label">${escapeHTML(med.name)}</div></div></div>`;
  const button = (text, action, id = '', klass = '') => `<button type="button" class="btn ${klass}" data-action="${action}" data-id="${escapeHTML(id)}">${text}</button>`;
  const statusText = med => med.status === 'Taken' && med.takenAt ? `Confirmed at ${escapeHTML(med.takenAt)}` : med.status;
  const rows = (meds, user = false) => meds.map(m => `<div class="row"><div><div class="row-title">${escapeHTML(m.name)}</div><div class="row-meta">${timeLabel(m.time)} · ${escapeHTML(m.dose)}</div></div><div class="row-controls">${badge(m.status)}${user && m.status !== 'Taken' ? button('Check', 'take', m.id, 'small-btn') : ''}</div></div>`).join('');
  const sortMeds = () => [...data.medicines].sort((a,b) => a.time.localeCompare(b.time));
  const alert = (text, type) => { data.alerts.unshift({ id: String(Date.now()) + Math.random(), text, type, reviewed: false }); save(); };
  function render() {
    document.getElementById('user-role').classList.toggle('selected', role === 'user');
    document.getElementById('caregiver-role').classList.toggle('selected', role === 'caregiver');
    document.getElementById('user-role').setAttribute('aria-pressed', role === 'user');
    document.getElementById('caregiver-role').setAttribute('aria-pressed', role === 'caregiver');
    app.innerHTML = (message ? `<div class="notice" role="status">${escapeHTML(message)}</div>` : '') + (role === 'user' ? userView() : caregiverView());
  }
  function userView() {
    if (checking) return scanView();
    const due = sortMeds().find(m => m.status !== 'Taken');
    const latest = data.reply ? `<div class="notice"><strong>Message from caregiver:</strong> ${escapeHTML(data.reply)}</div>` : '';
    return `<h1>Hello, Alex</h1><p class="muted">Here is your medication reminder for today.</p>${latest}
      <section class="card"><h2>${due ? 'Your next medication' : 'All medications confirmed'}</h2>
      ${due ? `<div class="medication">${bottle(due)}<div class="med-info"><div class="med-name">${escapeHTML(due.name)}</div><p class="dose"><strong>Dose:</strong> ${escapeHTML(due.dose)}</p><p><strong>Time:</strong> ${timeLabel(due.time)}</p>${badge(due.status)}</div></div><p>${escapeHTML(due.instructions)}</p>
      <div class="actions">${button('Take Medication', 'take', due.id, 'primary')}${due.status === 'Remind later' ? button('Show reminder now', 'show', due.id) : button('Remind Me Later', 'later', due.id)}${button('I Need Help', 'help', due.id)}</div>
      <div class="actions">${button('Play audio reminder', 'audio', due.id, 'small-btn')}</div>` : '<p>You have confirmed every scheduled demo medicine. You can check today’s list below.</p>'}</section>
      <section class="card"><h2>Today’s medication schedule</h2>${data.medicines.length ? rows(sortMeds(), true) : '<p>No medications have been added.</p>'}</section>`;
  }
  function scanView() {
    const med = byId(checking.id);
    if (!med) { checking = null; return userView(); }
    if (checking.step === 1) return `<h1>Step 1: Check the bottle</h1><section class="card"><p>Find the bottle labeled <strong>${escapeHTML(med.name)}</strong>.</p><div class="medication">${bottle(med)}<div class="med-info"><strong>${escapeHTML(med.name)}</strong><p>Scheduled for ${timeLabel(med.time)}</p></div></div>
      <p class="small muted">Camera scanning is simulated. Choose a bottle below to test the response.</p>
      <div class="bottle-choice">${button('Correct bottle', 'correct', med.id, 'primary')}${button('Wrong bottle', 'wrong', med.id)}</div>
      ${checking.wrong ? '<div role="alert" class="notice warning"><strong>STOP — this is the wrong bottle.</strong><p>Do not take it. Find the bottle shown above or ask your caregiver for help.</p></div>' : ''}
      <div class="actions">${button('I Need Help', 'help', med.id)}${button('Cancel', 'cancel')}</div></section>`;
    return `<h1>Step 2: Confirm you took it</h1><section class="card"><div class="notice success"><strong>Correct demo bottle selected.</strong></div>
      <div class="medication">${bottle(med)}<div class="med-info"><div class="med-name">${escapeHTML(med.name)}</div><p><strong>Dose:</strong> ${escapeHTML(med.dose)}</p><p>${escapeHTML(med.instructions)}</p></div></div>
      <p>Only press the button below <strong>after</strong> you have taken your medication. A bottle check alone does not mark it taken.</p>
      <div class="actions">${button('Yes, I took it', 'confirm', med.id, 'primary')}${button('Cancel', 'cancel')}</div></section>`;
  }
  function caregiverView() {
    const meds = sortMeds();
    const taken = meds.filter(m => m.status === 'Taken').length;
    const unconfirmed = meds.filter(m => m.status === 'Unconfirmed').length;
    const pendingAlerts = data.alerts.filter(a => !a.reviewed);
    return `<h1>Caregiver dashboard</h1><p class="muted">Alex's medication schedule and requests for help.</p>
      <div class="counts"><div class="count"><strong>${taken}</strong>Taken</div><div class="count"><strong>${meds.length - taken - unconfirmed}</strong>Upcoming / due</div><div class="count"><strong>${unconfirmed}</strong>Unconfirmed</div></div>
      <section class="card"><h2>Medication status</h2>${meds.length ? meds.map(m => `<div class="row"><div><div class="row-title">${escapeHTML(m.name)}</div><div class="row-meta">${timeLabel(m.time)} · ${escapeHTML(m.dose)}${m.takenAt ? ' · ' + escapeHTML(statusText(m)) : ''}</div></div><div class="row-controls">${badge(m.status)}${button('Edit', 'edit', m.id, 'small-btn')}</div></div>`).join('') : '<p>There are no medications yet.</p>'}
      <div class="actions">${button(editing ? 'Cancel edit' : 'Add medication', editing ? 'cancel-edit' : 'add', '', 'primary')}</div>
      ${editing !== null ? formView() : ''}</section>
      <section class="card"><h2>Help requests and alerts (${pendingAlerts.length})</h2>${pendingAlerts.length ? pendingAlerts.map(a => `<div class="row"><div><div class="row-title">${a.type === 'help' ? 'Help requested' : 'Medication unconfirmed'}</div><div class="row-meta">${escapeHTML(a.text)}</div></div><div class="row-controls">${button('Reply', 'reply', a.id, 'small-btn')}${button('Reviewed', 'review', a.id, 'small-btn')}</div></div>`).join('') : '<p>No new alerts.</p>'}</section>
      <section class="card"><h2>Medication history</h2>${meds.filter(m => m.status === 'Taken').length ? meds.filter(m => m.status === 'Taken').map(m => `<p>${escapeHTML(m.name)} — ${escapeHTML(m.takenAt)}</p>`).join('') : '<p>No doses have been confirmed yet.</p>'}</section>`;
  }
  function formView() {
    const m = editing === 'new' ? {name:'',dose:'',time:'08:00',instructions:'',reminder:''} : byId(editing);
    if (!m) return '';
    return `<div class="divider"></div><h3>${editing === 'new' ? 'Add medication' : 'Edit medication'}</h3><form id="med-form" class="form-grid">
      <label class="field">Medication name<input name="name" required maxlength="70" value="${escapeHTML(m.name)}"></label>
      <label class="field">Dose<input name="dose" required maxlength="60" value="${escapeHTML(m.dose)}"></label>
      <label class="field">Time<input name="time" type="time" required value="${escapeHTML(m.time)}"></label>
      <label class="field">Instructions<textarea name="instructions" required maxlength="250">${escapeHTML(m.instructions)}</textarea></label>
      <label class="field">Audio reminder text (spoken by browser)<textarea name="reminder" maxlength="200">${escapeHTML(m.reminder)}</textarea></label>
      <div class="actions"><button class="btn primary" type="submit">Save medication</button>${editing !== 'new' ? button('Remove', 'delete', editing, 'danger') : ''}</div>
    </form>`;
  }
  function notify(text) { message = text; render(); window.scrollTo(0, 0); }
  function abandon() {
    if (!checking) return;
    const m = byId(checking.id);
    if (m && m.status !== 'Taken') { m.status = 'Unconfirmed'; alert(`${m.name} was not fully confirmed.`, 'med'); }
    checking = null;
  }
  function audio(m) {
    const text = m.reminder.trim() || `It is time to check ${m.name}.`;
    if (!('speechSynthesis' in window)) { notify('Audio is not supported in this browser. Reminder: ' + text); return; }
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    notify('Playing the audio reminder.');
  }
  app.addEventListener('click', e => {
    const b = e.target.closest('[data-action]'); if (!b) return;
    const a = b.dataset.action, id = b.dataset.id, med = byId(id);
    message = '';
    if (a === 'take' && med && med.status !== 'Taken') { checking = {id,step:1,wrong:false}; render(); }
    else if (a === 'correct' && checking) { checking.step = 2; render(); }
    else if (a === 'wrong' && checking) { checking.wrong = true; render(); }
    else if (a === 'confirm' && med && checking?.step === 2 && checking.id === id) {
      med.status = 'Taken'; med.takenAt = new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
      checking = null; save(); notify(`${med.name} marked Taken. The caregiver view is updated.`);
    }
    else if (a === 'cancel') { abandon(); notify('Dose not confirmed. Your caregiver can see this status.'); }
    else if (a === 'later' && med) { med.status = 'Remind later'; save(); notify('Reminder delayed. This dose is not marked Taken. Select “Show reminder now” when ready.'); }
    else if (a === 'show' && med) { med.status = 'Due'; save(); notify('Reminder is ready again.'); }
    else if (a === 'help') { alert('Alex asked for help' + (med ? ' with ' + med.name : '') + '.', 'help'); notify('Help request saved in the caregiver dashboard (demo only).'); }
    else if (a === 'audio' && med) audio(med);
    else if (a === 'add') { editing = 'new'; render(); }
    else if (a === 'edit') { editing = id; render(); }
    else if (a === 'cancel-edit') { editing = null; render(); }
    else if (a === 'delete' && med && confirm(`Remove ${med.name} from this demo?`)) { data.medicines = data.medicines.filter(m => m.id !== id); editing = null; save(); notify('Medication removed.'); }
    else if (a === 'review') { const found = data.alerts.find(a => a.id === id); if (found) { found.reviewed = true; save(); notify('Alert marked reviewed.'); } }
    else if (a === 'reply') { data.reply = 'I saw your request. I will help you.'; const found = data.alerts.find(a => a.id === id); if (found) found.reviewed = true; save(); notify('A reassurance message is now visible in Alex’s view.'); }
  });
  app.addEventListener('submit', e => {
    if (e.target.id !== 'med-form') return;
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.target).entries());
    for (const k of ['name','dose','instructions','reminder']) values[k] = values[k].trim();
    if (!values.name || !values.dose || !values.time || !values.instructions) return;
    if (editing === 'new') data.medicines.push({...values,id:'m'+Date.now(),status:'Upcoming',takenAt:''});
    else Object.assign(byId(editing), values);
    editing = null; save(); notify('Medication saved.');
  });
  document.getElementById('user-role').addEventListener('click', () => { abandon(); role = 'user'; message = ''; render(); });
  document.getElementById('caregiver-role').addEventListener('click', () => { abandon(); role = 'caregiver'; editing = null; message = ''; render(); });
  document.getElementById('reset').addEventListener('click', () => { if (!confirm('Reset sample medicines and alerts?')) return; data = example(); checking = null; editing = null; save(); notify('Demo restored to its starting state.'); });
  render();
})();

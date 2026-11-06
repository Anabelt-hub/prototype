    (() => {
      const KEY = 'carenest-simple-v1';
      const ACCOUNTS = { 
	alex: {password: "test123", role: "user"},
	caregiver: {password: "test123", role: "caregiver"}
      };
        const example = () => ({
            medicines: [
                {
                    id: 'a',
                    name: 'Demo Medicine A',
                    dose: '1 tablet',
                    time: '08:00',
                    instructions: 'Check the label before taking your prescribed dose.',
                    reminder: 'Alex, it is time to check Demo Medicine A.',
                    status: 'Upcoming',
                    takenAt: ''
                },
                {
                    id: 'b',
                    name: 'Demo Medicine B',
                    dose: '1 capsule',
                    time: '13:00',
                    instructions: 'Check the label before taking your prescribed dose.',
                    reminder: 'Alex, it is time to check Demo Medicine B.',
                    status: 'Upcoming',
                    takenAt: ''
                }
            ],
            alerts: [],
            history: [],
            reply: ''
        });
     
        let data;
        try {
            const saved = JSON.parse(localStorage.getItem(KEY));
            data = saved && Array.isArray(saved.medicines) && Array.isArray(saved.alerts) ? saved : example();
        } catch {
          data = example();
        }
 
        data.history = data.history || [];
        let role = sessionStorage.getItem('carenest-role');
        let checking = null;
        let helping = null;
        let completed = null;
        let replyingTo = null;
        let editing = null;
        let message = '';
 
        const app = document.getElementById('app');

        const escapeHTML = v =>
        String(v ?? '').replace(/[&<>"']/g, c => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[c]);

        const byId = id => data.medicines.find(m => m.id === id);

        const save = () => localStorage.setItem(KEY, JSON.stringify(data));
	
	const pad = n => String(n).padStart(2, '0');
	const now = () => new Date(Date.now() + (data.clockOffset || 0));
	const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const syncDay = () => {
      const current = now();
      const today = dateKey(current);
      const currentTime = `${pad(current.getHours())}:${pad(current.getMinutes())}`;
      const nowMins = current.getHours() * 60 + current.getMinutes();

      if (data.lastDate && data.lastDate !== today) {
        data.medicines.forEach(m => {
          m.status = 'Upcoming';
          m.takenAt = '';
          m.remindAt = null;
        });
      }
      data.lastDate = today;

      data.medicines.forEach(m => {
        const [h, min] = m.time.split(':').map(Number);
        const minutesLate = nowMins - (h * 60 + min);

        if (m.status === 'Upcoming' && m.time <= currentTime) m.status = 'Due';

        if (m.status === 'Remind later' && m.remindAt && current.getTime() >= m.remindAt) {
          m.status = 'Due';
          m.remindAt = null;
        }

        if ((m.status === 'Due' || m.status === 'Remind later') && minutesLate >= 60) {
          m.status = 'Unconfirmed';
          m.remindAt = null;
          alert(`${m.name} was not confirmed within an hour of ${timeLabel(m.time)}.`, 'med');
        }
      });

      save();
    };

	const skipHour = () => {
        data.clockOffset = (data.clockOffset || 0) + 60 * 60 * 1000;
	};

	const skipToNextDay = () => {
        const target = now();
        target.setDate(target.getDate() + 1);
        target.setHours(7, 0, 0, 0); // 7:00 AM, before the first dose
        data.clockOffset = target.getTime() - Date.now();
	};	
	
	const backToToday = () => {
        data.clockOffset = 0;
	};	

    const timeLabel = t => {
        const [h, m] = t.split(':').map(Number);
        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    };

    const badge = status => {
        const klass =
            status === 'Taken' ? 'taken'
            : status === 'Due' ? 'due'
            : status === 'Unconfirmed' ? 'unconfirmed'
            : status === 'Remind later' ? 'later'
            : '';
        const icon = { Taken: '✓', Due: '!', Unconfirmed: '✕', 'Remind later': '⏱', Upcoming: '•' }[status] || '';
        return `<span class="status ${klass}"><span aria-hidden="true">${icon}</span> ${escapeHTML(status)}</span>`;
    };

    const bottle = med =>
    `<div class="bottle" role="img" aria-label="Illustration of a sample bottle labeled ${escapeHTML(med.name)}">
      <div class="lid"></div>
      <div class="body"><div class="label">${escapeHTML(med.name)}</div></div>
    </div>`;

    const button = (text, action, id = '', klass = '') =>
    `<button type="button" class="btn ${klass}" data-action="${action}" data-id="${escapeHTML(id)}">${text}</button>`;

    const statusText = med =>
    med.status === 'Taken' && med.takenAt ? `Confirmed at ${escapeHTML(med.takenAt)}` : med.status;

        const rows = (meds, user = false) =>
        meds.map(m => `
          <div class="row">
            <div>
              <div class="row-title">${escapeHTML(m.name)}</div>
              <div class="row-meta">${timeLabel(m.time)} · ${escapeHTML(m.dose)}${m.status === 'Taken' && m.takenAt ? ' · Taken at ' + escapeHTML(m.takenAt) : ''}</div>
            </div>
            <div class="row-controls">
              ${badge(m.status)}
              ${user ? button(m.status === 'Taken' ? 'Already taken' : 'Check', 'take', m.id, 'small-btn') : ''}
            </div>
          </div>`).join('');

    const sortMeds = () => [...data.medicines].sort((a, b) => a.time.localeCompare(b.time));

    const alert = (text, type) => {
        data.alerts.unshift({ id: String(Date.now()) + Math.random(), text, type, reviewed: false });
        save();
    };

    function render() {
    syncDay();
    const notice = message ? `<div class="notice" role="status">${escapeHTML(message)}</div>` : '';
    if (!role) {
      document.getElementById('reset').hidden = true;
      app.innerHTML = notice + loginView();
      return;
    }
        document.getElementById('reset').hidden = role !== 'caregiver';
        const toolbar = `
          <div class="toolbar">
            <div class="toolbar-group">
              <span class="demo-pill">DEMO</span>
              <span class="muted">${escapeHTML(now().toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}</span>
            </div>
            <div class="toolbar-group">
              ${button('+1 hour', 'skip-hour', '', 'small-btn')}
              ${button('Next day', 'next-day', '', 'small-btn')}
              ${button('Today', 'back-to-today', '', 'small-btn')}
              ${button('Log out', 'logout', '', 'small-btn')}
            </div>
          </div>`;
            app.innerHTML = toolbar + notice + (role === 'user' ? userView() : caregiverView());
	}

        function loginView() {
            return `
            <section class="login-card">
              <div class="login-logo" aria-hidden="true">C</div>
              <h1>Welcome to CareNest</h1>
              <p class="muted">Simple medication reminders, with support from the people who care for you.</p>
              <form id="login-form" class="form-grid">
                <label class="field">Username
                  <input name="username" required autocomplete="username" placeholder="e.g. alex">
                </label>
                <label class="field">Password
                  <input name="password" type="password" required autocomplete="current-password" placeholder="Enter your password">
                </label>
                <button class="btn primary login-btn" type="submit">Sign in</button>
              </form>
              <div class="login-demo">
                <strong>Demo accounts</strong>
                <span><code>alex</code> — medication user</span>
                <span><code>caregiver</code> — caregiver dashboard</span>
                <span>Password for both: <code>test123</code></span>
              </div>
            </section>`;
        }

    function userView() {
        if (checking) return scanView();
        if (completed) return successView();
        if (helping !== null) return helpView();
        const due = sortMeds().find(m => m.status !== 'Taken');
        const latest = data.reply
        ? `<div class="notice"><strong>Message from caregiver:</strong> ${escapeHTML(data.reply)}
            <div class="actions">${button('Got it', 'dismiss-reply', '', 'small-btn')}</div></div>`
        : '';
        
        const nextCard = due
        ? `<div class="medication">
          ${bottle(due)}
          <div class="med-info">
            <div class="med-name">${escapeHTML(due.name)}</div>
            <p class="dose"><strong>Dose:</strong> ${escapeHTML(due.dose)}</p>
            <p><strong>Time:</strong> ${timeLabel(due.time)}</p>
            ${badge(due.status)}
          </div>
        </div>
        <p>${escapeHTML(due.instructions)}</p>
        <div class="actions">
          ${button('Take Medication', 'take', due.id, 'primary')}
          ${due.status === 'Remind later' ? button('Show reminder now', 'show', due.id) : button('Remind Me Later', 'later', due.id)}
          ${button('I Need Help', 'help', due.id)}
        </div>
        <div class="actions">${button('Play audio reminder', 'audio', due.id, 'small-btn')}</div>`
        : '<p>You have confirmed every scheduled demo medicine. You can check today’s list below.</p>';
        const takenCount = data.medicines.filter(m => m.status === 'Taken').length;
        const total = data.medicines.length;
        const percent = total ? Math.round((takenCount / total) * 100) : 0;
        const progress = total ? `
          <div class="progress-wrap">
            <div class="progress-text"><strong>${takenCount} of ${total}</strong> medications taken today</div>
            <div class="progress" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
              <div class="progress-fill" style="width: ${percent}%"></div>
            </div>
          </div>` : '';
        const banner = due && (due.status === 'Due' || due.status === 'Unconfirmed')
        ? `<div class="notice due-banner" role="alert"><strong> It is time for ${escapeHTML(due.name)}.</strong> Press “Take Medication” when you are ready.</div>`
        : '';
        
        return `
          <h1>Hello, Alex</h1>
            <p class="muted">Here is your medication reminder for today.</p>
            ${banner}
            ${progress}
            ${latest}
          <section class="card">
            <h2>${due ? 'Your next medication' : 'All medications confirmed'}</h2>
            ${nextCard}
          </section>
          <section class="card">
            <h2>Today’s medication schedule</h2>
            ${data.medicines.length ? rows(sortMeds(), true) : '<p>No medications have been added.</p>'}
          </section>`;
        }

        function scanView() {
            const med = byId(checking.id);
            if (!med) {
                checking = null;
                return userView();
            }
            
            if (checking.step === 1) {
                return `
                    <h1>Step 1: Check the bottle</h1>
                    <section class="card">
                    <p>Find the bottle labeled <strong>${escapeHTML(med.name)}</strong>.</p>
                    <div class="medication">
                    ${bottle(med)}
                    <div class="med-info">
                      <strong>${escapeHTML(med.name)}</strong>
                      <p>Scheduled for ${timeLabel(med.time)}</p>
                    </div>
                    </div>
                    <p class="small muted">Camera scanning is simulated. Choose a bottle below to test the response.</p>
                    <div class="bottle-choice">
                    ${button('Correct bottle', 'correct', med.id, 'primary')}
                    ${button('Wrong bottle', 'wrong', med.id)}
                    </div>
                    ${checking.wrong
                    ? `<div role="alert" class="notice warning">
                        <strong>STOP — this is the wrong bottle.</strong>
                        <p>Do not take it. Find the bottle shown above or ask your caregiver for help.</p>
                        <p class="small">Wrong bottle attempts: ${checking.wrongCount}</p>
                            </div>`
                    : ''}
                  <div class="actions">
                    ${button('I Need Help', 'help', med.id)}
                    ${button('Cancel', 'cancel')}
                  </div>
                </section>`;
            }
            
            return `
              <h1>Step 2: Confirm you took it</h1>
              <section class="card">
                <div class="notice success"><strong>Correct demo bottle selected.</strong></div>
                <div class="medication">
                  ${bottle(med)}
                  <div class="med-info">
                    <div class="med-name">${escapeHTML(med.name)}</div>
                    <p><strong>Dose:</strong> ${escapeHTML(med.dose)}</p>
                    <p>${escapeHTML(med.instructions)}</p>
                  </div>
                </div>
                <p>Only press the button below <strong>after</strong> you have taken your medication. A bottle check alone does not mark it taken.</p>
                <div class="actions">
                  ${button('Yes, I took it', 'confirm', med.id, 'primary')}
                  ${button('Cancel', 'cancel')}
                </div>
              </section>`;
        }
        
        function helpView() {
            const med = helping ? byId(helping) : null;
            return `
                <h1>How can we help?</h1>
                  <section class="card">
                     <div class="help-grid">
                  ${button('📞 Call my caregiver', 'help-call', helping, 'help-btn')}
                  ${med ? button('🔊 Hear my instructions', 'audio', med.id, 'help-btn') : ''}
                  ${button('❓ I have a question', 'help-question', helping, 'help-btn')}
                  ${button('⚠️ I think I have the wrong medicine', 'help-wrong', helping, 'help-btn')}
                  </div>
                  <div class="actions">${button('Back', 'help-back')}</div>
                </section>`;
        }
        
        function successView() {
            const med = byId(completed);
            const next = sortMeds().find(m => m.status !== 'Taken');
            return `
              <section class="card success-card">
                <div class="success-icon" aria-hidden="true">✓</div>
                <h1>Medication taken</h1>
                ${med ? `<p><strong>${escapeHTML(med.name)}</strong> · ${escapeHTML(med.dose)}<br>Confirmed at ${escapeHTML(med.takenAt)}</p>` : ''}
                <p class="muted">${next ? `Next: ${escapeHTML(next.name)} at ${timeLabel(next.time)}` : 'No more medications today.'}</p>
                <div class="actions success-actions">${button('Done', 'done', '', 'primary')}</div>
              </section>`;
        }

        function caregiverView() {
            const meds = sortMeds();
            const taken = meds.filter(m => m.status === 'Taken').length;
            const unconfirmed = meds.filter(m => m.status === 'Unconfirmed').length;
            const pendingAlerts = data.alerts.filter(a => !a.reviewed);
            
            const statusRows = meds.length
            ? meds.map(m => `
          <div class="row">
            <div>
              <div class="row-title">${escapeHTML(m.name)}</div>
              <div class="row-meta">${timeLabel(m.time)} · ${escapeHTML(m.dose)}${m.takenAt ? ' · ' + escapeHTML(statusText(m)) : ''}</div>
            </div>
            <div class="row-controls">
              ${badge(m.status)}
              ${button('Edit', 'edit', m.id, 'small-btn')}
            </div>
          </div>`).join('')
            : '<p>There are no medications yet.</p>';
            
            const alertRows = pendingAlerts.length
            ? pendingAlerts.map(a => `
          <div class="row">
            <div>
              <div class="row-title">${a.type === 'help' ? 'Help requested' : 'Medication unconfirmed'}</div>
              <div class="row-meta">${escapeHTML(a.text)}</div>
            </div>
            <div class="row-controls">
              ${button('Reply', 'reply', a.id, 'small-btn')}
              ${button('Reviewed', 'review', a.id, 'small-btn')}
            </div>
            ${replyingTo === a.id ? `
            <form id="reply-form" class="form-grid reply-form" data-id="${escapeHTML(a.id)}">
              <label class="field">Message to Alex
                <textarea name="reply" required maxlength="200">I saw your request. I will help you.</textarea>
              </label>
              <div class="actions">
                <button class="btn primary" type="submit">Send message</button>
                ${button('Cancel', 'cancel-reply')}
              </div>
            </form>` : ''}
          </div>`).join('')
            : '<p>No new alerts.</p>';
            
            const historyRows = data.history.length
            ? data.history.slice(0, 15).map(h => `
          <div class="row">
            <div>
              <div class="row-title">${escapeHTML(h.name)}</div>
              <div class="row-meta">${escapeHTML(h.dose)} · ${escapeHTML(h.date)} at ${escapeHTML(h.at)}</div>
            </div>
            ${badge('Taken')}
          </div>`).join('')
            : '<p>No doses have been confirmed yet.</p>';
            
            return `
              <h1>Caregiver dashboard</h1>
              <p class="muted">Alex's medication schedule and requests for help.</p>
                <div class="counts">
                  <div class="count count-good"><strong>${taken}</strong>Taken</div>
                  <div class="count"><strong>${meds.length - taken - unconfirmed}</strong>Upcoming / due</div>
                  <div class="count ${unconfirmed ? 'count-alert' : ''}"><strong>${unconfirmed}</strong>Missed / unconfirmed</div>
                </div>
                ${pendingAlerts.length
                  ? `<div class="notice warning" role="alert"><strong>⚠️ ${pendingAlerts.length} ${pendingAlerts.length === 1 ? 'item needs' : 'items need'} your attention.</strong> See “Help requests and alerts” below.</div>`
                  : `<div class="notice success"><strong>✓ Everything is on track.</strong> No new alerts.</div>`}
              <section class="card">
                <h2>Medication status</h2>
                ${statusRows}
                <div class="actions">
                  ${button(editing ? 'Cancel edit' : 'Add medication', editing ? 'cancel-edit' : 'add', '', 'primary')}
                </div>
                ${editing !== null ? formView() : ''}
              </section>
              <section class="card">
                <h2>Help requests and alerts (${pendingAlerts.length})</h2>
                ${alertRows}
              </section>
              <section class="card">
                <h2>Medication history</h2>
                ${historyRows}
              </section>`;
        }

        function formView() {
            const m = editing === 'new'
            ? { name: '', dose: '', time: '08:00', instructions: '', reminder: '' }
            : byId(editing);
            if (!m) return '';
            return `
          <div class="divider"></div>
          <h3>${editing === 'new' ? 'Add medication' : 'Edit medication'}</h3>
          <form id="med-form" class="form-grid">
            <label class="field">Medication name
              <input name="name" required maxlength="70" value="${escapeHTML(m.name)}">
            </label>
            <label class="field">Dose
              <input name="dose" required maxlength="60" value="${escapeHTML(m.dose)}">
            </label>
            <label class="field">Time
              <input name="time" type="time" required value="${escapeHTML(m.time)}">
            </label>
            <label class="field">Instructions
              <textarea name="instructions" required maxlength="250">${escapeHTML(m.instructions)}</textarea>
            </label>
            <label class="field">Audio reminder text (spoken by browser)
              <textarea name="reminder" maxlength="200">${escapeHTML(m.reminder)}</textarea>
            </label>
            <div class="actions">
              <button class="btn primary" type="submit">Save medication</button>
              ${editing !== 'new' ? button('Remove', 'delete', editing, 'danger') : ''}
            </div>
          </form>`;
        }

        function notify(text) {
            message = text;
            render();
            window.scrollTo(0, 0);
        }

        function abandon() {
            if (!checking) return;
            const m = byId(checking.id);
            if (m && m.status !== 'Taken') {
                m.status = 'Unconfirmed';
                alert(`${m.name} was not fully confirmed.`, 'med');
            }
            checking = null;
        }

        function audio(m) {
            const text = m.reminder.trim() || `It is time to check ${m.name}.`;
            if (!('speechSynthesis' in window)) {
                notify('Audio is not supported in this browser. Reminder: ' + text);
                return;
            }
            speechSynthesis.cancel();
            speechSynthesis.speak(new SpeechSynthesisUtterance(text));
            notify('Playing the audio reminder.');
        }
        
        function helpRequest(id, detail) {
            const med = byId(id);
            alert(`Alex ${detail}${med ? ' (' + med.name + ')' : ''}.`, 'help');
            helping = null;
            notify('Your caregiver has been told. Help is on the way (demo only).');
        }

    app.addEventListener('click', e => {
        const b = e.target.closest('[data-action]');
        if (!b) return;
        const a = b.dataset.action;
        const id = b.dataset.id;
        const med = byId(id);
        message = '';
	
	if (a === 'logout') {
	  abandon();
	  role = null;
	  checking = null;
	  helping = null;
    completed = null;
	  editing = null;
	  sessionStorage.removeItem('carenest-role');
	  notify('You have been logged out.');
	  return;
	}
	if (a === 'skip-hour' || a === 'next-day' || a === 'back-to-today') {
 	  if (a === 'skip-hour') skipHour();
	  if (a === 'next-day') skipToNextDay();
	  if (a === 'back-to-today') backToToday();
   	  checking = null;
  	  helping = null;
  	  render();
   	  return;
	}
	
    const caregiverOnly = ['add', 'edit', 'cancel-edit', 'delete', 'review', 'reply', 'cancel-reply'];
	if (caregiverOnly.includes(a) && role !== 'caregiver') return;
        
        if (a === 'take' && med && med.status === 'Taken') {
          notify(`You already took ${med.name} today at ${med.takenAt}. Do not take it again.`);
          return;
        }
	    
        if (a === 'take' && med && med.status !== 'Taken') {
            checking = { id, step: 1, wrong: false, wrongCount: 0 };
            render();
        } else if (a === 'correct' && checking) {
            checking.step = 2;
            render();
        } else if (a === 'wrong' && checking) {
            checking.wrong = true;
            checking.wrongCount += 1;
            if (checking.wrongCount === 2) {
              alert(`Alex picked the wrong bottle twice while looking for ${byId(checking.id).name}.`, 'help');
            }
            render();
        } else if (a === 'confirm' && med && checking?.step === 2 && checking.id === id) {
            med.status = 'Taken';
            med.takenAt = now().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            data.history.unshift({ name: med.name, dose: med.dose, at: med.takenAt, date: now().toLocaleDateString() });
            checking = null;
            completed = id;
            save();
            render();
            window.scrollTo(0, 0);
        } else if (a === 'done') {
            completed = null;
            render();
        } else if (a === 'cancel') {
            abandon();
            notify('Dose not confirmed. Your caregiver can see this status.');
        } else if (a === 'later' && med) {
            med.status = 'Remind later';
            med.remindAt = now().getTime() + 15 * 60 * 1000;
            save();
            notify('Okay, I will remind you again in 15 minutes. This dose is not marked Taken.');
        } else if (a === 'show' && med) {
          med.status = 'Due';
          save();
        notify('Reminder is ready again.');
        } else if (a === 'help') {
            if (checking) abandon();
            helping = id || '';
            render();
        } else if (a === 'help-back') {
            helping = null;
            render();
        } else if (a === 'help-call') {
            helpRequest(id, 'asked for a call');
        } else if (a === 'help-question') {
            helpRequest(id, 'has a question');
        } else if (a === 'help-wrong') {
            helpRequest(id, 'thinks they have the wrong medicine');
        } else if (a === 'audio' && med) {
            audio(med);
        } else if (a === 'add') {
          editing = 'new';
          render();
        } else if (a === 'edit') {
          editing = id;
          render();
        } else if (a === 'cancel-edit') {
          editing = null;
          render();
        } else if (a === 'delete' && med && confirm(`Remove ${med.name} from this demo?`)) {
          data.medicines = data.medicines.filter(m => m.id !== id);
          editing = null;
          save();
          notify('Medication removed.');
        } else if (a === 'review') {
          const found = data.alerts.find(al => al.id === id);
          if (found) {
            found.reviewed = true;
            save();
            notify('Alert marked reviewed.');
          }
        } else if (a === 'reply') {
          replyingTo = id;
          render();
        } else if (a === 'cancel-reply') {
          replyingTo = null;
          render();
        } else if (a === 'dismiss-reply') {
          data.reply = '';
          save();
          render();
        }
    });

    app.addEventListener('submit', e => {
        if (e.target.id === 'reply-form') {
          e.preventDefault();
          const text = e.target.elements.reply.value.trim();
          if (!text) return;
          data.reply = text;
          const found = data.alerts.find(al => al.id === e.target.dataset.id);
          if (found) found.reviewed = true;
          replyingTo = null;
          save();
          notify('Your message is now visible in Alex’s view.');
          return;
        }
        if (e.target.id === 'login-form') {
          e.preventDefault();
          const {username, password } = Object.fromEntries(new FormData(e.target).entries());
          const account = ACCOUNTS[username.trim().toLowerCase()];
          if (account && account.password === password) {
            role = account.role;
            sessionStorage.setItem('carenest-role', role);
            notify(role === 'user' ? 'Welcome, Alex' : 'Signed in as caregiver.');
          } else {
            notify('Username or password is incorrect. Please try again');
          }
          return;
        }
        if (e.target.id !== 'med-form' || role !== 'caregiver') return;
        e.preventDefault();
        const values = Object.fromEntries(new FormData(e.target).entries());
        for (const k of ['name', 'dose', 'instructions', 'reminder']) values[k] = values[k].trim();
        if (!values.name || !values.dose || !values.time || !values.instructions) return;
        if (editing === 'new') {
          data.medicines.push({ ...values, id: 'm' + Date.now(), status: 'Upcoming', takenAt: '' });
        } else {
          Object.assign(byId(editing), values);
        }
        editing = null;
        save();
        notify('Medication saved.');
    });

    document.getElementById('reset').addEventListener('click', () => {
        if (!confirm('Reset sample medicines and alerts?')) return;
        data = example();
        checking = null;
        editing = null;
        save();
        notify('Demo restored to its starting state.');
    });

        render();
})();

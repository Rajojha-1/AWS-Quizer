// script.js — quiz logic that loads questions from questions.txt and supports import/export
const startBtn = document.getElementById('start-btn');
const viewScoresBtn = document.getElementById('view-scores');
const openAdminBtn = document.getElementById('open-admin');
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const scoresScreen = document.getElementById('scores-screen');
const adminScreen = document.getElementById('admin-screen');
const questionText = document.getElementById('question-text');
const choicesDiv = document.getElementById('choices');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const feedbackModal = document.getElementById('feedback-modal');
const feedbackText = document.getElementById('feedback-text');
const correctAnswerDisplay = document.getElementById('correct-answer-display');
const correctAnswerText = document.getElementById('correct-answer-text');
const finalScoreEl = document.getElementById('final-score');
const statCorrectEl = document.getElementById('stat-correct');
const statIncorrectEl = document.getElementById('stat-incorrect');
const statProgressEl = document.getElementById('stat-progress');
const statTotalEl = document.getElementById('stat-total');
const confettiContainer = document.getElementById('confetti-container');
const reattemptBtn = document.getElementById('reattempt');
const viewAttemptsBtn = document.getElementById('view-attempts');
const attemptsListEl = document.getElementById('attempts-list');
const finishBtn = document.getElementById('finish-btn');
const startTestBtn = document.getElementById('start-test');
const testTimerEl = document.getElementById('test-timer');
const jumpInput = document.getElementById('jump-input');
const jumpBtn = document.getElementById('jump-btn');
const topResultEl = document.getElementById('top-result');
const topScoreEl = document.getElementById('top-score');
const saveScoreForm = document.getElementById('save-score-form');
const initialsInput = document.getElementById('initials');
const highscoresList = document.getElementById('highscores-list');
const clearScoresBtn = document.getElementById('clear-scores');
const playAgainBtn = document.getElementById('play-again');
const backHomeBtn = document.getElementById('back-home');
const quitBtn = document.getElementById('quit-btn');
const importBtn = document.getElementById('import-btn');
const exportBtn = document.getElementById('export-btn');
const qImport = document.getElementById('q-import');
const qFile = document.getElementById('q-file');

let questions = [];
let currentIndex = 0;
let score = 0;
let originalQuestions = null; // keep a copy when starting a test
let testMode = false;
let testTimer = null;
let testRemaining = 0; // seconds
// timer removed per UX request

function show(el){ if(el) el.classList.remove('hidden'); }
function hide(el){ if(el) el.classList.add('hidden'); }

function startQuiz(){
	if(questions.length === 0){ alert('No questions loaded. Place a questions.txt file or paste JSON in Admin.'); return; }
	currentIndex = 0; score = 0;
	// Show the quiz area directly and render first question.
	hide(startScreen); hide(resultScreen); hide(scoresScreen); hide(adminScreen);
	show(quizScreen);
	renderQuestion();
}

// Start official test session: 65 random questions, 90 minutes
function startTest(){
	if(questions.length === 0){ alert('No questions loaded. Place a questions.txt file or paste JSON in Admin.'); return; }
	if(testMode) return;
	const ok = confirm('Start a timed test: 65 random questions, 90 minutes. Are you ready?');
	if(!ok) return;
	// keep a copy of all questions so normal quiz can be restored
	originalQuestions = JSON.parse(JSON.stringify(questions));
	// pick a shuffled subset
	const pool = Array.from(questions);
	for(let i=pool.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [pool[i],pool[j]] = [pool[j],pool[i]]; }
	const count = Math.min(65, pool.length);
	if(pool.length < 65){ alert(`Only ${pool.length} questions available — test will use all available questions.`); }
	questions = pool.slice(0, count);
	testMode = true;
	testRemaining = 90 * 60; // 90 minutes in seconds
	if(testTimerEl) { testTimerEl.classList.remove('hidden'); }
	startTestTimer();
	startQuiz();
}

function startTestTimer(){
	if(testTimer) clearInterval(testTimer);
	updateTestTimerDisplay();
	testTimer = setInterval(()=>{
		testRemaining -= 1;
		if(testRemaining <= 0){
			clearInterval(testTimer); testTimer = null; testRemaining = 0;
			alert('Time is up — the test will be submitted automatically.');
			finishQuiz();
			endTestMode();
			return;
		}
		updateTestTimerDisplay();
	}, 1000);
}

function updateTestTimerDisplay(){
	if(!testTimerEl) return;
	const hrs = Math.floor(testRemaining/3600);
	const mins = Math.floor((testRemaining%3600)/60);
	const secs = testRemaining%60;
	testTimerEl.textContent = `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

function endTestMode(){
	testMode = false;
	if(testTimer) { clearInterval(testTimer); testTimer = null; }
	if(testTimerEl) testTimerEl.classList.add('hidden');
	// restore original questions if available
	if(originalQuestions){ questions = originalQuestions; originalQuestions = null; }
}

// timer functions removed

function renderQuestion(){
	if(feedbackModal) hide(feedbackModal);
	if(correctAnswerDisplay) hide(correctAnswerDisplay);
	const item = questions[currentIndex];
	questionText.textContent = `${currentIndex+1}. ${item.q}`;
	choicesDiv.innerHTML = '';
	
	// detect multi-select (if question says "choose two" or "select two")
	const isMultiSelect = /choose\s+(two|2)|select\s+(two|2)/i.test(item.q);
	const maxSelect = isMultiSelect ? 2 : 1;
	
	item.choices.forEach((c,i)=>{
		const btn = document.createElement('button');
		const colorIdx = i % 4;
		btn.className = `choice-btn color-${colorIdx}`;
		btn.dataset.index = i;
		const letter = String.fromCharCode(65 + i);
		// structure: [letter square] [choice text]
		btn.innerHTML = `<span class="choice-letter">${letter}</span><span class="choice-text">${c}</span>`;
		btn.addEventListener('click',()=>handleAnswer(i,btn,maxSelect));
		choicesDiv.appendChild(btn);
	});
	
	// If user has already answered this question, reflect it in the UI
	if(typeof item.userAnswer !== 'undefined'){
		const selectedIndexes = Array.isArray(item.userAnswer) ? item.userAnswer : [item.userAnswer];
		const correctIndexes = Array.isArray(item.correct) ? item.correct : [item.correct];
		
		Array.from(choicesDiv.children).forEach(b=>{
			const idx = parseInt(b.dataset.index,10);
			b.disabled = true;
			if(selectedIndexes.includes(idx)){
				if(correctIndexes.includes(idx)){ b.classList.add('correct'); }
				else { b.classList.add('wrong'); }
			} else {
				b.classList.add('dimmed');
			}
		});
	}
	// enable/disable navigation buttons
	if(prevBtn) prevBtn.disabled = (currentIndex === 0);
	if(nextBtn) nextBtn.disabled = (currentIndex >= questions.length-1);

	// update jump control (if present)
	if(jumpInput){
		jumpInput.max = questions.length || 1;
		jumpInput.value = Math.min(Math.max(1, currentIndex+1), questions.length || 1);
		jumpInput.disabled = (questions.length === 0);
	}
	if(jumpBtn) jumpBtn.disabled = (questions.length === 0);
	updateCounters();
}

function handleAnswer(choiceIndex, btnEl, maxSelect = 1){
	const q = questions[currentIndex];
	const correctIndexes = Array.isArray(q.correct) ? q.correct : [q.correct];
	
	// multi-select support
	if(maxSelect > 1){
		if(!Array.isArray(q.userAnswer)){ q.userAnswer = []; }
		
		// toggle selection
		const idx = q.userAnswer.indexOf(choiceIndex);
		if(idx > -1){
			q.userAnswer.splice(idx, 1);
			btnEl.classList.remove('selected');
		} else if(q.userAnswer.length < maxSelect){
			q.userAnswer.push(choiceIndex);
			btnEl.classList.add('selected');
		}
		
		// if reached max selections, show result
		if(q.userAnswer.length === maxSelect){
			Array.from(choicesDiv.children).forEach(b=>{
				const i = parseInt(b.dataset.index,10);
				b.disabled = true;
				b.classList.remove('selected','correct','wrong','dimmed');
				if(q.userAnswer.includes(i)){
					if(correctIndexes.includes(i)){ b.classList.add('correct'); }
					else { b.classList.add('wrong'); }
				} else {
					b.classList.add('dimmed');
				}
			});
			
			const allCorrect = q.userAnswer.every(a => correctIndexes.includes(a)) && q.userAnswer.length === correctIndexes.length;
			if(allCorrect){ 
				showFeedbackPopup('Correct! ✓', true); 
				confettiBurst(); 
				playBeep(true); 
			} else { 
				showFeedbackPopup('Wrong ✗', false); 
				playBeep(false);
				showCorrectAnswer(correctIndexes);
			}
			updateCounters();
		}
	} else {
		// single-select
		q.userAnswer = choiceIndex;
		Array.from(choicesDiv.children).forEach(b=>{
			const idx = parseInt(b.dataset.index,10);
			b.disabled = true;
			b.classList.remove('correct','wrong','dimmed');
			if(idx === choiceIndex){
				if(correctIndexes.includes(choiceIndex)){ b.classList.add('correct'); }
				else { b.classList.add('wrong'); }
			} else {
				b.classList.add('dimmed');
			}
		});
		if(correctIndexes.includes(choiceIndex)){ 
			showFeedbackPopup('Correct! ✓', true); 
			confettiBurst(); 
			playBeep(true); 
		} else { 
			showFeedbackPopup('Wrong ✗', false); 
			playBeep(false);
			showCorrectAnswer(correctIndexes);
		}
		updateCounters();
	}
}

// Show correct answer display
function showCorrectAnswer(correctIndexes){
	if(!correctAnswerDisplay || !correctAnswerText) return;
	const q = questions[currentIndex];
	const correctLetters = correctIndexes.map(i => String.fromCharCode(65 + i)).join(', ');
	const correctTexts = correctIndexes.map(i => q.choices[i]).join(' & ');
	correctAnswerText.textContent = `${correctLetters}: ${correctTexts}`;
	show(correctAnswerDisplay);
}

// Show big popup feedback
function showFeedbackPopup(message, isCorrect){
	if(!feedbackModal || !feedbackText) return;
	feedbackText.textContent = message;
	feedbackText.className = 'feedback-text ' + (isCorrect ? 'correct' : 'wrong');
	show(feedbackModal);
	setTimeout(()=>{ hide(feedbackModal); }, 1400);
}

nextBtn && nextBtn.addEventListener('click', ()=>{ if(currentIndex < questions.length-1){ currentIndex += 1; renderQuestion(); } else { finishQuiz(); } });
prevBtn && prevBtn.addEventListener('click', ()=>{ if(currentIndex > 0){ currentIndex -= 1; renderQuestion(); } });

// Jump-to-question helper (frontend-only)
function jumpToQuestion(n){
	if(!questions || questions.length === 0){ alert('No questions loaded.'); return; }
	const num = parseInt(n, 10);
	if(isNaN(num) || num < 1 || num > questions.length){ alert(`Enter a number between 1 and ${questions.length}`); return; }
	currentIndex = num - 1;
	renderQuestion();
}

if(jumpBtn) jumpBtn.addEventListener('click', ()=>{ jumpToQuestion(jumpInput ? jumpInput.value : NaN); });
if(jumpInput) jumpInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); jumpToQuestion(jumpInput.value); } });

function finishQuiz(){
	updateCounters();
	// Hide correct answer display and nav controls
	if(correctAnswerDisplay) hide(correctAnswerDisplay);
	
	const correct = questions.filter(q=>{
		if(typeof q.userAnswer === 'undefined') return false;
		const correctIndexes = Array.isArray(q.correct) ? q.correct : [q.correct];
		const userAnswers = Array.isArray(q.userAnswer) ? q.userAnswer : [q.userAnswer];
		return userAnswers.every(a => correctIndexes.includes(a)) && userAnswers.length === correctIndexes.length;
	}).length;
	const answered = questions.filter(q=>typeof q.userAnswer !== 'undefined').length;
	const incorrect = answered - correct;
	// save attempt history
	saveAttempt();
	// show results - ensure main result view is shown, attempts view is hidden
	hide(quizScreen);
	show(resultScreen);
	const resultMain = document.getElementById('result-main');
	const attemptsView = document.getElementById('attempts-view');
	if(resultMain) show(resultMain);
	if(attemptsView) hide(attemptsView);
	if(finalScoreEl) finalScoreEl.textContent = correct;
	const resC = document.getElementById('res-correct'); if(resC) resC.textContent = correct;
	const resI = document.getElementById('res-incorrect'); if(resI) resI.textContent = incorrect;
	// if we were in a test, end test mode when showing results
	if(testMode) endTestMode();
}

// Compute counts from questions array and update stat DOM
function updateCounters(){
	const total = questions.length;
	const correct = questions.filter(q=>{
		if(typeof q.userAnswer === 'undefined') return false;
		const correctIndexes = Array.isArray(q.correct) ? q.correct : [q.correct];
		const userAnswers = Array.isArray(q.userAnswer) ? q.userAnswer : [q.userAnswer];
		return userAnswers.every(a => correctIndexes.includes(a)) && userAnswers.length === correctIndexes.length;
	}).length;
	const answered = questions.filter(q=>typeof q.userAnswer !== 'undefined').length;
	const incorrect = answered - correct;
	if(statCorrectEl) statCorrectEl.textContent = correct;
	if(statIncorrectEl) statIncorrectEl.textContent = incorrect;
	if(statProgressEl) statProgressEl.textContent = answered;
	if(statTotalEl) statTotalEl.textContent = total;
	if(topScoreEl) topScoreEl.textContent = correct;
	if(topResultEl) topResultEl.classList.remove('hidden');
	// keep score variable for backward compatibility
	score = correct;
}

// Finish button in topbar
finishBtn && finishBtn.addEventListener('click', ()=>{ finishQuiz(); });

// Confetti effect: create many small pieces and animate then remove
function confettiBurst(){
	// party popper burst: emit colorful particles outward from near top-center
	if(!confettiContainer) return;
	const colours = ['#ff77a9','#ffd166','#7ef0b4','#7cc0ff','#c4b5fd','#ffb3d9'];
	const count = 30;
	// add a small popper head briefly
	const head = document.createElement('div'); head.className='popper-head'; confettiContainer.appendChild(head);
	for(let i=0;i<count;i++){
		const el = document.createElement('div'); el.className = 'confetti-piece';
		const size = Math.floor(Math.random()*12)+8;
		el.style.width = `${size}px`;
		el.style.height = `${Math.floor(size*1.2)}px`;
		el.style.background = colours[Math.floor(Math.random()*colours.length)];
		// position around center top
		el.style.left = `${45 + Math.random()*10}%`;
		el.style.top = `8px`;
		// random travel vector
		const angle = (Math.random()*140 - 70) * (Math.PI/180); // spread horizontally
		const dist = 120 + Math.random()*180;
		const dx = Math.round(Math.cos(angle)*dist) + 'px';
		const dy = Math.round(Math.sin(angle)*dist + (Math.random()*40)) + 'px';
		el.style.setProperty('--dx', dx);
		el.style.setProperty('--dy', dy);
		el.style.setProperty('--rot', `${Math.floor(Math.random()*720)}deg`);
		el.style.setProperty('--dur', `${800 + Math.floor(Math.random()*700)}ms`);
		confettiContainer.appendChild(el);
		setTimeout(()=>{ el.remove(); }, 1800);
	}
	// remove head shortly after
	setTimeout(()=>{ head.remove(); }, 500);
}

// small beep for correct/wrong using WebAudio
function playBeep(success){
	try{
		const ctx = new (window.AudioContext || window.webkitAudioContext)();
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = success ? 'sine' : 'triangle';
		o.frequency.value = success ? 880 : 200;
		g.gain.value = 0.05;
		o.connect(g); g.connect(ctx.destination);
		o.start();
		setTimeout(()=>{ o.stop(); ctx.close(); }, 120);
	}catch(e){ /* ignore audio errors */ }
}

// Save an attempt record in localStorage
function saveAttempt(){
	const attempts = JSON.parse(localStorage.getItem('quizer_attempts')||'[]');
	const correct = questions.filter(q=>{
		if(typeof q.userAnswer === 'undefined') return false;
		const correctIndexes = Array.isArray(q.correct) ? q.correct : [q.correct];
		const userAnswers = Array.isArray(q.userAnswer) ? q.userAnswer : [q.userAnswer];
		return userAnswers.every(a => correctIndexes.includes(a)) && userAnswers.length === correctIndexes.length;
	}).length;
	const answered = questions.filter(q=>typeof q.userAnswer !== 'undefined').length;
	const attempt = { date: new Date().toISOString(), correct, incorrect: answered-correct, total: questions.length };
	attempts.unshift(attempt);
	localStorage.setItem('quizer_attempts', JSON.stringify(attempts.slice(0,50)));
}

function showAttempts(){
	const attempts = JSON.parse(localStorage.getItem('quizer_attempts')||'[]');
	attemptsListEl.innerHTML = '';
	if(attempts.length === 0){ 
		attemptsListEl.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.6)">No previous attempts yet.</div>'; 
		return; 
	}
	attempts.forEach((a, index)=>{
		const div = document.createElement('div'); 
		div.className='attempt-item';
		const date = new Date(a.date);
		const dateStr = date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
		const scorePercent = Math.round((a.correct / a.total) * 100);
		div.innerHTML = `
			<div>
				<div class="attempt-score">#${attempts.length - index} - ${a.correct}/${a.total} (${scorePercent}%)</div>
				<div class="attempt-date">${dateStr}</div>
			</div>
			<div class="attempt-badge" style="background:${scorePercent >= 80 ? '#10b981' : scorePercent >= 60 ? '#f59e0b' : '#ef4444'};padding:6px 12px;border-radius:999px;font-size:12px;font-weight:800">
				${scorePercent >= 80 ? '🏆 Great!' : scorePercent >= 60 ? '👍 Good' : '💪 Try Again'}
			</div>
		`;
		attemptsListEl.appendChild(div);
	});
}

// Reattempt: clear user answers but keep attempts history
function reattempt(){
	questions.forEach(q=>{ delete q.userAnswer; });
	currentIndex = 0; updateCounters(); hide(resultScreen); show(quizScreen); renderQuestion();
}

// wire reattempt and view attempts
reattemptBtn && reattemptBtn.addEventListener('click', ()=>{ reattempt(); });
const resultMain = document.getElementById('result-main');
const attemptsView = document.getElementById('attempts-view');
const backToResultBtn = document.getElementById('back-to-result');
viewAttemptsBtn && viewAttemptsBtn.addEventListener('click', ()=>{ 
	hide(resultMain); 
	show(attemptsView); 
	showAttempts(); 
});
backToResultBtn && backToResultBtn.addEventListener('click', ()=>{ 
	hide(attemptsView); 
	show(resultMain); 
});

// wire start test button
startTestBtn && startTestBtn.addEventListener('click', ()=>{ startTest(); });


saveScoreForm && saveScoreForm.addEventListener('submit', e=>{
	e.preventDefault(); const initials = initialsInput.value.trim() || 'Anon'; const entry = {initials, score, date:new Date().toISOString()};
	const stored = JSON.parse(localStorage.getItem('quizer_highscores')||'[]'); stored.push(entry); stored.sort((a,b)=>b.score-a.score); localStorage.setItem('quizer_highscores', JSON.stringify(stored.slice(0,25)));
	initialsInput.value=''; showHighScores();
});

function showHighScores(){ hide(startScreen); hide(quizScreen); hide(resultScreen); hide(adminScreen); show(scoresScreen); const stored = JSON.parse(localStorage.getItem('quizer_highscores')||'[]'); highscoresList.innerHTML=''; stored.forEach(s=>{ const li=document.createElement('li'); li.textContent=`${s.initials} — ${s.score} (${new Date(s.date).toLocaleString()})`; highscoresList.appendChild(li); }); }

clearScoresBtn && clearScoresBtn.addEventListener('click', ()=>{ localStorage.removeItem('quizer_highscores'); highscoresList.innerHTML=''; });
playAgainBtn && playAgainBtn.addEventListener('click', ()=>startQuiz()); backHomeBtn && backHomeBtn.addEventListener('click', ()=>{ hide(resultScreen); show(startScreen); });
viewScoresBtn && viewScoresBtn.addEventListener('click', showHighScores); document.getElementById('scores-back') && document.getElementById('scores-back').addEventListener('click', ()=>{ hide(scoresScreen); show(startScreen); });
quitBtn && quitBtn.addEventListener('click', ()=>{ if(timer) clearInterval(timer); hide(quizScreen); show(startScreen); });

// Admin import/export
importBtn && importBtn.addEventListener('click', ()=>{
	const raw = qImport.value.trim(); if(!raw){ document.getElementById('import-feedback').textContent='Paste JSON or raw text.'; return; }
	try{ const parsed = JSON.parse(raw); if(Array.isArray(parsed)){ questions = parsed; document.getElementById('import-feedback').textContent=`Imported ${parsed.length} questions.`; return; } }
	catch(e){}
	const parsed = parseQuestionsText(raw); if(parsed.length){ questions = parsed; document.getElementById('import-feedback').textContent=`Parsed and imported ${parsed.length} questions.`; } else { document.getElementById('import-feedback').textContent='Could not parse input. Use JSON or text with A., B., C. and "Answer:".'; }
});

exportBtn && exportBtn.addEventListener('click', ()=>{
	const blob = new Blob([JSON.stringify(questions, null, 2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='questions.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

qFile && qFile.addEventListener('change', e=>{
	const f = e.target.files[0]; if(!f) return; const reader = new FileReader(); reader.onload = ev=>{ const text = ev.target.result; try{ const parsed = JSON.parse(text); if(Array.isArray(parsed)){ questions = parsed; document.getElementById('import-feedback').textContent = `Imported ${parsed.length} questions from file.`; return; } } catch(e){}
		const parsed = parseQuestionsText(text); if(parsed.length){ questions = parsed; document.getElementById('import-feedback').textContent = `Parsed and imported ${parsed.length} questions from file.`; } else { document.getElementById('import-feedback').textContent = 'File could not be parsed.'; }
	}; reader.readAsText(f);
});

document.getElementById('open-admin') && document.getElementById('open-admin').addEventListener('click', ()=>{ hide(startScreen); hide(quizScreen); hide(resultScreen); hide(scoresScreen); show(adminScreen); });

// Parsing function for questions.txt raw format
function parseQuestionsText(raw){
	if(!raw) return [];
	// Normalize line endings
	raw = raw.replace(/\r/g,'');
	// Split by lines that begin with Q<number> or 'Question' markers
	const blocks = raw.split(/\n(?=Q\d+\.|Question\s+#?\d+\.|Question\s+#?\d+)/g).map(s=>s.trim()).filter(Boolean);
	const out = [];
	blocks.forEach(b=>{
		// Extract question (up to first choice or Answer:)
		const qMatch = b.match(/^(?:Q\d+\.?\s*)?(.*?)(?=\n(?:A\.|•\s*A\.|\nAnswer:|$))/s);
		const qText = qMatch ? qMatch[1].trim() : b.split('\n')[0].replace(/^Q\d+\.?\s*/,'').trim();
		// Extract choices A.-E.
		const choiceRegex = /^[\s•-]*([A-E])(?:\.|\))\s*(.+)$/gm;
		const choices = []; let m;
		while((m = choiceRegex.exec(b)) !== null){ choices.push(m[2].trim()); }
		if(choices.length === 0){ // fallback: lines that look like choices
			const alt = b.match(/\n\s*\-\s*(.+?)\n\s*\-\s*(.+?)\n\s*\-\s*(.+?)(?:\n\s*\-\s*(.+?))?/s);
			if(alt){ for(let i=1;i<alt.length;i++){ if(alt[i]) choices.push(alt[i].trim()); } }
		}
		if(choices.length === 0) return; // skip
		// Extract Answer letters (support multiple correct answers like "Answer: A, B" or "Answer: AB")
		const ansMatch = b.match(/Answer:\s*([A-E,\s]+)/i);
		let correct = [0];
		if(ansMatch){
			const letters = ansMatch[1].trim().replace(/[^A-E]/g,'').split('');
			const idx = letters.map(l=>l.charCodeAt(0)-65).filter(i=>i>=0 && i<5);
			correct = idx.length > 0 ? (idx.length > 1 ? idx : idx[0]) : 0;
		}
		out.push({ q: qText, choices, correct });
	});
	return out;
}

// Try to load questions.txt automatically on startup
async function tryLoadQuestionsFile(){
	try{
		const r = await fetch('questions.txt'); if(!r.ok) return; const txt = await r.text(); const parsed = parseQuestionsText(txt); if(parsed.length){ questions = parsed; console.log(`Loaded ${parsed.length} questions from questions.txt`); startQuiz(); }
	}catch(e){ console.warn('questions.txt not loaded', e); }
}

// Initial state
hide(resultScreen); hide(scoresScreen); hide(adminScreen);
// show quiz area (it will be populated when questions are loaded)
show(quizScreen);
tryLoadQuestionsFile();


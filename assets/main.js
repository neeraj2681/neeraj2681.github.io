(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  function store(key, value) {
    try { value === undefined ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch (e) {}
  }

  // Theme toggle (sepia <-> dark sepia)
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  function currentTheme() {
    return root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
  }
  function setTheme(theme) {
    root.dataset.theme = theme;
    store('theme', theme);
  }
  $('#theme-toggle').addEventListener('click', function () {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  $('#year').textContent = new Date().getFullYear();

  // Header border once scrolled
  var header = $('.site-header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Highlight the nav link of the section in view, and fade sections in
  var navLinks = $$('nav a');
  var sections = $$('main .section');
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });

    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          reveal.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    sections.forEach(function (s) { s.classList.add('reveal'); reveal.observe(s); });
  }

  // Project filters
  var chips = $$('.chip');
  var projects = $$('.projects li');
  function filterProjects(cat) {
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.filter === cat)); });
    projects.forEach(function (p) { p.hidden = cat !== 'all' && p.dataset.cat !== cat; });
  }
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () { filterProjects(chip.dataset.filter); });
  });

  // Copy email
  var copyBtn = $('#copy-email');
  var copyStatus = $('#copy-status');
  var copyTimer;
  copyBtn.addEventListener('click', function () {
    var email = copyBtn.dataset.email;
    var done = function (msg) {
      copyStatus.textContent = msg;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(function () { copyStatus.textContent = ''; }, 2000);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(email).then(function () { done('copied ✓'); }, function () { done('press ctrl+c'); });
    } else {
      done('press ctrl+c');
    }
  });

  // Terminal
  var term = $('#terminal');
  var out = $('#term-out');
  var input = $('#term-input');
  var body = $('#term-body');
  var history = [];
  var historyPos = 0;

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function print(html, cls) {
    var p = document.createElement('p');
    if (cls) p.className = cls;
    p.innerHTML = html;
    out.appendChild(p);
    body.scrollTop = body.scrollHeight;
    return p;
  }
  function link(href, text) {
    return '<a href="' + href + '" target="_blank" rel="noopener">' + text + '</a>';
  }
  function goTo(id) {
    term.close();
    var el = document.getElementById(id);
    if (el) el.scrollIntoView();
  }

  var commands = {
    help: {
      desc: 'list commands',
      run: function () {
        Object.keys(commands).forEach(function (name) {
          print(('  ' + name + '          ').slice(0, 14) + '<span class="dim">' + commands[name].desc + '</span>');
        });
      }
    },
    whoami: {
      desc: 'who is this',
      run: function () { print('Niraj Kumar — Data Scientist II @ VinFast (GSM). Dispatch, fraud, ML, GenAI, books, Stoicism.'); }
    },
    about: {
      desc: 'jump to about',
      run: function () { goTo('about'); }
    },
    work: {
      desc: 'work history',
      run: function () {
        print('2026–now   Data Scientist II       VinFast (GSM)');
        print('2024–2026  Senior Data Scientist   Accertify');
        print('2022–2024  Data Scientist          American Express');
        print('2020–2022  M.Tech CS               Indian Statistical Institute');
        print('<span class="dim">type `open work` to jump to details</span>');
      }
    },
    projects: {
      desc: 'list projects [ml|llm|tools|algo]',
      run: function (args) {
        var cat = args[0];
        var shown = projects.filter(function (p) { return !cat || p.dataset.cat === cat; });
        if (!shown.length) { print('no projects tagged "' + escapeHtml(cat) + '". try: ml, llm, tools, algo'); return; }
        shown.forEach(function (p) {
          var a = $('a', p);
          print('• ' + link(a.href, escapeHtml($('h3', p).textContent)));
        });
      }
    },
    now: {
      desc: "what I'm up to",
      run: function () {
        $$('.now li').forEach(function (li) { print('• ' + escapeHtml(li.textContent.trim())); });
      }
    },
    contact: {
      desc: 'ways to reach me',
      run: function () {
        print('email     ' + link('mailto:neeraj2681@gmail.com', 'neeraj2681@gmail.com'));
        print('github    ' + link('https://github.com/neeraj2681', 'github.com/neeraj2681'));
        print('linkedin  ' + link('https://www.linkedin.com/in/neerajbhatt2/', 'linkedin.com/in/neerajbhatt2'));
      }
    },
    resume: {
      desc: 'open resume (pdf)',
      run: function () { window.open('cv/niraj_kumar_resume.pdf', '_blank', 'noopener'); print('opening resume…'); }
    },
    open: {
      desc: 'jump to a section',
      run: function (args) {
        var id = args[0];
        if (id && document.getElementById(id)) goTo(id);
        else print('usage: open about|work|projects|now|contact');
      }
    },
    theme: {
      desc: 'toggle dark sepia',
      run: function () {
        setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
        print('theme: ' + currentTheme());
      }
    },
    clear: {
      desc: 'clear the screen',
      run: function () { out.innerHTML = ''; }
    },
    exit: {
      desc: 'close terminal',
      run: function () { term.close(); }
    }
  };
  var aliases = { ls: 'projects', cv: 'resume', quit: 'exit', '?': 'help' };

  var quotes = [
    ['You have power over your mind — not outside events. Realize this, and you will find strength.', 'Marcus Aurelius'],
    ['Waste no more time arguing about what a good man should be. Be one.', 'Marcus Aurelius'],
    ['The happiness of your life depends upon the quality of your thoughts.', 'Marcus Aurelius'],
    ['We suffer more often in imagination than in reality.', 'Seneca'],
    ['He who fears death will never do anything worthy of a man who is alive.', 'Seneca'],
    ["It's not what happens to you, but how you react to it that matters.", 'Epictetus'],
    ['No man is free who is not master of himself.', 'Epictetus'],
    ['First say to yourself what you would be; and then do what you have to do.', 'Epictetus']
  ];

  // Hidden commands: not listed by `help`. Later features register more here.
  var secrets = {
    fortune: function () {
      var q = quotes[Math.floor(Math.random() * quotes.length)];
      print('“' + escapeHtml(q[0]) + '”');
      print('    — ' + q[1], 'dim');
    },
    sudo: function (args) {
      if (args[0] === 'hire') {
        print('[sudo] password for recruiter: ********');
        print('Permission granted. Opening email…');
        setTimeout(function () {
          location.href = 'mailto:neeraj2681@gmail.com?subject=' + encodeURIComponent("Let's work together");
        }, 900);
      } else {
        print('nice try. this incident will be reported to the Stoics.');
      }
    },
    portfolio: function () {
      var line = print('', 'red');
      var value = 100;
      var ticks = 0;
      var timer = setInterval(function () {
        value -= 1 + Math.random() * 4;
        line.textContent = 'NK-PORTFOLIO  ' + value.toFixed(2) + '  ▼ ' + (value - 100).toFixed(2) + '%';
        if (++ticks === 6) {
          clearInterval(timer);
          print("(it's all red now. stay stoic: `fortune`)", 'dim');
        }
      }, 280);
    },
    run: function () {
      var track = 28;
      var you = 0;
      var cheetah = 0;
      var line = print('');
      var timer = setInterval(function () {
        you = Math.min(track, you + 2 + Math.round(Math.random()));
        cheetah = Math.min(track - 3, cheetah + Math.round(Math.random() * 2));
        line.textContent =
          'you      |' + '-'.repeat(you) + 'o/' + ' '.repeat(track - you) + '|\n' +
          'cheetah  |' + '-'.repeat(cheetah) + '=^.^=' + ' '.repeat(track - 3 - cheetah) + '|';
        if (you === track) {
          clearInterval(timer);
          print('You win. (The cheetah was napping. Still counts.)');
        }
      }, 120);
    },
    sleep: function () {
      print("It's 4 AM somewhere. College me says stay up; present me says go to bed.");
      print('Present me wins. Mostly.', 'dim');
    }
  };

  function runCommand(line) {
    print('<span class="prompt">niraj@portfolio</span>:<span class="path">~</span>$ ' + escapeHtml(line), 'cmd');
    var parts = line.trim().split(/\s+/);
    var name = (parts[0] || '').toLowerCase();
    if (!name) return;
    name = aliases[name] || name;
    var args = parts.slice(1).map(function (a) { return a.toLowerCase(); });
    if (commands[name]) commands[name].run(args);
    else if (secrets[name]) secrets[name](args);
    else print(escapeHtml(name) + ': command not found. type `help`');
  }

  function openTerminal() {
    if (term.open) return;
    term.showModal();
    if (!out.childNodes.length) {
      print('Welcome to niraj@portfolio (Ubuntu-ish 26.10)', 'dim');
      print('Type `help` to see what you can do.', 'dim');
    }
    input.focus();
  }

  $('#term-open').addEventListener('click', openTerminal);
  $('#term-close').addEventListener('click', function () { term.close(); });
  term.addEventListener('click', function (e) {
    if (e.target === term) term.close(); // backdrop click
    else if (!window.getSelection().toString() && e.target.tagName !== 'A') input.focus();
  });

  $('#term-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var line = input.value;
    input.value = '';
    if (line.trim()) history.push(line);
    historyPos = history.length;
    runCommand(line);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' && historyPos > 0) {
      input.value = history[--historyPos];
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      historyPos = Math.min(historyPos + 1, history.length);
      input.value = history[historyPos] || '';
      e.preventDefault();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      var typed = input.value.trim().toLowerCase();
      var matches = Object.keys(commands).filter(function (c) { return typed && c.indexOf(typed) === 0; });
      if (matches.length === 1) input.value = matches[0] + ' ';
      else if (matches.length > 1) print(matches.join('  '), 'dim');
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      out.innerHTML = '';
    }
  });

  // True when the visitor is typing in a visible field. Focus can linger on the
  // input of a closed dialog, and that must not swallow keyboard shortcuts.
  function isTyping(e) {
    var tag = (e.target.tagName || '').toLowerCase();
    return (tag === 'input' || tag === 'textarea') && !e.target.closest('dialog:not([open])');
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === '`' && !document.querySelector('dialog[open]') && !isTyping(e)) {
      e.preventDefault();
      openTerminal();
    }
  });

  // `git log`: this site's real commits, fetched live from GitHub
  function timeAgo(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    var units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (var i = 0; i < units.length; i++) {
      var n = Math.floor(s / units[i][1]);
      if (n >= 1) return n + ' ' + units[i][0] + (n > 1 ? 's' : '') + ' ago';
    }
    return 'just now';
  }
  secrets.git = function (args) {
    if (args[0] !== 'log') { print('usage: git log   (the only git you get here)'); return; }
    var loading = print('fetching commits…', 'dim');
    fetch('https://api.github.com/repos/neeraj2681/neeraj2681.github.io/commits?per_page=20')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (list) {
        loading.remove();
        list.filter(function (c) { return c.parents.length < 2; }).slice(0, 8).forEach(function (c) {
          print('<span class="sha">' + link(c.html_url, c.sha.slice(0, 7)) + '</span> ' +
            escapeHtml(c.commit.message.split('\n')[0]) +
            ' <span class="dim">(' + timeAgo(c.commit.author.date) + ')</span>');
        });
      })
      .catch(function () { loading.textContent = 'git: GitHub is rate-limiting us. try again in a bit.'; });
  };

  // Floating toast
  var toastEl = $('#toast');
  var toastTimer;
  function toast(html, ms) {
    toastEl.innerHTML = html;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, ms || 4000);
  }

  // Stoic mode: Konami code (↑↑↓↓←→←→BA) or `stoic` in the terminal
  function toggleStoic() {
    var on = root.toggleAttribute('data-stoic');
    toast(on
      ? '“You have power over your mind — not outside events.”<small>Marcus Aurelius · stoic mode on</small>'
      : 'Stoic mode off.<small>colour is an indifferent anyway</small>');
    return on;
  }
  var konami = 'arrowup arrowup arrowdown arrowdown arrowleft arrowright arrowleft arrowright b a';
  var recentKeys = [];
  document.addEventListener('keydown', function (e) {
    if (isTyping(e) || !e.key) return;
    recentKeys.push(e.key.toLowerCase());
    if (recentKeys.length > 10) recentKeys.shift();
    if (recentKeys.join(' ') === konami) {
      recentKeys = [];
      toggleStoic();
    }
  });
  secrets.stoic = function () {
    print('stoic mode: ' + (toggleStoic() ? 'on' : 'off'));
  };

  // Red pill / blue pill on "the Matrix" in the About quote
  var matrixBtn = $('#matrix');
  var pills = $('#pills');
  var pillMsg = $('#pill-msg');
  function showPills(show) {
    pills.hidden = !show;
    matrixBtn.setAttribute('aria-expanded', String(show));
  }
  matrixBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    showPills(pills.hidden);
    if (!pills.hidden) $('.pill', pills).focus();
  });
  $$('.pill').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      showPills(false);
      if (btn.dataset.pill === 'blue') {
        pillMsg.textContent = 'Blue it is. Nothing happened. Carry on scrolling.';
      } else {
        pillMsg.textContent = '';
        redPill();
      }
    });
  });
  document.addEventListener('click', function () { if (!pills.hidden) showPills(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !pills.hidden) {
      showPills(false);
      matrixBtn.focus();
    }
  });

  function redPill() {
    if (term.open) term.close();
    var wake = function () {
      openTerminal();
      print('Wake up, visitor…', 'red');
      print('You were in the Matrix all along. Type `help`, or `fortune` for some Stoic perspective.', 'dim');
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) wake();
    else codeRain(wake);
  }
  secrets.matrix = redPill;

  function codeRain(done) {
    var canvas = document.createElement('canvas');
    canvas.className = 'rain';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.width = window.innerWidth * dpr;
    var h = canvas.height = window.innerHeight * dpr;
    var size = 16 * dpr;
    var chars = '01₹$€¥#ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ';
    var drops = [];
    for (var i = 0; i < Math.ceil(w / size); i++) drops.push(-Math.floor(Math.random() * 30));
    var styles = getComputedStyle(root);
    var bg = styles.getPropertyValue('--bg').trim();
    var fg = styles.getPropertyValue('--accent').trim();
    ctx.font = size + 'px "Ubuntu Mono", monospace';
    var start = performance.now();
    var last = 0;
    function frame(t) {
      if (t - last > 50) {
        last = t;
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
        ctx.fillStyle = fg;
        for (var i = 0; i < drops.length; i++) {
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * size, drops[i] * size);
          if (drops[i] * size > h && Math.random() > 0.96) drops[i] = 0;
          drops[i]++;
        }
      }
      if (t - start < 3200) {
        requestAnimationFrame(frame);
      } else {
        canvas.classList.add('fade');
        setTimeout(function () { canvas.remove(); done(); }, 600);
      }
    }
    requestAnimationFrame(frame);
  }

  // Currently reading, from assets/now.json
  var reading = null;
  fetch('assets/now.json')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var r = data && data.reading;
      if (!r || !r.title) return;
      reading = r;
      var title = '<strong>' + escapeHtml(r.title) + '</strong>';
      if (r.url && /^https?:\/\//.test(r.url)) title = link(escapeHtml(r.url), title);
      var el = $('#reading');
      el.innerHTML = 'Currently reading ' + title + (r.author ? ' by ' + escapeHtml(r.author) : '');
      el.hidden = false;
    })
    .catch(function () {});
  secrets.reading = function () {
    if (reading) print('currently reading: ' + escapeHtml(reading.title) + (reading.author ? ' by ' + escapeHtml(reading.author) : ''));
    else print('between books. recommendations welcome: `contact`');
  };

  // Print as a resume: expand every role first, restore afterwards
  var closedForPrint = [];
  window.addEventListener('beforeprint', function () {
    closedForPrint = $$('details:not([open])');
    closedForPrint.forEach(function (d) { d.open = true; });
  });
  window.addEventListener('afterprint', function () {
    closedForPrint.forEach(function (d) { d.open = false; });
  });

  // `?` overlay listing shortcuts and hinting at the secrets
  var help = $('#help');
  function openHelp() { if (!help.open) help.showModal(); }
  $('#help-open').addEventListener('click', openHelp);
  help.addEventListener('click', function (e) { if (e.target === help) help.close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === '?' && !isTyping(e) && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      openHelp();
    }
  });

  // Greeting that depends on the visitor's local time
  var hour = new Date().getHours();
  $('#greeting').textContent =
    hour < 5 ? 'Up at ' + (hour || 12) + ' AM? College me approves. I’m' :
    hour < 12 ? 'Good morning, I’m' :
    hour < 17 ? 'Good afternoon, I’m' : 'Good evening, I’m';
})();

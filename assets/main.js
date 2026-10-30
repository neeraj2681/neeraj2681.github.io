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
      run: function () { print('Niraj Kumar — Senior Data Scientist @ Accertify. Fraud, ML, books, Stoicism.'); }
    },
    about: {
      desc: 'jump to about',
      run: function () { goTo('about'); }
    },
    work: {
      desc: 'work history',
      run: function () {
        print('2024–now   Senior Data Scientist   Accertify');
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
      run: function () { window.open('cv/niraj_kumar__resume.pdf', '_blank', 'noopener'); print('opening resume…'); }
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

  function runCommand(line) {
    print('<span class="prompt">niraj@portfolio</span>:<span class="path">~</span>$ ' + escapeHtml(line), 'cmd');
    var parts = line.trim().split(/\s+/);
    var name = (parts[0] || '').toLowerCase();
    if (!name) return;
    name = aliases[name] || name;
    if (commands[name]) {
      commands[name].run(parts.slice(1).map(function (a) { return a.toLowerCase(); }));
    } else if (name === 'sudo') {
      print('nice try. this incident will be reported to the Stoics.');
    } else {
      print(escapeHtml(name) + ': command not found. type `help`');
    }
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
    body.scrollTop = body.scrollHeight;
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

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (e.key === '`' && !term.open && tag !== 'input' && tag !== 'textarea') {
      e.preventDefault();
      openTerminal();
    }
  });
})();

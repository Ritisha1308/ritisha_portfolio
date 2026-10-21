/* =====================================================
   Ritisha Naigaonkar - Portfolio (script.js)
   Concepts used: DOM selection and events, async/await, fetch,
   timers, IntersectionObserver, <dialog>, form validation,
   data-driven rendering (no innerHTML, so no injection risk).
   ===================================================== */
'use strict';

// ---------- Small helpers ----------
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Create an element safely (uses textContent, never innerHTML)
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  });
  children.forEach((child) => child && node.append(child));
  return node;
}

/* =====================================================
   DATA (edit these lists to update the portfolio)
   ===================================================== */

// Skill levels: 1 = still learning, 2 = comfortable, 3 = strong
const SKILLS = [
  { group: 'Programming', tone: 'violet', items: [['C', 2], ['C++', 2], ['Python', 2], ['Java', 1]] },
  { group: 'Web', tone: 'mint', items: [['HTML', 2], ['CSS', 2], ['JavaScript', 2], ['Node.js', 1]] },
  { group: 'AI', tone: 'coral', items: [['Prompt engineering', 3], ['Agentic AI workflows', 2], ['LLM APIs (Groq)', 2]] }
];
const SPOKEN_LANGUAGES = [['English', 3], ['Hindi', 3], ['Marathi', 3], ['German', 1]];
const LEVEL_NAMES = { 1: 'Learning', 2: 'Comfortable', 3: 'Strong' };
const LANGUAGE_LEVEL_NAMES = { 1: 'Basic', 2: 'Conversational', 3: 'Fluent' };

const CERTIFICATES = [
  {
    title: 'Product Experience Internship: Completion Certificate',
    issuer: 'Kelicalix Technologies Pvt. Ltd.',
    date: '25 May to 30 June 2026',
    type: 'Internship',
    file: 'certificates/kelicalix-internship-completion.jpg',
    alt: 'Internship completion certificate from Kelicalix Technologies for Ritisha Naigaonkar'
  },
  {
    title: 'Internship Offer Letter: Product Experience Intern',
    issuer: 'Kelicalix Technologies Pvt. Ltd.',
    date: '9 April 2026',
    type: 'Internship',
    file: 'certificates/kelicalix-offer-letter.jpg',
    alt: 'Internship offer letter from Kelicalix Technologies for the Product Experience Intern role'
  },
  {
    title: 'Hackathonix 2.0: Certificate of Participation',
    issuer: 'Coding Club, K.D.K. College of Engineering, Nagpur',
    date: '9 March 2026 (12-hour hackathon)',
    type: 'Event',
    file: 'certificates/hackathonix-2.jpg',
    alt: 'Certificate of participation in Hackathonix 2.0 at K.D.K. College of Engineering'
  },
  {
    title: 'Red Hat System Administration I (RH124), Ver. 10',
    issuer: 'Red Hat',
    date: '6 March 2026 (40 credit hours)',
    type: 'Course',
    file: 'certificates/redhat-rh124.jpg',
    alt: 'Red Hat certificate of attendance for System Administration I (RH124)'
  },
  {
    title: 'CodeSprint 2.0 at Enthusia 5.0: Certificate of Appreciation',
    issuer: 'Symbiosis Institute of Technology, Nagpur',
    date: '26 to 28 February 2026',
    type: 'Event',
    file: 'certificates/codesprint-2-enthusia.jpg',
    alt: 'Certificate of appreciation for participating in CodeSprint 2.0 during Enthusia 5.0'
  },
  {
    title: 'Data Structures and Algorithms using Python, Part 1',
    issuer: 'Infosys Springboard',
    date: '6 November 2025',
    type: 'Course',
    file: 'certificates/infosys-dsa-python.jpg',
    alt: 'Infosys Springboard course completion certificate for Data Structures and Algorithms using Python'
  }
];

const GALLERY = [
  {
    file: 'images/trophy-achievement.jpg', w: 1100, h: 1470,
    caption: 'With the trophy, medal and Certificate of Achievement from Symbiplay 3.0',
    alt: 'Ritisha holding a trophy and a Certificate of Achievement on the Symbiosis campus lawn, wearing a medal'
  },
  {
    file: 'images/campus-portrait.jpg', w: 900, h: 1200,
    caption: 'On the Symbiosis Institute of Technology campus',
    alt: 'Ritisha in her college blazer standing in front of green trees and a stone balustrade'
  },
  {
    file: 'images/arduino-circuit.jpg', w: 1080, h: 608,
    caption: 'Arduino UNO and ultrasonic sensor circuit from my hardware prototype',
    alt: 'Top view of an Arduino UNO board wired to an ultrasonic distance sensor and a 9V battery on a white stick'
  },
  {
    file: 'images/arduino-stick.jpg', w: 900, h: 1173,
    caption: 'Testing the ultrasonic sensor stick prototype',
    alt: 'A white stick with an Arduino board, battery and ultrasonic sensor attached, held upright in a classroom'
  }
];

/* =====================================================
   1. NAVIGATION (mobile menu, current section, scroll bar)
   ===================================================== */
function initNav() {
  const nav = $('#nav');
  const menuBtn = $('#menuBtn');

  menuBtn.addEventListener('click', () => {
    const open = nav.dataset.open === 'true';
    nav.dataset.open = String(!open);
    menuBtn.setAttribute('aria-expanded', String(!open));
  });

  $$('#navLinks a').forEach((link) =>
    link.addEventListener('click', () => {
      nav.dataset.open = 'false';
      menuBtn.setAttribute('aria-expanded', 'false');
    })
  );

  // highlight the link of the section currently on screen
  const links = new Map($$('#navLinks a').map((a) => [a.getAttribute('href').slice(1), a]));
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        const active = links.get(entry.target.id);
        if (active) active.setAttribute('aria-current', 'true');
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  $$('main section[id]').forEach((section) => observer.observe(section));

  // thin progress bar at the top of the page
  const bar = $('#progress');
  const updateBar = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
  };
  window.addEventListener('scroll', updateBar, { passive: true });
  updateBar();
}

/* =====================================================
   2. TYPING EFFECT in the hero
   ===================================================== */
async function initTyped() {
  const target = $('#typed');
  const phrases = [
    'agentic AI apps.',
    'clean, responsive web pages.',
    'tools that solve real problems.'
  ];

  if (prefersReducedMotion) {
    target.textContent = phrases[0];
    return;
  }

  let index = 0;
  while (true) {
    const phrase = phrases[index % phrases.length];
    for (let i = 1; i <= phrase.length; i++) {
      target.textContent = phrase.slice(0, i);
      await sleep(55);
    }
    await sleep(1500);
    for (let i = phrase.length; i >= 0; i--) {
      target.textContent = phrase.slice(0, i);
      await sleep(28);
    }
    await sleep(300);
    index++;
  }
}

/* =====================================================
   3. SKILLS + MARKS (visual representations)
   ===================================================== */
function buildMeter(name, level, levelNames) {
  const row = el('div', { class: 'meter' });
  row.append(el('span', { class: 'meter-name', text: name }), el('span', { class: 'meter-level', text: levelNames[level] }));
  const segs = el('div', { class: 'segs', role: 'img', 'aria-label': `${name}: ${levelNames[level]}` });
  for (let i = 1; i <= 3; i++) segs.append(el('span', { class: i <= level ? 'seg on' : 'seg' }));
  row.append(segs);
  return row;
}

function initSkills() {
  const grid = $('#skillGrid');
  SKILLS.forEach(({ group, tone, items }) => {
    const card = el('div', { class: 'skill-card', 'data-tone': tone }, el('h3', { text: group }));
    const list = el('div', { class: 'meter-list' });
    items.forEach(([name, level]) => list.append(buildMeter(name, level, LEVEL_NAMES)));
    card.append(list);
    grid.append(card);
  });

  const langList = $('#langList');
  SPOKEN_LANGUAGES.forEach(([name, level]) => langList.append(buildMeter(name, level, LANGUAGE_LEVEL_NAMES)));
}

// Fill the progress bars and columns when the marks panel scrolls into view
function initMarks() {
  const panel = $('#marks');
  const fill = () => $$('[data-value]', panel).forEach((node) => node.style.setProperty('--v', node.dataset.value));
  if (prefersReducedMotion || !('IntersectionObserver' in window)) return fill();

  const observer = new IntersectionObserver((entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) {
      fill();
      obs.disconnect();
    }
  }, { threshold: 0.35 });
  observer.observe(panel);
}

/* =====================================================
   4. LIGHTBOX (shared by certificates and gallery)
   ===================================================== */
function createLightbox() {
  const dialog = $('#lightbox');
  const img = $('#lbImg');
  const caption = $('#lbCap');
  const prev = $('#lbPrev');
  const next = $('#lbNext');
  let items = [];
  let index = 0;

  function show() {
    const item = items[index];
    img.src = item.file;
    img.alt = item.alt;
    caption.textContent = item.caption;
  }
  const step = (dir) => {
    index = (index + dir + items.length) % items.length;
    show();
  };

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  $('#lbClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') step(-1);
    if (event.key === 'ArrowRight') step(1);
  });

  return function open(list, startIndex) {
    items = list;
    index = startIndex;
    prev.hidden = next.hidden = list.length < 2;
    show();
    dialog.showModal();
  };
}

/* =====================================================
   5. CERTIFICATES + GALLERY
   ===================================================== */
function initCertificates(openLightbox) {
  const grid = $('#certGrid');
  const items = CERTIFICATES.map((c) => ({ ...c, caption: `${c.title} | ${c.issuer}` }));

  items.forEach((cert, i) => {
    const thumb = el('button', { class: 'thumb', type: 'button', 'aria-label': `View certificate: ${cert.title}` },
      el('img', { src: cert.file, alt: cert.alt, loading: 'lazy', decoding: 'async' }));
    thumb.addEventListener('click', () => openLightbox(items, i));

    const body = el('div', { class: 'cert-body' },
      el('span', { class: 'cert-type', text: cert.type }),
      el('h3', { text: cert.title }),
      el('p', { text: cert.issuer }),
      el('p', { class: 'cert-date', text: cert.date })
    );
    grid.append(el('article', { class: 'cert' }, thumb, body));
  });
}

function initGallery(openLightbox) {
  const grid = $('#galleryGrid');
  GALLERY.forEach((photo, i) => {
    const shot = el('button', { class: 'shot', type: 'button', 'aria-label': `View photo: ${photo.caption}` },
      el('img', { src: photo.file, alt: photo.alt, width: String(photo.w), height: String(photo.h), loading: 'lazy', decoding: 'async' }),
      el('span', { class: 'shot-cap', text: photo.caption })
    );
    shot.addEventListener('click', () => openLightbox(GALLERY, i));
    grid.append(shot);
  });
}

/* =====================================================
   6. THREE-AGENT PIPELINE DEMO
   A simulation of my Agentic AI Marketing Message Generator:
   audience analysis -> marketing strategy -> message writing.
   ===================================================== */
const AUDIENCES = {
  students: {
    label: 'college students',
    pain: 'tight budgets and packed schedules',
    tone: 'friendly and upbeat',
    channel: 'Instagram story',
    hook: 'Study smarter, not longer.',
    cta: 'Try it free this week.'
  },
  professionals: {
    label: 'young professionals',
    pain: 'too little time and too many tasks',
    tone: 'crisp and confident',
    channel: 'LinkedIn post',
    hook: 'Get your evenings back.',
    cta: 'Start your 7-day trial.'
  },
  parents: {
    label: 'busy parents',
    pain: 'juggling family and work',
    tone: 'warm and reassuring',
    channel: 'WhatsApp message',
    hook: 'One less thing to worry about.',
    cta: 'See how it works.'
  }
};

function initAgents() {
  const form = $('#agentForm');
  const runBtn = $('#runBtn');
  const copyBtn = $('#copyBtn');
  const output = $('#agentMsg');
  const steps = $$('#steps .step');

  const setStep = (i, state, text) => {
    steps[i].dataset.state = state;
    $('p', steps[i]).textContent = text;
  };

  async function runPipeline() {
    const product = $('#product').value.trim() || 'Your product';
    const audience = AUDIENCES[$('#audience').value];

    runBtn.disabled = true;
    copyBtn.hidden = true;
    output.textContent = 'Agents are working...';
    steps.forEach((_, i) => setStep(i, 'idle', 'Waiting to start'));
    const delay = prefersReducedMotion ? 0 : 750;

    setStep(0, 'working', 'Studying who this is for...');
    await sleep(delay);
    setStep(0, 'done', `Audience: ${audience.label}. Main pain point: ${audience.pain}.`);

    setStep(1, 'working', 'Choosing tone and channel...');
    await sleep(delay);
    setStep(1, 'done', `Tone: ${audience.tone}. Best channel: ${audience.channel}.`);

    setStep(2, 'working', 'Writing the message...');
    await sleep(delay);
    setStep(2, 'done', 'Message ready.');

    output.textContent =
      `${audience.hook} Meet ${product}, built for ${audience.label} dealing with ${audience.pain}. ${audience.cta}`;
    copyBtn.hidden = false;
    runBtn.disabled = false;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    runPipeline();
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(output.textContent);
      copyBtn.textContent = 'Copied';
    } catch (e) {
      copyBtn.textContent = 'Copy failed';
    }
    setTimeout(() => (copyBtn.textContent = 'Copy message'), 1600);
  });
}

/* =====================================================
   7. PROJECTS (loaded from the Node API, with a fallback)
   ===================================================== */
// Used when the page is opened without the Node server running.
// Keep this in sync with the list in server.js.
const FALLBACK_PROJECTS = [
  {
    id: 'agentic-marketing',
    title: 'Agentic AI Marketing Message Generator',
    summary: 'Three agents work in sequence: one analyses the audience, one builds the marketing strategy, and one writes the personalised message.',
    stack: ['Python', 'Gradio', 'Groq', 'Qwen'],
    tags: ['ai'],
    status: 'Deployed on Render',
    featured: true,
    link: null,
    image: null
  },
  {
    id: 'train-buddy',
    title: 'Train Buddy',
    summary: 'A skill-exchange platform where people teach and learn through live sessions, chat and collaborative learning.',
    stack: [],
    tags: ['web'],
    status: 'Completed',
    featured: false,
    link: null,
    image: null
  },
  {
    id: 'visual-tracking',
    title: 'AI Real-Time Visual Tracking System',
    summary: 'A CCTV surveillance system that uses facial recognition to detect and identify registered and unregistered individuals.',
    stack: ['Facial recognition', 'Computer vision'],
    tags: ['ai', 'security'],
    status: 'Built',
    featured: false,
    link: null,
    image: null
  },
  {
    id: 'cyberrakshak',
    title: 'CyberRakshak',
    summary: 'An AI-powered mobile security app concept that protects users from fraudulent calls, fake QR codes and malicious applications.',
    stack: [],
    tags: ['ai', 'security'],
    status: 'Concept',
    featured: false,
    link: null,
    image: null
  },
  {
    id: 'ultrasonic-stick',
    title: 'Ultrasonic Sensor Stick',
    summary: 'A hands-on hardware prototype: an Arduino UNO reads an ultrasonic distance sensor mounted on a stick and runs on a 9V battery.',
    stack: ['Arduino UNO', 'Ultrasonic sensor', '9V battery'],
    tags: ['hardware'],
    status: 'Prototype',
    featured: false,
    link: null,
    image: 'images/arduino-circuit.jpg',
    imageAlt: 'Arduino UNO wired to an ultrasonic sensor and a 9V battery'
  }
];

const TAG_LABELS = { ai: 'AI', web: 'Web', security: 'Security', hardware: 'Hardware' };
const TAG_TONES = { ai: 'violet', web: 'mint', security: 'coral', hardware: 'sun' };

async function loadProjects() {
  try {
    const response = await fetch('/api/projects');
    if (!response.ok) throw new Error('Bad response');
    const data = await response.json();
    return data.projects;
  } catch (error) {
    return FALLBACK_PROJECTS;
  }
}

function buildCard(project) {
  const card = el('article', {
    class: project.featured ? 'card card-featured' : 'card',
    'data-tone': TAG_TONES[project.tags[0]] || 'sun'
  });

  if (project.image) {
    card.append(el('img', { class: 'card-img', src: project.image, alt: project.imageAlt || '', loading: 'lazy', decoding: 'async' }));
  }

  const top = el('div', { class: 'card-top' });
  project.tags.forEach((tag) => top.append(el('span', { class: 'tag', text: TAG_LABELS[tag] || tag })));
  top.append(el('span', { class: 'tag tag-status', text: project.status }));

  card.append(top, el('h3', { text: project.title }), el('p', { text: project.summary }));

  if (project.stack.length) {
    const list = el('ul', { class: 'pills', 'aria-label': 'Built with' });
    project.stack.forEach((item) => list.append(el('li', { text: item })));
    card.append(list);
  }
  if (project.link) {
    card.append(el('a', { class: 'card-link', href: project.link, target: '_blank', rel: 'noopener noreferrer', text: 'View project' }));
  }
  return card;
}

async function initProjects() {
  const grid = $('#projectGrid');
  const filterButtons = $$('#filters button');
  const projects = await loadProjects();

  function render(filter) {
    grid.replaceChildren();
    const visible = projects.filter((p) => filter === 'all' || p.tags.includes(filter));
    if (!visible.length) {
      grid.append(el('p', { class: 'muted', text: 'No projects in this category yet.' }));
      return;
    }
    visible.forEach((project) => grid.append(buildCard(project)));
  }

  filterButtons.forEach((button) =>
    button.addEventListener('click', () => {
      filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      render(button.dataset.filter);
    })
  );

  render('all');
}

/* =====================================================
   8. CONTACT FORM (validation + POST to the Node server)
   ===================================================== */
function initContact() {
  const form = $('#contactForm');
  const status = $('#formStatus');
  const sendBtn = $('#sendBtn');

  const fields = [
    { id: 'cName', err: 'cNameErr', check: (v) => v.length >= 2, msg: 'Enter your name (at least 2 characters).' },
    { id: 'cEmail', err: 'cEmailErr', check: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: 'Enter a valid email, like name@example.com.' },
    { id: 'cMessage', err: 'cMessageErr', check: (v) => v.length >= 10, msg: 'Write a message of at least 10 characters.' }
  ];

  function validate() {
    let firstInvalid = null;
    fields.forEach(({ id, err, check, msg }) => {
      const input = $('#' + id);
      const ok = check(input.value.trim());
      input.setAttribute('aria-invalid', String(!ok));
      $('#' + err).textContent = ok ? '' : msg;
      if (!ok && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  const showStatus = (type, text) => {
    status.dataset.type = type;
    status.textContent = text;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showStatus('', '');
    if (!validate()) return;

    const payload = {
      name: $('#cName').value.trim(),
      email: $('#cEmail').value.trim(),
      message: $('#cMessage').value.trim()
    };

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong.');
      showStatus('success', 'Message sent. Thank you, I will get back to you soon.');
      form.reset();
    } catch (error) {
      const offline = error instanceof TypeError || error instanceof SyntaxError;
      showStatus(
        'error',
        offline
          ? 'Could not reach the server. Start it with "node server.js" and open http://localhost:3000.'
          : error.message
      );
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send message';
    }
  });
}

/* =====================================================
   START
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  $('#year').textContent = new Date().getFullYear();
  const openLightbox = createLightbox();

  initNav();
  initTyped();
  initSkills();
  initMarks();
  initCertificates(openLightbox);
  initGallery(openLightbox);
  initAgents();
  initProjects();
  initContact();
});

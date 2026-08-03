const DATA_URL = 'data/content.json';

const DEFAULT_SITE = {
  title: 'Portfolio',
  lang: 'es',
  theme: 'dark'
};

const DEFAULT_SECTIONS = [
  { id: 'inicio', label: 'Inicio', type: 'hero' },
  { id: 'sobre-mi', label: 'Sobre mí', type: 'about' },
  { id: 'cv', label: 'Hoja de vida', type: 'cv' },
  { id: 'proyectos', label: 'Proyectos', type: 'projects' },
  { id: 'habilidades', label: 'Habilidades', type: 'skills' },
  { id: 'contacto', label: 'Contacto', type: 'contact' }
];

const app = document.getElementById('app');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildHeader(sections) {
  const header = el('header', 'site-header');
  const nav = el('nav', 'nav');
  const list = el('ul');

  sections.forEach((section) => {
    const item = el('li');
    const link = el('a', null, section.label);
    link.href = '#' + section.id;
    link.dataset.section = section.id;
    item.appendChild(link);
    list.appendChild(item);
  });

  nav.appendChild(list);
  header.appendChild(nav);
  document.body.prepend(header);
}

function createSection(section) {
  const sec = el('section', 'section');
  sec.id = section.id;

  if (section.type !== 'hero') {
    sec.appendChild(el('h2', 'section-title', section.label));
  }

  return sec;
}

function renderHero(sec, profile) {
  const inner = el('div', 'hero');

  if (profile.photo) {
    const img = el('img', 'hero-photo');
    img.src = profile.photo;
    img.alt = 'Foto de ' + profile.name;
    inner.appendChild(img);
  }

  inner.appendChild(el('h1', 'hero-name', profile.name));
  inner.appendChild(el('p', 'hero-role', profile.role));
  inner.appendChild(el('p', 'hero-tagline', profile.tagline));

  const actions = el('div', 'hero-actions');
  const cvLink = el('a', 'btn', 'Ver perfil');
  cvLink.href = '#sobre-mi';
  const contactLink = el('a', 'btn btn--secondary', 'Contacto');
  contactLink.href = '#contacto';
  actions.appendChild(cvLink);
  actions.appendChild(contactLink);
  inner.appendChild(actions);

  sec.appendChild(inner);
}

function renderAbout(sec, profile) {
  const inner = el('div', 'about');

  profile.summary.forEach((paragraph) => {
    inner.appendChild(el('p', 'about-text', paragraph));
  });

  if (profile.highlights.length) {
    const list = el('ul', 'about-highlights');
    profile.highlights.forEach((highlight) => {
      list.appendChild(el('li', null, highlight));
    });
    inner.appendChild(list);
  }

  sec.appendChild(inner);
}

function renderCv(sec, data) {
  const inner = el('div', 'cv');

  const experienceBlock = el('div', 'cv-block');
  experienceBlock.appendChild(el('h3', 'cv-subtitle', 'Experiencia'));
  const experienceList = el('div', 'timeline');

  data.experience.forEach((item) => {
    const entry = el('article', 'timeline-entry');
    entry.appendChild(el('h4', 'timeline-role', item.role));
    entry.appendChild(el('p', 'timeline-meta', item.company + ' · ' + item.period));
    entry.appendChild(el('p', 'timeline-summary', item.summary));
    if (item.tech.length) {
      entry.appendChild(buildTechList(item.tech));
    }
    experienceList.appendChild(entry);
  });

  experienceBlock.appendChild(experienceList);
  inner.appendChild(experienceBlock);

  const educationBlock = el('div', 'cv-block');
  educationBlock.appendChild(el('h3', 'cv-subtitle', 'Educación'));
  const educationList = el('div', 'timeline');

  data.education.forEach((item) => {
    const entry = el('article', 'timeline-entry');
    entry.appendChild(el('h4', 'timeline-role', item.degree));
    entry.appendChild(el('p', 'timeline-meta', item.institution + ' · ' + item.period));
    if (item.notes) {
      entry.appendChild(el('p', 'timeline-summary', item.notes));
    }
    educationList.appendChild(entry);
  });

  educationBlock.appendChild(educationList);
  inner.appendChild(educationBlock);

  sec.appendChild(inner);
}

function buildTechList(items) {
  const list = el('ul', 'tags');
  items.forEach((tech) => {
    list.appendChild(el('li', 'tag', tech));
  });
  return list;
}

function renderProjects(sec, projects) {
  const grid = el('div', 'projects-grid');

  projects.forEach((project) => {
    const card = el('article', 'project-card');
    card.appendChild(el('h3', 'project-title', project.title));
    card.appendChild(el('p', 'project-description', project.description));
    card.appendChild(buildTechList(project.tech));

    const links = el('div', 'project-links');
    if (project.demo) {
      const demo = el('a', 'btn btn--small', 'Demo');
      demo.href = project.demo;
      demo.target = '_blank';
      demo.rel = 'noopener noreferrer';
      links.appendChild(demo);
    }
    if (project.repo) {
      const repo = el('a', 'btn btn--small btn--secondary', 'Código');
      repo.href = project.repo;
      repo.target = '_blank';
      repo.rel = 'noopener noreferrer';
      links.appendChild(repo);
    }
    card.appendChild(links);

    grid.appendChild(card);
  });

  sec.appendChild(grid);
}

function renderSkills(sec, skills) {
  const grid = el('div', 'skills-grid');

  skills.forEach((group) => {
    const block = el('div', 'skill-group');
    block.appendChild(el('h3', 'skill-category', group.category));

    const list = el('ul', 'tags');
    group.items.forEach((item) => {
      list.appendChild(el('li', 'tag', item));
    });
    block.appendChild(list);

    grid.appendChild(block);
  });

  sec.appendChild(grid);
}

function renderContact(sec, contact) {
  const inner = el('div', 'contact');
  inner.appendChild(el('p', 'contact-message', contact.message));

  const list = el('ul', 'contact-links');
  const entries = [
    { key: 'email', label: 'Correo', value: contact.email, href: 'mailto:' + contact.email },
    { key: 'github', label: 'GitHub', value: contact.github },
    { key: 'linkedin', label: 'LinkedIn', value: contact.linkedin },
    { key: 'website', label: 'Sitio web', value: contact.website }
  ];

  entries.forEach((entry) => {
    if (!entry.value) return;
    const item = el('li', 'contact-item');
    const link = el('a', 'contact-link', entry.label);
    link.href = entry.href || entry.value;
    if (entry.key !== 'email') {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    item.appendChild(link);
    list.appendChild(item);
  });

  inner.appendChild(list);
  sec.appendChild(inner);
}

function render(data) {
  document.documentElement.lang = data.site.lang || 'es';
  document.title = data.site.title || 'Portfolio';

  buildHeader(data.sections);

  data.sections.forEach((section) => {
    const sec = createSection(section);
    const content =
      data[section.type === 'hero' || section.type === 'about' ? 'profile' : section.type];

    switch (section.type) {
      case 'hero':
        renderHero(sec, content);
        break;
      case 'about':
        renderAbout(sec, content);
        break;
      case 'cv':
        renderCv(sec, data);
        break;
      case 'projects':
        renderProjects(sec, data.projects);
        break;
      case 'skills':
        renderSkills(sec, data.skills);
        break;
      case 'contact':
        renderContact(sec, data.contact);
        break;
      default:
        sec.appendChild(el('p', null, 'Sección sin renderizador: ' + section.label));
    }

    app.appendChild(sec);
  });

  setupActiveNav(data.sections);
}

function setupActiveNav(sections) {
  const links = document.querySelectorAll('.nav a');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          links.forEach((link) => {
            link.classList.toggle('active', link.dataset.section === entry.target.id);
          });
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );

  sections.forEach((section) => {
    const node = document.getElementById(section.id);
    if (node) observer.observe(node);
  });
}

async function fetchSupabaseTable(table, single) {
  const config = window.CONFIG;
  const url = config.SUPABASE_URL + '/rest/v1/' + table + '?select=*';
  const headers = {
    apikey: config.SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + config.SUPABASE_ANON_KEY
  };
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(table + ': HTTP ' + response.status);
  const rows = await response.json();
  return single ? rows[0] : rows;
}

function normalizeContent(data) {
  return {
    site: DEFAULT_SITE,
    sections: DEFAULT_SECTIONS,
    profile: data.profile || {},
    experience: data.experience || [],
    education: data.education || [],
    projects: data.projects || [],
    skills: data.skills || [],
    contact: data.contact || {}
  };
}

async function loadSupabaseContent() {
  const [profile, experience, education, projects, skills, contact] = await Promise.all([
    fetchSupabaseTable('profile', true),
    fetchSupabaseTable('experience'),
    fetchSupabaseTable('education'),
    fetchSupabaseTable('projects'),
    fetchSupabaseTable('skills'),
    fetchSupabaseTable('contact', true)
  ]);
  return normalizeContent({ profile, experience, education, projects, skills, contact });
}

async function loadContent() {
  if (window.CONFIG && window.CONFIG.SUPABASE_URL) {
    try {
      return await loadSupabaseContent();
    } catch (error) {
      console.warn('Supabase no disponible, usando content.json:', error.message);
    }
  }
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

(async function init() {
  try {
    const data = await loadContent();
    render(data);
  } catch (error) {
    const message = el('section', 'error');
    message.appendChild(el('h1', null, 'No se pudo cargar el contenido'));
    message.appendChild(el('p', null, error.message));
    message.appendChild(
      el('p', null, 'Asegúrate de servir el sitio por HTTP (ej: python3 -m http.server).')
    );
    app.appendChild(message);
  }
})();

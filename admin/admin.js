const viewLogin = document.getElementById('view-login');
const viewPanel = document.getElementById('view-panel');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginSubmit = document.getElementById('login-submit');
const panelEmail = document.getElementById('panel-email');
const logoutButton = document.getElementById('logout');

let supabaseClient = null;

function showView(name) {
  viewLogin.classList.toggle('hidden', name !== 'login');
  viewPanel.classList.toggle('hidden', name !== 'panel');
  if (name === 'panel') {
    renderModule('perfil');
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const MODULE_LABELS = {
  perfil: 'Perfil',
  experiencia: 'Experiencia',
  educacion: 'Educación',
  proyectos: 'Proyectos',
  habilidades: 'Habilidades',
  contacto: 'Contacto'
};

function splitLines(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function showFeedback(node, message, isError) {
  node.textContent = message;
  node.hidden = false;
  node.classList.toggle('module-feedback--error', Boolean(isError));
}

function renderModule(name) {
  const view = document.getElementById('module-view');
  const title = document.getElementById('panel-title');
  view.innerHTML = '';
  title.textContent = MODULE_LABELS[name] || name;

  if (name === 'perfil') {
    renderPerfilModule(view);
  } else {
    view.appendChild(el('p', 'placeholder-text', 'Módulo próximamente disponible.'));
  }
}

function renderPerfilModule(view) {
  if (!supabaseClient) {
    view.appendChild(el('p', 'module-feedback module-feedback--error', 'Supabase no está disponible.'));
    return;
  }

  const form = el('form', 'module-form');
  const inputs = {};

  const fields = [
    ['name', 'Nombre', 'text'],
    ['role', 'Rol', 'text'],
    ['tagline', 'Tagline', 'text'],
    ['photo', 'Foto (URL)', 'text'],
    ['location', 'Ubicación', 'text'],
    ['summary', 'Resumen (una línea por párrafo)', 'textarea'],
    ['highlights', 'Destacados (una línea por ítem)', 'textarea']
  ];

  fields.forEach(([key, label, type]) => {
    form.appendChild(el('label', 'module-label', label));
    const input = el(type === 'textarea' ? 'textarea' : 'input');
    input.name = key;
    input.id = 'profile-' + key;
    input.className = 'module-input';
    if (type === 'text') input.type = 'text';
    if (type === 'textarea') input.rows = 4;
    form.appendChild(input);
    inputs[key] = input;
  });

  const feedback = el('p', 'module-feedback');
  feedback.hidden = true;
  const submit = el('button', 'btn', 'Guardar cambios');
  submit.type = 'submit';
  const actions = el('div', 'module-actions');
  actions.appendChild(submit);
  form.appendChild(feedback);
  form.appendChild(actions);
  view.appendChild(form);

  supabaseClient
    .from('profile')
    .select('*')
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        showFeedback(feedback, 'No se pudo cargar el perfil. ¿Ejecutaste supabase/schema.sql?', true);
        return;
      }
      if (data) {
        inputs.name.value = data.name || '';
        inputs.role.value = data.role || '';
        inputs.tagline.value = data.tagline || '';
        inputs.photo.value = data.photo || '';
        inputs.location.value = data.location || '';
        inputs.summary.value = (data.summary || []).join('\n');
        inputs.highlights.value = (data.highlights || []).join('\n');
      }
    });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.hidden = true;

    const payload = {
      id: 1,
      name: inputs.name.value.trim(),
      role: inputs.role.value.trim(),
      tagline: inputs.tagline.value.trim(),
      photo: inputs.photo.value.trim(),
      location: inputs.location.value.trim(),
      summary: splitLines(inputs.summary.value),
      highlights: splitLines(inputs.highlights.value)
    };

    submit.disabled = true;
    submit.textContent = 'Guardando...';

    const { error } = await supabaseClient.from('profile').upsert(payload);

    submit.disabled = false;
    submit.textContent = 'Guardar cambios';

    if (error) {
      showFeedback(feedback, 'Error al guardar: ' + error.message, true);
    } else {
      showFeedback(feedback, 'Perfil guardado correctamente.');
    }
  });
}

function setLoginError(message) {
  loginError.textContent = message;
  loginError.hidden = false;
}

function initSupabase() {
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    return false;
  }
  supabaseClient = window.supabase.createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY
  );
  return true;
}

function handleSession(session) {
  if (session) {
    panelEmail.textContent = session.user.email;
    showView('panel');
  } else {
    showView('login');
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.hidden = true;

  if (!supabaseClient) {
    setLoginError('Supabase no está disponible. Recarga la página o revisa la conexión.');
    return;
  }

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  loginSubmit.disabled = true;
  loginSubmit.textContent = 'Ingresando...';

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  loginSubmit.disabled = false;
  loginSubmit.textContent = 'Iniciar sesión';

  if (error) {
    setLoginError(error.message);
  }
});

logoutButton.addEventListener('click', () => {
  if (supabaseClient) supabaseClient.auth.signOut();
});

document.querySelectorAll('.panel-nav a').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    document.querySelectorAll('.panel-nav a').forEach((item) => {
      item.classList.remove('active');
    });
    link.classList.add('active');
    renderModule(link.dataset.view);
  });
});

showView('login');

if (!initSupabase()) {
  setLoginError('No se pudo cargar el cliente de Supabase. Recarga la página.');
} else {
  supabaseClient.auth
    .getSession()
    .then(({ data }) => handleSession(data.session))
    .catch(() => {});
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    handleSession(session);
  });
}

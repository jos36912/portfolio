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

const MODULES = {
  experiencia: {
    table: 'experience',
    itemLabel: 'Experiencia',
    fields: [
      ['role', 'Rol', 'text'],
      ['company', 'Empresa', 'text'],
      ['period', 'Período', 'text'],
      ['summary', 'Resumen', 'textarea'],
      ['tech', 'Tecnologías (una por línea)', 'list']
    ]
  }
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
  } else if (MODULES[name]) {
    renderListModule(view, MODULES[name]);
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

function renderListModule(view, def) {
  view.innerHTML = '';

  if (!supabaseClient) {
    view.appendChild(el('p', 'module-feedback module-feedback--error', 'Supabase no está disponible.'));
    return;
  }

  view.appendChild(el('p', 'module-feedback', 'Cargando...'));

  supabaseClient
    .from(def.table)
    .select('*')
    .order('id')
    .then(({ data, error }) => {
      view.innerHTML = '';

      if (error) {
        view.appendChild(
          el('p', 'module-feedback module-feedback--error', 'No se pudieron cargar los datos. ¿Ejecutaste supabase/schema.sql?')
        );
        return;
      }

      const toolbar = el('div', 'module-toolbar');
      toolbar.appendChild(el('span', 'module-count', data.length + ' registro(s)'));
      const newButton = el('button', 'btn btn--small', 'Nuevo');
      newButton.type = 'button';
      newButton.addEventListener('click', () => renderItemForm(view, def, null));
      toolbar.appendChild(newButton);
      view.appendChild(toolbar);

      if (!data.length) {
        view.appendChild(el('p', 'module-empty', 'No hay registros todavía. Crea el primero.'));
        return;
      }

      const list = el('div', 'module-list');
      data.forEach((row) => {
        list.appendChild(buildItemCard(view, row, def));
      });
      view.appendChild(list);
    });
}

function buildItemCard(view, row, def) {
  const card = el('article', 'module-item');

  const titleParts = [];
  if (row.role) titleParts.push(row.role);
  if (row.company) titleParts.push(row.company);
  card.appendChild(el('h3', 'module-item-title', titleParts.join(' · ') || 'Sin título'));

  if (row.period) {
    card.appendChild(el('p', 'module-item-meta', row.period));
  }

  if (row.tech && row.tech.length) {
    const tags = el('div', 'module-tags');
    row.tech.forEach((tech) => tags.appendChild(el('span', 'module-tag', tech)));
    card.appendChild(tags);
  }

  const actions = el('div', 'module-item-actions');
  const editButton = el('button', 'btn btn--small btn--secondary', 'Editar');
  editButton.type = 'button';
  editButton.addEventListener('click', () => renderItemForm(view, def, row));
  const deleteButton = el('button', 'btn btn--small btn--danger', 'Eliminar');
  deleteButton.type = 'button';
  deleteButton.addEventListener('click', async () => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    const { error } = await supabaseClient.from(def.table).delete().eq('id', row.id);
    if (error) {
      window.alert('Error al eliminar: ' + error.message);
    } else {
      renderListModule(view, def);
    }
  });
  actions.appendChild(editButton);
  actions.appendChild(deleteButton);
  card.appendChild(actions);

  return card;
}

function fieldValue(input, type) {
  return type === 'list' ? splitLines(input.value) : input.value.trim();
}

function renderItemForm(view, def, row) {
  const editing = Boolean(row);
  const form = el('form', 'module-form');
  const inputs = {};

  def.fields.forEach(([key, label, type]) => {
    form.appendChild(el('label', 'module-label', label));
    const input = el(type === 'list' || type === 'textarea' ? 'textarea' : 'input');
    input.name = key;
    input.id = def.table + '-' + key;
    input.className = 'module-input';
    if (type === 'text') input.type = 'text';
    if (type === 'list' || type === 'textarea') input.rows = 4;
    form.appendChild(input);
    inputs[key] = input;
  });

  const feedback = el('p', 'module-feedback');
  feedback.hidden = true;
  const submit = el('button', 'btn', editing ? 'Guardar cambios' : 'Crear');
  submit.type = 'submit';
  const cancelButton = el('button', 'btn btn--secondary', 'Cancelar');
  cancelButton.type = 'button';
  cancelButton.addEventListener('click', () => renderListModule(view, def));
  const actions = el('div', 'module-actions');
  actions.appendChild(submit);
  actions.appendChild(cancelButton);
  form.appendChild(feedback);
  form.appendChild(actions);
  view.appendChild(form);

  if (editing) {
    def.fields.forEach(([key, _label, type]) => {
      const value = row[key];
      inputs[key].value = type === 'list' ? (value || []).join('\n') : (value || '');
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.hidden = true;

    const payload = {};
    def.fields.forEach(([key, _label, type]) => {
      payload[key] = fieldValue(inputs[key], type);
    });

    submit.disabled = true;
    submit.textContent = 'Guardando...';

    const result = editing
      ? await supabaseClient.from(def.table).update(payload).eq('id', row.id)
      : await supabaseClient.from(def.table).insert(payload);

    submit.disabled = false;
    submit.textContent = editing ? 'Guardar cambios' : 'Crear';

    if (result.error) {
      showFeedback(feedback, 'Error al guardar: ' + result.error.message, true);
    } else {
      renderListModule(view, def);
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

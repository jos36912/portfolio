const supabase = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

const viewLogin = document.getElementById('view-login');
const viewPanel = document.getElementById('view-panel');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginSubmit = document.getElementById('login-submit');
const panelEmail = document.getElementById('panel-email');
const logoutButton = document.getElementById('logout');

function showView(name) {
  viewLogin.classList.toggle('hidden', name !== 'login');
  viewPanel.classList.toggle('hidden', name !== 'panel');
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

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  loginSubmit.disabled = true;
  loginSubmit.textContent = 'Ingresando...';

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  loginSubmit.disabled = false;
  loginSubmit.textContent = 'Iniciar sesión';

  if (error) {
    loginError.textContent = error.message;
    loginError.hidden = false;
  }
});

logoutButton.addEventListener('click', () => {
  supabase.auth.signOut();
});

document.querySelectorAll('.panel-nav a').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    document.querySelectorAll('.panel-nav a').forEach((item) => {
      item.classList.remove('active');
    });
    link.classList.add('active');
    document.getElementById('panel-title').textContent = link.textContent;
  });
});

supabase.auth.getSession().then(({ data }) => {
  handleSession(data.session);
});

supabase.auth.onAuthStateChange((_event, session) => {
  handleSession(session);
});

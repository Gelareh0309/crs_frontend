const form = document.getElementById("loginForm");
const btnLogin = document.getElementById("btnLogin");
const messageEl = document.getElementById("message");
const togglePwdBtn = document.getElementById("togglePwd");
const demoBtn = document.getElementById("btnDemo");

if (togglePwdBtn) {
  togglePwdBtn.addEventListener("click", () => {
    const pwd = document.getElementById("password");
    if (!pwd) return;
    if (pwd.type === "password") {
      pwd.type = "text";
      togglePwdBtn.textContent = "🙈";
    } else {
      pwd.type = "password";
      togglePwdBtn.textContent = "👁️";
    }
    pwd.focus();
  });
}

function showMessage(text, { type = "error" } = {}) {
  messageEl.textContent = text || "";
  messageEl.classList.remove("success");
  if (type === "success") messageEl.classList.add("success");
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await doLogin();
  });
}

async function doLogin() {
  const username = (document.getElementById("username") || {}).value?.trim();
  const password = (document.getElementById("password") || {}).value || "";
  const remember = (document.getElementById("remember") || {}).checked;

  if (!username || !password) {
    showMessage("نام کاربری و رمز عبور را وارد کنید.");
    return;
  }

  btnLogin.classList.add("loading");
  btnLogin.disabled = true;
  showMessage("");

  try {
    const data = await apiFetch("/login", {
      method: "POST",
      body: { username, password },
      auth: false,
    });

    const access =
      data?.accessToken || data?.access || data?.token || data?.accessToken;
    const refresh = data?.refreshToken || data?.refresh;

    if (!access) {
      throw data?.message || "پاسخ نامعتبر از سرور (توکن دریافت نشد).";
    }

    // store tokens
    if (remember) {
      localStorage.setItem("accessToken", access);
      if (refresh) localStorage.setItem("refreshToken", refresh);
    } else {
      sessionStorage.setItem("accessToken", access);
      if (refresh) sessionStorage.setItem("refreshToken", refresh);
    }

    let payload = {};
    try {
      const parts = access.split(".");
      if (parts.length >= 2) {
        payload = JSON.parse(
          atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
        );
      }
    } catch (err) {
      console.warn("invalid jwt decode", err);
    }

    let role =
      payload?.role ||
      payload?.roles ||
      payload?.user?.role ||
      payload?.data?.role ||
      null;
    if (Array.isArray(role)) role = role[0];

    if (!role && payload?.user?.roles)
      role = Array.isArray(payload.user.roles)
        ? payload.user.roles[0]
        : payload.user.roles;

    let redirect = "/../dashboard-student.html";
    if (role) {
      const r = String(role).toLowerCase();
      if (r.includes("admin"))
        redirect = "/../dashboard-admin.html";
      else if (r.includes("prof") || r.includes("teacher"))
        redirect = "/../dashboard-professor.html";
      else redirect = "/../dashboard-student.html";
    } else {
      redirect = "/../dashboard-student.html";
    }

    showMessage("ورود موفق — در حال هدایت...", { type: "success" });

    setTimeout(() => {
      if (sessionStorage.getItem("accessToken")) {
        localStorage.setItem(
          "accessToken",
          sessionStorage.getItem("accessToken")
        );
      }
      window.location.href = redirect;
    }, 700);
  } catch (err) {
    console.error(err);
    let text =
      typeof err === "string"
        ? err
        : err?.message || err?.detail || JSON.stringify(err);
    showMessage(text);
  } finally {
    btnLogin.classList.remove("loading");
    btnLogin.disabled = false;
  }
}

if (demoBtn) {
  demoBtn.addEventListener("click", async () => {
    document.getElementById("username").value = "admin";
    document.getElementById("password").value = "admin";
    await doLogin();
  });
}

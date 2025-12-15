/* ================== Config ================== */
const API_BASE = "http://localhost:3001";
const ENDPOINTS = {
  LESSON: "/lesson-admin",
  CREATE_STUDENT: "/student",
  CREATE_PROFESSOR: "/professor",
  CREATE_ADMIN: "/admin",
  CHANGE_PASS: "/change-password",
  LOGIN: "/login",
  REFRESH: "/refresh", // optional
};

/* ================== Helpers ================== */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const escapeHtml = (s) =>
  s === null || s === undefined
    ? ""
    : String(s).replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          }[c])
      );

/* format date => YYYY-MM-DD | HH:MM (local) */
function formatDateISO(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} | ${hh}:${mi}`;
}

/* token helpers */
function getToken() {
  return (
    localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken")
  );
}
function setToken(t, remember = false) {
  if (remember) localStorage.setItem("accessToken", t);
  else sessionStorage.setItem("accessToken", t);
}
function removeToken() {
  localStorage.removeItem("accessToken");
  sessionStorage.removeItem("accessToken");
}

/* fetch wrapper */
async function apiFetch(
  path,
  { method = "GET", body = null, auth = true } = {}
) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
  }
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }
  if (!res.ok) throw data || { status: res.status, message: res.statusText };
  return data;
}

/* ========== UI Boot & Navigation ========== */
function setActivePanel(name) {
  // menu
  $$(".menu-item").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.dataset.panel === name || btn.dataset.section === name
    );
  });
  // title
  $("#pageTitle").textContent =
    {
      overview: "نمای کلی",
      lessons: "مدیریت دروس",
      "create-user": "افزودن کاربر",
      profile: "پروفایل",
    }[name] || "داشبورد";
  // panels
  [
    "panel-overview",
    "panel-lessons",
    "panel-create-user",
    "panel-profile",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display =
      id === "panel-" + name.replace("create-user", "create-user")
        ? "block"
        : el.id === "panel-" + name
        ? "block"
        : "none";
  });
  // special: map names:
  if (name === "create-user")
    document.getElementById("panel-create-user").style.display = "block";
  if (name === "overview") {
    document.getElementById("panel-overview").style.display = "block";
  }
  if (name === "lessons") {
    document.getElementById("panel-lessons").style.display = "block";
  }
  if (name === "profile") {
    document.getElementById("panel-profile").style.display = "block";
  }
}

/* hook menu */
$$(".menu-item").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const panel = btn.dataset.panel || btn.dataset.section;
    // clear active on others
    $$(".menu-item").forEach((x) => x.classList.remove("active"));
    btn.classList.add("active");
    // show section
    if (panel === "create-user") {
      setActivePanel("create-user");
      renderUserForm("STUDENT"); // default
    } else {
      setActivePanel(panel);
      if (panel === "lessons") loadLessons();
      if (panel === "overview") loadOverview();
      if (panel === "profile") loadProfile();
    }
  });
});

/* mobile sidebar toggle */
$("#mobileToggle").addEventListener("click", () => {
  const sb = $("#sidebar");
  sb.classList.toggle("open");
});

/* close sidebar on outside click (mobile) */
document.addEventListener("click", (e) => {
  if (window.innerWidth < 1000) {
    if (!e.target.closest("#sidebar") && !e.target.closest("#mobileToggle"))
      $("#sidebar").classList.remove("open");
  }
});

/* logout */
$("#btnLogout").addEventListener("click", () => {
  removeToken();
  window.location.href = "index.html";
});

/* ========== Overview ========== */
async function loadOverview() {
  $("#statLessons").textContent = "...";
  $("#activityList").innerHTML = '<div class="muted">در حال بارگذاری...</div>';
  try {
    const lessons = await apiFetch(ENDPOINTS.LESSON);
    $("#statLessons").textContent = Array.isArray(lessons)
      ? lessons.length
      : "—";
    const recent = Array.isArray(lessons) ? lessons.slice(0, 6) : [];
    $("#activityList").innerHTML = recent.length
      ? recent
          .map(
            (l) => `
      <div class="activity-item">
        <div>${escapeHtml(l.title)}</div>
        <div class="muted small">${formatDateISO(
          l.createdAt || l.createdAt
        )}</div>
      </div>
    `
          )
          .join("")
      : '<div class="muted">موردی وجود ندارد</div>';
  } catch (err) {
    console.error(err);
    $("#activityList").innerHTML =
      '<div class="muted">خطا در دریافت اطلاعات</div>';
    $("#statLessons").textContent = "-";
  }
}

/* ========== Lessons CRUD ========== */
const lessonsTbody = $("#lessonsTbody");
let currentEditId = null;

async function loadLessons() {
  lessonsTbody.innerHTML = `<tr><td colspan="5" class="muted">در حال بارگذاری...</td></tr>`;
  try {
    const lessons = await apiFetch(ENDPOINTS.LESSON);
    if (!Array.isArray(lessons) || lessons.length === 0) {
      lessonsTbody.innerHTML = `<tr><td colspan="5" class="muted">هیچ دریسی یافت نشد</td></tr>`;
      return;
    }
    lessonsTbody.innerHTML = lessons
      .map((l) => {
        let creator = "-";

        if (l.createdBy) {
          if (typeof l.createdBy === "string") {
            creator = `کاربر #${l.createdBy}`;
          } else if (typeof l.createdBy === "object") {
            const fn = l.createdBy.firstName || "";
            const ln = l.createdBy.lastName || "";
            const un = l.createdBy.username || "";
            if (fn || ln) creator = `${fn} ${ln}`.trim();
            else if (un) creator = un;
            else if (l.createdBy._id) creator = `کاربر #${l.createdBy._id}`;
          }
        }
        console.log(l);
        return `<tr>
        <td>
          <div class="lesson-title">${escapeHtml(l.title || "")}</div>
        </td>
        <td>${escapeHtml(String(l.unit || ""))}</td>
        <td>${escapeHtml(creator)}</td>
        <td>${escapeHtml(l.type || "")}</td>
        <td>${escapeHtml(l.field || "")}</td>
        <td>${escapeHtml(l.lessonId || "")}</td>
        <td>${escapeHtml(
          l?.prerequisite?.map((p) => p.title).join(", ") || ""
        )}</td>
        <td>${formatDateISO(l.createdAt || l.createdAt)}</td>
        <td style="white-space:nowrap">
          <button class="btn ghost" data-action="edit" data-id="${
            l._id || l.id || ""
          }">ویرایش</button>
          <button class="btn" data-action="delete" data-id="${
            l._id || l.id || ""
          }" style="margin-left:8px;background:#ef4444;color:white">حذف</button>
        </td>
      </tr>`;
    })
    .join("");
  }catch (err) {
  console.error(err);
  lessonsTbody.innerHTML = `<tr><td colspan="5" class="muted">خطا در دریافت دروس</td></tr>`;
  }
}

/* delegates for edit/delete */
lessonsTbody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === "edit") openLessonEdit(id);
  if (action === "delete") confirmDelete(id);
});

/* open add lesson modal */
$("#openAddLesson").addEventListener("click", async () => {
  currentEditId = null;
  $("#lessonModalTitle").textContent = "ایجاد درس";
  $("#mTitle").value = "";
  $("#mUnit").value = 1;
  $("#mType").value = "";
  $("#mField").value = "";
  $("#mLessonId").value = "";
  await populatePrereqSelect();
  openModal("lessonModal");
});

async function populatePrereqSelect(selectedIds = []) {
  const sel = $("#mPrereq");
  sel.innerHTML = "<option disabled>در حال بارگذاری…</option>";
  try {
    const lessons = await apiFetch(ENDPOINTS.LESSON);
    sel.innerHTML = lessons
      .filter((l) => !currentEditId || (l._id || l.id) !== currentEditId)
      .map(
        (l) =>
          `<option value="${l._id || l.id}" ${
            selectedIds.includes(l._id || l.id) ? "selected" : ""
          }>${escapeHtml(l.title)}</option>`
      )
      .join("");
  } catch (e) {
    sel.innerHTML = "<option disabled>خطا در دریافت دروس</option>";
  }
}

/* save lesson */
$("#saveLesson").addEventListener("click", async () => {
  const title = $("#mTitle").value.trim();
  const unit = Number($("#mUnit").value) || 1;
  const type = $("#mType").value.trim();
  const field = $("#mField").value.trim();
  const lessonId = $("#mLessonId").value.trim();
  const prerequisite = Array.from($("#mPrereq").selectedOptions).map(
    (o) => o.value
  );

  if (!title) {
    alert("عنوان را وارد کنید");
    return;
  }
  try {
    if (currentEditId) {
      await apiFetch(
        ENDPOINTS.LESSON + "/" + encodeURIComponent(currentEditId),
        {
          method: "PUT",
          body: { title, unit, type, field, lessonId, prerequisite },
        }
      );
    } else {
      await apiFetch(ENDPOINTS.LESSON, {
        method: "POST",
        body: { title, unit, type, field, lessonId, prerequisite },
      });
    }
    closeModal("lessonModal");
    await loadLessons();
    await loadOverview();
  } catch (err) {
    console.error(err);
    alert(err?.message || "خطا در ذخیره درس");
  }
});

/* open edit */
async function openLessonEdit(id) {
  try {
    const data = await apiFetch(
      ENDPOINTS.LESSON + "/" + encodeURIComponent(id)
    );
    currentEditId = id;
    $("#lessonModalTitle").textContent = "ویرایش درس";
    $("#mTitle").value = data.title || "";
    $("#mUnit").value = data.unit || 1;
    $("#mType").value = data.type || "";
    $("#mField").value = data.field || "";
    $("#mLessonId").value = data.lessonId || "";
    const preIds = Array.isArray(data.prerequisite)
      ? data.prerequisite.map((p) => p._id || p.id)
      : [];
    await populatePrereqSelect(preIds);
    openModal("lessonModal");
  } catch (err) {
    console.error(err);
    alert("خطا در دریافت درس");
  }
}

/* delete flow */
let deleteTargetId = null;
function confirmDelete(id) {
  deleteTargetId = id;
  $("#confirmText").textContent =
    "آیا می‌خواهید این درس را حذف کنید؟ این عمل برگشت‌پذیر نیست.";
  openModal("confirmModal");
}
$("#okConfirm").addEventListener("click", async () => {
  if (!deleteTargetId) return;
  try {
    await apiFetch(
      ENDPOINTS.LESSON + "/" + encodeURIComponent(deleteTargetId),
      { method: "DELETE" }
    );
    closeModal("confirmModal");
    deleteTargetId = null;
    loadLessons();
    loadOverview();
  } catch (err) {
    console.error(err);
    alert("خطا در حذف");
  }
});
$("#cancelConfirm").addEventListener("click", () => {
  closeModal("confirmModal");
  deleteTargetId = null;
});

/* ========== Modal helpers ========== */
function openModal(id) {
  $("#overlay").classList.remove("hidden");
  $("#" + id).classList.remove("hidden");
  $("#overlay").setAttribute("aria-hidden", "false");
}
function closeModal(id) {
  $("#overlay").classList.add("hidden");
  $("#" + id).classList.add("hidden");
  $("#overlay").setAttribute("aria-hidden", "true");
}
$("#closeLesson").addEventListener("click", () => closeModal("lessonModal"));
$("#overlay").addEventListener("click", () => {
  closeModal("lessonModal");
  closeModal("confirmModal");
});

/* ========== Create User (dynamic form) ========== */
function activateStep(step) {
  ["step1", "step2", "step3"].forEach((id) => {
    document.getElementById(id).classList.add("hidden");
  });

  document.getElementById(`step${step}`).classList.remove("hidden");

  // Update step indicators
  [1, 2, 3].forEach((n) => {
    document.getElementById(`stepDot${n}`).classList.remove("active-step");
  });
  document.getElementById(`stepDot${step}`).classList.add("active-step");
}

$("#roleSelect").addEventListener("change", () => {
  const role = $("#roleSelect").value;

  $("#professorFields").style.display = role === "PROFESSOR" ? "block" : "none";

  $("#studentFields").style.display = role === "STUDENT" ? "block" : "none";
});

document.getElementById("goStep2").addEventListener("click", () => {
  if (
    !$("#uFirst").value.trim() ||
    !$("#uLast").value.trim() ||
    !$("#uUsername").value.trim()
  ) {
    alert("لطفاً اطلاعات مرحله اول را کامل کنید.");
    return;
  }
  activateStep(2);
});

document.getElementById("backStep1").addEventListener("click", () => {
  activateStep(1);
});

document.getElementById("goStep3").addEventListener("click", () => {
  if (
    !$("#uNationalId").value.trim() ||
    !$("#uPhone").value.trim() ||
    !$("#uAddress").value.trim()
  ) {
    alert("اطلاعات تماس ناقص است.");
    return;
  }
  activateStep(3);
});

document.getElementById("backStep2").addEventListener("click", () => {
  activateStep(2);
});

/* CREATE USER */
$("#createUserBtn").addEventListener("click", async () => {
  const role = $("#roleSelect").value;

  const body = {
    firstName: $("#uFirst").value.trim(),
    lastName: $("#uLast").value.trim(),
    username: $("#uUsername").value.trim(),
    gender: $("#uGender").value,
    nationalId: $("#uNationalId").value.trim(),
    phone: $("#uPhone").value.trim(),
    address: $("#uAddress").value.trim(),
    password: $("#uPass").value,
    confirmPassword: $("#uPass2").value,
  };

  if (role === "PROFESSOR") {
    body.faculty = $("#uFaculty")?.value?.trim() || "";
    body.education = $("#uEducation")?.value?.trim() || "";
  }
  if (role === "STUDENT") {
    body.major = $("#uMajor")?.value?.trim() || "";
  }

  if (!body.password || body.password !== body.confirmPassword) {
    alert("رمز عبور و تکرار آن یکسان نیست.");
    return;
  }

  let endpoint = ENDPOINTS.CREATE_STUDENT;
  if (role === "ADMIN") endpoint = ENDPOINTS.CREATE_ADMIN;
  if (role === "PROFESSOR") endpoint = ENDPOINTS.CREATE_PROFESSOR;

  try {
    $("#createUserBtn").disabled = true;
    $("#createUserBtn").textContent = "در حال ارسال...";

    await apiFetch(endpoint, {
      method: "POST",
      body,
      auth: true,
    });

    alert("کاربر با موفقیت ایجاد شد!");
    activateStep(1);

    // reset form:
    $("#uFirst").value = "";
    $("#uLast").value = "";
    $("#uUsername").value = "";
    $("#uGender").value = "MALE";
    $("#uNationalId").value = "";
    $("#uPhone").value = "";
    $("#uAddress").value = "";
    $("#uPass").value = "";
    $("#uPass2").value = "";
  } catch (err) {
    alert(err?.message || "خطا در ایجاد کاربر");
    console.error(err);
  } finally {
    $("#createUserBtn").disabled = false;
    $("#createUserBtn").textContent = "ایجاد کاربر";
  }
});

/* ========== Profile ========== */
async function loadProfile() {
  const tok = getToken();
  if (!tok) return;
  try {
    // attempt decode token payload to get name/role
    const payload = JSON.parse(
      atob(tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    $("#userName").textContent = payload.firstName
      ? payload.firstName + (payload.lastName ? " " + payload.lastName : "")
      : payload.username || "مدیر";
    $("#userRole").textContent =
      payload.role || (payload.roles && payload.roles[0]) || "ADMIN";
    $("#avatar").textContent = (
      payload.firstName
        ? payload.firstName[0]
        : payload.username
        ? payload.username[0]
        : "A"
    ).toUpperCase();
    $("#profileFirst").value = payload.firstName || "";
    $("#profileLast").value = payload.lastName || "";
  } catch (e) {
    console.warn("token decode failed", e);
  }
}

/* change password */
$("#changePassBtn").addEventListener("click", async () => {
  const oldP = $("#profileOld").value,
    newP = $("#profileNew").value;
  if (!oldP || !newP) {
    alert("فیلدها را پر کنید");
    return;
  }
  try {
    await apiFetch(ENDPOINTS.CHANGE_PASS, {
      method: "POST",
      body: { oldPassword: oldP, newPassword: newP, confirmNewPassword: newP },
    });
    alert("رمز با موفقیت تغییر کرد");
    $("#profileOld").value = "";
    $("#profileNew").value = "";
  } catch (err) {
    console.error(err);
    alert(err?.message || "خطا در تغییر رمز");
  }
});

function loadAdminHeader() {
  const token =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const username = payload.username || "مدیر";
    const role = payload.role || "ADMIN";

    document.getElementById("userName").textContent = username;
    document.getElementById("userRole").textContent = role;
  } catch (e) {
    console.error("Invalid token", e);
  }
}

/* ========== init ========= */
(function init() {
  loadAdminHeader();
  // default panel
  setActivePanel("overview");
  // load initial overview
  loadOverview();
  // render initial user form default STUDENT
  renderUserForm("STUDENT");
  // load profile from token if exists
  loadProfile();
})();

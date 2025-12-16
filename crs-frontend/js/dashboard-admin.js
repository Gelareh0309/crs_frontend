const API_BASE = "http://localhost:3001";
const ENDPOINTS = {
  LESSON: "/lesson-admin",
  FACULTY: "/faculty",
  MAJOR: "/major",
  CLASSROOM: "/classroom",
  SECTION: "/section",
  CREATE_STUDENT: "/student",
  CREATE_PROFESSOR: "/professor",
  CREATE_ADMIN: "/admin",
  CHANGE_PASS: "/change-password",
  LOGIN: "/login",
  REFRESH: "/refresh",
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
      faculty: "مدیریت دانشکده‌ها",
      section: "مدیریت سکشن‌ها",
      "create-user": "افزودن کاربر",
      profile: "پروفایل",
    }[name] || "داشبورد";
  // panels
  [
    "panel-overview",
    "panel-lessons",
    "panel-faculty",
    "panel-major",
    "panel-classroom",
    "panel-section",
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

  if (name === "faculty") {
    document.getElementById("panel-faculty").style.display = "block";
  }
  if (name === "major") {
    document.getElementById("panel-major").style.display = "block";
  }
  if (name === "section") {
    document.getElementById("panel-section").style.display = "block";
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
      if (panel === "faculty") loadFaculties();
      if (panel === "major") loadMajors();
      if (panel === "classroom") loadClassrooms();
      if (panel === "section") loadSections();
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
/* faculties table */

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
  } catch (err) {
    console.error(err);
    lessonsTbody.innerHTML = `<tr><td colspan="5" class="muted">خطا در دریافت دروس</td></tr>`;
  }
}
const facultiesTbody = $("#facultiesTbody");
let currentFacultyEditId = null;

/* majors table */
const majorsTbody = $("#majorsTbody");
let currentMajorEditId = null;

/* classrooms table */
const classroomsTbody = $("#classroomsTbody");
let currentClassroomEditId = null;

/* sections table */
const sectionsTbody = $("#sectionsTbody");
let currentSectionEditId = null;

/* day-of-week mapping (EN -> FA) */
const dayNamesFa = {
  MONDAY: "دوشنبه",
  TUESDAY: "سه‌شنبه",
  WEDNESDAY: "چهارشنبه",
  THURSDAY: "پنجشنبه",
  FRIDAY: "جمعه",
  SATURDAY: "شنبه",
  SUNDAY: "یکشنبه",
};

async function loadMajors() {
  majorsTbody.innerHTML = `<tr><td colspan="5" class="muted">در حال بارگذاری...</td></tr>`;
  try {
    const majors = await apiFetch(ENDPOINTS.MAJOR);
    if (!Array.isArray(majors) || majors.length === 0) {
      majorsTbody.innerHTML = `<tr><td colspan="5" class="muted">هیچ رشته‌ای یافت نشد</td></tr>`;
      return;
    }
    majorsTbody.innerHTML = majors
      .map((m) => {
        const facName = (m.faculty && m.faculty.name) || "-";
        return `<tr>
        <td>${escapeHtml(m.title || "-")}</td>
        <td>${escapeHtml(m.code || "-")}</td>
        <td>${formatDateISO(m.createdAt)}</td>
        <td style="white-space:nowrap">
          <button class="btn ghost" data-action="edit" data-id="${
            m._id || m.id || ""
          }">ویرایش</button>
          <button class="btn" data-action="delete" data-id="${
            m._id || m.id || ""
          }" style="margin-left:8px;background:#ef4444;color:white">حذف</button>
        </td>
      </tr>`;
      })
      .join("");
  } catch (err) {
    console.error(err);
    majorsTbody.innerHTML = `<tr><td colspan="5" class="muted">خطا در دریافت رشته‌ها</td></tr>`;
  }
}

async function loadFaculties() {
  facultiesTbody.innerHTML = `<tr><td colspan="5" class="muted">در حال بارگذاری...</td></tr>`;
  try {
    const faculties = await apiFetch(ENDPOINTS.FACULTY);
    if (!Array.isArray(faculties) || faculties.length === 0) {
      facultiesTbody.innerHTML = `<tr><td colspan="5" class="muted">هیچ دانشکده‌ای یافت نشد</td></tr>`;
      return;
    }
    facultiesTbody.innerHTML = faculties
      .map((f) => {
        return `<tr>
        <td>${escapeHtml(f.name || "-")}</td>
        <td>${formatDateISO(f.createdAt)}</td>
        <td style="white-space:nowrap">
          <button class="btn ghost" data-action="edit" data-id="${
            f._id || f.id || ""
          }">ویرایش</button>
          <button class="btn" data-action="delete" data-id="${
            f._id || f.id || ""
          }" style="margin-left:8px;background:#ef4444;color:white">حذف</button>
        </td>
      </tr>`;
      })
      .join("");
  } catch (err) {
    console.error(err);
    facultiesTbody.innerHTML = `<tr><td colspan="5" class="muted">خطا در دریافت دانشکده‌ها</td></tr>`;
  }
}

async function loadClassrooms() {
  classroomsTbody.innerHTML = `<tr><td colspan="5" class="muted">در حال بارگذاری...</td></tr>`;
  try {
    const classrooms = await apiFetch(ENDPOINTS.CLASSROOM);
    if (!Array.isArray(classrooms) || classrooms.length === 0) {
      classroomsTbody.innerHTML = `<tr><td colspan="5" class="muted">هیچ کلاسی یافت نشد</td></tr>`;
      return;
    }
    classroomsTbody.innerHTML = classrooms
      .map((c) => {
        const facName =
          (c.faculty && (c.faculty.name || c.faculty.title)) || "-";
        return `<tr>
        <td>${escapeHtml(String(c.roomNumber || c.room_number || "-"))}</td>
        <td>${escapeHtml(String(c.capacity || "-"))}</td>
        <td>${escapeHtml(facName)}</td>
        <td>${formatDateISO(c.createdAt)}</td>
        <td style="white-space:nowrap">
          <button class="btn ghost" data-action="edit" data-id="${
            c._id || c.id || ""
          }">ویرایش</button>
          <button class="btn" data-action="delete" data-id="${
            c._id || c.id || ""
          }" style="margin-left:8px;background:#ef4444;color:white">حذف</button>
        </td>
      </tr>`;
      })
      .join("");
  } catch (err) {
    console.error(err);
    classroomsTbody.innerHTML = `<tr><td colspan="5" class="muted">خطا در دریافت کلاس‌ها</td></tr>`;
  }
}
async function searchSection() {
  const search = document.getElementById("secSearch").value;
  loadSections(search);
}
async function loadSections(search = "") {
  sectionsTbody.innerHTML = `<tr><td colspan="7" class="muted">در حال بارگذاری...</td></tr>`;
  try {
    const sections = await apiFetch(`${ENDPOINTS.SECTION}?search=${search}`, {
      method: "GET",
    });
    if (!Array.isArray(sections) || sections.length === 0) {
      sectionsTbody.innerHTML = `<tr><td colspan="7" class="muted">هیچ سکشنی یافت نشد</td></tr>`;
      return;
    }
    sectionsTbody.innerHTML = sections
      .map((s) => {
        const lessonTitle = (s.lesson && s.lesson.title) || "-";
        const profName =
          (s.professorUser &&
            (
              (s.professorUser.firstName || "") +
              " " +
              (s.professorUser.lastName || "")
            ).trim()) ||
          (s.professorUser && s.professorUser.username) ||
          "-";
        const classroomLabel = (s.classroom && s.classroom.room_number) || "-";
        const capacity = s.capacity ?? "-";
        const schedulesText = Array.isArray(s.schedules)
          ? s.schedules
              .map((sch) => {
                const dow = sch.day_of_week || "";
                const st = sch.start_time || "";
                const et = sch.endTime || "";
                if (!dow && !st && !et) return "";
                const faDay = dayNamesFa[dow] || dow;
                return `${faDay} ${st}-${et}`.trim();
              })
              .filter(Boolean)
              .join("<br>")
          : "";
        return `<tr>
        <td>${escapeHtml(lessonTitle)}</td>
        <td>${escapeHtml(profName)}</td>
        <td>${escapeHtml(classroomLabel)}</td>
        <td>${escapeHtml(String(capacity))}</td>
        <td>${schedulesText || "-"}</td>
        <td>${formatDateISO(s.createdAt)}</td>
        <td style="white-space:nowrap">
          <button class="btn ghost" data-action="edit" data-id="${
            s._id || s.id || ""
          }">ویرایش</button>
          <button class="btn" data-action="delete" data-id="${
            s._id || s.id || ""
          }" style="margin-left:8px;background:#ef4444;color:white">حذف</button>
        </td>
      </tr>`;
      })
      .join("");
  } catch (err) {
    console.error(err);
    sectionsTbody.innerHTML = `<tr><td colspan="7" class="muted">خطا در دریافت سکشن‌ها</td></tr>`;
  }
}

/* delegates for edit/delete MAJOR */
majorsTbody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === "edit") openMajorEdit(id);
  if (action === "delete") confirmMajorDelete(id);
});

/* open add major modal */
$("#openAddMajor")?.addEventListener("click", () => {
  currentMajorEditId = null;
  $("#majorModalTitle").textContent = "ایجاد رشته";
  $("#majName").value = "";
  $("#majCode").value = "";
  openModal("majorModal");
});

/* save major */
$("#saveMajor")?.addEventListener("click", async () => {
  const title = $("#majName").value.trim();
  const code = $("#majCode").value.trim();
  if (!title || !code) {
    alert("نام و کد رشته را وارد کنید");
    return;
  }
  try {
    if (currentMajorEditId) {
      await apiFetch(
        ENDPOINTS.MAJOR + "/" + encodeURIComponent(currentMajorEditId),
        {
          method: "PUT",
          body: { title, code },
        }
      );
    } else {
      await apiFetch(ENDPOINTS.MAJOR, {
        method: "POST",
        body: { title, code },
      });
    }
    closeModal("majorModal");
    await loadMajors();
    await loadOverview();
  } catch (err) {
    console.error(err);
    alert(err?.message || "خطا در ذخیره رشته");
  }
});

async function openMajorEdit(id) {
  try {
    const data = await apiFetch(ENDPOINTS.MAJOR + "/" + encodeURIComponent(id));
    currentMajorEditId = id;
    $("#majorModalTitle").textContent = "ویرایش رشته";
    $("#majName").value = data.title || "";
    $("#majCode").value = data.code || "";
    openModal("majorModal");
  } catch (err) {
    console.error(err);
    alert("خطا در دریافت رشته");
  }
}

async function confirmMajorDelete(id) {
  try {
    await apiFetch(ENDPOINTS.MAJOR + "/" + encodeURIComponent(id), {
      method: "DELETE",
    });
    closeModal("confirmModal");
    await loadMajors();
    await loadOverview();
  } catch (error) {
    alert("خطا در دریافت رشته");
  }
}

/* delegates for edit/delete FACULTY */
facultiesTbody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === "edit") openFacultyEdit(id);
  if (action === "delete") confirmFacultyDelete(id);
});

/* open add faculty modal */
$("#openAddFaculty")?.addEventListener("click", () => {
  currentFacultyEditId = null;
  $("#facultyModalTitle").textContent = "ایجاد دانشکده";
  $("#fName").value = "";
  openModal("facultyModal");
});

/* save faculty */
$("#saveFaculty")?.addEventListener("click", async () => {
  const name = $("#fName").value.trim();
  if (!name) {
    alert("نام دانشکده را وارد کنید");
    return;
  }
  try {
    if (currentFacultyEditId) {
      await apiFetch(
        ENDPOINTS.FACULTY + "/" + encodeURIComponent(currentFacultyEditId),
        {
          method: "PUT",
          body: { name },
        }
      );
    } else {
      await apiFetch(ENDPOINTS.FACULTY, {
        method: "POST",
        body: { name },
      });
    }
    closeModal("facultyModal");
    await loadFaculties();
    await loadOverview();
  } catch (err) {
    console.error(err);
    alert(err?.message || "خطا در ذخیره دانشکده");
  }
});

async function openFacultyEdit(id) {
  try {
    const data = await apiFetch(
      ENDPOINTS.FACULTY + "/" + encodeURIComponent(id)
    );
    currentFacultyEditId = id;
    $("#facultyModalTitle").textContent = "ویرایش دانشکده";
    $("#fName").value = data.name || "";
    openModal("facultyModal");
  } catch (err) {
    console.error(err);
    alert("خطا در دریافت دانشکده");
  }
}

async function confirmFacultyDelete(id) {
  try {
    await apiFetch(ENDPOINTS.FACULTY + "/" + encodeURIComponent(id), {
      method: "DELETE",
    });
    closeModal("confirmModal");
    await loadFaculties();
    await loadOverview();
  } catch (error) {
    alert("خطا در دریافت دانشکده");
  }
}

/* delegates for edit/delete CLASSROOM */
classroomsTbody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === "edit") openClassroomEdit(id);
  if (action === "delete") confirmClassroomDelete(id);
});

/* open add classroom modal */
$("#openAddClassroom")?.addEventListener("click", async () => {
  currentClassroomEditId = null;
  $("#classroomModalTitle").textContent = "ایجاد کلاس";
  $("#crRoom").value = "";
  $("#crCapacity").value = 1;
  await populateClassroomFacultySelect();
  openModal("classroomModal");
});

async function populateClassroomFacultySelect(selectedId = "") {
  const sel = $("#crFacultySelect");
  if (!sel) return;
  sel.innerHTML = "<option disabled>در حال بارگذاری…</option>";
  try {
    const faculties = await apiFetch(ENDPOINTS.FACULTY);
    if (!Array.isArray(faculties) || faculties.length === 0) {
      sel.innerHTML = "<option disabled>هیچ دانشکده‌ای یافت نشد</option>";
      return;
    }
    sel.innerHTML = faculties
      .map((f) => {
        const id = f._id || f.id;
        const name = f.name || f.title || "-";
        return `<option value="${id}" ${
          selectedId && selectedId === id ? "selected" : ""
        }>${escapeHtml(name)}</option>`;
      })
      .join("");
  } catch (e) {
    console.error(e);
    sel.innerHTML = "<option disabled>خطا در دریافت دانشکده‌ها</option>";
  }
}

/* save classroom */
$("#saveClassroom")?.addEventListener("click", async () => {
  const roomInput = $("#crRoom");
  const capInput = $("#crCapacity");
  const facSel = $("#crFacultySelect");
  const roomRaw = roomInput?.value?.trim() || "";
  const capacityRaw = capInput?.value || "";
  const facultyId = facSel?.value || "";

  if (!roomRaw || !capacityRaw || !facultyId) {
    alert("شماره کلاس، ظرفیت و دانشکده را وارد کنید");
    return;
  }

  const body = {
    room_number: roomRaw,
    capacity: Number(capacityRaw) || 0,
    faculty: facultyId,
  };

  try {
    if (currentClassroomEditId) {
      await apiFetch(
        ENDPOINTS.CLASSROOM + "/" + encodeURIComponent(currentClassroomEditId),
        {
          method: "PUT",
          body,
        }
      );
    } else {
      await apiFetch(ENDPOINTS.CLASSROOM, {
        method: "POST",
        body,
      });
    }
    closeModal("classroomModal");
    await loadClassrooms();
    await loadOverview();
  } catch (err) {
    console.error(err);
    alert(err?.message || "خطا در ذخیره کلاس");
  }
});

async function openClassroomEdit(id) {
  try {
    const data = await apiFetch(
      ENDPOINTS.CLASSROOM + "/" + encodeURIComponent(id)
    );
    currentClassroomEditId = id;
    $("#classroomModalTitle").textContent = "ویرایش کلاس";
    $("#crRoom").value = data.roomNumber || data.room_number || "";
    $("#crCapacity").value = data.capacity || 1;
    const currentFacultyId =
      (data.faculty && (data.faculty._id || data.faculty.id)) ||
      data.facultyId ||
      "";
    await populateClassroomFacultySelect(currentFacultyId);
    openModal("classroomModal");
  } catch (err) {
    console.error(err);
    alert("خطا در دریافت کلاس");
  }
}

async function confirmClassroomDelete(id) {
  try {
    await apiFetch(ENDPOINTS.CLASSROOM + "/" + encodeURIComponent(id), {
      method: "DELETE",
    });
    closeModal("confirmModal");
    await loadClassrooms();
    await loadOverview();
  } catch (error) {
    console.error(error);
    alert("خطا در حذف کلاس");
  }
}

/* delegates for edit/delete SECTION */
sectionsTbody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === "edit") openSectionEdit(id);
  if (action === "delete") confirmSectionDelete(id);
});

/* open add section modal */
$("#openAddSection")?.addEventListener("click", async () => {
  currentSectionEditId = null;
  $("#sectionModalTitle").textContent = "ایجاد سکشن";
  $("#secCapacity").value = 1;
  clearScheduleRows();
  addScheduleRow();
  await populateSectionSelects();
  openModal("sectionModal");
});

$("#refreshSections")?.addEventListener("click", () => {
  loadSections();
});

async function populateSectionSelects(
  selectedProfessorId = "",
  selectedClassroomId = "",
  selectedLessonId = ""
) {
  const profSel = $("#secProfessor");
  const classSel = $("#secClassroom");
  const lessonSel = $("#secLesson");
  if (!profSel || !classSel || !lessonSel) return;

  profSel.innerHTML = "<option disabled>در حال بارگذاری استادان…</option>";
  classSel.innerHTML = "<option disabled>در حال بارگذاری کلاس‌ها…</option>";
  lessonSel.innerHTML = "<option disabled>در حال بارگذاری دروس…</option>";

  try {
    const [professors, classrooms, lessons] = await Promise.all([
      apiFetch(ENDPOINTS.CREATE_PROFESSOR),
      apiFetch(ENDPOINTS.CLASSROOM),
      apiFetch(ENDPOINTS.LESSON),
    ]);

    // professors
    if (Array.isArray(professors) && professors.length) {
      profSel.innerHTML = professors
        .map((p) => {
          const user = p.user || p.professorUser || {};
          const fullName = (
            (user.firstName || "") +
            " " +
            (user.lastName || "")
          ).trim();
          const label = fullName || user.username || "استاد بدون نام";
          const id = p._id || p.id;
          return `<option value="${id}" ${
            selectedProfessorId && selectedProfessorId === id ? "selected" : ""
          }>${escapeHtml(label)}</option>`;
        })
        .join("");
    } else {
      profSel.innerHTML = "<option disabled>استادی یافت نشد</option>";
    }

    // classrooms
    if (Array.isArray(classrooms) && classrooms.length) {
      classSel.innerHTML = classrooms
        .map((c) => {
          const label = c.room_number || c.roomNumber || "کلاس بدون شماره";
          const id = c._id || c.id;
          return `<option value="${id}" ${
            selectedClassroomId && selectedClassroomId === id ? "selected" : ""
          }>${escapeHtml(label)}</option>`;
        })
        .join("");
    } else {
      classSel.innerHTML = "<option disabled>کلاسی یافت نشد</option>";
    }

    // lessons
    if (Array.isArray(lessons) && lessons.length) {
      lessonSel.innerHTML = lessons
        .map((l) => {
          const label = l.title || l.lessonId || "درس بدون عنوان";
          const id = l._id || l.id;
          return `<option value="${id}" ${
            selectedLessonId && selectedLessonId === id ? "selected" : ""
          }>${escapeHtml(label)}</option>`;
        })
        .join("");
    } else {
      lessonSel.innerHTML = "<option disabled>درسی یافت نشد</option>";
    }
  } catch (e) {
    console.error(e);
    profSel.innerHTML = "<option disabled>خطا در دریافت استادان</option>";
    classSel.innerHTML = "<option disabled>خطا در دریافت کلاس‌ها</option>";
    lessonSel.innerHTML = "<option disabled>خطا در دریافت دروس</option>";
  }
}

/* schedules UI helpers */
const daysOfWeek = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function clearScheduleRows() {
  const container = $("#secSchedulesContainer");
  if (!container) return;
  container.innerHTML = "";
}

function addScheduleRow(day = "MONDAY", start = "", end = "") {
  const container = $("#secSchedulesContainer");
  if (!container) return;
  const row = document.createElement("div");
  row.className = "schedule-row";
  row.innerHTML = `
    <select class="schedule-day">
      ${daysOfWeek
        .map((d) => {
          const faLabel = dayNamesFa[d] || d;
          return `<option value="${d}" ${
            d === day ? "selected" : ""
          }>${faLabel}</option>`;
        })
        .join("")}
    </select>
    <input type="time" class="schedule-start" value="${start || ""}" />
    <input type="time" class="schedule-end" value="${end || ""}" />
    <button type="button" class="btn ghost schedule-remove">✕</button>
  `;
  container.appendChild(row);
}

$("#addScheduleRow")?.addEventListener("click", () => {
  addScheduleRow();
});

document
  .getElementById("secSchedulesContainer")
  ?.addEventListener("click", (e) => {
    const btn = e.target.closest(".schedule-remove");
    if (!btn) return;
    const row = btn.closest(".schedule-row");
    if (row) row.remove();
  });

/* save section */
$("#saveSection")?.addEventListener("click", async () => {
  const professorId = $("#secProfessor")?.value || "";
  const classroomId = $("#secClassroom")?.value || "";
  const lessonId = $("#secLesson")?.value || "";
  const capacityRaw = $("#secCapacity")?.value || "";

  if (!professorId || !classroomId || !lessonId || !capacityRaw) {
    alert("استاد، کلاس، درس و ظرفیت را کامل وارد کنید");
    return;
  }

  const capacity = Number(capacityRaw) || 0;
  const container = $("#secSchedulesContainer");
  const schedules = [];
  if (container) {
    container.querySelectorAll(".schedule-row").forEach((row) => {
      const day = row.querySelector(".schedule-day")?.value || "";
      const st = row.querySelector(".schedule-start")?.value || "";
      const et = row.querySelector(".schedule-end")?.value || "";
      if (day && st && et) {
        schedules.push({
          day_of_week: day,
          start_time: st,
          endTime: et,
        });
      }
    });
  }

  if (!schedules.length) {
    alert("حداقل یک زمان‌بندی معتبر وارد کنید");
    return;
  }

  const body = {
    professor: professorId,
    classroom: classroomId,
    lesson: lessonId,
    capacity,
    schedules,
  };

  try {
    if (currentSectionEditId) {
      await apiFetch(
        ENDPOINTS.SECTION + "/" + encodeURIComponent(currentSectionEditId),
        {
          method: "PUT",
          body,
        }
      );
    } else {
      await apiFetch(ENDPOINTS.SECTION, {
        method: "POST",
        body,
      });
    }
    closeModal("sectionModal");
    await loadSections();
    await loadOverview();
  } catch (err) {
    console.error(err);
    alert(err?.message || "خطا در ذخیره سکشن");
  }
});

async function openSectionEdit(id) {
  try {
    const data = await apiFetch(
      ENDPOINTS.SECTION + "/" + encodeURIComponent(id)
    );
    currentSectionEditId = id;
    $("#sectionModalTitle").textContent = "ویرایش سکشن";
    $("#secCapacity").value = data.capacity || 1;

    // populate selects with current selections
    const professorId =
      (data.professor && (data.professor._id || data.professor.id)) ||
      data.professorId ||
      "";
    const classroomId =
      (data.classroom && (data.classroom._id || data.classroom.id)) ||
      data.classroomId ||
      "";
    const lessonId =
      (data.lesson && (data.lesson._id || data.lesson.id)) ||
      data.lessonId ||
      "";

    await populateSectionSelects(professorId, classroomId, lessonId);

    clearScheduleRows();
    if (Array.isArray(data.schedules) && data.schedules.length) {
      data.schedules.forEach((sch) => {
        addScheduleRow(
          sch.day_of_week || "MONDAY",
          sch.start_time || "",
          sch.endTime || ""
        );
      });
    } else {
      addScheduleRow();
    }

    openModal("sectionModal");
  } catch (err) {
    console.error(err);
    alert("خطا در دریافت سکشن");
  }
}

async function confirmSectionDelete(id) {
  try {
    await apiFetch(ENDPOINTS.SECTION + "/" + encodeURIComponent(id), {
      method: "DELETE",
    });
    closeModal("confirmModal");
    await loadSections();
    await loadOverview();
  } catch (error) {
    console.error(error);
    alert("خطا در حذف سکشن");
  }
}

/* delegates for edit/delete LESSON */
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
    await apiFetch(deleteBaseUrl + "/" + encodeURIComponent(deleteTargetId), {
      method: "DELETE",
    });
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

let deleteBaseUrl = "";
/* ========== Modal helpers ========== */
function openModal(id, url) {
  deleteBaseUrl = url;
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
$("#closeFaculty")?.addEventListener("click", () => closeModal("facultyModal"));
$("#closeMajor")?.addEventListener("click", () => closeModal("majorModal"));
$("#closeClassroom")?.addEventListener("click", () =>
  closeModal("classroomModal")
);
$("#closeSection")?.addEventListener("click", () => closeModal("sectionModal"));
$("#overlay").addEventListener("click", () => {
  closeModal("lessonModal");
  closeModal("facultyModal");
  closeModal("classroomModal");
  closeModal("sectionModal");
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
    body.majorCode = $("#uMajor")?.value?.trim() || "";
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

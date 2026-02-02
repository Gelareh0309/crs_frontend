function $(selector) {
  return document.querySelector(selector);
}
function $$(selector) {
  return Array.from(document.querySelectorAll(selector));
}
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}
async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
  options.headers = { ...(options.headers || {}), Authorization: token ? `Bearer ${token}` : "" };
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

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
  STUDENT_LESSONS: "/my-lessons"
  TAKE_SECTION: "/take-section",
};

const sectionsTbody = document.getElementById("sectionsTbody");
const lessonsTbody = document.getElementById("lessonsTbody");
const searchInput = document.getElementById("searchInput");

const dayNamesFa = {
  MONDAY: "دوشنبه",
  TUESDAY: "سه‌شنبه",
  WEDNESDAY: "چهارشنبه",
  THURSDAY: "پنجشنبه",
  FRIDAY: "جمعه",
  SATURDAY: "شنبه",
  SUNDAY: "یکشنبه",
};

let allSections = [];

function getToken() {
  return (
    localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken")
  );
}

// LogOut
$("#btnLogout").addEventListener("click", () => {
  localStorage.removeItem("accessToken");
  sessionStorage.removeItem("accessToken");
  window.location.href = "index.html";
});

function loadStudentHeader() {
  const token = getToken();
  if (!token) return;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const name = payload.firstName ? payload.firstName + (payload.lastName ? " " + payload.lastName : "") : payload.username || "دانشجو";
    $("#userName").textContent = name;
    $("#avatar").textContent = (name[0] || "S").toUpperCase();
  } catch (e) {
    console.error("Invalid token", e);
  }
}

async function searchSection() {
  const search = document.getElementById("searchInput").value;
  loadSections(search);
}

function setActivePanel(name) {
  const panels = {
    section: "panel-section",
    lessons: "panel-lessons"
  };
  $$(".menu-item").forEach((btn) => btn.classList.toggle("active", btn.dataset.panel === name));
  $("#pageTitle").textContent = {
    section: "دروس ارائه شده",
    lessons: "دروس اخذ شده"
    }[name] || "داشبورد";
  Object.values(panels).forEach((id) => {
    const el = $("#" + id);
    if (el) el.style.display = id === panels[name] ? "block" : "none";
  });
}

//Mobile Sidebar
$("#mobileToggle").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});
document.addEventListener("click", (e) => {
  if (window.innerWidth < 1000) {
    if (!e.target.closest("#sidebar") && !e.target.closest("#mobileToggle"))
      $("#sidebar").classList.remove("open");
  }
});

// Load all Sections
async function loadSections(search = "") {
  sectionsTbody.innerHTML = '<tr><td colspan="7" class="muted">در حال بارگذاری...</td></tr>';
  try {
    const data = await apiFetch(`${ENDPOINTS.SECTION}?search=${encodeURIComponent(search)}`);
    if (!Array.isArray(data) || data.length === 0) {
      sectionsTbody.innerHTML = '<tr><td colspan="7" class="muted">هیچ سکشنی یافت نشد</td></tr>';
      return;
    }
    allSections = data;
    renderSectionsTable();
  } catch (err) {
    console.error(err);
    sectionsTbody.innerHTML = '<tr><td colspan="7" class="muted">خطا در دریافت اطلاعات</td></tr>';
  }
}

// Render with Search
function renderSectionsTable() {
  if (!allSections.length) {
    sectionsTbody.innerHTML = '<tr><td colspan="7" class="muted">موردی وجود ندارد</td></tr>';
    return;
  }
  sectionsTbody.innerHTML = allSections
    .map((s) => {
      const lesson = s.lesson || {};
      const prof = s.professorUser || {};
      const classroom = s.classroom || {};
      const capacityUsed = Array.isArray(s.students) ? s.students.length : 0;
      const fullProfName = prof.firstName ? prof.firstName + (prof.lastName ? " " + prof.lastName : "") : prof.username || "-";
      const schedulesText = Array.isArray(s.schedules)
        ? s.schedules
            .map((sch) => {
              const dow = sch.day_of_week || "";
              const st = sch.start_time || "";
              const et = sch.endTime || "";
              if (!dow && !st && !et) return "";
              return `${dayNamesFa[dow] || dow} ${st}-${et}`.trim();
            })
            .filter(Boolean)
            .join("<br>")
        : "-";
      return `<tr>
        <td>${escapeHtml(lesson.title || "")}</td>
        <td>${escapeHtml(fullProfName)}</td>
        <td>${escapeHtml(classroom.room_number || "-")}</td>
        <td>${escapeHtml(lesson.unit || "-")}</td>
        <td>${schedulesText}</td>
        <td>${capacityUsed} / ${s.capacity || "-"}</td>
        <td>
          <button class="btn" onclick="handleTakeSection('${s._id}')">اخذ</button>
        </td>
      </tr>`;
    })
    .join("");
}
searchInput.addEventListener("input", () => loadSections(searchInput.value));

// Take & Delete Sections(modal)
function openConfirmModal({ title = "تأیید عملیات", text = "آیا از انجام این عملیات مطمئن هستید؟", okText = "بله", onConfirm }) {
  const modal = $("#confirmModal");
  $("#confirmTitle").textContent = title;
  $("#confirmText").textContent = text;
  $("#okConfirm").textContent = okText;
  modal.classList.remove("hidden");
  $("#okConfirm").onclick = null;
  $("#cancelConfirm").onclick = null;
  $("#okConfirm").onclick = async () => {
    modal.classList.add("hidden");
    if (onConfirm) await onConfirm();
  };
  $("#cancelConfirm").onclick = () => {
    modal.classList.add("hidden");
  };
}

async function handleTakeSection(sectionId) {
  openConfirmModal({
    title: "اخذ درس",
    text: "آیا از اخذ این درس مطمئن هستید؟",
    okText: "بله، اخذ کن",
    onConfirm: async () => {
      try {
        await apiFetch(`${ENDPOINTS.TAKE_SECTION}/${sectionId}`, { method: "POST" });
        alert("درس با موفقیت اخذ شد!");
        loadSections();
        loadLessons();
      } catch (err) {
        console.error(err);
        alert("خطا در اخذ درس");
      }
    }
  });
}
function handleDeleteLesson(lessonId) {
  openConfirmModal({
    title: "حذف درس",
    text: "آیا از حذف این درس مطمئن هستید؟",
    okText: "بله، حذف کن",
    onConfirm: async () => {
      try {
        await apiFetch(`${ENDPOINTS.GET_LESSONS}/${lessonId}`, { method: "DELETE" });
        alert("درس با موفقیت حذف شد!");
        loadLessons();
      } catch (err) {
        console.error(err);
        alert("خطا در حذف درس");
      }
    }
  });
}

//Load & Update Student's Lessons
async function loadLessons() {
  lessonsTbody.innerHTML = '<tr><td colspan="6" class="muted">در حال بارگذاری...</td></tr>';
  try {
    const lessons = await apiFetch(ENDPOINTS.GET_LESSONS);
    if (!Array.isArray(lessons) || lessons.length === 0) {
      lessonsTbody.innerHTML = '<tr><td colspan="6" class="muted">هیچ درس اخذ شده‌ای یافت نشد</td></tr>';
      return;
    }
    lessonsTbody.innerHTML = lessons
      .map((l) => {
        const lesson = l.lesson || {};
        const prof = l.professorUser || {};
        const classroom = l.classroom || {};
        const fullProfName = prof.firstName ? prof.firstName + (prof.lastName ? " " + prof.lastName : "") : prof.username || "-";
        const schedulesText = Array.isArray(l.schedules)
          ? l.schedules
              .map((sch) => `${dayNamesFa[sch.day_of_week] || sch.day_of_week} ${sch.start_time || ""}-${sch.endTime || ""}`.trim())
              .filter(Boolean)
              .join("<br>")
          : "-";
        return `<tr>
          <td>${escapeHtml(lesson.title || "")}</td>
          <td>${escapeHtml(fullProfName)}</td>
          <td>${escapeHtml(classroom.room_number || "-")}</td>
          <td>${escapeHtml(lesson.unit || "-")}</td>
          <td>${schedulesText}</td>
          <td style="white-space:nowrap">
            <button class="btn" onclick="handleDeleteLesson('${l._id}')">حذف</button>
          </td>
        </tr>`;
      })
      .join("");
  } catch (err) {
    console.error(err);
    lessonsTbody.innerHTML = '<tr><td colspan="6" class="muted">خطا در دریافت دروس</td></tr>';
  }
}

//hook menu
$$(".menu-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    const panel = btn.dataset.panel || btn.dataset.section;
    $$(".menu-item").forEach((x) => x.classList.remove("active"));
    btn.classList.add("active");
    setActivePanel(panel);
    if (panel === "section") loadSections();
    if (panel === "lessons") loadLessons();
    if (panel === "schedule") LoadSchedule();
  });
});

// init
(function init() {
  setActivePanel("section");
  loadStudentHeader();
  loadSections();
})();

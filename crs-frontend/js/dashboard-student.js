const API_BASE = "http://localhost:3001";

const sectionsTbody = document.getElementById("sectionsTbody");
const searchInput = document.getElementById("searchInput");

// token helpers
function getToken() {
  return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
}

// logout
document.getElementById("btnLogout").addEventListener("click", () => {
  localStorage.removeItem("accessToken");
  sessionStorage.removeItem("accessToken");
  window.location.href = "/../index.html";
});

// decode token for header
function loadStudentHeader() {
  const token = getToken();
  if (!token) return;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    document.getElementById("userName").textContent = payload.firstName ? payload.firstName + (payload.lastName ? " " + payload.lastName : "") : payload.username;
    document.getElementById("avatar").textContent = payload.firstName ? payload.firstName[0].toUpperCase() : payload.username[0].toUpperCase();
  } catch (e) {
    console.error("Invalid token", e);
  }
}

// format schedules
function formatSchedules(schedules) {
  if (!Array.isArray(schedules) || schedules.length === 0) return "-";
  return schedules.map(s => `${s.day_of_week} ${s.start_time} - ${s.endTime}`).join("<br>");
}

// render sections
async function loadSections() {
  sectionsTbody.innerHTML = `<tr><td colspan="6" class="muted">در حال بارگذاری...</td></tr>`;
  try {
    const data = await apiFetch("/section", { auth: true });
    if (!Array.isArray(data) || data.length === 0) {
      sectionsTbody.innerHTML = `<tr><td colspan="6" class="muted">موردی وجود ندارد</td></tr>`;
      return;
    }

    renderTable(data);
  } catch (err) {
    console.error(err);
    sectionsTbody.innerHTML = `<tr><td colspan="6" class="muted">خطا در دریافت اطلاعات</td></tr>`;
  }
}

function renderTable(sections) {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = sections.filter(s => {
    const lessonName = s.lesson?.title?.toLowerCase() || "";
    const profName = s.professor ? (s.professor.firstName || "") + " " + (s.professor.lastName || "") : "";
    return lessonName.includes(query) || profName.toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    sectionsTbody.innerHTML = `<tr><td colspan="6" class="muted">موردی یافت نشد</td></tr>`;
    return;
  }

  sectionsTbody.innerHTML = filtered.map(s => {
    const lesson = s.lesson || {};
    const prof = s.professor || {};
    const classroom = s.classroom || {};
    const capacityUsed = Array.isArray(s.students) ? s.students.length : 0;
    return `<tr>
      <td>${lesson.title || ""}</td>
      <td>${prof.firstName ? prof.firstName + " " + (prof.lastName || "") : "-"}</td>
      <td>${classroom.name || classroom.code || "-"}</td>
      <td>${lesson.unit || "-"}</td>
      <td>${formatSchedules(s.schedules)}</td>
      <td>${capacityUsed} / ${s.capacity || "-"}</td>
    </tr>`;
  }).join("");
}

searchInput.addEventListener("input", () => loadSections());

// init
(function init() {
  loadStudentHeader();
  loadSections();
})();
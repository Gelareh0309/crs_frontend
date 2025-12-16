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

const sectionsTbody = document.getElementById("sectionsTbody");
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

// token helpers
function getToken() {
  return (
    localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken")
  );
}

// logout
document.getElementById("btnLogout").addEventListener("click", () => {
  localStorage.removeItem("accessToken");
  sessionStorage.removeItem("accessToken");
  window.location.href = "index.html";
});

// decode token for header
function loadStudentHeader() {
  const token = getToken();
  if (!token) return;
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    const name = payload.firstName
      ? payload.firstName + (payload.lastName ? " " + payload.lastName : "")
      : payload.username || "دانشجو";
    document.getElementById("userName").textContent = name;
    document.getElementById("avatar").textContent = (name[0] || "S")
      .toString()
      .toUpperCase();
  } catch (e) {
    console.error("Invalid token", e);
  }
}

async function searchSection() {
  const search = document.getElementById("searchInput").value;
  loadSections(search);
}
// load all sections
async function loadSections(search = "") {
  sectionsTbody.innerHTML =
    '<tr><td colspan="6" class="muted">در حال بارگذاری...</td></tr>';
  try {
    const data = await apiFetch(`${ENDPOINTS.SECTION}?search=${search}`, {
      method: "GET",
    });
    if (!Array.isArray(data) || data.length === 0) {
      sectionsTbody.innerHTML =
        '<tr><td colspan="6" class="muted">هیچ سکشنی یافت نشد</td></tr>';
      return;
    }
    allSections = Array.isArray(data) ? data : [];
    renderTable();
  } catch (err) {
    console.error(err);
    sectionsTbody.innerHTML =
      '<tr><td colspan="6" class="muted">خطا در دریافت اطلاعات</td></tr>';
  }
}

// render with search
function renderTable() {
  if (!allSections.length) {
    sectionsTbody.innerHTML =
      '<tr><td colspan="6" class="muted">موردی وجود ندارد</td></tr>';
    return;
  }

  sectionsTbody.innerHTML = allSections
    .map((s) => {
      const lesson = s.lesson || {};
      const userProf = s.professorUser || {};
      const classroom = s.classroom || {};
      const capacityUsed = Array.isArray(s.students) ? s.students.length : 0;

      const fullProfName = userProf.firstName
        ? userProf.firstName +
          (userProf.lastName ? " " + userProf.lastName : "")
        : userProf.username || "-";

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
        : "-";

      return `<tr>
      <td>${lesson.title || ""}</td>
      <td>${fullProfName}</td>
      <td>${classroom.room_number || "-"}</td>
      <td>${lesson.unit || "-"}</td>
      <td>${schedulesText}</td>
      <td>${capacityUsed} / ${s.capacity || "-"}</td>
    </tr>`;
    })
    .join("");
}

searchInput.addEventListener("input", renderTable);

// init
(function init() {
  loadStudentHeader();
  loadSections();
})();

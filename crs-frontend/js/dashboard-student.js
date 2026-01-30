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

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const sectionsTbody = document.getElementById("sectionsTbody");
const enrollmentsTbody = document.getElementById("enrollmentsTbody");
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

let academicStatus = {
  enrolledSectionIds: [],
  passedLessonIds: [],
};

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

/* ========== Panel navigation (like admin setActivePanel) ========== */
function setActivePanel(name) {
  // menu: toggle active class on the matching menu item
  $$(".menu-item").forEach((btn) => {
    btn.classList.toggle(
      "active",
      (btn.dataset.panel || btn.dataset.section) === name
    );
  });
  // page title
  $("#pageTitle").textContent =
    {
      section: "همه سکشن‌ها",
      enrollments: "سکشن‌های ثبت‌نام‌شده",
    }[name] || "داشبورد دانشجو";
  // show/hide panels
  const panelSection = document.getElementById("panel-section");
  const panelEnrollments = document.getElementById("panel-enrollments");
  if (panelSection)
    panelSection.style.display = name === "section" ? "block" : "none";
  if (panelEnrollments)
    panelEnrollments.style.display = name === "enrollments" ? "block" : "none";
}

// hook menu items: click switches panel and loads data
$$(".menu-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    const panel = btn.dataset.panel || btn.dataset.section;
    $$(".menu-item").forEach((x) => x.classList.remove("active"));
    btn.classList.add("active");
    setActivePanel(panel);
    if (panel === "section") loadSections(searchInput ? searchInput.value : "");
    if (panel === "enrollments") loadEnrollments();
  });
});

// mobile sidebar toggle (like admin)
$("#mobileToggle")?.addEventListener("click", () => {
  $("#sidebar")?.classList.toggle("open");
});
document.addEventListener("click", (e) => {
  if (window.innerWidth < 1000) {
    if (!e.target.closest("#sidebar") && !e.target.closest("#mobileToggle"))
      $("#sidebar")?.classList.remove("open");
  }
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
      const capacityUsed = Array.isArray(s.students) ? s.students.length : 0;

      const fullProfName = userProf.firstName
        ? userProf.firstName +
          (userProf.lastName ? " " + userProf.lastName : "")
        : userProf.username || "-";

      const isEnrolled = academicStatus.enrolledSectionIds.includes(s._id);

      const isPassed = academicStatus?.passedLessonIds?.includes(s.lesson?._id);

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
      <td>${lesson.lessonId || ""}</td>
      <td>${lesson.title || ""}</td>
      <td>${fullProfName}</td>
      <td>${lesson.unit || "-"}</td>
      <td>${schedulesText}</td>
      <td>${capacityUsed} / ${s.capacity || "-"}</td>
<td>
  ${
    isPassed
      ? `<span class="muted small">گذرانده شده</span>`
      : isEnrolled
      ? `<span class="muted small">اخذ شده</span>`
      : capacityUsed < s.capacity
      ? `<button class="btn primary small"
              onclick="enrollSection('${s._id}')">
              اخذ درس
            </button>`
      : `<span class="muted small">تکمیل</span>`
  }
</td>

    </tr>`;
    })
    .join("");
}

async function enrollSection(sectionId) {
  if (!confirm("آیا از اخذ این درس مطمئن هستید؟")) return;

  try {
    await apiFetch(`${ENDPOINTS.SECTION}/${sectionId}/enroll`, {
      method: "POST",
    });

    alert("درس با موفقیت اخذ شد ✅");

    // reload sections to update capacity
    await loadAcademicStatus();
    await loadSections(searchInput.value);
  } catch (err) {
    console.error(err);
    alert(err?.message || "خطا در اخذ درس");
  }
}

async function loadAcademicStatus() {
  try {
    const data = await apiFetch("/student/me/academic-status", {
      method: "GET",
    });
    academicStatus = data || { enrolledSectionIds: [], passedLessonIds: [] };
  } catch (e) {
    console.error("Failed to load academic status", e);
  }
}

/* ========== Enrollments panel ========== */
async function loadEnrollments() {
  if (!enrollmentsTbody) return;
  enrollmentsTbody.innerHTML =
    '<tr><td colspan="6" class="muted">در حال بارگذاری...</td></tr>';
  try {
    const data = await apiFetch("/section/student/my-sections", {
      method: "GET",
    });
    const list = Array.isArray(data)
      ? data
      : data && data.enrollments
      ? data.enrollments
      : [];
    if (list.length === 0) {
      enrollmentsTbody.innerHTML =
        '<tr><td colspan="6" class="muted">سکشن ثبت‌نام‌شده‌ای ندارید</td></tr>';
      return;
    }
    enrollmentsTbody.innerHTML = list
      .map((e) => {
        const section = e.section || e;
        const lesson = section.lesson || {};
        const userProf = section?.professor.user || {};
        const classroom = section.classroom || {};
        console.log(section);

        const fullProfName = userProf.firstName
          ? userProf.firstName +
            (userProf.lastName ? " " + userProf.lastName : "")
          : userProf.username || "-";
        const schedulesText = Array.isArray(section.schedules)
          ? section.schedules
              .map((sch) => {
                const dow = sch.day_of_week || "";
                const st = sch.start_time || "";
                const et = sch.endTime || "";
                const faDay = dayNamesFa[dow] || dow;
                return `${faDay} ${st}-${et}`.trim();
              })
              .filter(Boolean)
              .join("<br>")
          : "-";
        const status = e.status === "DROPPED" ? "حذف شده" : "ثبت‌نام";
        const rowId = section._id || section.id || "";
        return `<tr>
          <td>${lesson.lessonId || "-"}</td>
          <td>${lesson.title || "-"}</td>
          <td>${lesson.unit || "-"}</td>
          <td>${fullProfName}</td>
          <td>${classroom.room_number || "-"} - ${
          classroom.faculty.name || "-"
        }</td>
          <td>${schedulesText}</td>
          <td>${status}</td>
          <td style="white-space:nowrap">
            ${
              e.status !== "DROPPED"
                ? `<button class="btn ghost small" data-action="drop" data-id="${rowId}">حذف واحد</button>`
                : ""
            }
          </td>
        </tr>`;
      })
      .join("");
  } catch (err) {
    console.error(err);
    enrollmentsTbody.innerHTML =
      '<tr><td colspan="6" class="muted">خطا در دریافت ثبت‌نام‌ها</td></tr>';
  }
}

// delegate drop enrollment
enrollmentsTbody?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action='drop']");
  if (!btn) return;
  const sectionId = btn.dataset.id;
  if (!sectionId || !confirm("آیا از حذف این واحد مطمئن هستید؟")) return;
  try {
    await apiFetch(`${ENDPOINTS.SECTION}/${sectionId}/drop`, {
      method: "DELETE",
    });
    await loadAcademicStatus();
    await loadEnrollments();
    await loadSections(searchInput?.value || "");
  } catch (err) {
    console.error(err);
    alert(err?.message || "خطا در حذف واحد");
  }
});

$("#refreshEnrollments")?.addEventListener("click", () => loadEnrollments());

searchInput?.addEventListener("input", () => renderTable());

// init
(async function init() {
  loadStudentHeader();
  setActivePanel("section");
  await loadAcademicStatus();
  await loadSections();
})();

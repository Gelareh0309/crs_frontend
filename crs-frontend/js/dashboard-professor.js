const ENDPOINTS = {
  SECTION: "/section",
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const dayNamesFa = {
  MONDAY: "دوشنبه",
  TUESDAY: "سه\u200cشنبه",
  WEDNESDAY: "چهارشنبه",
  THURSDAY: "پنجشنبه",
  FRIDAY: "جمعه",
  SATURDAY: "شنبه",
  SUNDAY: "یکشنبه",
};

const sectionsTbody = document.getElementById("sectionsTbody");
const mySectionsTbody = document.getElementById("mySectionsTbody");
const sectionStudentsTbody = document.getElementById("sectionStudentsTbody");

let mySectionsList = [];
let currentModalSectionId = null;

function getToken() {
  return (
    localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken")
  );
}

function decodeTokenPayload() {
  const tok = getToken();
  if (!tok) return null;
  try {
    const payload = JSON.parse(
      atob(tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return payload;
  } catch (e) {
    console.warn("token decode failed", e);
    return null;
  }
}

function loadProfessorHeader() {
  const payload = decodeTokenPayload();
  if (!payload) return;
  const name = payload.firstName
    ? payload.firstName + (payload.lastName ? " " + payload.lastName : "")
    : payload.username || "استاد";
  document.getElementById("userName").textContent = name;
  document.getElementById("userRole").textContent = payload.role || "PROFESSOR";
  const avatar = document.getElementById("avatar");
  avatar.textContent = (name[0] || "P").toUpperCase();
}

let allSections = [];

/* ========== Panel navigation ========== */
function setActivePanel(name) {
  $$(".menu-item").forEach((btn) => {
    btn.classList.toggle(
      "active",
      (btn.dataset.panel || btn.dataset.section) === name
    );
  });
  $("#pageTitle").textContent =
    {
      section: "تمام سکشن‌ها",
      mySections: "سکشن‌های من",
    }[name] || "پنل استاد";
  const panelSection = document.getElementById("panel-section");
  const panelMySections = document.getElementById("panel-mySections");
  if (panelSection)
    panelSection.style.display = name === "section" ? "block" : "none";
  if (panelMySections)
    panelMySections.style.display = name === "mySections" ? "block" : "none";
}

// hook menu items: click switches panel and loads data
$$(".menu-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    const panel = btn.dataset.panel || btn.dataset.section;
    $$(".menu-item").forEach((x) => x.classList.remove("active"));
    btn.classList.add("active");
    setActivePanel(panel);
    if (panel === "section") loadSectionsForProfessor();
    if (panel === "mySections") loadMySections();
  });
});

async function loadSectionsForProfessor() {
  sectionsTbody.innerHTML =
    '<tr><td colspan="6" class="muted">در حال بارگذاری...</td></tr>';
  try {
    const data = await apiFetch("/section", { method: "GET" });
    allSections = Array.isArray(data) ? data : [];
    renderSectionsForProfessor();
  } catch (err) {
    console.error(err);
    sectionsTbody.innerHTML =
      '<tr><td colspan="6" class="muted">خطا در دریافت سکشن\u200cها</td></tr>';
  }
}

function renderSectionsForProfessor() {
  const search = (document.getElementById("secSearchProf")?.value || "")
    .toString()
    .trim()
    .toLowerCase();

  if (!allSections.length) {
    sectionsTbody.innerHTML =
      '<tr><td colspan="6" class="muted">هیچ سکشنی یافت نشد</td></tr>';
    return;
  }

  const filtered = allSections.filter((s) => {
    if (!search) return true;
    const lessonTitle = (s.lesson && s.lesson.title) || "";
    const classroomLabel = (s.classroom && s.classroom.room_number) || "";
    const schedulesText = Array.isArray(s.schedules)
      ? s.schedules
          .map((sch) => {
            const dow = sch.day_of_week || "";
            const faDay = dayNamesFa[dow] || dow;
            const st = sch.start_time || "";
            const et = sch.endTime || "";
            return `${faDay} ${st}-${et}`.trim();
          })
          .join(" ")
      : "";

    const haystack = (lessonTitle + " " + classroomLabel + " " + schedulesText)
      .toString()
      .toLowerCase();
    return haystack.includes(search);
  });

  if (!filtered.length) {
    sectionsTbody.innerHTML =
      '<tr><td colspan="6" class="muted">موردی مطابق جستجو یافت نشد</td></tr>';
    return;
  }

  sectionsTbody.innerHTML = filtered
    .map((s) => {
      const capacity = s.capacity ?? "-";
      const studentsCount = Array.isArray(s.students) ? s.students.length : 0;
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
                <td>${s.lesson.lessonId || "-"}</td>
                <td>${s.lesson.title || "-"}</td>
                              <td>${s.professorUser.firstName || "-"}  ${
        s.professorUser.lastName || "-"
      }</td>

                <td>${s.lesson.unit || "-"}</td>
                <td>${schedulesText || "-"}</td>
                <td>${studentsCount} / ${capacity}</td>
             
              
              </tr>`;
    })
    .join("");
}

/* ========== My Sections panel (sections where professor is instructor) ========== */
async function loadMySections() {
  if (!mySectionsTbody) return;
  mySectionsTbody.innerHTML =
    '<tr><td colspan="6" class="muted">در حال بارگذاری...</td></tr>';
  try {
    const data = await apiFetch(`${ENDPOINTS.SECTION}/professor/my-sections`, {
      method: "GET",
    });
    const list = Array.isArray(data) ? data : data?.sections ?? [];
    mySectionsList = list;
    if (list.length === 0) {
      mySectionsTbody.innerHTML =
        '<tr><td colspan="6" class="muted">سکشنی که شما استاد آن باشید یافت نشد</td></tr>';
      return;
    }
    mySectionsTbody.innerHTML = list
      .map((section) => {
        const lesson = section.lesson || {};
        const classroom = section.classroom || {};
        const facultyName = classroom?.faculty?.name || "";
        const roomLabel = classroom?.room_number
          ? `${classroom.room_number}${facultyName ? " - " + facultyName : ""}`
          : "-";
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
        const studentsCount = Array.isArray(section.students)
          ? section.students.length
          : 0;
        const capacity = section.capacity ?? "-";
        const sectionId = section._id || section.id || "";
        return `<tr class="my-section-row" data-section-id="${sectionId}" style="cursor: pointer;" title="مشاهده دانشجویان">
          <td>${lesson.lessonId || "-"}</td>
          <td>${lesson.title || "-"}</td>
          <td>${lesson.unit || "-"}</td>
          <td>${roomLabel}</td>
          <td>${schedulesText}</td>
          <td class="capacity-cell">${studentsCount} / ${capacity}</td>
        </tr>`;
      })
      .join("");
  } catch (err) {
    console.error(err);
    mySectionsTbody.innerHTML =
      '<tr><td colspan="6" class="muted">خطا در دریافت سکشن‌های من</td></tr>';
  }
}

$("#refreshMySections")?.addEventListener("click", () => loadMySections());

/* ========== Section students modal (click row or ظرفیت cell) ========== */
function openModal() {
  $("#overlay").classList.remove("hidden");
  $("#overlay").setAttribute("aria-hidden", "false");
  const modal = document.getElementById("sectionStudentsModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  }
}

function closeModal() {
  $("#overlay").classList.add("hidden");
  $("#overlay").setAttribute("aria-hidden", "true");
  const modal = document.getElementById("sectionStudentsModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }
  currentModalSectionId = null;
}

async function openStudentsModal(sectionId) {
  if (!sectionId) return;
  currentModalSectionId = sectionId;
  openModal();
  $("#sectionStudentsModalTitle").textContent =
    "دانشجویان کلاس — در حال بارگذاری...";
  sectionStudentsTbody.innerHTML =
    '<tr><td colspan="3" class="muted">در حال بارگذاری...</td></tr>';
  try {
    const section = await apiFetch(`${ENDPOINTS.SECTION}/${sectionId}`, {
      method: "GET",
    });
    const lesson = section?.lesson || {};
    const title = lesson.title || lesson.lessonId || "سکشن";
    $("#sectionStudentsModalTitle").textContent = `دانشجویان کلاس: ${title}`;
    const students = Array.isArray(section.students) ? section.students : [];
    if (students.length === 0) {
      sectionStudentsTbody.innerHTML =
        '<tr><td colspan="3" class="muted">هنوز دانشجویی در این کلاس ثبت‌نام نکرده است</td></tr>';
      return;
    }
    sectionStudentsTbody.innerHTML = students
      .map((stu) => {
        console.log(stu);
        const user = stu.user || stu;
        const name =
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.firstName || user.username || "-";
        const code = stu.studentId;
        const studentId = stu._id || user._id || stu.id || user.id;
        return `<tr>
          <td>${code}</td>
          <td>${name}</td>
          <td>
            <button type="button" class="btn ghost small" data-action="remove-student" data-student-id="${studentId}">حذف از کلاس</button>
          </td>
        </tr>`;
      })
      .join("");
  } catch (err) {
    console.error(err);
    $("#sectionStudentsModalTitle").textContent = "دانشجویان کلاس";
    sectionStudentsTbody.innerHTML =
      '<tr><td colspan="3" class="muted">خطا در دریافت لیست دانشجویان</td></tr>';
  }
}

// Click on mySections row or ظرفیت cell opens modal
mySectionsTbody?.addEventListener("click", (e) => {
  const row = e.target.closest("tr.my-section-row");
  if (!row) return;
  const sectionId = row.dataset.sectionId;
  if (sectionId) openStudentsModal(sectionId);
});

$("#closeSectionStudentsModal")?.addEventListener("click", closeModal);
$("#overlay")?.addEventListener("click", closeModal);

// Remove student from section (professor action)
sectionStudentsTbody?.addEventListener("click", async (e) => {
  const btn = e.target.closest('button[data-action="remove-student"]');
  if (!btn) return;
  const studentId = btn.dataset.studentId;
  if (!currentModalSectionId || !studentId) return;
  if (!confirm("آیا از حذف این دانشجو از کلاس مطمئن هستید؟")) return;
  btn.disabled = true;
  try {
    await apiFetch(
      `${ENDPOINTS.SECTION}/${currentModalSectionId}/student/${studentId}`,
      { method: "DELETE" }
    );
    await openStudentsModal(currentModalSectionId);
    await loadMySections();
  } catch (err) {
    console.error(err);
    alert(err?.message || "خطا در حذف دانشجو از کلاس");
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("mobileToggle").addEventListener("click", () => {
  const sb = document.getElementById("sidebar");
  sb.classList.toggle("open");
});

document.addEventListener("click", (e) => {
  if (window.innerWidth < 1000) {
    if (!e.target.closest("#sidebar") && !e.target.closest("#mobileToggle"))
      document.getElementById("sidebar").classList.remove("open");
  }
});

document.getElementById("btnLogout").addEventListener("click", () => {
  localStorage.removeItem("accessToken");
  sessionStorage.removeItem("accessToken");
  window.location.href = "index.html";
});

(function init() {
  loadProfessorHeader();
  setActivePanel("section");
  loadSectionsForProfessor();
  const sInp = document.getElementById("secSearchProf");
  if (sInp) {
    sInp.addEventListener("keyup", renderSectionsForProfessor);
  }
})();

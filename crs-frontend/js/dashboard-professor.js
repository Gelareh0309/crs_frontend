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

async function loadSectionsForProfessor() {
  sectionsTbody.innerHTML =
    '<tr><td colspan="5" class="muted">در حال بارگذاری...</td></tr>';
  try {
    const data = await apiFetch("/section", { method: "GET" });
    allSections = Array.isArray(data) ? data : [];
    renderSectionsForProfessor();
  } catch (err) {
    console.error(err);
    sectionsTbody.innerHTML =
      '<tr><td colspan="5" class="muted">خطا در دریافت سکشن\u200cها</td></tr>';
  }
}

function renderSectionsForProfessor() {
  const search = (document.getElementById("secSearchProf")?.value || "")
    .toString()
    .trim()
    .toLowerCase();

  if (!allSections.length) {
    sectionsTbody.innerHTML =
      '<tr><td colspan="5" class="muted">هیچ سکشنی یافت نشد</td></tr>';
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
      '<tr><td colspan="5" class="muted">موردی مطابق جستجو یافت نشد</td></tr>';
    return;
  }

  sectionsTbody.innerHTML = filtered
    .map((s) => {
      const lessonTitle = (s.lesson && s.lesson.title) || "-";
      const classroomLabel = (s.classroom && s.classroom.room_number) || "-";
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
                <td>${lessonTitle}</td>
                <td>${classroomLabel}</td>
                <td>${capacity}</td>
                <td>${studentsCount}</td>
                <td>${schedulesText || "-"}</td>
              </tr>`;
    })
    .join("");
}

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
  loadSectionsForProfessor();
  const sInp = document.getElementById("secSearchProf");
  if (sInp) {
    sInp.addEventListener("keyup", renderSectionsForProfessor);
  }
})();

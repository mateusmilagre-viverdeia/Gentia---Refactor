// Content script — extrai dados de um perfil LinkedIn (linkedin.com/in/*)
// Não usa APIs privadas: apenas lê o DOM renderizado.

(function () {
  function txt(sel) {
    const el = document.querySelector(sel);
    return el ? el.innerText.trim() : null;
  }

  function extractProfile() {
    const name =
      txt("h1.text-heading-xlarge") ||
      txt(".pv-text-details__left-panel h1") ||
      txt("h1");

    const headline =
      txt(".text-body-medium.break-words") ||
      txt(".pv-text-details__left-panel .text-body-medium");

    const location =
      txt(".text-body-small.inline.t-black--light.break-words") ||
      txt(".pv-text-details__left-panel .text-body-small");

    const photoEl = document.querySelector(
      ".pv-top-card-profile-picture__image, .pv-top-card-profile-picture__image--show, img.profile-photo-edit__preview, img.pv-top-card-profile-picture__image"
    );
    const photoUrl = photoEl ? photoEl.src : null;

    // About
    const about = txt('section[data-section="summary"] .display-flex .visually-hidden + span') ||
                  txt('#about ~ * .inline-show-more-text');

    // Experience (first item = current)
    const experienceItems = Array.from(
      document.querySelectorAll('section[data-section="experience"] li, #experience ~ * li.artdeco-list__item')
    ).slice(0, 5);
    const experience = experienceItems.map((li) => {
      const role = li.querySelector(".t-bold span, .mr1.t-bold span")?.innerText?.trim();
      const company = li.querySelector(".t-14.t-normal span, .t-normal span")?.innerText?.trim();
      const period = li.querySelector(".t-14.t-normal.t-black--light span, .pvs-entity__caption-wrapper")?.innerText?.trim();
      return { role, company, period };
    }).filter((x) => x.role || x.company);

    const currentRole = experience[0]?.role || null;
    const currentCompany = experience[0]?.company || null;

    // Education
    const educationItems = Array.from(
      document.querySelectorAll('section[data-section="educationsDetails"] li, #education ~ * li.artdeco-list__item')
    ).slice(0, 5);
    const education = educationItems.map((li) => ({
      institution: li.querySelector(".t-bold span, .mr1.t-bold span")?.innerText?.trim(),
      degree: li.querySelector(".t-14.t-normal span")?.innerText?.trim(),
    })).filter((x) => x.institution);

    // Skills
    const skillNodes = Array.from(
      document.querySelectorAll('#skills ~ * .mr1.t-bold span, [data-section="skillsDetails"] .t-bold span')
    ).slice(0, 20);
    const skills = [...new Set(skillNodes.map((n) => n.innerText.trim()).filter(Boolean))];

    return {
      name,
      headline,
      location,
      about,
      current_role: currentRole,
      current_company: currentCompany,
      profile_url: window.location.href.split("?")[0],
      photo_url: photoUrl,
      experience,
      education,
      skills,
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "GENTIA_EXTRACT_PROFILE") {
      try {
        sendResponse({ ok: true, profile: extractProfile() });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
      return true;
    }
  });
})();

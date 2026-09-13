import { useEffect, useMemo, useState } from 'react';

const DEFAULT_LANGUAGE = 'fr';
const LANGUAGE_CODES = ['fr', 'en'];
const DATA_URL = `${import.meta.env.BASE_URL}data.json`;

const ICONS = {
  email: (
    <svg className="eu-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  phone: (
    <svg className="eu-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  location: (
    <svg className="eu-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  nationality: (
    <svg className="eu-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  ),
  calendar: (
    <svg className="eu-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  briefcase: (
    <svg className="eu-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="14" x="2" y="7" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  graduation: (
    <svg className="eu-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </svg>
  ),
  user: (
    <svg className="eu-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  skills: (
    <svg className="eu-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m18 16 4-4-4-4" />
      <path d="m6 8-4 4 4 4" />
      <path d="m14.5 4-5 16" />
    </svg>
  ),
  globe: (
    <svg className="eu-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  ),
  print: (
    <svg className="eu-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect width="12" height="8" x="6" y="14" />
    </svg>
  ),
};

const JSON_DOCUMENTATION = [
  {
    title: '1. Structure du CV Europass (Format 1 Colonne)',
    body: [
      'Le CV est désormais présenté dans un format Europass officiel à colonne unique structuré selon les standards de la Commission Européenne :',
      '1. Informations Personnelles (nom, prénom, photo, contacts et nationalité)',
      '2. Profil Professionnel (résumé synthétique)',
      '3. Domaines d’Expertise & Compétences Numériques',
      '4. Expérience Professionnelle (chronologique avec timeline)',
      '5. Éducation et Formation (avec niveau CEC / EQF)',
      '6. Compétences Linguistiques (avec grille d’auto-évaluation CECR)',
    ],
    fields: [
      ['person', 'object', 'Nom, prénom, rôle, photo et nationalité.'],
      ['contact', 'array', 'Coordonnées (adresse, téléphone, email, nationalité).'],
      ['summary', 'string', 'Paragraphe de profil professionnel.'],
      ['expertise', 'array', 'Mots-clés et compétences phares.'],
      ['digitalSkills', 'array', 'Compétences numériques réparties par thématiques.'],
      ['experience', 'array', 'Historique des postes et réalisations.'],
      ['education', 'array', 'Diplômes et formations avec niveau CEC.'],
      ['languages', 'object', 'Langue maternelle et grille CECR des autres langues.'],
    ],
  },
  {
    title: '2. Grille CECR des Langues',
    body: [
      'Le Cadre Européen Commun de Référence pour les langues (CECR / CEFR) évalue les 5 compétences clés :',
      'Écouter, Lire, Interaction orale, Production orale, et Écrire.',
    ],
    fields: [
      ['languages.motherTongue', 'object', 'Nom et niveau de la langue maternelle.'],
      ['languages.otherLanguages[].listening', 'string', 'Niveau CECR : A1 à C2.'],
      ['languages.otherLanguages[].reading', 'string', 'Niveau CECR : A1 à C2.'],
      ['languages.otherLanguages[].spokenInteraction', 'string', 'Niveau CECR : A1 à C2.'],
      ['languages.otherLanguages[].spokenProduction', 'string', 'Niveau CECR : A1 à C2.'],
      ['languages.otherLanguages[].writing', 'string', 'Niveau CECR : A1 à C2.'],
    ],
  },
];

function EuropassLogo() {
  return (
    <div className="europass-brand" aria-label="Europass Logo">
      <div className="europass-emblem">
        <svg viewBox="0 0 60 40" width="48" height="32" className="eu-flag-svg" aria-hidden="true">
          <rect width="60" height="40" fill="#0e4194" rx="3" />
          <g fill="#ffcc00" transform="translate(30, 20)">
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <polygon
                key={deg}
                points="0,-1.4 0.4,-0.4 1.4,-0.4 0.6,0.2 0.9,1.2 0,0.6 -0.9,1.2 -0.6,0.2 -1.4,-0.4 -0.4,-0.4"
                transform={`rotate(${deg}) translate(0, -11) scale(1.15)`}
              />
            ))}
          </g>
        </svg>
      </div>
      <div className="europass-wordmark">
        <span className="europass-text">europass</span>
        <span className="europass-sub">Curriculum Vitae</span>
      </div>
    </div>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [language, setLanguage] = useState(() => {
    const storedLanguage = window.localStorage.getItem('cv-language');
    if (LANGUAGE_CODES.includes(storedLanguage)) {
      return storedLanguage;
    }
    return window.navigator.language.toLowerCase().startsWith('en')
      ? 'en'
      : DEFAULT_LANGUAGE;
  });
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const response = await fetch(DATA_URL, { cache: 'no-cache' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json();
        if (isMounted) {
          setData(json);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const availableLanguages = useMemo(() => {
    if (!data) return LANGUAGE_CODES;
    return LANGUAGE_CODES.filter((code) => data[code]);
  }, [data]);

  const content = data?.[language] ?? data?.[DEFAULT_LANGUAGE];

  useEffect(() => {
    if (!data || data[language]) return;
    const fallbackLanguage = availableLanguages[0] ?? DEFAULT_LANGUAGE;
    setLanguage(fallbackLanguage);
  }, [availableLanguages, data, language]);

  useEffect(() => {
    if (!content) return;
    document.documentElement.lang = language;
    document.title = content.seo?.title ?? 'Aymen AMARA - Curriculum Vitae Europass';
    window.localStorage.setItem('cv-language', language);
  }, [content, language]);

  useEffect(() => {
    if (!isInfoOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsInfoOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInfoOpen]);

  function handleLanguageChange(event) {
    setLanguage(event.target.value);
  }

  function handlePrint() {
    window.print();
  }

  if (loadError) {
    return (
      <div className="app-shell app-state">
        <h1>{content?.ui?.loadErrorTitle ?? 'Impossible de charger data.json'}</h1>
        <p>
          {content?.ui?.loadErrorMessage ??
            'Vérifiez public/data.json : le fichier doit être un JSON valide contenant les clés fr et en.'}
        </p>
        <code>{loadError.message}</code>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="app-shell app-state">
        <div className="eu-loading-spinner" />
        <p>Chargement du CV Europass...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader
        content={content}
        language={language}
        availableLanguages={availableLanguages}
        onLanguageChange={handleLanguageChange}
        onOpenInfo={() => setIsInfoOpen(true)}
        onPrint={handlePrint}
      />

      <main className="cv-single-column-wrapper" aria-label={content.seo?.title}>
        <EuropassSingleColumnCV content={content} />
      </main>

      <div className="print-btn">
        <button type="button" onClick={handlePrint} className="eu-primary-btn">
          {ICONS.print}
          <span>{content.ui.printButton}</span>
        </button>
      </div>

      {isInfoOpen && (
        <InfoModal ui={content.ui} onClose={() => setIsInfoOpen(false)} />
      )}
    </div>
  );
}

function AppHeader({
  content,
  language,
  availableLanguages,
  onLanguageChange,
  onOpenInfo,
  onPrint,
}) {
  return (
    <header className="app-header">
      <div className="header-brand-wrap">
        <EuropassLogo />
      </div>

      <div className="header-actions">
        <label className="language-control" htmlFor="language-select">
          <span className="lang-label-text">{content.ui.languageLabel}:</span>
          <select
            id="language-select"
            value={language}
            onChange={onLanguageChange}
            aria-label={content.ui.languageLabel}
          >
            {availableLanguages.map((code) => (
              <option key={code} value={code}>
                {content.ui.languageNames?.[code] ?? code.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="action-btn info-btn" onClick={onOpenInfo} title={content.ui.infoDialogTitle}>
          <span className="btn-icon">i</span>
          <span className="btn-text">{content.ui.infoButton}</span>
        </button>

        <button type="button" className="action-btn print-quick-btn" onClick={onPrint} title={content.ui.printButton}>
          {ICONS.print}
          <span className="btn-text">{content.ui.printButton}</span>
        </button>
      </div>
    </header>
  );
}

/**
 * 1-Column Europass Layout Component:
 * 1. Personal Information (Header with Name, Role, Photo, and Contact details)
 * 2. Professional Summary
 * 3. Areas of Expertise
 * 4. Digital Skills
 * 5. Work Experience
 * 6. Education and Training
 * 7. Language Skills (Mother tongue + CEFR matrix)
 */
function EuropassSingleColumnCV({ content }) {
  const { ui, person, contact, summary, expertise, digitalSkills, experience, education, languages } = content;

  return (
    <article className="europass-single-column-cv">
      {/* 1. PERSONAL INFORMATION (Header banner with name, photo, and contacts) */}
      <header className="eu-cv-header">
        <div className="eu-personal-info-card">
          <div className="eu-personal-info-main">
            <h1 className="europass-fullname">
              <span className="first-name">{person.firstName || person.nameLines?.[0]}</span>{' '}
              <span className="last-name">{person.lastName || person.nameLines?.[1]}</span>
            </h1>
            <div className="europass-role-badge">{person.role}</div>

            {/* Contact details */}
            <div className="eu-contacts-grid">
              {contact?.map((item) => (
                <div className="contact-item-chip" key={`${item.label}-${item.value}`}>
                  <span className="contact-icon">{ICONS[item.icon] ?? item.icon}</span>
                  <div className="contact-text-wrap">
                    <span className="contact-type-label">{item.label}</span>
                    {item.href ? (
                      <a href={item.href} className="contact-val-link">{item.value}</a>
                    ) : (
                      <span className="contact-val-text">{item.value}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="eu-personal-photo-wrap">
            <img
              className="eu-profile-photo"
              src={resolveAssetUrl(person.photo)}
              alt={person.photoAlt}
            />
          </div>
        </div>
      </header>

      <div className="eu-cv-body">
        {/* 2. PROFESSIONAL SUMMARY */}
        {summary && (
          <section className="eu-section eu-summary-section">
            <SectionHeader
              title={ui.summaryTitle || 'Profil Professionnel'}
              icon={ICONS.user}
            />
            <div className="eu-summary-card">
              <p className="summary-paragraph">{summary}</p>
            </div>
          </section>
        )}

        {/* 3. AREAS OF EXPERTISE (between Summary and Work Experience) */}
        {expertise && expertise.length > 0 && (
          <section className="eu-section eu-expertise-section">
            <SectionHeader
              title={ui.expertiseTitle || "Domaines d'Expertise"}
              icon={ICONS.skills}
            />
            <div className="eu-expertise-tags-wrapper">
              <TagList items={expertise} className="expertise-tags-list" tagClassName="expertise-tag" />
            </div>
          </section>
        )}

        {/* 3b. DIGITAL SKILLS (between Summary and Work Experience) */}
        {digitalSkills && digitalSkills.length > 0 && (
          <section className="eu-section eu-digital-skills-section">
            <SectionHeader
              title={ui.digitalSkillsTitle || 'Compétences Numériques'}
              icon={ICONS.skills}
            />
            <div className="digital-skills-grid">
              {digitalSkills.map((group) => (
                <div className="digital-skill-card" key={group.title}>
                  <h3 className="skill-group-heading">{group.title}</h3>
                  <TagList items={group.items} className="skill-tags-list" tagClassName="skill-tag" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. WORK EXPERIENCE */}
        {experience && experience.length > 0 && (
          <section className="eu-section eu-work-experience-section">
            <SectionHeader
              title={ui.experienceTitle || 'Expérience Professionnelle'}
              icon={ICONS.briefcase}
            />
            <div className="eu-timeline">
              {experience.map((job) => (
                <article className="eu-timeline-item" key={`${job.title}-${job.period}`}>
                  <div className="timeline-marker" />
                  <div className="timeline-content">
                    <div className="timeline-header-row">
                      <div className="role-and-company">
                        <h3 className="job-role-title">{job.title}</h3>
                        <div className="job-company-title">
                          <strong>{job.company}</strong>
                          {job.location && <span className="job-location"> | {job.location}</span>}
                        </div>
                      </div>

                      <div className="timeline-period-badge">
                        {ICONS.calendar}
                        <span>{job.period}</span>
                      </div>
                    </div>

                    <ul className="timeline-bullet-list">
                      {job.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>

                    {job.tags && (
                      <TagList items={job.tags} className="job-tech-tags" tagClassName="job-tech-tag" />
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 5. EDUCATION AND TRAINING (after Work Experience) */}
        {education && education.length > 0 && (
          <section className="eu-section eu-education-section">
            <SectionHeader
              title={ui.educationTitle || 'Éducation et Formation'}
              icon={ICONS.graduation}
            />
            <div className="education-entries-list">
              {education.map((edu) => (
                <article className="education-card" key={edu.degree}>
                  <div className="edu-card-top">
                    <div>
                      <h3 className="edu-degree-title">{edu.degree}</h3>
                      <div className="edu-org-name">
                        <strong>{edu.institution || edu.details}</strong>
                        {edu.location && <span> — {edu.location}</span>}
                      </div>
                    </div>
                    {edu.period && (
                      <div className="edu-period-pill">
                        {ICONS.calendar}
                        <span>{edu.period}</span>
                      </div>
                    )}
                  </div>

                  {edu.eqfLevel && (
                    <div className="edu-eqf-badge-wrap">
                      <span className="eqf-pill">{edu.eqfLevel}</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 6. LANGUAGE SKILLS (after Work Experience & Education) */}
        {languages && (
          <section className="eu-section eu-languages-section">
            <SectionHeader
              title={ui.languagesTitle || 'Compétences Linguistiques'}
              icon={ICONS.globe}
            />

            {/* Mother Tongue */}
            {languages.motherTongue && (
              <div className="mother-tongue-panel">
                <span className="mother-tongue-badge-label">{ui.motherTongueLabel || 'Langue maternelle'}:</span>
                <span className="mother-tongue-val">
                  <strong>{languages.motherTongue.name}</strong> ({languages.motherTongue.level})
                </span>
              </div>
            )}

            {/* Other Languages CEFR Matrix */}
            {languages.otherLanguages && (
              <div className="other-languages-panel">
                <h4 className="other-lang-heading">{ui.otherLanguagesLabel || 'Autre(s) langue(s)'}</h4>
                <CefrTable
                  languages={languages.otherLanguages}
                  headers={ui.cefrHeaders}
                  scaleNote={ui.cefrScale}
                />
              </div>
            )}
          </section>
        )}
      </div>
    </article>
  );
}

function SectionHeader({ title, icon }) {
  return (
    <div className="eu-section-header">
      <div className="eu-header-accent-bar" />
      <span className="eu-header-icon">{icon}</span>
      <h2 className="eu-section-title-text">{title}</h2>
      <div className="eu-header-divider-line" />
    </div>
  );
}

function CefrTable({ languages, headers, scaleNote }) {
  const h = headers || {
    understanding: 'Comprendre',
    listening: 'Écouter',
    reading: 'Lire',
    speaking: 'Parler',
    interaction: 'Interaction',
    production: 'Production',
    writing: 'Écrire',
  };

  return (
    <div className="cefr-table-card">
      <div className="cefr-table-scroll">
        <table className="cefr-table">
          <thead>
            <tr>
              <th rowSpan="2" className="cefr-th-lang">Langue / Language</th>
              <th colSpan="2" className="cefr-th-group">{h.understanding}</th>
              <th colSpan="2" className="cefr-th-group">{h.speaking}</th>
              <th rowSpan="2" className="cefr-th-group">{h.writing}</th>
            </tr>
            <tr>
              <th className="cefr-th-sub">{h.listening}</th>
              <th className="cefr-th-sub">{h.reading}</th>
              <th className="cefr-th-sub">{h.interaction}</th>
              <th className="cefr-th-sub">{h.production}</th>
            </tr>
          </thead>
          <tbody>
            {languages.map((lang) => (
              <tr key={lang.name}>
                <td className="cefr-td-lang">
                  <strong>{lang.name}</strong>
                  {lang.overall && <span className="cefr-badge">{lang.overall}</span>}
                  {lang.label && <span className="cefr-desc-sub"> — {lang.label}</span>}
                </td>
                <td className="cefr-td-score">{lang.listening}</td>
                <td className="cefr-td-score">{lang.reading}</td>
                <td className="cefr-td-score">{lang.spokenInteraction}</td>
                <td className="cefr-td-score">{lang.spokenProduction}</td>
                <td className="cefr-td-score">{lang.writing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {scaleNote && <p className="cefr-footnote">{scaleNote}</p>}
    </div>
  );
}

function TagList({ items, className, tagClassName }) {
  if (!items || items.length === 0) return null;

  return (
    <div className={className}>
      {items.map((item) => {
        const variantClassName = item.variant ? ` ${item.variant}` : '';
        return (
          <span className={`${tagClassName}${variantClassName}`} key={item.label}>
            {item.label}
          </span>
        );
      })}
    </div>
  );
}

function InfoModal({ ui, onClose }) {
  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div className="info-modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <section
        className="info-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="json-documentation-title"
      >
        <div className="info-modal-header">
          <div className="info-title-wrap">
            <EuropassLogo />
            <h2 id="json-documentation-title">{ui.infoDialogTitle}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={ui.closeInfo} className="close-btn">
            &times;
          </button>
        </div>

        <div className="info-modal-body">
          {JSON_DOCUMENTATION.map((section) => (
            <section className="doc-section" key={section.title}>
              <h3>{section.title}</h3>
              {section.body?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.fields && (
                <dl>
                  {section.fields.map(([name, type, description]) => (
                    <div className="doc-field" key={name}>
                      <dt>
                        <code>{name}</code>
                        <span>{type}</span>
                      </dt>
                      <dd>{description}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

function resolveAssetUrl(path) {
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) {
    return path;
  }
  return `${import.meta.env.BASE_URL}${path}`;
}

export default App;
import { useEffect, useMemo, useState } from 'react';

const DEFAULT_LANGUAGE = 'fr';
const LANGUAGE_CODES = ['fr', 'en'];
const DATA_URL = `${import.meta.env.BASE_URL}data.json`;

const CONTACT_ICONS = {
  email: '@',
  phone: 'tel',
  location: 'pin',
};

const JSON_DOCUMENTATION = [
  {
    title: '1. File and top-level shape',
    body: [
      'Edit public/data.json to update the visible content. The file must stay valid JSON: use double quotes, keep commas between items, and avoid trailing commas.',
      'The root object must contain fr and en keys. Each key is a complete language version of the CV and should keep the same structure so the language selector can switch safely.',
    ],
    fields: [
      ['fr', 'object', 'Required. French content displayed when the selector is set to fr.'],
      ['en', 'object', 'Required. English content displayed when the selector is set to en.'],
    ],
  },
  {
    title: '2. Language object',
    body: [
      'Each language object contains interface labels, document metadata, person data, and the ordered pages rendered by React.',
    ],
    fields: [
      ['ui', 'object', 'Labels used by the header, modal, loading state, error state, and print button.'],
      ['seo', 'object', 'Browser-level metadata. title is copied into document.title.'],
      ['person', 'object', 'Identity data reused by identity sidebar sections and by the header.'],
      ['pages', 'array', 'Ordered CV pages. Every item renders one .page block and can contain sidebar sections plus main content.'],
    ],
  },
  {
    title: '3. ui attributes',
    fields: [
      ['languageLabel', 'string', 'Text shown beside the language selector.'],
      ['languageNames', 'object', 'Maps language codes to option labels, for example fr: Francais and en: English.'],
      ['infoButton', 'string', 'Text on the header button that opens this documentation.'],
      ['infoDialogTitle', 'string', 'Title displayed at the top of the popup.'],
      ['closeInfo', 'string', 'Accessible label and visible text for closing the popup.'],
      ['printButton', 'string', 'Text on the button that calls window.print().'],
      ['loading', 'string', 'Temporary message while data.json is loading.'],
      ['loadErrorTitle', 'string', 'Title shown if data.json cannot be loaded or parsed.'],
      ['loadErrorMessage', 'string', 'Detailed recovery message shown below the error title.'],
    ],
  },
  {
    title: '4. person attributes',
    fields: [
      ['nameLines', 'array<string>', 'Name lines rendered in the sidebar. Use two entries to keep first and last name on separate lines.'],
      ['role', 'string', 'Current role rendered in the header and optionally in page main content.'],
      ['photo', 'string', 'Image path relative to public/. circle-profile.png resolves to public/circle-profile.png.'],
      ['photoAlt', 'string', 'Accessible description for the profile image. Keep it language-specific.'],
    ],
  },
  {
    title: '5. pages and main content',
    body: [
      'pages is an array. The order of the array is the order on screen and in the printed PDF. Add a new object to create a new page, or move objects to reorder pages.',
      'Each page can define sidebar and main. The main object supports role, summary, and sections. sections currently supports experience sections.',
    ],
    fields: [
      ['sidebar', 'array<section>', 'Ordered list of sidebar sections for that page.'],
      ['main.role', 'string', 'Optional role label at the top of the page. Omit it on later pages if not needed.'],
      ['main.summary', 'string', 'Optional profile paragraph. Omit it on pages without a summary.'],
      ['main.sections', 'array<section>', 'Ordered main sections. Use type: experience for work history blocks.'],
    ],
  },
  {
    title: '6. sidebar section types',
    fields: [
      ['identity', 'type only', 'Renders photo and name from person. It does not need a title.'],
      ['contact', 'title + items', 'items contain icon, label, value, and optional href. icon can be email, phone, or location.'],
      ['tagList', 'title + items', 'Renders compact sidebar tags. Each item has label and optional variant.'],
      ['skillGroups', 'title + groups', 'groups contain a title and items. Each item has label and optional variant.'],
      ['education', 'title + degree + details', 'Renders one education block. details is the school, location, year, or short note.'],
      ['languages', 'title + items', 'Each item has name and level.'],
    ],
  },
  {
    title: '7. experience sections',
    fields: [
      ['type', 'string', 'Must be experience for professional experience blocks.'],
      ['title', 'string', 'Section heading, for example Experience Professionnelle.'],
      ['items', 'array', 'Ordered jobs or projects. Move items to reorder them.'],
      ['items[].title', 'string', 'Job title.'],
      ['items[].period', 'string', 'Date range displayed in the green pill.'],
      ['items[].company', 'string', 'Company, client, product, or context line.'],
      ['items[].bullets', 'array<string>', 'Bullet points. Keep each bullet concise for print layout.'],
      ['items[].tags', 'array<tag>', 'Technology tags shown below the bullets.'],
    ],
  },
  {
    title: '8. tags, variants, links, and assets',
    fields: [
      ['tag.label', 'string', 'Visible tag text.'],
      ['tag.variant', 'string', 'Optional visual style. Use gold for AI/tooling emphasis or green for MCP/highlight tags. Omit for default blue tags.'],
      ['href', 'string', 'Optional link target on contact items. Use mailto: for email and tel: for phone.'],
      ['assets', 'files', 'Place images in public/ and reference them by file name from data.json.'],
    ],
  },
];

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
    if (!data) {
      return LANGUAGE_CODES;
    }

    return LANGUAGE_CODES.filter((code) => data[code]);
  }, [data]);

  const content = data?.[language] ?? data?.[DEFAULT_LANGUAGE];

  useEffect(() => {
    if (!data || data[language]) {
      return;
    }

    const fallbackLanguage = availableLanguages[0] ?? DEFAULT_LANGUAGE;
    setLanguage(fallbackLanguage);
  }, [availableLanguages, data, language]);

  useEffect(() => {
    if (!content) {
      return;
    }

    document.documentElement.lang = language;
    document.title = content.seo?.title ?? 'Aymen AMARA - CV';
    window.localStorage.setItem('cv-language', language);
  }, [content, language]);

  useEffect(() => {
    if (!isInfoOpen) {
      return undefined;
    }

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
        <h1>{content?.ui?.loadErrorTitle ?? 'Unable to load data.json'}</h1>
        <p>
          {content?.ui?.loadErrorMessage ??
            'Check public/data.json and make sure it contains valid fr and en entries.'}
        </p>
        <code>{loadError.message}</code>
      </div>
    );
  }

  if (!content) {
    return <div className="app-shell app-state">Loading resume content...</div>;
  }

  return (
    <div className="app-shell">
      <AppHeader
        content={content}
        language={language}
        availableLanguages={availableLanguages}
        onLanguageChange={handleLanguageChange}
        onOpenInfo={() => setIsInfoOpen(true)}
      />

      <main className="cv-pages" aria-label={content.seo?.title}>
        {content.pages.map((page, index) => (
          <CvPage key={`${language}-${index}`} page={page} person={content.person} />
        ))}
      </main>

      <div className="print-btn">
        <button type="button" onClick={handlePrint}>
          {content.ui.printButton}
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
}) {
  return (
    <header className="app-header">
      <div className="header-title">
        <strong>{content.person.nameLines.join(' ')}</strong>
        <span>{content.person.role}</span>
      </div>

      <div className="header-actions">
        <label className="language-control" htmlFor="language-select">
          <span>{content.ui.languageLabel}</span>
          <select
            id="language-select"
            value={language}
            onChange={onLanguageChange}
          >
            {availableLanguages.map((code) => (
              <option key={code} value={code}>
                {content.ui.languageNames?.[code] ?? code.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="info-button" onClick={onOpenInfo}>
          <span className="button-icon" aria-hidden="true">
            i
          </span>
          {content.ui.infoButton}
        </button>
      </div>
    </header>
  );
}

function CvPage({ page, person }) {
  return (
    <section className="page">
      <aside className="sidebar">
        {page.sidebar.map((section, index) => (
          <SidebarSection key={`${section.type}-${index}`} section={section} person={person} />
        ))}
      </aside>

      <div className="main">
        {page.main?.role && <div className="page-role">{page.main.role}</div>}
        {page.main?.summary && <p className="profile-text">{page.main.summary}</p>}

        {page.main?.sections?.map((section, index) => (
          <MainSection key={`${section.type}-${index}`} section={section} />
        ))}
      </div>
    </section>
  );
}

function SidebarSection({ section, person }) {
  if (section.type === 'identity') {
    return <IdentityBlock person={person} />;
  }

  if (section.type === 'contact') {
    return (
      <section className="sidebar-section">
        <div className="s-title">{section.title}</div>
        <ul className="contact-list">
          {section.items.map((item) => (
            <li key={`${item.label}-${item.value}`}>
              <span className="icon" aria-hidden="true">
                {CONTACT_ICONS[item.icon] ?? item.icon}
              </span>
              {item.href ? <a href={item.href}>{item.value}</a> : <span>{item.value}</span>}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (section.type === 'tagList') {
    return (
      <section className="sidebar-section">
        <div className="s-title">{section.title}</div>
        <TagList items={section.items} className="s-tags" tagClassName="s-tag" />
      </section>
    );
  }

  if (section.type === 'skillGroups') {
    return (
      <section className="sidebar-section">
        <div className="s-title">{section.title}</div>
        {section.groups.map((group) => (
          <div className="skill-group" key={group.title}>
            <h4>{group.title}</h4>
            <TagList items={group.items} className="s-tags" tagClassName="s-tag" />
          </div>
        ))}
      </section>
    );
  }

  if (section.type === 'education') {
    return (
      <section className="sidebar-section">
        <div className="s-title">{section.title}</div>
        <div>
          <div className="edu-degree">{section.degree}</div>
          <div className="edu-sub">{section.details}</div>
        </div>
      </section>
    );
  }

  if (section.type === 'languages') {
    return (
      <section className="sidebar-section">
        <div className="s-title">{section.title}</div>
        <div>
          {section.items.map((item) => (
            <div className="lang-row" key={item.name}>
              <strong>{item.name}</strong>
              <span className="lang-level">{item.level}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return null;
}

function IdentityBlock({ person }) {
  return (
    <div className="name-block">
      <img
        className="profile-photo"
        src={resolveAssetUrl(person.photo)}
        alt={person.photoAlt}
      />
      <div className="center-text">
        <h1>
          {person.nameLines.map((line, index) => (
            <span key={line}>
              {line}
              {index < person.nameLines.length - 1 && <br />}
            </span>
          ))}
        </h1>
      </div>
    </div>
  );
}

function MainSection({ section }) {
  if (section.type !== 'experience') {
    return null;
  }

  return (
    <section>
      <div className="m-title">{section.title}</div>
      <div className="exp-section">
        {section.items.map((item) => (
          <article className="exp-item" key={`${item.title}-${item.period}`}>
            <div className="exp-header">
              <div className="exp-title">{item.title}</div>
              <div className="exp-period">{item.period}</div>
            </div>
            <div className="exp-company">{item.company}</div>
            <ul>
              {item.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <TagList items={item.tags} className="tags" tagClassName="tag" />
          </article>
        ))}
      </div>
    </section>
  );
}

function TagList({ items, className, tagClassName }) {
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
          <h2 id="json-documentation-title">{ui.infoDialogTitle}</h2>
          <button type="button" onClick={onClose} aria-label={ui.closeInfo}>
            x
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
# aymenamaraa.github.io

React CV application powered by Vite. The visible CV content is loaded from `public/data.json`, so the French and English versions can be updated from one structured file.

## Local development

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project structure

```text
.
├── .github/workflows/deploy.yml
├── index.html
├── package.json
├── public/
│   ├── circle-profile.png
│   └── data.json
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
└── vite.config.js
```

## Updating CV content

Edit `public/data.json`. The app fetches this file at runtime and expects this top-level shape:

```json
{
	"fr": {
		"ui": {},
		"seo": {},
		"person": {},
		"pages": []
	},
	"en": {
		"ui": {},
		"seo": {},
		"person": {},
		"pages": []
	}
}
```

Important JSON rules:

- Use double quotes around every key and string value.
- Keep commas between properties and array items.
- Do not add a comma after the last property or last array item.
- Keep both `fr` and `en` entries so the language selector always has content.
- After editing, run `npm run build` to confirm the JSON is valid.

## JSON attribute reference

### Root language objects

`fr` and `en` are complete language versions of the same CV. Each language object should contain the same schema, even if the text differs.

| Attribute | Type | Description |
| --- | --- | --- |
| `ui` | object | Labels used by the header, popup, loading state, error state, and print button. |
| `seo` | object | Browser metadata. Currently uses `title` for `document.title`. |
| `person` | object | Shared identity data used by the header and identity sidebar block. |
| `pages` | array | Ordered list of rendered CV pages. The array order is also the print order. |

### `ui`

| Attribute | Type | Description |
| --- | --- | --- |
| `languageLabel` | string | Label displayed beside the language selector. |
| `languageNames` | object | Maps `fr` and `en` to the option labels displayed in the selector. |
| `infoButton` | string | Text displayed on the header button that opens the documentation popup. |
| `infoDialogTitle` | string | Heading displayed at the top of the popup. |
| `closeInfo` | string | Accessible label and visible meaning for closing the popup. |
| `printButton` | string | Text displayed on the PDF/export button. |
| `loading` | string | Message reserved for loading states. |
| `loadErrorTitle` | string | Error title if `data.json` cannot be loaded or parsed. |
| `loadErrorMessage` | string | Detailed recovery message displayed under the error title. |

### `seo`

| Attribute | Type | Description |
| --- | --- | --- |
| `title` | string | Browser tab title for the selected language. |

### `person`

| Attribute | Type | Description |
| --- | --- | --- |
| `nameLines` | array of strings | Name lines rendered in the sidebar. Use `['Aymen', 'AMARA']` to keep the same two-line layout. |
| `role` | string | Role shown in the header and reusable in page main content. |
| `photo` | string | Image file path relative to `public/`. Example: `circle-profile.png`. |
| `photoAlt` | string | Accessible image description. Translate this per language. |

### `pages`

Each page object renders one CV page:

| Attribute | Type | Description |
| --- | --- | --- |
| `sidebar` | array | Ordered sidebar sections. |
| `main` | object | Main page content containing optional role, summary, and sections. |

To add a third printed page, append another object to `pages`. To reorder pages, move the objects inside the array.

### Sidebar section types

Every sidebar section has a `type`. Supported values are:

| Type | Required attributes | Description |
| --- | --- | --- |
| `identity` | none | Renders `person.photo`, `person.photoAlt`, and `person.nameLines`. |
| `contact` | `title`, `items` | Renders contact rows. |
| `tagList` | `title`, `items` | Renders compact tags such as expertise areas. |
| `skillGroups` | `title`, `groups` | Renders grouped technical skills. |
| `education` | `title`, `degree`, `details` | Renders a single education block. |
| `languages` | `title`, `items` | Renders language proficiency rows. |

Contact item attributes:

| Attribute | Type | Description |
| --- | --- | --- |
| `icon` | string | Use `email`, `phone`, or `location`. |
| `label` | string | Internal/accessibility label for the row. |
| `value` | string | Visible contact value. |
| `href` | string, optional | Link target. Use `mailto:` for email and `tel:` for phone. |

Tag item attributes, used by `tagList`, `skillGroups`, and experience tags:

| Attribute | Type | Description |
| --- | --- | --- |
| `label` | string | Visible tag text. |
| `variant` | string, optional | Visual emphasis. Use `gold` for AI/tooling tags or `green` for highlighted tags. Omit for the default blue/dark style. |

Skill group attributes:

| Attribute | Type | Description |
| --- | --- | --- |
| `title` | string | Group title, for example `Frontend`. |
| `items` | array of tags | Skill tags displayed inside the group. |

Language item attributes:

| Attribute | Type | Description |
| --- | --- | --- |
| `name` | string | Language name. |
| `level` | string | Proficiency label. |

### `main`

| Attribute | Type | Description |
| --- | --- | --- |
| `role` | string, optional | Uppercase role label displayed before the summary. Usually used only on the first page. |
| `summary` | string, optional | Profile paragraph displayed under the role. |
| `sections` | array | Ordered main content sections. Currently supports `experience`. |

Experience section attributes:

| Attribute | Type | Description |
| --- | --- | --- |
| `type` | string | Must be `experience`. |
| `title` | string | Section title, for example `Professional Experience`. |
| `items` | array | Ordered experience entries. |

Experience item attributes:

| Attribute | Type | Description |
| --- | --- | --- |
| `title` | string | Job title. |
| `period` | string | Date range displayed in the green pill. |
| `company` | string | Company, client, platform, or project line. |
| `bullets` | array of strings | Bullet points. Keep them concise so the print layout remains stable. |
| `tags` | array of tags | Technologies and methods displayed under the bullets. |

## Deploying to GitHub Pages

This repository includes `.github/workflows/deploy.yml`, which builds the Vite app and deploys the `dist/` folder through GitHub Actions.

One-time GitHub setup:

1. Open the repository on GitHub.
2. Go to **Settings** > **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Save the settings.

Deploy flow:

1. Commit your changes to the `main` branch.
2. Push to GitHub.
3. GitHub Actions runs `npm ci` and `npm run build`.
4. The generated `dist/` folder is published to GitHub Pages.
5. For this user site repository, the public URL is usually `https://aymenamaraa.github.io/`.

Manual verification before pushing:

```bash
npm install
npm run build
npm run preview
```

If the build fails after editing `public/data.json`, check for invalid JSON syntax first: missing quotes, missing commas, or trailing commas are the most common causes.
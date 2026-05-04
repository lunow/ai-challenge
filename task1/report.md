# AI Challenge – Task 1: Leaderboard UI

## Approach

We built a static leaderboard UI for embedding in Microsoft SharePoint/Teams using Nuxt 3 and Tailwind CSS, deployed to GitHub Pages.

## Tooling

- **Claude Code** – primary development assistant, used throughout for code generation, refactoring, and deployment configuration
- **Antigravity** – project scaffolding and local development environment
- **Chrome DevTools** – inspecting live SharePoint/Fluent UI styles to extract exact font sizes, weights, colors, and spacing values
- **Screenshots** – capturing reference designs and sharing visual context with the AI for style alignment
- **macOS** – development platform

## Data

Sample user data (a handful of entries with names, titles, departments, and activities) was provided as a starting point. The AI extrapolated from that seed to generate a full dataset of 227 engineers across 15 countries, with creative but realistic names, titles, and department names. Activity distribution was shaped by instruction — the majority of users have a single activity, with a smaller group having two or three to create a meaningful score spread at the top of the leaderboard.

## Styling

Styles were driven by manual inspection: the Fluent UI host environment was examined in Chrome DevTools, and the relevant CSS properties (font family, size, weight, color, spacing) were copied and handed to the AI as instructions. The AI applied them to the component. This inspection-and-instruct loop was repeated for each UI section — podium cards, list rows, the activity panel, and the responsive mobile layout.

## Deployment

The app is generated as a fully static site via `nuxt generate` and served from GitHub Pages. A GitHub Actions workflow builds and deploys on every push to `main`.

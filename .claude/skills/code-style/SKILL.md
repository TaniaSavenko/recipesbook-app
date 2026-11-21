---
name: code-style
description: Code style rules for the Taste Dept. recipe website. Use this skill whenever writing, changing, or refactoring HTML, CSS, or JavaScript in this project.
---

# Taste Dept. Code Style

## Tech stack
- Plain HTML, CSS, and JavaScript. No frameworks, no build tools.
- Files: index.html, style.css, script.js.
- Hash-based navigation (#/recipes, #/recipe/ID, #/admin).

## Data
- All data goes ONLY through the recipesStore object (getAll, getById, add, update, remove).
- Pages must never use localStorage directly — later recipesStore will switch to Supabase.

## Design
- Colors ONLY via CSS variables, never hardcoded hex in components:
  blue #2447C9 (background), orange #FF7A30 (accent), cream #F3EEE3 (text/cards), navy #142A80 (footer).
- Fonts: Archivo (headings, wide, bold, uppercase), Inter (body text).
- Mobile first: write mobile styles first, then @media (min-width: ...) for bigger screens.
- Respect prefers-reduced-motion for every animation.

## Naming
- JavaScript: camelCase for variables and functions (renderRecipeCard, getAll).
- CSS: kebab-case class names (recipe-card, hero-title).
- Clear names, no abbreviations like rc, tmp, x.

## Structure
- Small functions that do one thing.
- No duplicated code — reuse functions.
- No unused code, no leftover console.log.
- Images always have alt text, form fields always have labels.

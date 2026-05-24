# Telegram Learning Bot

A personal AI-powered learning assistant. Submit any URL to extract key concepts, then quiz yourself on what you've saved.

---

## Getting Started

The bot URL will be shared with you privately. Open it in Telegram and hit **Start**.

---

## Commands

### `/start`
Shows the welcome message and available commands.

### `/learn <url>`
Submits a URL for the Teacher AI to analyze.

**Example:**
```
/learn https://en.wikipedia.org/wiki/Machine_learning
```

The bot will extract the page content and respond with:
- Topic title and difficulty level
- 5–7 key concepts
- A plain-English summary
- Prerequisites (if any)

> Works best on article and documentation pages. JavaScript-heavy sites may return limited results based on meta tags only.

### `/quiz`
Starts a quiz on your saved materials.

1. The bot shows a list of everything you've learned — tap a topic.
2. You'll get 5 multiple-choice questions (A / B / C / D buttons).
3. After each answer you get immediate feedback and an explanation.
4. At the end you receive your score and a per-question breakdown.

---

## Tips

- Your materials are private — no other user can see them.
- You can `/learn` as many URLs as you like before quizzing.
- Each `/quiz` generates fresh questions, so you can retake the same topic multiple times and get different questions.
- Data persists between sessions — no need to re-submit URLs.

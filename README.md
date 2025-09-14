# 🌌 ASTRO Meals

**ASTRO Meals** is an MVP meal-planning app. It helps users **optimize their food schedule** to save **time and money** while still meeting **perfect nutrition needs**.

Built with **React + Vite + Radix UI + Supabase**.

---

## ✨ Features

* **Guest vs User Views**
  • Guest: Landing page, Demo
  • User: Plans, Recipes, Profile

* **Personalized Nutrition**
  Plans tailored to goals, preferences, and health metrics.

* **Recipe Library**
  Add and browse recipes with images + macros.

* **Smart Planning**
  Build weekly meal calendars from saved recipes.

* **Quick Export**
  Generate shopping lists from planned meals.

---

## 🛠 Tech Stack

* [React](https://react.dev/) + [Vite](https://vitejs.dev/)
* [Radix UI](https://www.radix-ui.com/) (themes & components)
* [Supabase](https://supabase.com/) (Auth, DB, Storage)

---

## 📂 Project Structure

```
src/
 ├── components/     # NavBar, Footer, UI
 ├── context/        # Context (Auth)
 ├── hooks/          # Custom hooks (useAuth)
 ├── pages/          # Landing, Demo, Plan, Recipes, Profile
 ├── providers/      # Context providers (AuthProvider)
 ├── routes/         # Route guards (RequireAuth, RequireGuest)
 ├── App.jsx         # Routes + layout
 ├── main.jsx        # Entry point
```

---

## 🚀 Getting Started

https://github.com/fabriziocontartese/astro-meals.git

### Run Dev Server

```bash
npm run dev
```

---

## 🔑 Supabase Setup

1. Create a project at [supabase.com](https://supabase.com/).
2. Create tables:
   * `profiles` (id, dob, weight, activity, prefs JSON)
   * `recipes` (id, user\_id, title, description, image\_url, macros JSON)
   * `plans` (id, user\_id, start\_date, name)
   * `plan_meals` (id, plan\_id, recipe\_id, meal\_type, day)
3. Enable Row Level Security (user can only access their own rows).
4. Create a public bucket for recipe images.
5. Set environment variables in `.env`:

   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

---

## 📅 Dev Plan (5 Sessions)

1. **Auth & Routing**
   Connect Supabase Auth, switch between guest/user views.

2. **Database Schema**
   Create tables in Supabase, connect CRUD.

3. **Recipes UI**
   Add/list/view recipes with Supabase storage images.

4. **Meal Plans**
   Weekly plan page, select recipes per slot, store in DB.

5. **Profile & Export**
   Profile edit, shopping list export, polish UI.
# Youth Outsider website

The site for [youthoutsider.org](https://youthoutsider.org), an independent journal of U.S. politics and international relations written by American teens in the States and abroad.

## How it works

- **Articles and authors** are JSON files in `content/`. Editors create and edit them in the admin panel at **youthoutsider.org/admin**, which saves them here.
- **Pages** (home, desks, join, about) are in `src/pages/`. Styles are in `src/css/site.css`.
- **Images** are in `static/images/`. Uploads from the admin panel go to `static/images/uploads/`.
- **`build.js`** turns all of that into the finished site in `dist/`. It has no dependencies: `node build.js`.
- **Netlify** runs the build every time something changes here and publishes `dist/`. Application forms on the Join page are collected by Netlify Forms.

## Publishing an article

1. Go to youthoutsider.org/admin and log in with GitHub.
2. Articles → New Article. Fill in the fields, paste the text, add any side graphics.
3. Save, move it to Ready, then Publish. The site updates in a minute or two.

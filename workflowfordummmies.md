# Workflow for Dummies: Working with the Database

**READ THIS if you just cloned the repo or pulled changes!**

## 1. I just Pulled the Code (The "I want to work" flow)
If you pulled code and the app is crashing or complaining about the database, do this:

1.  **Install any new packages**:
    ```bash
    npm install
    ```
2.  **Update your Local Database**: 
    This creates/updates your local `dev.db` to match the latest code.
    ```bash
    npx prisma migrate dev
    ```
3.  **Start the App**:
    ```bash
    npm run dev
    ```

---

## 2. I Changed the Schema (The "I changed the database" flow)
If you edited `prisma/schema.prisma` (e.g., added a new column or table):

1.  **Create the Migration**: 
    You MUST run this before you commit! It generates the SQL files for your team.
    ```bash
    npx prisma migrate dev --name <describe_your_change>
    ```
    *(Example: `npx prisma migrate dev --name added_expiry_date`)*

2.  **Commit & Push**:
    Git add the `prisma/migrations` folder that was just created.
    ```bash
    git add .
    git commit -m "Updated database schema"
    git push
    ```

## 3. Troubleshooting
*   **"Prisma Client not found"?**: Run `npx prisma generate`.
*   **Stuff is totally broken?**: Delete `dev.db` and run `npx prisma migrate dev` again to start fresh.

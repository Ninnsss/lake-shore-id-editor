# Lake Shore Colleges ID Management System v2

This version adds the full student ID workflow for **College, Junior High School and Senior High School**, while keeping the previous editable back-side ID and signatory features.

## New features

### College Department
- Course dropdown with 8 requested programs, stored/displayed in ALL CAPS
- Editable student name
- Editable student ID number
- Editable academic year
- ID photo upload

### Basic Education
- Separate Junior High School dropdown: Grade 7, 8, 9, 10
- Separate Senior High School dropdown: Grade 11, 12
- Editable section
- Editable ID number and LRN
- Editable school year
- Color-coded name bands:
  - Grade 7: Green
  - Grade 8: Yellow
  - Grade 9: Blue
  - Grade 10: Red
  - Grade 11: Purple
  - Grade 12: Orange

### Dashboard
- Create College ID
- Create Junior High ID
- Create Senior High ID
- Saved ID records
- Front and back Smart ID 51 / CR80 proportion preview
- PNG and JPG export buttons for each side

### Smart ID export
The source design uses a portrait proportion of **642 × 1013**. The preview/export uses the same proportion and a high-resolution 3× render. It is suitable as a transfer image for Smart ID 51 software. Configure the final print size in the Smart ID software according to your card setup (commonly CR80 54 × 85.6 mm portrait).

## Fresh installation on XAMPP

1. Extract the project to:
   `C:\xampp\htdocs\lake-shore-id-editor`
2. Start Apache and MySQL.
3. Open phpMyAdmin: `http://localhost/phpmyadmin`
4. Import `database/id_system.sql`.
5. Check `backend/config.php`:
   - DB_HOST = localhost
   - DB_NAME = lake_shore_id_system
   - DB_USER = root
   - DB_PASS = empty by default on XAMPP
6. Test the backend:
   `http://localhost/lake-shore-id-editor/backend/api.php?action=cards`
7. Open Command Prompt:
   ```cmd
   cd C:\xampp\htdocs\lake-shore-id-editor\frontend
   npm install
   npm run dev
   ```
8. Open the Vite address, normally `http://localhost:5173`.

## Updating an existing version

If you already use the previous version and want to preserve your records:

1. Replace the project files with this new version.
2. Import `database/migrate_existing.sql` in phpMyAdmin.
3. Import `database/id_system.sql` if you need to ensure the signatories/default settings exist.
4. Run `npm install` again inside the frontend folder.
5. Run `npm run dev`.

## Important folders

- Student photos: `backend/uploads/students/`
- Signatures: `backend/uploads/signatures/`
- React logo: `frontend/public/lsc-logo.png`

## Production

Build the React app with:

```cmd
cd frontend
npm install
npm run build
```

Then deploy the contents of `frontend/dist` to your web server and set `VITE_API_URL` if the API URL is different.

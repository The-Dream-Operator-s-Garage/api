# Reset Script

This script wipes all PathChain files and database data to start fresh.

## Usage

```bash
node scripts/reset.js
```

## What it does

1. **Deletes PathChain files**: Removes the entire `files/` directory containing all PathChain data
2. **Truncates database tables**: Clears all data from:
   - `entity`
   - `login`
   - `secret`
   - And related tables (post, tevent, property, etc.)
3. **Preserves schema**: The database structure remains intact

## After reset

1. Restart your server: `npm start`
2. The system will automatically:
   - Create a new pioneer in PathChain
   - Generate a new pioneer secret
   - Print the secret to the console

## Important Notes

- ⚠️ **This is destructive** - all data will be lost
- The database schema is preserved
- PathChain files are completely removed
- You'll get a fresh pioneer secret on next startup
